const prisma = require('../services/prisma');
const { generarPredespachoPdf } = require('../services/pdf/predespachoPdf');

// Generar número de predespacho
const generarNumeroPredespacho = async (tenantId) => {
  const year = new Date().getFullYear();
  
  const ultimo = await prisma.predespacho.findFirst({
    where: {
      tenantId,
      numero: { startsWith: `PD-${year}-` }
    },
    orderBy: { numero: 'desc' }
  });

  let secuencia = 1;
  if (ultimo) {
    const parts = ultimo.numero.split('-');
    secuencia = parseInt(parts[2]) + 1;
  }

  return `PD-${year}-${secuencia.toString().padStart(5, '0')}`;
};

// Valores default para derechos, impuestos y gastos
const DERECHOS_DEFAULT = [
  { concepto: 'DERECHOS', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'TASA DE ESTADISTICA', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'DERECHO ADICIONAL', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'OTRO', alicuota: 0, importeUsd: 0, importeArs: 0 }
];

const IMPUESTOS_DEFAULT = [
  { concepto: 'I.V.A.', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'IVA ADICIONAL INSCR.', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'IMP. A LAS GANANCIAS', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'IIBB', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'ARANCEL SIM IMPO', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'SERV GUARDA/DIGITALI', alicuota: 0, importeUsd: 0, importeArs: 0 }
];

const GASTOS_DEFAULT = [
  { concepto: 'GASTOS', importeUsd: 0, importeArs: 0, grupo: 'AGENTE_CARGA' },
  { concepto: 'FLETE', importeUsd: 0, importeArs: 0, grupo: 'AGENTE_CARGA' },
  { concepto: 'SEGURO INTERNACIONAL', importeUsd: 0, importeArs: 0, grupo: 'AGENTE_CARGA' },
  { concepto: 'DEPOSITO FISCAL / TERMINAL', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'GASTOS DE ADUANA', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'TAP / IVETRA', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'SENASA NIMF15 GESTION Y ARANCEL', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'ACARREO DE DEPOSITO FISCAL A DEPOSITO CLIENTE', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'LEVANTAMIENTO REZAGO', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'GESTION TERCEROS ORGANISMOS', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'GASTOS OPERATIVOS & VIATICOS', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'HONORARIOS', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'SEDI', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'SERV GUARDA/DIGITALI', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'OTRO ANULACION SIMI-SEDI', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' }
];

// ==========================================
// SANITIZACIÓN DE DATOS
// ==========================================

const FLOAT_FIELDS = [
  'pesoNeto', 'pesoBruto', 'volumenM3',
  'fobDivisas', 'fobUsd', 'fleteDivisas', 'fleteUsd',
  'seguroDivisas', 'seguroUsd', 'ajusteIncluir', 'ajusteDeducir',
  'paseUsdFlete', 'paseUsdSeguro', 'tipoCambioSim', 'tipoCambioGastos',
  'valorAduana', 'baseImponible',
  'totalDerechosUsd', 'totalDerechosArs',
  'totalImpuestosUsd', 'totalImpuestosArs',
  'totalGastosUsd', 'totalGastosArs',
  'totalTransferirForwarderUsd', 'totalTransferirForwarderArs',
  'totalTransferirDepositoUsd', 'totalTransferirDepositoArs',
  'totalTransferirDespachanteUsd', 'totalTransferirDespachanteArs',
  'totalGravamenesVepUsd', 'totalGravamenesVepArs'
];

const DATE_FIELDS = ['fecha', 'validoHasta', 'fechaEnvioCliente', 'fechaVistoPorCliente'];

const sanitizeData = (data) => {
  const sanitized = { ...data };

  // Convertir fechas "YYYY-MM-DD" a ISO DateTime completo
  DATE_FIELDS.forEach(field => {
    if (sanitized[field] !== undefined) {
      if (!sanitized[field] || sanitized[field] === '') {
        sanitized[field] = null;
      } else if (typeof sanitized[field] === 'string' && sanitized[field].length === 10) {
        // "2026-02-10" → "2026-02-10T00:00:00.000Z"
        sanitized[field] = new Date(sanitized[field] + 'T12:00:00.000Z');
      } else if (typeof sanitized[field] === 'string') {
        sanitized[field] = new Date(sanitized[field]);
      }
    }
  });

  // Convertir strings vacíos a null en campos Float
  FLOAT_FIELDS.forEach(field => {
    if (sanitized[field] !== undefined) {
      if (sanitized[field] === '' || sanitized[field] === null) {
        sanitized[field] = null;
      } else {
        const parsed = parseFloat(sanitized[field]);
        sanitized[field] = isNaN(parsed) ? null : parsed;
      }
    }
  });

  // Limpiar campos que no van a la base
  delete sanitized.cliente;
  delete sanitized.mensajes;
  delete sanitized._count;
  delete sanitized.id;
  delete sanitized.createdAt;
  delete sanitized.updatedAt;

  return sanitized;
};

// ==========================================
// CRUD PARA TENANT
// ==========================================

const listarPredespachos = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { page = 1, limit = 20, search, estado } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { tenantId };
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { mercaderia: { contains: search, mode: 'insensitive' } },
        { solicitanteNombre: { contains: search, mode: 'insensitive' } },
        { descripcionPedido: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (estado) where.estado = estado;

    const [predespachos, total] = await Promise.all([
      prisma.predespacho.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { fecha: 'desc' },
        include: {
          cliente: {
            select: { id: true, razonSocial: true, numeroDocumento: true, email: true }
          },
          _count: { select: { mensajes: true } }
        }
      }),
      prisma.predespacho.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        predespachos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error listando predespachos:', error);
    res.status(500).json({ success: false, message: 'Error al listar predespachos' });
  }
};

