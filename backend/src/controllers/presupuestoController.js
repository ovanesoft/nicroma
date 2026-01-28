const prisma = require('../services/prisma');

// Generar número de presupuesto
const generarNumeroPresupuesto = async (tenantId) => {
  const year = new Date().getFullYear();
  
  const ultimoPresupuesto = await prisma.presupuesto.findFirst({
    where: {
      tenantId,
      numero: {
        startsWith: `PRES-${year}-`
      }
    },
    orderBy: {
      numero: 'desc'
    }
  });

  let secuencia = 1;
  if (ultimoPresupuesto) {
    const parts = ultimoPresupuesto.numero.split('-');
    secuencia = parseInt(parts[2]) + 1;
  }

  return `PRES-${year}-${secuencia.toString().padStart(5, '0')}`;
};

// Listar presupuestos
const listarPresupuestos = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { 
      page = 1, 
      limit = 20, 
      search, 
      estado,
      clienteId,
      orderBy = 'fechaSolicitud',
      orderDir = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { tenantId };
    
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { solicitanteNombre: { contains: search, mode: 'insensitive' } },
        { solicitanteEmail: { contains: search, mode: 'insensitive' } },
        { descripcionPedido: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (estado) where.estado = estado;
    if (clienteId) where.clienteId = clienteId;

    const [presupuestos, total] = await Promise.all([
      prisma.presupuesto.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [orderBy]: orderDir },
        include: {
          cliente: {
            select: {
              id: true,
              razonSocial: true,
              numeroDocumento: true,
              email: true
            }
          },
          _count: {
            select: {
              items: true,
              mensajes: true
            }
          }
        }
      }),
      prisma.presupuesto.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        presupuestos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error listando presupuestos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar presupuestos'
    });
  }
};

// Obtener presupuesto por ID
const obtenerPresupuesto = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    
    // Si es cliente, verificar que el presupuesto le pertenece
    let whereClause = { id };
    if (userRole === 'client') {
      // Para clientes, buscar por su cliente vinculado
      const cliente = await prisma.cliente.findFirst({
        where: { userId: req.user.id }
      });
      if (cliente) {
        whereClause.clienteId = cliente.id;
      }
    } else {
      whereClause.tenantId = tenantId;
    }

    const presupuesto = await prisma.presupuesto.findFirst({
      where: whereClause,
      include: {
        cliente: true,
        items: {
          orderBy: { createdAt: 'asc' }
        },
        mensajes: {
          orderBy: { createdAt: 'asc' }
        },
        carpeta: {
          select: {
            id: true,
            numero: true,
            estado: true
          }
        }
      }
    });

    if (!presupuesto) {
      return res.status(404).json({
        success: false,
        message: 'Presupuesto no encontrado'
      });
    }

    res.json({
      success: true,
      data: { presupuesto }
    });
  } catch (error) {
    console.error('Error obteniendo presupuesto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener presupuesto'
    });
  }
};

