/**
 * Controlador para el Portal de Clientes
 * 
 * Maneja las operaciones que pueden realizar los clientes desde el portal:
 * - Ver sus envíos/carpetas
 * - Ver sus facturas
 * - Ver sus prefacturas
 * - Tracking de contenedores
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =====================================================
// DASHBOARD
// =====================================================

/**
 * GET /api/portal/dashboard
 * Obtiene estadísticas del dashboard del cliente
 */
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    // Buscar el cliente vinculado al usuario
    let cliente = await prisma.cliente.findFirst({
      where: { userId }
    });

    // Si no existe vínculo, intentar buscar por email
    if (!cliente) {
      cliente = await prisma.cliente.findFirst({
        where: {
          tenantId,
          email: req.user.email
        }
      });

      // Si encontramos por email, vincular
      if (cliente) {
        await prisma.cliente.update({
          where: { id: cliente.id },
          data: { userId }
        });
      }
    }

    if (!cliente) {
      return res.json({
        success: true,
        data: {
          clienteId: null,
          stats: {
            enviosActivos: 0,
            enviosEnTransito: 0,
            facturasPendientes: 0,
            totalFacturado: 0,
            proximaLlegada: null
          },
          enviosRecientes: [],
          facturasRecientes: []
        }
      });
    }

    // Obtener estadísticas
    const [
      carpetasActivas,
      carpetasEnTransito,
      facturasPendientes,
      totalFacturado,
      enviosRecientes,
      facturasRecientes
    ] = await Promise.all([
      // Carpetas activas (no cerradas ni canceladas)
      prisma.carpeta.count({
        where: {
          tenantId,
          clienteId: cliente.id,
          estado: { notIn: ['CERRADA', 'CANCELADA'] }
        }
      }),
      // Carpetas en tránsito
      prisma.carpeta.count({
        where: {
          tenantId,
          clienteId: cliente.id,
          estado: 'EN_TRANSITO'
        }
      }),
      // Facturas pendientes
      prisma.factura.count({
        where: {
          tenantId,
          clienteId: cliente.id,
          estado: { in: ['PENDIENTE', 'PAGADA_PARCIAL'] }
        }
      }),
      // Total facturado (este mes)
      prisma.factura.aggregate({
        where: {
          tenantId,
          clienteId: cliente.id,
          fecha: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { total: true }
      }),
      // Envíos recientes
      prisma.carpeta.findMany({
        where: {
          tenantId,
          clienteId: cliente.id
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          contenedores: {
            take: 3
          }
        }
      }),
      // Facturas recientes
      prisma.factura.findMany({
        where: {
          tenantId,
          clienteId: cliente.id
        },
        orderBy: { fecha: 'desc' },
        take: 5
      })
    ]);

    // Buscar próxima llegada
    const proximoEnvio = await prisma.carpeta.findFirst({
      where: {
        tenantId,
        clienteId: cliente.id,
        fechaLlegadaEstimada: { gte: new Date() }
      },
      orderBy: { fechaLlegadaEstimada: 'asc' }
    });

    res.json({
      success: true,
      data: {
        clienteId: cliente.id,
        clienteNombre: cliente.razonSocial,
        stats: {
          enviosActivos: carpetasActivas,
          enviosEnTransito: carpetasEnTransito,
          facturasPendientes,
          totalFacturado: totalFacturado._sum.total || 0,
          proximaLlegada: proximoEnvio ? {
            numero: proximoEnvio.numero,
            eta: proximoEnvio.fechaLlegadaEstimada,
            diasRestantes: Math.ceil((new Date(proximoEnvio.fechaLlegadaEstimada) - new Date()) / (1000 * 60 * 60 * 24))
          } : null
        },
        enviosRecientes: enviosRecientes.map(c => ({
          id: c.id,
          numero: c.numero,
          estado: c.estado,
          origen: c.puertoOrigen,
          destino: c.puertoDestino,
          eta: c.fechaLlegadaEstimada,
          etd: c.fechaSalidaEstimada,
          contenedores: c.contenedores?.length || 0
        })),
        facturasRecientes: facturasRecientes.map(f => ({
          id: f.id,
          numero: f.numeroCompleto,
          fecha: f.fecha,
          total: f.total,
          moneda: f.moneda,
          estado: f.estado
        }))
      }
    });

  } catch (error) {
    console.error('Error en portal dashboard:', error);
    res.status(500).json({ success: false, error: 'Error al obtener dashboard' });
  }
};