const obtenerPredespacho = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenant_id;

    const predespacho = await prisma.predespacho.findUnique({
      where: { id },
      include: {
        cliente: {
          select: { id: true, razonSocial: true, numeroDocumento: true, email: true, condicionFiscal: true, userId: true }
        },
        mensajes: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!predespacho) {
      return res.status(404).json({ success: false, message: 'Predespacho no encontrado' });
    }

    // Verificar acceso
    if (userRole === 'client') {
      // Clientes solo ven predespachos visibles/enviados de su tenant
      const clienteVinculado = predespacho.cliente?.userId === userId;
      if (!clienteVinculado || !predespacho.visibleCliente) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
      }
    } else if (predespacho.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    res.json({ success: true, data: { predespacho } });
  } catch (error) {
    console.error('Error obteniendo predespacho:', error);
    res.status(500).json({ success: false, message: 'Error al obtener predespacho' });
  }
};

const crearPredespacho = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const usuarioId = req.user.id;
    const numero = await generarNumeroPredespacho(tenantId);

    const body = sanitizeData(req.body);

    const data = {
      derechos: DERECHOS_DEFAULT,
      impuestos: IMPUESTOS_DEFAULT,
      gastos: GASTOS_DEFAULT,
      ...body,
      tenantId,
      numero,
      usuarioId,
      estado: 'BORRADOR'
    };

    // No enviar tenantId/numero/usuarioId duplicados
    delete data.tenantId;
    delete data.numero;
    delete data.usuarioId;

    const predespacho = await prisma.predespacho.create({
      data: {
        ...data,
        tenantId,
        numero,
        usuarioId
      },
      include: {
        cliente: {
          select: { id: true, razonSocial: true, numeroDocumento: true, email: true }
        }
      }
    });

    res.status(201).json({ success: true, data: { predespacho } });
  } catch (error) {
    console.error('Error creando predespacho:', error);
    res.status(500).json({ success: false, message: 'Error al crear predespacho' });
  }
};

const actualizarPredespacho = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const existing = await prisma.predespacho.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ success: false, message: 'Predespacho no encontrado' });
    }

    const data = sanitizeData(req.body);
    delete data.tenantId;
    delete data.usuarioId;
    delete data.numero;
    delete data.estado; // estado se cambia por endpoint aparte

    const predespacho = await prisma.predespacho.update({
      where: { id },
      data,
      include: {
        cliente: {
          select: { id: true, razonSocial: true, numeroDocumento: true, email: true }
        },
        _count: { select: { mensajes: true } }
      }
    });

    res.json({ success: true, data: { predespacho } });
  } catch (error) {
    console.error('Error actualizando predespacho:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar predespacho' });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, motivoRechazo } = req.body;
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;

    const predespacho = await prisma.predespacho.findUnique({
      where: { id },
      include: { cliente: { select: { userId: true } } }
    });

    if (!predespacho) {
      return res.status(404).json({ success: false, message: 'Predespacho no encontrado' });
    }

    // Verificar permisos
    if (userRole === 'client') {
      if (predespacho.cliente?.userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
      }
      if (!['APROBADO', 'RECHAZADO'].includes(estado)) {
        return res.status(400).json({ success: false, message: 'Estado no válido para clientes' });
      }
    } else {
      if (predespacho.tenantId !== tenantId) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
      }
    }

    const updateData = { estado };
    if (motivoRechazo) updateData.motivoRechazo = motivoRechazo;
    if (estado === 'ENVIADO') {
      updateData.visibleCliente = true;
      updateData.enviadoCliente = true;
      updateData.fechaEnvioCliente = new Date();
    }

    const updated = await prisma.predespacho.update({
      where: { id },
      data: updateData,
      include: {
        cliente: {
          select: { id: true, razonSocial: true, numeroDocumento: true, email: true }
        }
      }
    });

    res.json({ success: true, data: { predespacho: updated } });
  } catch (error) {
    console.error('Error cambiando estado:', error);
    res.status(500).json({ success: false, message: 'Error al cambiar estado' });
  }
};

// ==========================================
// MENSAJES
// ==========================================

const obtenerMensajes = async (req, res) => {
  try {
    const { id } = req.params;
    const mensajes = await prisma.mensajePredespacho.findMany({
      where: { predespachoId: id },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, data: { mensajes } });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener mensajes' });
  }
};

