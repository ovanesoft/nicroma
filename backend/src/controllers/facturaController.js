const prisma = require('../services/prisma');

// Generar número de factura
// IMPORTANTE: el campo `numero` tiene unique (tenantId, numero), por lo que
// DEBE incluir el punto de venta: la secuencia se calcula por PV+tipo y sin
// el PV dos facturas del mismo tipo en PV distintos colisionaban.
const generarNumeroFactura = async (tenantId, puntoVenta, tipoComprobante, intento = 0) => {
  const ultima = await prisma.factura.findFirst({
    where: { tenantId, puntoVenta, tipoComprobante },
    orderBy: { numeroCompleto: 'desc' }
  });

  let secuencia = 1 + intento;
  if (ultima) {
    const parts = ultima.numeroCompleto.split('-');
    secuencia = parseInt(parts[1]) + 1 + intento;
  }

  const pv = puntoVenta.toString().padStart(4, '0');
  const num = secuencia.toString().padStart(8, '0');

  return {
    numero: `${tipoComprobante}-${pv}-${secuencia}`,
    numeroCompleto: `${pv}-${num}`
  };
};

// Ejecuta la creación de la factura reintentando con el siguiente número
// si colisiona la numeración (P2002), p.ej. por requests concurrentes o
// numeración legacy previa al fix del formato.
const crearFacturaConReintento = async (tenantId, puntoVenta, tipoComprobante, buildData, maxIntentos = 5) => {
  let lastError = null;
  for (let intento = 0; intento < maxIntentos; intento++) {
    const { numero, numeroCompleto } = await generarNumeroFactura(tenantId, puntoVenta, tipoComprobante, intento);
    try {
      return await prisma.factura.create(buildData(numero, numeroCompleto));
    } catch (error) {
      if (error.code === 'P2002') {
        lastError = error;
        console.warn(`[facturas] Número ${numero} / ${numeroCompleto} ya existe, reintentando (${intento + 1}/${maxIntentos})`);
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('No se pudo generar un número de factura único');
};

// Listar facturas
const listarFacturas = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { 
      page = 1, 
      limit = 20, 
      search,
      estado,
      clienteId,
      fechaDesde,
      fechaHasta
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { tenantId };
    
    if (search) {
      where.OR = [
        { numeroCompleto: { contains: search, mode: 'insensitive' } },
        { cliente: { razonSocial: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    if (estado) where.estado = estado;
    if (clienteId) where.clienteId = clienteId;
    
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
      if (fechaHasta) where.fecha.lte = new Date(fechaHasta);
    }

    const [facturas, total] = await Promise.all([
      prisma.factura.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { fecha: 'desc' },
        include: {
          cliente: {
            select: { id: true, razonSocial: true, numeroDocumento: true }
          },
          carpeta: {
            select: { id: true, numero: true }
          },
          _count: { select: { items: true, cobranzas: true } }
        }
      }),
      prisma.factura.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        facturas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error listando facturas:', error);
    res.status(500).json({ success: false, message: 'Error al listar facturas' });
  }
};

// Obtener factura por ID
const obtenerFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const factura = await prisma.factura.findFirst({
      where: { id, tenantId },
      include: {
        cliente: true,
        carpeta: {
          select: { id: true, numero: true, puertoOrigen: true, puertoDestino: true }
        },
        prefactura: {
          select: { id: true, numero: true }
        },
        items: true,
        cobranzas: true
      }
    });

    if (!factura) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    res.json({ success: true, data: { factura } });
  } catch (error) {
    console.error('Error obteniendo factura:', error);
    res.status(500).json({ success: false, message: 'Error al obtener factura' });
  }
};

// Crear factura desde prefactura
const crearDesdePrefactura = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const usuarioId = req.user.id;
    const {
      prefacturaId,
      tipoComprobante = 'A',
      puntoVenta = 1,
      fechaVencimiento,
      periodoDesde,
      periodoHasta,
      condicionVenta,
    } = req.body;

    // Obtener prefactura
    const prefactura = await prisma.prefactura.findFirst({
      where: { id: prefacturaId, tenantId },
      include: { cliente: true, items: true, carpeta: true }
    });

    if (!prefactura) {
      return res.status(404).json({ success: false, message: 'Prefactura no encontrada' });
    }

    if (prefactura.estado === 'FACTURADA') {
      return res.status(400).json({ success: false, message: 'Esta prefactura ya fue facturada' });
    }

    if (prefactura.estado === 'CANCELADA') {
      return res.status(400).json({ success: false, message: 'No se puede facturar una prefactura cancelada' });
    }

    // Condición de venta: se puede sobreescribir en la emisión o heredar de la prefactura
    const condVentaFinal = (condicionVenta ?? prefactura.condicionVenta);
    if (!condVentaFinal || !String(condVentaFinal).trim()) {
      return res.status(400).json({ success: false, message: 'La condición de venta es obligatoria' });
    }

    const parseFechaFactura = (v) => (v ? new Date(v) : null);
    const fechaVencimientoFinal = fechaVencimiento !== undefined ? parseFechaFactura(fechaVencimiento) : prefactura.fechaVencimiento;
    const periodoDesdeFinal = periodoDesde !== undefined ? parseFechaFactura(periodoDesde) : prefactura.periodoDesde;
    const periodoHastaFinal = periodoHasta !== undefined ? parseFechaFactura(periodoHasta) : prefactura.periodoHasta;

    // Crear factura con items (con reintento si colisiona la numeración)
    const factura = await crearFacturaConReintento(tenantId, puntoVenta, tipoComprobante, (numero, numeroCompleto) => ({
      data: {
        tenantId,
        numero,
        tipoComprobante,
        puntoVenta,
        numeroCompleto,
        prefacturaId,
        carpetaId: prefactura.carpetaId,
        clienteId: prefactura.clienteId,
        fecha: new Date(),
        fechaVencimiento: fechaVencimientoFinal,
        periodoDesde: periodoDesdeFinal,
        periodoHasta: periodoHastaFinal,
        condicionVenta: String(condVentaFinal).trim(),
        moneda: prefactura.moneda,
        subtotal: prefactura.subtotal,
        iva: prefactura.iva,
        total: prefactura.total,
        estado: 'PENDIENTE',
        usuarioId,
        items: {
          create: prefactura.items.map(i => ({
            descripcion: i.descripcion,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            subtotal: i.subtotal,
            alicuotaIVA: i.alicuotaIVA,
            iva: i.iva,
            total: i.total
          }))
        }
      },
      include: {
        cliente: true,
        items: true
      }
    }));

    // Actualizar estado de prefactura
    await prisma.prefactura.update({
      where: { id: prefacturaId },
      data: { estado: 'FACTURADA' }
    });

    res.status(201).json({
      success: true,
      message: 'Factura creada',
      data: { factura }
    });
  } catch (error) {
    console.error('Error creando factura:', error);
    res.status(500).json({ success: false, message: 'Error al crear factura' });
  }
};

// Crear factura manual
const crearFactura = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const usuarioId = req.user.id;
    const { 
      clienteId, 
      carpetaId,
      tipoComprobante = 'A', 
      puntoVenta = 1,
      moneda = 'USD',
      cotizacion,
      observaciones,
      fechaVencimiento,
      periodoDesde,
      periodoHasta,
      condicionVenta,
      items = []
    } = req.body;

    if (!clienteId) {
      return res.status(400).json({ success: false, message: 'Cliente requerido' });
    }

    if (!condicionVenta || !String(condicionVenta).trim()) {
      return res.status(400).json({ success: false, message: 'La condición de venta es obligatoria' });
    }

    const parseFechaFactura = (v) => (v ? new Date(v) : null);

    // Calcular totales
    const itemsCalculados = items.map(i => {
      const subtotal = (i.cantidad || 1) * (i.precioUnitario || 0);
      const iva = subtotal * ((i.alicuotaIVA || 21) / 100);
      return {
        descripcion: i.descripcion,
        cantidad: i.cantidad || 1,
        precioUnitario: i.precioUnitario || 0,
        subtotal,
        alicuotaIVA: i.alicuotaIVA || 21,
        iva,
        total: subtotal + iva
      };
    });

    const subtotalGeneral = itemsCalculados.reduce((sum, i) => sum + i.subtotal, 0);
    const ivaGeneral = itemsCalculados.reduce((sum, i) => sum + i.iva, 0);
    const totalGeneral = subtotalGeneral + ivaGeneral;

    const factura = await crearFacturaConReintento(tenantId, puntoVenta, tipoComprobante, (numero, numeroCompleto) => ({
      data: {
        tenantId,
        numero,
        tipoComprobante,
        puntoVenta,
        numeroCompleto,
        carpetaId: carpetaId || null,
        clienteId,
        fecha: new Date(),
        fechaVencimiento: parseFechaFactura(fechaVencimiento),
        periodoDesde: parseFechaFactura(periodoDesde),
        periodoHasta: parseFechaFactura(periodoHasta),
        condicionVenta: condicionVenta.trim(),
        moneda,
        cotizacion: cotizacion && parseFloat(cotizacion) > 0 ? parseFloat(cotizacion) : 1,
        subtotal: subtotalGeneral,
        iva: ivaGeneral,
        total: totalGeneral,
        estado: 'PENDIENTE',
        observaciones,
        usuarioId,
        items: {
          create: itemsCalculados
        }
      },
      include: {
        cliente: true,
        items: true
      }
    }));

    res.status(201).json({
      success: true,
      message: 'Factura creada',
      data: { factura }
    });
  } catch (error) {
    console.error('Error creando factura:', error);
    res.status(500).json({ success: false, message: 'Error al crear factura' });
  }
};

