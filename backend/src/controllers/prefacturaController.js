const prisma = require('../services/prisma');

// Generar número de prefactura
const generarNumeroPrefactura = async (tenantId) => {
  const year = new Date().getFullYear();
  
  const ultima = await prisma.prefactura.findFirst({
    where: {
      tenantId,
      numero: { startsWith: `PRE-${year}-` }
    },
    orderBy: { numero: 'desc' }
  });

  let secuencia = 1;
  if (ultima) {
    const parts = ultima.numero.split('-');
    secuencia = parseInt(parts[2]) + 1;
  }

  return `PRE-${year}-${secuencia.toString().padStart(6, '0')}`;
};

// Listar prefacturas
const listarPrefacturas = async (req, res) => {
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
        { numero: { contains: search, mode: 'insensitive' } },
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

    const [prefacturas, total] = await Promise.all([
      prisma.prefactura.findMany({
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
          _count: { select: { items: true } }
        }
      }),
      prisma.prefactura.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        prefacturas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error listando prefacturas:', error);
    res.status(500).json({ success: false, message: 'Error al listar prefacturas' });
  }
};

// Obtener prefactura por ID
const obtenerPrefactura = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const prefactura = await prisma.prefactura.findFirst({
      where: { id, tenantId },
      include: {
        cliente: true,
        carpeta: {
          select: { id: true, numero: true, puertoOrigen: true, puertoDestino: true }
        },
        items: true,
        factura: {
          select: { id: true, numeroCompleto: true, fecha: true }
        }
      }
    });

    if (!prefactura) {
      return res.status(404).json({ success: false, message: 'Prefactura no encontrada' });
    }

    res.json({ success: true, data: { prefactura } });
  } catch (error) {
    console.error('Error obteniendo prefactura:', error);
    res.status(500).json({ success: false, message: 'Error al obtener prefactura' });
  }
};

// Crear prefactura desde carpeta (gastos)
const crearDesdeCarpeta = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const usuarioId = req.user.id;
    const { carpetaId } = req.body;

    // Obtener carpeta con gastos
    const carpeta = await prisma.carpeta.findFirst({
      where: { id: carpetaId, tenantId },
      include: {
        cliente: true,
        gastos: true
      }
    });

    if (!carpeta) {
      return res.status(404).json({ success: false, message: 'Carpeta no encontrada' });
    }

    if (carpeta.gastos.length === 0) {
      return res.status(400).json({ success: false, message: 'La carpeta no tiene gastos para facturar' });
    }

    // Calcular totales desde gastos (solo venta)
    const items = carpeta.gastos.map(g => {
      const subtotal = g.totalVenta;
      const iva = g.gravado ? subtotal * (g.porcentajeIVA / 100) : 0;
      return {
        descripcion: g.concepto,
        cantidad: g.cantidad,
        precioUnitario: g.montoVenta,
        subtotal,
        alicuotaIVA: g.gravado ? g.porcentajeIVA : 0,
        iva,
        total: subtotal + iva
      };
    });

    const subtotalGeneral = items.reduce((sum, i) => sum + i.subtotal, 0);
    const ivaGeneral = items.reduce((sum, i) => sum + i.iva, 0);
    const totalGeneral = subtotalGeneral + ivaGeneral;

    // Generar número
    const numero = await generarNumeroPrefactura(tenantId);

    // Crear prefactura con items
    const prefactura = await prisma.prefactura.create({
      data: {
        tenantId,
        numero,
        carpetaId,
        clienteId: carpeta.clienteId,
        fecha: new Date(),
        moneda: carpeta.moneda || 'USD',
        subtotal: subtotalGeneral,
        iva: ivaGeneral,
        total: totalGeneral,
        estado: 'BORRADOR',
        usuarioId,
        items: {
          create: items
        }
      },
      include: {
        cliente: true,
        carpeta: { select: { id: true, numero: true } },
        items: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Prefactura creada',
      data: { prefactura }
    });
  } catch (error) {
    console.error('Error creando prefactura:', error);
    res.status(500).json({ success: false, message: 'Error al crear prefactura' });
  }
};

