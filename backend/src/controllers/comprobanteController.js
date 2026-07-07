const prisma = require('../services/prisma');
const { generarComprobantePdf } = require('../services/pdf/comprobantePdf');
const { loadLogoBuffer } = require('../services/pdf/pdfHelpers');

const PREFIJOS = {
  RECIBO: 'REC',
  NOTA_CREDITO: 'NC',
  NOTA_DEBITO: 'ND'
};

const generarNumeroComprobante = async (tenantId, tipo) => {
  const year = new Date().getFullYear();
  const prefijo = PREFIJOS[tipo] || 'CMP';

  const ultimo = await prisma.comprobante.findFirst({
    where: { tenantId, numero: { startsWith: `${prefijo}-${year}-` } },
    orderBy: { numero: 'desc' }
  });

  let secuencia = 1;
  if (ultimo) {
    const parts = ultimo.numero.split('-');
    secuencia = parseInt(parts[2]) + 1;
  }
  return `${prefijo}-${year}-${secuencia.toString().padStart(6, '0')}`;
};

// Panel de comprobantes: facturas emitidas con estado del recibo + comprobantes asociados
const panelComprobantes = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { page = 1, limit = 20, search, tipo } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const whereFactura = {
      tenantId,
      estado: { not: 'ANULADA' }
    };
    if (search) {
      whereFactura.OR = [
        { numeroCompleto: { contains: search, mode: 'insensitive' } },
        { cliente: { razonSocial: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [facturas, total] = await Promise.all([
      prisma.factura.findMany({
        where: whereFactura,
        skip,
        take: parseInt(limit),
        orderBy: { fecha: 'desc' },
        include: {
          cliente: { select: { id: true, razonSocial: true } },
          comprobantes: {
            orderBy: { createdAt: 'desc' }
          }
        }
      }),
      prisma.factura.count({ where: whereFactura })
    ]);

    // Anotar estado del recibo por factura
    const facturasConEstado = facturas.map(f => ({
      ...f,
      reciboEmitido: f.comprobantes.some(c => c.tipo === 'RECIBO'),
    }));

    res.json({
      success: true,
      data: {
        facturas: facturasConEstado,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error en panel de comprobantes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el panel' });
  }
};

// Listar todos los comprobantes emitidos
const listarComprobantes = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { tipo, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { tenantId };
    if (tipo) where.tipo = tipo;

    const [comprobantes, total] = await Promise.all([
      prisma.comprobante.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          factura: {
            select: {
              id: true, numeroCompleto: true, total: true, moneda: true,
              cliente: { select: { razonSocial: true } }
            }
          }
        }
      }),
      prisma.comprobante.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        comprobantes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error listando comprobantes:', error);
    res.status(500).json({ success: false, message: 'Error al listar comprobantes' });
  }
};

// Crear comprobante (recibo, NC o ND) desde una factura
const crearComprobante = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const usuarioId = req.user.id;
    const { facturaId, tipo, total, concepto, observaciones, items, retenciones } = req.body;

    if (!['RECIBO', 'NOTA_CREDITO', 'NOTA_DEBITO'].includes(tipo)) {
      return res.status(400).json({ success: false, message: 'Tipo de comprobante inválido' });
    }

    const factura = await prisma.factura.findFirst({
      where: { id: facturaId, tenantId },
      include: { cliente: true }
    });

    if (!factura) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    // Un solo recibo por factura
    if (tipo === 'RECIBO') {
      const yaExiste = await prisma.comprobante.findFirst({
        where: { tenantId, facturaId, tipo: 'RECIBO' }
      });
      if (yaExiste) {
        return res.status(409).json({
          success: false,
          message: `Ya existe el recibo ${yaExiste.numero} para esta factura`
        });
      }
    }

    const numero = await generarNumeroComprobante(tenantId, tipo);

    // Sanitizar retenciones (solo para recibos)
    const retencionesValidas = (Array.isArray(retenciones) ? retenciones : [])
      .filter(r => r && r.importe != null && parseFloat(r.importe) > 0)
      .map(r => ({
        tipo: r.tipo || 'OTRA',
        descripcion: r.descripcion || '',
        importe: parseFloat(r.importe)
      }));

    const comprobante = await prisma.comprobante.create({
      data: {
        tenantId,
        usuarioId,
        numero,
        tipo,
        facturaId,
        moneda: factura.moneda,
        total: total != null && total !== '' ? parseFloat(total) : factura.total,
        concepto: concepto || null,
        observaciones: observaciones || null,
        items: Array.isArray(items) ? items : [],
        retenciones: retencionesValidas
      },
      include: {
        factura: {
          select: {
            numeroCompleto: true,
            cliente: { select: { razonSocial: true } }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: `${tipo === 'RECIBO' ? 'Recibo' : tipo === 'NOTA_CREDITO' ? 'Nota de crédito' : 'Nota de débito'} ${numero} generado`,
      data: { comprobante }
    });
  } catch (error) {
    console.error('Error creando comprobante:', error);
    res.status(500).json({ success: false, message: 'Error al crear comprobante' });
  }
};

// Descargar PDF del comprobante
const descargarPDF = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const comprobante = await prisma.comprobante.findFirst({
      where: { id, tenantId },
      include: {
        factura: {
          include: {
            cliente: true,
            items: true,
            carpeta: {
              select: { numero: true, houseBL: true, puertoOrigen: true, puertoDestino: true }
            }
          }
        }
      }
    });

    if (!comprobante) {
      return res.status(404).json({ success: false, message: 'Comprobante no encontrado' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true, logoUrl: true, companyAddress: true, companyPhone: true,
        companyEmail: true, paymentBankCuit: true
      }
    });

    const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
    const doc = generarComprobantePdf(comprobante, tenant, logoBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${comprobante.numero}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error generando PDF de comprobante:', error);
    res.status(500).json({ success: false, message: 'Error al generar el PDF' });
  }
};

// Eliminar comprobante (solo si fue un error)
const eliminarComprobante = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const comprobante = await prisma.comprobante.findFirst({ where: { id, tenantId } });
    if (!comprobante) {
      return res.status(404).json({ success: false, message: 'Comprobante no encontrado' });
    }

    await prisma.comprobante.delete({ where: { id } });
    res.json({ success: true, message: `Comprobante ${comprobante.numero} eliminado` });
  } catch (error) {
    console.error('Error eliminando comprobante:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar' });
  }
};

module.exports = {
  panelComprobantes,
  listarComprobantes,
  crearComprobante,
  descargarPDF,
  eliminarComprobante
};