// =====================================================
// ENVÍOS / CARPETAS
// =====================================================

/**
 * GET /api/portal/envios
 * Lista los envíos/carpetas del cliente
 */
exports.getEnvios = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { page = 1, limit = 10, estado } = req.query;

    // Buscar cliente vinculado
    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { userId },
          { tenantId, email: req.user.email }
        ]
      }
    });

    if (!cliente) {
      return res.json({
        success: true,
        data: {
          envios: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 }
        }
      });
    }

    const where = {
      tenantId,
      clienteId: cliente.id
    };

    if (estado) {
      where.estado = estado;
    }

    const [envios, total] = await Promise.all([
      prisma.carpeta.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          contenedores: true,
          mercancias: true
        }
      }),
      prisma.carpeta.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        envios: envios.map(e => ({
          id: e.id,
          numero: e.numero,
          tipo: e.tipoOperacion,
          estado: e.estado,
          origen: e.puertoOrigen,
          destino: e.puertoDestino,
          etd: e.fechaSalidaEstimada,
          eta: e.fechaLlegadaEstimada,
          buque: e.buque,
          viaje: e.viaje,
          naviera: e.transportista,
          bl: e.masterBL,
          contenedores: e.contenedores?.map(c => ({
            id: c.id,
            numero: c.numero,
            tipo: c.tipo
          })) || [],
          mercancias: e.mercancias?.map(m => ({
            descripcion: m.descripcion,
            bultos: m.bultos,
            peso: m.peso
          })) || [],
          createdAt: e.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo envíos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener envíos' });
  }
};

/**
 * GET /api/portal/envios/:id
 * Obtiene detalle de un envío
 */
exports.getEnvio = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    // Buscar cliente vinculado
    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { userId },
          { tenantId, email: req.user.email }
        ]
      }
    });

    if (!cliente) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    const envio = await prisma.carpeta.findFirst({
      where: {
        id,
        tenantId,
        clienteId: cliente.id
      },
      include: {
        contenedores: true,
        mercancias: true,
        gastos: {
          where: { activo: true }
        }
      }
    });

    if (!envio) {
      return res.status(404).json({ success: false, error: 'Envío no encontrado' });
    }

    res.json({
      success: true,
      data: {
        id: envio.id,
        numero: envio.numero,
        tipo: envio.tipoOperacion,
        area: envio.area,
        sector: envio.sector,
        estado: envio.estado,
        incoterm: envio.incoterm,
        origen: envio.puertoOrigen,
        destino: envio.puertoDestino,
        etd: envio.fechaSalidaEstimada,
        eta: envio.fechaLlegadaEstimada,
        ata: envio.fechaLlegadaConfirmada,
        atd: envio.fechaSalidaConfirmada,
        buque: envio.buque,
        viaje: envio.viaje,
        naviera: envio.transportista,
        bl: envio.masterBL,
        hbl: envio.houseBL,
        referencia: envio.referenciaCliente,
        observaciones: envio.observaciones,
        contenedores: envio.contenedores?.map(c => ({
          id: c.id,
          numero: c.numero,
          tipo: c.tipo,
          condicion: c.condicion,
          precinto: c.precinto,
          tara: c.tara,
          pesoMaximo: c.pesoMaximo
        })) || [],
        mercancias: envio.mercancias?.map(m => ({
          descripcion: m.descripcion,
          bultos: m.bultos,
          peso: m.peso,
          volumen: m.volumen,
          valorDeclarado: m.valorDeclarado
        })) || [],
        createdAt: envio.createdAt,
        updatedAt: envio.updatedAt
      }
    });

  } catch (error) {
    console.error('Error obteniendo envío:', error);
    res.status(500).json({ success: false, error: 'Error al obtener envío' });
  }
};