// Crear prefactura manual
const crearPrefactura = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const usuarioId = req.user.id;
    const { clienteId, carpetaId, moneda = 'USD', observaciones, items = [] } = req.body;

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

    const numero = await generarNumeroPrefactura(tenantId);

    const prefactura = await prisma.prefactura.create({
      data: {
        tenantId,
        numero,
        carpetaId: carpetaId || null,
        clienteId,
        fecha: new Date(),
        moneda,
        subtotal: subtotalGeneral,
        iva: ivaGeneral,
        total: totalGeneral,
        estado: 'BORRADOR',
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
      message: 'Prefactura creada',
      data: { prefactura }
    });
  } catch (error) {
    console.error('Error creando prefactura:', error);
    res.status(500).json({ success: false, message: 'Error al crear prefactura' });
  }
};

// Actualizar prefactura
const actualizarPrefactura = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const { observaciones, items } = req.body;

    const existing = await prisma.prefactura.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Prefactura no encontrada' });
    }

    if (existing.estado !== 'BORRADOR') {
      return res.status(400).json({ success: false, message: 'Solo se pueden editar prefacturas en borrador' });
    }

    // Si hay items, recalcular
    let updateData = { observaciones };

    if (items) {
      // Eliminar items existentes
      await prisma.itemPrefactura.deleteMany({ where: { prefacturaId: id } });

      // Calcular nuevos totales
      const itemsCalculados = items.map(i => {
        const subtotal = (i.cantidad || 1) * (i.precioUnitario || 0);
        const iva = subtotal * ((i.alicuotaIVA || 21) / 100);
        return {
          prefacturaId: id,
          descripcion: i.descripcion,
          cantidad: i.cantidad || 1,
          precioUnitario: i.precioUnitario || 0,
          subtotal,
          alicuotaIVA: i.alicuotaIVA || 21,
          iva,
          total: subtotal + iva
        };
      });

      // Crear nuevos items
      await prisma.itemPrefactura.createMany({ data: itemsCalculados });

      const subtotalGeneral = itemsCalculados.reduce((sum, i) => sum + i.subtotal, 0);
      const ivaGeneral = itemsCalculados.reduce((sum, i) => sum + i.iva, 0);

      updateData.subtotal = subtotalGeneral;
      updateData.iva = ivaGeneral;
      updateData.total = subtotalGeneral + ivaGeneral;
    }

    const prefactura = await prisma.prefactura.update({
      where: { id },
      data: updateData,
      include: { cliente: true, items: true }
    });

    res.json({ success: true, data: { prefactura } });
  } catch (error) {
    console.error('Error actualizando prefactura:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar prefactura' });
  }
};

// Confirmar prefactura
const confirmarPrefactura = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const prefactura = await prisma.prefactura.findFirst({
      where: { id, tenantId }
    });

    if (!prefactura) {
      return res.status(404).json({ success: false, message: 'Prefactura no encontrada' });
    }

    if (prefactura.estado !== 'BORRADOR') {
      return res.status(400).json({ success: false, message: 'La prefactura ya está confirmada' });
    }

    const updated = await prisma.prefactura.update({
      where: { id },
      data: { estado: 'CONFIRMADA' },
      include: { cliente: true, items: true }
    });

    res.json({
      success: true,
      message: 'Prefactura confirmada',
      data: { prefactura: updated }
    });
  } catch (error) {
    console.error('Error confirmando prefactura:', error);
    res.status(500).json({ success: false, message: 'Error al confirmar prefactura' });
  }
};

// Cancelar prefactura
const cancelarPrefactura = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const prefactura = await prisma.prefactura.findFirst({
      where: { id, tenantId },
      include: { factura: true }
    });

    if (!prefactura) {
      return res.status(404).json({ success: false, message: 'Prefactura no encontrada' });
    }

    if (prefactura.factura) {
      return res.status(400).json({ success: false, message: 'No se puede cancelar, ya tiene factura asociada' });
    }

    await prisma.prefactura.update({
      where: { id },
      data: { estado: 'CANCELADA' }
    });

    res.json({ success: true, message: 'Prefactura cancelada' });
  } catch (error) {
    console.error('Error cancelando prefactura:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar prefactura' });
  }
};

module.exports = {
  listarPrefacturas,
  obtenerPrefactura,
  crearDesdeCarpeta,
  crearPrefactura,
  actualizarPrefactura,
  confirmarPrefactura,
  cancelarPrefactura
};