// Crear presupuesto (desde tenant)
const crearPresupuesto = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const usuarioId = req.user.id;
    const data = req.body;

    const numero = await generarNumeroPresupuesto(tenantId);

    const presupuesto = await prisma.presupuesto.create({
      data: {
        tenantId,
        usuarioId,
        numero,
        estado: 'EN_PROCESO',
        
        clienteId: data.clienteId || null,
        solicitanteNombre: data.solicitanteNombre,
        solicitanteEmail: data.solicitanteEmail,
        solicitanteTelefono: data.solicitanteTelefono,
        solicitanteEmpresa: data.solicitanteEmpresa,
        
        descripcionPedido: data.descripcionPedido,
        
        area: data.area || 'Marítimo',
        sector: data.sector || 'Importación',
        tipoOperacion: data.tipoOperacion,
        
        puertoOrigen: data.puertoOrigen,
        puertoDestino: data.puertoDestino,
        
        fechaValidez: data.fechaValidez ? new Date(data.fechaValidez) : null,
        
        incoterm: data.incoterm,
        condiciones: data.condiciones,
        moneda: data.moneda || 'USD',
        
        observaciones: data.observaciones,
        notasInternas: data.notasInternas,
        
        items: data.items ? {
          create: data.items.filter(i => i.concepto).map(i => ({
            concepto: i.concepto,
            descripcion: i.descripcion,
            prepaidCollect: i.prepaidCollect || 'P',
            divisa: i.divisa || 'USD',
            montoVenta: parseFloat(i.montoVenta) || 0,
            montoCosto: parseFloat(i.montoCosto) || 0,
            base: i.base,
            cantidad: parseFloat(i.cantidad) || 1,
            totalVenta: (parseFloat(i.montoVenta) || 0) * (parseFloat(i.cantidad) || 1),
            totalCosto: (parseFloat(i.montoCosto) || 0) * (parseFloat(i.cantidad) || 1)
          }))
        } : undefined
      },
      include: {
        cliente: true,
        items: true
      }
    });

    // Calcular totales
    const totalVenta = presupuesto.items.reduce((sum, i) => sum + i.totalVenta, 0);
    const totalCosto = presupuesto.items.reduce((sum, i) => sum + i.totalCosto, 0);
    
    await prisma.presupuesto.update({
      where: { id: presupuesto.id },
      data: { totalVenta, totalCosto }
    });

    res.status(201).json({
      success: true,
      message: 'Presupuesto creado exitosamente',
      data: { presupuesto: { ...presupuesto, totalVenta, totalCosto } }
    });
  } catch (error) {
    console.error('Error creando presupuesto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear presupuesto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Solicitar presupuesto (desde cliente/portal)
const solicitarPresupuesto = async (req, res) => {
  try {
    const { portalSlug } = req.params;
    const data = req.body;

    // Buscar el tenant por el slug del portal
    const tenant = await prisma.$queryRaw`
      SELECT id, name FROM tenants WHERE portal_slug = ${portalSlug} AND portal_enabled = true
    `;

    if (!tenant || tenant.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Portal no encontrado'
      });
    }

    const tenantId = tenant[0].id;
    
    // Buscar cliente si está autenticado
    let clienteId = null;
    let usuarioId = null;
    
    if (req.user) {
      usuarioId = req.user.id;
      const cliente = await prisma.cliente.findFirst({
        where: { userId: req.user.id, tenantId }
      });
      if (cliente) {
        clienteId = cliente.id;
      }
    }

    const numero = await generarNumeroPresupuesto(tenantId);

    const presupuesto = await prisma.presupuesto.create({
      data: {
        tenantId,
        usuarioId: usuarioId || '00000000-0000-0000-0000-000000000000', // placeholder si no hay usuario
        numero,
        estado: 'PENDIENTE',
        
        clienteId,
        solicitanteNombre: data.nombre,
        solicitanteEmail: data.email,
        solicitanteTelefono: data.telefono,
        solicitanteEmpresa: data.empresa,
        
        descripcionPedido: data.descripcion,
        
        area: data.area || 'Marítimo',
        sector: data.sector || 'Importación',
        tipoOperacion: data.tipoOperacion,
        
        puertoOrigen: data.puertoOrigen,
        puertoDestino: data.puertoDestino,
        
        // Mensaje inicial
        mensajes: {
          create: {
            tipoRemitente: 'CLIENTE',
            usuarioId: usuarioId,
            nombreRemitente: data.nombre || 'Cliente',
            mensaje: data.descripcion || 'Solicitud de presupuesto'
          }
        }
      },
      include: {
        mensajes: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Solicitud de presupuesto enviada',
      data: { presupuesto }
    });
  } catch (error) {
    console.error('Error solicitando presupuesto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al solicitar presupuesto'
    });
  }
};