// =====================================================
// FACTURAS
// =====================================================

/**
 * GET /api/portal/facturas
 * Lista las facturas del cliente
 */
exports.getFacturas = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { page = 1, limit = 10, estado } = req.query;

    // Buscar cliente vinculado
    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { userId },
          { tenantId, email: req.user.email }
        ]
      }
    });

    if (!cliente) {
      return res.json({
        success: true,
        data: {
          facturas: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 }
        }
      });
    }

    const where = {
      tenantId,
      clienteId: cliente.id
    };

    if (estado) {
      where.estado = estado;
    }

    const [facturas, total] = await Promise.all([
      prisma.factura.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { fecha: 'desc' },
        include: {
          items: true,
          cobranzas: true,
          carpeta: {
            select: { numero: true }
          }
        }
      }),
      prisma.factura.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        facturas: facturas.map(f => ({
          id: f.id,
          numero: f.numeroCompleto,
          tipo: f.tipoComprobante,
          fecha: f.fecha,
          fechaVencimiento: f.fechaVencimiento,
          subtotal: f.subtotal,
          iva: f.iva,
          total: f.total,
          moneda: f.moneda,
          estado: f.estado,
          cae: f.cae,
          carpeta: f.carpeta?.numero,
          totalCobrado: f.cobranzas?.reduce((sum, c) => sum + Number(c.monto), 0) || 0
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo facturas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener facturas' });
  }
};

/**
 * GET /api/portal/facturas/:id
 * Obtiene detalle de una factura
 */
exports.getFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    // Buscar cliente vinculado
    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { userId },
          { tenantId, email: req.user.email }
        ]
      }
    });

    if (!cliente) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    const factura = await prisma.factura.findFirst({
      where: {
        id,
        tenantId,
        clienteId: cliente.id
      },
      include: {
        items: true,
        cobranzas: true,
        carpeta: {
          select: { id: true, numero: true }
        }
      }
    });

    if (!factura) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada' });
    }

    const totalCobrado = factura.cobranzas?.reduce((sum, c) => sum + Number(c.monto), 0) || 0;

    res.json({
      success: true,
      data: {
        id: factura.id,
        numero: factura.numeroCompleto,
        tipo: factura.tipoComprobante,
        fecha: factura.fecha,
        fechaVencimiento: factura.fechaVencimiento,
        subtotal: factura.subtotal,
        iva: factura.iva,
        percepcionIVA: factura.percepcionIVA,
        percepcionIIBB: factura.percepcionIIBB,
        total: factura.total,
        moneda: factura.moneda,
        cotizacion: factura.cotizacion,
        estado: factura.estado,
        cae: factura.cae,
        vencimientoCAE: factura.vencimientoCAE,
        carpeta: factura.carpeta,
        items: factura.items.map(i => ({
          id: i.id,
          concepto: i.concepto,
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          subtotal: i.subtotal
        })),
        cobranzas: factura.cobranzas?.map(c => ({
          id: c.id,
          fecha: c.fecha,
          monto: c.monto,
          medioPago: c.medioPago,
          referencia: c.referencia
        })) || [],
        totalCobrado,
        saldoPendiente: Number(factura.total) - totalCobrado
      }
    });

  } catch (error) {
    console.error('Error obteniendo factura:', error);
    res.status(500).json({ success: false, error: 'Error al obtener factura' });
  }
};

// =====================================================
// PREFACTURAS
// =====================================================

/**
 * GET /api/portal/prefacturas
 * Lista las prefacturas del cliente
 */