// Anular factura
const anularFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const factura = await prisma.factura.findFirst({
      where: { id, tenantId },
      include: { cobranzas: true }
    });

    if (!factura) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    if (factura.cobranzas.length > 0) {
      return res.status(400).json({ success: false, message: 'No se puede anular, tiene cobranzas asociadas' });
    }

    await prisma.factura.update({
      where: { id },
      data: { estado: 'ANULADA' }
    });

    res.json({ success: true, message: 'Factura anulada' });
  } catch (error) {
    console.error('Error anulando factura:', error);
    res.status(500).json({ success: false, message: 'Error al anular factura' });
  }
};

// Registrar cobranza
const registrarCobranza = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const { monto, medioPago, referencia, observaciones } = req.body;

    const factura = await prisma.factura.findFirst({
      where: { id, tenantId },
      include: { cobranzas: true }
    });

    if (!factura) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    if (factura.estado === 'ANULADA') {
      return res.status(400).json({ success: false, message: 'No se puede cobrar una factura anulada' });
    }

    // Generar número de cobranza
    const year = new Date().getFullYear();
    const count = await prisma.cobranza.count({ where: { tenantId } });
    const numeroCobranza = `COB-${year}-${(count + 1).toString().padStart(6, '0')}`;

    const cobranza = await prisma.cobranza.create({
      data: {
        tenantId,
        numero: numeroCobranza,
        facturaId: id,
        fecha: new Date(),
        monto: parseFloat(monto),
        moneda: factura.moneda,
        medioPago,
        referencia,
        observaciones
      }
    });

    // Calcular total cobrado
    const totalCobrado = factura.cobranzas.reduce((sum, c) => sum + c.monto, 0) + parseFloat(monto);
    
    // Actualizar estado de factura
    let nuevoEstado = factura.estado;
    if (totalCobrado >= factura.total) {
      nuevoEstado = 'PAGADA';
    } else if (totalCobrado > 0) {
      nuevoEstado = 'PAGADA_PARCIAL';
    }

    if (nuevoEstado !== factura.estado) {
      await prisma.factura.update({
        where: { id },
        data: { estado: nuevoEstado }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Cobranza registrada',
      data: { cobranza }
    });
  } catch (error) {
    console.error('Error registrando cobranza:', error);
    res.status(500).json({ success: false, message: 'Error al registrar cobranza' });
  }
};

