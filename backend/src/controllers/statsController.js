const prisma = require('../services/prisma');

// Obtener estadísticas del tenant
const getStats = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    // Fechas para filtros
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Ejecutar todas las consultas en paralelo
    const [
      // Carpetas
      totalCarpetas,
      carpetasEnTransito,
      carpetasDelMes,
      carpetasPorEstado,
      
      // Clientes
      totalClientes,
      
      // Facturación
      totalFacturas,
      facturasDelMes,
      facturasPendientes,
      totalPorCobrar,
      cobradoDelMes,
      
      // Prefacturas pendientes
      prefacturasPendientes,
      
      // Últimas carpetas
      ultimasCarpetas,
      
      // Últimas facturas
      ultimasFacturas
    ] = await Promise.all([
      // Carpetas
      prisma.carpeta.count({ 
        where: { tenantId, estado: { not: 'CANCELADA' } } 
      }),
      prisma.carpeta.count({ 
        where: { tenantId, estado: 'EN_TRANSITO' } 
      }),
      prisma.carpeta.count({ 
        where: { 
          tenantId, 
          fechaEmision: { gte: inicioMes, lte: finMes },
          estado: { not: 'CANCELADA' }
        } 
      }),
      prisma.carpeta.groupBy({
        by: ['estado'],
        where: { tenantId },
        _count: { estado: true }
      }),
      
      // Clientes
      prisma.cliente.count({ 
        where: { tenantId, activo: true } 
      }),
      
      // Facturas
      prisma.factura.count({ 
        where: { tenantId, estado: { not: 'ANULADA' } } 
      }),
      prisma.factura.count({ 
        where: { 
          tenantId, 
          fecha: { gte: inicioMes, lte: finMes },
          estado: { not: 'ANULADA' }
        } 
      }),
      prisma.factura.count({ 
        where: { 
          tenantId, 
          estado: { in: ['PENDIENTE', 'PAGADA_PARCIAL'] } 
        } 
      }),
      prisma.factura.aggregate({
        where: { 
          tenantId, 
          estado: { in: ['PENDIENTE', 'PAGADA_PARCIAL'] } 
        },
        _sum: { total: true }
      }),
      prisma.cobranza.aggregate({
        where: { 
          tenantId, 
          fecha: { gte: inicioMes, lte: finMes }
        },
        _sum: { monto: true }
      }),
      
      // Prefacturas pendientes
      prisma.prefactura.count({ 
        where: { 
          tenantId, 
          estado: { in: ['BORRADOR', 'CONFIRMADA'] } 
        } 
      }),
      
      // Últimas carpetas
      prisma.carpeta.findMany({
        where: { tenantId, estado: { not: 'CANCELADA' } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          cliente: { select: { razonSocial: true } }
        }
      }),
      
      // Últimas facturas
      prisma.factura.findMany({
        where: { tenantId, estado: { not: 'ANULADA' } },
        orderBy: { fecha: 'desc' },
        take: 5,
        include: {
          cliente: { select: { razonSocial: true } }
        }
      })
    ]);

    // Formatear respuesta
    res.json({
      success: true,
      data: {
        carpetas: {
          total: totalCarpetas,
          enTransito: carpetasEnTransito,
          delMes: carpetasDelMes,
          porEstado: carpetasPorEstado.reduce((acc, item) => {
            acc[item.estado] = item._count.estado;
            return acc;
          }, {})
        },
        clientes: {
          total: totalClientes
        },
        facturacion: {
          totalFacturas,
          facturasDelMes,
          facturasPendientes,
          totalPorCobrar: totalPorCobrar._sum.total || 0,
          cobradoDelMes: cobradoDelMes._sum.monto || 0,
          prefacturasPendientes
        },
        recientes: {
          carpetas: ultimasCarpetas.map(c => ({
            id: c.id,
            numero: c.numero,
            cliente: c.cliente?.razonSocial,
            estado: c.estado,
            puertoOrigen: c.puertoOrigen,
            puertoDestino: c.puertoDestino,
            fecha: c.fechaEmision
          })),
          facturas: ultimasFacturas.map(f => ({
            id: f.id,
            numero: f.numeroCompleto,
            tipo: f.tipoComprobante,
            cliente: f.cliente?.razonSocial,
            total: f.total,
            moneda: f.moneda,
            estado: f.estado,
            fecha: f.fecha
          }))
        },
        periodo: {
          mes: now.toLocaleString('es-AR', { month: 'long' }),
          año: now.getFullYear()
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener estadísticas' 
    });
  }
};

module.exports = { getStats };