// Actualizar presupuesto
const actualizarPresupuesto = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const data = req.body;

    const existing = await prisma.presupuesto.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Presupuesto no encontrado'
      });
    }

    // Extraer items del update
    const { items, ...restData } = data;

    // Actualizar usando transacción
    const presupuesto = await prisma.$transaction(async (tx) => {
      // Actualizar datos principales
      await tx.presupuesto.update({
        where: { id },
        data: {
          clienteId: restData.clienteId || null,
          solicitanteNombre: restData.solicitanteNombre,
          solicitanteEmail: restData.solicitanteEmail,
          solicitanteTelefono: restData.solicitanteTelefono,
          solicitanteEmpresa: restData.solicitanteEmpresa,
          
          descripcionPedido: restData.descripcionPedido,
          
          area: restData.area,
          sector: restData.sector,
          tipoOperacion: restData.tipoOperacion,
          
          puertoOrigen: restData.puertoOrigen,
          puertoDestino: restData.puertoDestino,
          
          fechaValidez: restData.fechaValidez ? new Date(restData.fechaValidez) : null,
          
          incoterm: restData.incoterm,
          condiciones: restData.condiciones,
          moneda: restData.moneda,
          
          observaciones: restData.observaciones,
          notasInternas: restData.notasInternas
        }
      });

      // Actualizar items
      if (items !== undefined) {
        await tx.itemPresupuesto.deleteMany({ where: { presupuestoId: id } });
        
        if (items && items.length > 0) {
          await tx.itemPresupuesto.createMany({
            data: items.filter(i => i.concepto).map(i => ({
              presupuestoId: id,
              concepto: i.concepto,
              descripcion: i.descripcion || null,
              prepaidCollect: i.prepaidCollect || 'P',
              divisa: i.divisa || 'USD',
              montoVenta: parseFloat(i.montoVenta) || 0,
              montoCosto: parseFloat(i.montoCosto) || 0,
              base: i.base || null,
              cantidad: parseFloat(i.cantidad) || 1,
              totalVenta: (parseFloat(i.montoVenta) || 0) * (parseFloat(i.cantidad) || 1),
              totalCosto: (parseFloat(i.montoCosto) || 0) * (parseFloat(i.cantidad) || 1)
            }))
          });
        }
      }

      // Obtener items actualizados para calcular totales
      const itemsActualizados = await tx.itemPresupuesto.findMany({
        where: { presupuestoId: id }
      });
      
      const totalVenta = itemsActualizados.reduce((sum, i) => sum + i.totalVenta, 0);
      const totalCosto = itemsActualizados.reduce((sum, i) => sum + i.totalCosto, 0);
      
      return tx.presupuesto.update({
        where: { id },
        data: { totalVenta, totalCosto },
        include: {
          cliente: true,
          items: { orderBy: { createdAt: 'asc' } },
          mensajes: { orderBy: { createdAt: 'asc' } }
        }
      });
    });

    res.json({
      success: true,
      message: 'Presupuesto actualizado',
      data: { presupuesto }
    });
  } catch (error) {
    console.error('Error actualizando presupuesto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar presupuesto'
    });
  }
};

// Cambiar estado del presupuesto
const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, motivoRechazo } = req.body;
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;

    // Buscar presupuesto
    let whereClause = { id };
    if (userRole !== 'client') {
      whereClause.tenantId = tenantId;
    }

    const presupuesto = await prisma.presupuesto.findFirst({
      where: whereClause
    });

    if (!presupuesto) {
      return res.status(404).json({
        success: false,
        message: 'Presupuesto no encontrado'
      });
    }

    // Validar transiciones de estado permitidas
    const transicionesValidas = {
      'PENDIENTE': ['EN_PROCESO', 'RECHAZADO'],
      'EN_PROCESO': ['ENVIADO', 'RECHAZADO'],
      'ENVIADO': ['APROBADO', 'RECHAZADO', 'EN_PROCESO'],
      'APROBADO': ['CONVERTIDO'],
      'RECHAZADO': ['EN_PROCESO'],
      'CONVERTIDO': [],
      'VENCIDO': ['EN_PROCESO']
    };

    if (!transicionesValidas[presupuesto.estado]?.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `No se puede cambiar de ${presupuesto.estado} a ${estado}`
      });
    }

    const updateData = {
      estado,
      motivoRechazo: estado === 'RECHAZADO' ? motivoRechazo : null
    };

    if (estado === 'ENVIADO') {
      updateData.fechaRespuesta = new Date();
    }
    if (estado === 'APROBADO') {
      updateData.fechaAprobacion = new Date();
    }

    const actualizado = await prisma.presupuesto.update({
      where: { id },
      data: updateData,
      include: {
        cliente: true,
        items: true
      }
    });

    res.json({
      success: true,
      message: `Presupuesto ${estado.toLowerCase()}`,
      data: { presupuesto: actualizado }
    });
  } catch (error) {
    console.error('Error cambiando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado'
    });
  }
};

