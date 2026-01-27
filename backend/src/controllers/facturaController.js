const prisma = require('../services/prisma');

// Generar número de factura
const generarNumeroFactura = async (tenantId, puntoVenta, tipoComprobante) => {
  const ultima = await prisma.factura.findFirst({
    where: { tenantId, puntoVenta, tipoComprobante },
    orderBy: { numeroCompleto: 'desc' }
  });

  let secuencia = 1;
  if (ultima) {
    const parts = ultima.numeroCompleto.split('-');
    secuencia = parseInt(parts[1]) + 1;
  }

  const pv = puntoVenta.toString().padStart(4, '0');
  const num = secuencia.toString().padStart(8, '0');
  
  return {
    numero: `${tipoComprobante}-${secuencia}`,
    numeroCompleto: `${pv}-${num}`
  };
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
    const { prefacturaId, tipoComprobante = 'A', puntoVenta = 1 } = req.body;

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

    // Generar número
    const { numero, numeroCompleto } = await generarNumeroFactura(tenantId, puntoVenta, tipoComprobante);

    // Crear factura con items
    const factura = await prisma.factura.create({
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
    });

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
      observaciones,
      items = []
    } = req.body;

    if (!clienteId) {
      return res.status(400).json({ success: false, message: 'Cliente requerido' });
    }

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

    const { numero, numeroCompleto } = await generarNumeroFactura(tenantId, puntoVenta, tipoComprobante);

    const factura = await prisma.factura.create({
      data: {
        tenantId,
        numero,
        tipoComprobante,
        puntoVenta,
        numeroCompleto,
        carpetaId: carpetaId || null,
        clienteId,
        fecha: new Date(),
        moneda,
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

module.exports = {
  listarFacturas,
  obtenerFactura,
  crearDesdePrefactura,
  crearFactura,
  anularFactura,
  registrarCobranza
};
