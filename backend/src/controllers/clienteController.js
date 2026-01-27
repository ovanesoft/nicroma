const prisma = require('../services/prisma');
const { query } = require('../config/database');
const crypto = require('crypto');
const { sendPortalInvitationEmail } = require('../utils/email');

// Listar clientes
const listarClientes = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { 
      page = 1, 
      limit = 20, 
      search,
      esCliente,
      esProveedor,
      activo,
      conPortal // filtrar por si tienen cuenta de portal
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { tenantId };
    
    if (search) {
      where.OR = [
        { razonSocial: { contains: search, mode: 'insensitive' } },
        { nombreFantasia: { contains: search, mode: 'insensitive' } },
        { numeroDocumento: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (esCliente !== undefined) where.esCliente = esCliente === 'true';
    if (esProveedor !== undefined) where.esProveedor = esProveedor === 'true';
    // Solo filtrar por activo si se especifica explícitamente
    if (activo !== undefined && activo !== '') {
      where.activo = activo === 'true' || activo === true;
    }
    
    // Filtrar por si tienen cuenta de portal
    if (conPortal === 'true') where.userId = { not: null };
    if (conPortal === 'false') where.userId = null;

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { razonSocial: 'asc' },
        include: {
          _count: {
            select: {
              carpetasCliente: true,
              facturas: true
            }
          }
        }
      }),
      prisma.cliente.count({ where })
    ]);

    // Obtener información de usuarios vinculados
    const clientesConUsuario = await Promise.all(
      clientes.map(async (cliente) => {
        let portalUser = null;
        if (cliente.userId) {
          const userResult = await query(
            `SELECT id, email, first_name, last_name, email_verified, last_login, is_active 
             FROM users WHERE id = $1`,
            [cliente.userId]
          );
          if (userResult.rows.length > 0) {
            const u = userResult.rows[0];
            portalUser = {
              id: u.id,
              email: u.email,
              firstName: u.first_name,
              lastName: u.last_name,
              emailVerified: u.email_verified,
              lastLogin: u.last_login,
              isActive: u.is_active
            };
          }
        }
        return { ...cliente, portalUser };
      })
    );

    res.json({
      success: true,
      data: {
        clientes: clientesConUsuario,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error listando clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar clientes'
    });
  }
};

// Obtener cliente por ID
const obtenerCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const cliente = await prisma.cliente.findFirst({
      where: { id, tenantId },
      include: {
        carpetasCliente: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            numero: true,
            estado: true,
            fechaEmision: true,
            puertoOrigen: true,
            puertoDestino: true
          }
        },
        facturas: {
          take: 10,
          orderBy: { fecha: 'desc' },
          select: {
            id: true,
            numeroCompleto: true,
            fecha: true,
            total: true,
            estado: true
          }
        },
        _count: {
          select: {
            carpetasCliente: true,
            carpetasConsignee: true,
            carpetasShipper: true,
            facturas: true
          }
        }
      }
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: { cliente }
    });
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cliente'
    });
  }
};

// Crear cliente
const crearCliente = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const createdBy = req.user.id;
    const data = req.body;

    // Verificar que no exista ya el número de documento
    const existing = await prisma.cliente.findFirst({
      where: {
        tenantId,
        numeroDocumento: data.numeroDocumento
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un cliente con ese número de documento'
      });
    }

    const cliente = await prisma.cliente.create({
      data: {
        tenantId,
        createdBy,
        razonSocial: data.razonSocial,
        nombreFantasia: data.nombreFantasia,
        tipoDocumento: data.tipoDocumento,
        numeroDocumento: data.numeroDocumento,
        condicionFiscal: data.condicionFiscal,
        email: data.email,
        telefono: data.telefono,
        direccion: data.direccion,
        ciudad: data.ciudad,
        provincia: data.provincia,
        pais: data.pais || 'Argentina',
        codigoPostal: data.codigoPostal,
        esCliente: data.esCliente !== false,
        esProveedor: data.esProveedor || false,
        esConsignee: data.esConsignee || false,
        esShipper: data.esShipper || false,
        activo: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Cliente creado',
      data: { cliente }
    });
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear cliente'
    });
  }
};

// Actualizar cliente
const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const data = req.body;

    const existing = await prisma.cliente.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Si se cambia el número de documento, verificar que no exista
    if (data.numeroDocumento && data.numeroDocumento !== existing.numeroDocumento) {
      const duplicate = await prisma.cliente.findFirst({
        where: {
          tenantId,
          numeroDocumento: data.numeroDocumento,
          id: { not: id }
        }
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un cliente con ese número de documento'
        });
      }
    }

    // No permitir cambiar tenantId
    delete data.tenantId;

    const cliente = await prisma.cliente.update({
      where: { id },
      data
    });

    res.json({
      success: true,
      message: 'Cliente actualizado',
      data: { cliente }
    });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar cliente'
    });
  }
};

// Desactivar cliente
const desactivarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const cliente = await prisma.cliente.findFirst({
      where: { id, tenantId }
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    await prisma.cliente.update({
      where: { id },
      data: { activo: false }
    });

    res.json({
      success: true,
      message: 'Cliente desactivado'
    });
  } catch (error) {
    console.error('Error desactivando cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar cliente'
    });
  }
};