const agregarMensaje = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensaje, adjuntos } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const nombre = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;

    const tipoRemitente = userRole === 'client' ? 'CLIENTE' : 'TENANT';

    const msg = await prisma.mensajePredespacho.create({
      data: {
        predespachoId: id,
        tipoRemitente,
        usuarioId: userId,
        nombreRemitente: nombre,
        mensaje,
        adjuntos: adjuntos || []
      }
    });

    res.status(201).json({ success: true, data: { mensaje: msg } });
  } catch (error) {
    console.error('Error agregando mensaje:', error);
    res.status(500).json({ success: false, message: 'Error al agregar mensaje' });
  }
};

const marcarMensajesLeidos = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const tipoOpuesto = userRole === 'client' ? 'TENANT' : 'CLIENTE';

    await prisma.mensajePredespacho.updateMany({
      where: { predespachoId: id, tipoRemitente: tipoOpuesto, leido: false },
      data: { leido: true, leidoAt: new Date() }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marcando leídos:', error);
    res.status(500).json({ success: false, message: 'Error al marcar mensajes' });
  }
};

// ==========================================
// PORTAL CLIENTE
// ==========================================

const listarPredespachosCliente = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar cliente vinculado al usuario
    const cliente = await prisma.cliente.findFirst({
      where: { userId }
    });

    if (!cliente) {
      return res.json({ success: true, data: { predespachos: [] } });
    }

    const predespachos = await prisma.predespacho.findMany({
      where: {
        clienteId: cliente.id,
        visibleCliente: true
      },
      orderBy: { fecha: 'desc' },
      include: {
        _count: { select: { mensajes: true } }
      }
    });

    res.json({ success: true, data: { predespachos } });
  } catch (error) {
    console.error('Error listando predespachos cliente:', error);
    res.status(500).json({ success: false, message: 'Error al listar predespachos' });
  }
};

const solicitarPredespacho = async (req, res) => {
  try {
    const { portalSlug } = req.params;
    const data = req.body;

    // Buscar tenant por portalSlug
    const tenant = await prisma.tenant.findFirst({
      where: { portalSlug, portalEnabled: true }
    });

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Portal no encontrado' });
    }

    // Buscar si hay un usuario admin del tenant para asignar
    const adminUser = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: 'admin', isActive: true }
    });

    const numero = await generarNumeroPredespacho(tenant.id);

    // Si el usuario está autenticado y es client, vincular su cliente
    let clienteId = null;
    if (req.user?.id) {
      const cliente = await prisma.cliente.findFirst({
        where: { userId: req.user.id, tenantId: tenant.id }
      });
      if (cliente) clienteId = cliente.id;
    }

    const predespacho = await prisma.predespacho.create({
      data: {
        tenantId: tenant.id,
        numero,
        estado: 'BORRADOR',
        usuarioId: adminUser?.id || tenant.id, // fallback
        clienteId,
        solicitanteNombre: data.nombre,
        solicitanteEmail: data.email,
        solicitanteTelefono: data.telefono,
        solicitanteEmpresa: data.empresa,
        descripcionPedido: data.descripcion,
        mercaderia: data.mercaderia,
        destinacion: data.destinacion,
        via: data.via,
        origenDestino: data.origenDestino,
        derechos: DERECHOS_DEFAULT,
        impuestos: IMPUESTOS_DEFAULT,
        gastos: GASTOS_DEFAULT
      }
    });

    res.status(201).json({ success: true, data: { predespacho } });
  } catch (error) {
    console.error('Error solicitando predespacho:', error);
    res.status(500).json({ success: false, message: 'Error al solicitar predespacho' });
  }
};

const marcarPredespachoVisto = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.predespacho.update({
      where: { id },
      data: { vistoPorCliente: true, fechaVistoPorCliente: new Date() }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marcando visto:', error);
    res.status(500).json({ success: false, message: 'Error al marcar como visto' });
  }
};

// ==========================================
// PDF
// ==========================================

const generarPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const predespacho = await prisma.predespacho.findUnique({
      where: { id },
      include: {
        cliente: true
      }
    });

    if (!predespacho || predespacho.tenantId !== tenantId) {
      return res.status(404).json({ success: false, message: 'Predespacho no encontrado' });
    }

    // Obtener datos del tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    // Buscar cuenta bancaria seleccionada
    let bancoSeleccionado = null;
    if (predespacho.bancoPdfId && tenant?.cuentasBancarias) {
      const cuentas = typeof tenant.cuentasBancarias === 'string' 
        ? JSON.parse(tenant.cuentasBancarias) 
        : tenant.cuentasBancarias;
      bancoSeleccionado = cuentas.find(c => c.id === predespacho.bancoPdfId);
    }

    const doc = generarPredespachoPdf(predespacho, tenant, bancoSeleccionado);

    const filename = `Predespacho-${predespacho.numero}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ success: false, message: 'Error al generar PDF' });
  }
};

module.exports = {
  listarPredespachos,
  obtenerPredespacho,
  crearPredespacho,
  actualizarPredespacho,
  cambiarEstado,
  obtenerMensajes,
  agregarMensaje,
  marcarMensajesLeidos,
  listarPredespachosCliente,
  solicitarPredespacho,
  marcarPredespachoVisto,
  generarPDF
};