// Generar PDF de la factura (con logo del tenant, CAE y QR si están disponibles)
const generarPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const factura = await prisma.factura.findFirst({
      where: { id, tenantId },
      include: {
        cliente: true,
        items: { orderBy: { createdAt: 'asc' } },
        carpeta: { select: { numero: true, houseBL: true } }
      }
    });

    if (!factura) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    // Buscar comprobante fiscal asociado (para QR y tipo de comprobante)
    const comprobanteFiscal = await prisma.comprobanteFiscal.findFirst({
      where: { tenantId, facturaId: id }
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true, logoUrl: true, companyAddress: true,
        companyPhone: true, companyEmail: true, paymentBankCuit: true,
        companyCuit: true, companyIngresosBrutos: true,
        companyInicioActividad: true, companyCondicionFiscal: true
      }
    });

    const { generarFacturaPdf, generarQRBuffer } = require('../services/pdf/facturaPdf');
    const { loadLogoBuffer } = require('../services/pdf/pdfHelpers');

    const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
    const qrBuffer = await generarQRBuffer(comprobanteFiscal?.qrData);

    const doc = generarFacturaPdf(factura, tenant, comprobanteFiscal, logoBuffer, qrBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Factura_${factura.numeroCompleto}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error generando PDF de factura:', error);
    res.status(500).json({ success: false, message: 'Error al generar el PDF' });
  }
};

module.exports = {
  listarFacturas,
  obtenerFactura,
  crearDesdePrefactura,
  crearFactura,
  anularFactura,
  registrarCobranza,
  generarPDF
};