// Convertir presupuesto a carpeta
const convertirACarpeta = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const usuarioId = req.user.id;

    const presupuesto = await prisma.presupuesto.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        cliente: true
      }
    });

    if (!presupuesto) {
      return res.status(404).json({
        success: false,
        message: 'Presupuesto no encontrado'
      });
    }

    if (presupuesto.estado !== 'APROBADO') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden convertir presupuestos aprobados'
      });
    }

    if (presupuesto.carpetaId) {
      return res.status(400).json({
        success: false,
        message: 'Este presupuesto ya fue convertido a carpeta'
      });
    }

    // Generar número de carpeta
    const year = new Date().getFullYear();
    const areaCode = (presupuesto.area || 'Marítimo').substring(0, 2).toUpperCase();
    const sectorCode = presupuesto.sector === 'Importación' ? 'I' : 'E';
    
    const ultimaCarpeta = await prisma.carpeta.findFirst({
      where: {
        tenantId,
        numero: { startsWith: `${year}-${areaCode}${sectorCode}-` }
      },
      orderBy: { numero: 'desc' }
    });

    let secuencia = 1;
    if (ultimaCarpeta) {
      const parts = ultimaCarpeta.numero.split('-');
      secuencia = parseInt(parts[2]) + 1;
    }
    const numeroCarpeta = `${year}-${areaCode}${sectorCode}-${secuencia.toString().padStart(6, '0')}`;

    // Crear carpeta con transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear carpeta
      const carpeta = await tx.carpeta.create({
        data: {
          tenantId,
          usuarioId,
          numero: numeroCarpeta,
          estado: 'HOUSE',
          area: presupuesto.area || 'Marítimo',
          sector: presupuesto.sector || 'Importación',
          tipoOperacion: presupuesto.tipoOperacion || 'FCL-FCL',
          
          clienteId: presupuesto.clienteId,
          puertoOrigen: presupuesto.puertoOrigen,
          puertoDestino: presupuesto.puertoDestino,
          
          incoterm: presupuesto.incoterm,
          moneda: presupuesto.moneda || 'USD',
          
          observaciones: `Convertido desde presupuesto ${presupuesto.numero}`,
          
          // Copiar items como gastos
          gastos: {
            create: presupuesto.items.map(item => ({
              concepto: item.concepto,
              prepaidCollect: item.prepaidCollect || 'Prepaid',
              divisa: item.divisa || 'USD',
              montoVenta: item.montoVenta,
              montoCosto: item.montoCosto,
              base: item.base,
              cantidad: item.cantidad,
              totalVenta: item.totalVenta,
              totalCosto: item.totalCosto,
              gravado: true,
              porcentajeIVA: 21
            }))
          }
        },
        include: {
          cliente: true,
          gastos: true
        }
      });

      // Actualizar presupuesto
      await tx.presupuesto.update({
        where: { id },
        data: {
          estado: 'CONVERTIDO',
          carpetaId: carpeta.id
        }
      });

      // Agregar mensaje de conversión
      await tx.mensajePresupuesto.create({
        data: {
          presupuestoId: id,
          tipoRemitente: 'SISTEMA',
          nombreRemitente: 'Sistema',
          mensaje: `Presupuesto convertido a carpeta ${numeroCarpeta}`
        }
      });

      return carpeta;
    });

    res.json({
      success: true,
      message: 'Presupuesto convertido a carpeta exitosamente',
      data: { carpeta: resultado }
    });
  } catch (error) {
    console.error('Error convirtiendo a carpeta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al convertir a carpeta'
    });
  }
};

// Agregar mensaje al chat
const agregarMensaje = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensaje, adjuntos } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Determinar tipo de remitente
    let tipoRemitente = 'TENANT';
    if (userRole === 'client') {
      tipoRemitente = 'CLIENTE';
    }

    // Obtener nombre del remitente
    const nombreRemitente = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;

    const nuevoMensaje = await prisma.mensajePresupuesto.create({
      data: {
        presupuestoId: id,
        tipoRemitente,
        usuarioId: userId,
        nombreRemitente,
        mensaje,
        adjuntos: adjuntos || null
      }
    });

    res.status(201).json({
      success: true,
      data: { mensaje: nuevoMensaje }
    });
  } catch (error) {
    console.error('Error agregando mensaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar mensaje'
    });
  }
};

