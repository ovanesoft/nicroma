const prisma = require('../services/prisma');
const { generarPresupuestoFormal } = require('../services/pdf/presupuestoFormal');

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
        shipper: true,
        consignee: true,
        items: {
          orderBy: { createdAt: 'asc' }
        },
        mercancias: {
          orderBy: { createdAt: 'asc' }
        },
        contenedores: {
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
        tipoOperacionAerea: data.tipoOperacionAerea || null,
        
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
        tipoOperacionAerea: data.tipoOperacionAerea || null,
        
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

    // Extraer items, mercancias y contenedores del update
    const { items, mercancias, contenedores, ...restData } = data;

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
          tipoOperacionAerea: restData.tipoOperacionAerea || null,
          
          puertoOrigen: restData.puertoOrigen,
          puertoDestino: restData.puertoDestino,
          puertoTransbordo: restData.puertoTransbordo,
          
          fechaValidez: restData.fechaValidez ? new Date(restData.fechaValidez) : null,
          fechaSalidaEstimada: restData.fechaSalidaEstimada ? new Date(restData.fechaSalidaEstimada) : null,
          fechaLlegadaEstimada: restData.fechaLlegadaEstimada ? new Date(restData.fechaLlegadaEstimada) : null,
          
          // Transporte
          buque: restData.buque,
          viaje: restData.viaje,
          transportista: restData.transportista,
          booking: restData.booking,
          depositoFiscal: restData.depositoFiscal,
          
          // BLs
          masterBL: restData.masterBL,
          houseBL: restData.houseBL,
          
          // Referencias
          referenciaCliente: restData.referenciaCliente,
          
          incoterm: restData.incoterm,
          condiciones: restData.condiciones,
          moneda: restData.moneda,
          
          observaciones: restData.observaciones,
          notasInternas: restData.notasInternas,
          bancoPdfId: restData.bancoPdfId || null
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
              totalCosto: (parseFloat(i.montoCosto) || 0) * (parseFloat(i.cantidad) || 1),
              gravado: i.gravado !== false,
              porcentajeIVA: parseFloat(i.porcentajeIVA) || 21
            }))
          });
        }
      }
      
      // Actualizar mercancías
      if (mercancias !== undefined) {
        await tx.mercanciaPresupuesto.deleteMany({ where: { presupuestoId: id } });
        
        if (mercancias && mercancias.length > 0) {
          await tx.mercanciaPresupuesto.createMany({
            data: mercancias.filter(m => m.descripcion).map(m => ({
              presupuestoId: id,
              descripcion: m.descripcion,
              embalaje: m.embalaje || null,
              marcas: m.marcas || null,
              bultos: parseInt(m.bultos) || null,
              volumen: parseFloat(m.volumen) || null,
              peso: parseFloat(m.peso) || null,
              valorMercaderia: parseFloat(m.valorMercaderia) || null,
              valorCIF: parseFloat(m.valorCIF) || null,
              hsCode: m.hsCode || null
            }))
          });
        }
      }
      
      // Actualizar contenedores
      if (contenedores !== undefined) {
        await tx.contenedorPresupuesto.deleteMany({ where: { presupuestoId: id } });
        
        if (contenedores && contenedores.length > 0) {
          await tx.contenedorPresupuesto.createMany({
            data: contenedores.filter(c => c.tipo).map(c => ({
              presupuestoId: id,
              tipo: c.tipo,
              numero: c.numero || null,
              blContenedor: c.blContenedor || null,
              condicion: c.condicion || null,
              precinto: c.precinto || null,
              cantidad: parseInt(c.cantidad) || 1,
              tara: parseFloat(c.tara) || null,
              pesoMaximo: parseFloat(c.pesoMaximo) || null
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
          mercancias: { orderBy: { createdAt: 'asc' } },
          contenedores: { orderBy: { createdAt: 'asc' } },
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
      mensajesNoLeidos: 0,
      predespachosPendientes: 0,
      predespachosParaRevisar: 0,
      mensajesPredespachoNoLeidos: 0
    };

    if (userRole === 'client') {
      // Para clientes del portal
      const cliente = await prisma.cliente.findFirst({
        where: { userId }
      });

      if (cliente) {
        // Presupuestos enviados por el tenant para que el cliente revise (no vistos aún)
        const presupuestosParaRevisar = await prisma.presupuesto.count({
          where: {
            clienteId: cliente.id,
            estado: 'ENVIADO',
            vistoPorCliente: false  // Solo contar los que no ha visto
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

        // Predespachos enviados al cliente para revisar
        const predespachosParaRevisar = await prisma.predespacho.count({
          where: {
            clienteId: cliente.id,
            estado: 'ENVIADO',
            vistoPorCliente: false
          }
        });
        notificaciones.predespachosParaRevisar = predespachosParaRevisar;
      }
    } else if (tenantId && ['admin', 'manager', 'user'].includes(userRole)) {
      // Para usuarios del tenant
      // Presupuestos pendientes de atender (no vistos aún)
      const presupuestosPendientes = await prisma.presupuesto.count({
        where: {
          tenantId,
          estado: 'PENDIENTE',
          vistoPorTenant: false  // Solo contar los que no han visto
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

      // Predespachos: solicitudes nuevas (en borrador, recién llegadas de clientes)
      const predespachosPendientes = await prisma.predespacho.count({
        where: {
          tenantId,
          estado: 'BORRADOR',
          descripcionPedido: { not: null } // Solo los que vienen de solicitudes de clientes
        }
      });

      // Mensajes de predespacho no leídos de clientes
      const mensajesPredespachoNoLeidos = await prisma.mensajePredespacho.count({
        where: {
          predespacho: { tenantId },
          tipoRemitente: 'CLIENTE',
          leido: false
        }
      });

      notificaciones.predespachosPendientes = predespachosPendientes;
      notificaciones.mensajesPredespachoNoLeidos = mensajesPredespachoNoLeidos;
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

// Marcar presupuesto como visto (cliente o tenant)
const marcarPresupuestoVisto = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenant_id;

    let presupuesto;
    let updateData = {};

    if (userRole === 'client') {
      // Para clientes: verificar que el presupuesto le pertenece
      const cliente = await prisma.cliente.findFirst({
        where: { userId }
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      presupuesto = await prisma.presupuesto.findFirst({
        where: {
          id,
          clienteId: cliente.id
        }
      });

      if (!presupuesto) {
        return res.status(404).json({
          success: false,
          message: 'Presupuesto no encontrado'
        });
      }

      // Marcar como visto por cliente
      if (!presupuesto.vistoPorCliente) {
        updateData = {
          vistoPorCliente: true,
          fechaVistoPorCliente: new Date()
        };
      }
    } else if (['admin', 'manager', 'user'].includes(userRole) && tenantId) {
      // Para usuarios del tenant: verificar que el presupuesto pertenece al tenant
      presupuesto = await prisma.presupuesto.findFirst({
        where: {
          id,
          tenantId
        }
      });

      if (!presupuesto) {
        return res.status(404).json({
          success: false,
          message: 'Presupuesto no encontrado'
        });
      }

      // Marcar como visto por tenant
      if (!presupuesto.vistoPorTenant) {
        updateData = {
          vistoPorTenant: true,
          fechaVistoPorTenant: new Date()
        };
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'No autorizado'
      });
    }

    // Actualizar si hay datos
    if (Object.keys(updateData).length > 0) {
      await prisma.presupuesto.update({
        where: { id },
        data: updateData
      });
    }

    res.json({
      success: true,
      message: 'Presupuesto marcado como visto'
    });
  } catch (error) {
    console.error('Error marcando presupuesto como visto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar presupuesto como visto'
    });
  }
};

// Generar PDF de Presupuesto Formal
const generarPDFPresupuestoFormal = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    // Obtener presupuesto con todas las relaciones necesarias
    const presupuesto = await prisma.presupuesto.findFirst({
      where: { id, tenantId },
      include: {
        cliente: true,
        shipper: true,
        consignee: true,
        items: true,
        mercancias: true,
        contenedores: true
      }
    });

    if (!presupuesto) {
      return res.status(404).json({
        success: false,
        message: 'Presupuesto no encontrado'
      });
    }

    // Obtener datos del tenant para incluir datos bancarios
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        cuentasBancarias: true,
        companyAddress: true,
        companyPhone: true,
        companyEmail: true
      }
    });

    // Obtener banco seleccionado o el principal
    let bancoSeleccionado = null;
    const cuentasBancarias = tenant?.cuentasBancarias || [];
    if (cuentasBancarias.length > 0) {
      if (presupuesto.bancoPdfId) {
        bancoSeleccionado = cuentasBancarias.find(c => c.id === presupuesto.bancoPdfId);
      }
      // Si no hay seleccionado o no se encontró, usar el principal
      if (!bancoSeleccionado) {
        bancoSeleccionado = cuentasBancarias.find(c => c.esPrincipal) || cuentasBancarias[0];
      }
    }

    // Generar el PDF
    const doc = generarPresupuestoFormal(presupuesto, tenant, bancoSeleccionado);

    // Configurar headers para descarga
    const filename = `Presupuesto_Formal_${presupuesto.numero}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Enviar el PDF como stream
    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error('Error generando PDF de presupuesto formal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el PDF'
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
  marcarMensajesLeidos,
  marcarPresupuestoVisto,
  generarPDFPresupuestoFormal
};