// Buscar clientes (para autocomplete)
const buscarClientes = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { q, tipo } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: { clientes: [] } });
    }

    const where = {
      tenantId,
      activo: true,
      OR: [
        { razonSocial: { contains: q, mode: 'insensitive' } },
        { nombreFantasia: { contains: q, mode: 'insensitive' } },
        { numeroDocumento: { contains: q, mode: 'insensitive' } }
      ]
    };

    // Filtrar por tipo si se especifica
    if (tipo === 'cliente') where.esCliente = true;
    if (tipo === 'proveedor') where.esProveedor = true;
    if (tipo === 'consignee') where.esConsignee = true;
    if (tipo === 'shipper') where.esShipper = true;

    const clientes = await prisma.cliente.findMany({
      where,
      take: 10,
      select: {
        id: true,
        razonSocial: true,
        nombreFantasia: true,
        numeroDocumento: true,
        email: true,
        telefono: true
      },
      orderBy: { razonSocial: 'asc' }
    });

    res.json({
      success: true,
      data: { clientes }
    });
  } catch (error) {
    console.error('Error buscando clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar clientes'
    });
  }
};

// Invitar cliente al portal
const invitarAlPortal = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    // Obtener cliente
    const cliente = await prisma.cliente.findFirst({
      where: { id, tenantId }
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (!cliente.email) {
      return res.status(400).json({
        success: false,
        message: 'El cliente no tiene email registrado'
      });
    }

    if (cliente.userId) {
      return res.status(400).json({
        success: false,
        message: 'Este cliente ya tiene una cuenta de portal'
      });
    }

    // Verificar si ya existe un usuario con ese email
    const existingUser = await query(
      'SELECT id, email FROM users WHERE LOWER(email) = $1',
      [cliente.email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      // Si existe, vincular directamente
      await prisma.cliente.update({
        where: { id },
        data: { userId: existingUser.rows[0].id }
      });

      return res.json({
        success: true,
        message: 'Cliente vinculado a cuenta existente'
      });
    }

    // Obtener datos del tenant para el email
    const tenantResult = await query(
      'SELECT name, portal_slug FROM tenants WHERE id = $1',
      [tenantId]
    );
    const tenant = tenantResult.rows[0];

    // Generar token de invitación
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // Guardar invitación en una tabla temporal o usar el sistema de invitaciones existente
    // Por simplicidad, creamos directamente el usuario con estado pendiente
    const passwordTemp = crypto.randomBytes(16).toString('hex');
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(passwordTemp, 12);

    const userResult = await query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name,
        tenant_id, role, auth_provider,
        email_verification_token, email_verification_expires,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, 'client', 'local', $6, $7, true)
      RETURNING id`,
      [
        cliente.email.toLowerCase(),
        passwordHash,
        cliente.nombreFantasia || cliente.razonSocial.split(' ')[0],
        cliente.razonSocial.split(' ').slice(1).join(' ') || '',
        tenantId,
        inviteToken,
        inviteExpires
      ]
    );

    const newUserId = userResult.rows[0].id;

    // Vincular cliente con el nuevo usuario
    await prisma.cliente.update({
      where: { id },
      data: { userId: newUserId }
    });

    // Enviar email de invitación
    const portalUrl = `${process.env.FRONTEND_URL}/portal/${tenant.portal_slug}`;
    
    try {
      await sendPortalInvitationEmail(
        cliente.email,
        cliente.nombreFantasia || cliente.razonSocial,
        tenant.name,
        portalUrl,
        inviteToken
      );
    } catch (emailError) {
      console.error('Error enviando email de invitación:', emailError);
    }

    res.json({
      success: true,
      message: 'Invitación enviada al cliente'
    });

  } catch (error) {
    console.error('Error invitando cliente al portal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar invitación'
    });
  }
};

// Desvincular usuario del cliente
const desvincularUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const cliente = await prisma.cliente.findFirst({
      where: { id, tenantId }
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (!cliente.userId) {
      return res.status(400).json({
        success: false,
        message: 'Este cliente no tiene cuenta de portal vinculada'
      });
    }

    // Desvincular (no eliminamos el usuario, solo quitamos el vínculo)
    await prisma.cliente.update({
      where: { id },
      data: { userId: null }
    });

    res.json({
      success: true,
      message: 'Usuario desvinculado del cliente'
    });

  } catch (error) {
    console.error('Error desvinculando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desvincular usuario'
    });
  }
};

// Vincular usuario existente a cliente
const vincularUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const tenantId = req.user.tenant_id;

    const cliente = await prisma.cliente.findFirst({
      where: { id, tenantId }
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Verificar que el usuario existe y es del mismo tenant
    const userResult = await query(
      'SELECT id, email FROM users WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar que el usuario no esté ya vinculado a otro cliente
    const existingLink = await prisma.cliente.findFirst({
      where: {
        tenantId,
        userId,
        id: { not: id }
      }
    });

    if (existingLink) {
      return res.status(400).json({
        success: false,
        message: 'Este usuario ya está vinculado a otro cliente'
      });
    }

    // Vincular
    await prisma.cliente.update({
      where: { id },
      data: { userId }
    });

    res.json({
      success: true,
      message: 'Usuario vinculado al cliente'
    });

  } catch (error) {
    console.error('Error vinculando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al vincular usuario'
    });
  }
};

module.exports = {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  desactivarCliente,
  buscarClientes,
  invitarAlPortal,
  desvincularUsuario,
  vincularUsuario
};