exports.getPrefacturas = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { page = 1, limit = 10, estado } = req.query;

    // Buscar cliente vinculado
    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { userId },
          { tenantId, email: req.user.email }
        ]
      }
    });

    if (!cliente) {
      return res.json({
        success: true,
        data: {
          prefacturas: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 }
        }
      });
    }

    const where = {
      tenantId,
      clienteId: cliente.id
    };

    if (estado) {
      where.estado = estado;
    }

    const [prefacturas, total] = await Promise.all([
      prisma.prefactura.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { fecha: 'desc' },
        include: {
          items: true,
          carpeta: {
            select: { numero: true }
          }
        }
      }),
      prisma.prefactura.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        prefacturas: prefacturas.map(p => ({
          id: p.id,
          numero: p.numero,
          fecha: p.fecha,
          subtotal: p.subtotal,
          iva: p.iva,
          total: p.total,
          moneda: p.moneda,
          estado: p.estado,
          carpeta: p.carpeta?.numero
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo prefacturas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener prefacturas' });
  }
};

// =====================================================
// MEDIOS DE PAGO
// =====================================================

/**
 * GET /api/portal/payment-info
 * Obtiene la información de medios de pago del tenant
 */
exports.getPaymentInfo = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'No hay organización vinculada'
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        companyPhone: true,
        companyEmail: true,
        paymentBankName: true,
        paymentBankAccount: true,
        paymentBankCbu: true,
        paymentBankAlias: true,
        paymentBankCuit: true,
        paymentBankHolder: true,
        paymentMercadoPago: true,
        paymentPaypal: true,
        paymentChequeOrder: true,
        paymentOtherMethods: true,
        paymentNotes: true
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organización no encontrada'
      });
    }

    // Verificar si tiene algún medio de pago configurado
    const hasPaymentMethods = !!(
      tenant.paymentBankCbu || 
      tenant.paymentBankAlias || 
      tenant.paymentMercadoPago || 
      tenant.paymentPaypal ||
      tenant.paymentChequeOrder ||
      tenant.paymentOtherMethods
    );

    res.json({
      success: true,
      data: {
        companyName: tenant.name,
        companyPhone: tenant.companyPhone,
        companyEmail: tenant.companyEmail,
        hasPaymentMethods,
        bank: {
          bankName: tenant.paymentBankName,
          accountNumber: tenant.paymentBankAccount,
          cbu: tenant.paymentBankCbu,
          alias: tenant.paymentBankAlias,
          cuit: tenant.paymentBankCuit,
          holder: tenant.paymentBankHolder
        },
        digital: {
          mercadoPago: tenant.paymentMercadoPago,
          paypal: tenant.paymentPaypal
        },
        other: {
          chequeOrder: tenant.paymentChequeOrder,
          otherMethods: tenant.paymentOtherMethods
        },
        notes: tenant.paymentNotes
      }
    });

  } catch (error) {
    console.error('Error obteniendo info de pago:', error);
    res.status(500).json({ success: false, error: 'Error al obtener información de pago' });
  }
};

// =====================================================
// PERFIL DE CLIENTE
// =====================================================

/**
 * GET /api/portal/mi-cuenta
 * Obtiene los datos del cliente
 */
exports.getMiCuenta = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    // Buscar cliente vinculado
    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { userId },
          { tenantId, email: req.user.email }
        ]
      }
    });

    if (!cliente) {
      return res.json({
        success: true,
        data: {
          vinculado: false,
          mensaje: 'Tu cuenta aún no está vinculada a un perfil de cliente. Contacta al administrador.'
        }
      });
    }

    res.json({
      success: true,
      data: {
        vinculado: true,
        cliente: {
          id: cliente.id,
          razonSocial: cliente.razonSocial,
          nombreFantasia: cliente.nombreFantasia,
          tipoDocumento: cliente.tipoDocumento,
          numeroDocumento: cliente.numeroDocumento,
          condicionFiscal: cliente.condicionFiscal,
          email: cliente.email,
          telefono: cliente.telefono,
          direccion: cliente.direccion,
          ciudad: cliente.ciudad,
          provincia: cliente.provincia,
          pais: cliente.pais,
          codigoPostal: cliente.codigoPostal
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo cuenta:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cuenta' });
  }
};

module.exports = exports;