// Obtener mensajes de un presupuesto
const obtenerMensajes = async (req, res) => {
  try {
    const { id } = req.params;

    const mensajes = await prisma.mensajePresupuesto.findMany({
      where: { presupuestoId: id },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: { mensajes }
    });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mensajes'
    });
  }
};

// Listar presupuestos del cliente (portal)
const listarPresupuestosCliente = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar cliente vinculado
    const cliente = await prisma.cliente.findFirst({
      where: { userId }
    });

    if (!cliente) {
      return res.json({
        success: true,
        data: { presupuestos: [] }
      });
    }

    const presupuestos = await prisma.presupuesto.findMany({
      where: { clienteId: cliente.id },
      orderBy: { fechaSolicitud: 'desc' },
      include: {
        _count: {
          select: {
            items: true,
            mensajes: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { presupuestos }
    });
  } catch (error) {
    console.error('Error listando presupuestos cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar presupuestos'
    });
  }
};

// Obtener conteos de notificaciones
const obtenerNotificaciones = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenant_id;

    let notificaciones = {
      presupuestosPendientes: 0,
      presupuestosParaRevisar: 0,
      mensajesNoLeidos: 0
    };

    if (userRole === 'client') {
      // Para clientes del portal
      const cliente = await prisma.cliente.findFirst({
        where: { userId }
      });

      if (cliente) {
        // Presupuestos enviados por el tenant para que el cliente revise
        const presupuestosParaRevisar = await prisma.presupuesto.count({
          where: {
            clienteId: cliente.id,
            estado: 'ENVIADO'
          }
        });

        // Mensajes no leídos del tenant
        const mensajesNoLeidos = await prisma.mensajePresupuesto.count({
          where: {
            presupuesto: {
              clienteId: cliente.id
            },
            tipoRemitente: 'TENANT',
            leido: false
          }
        });

        notificaciones.presupuestosParaRevisar = presupuestosParaRevisar;
        notificaciones.mensajesNoLeidos = mensajesNoLeidos;
      }
    } else if (tenantId && ['admin', 'manager', 'user'].includes(userRole)) {
      // Para usuarios del tenant
      // Presupuestos pendientes de atender
      const presupuestosPendientes = await prisma.presupuesto.count({
        where: {
          tenantId,
          estado: 'PENDIENTE'
        }
      });

      // Mensajes no leídos de clientes
      const mensajesNoLeidos = await prisma.mensajePresupuesto.count({
        where: {
          presupuesto: {
            tenantId
          },
          tipoRemitente: 'CLIENTE',
          leido: false
        }
      });

      notificaciones.presupuestosPendientes = presupuestosPendientes;
      notificaciones.mensajesNoLeidos = mensajesNoLeidos;
    }

    res.json({
      success: true,
      data: { notificaciones }
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones'
    });
  }
};

// Marcar mensajes como leídos
const marcarMensajesLeidos = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Determinar qué mensajes marcar según el rol
    let tipoRemitente;
    if (userRole === 'client') {
      tipoRemitente = 'TENANT'; // Clientes marcan mensajes del tenant
    } else {
      tipoRemitente = 'CLIENTE'; // Tenant marca mensajes del cliente
    }

    await prisma.mensajePresupuesto.updateMany({
      where: {
        presupuestoId: id,
        tipoRemitente,
        leido: false
      },
      data: {
        leido: true,
        leidoAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Mensajes marcados como leídos'
    });
  } catch (error) {
    console.error('Error marcando mensajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar mensajes como leídos'
    });
  }
};

module.exports = {
  listarPresupuestos,
  obtenerPresupuesto,
  crearPresupuesto,
  solicitarPresupuesto,
  actualizarPresupuesto,
  cambiarEstado,
  convertirACarpeta,
  agregarMensaje,
  obtenerMensajes,
  listarPresupuestosCliente,
  obtenerNotificaciones,
  marcarMensajesLeidos
};
