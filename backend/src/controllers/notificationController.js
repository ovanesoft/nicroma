const prisma = require('../services/prisma');

// Obtener notificaciones del usuario actual
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenant_id;
    const { unreadOnly, limit = 20 } = req.query;

    // Construir condiciones de filtro
    const whereConditions = {
      isActive: true,
      OR: [
        // Notificaciones broadcast (sin tenant ni user específico)
        { tenantId: null, userId: null },
        // Notificaciones para el tenant del usuario
        ...(tenantId ? [{ tenantId, userId: null }] : []),
        // Notificaciones específicas para el usuario
        { userId }
      ],
      // Filtrar por roles si está definido
      AND: [
        {
          OR: [
            { targetRoles: { equals: [] } },
            { targetRoles: { array_contains: [userRole] } }
          ]
        }
      ],
      // No mostrar expiradas
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    };

    // Obtener notificaciones
    const notifications = await prisma.systemNotification.findMany({
      where: whereConditions,
      include: {
        reads: {
          where: { userId }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit)
    });

    // Formatear respuesta
    const formattedNotifications = notifications.map(n => ({
      id: n.id,
      type: n.type,
      priority: n.priority,
      title: n.title,
      message: n.message,
      actionUrl: n.actionUrl,
      actionLabel: n.actionLabel,
      metadata: n.metadata,
      createdAt: n.createdAt,
      expiresAt: n.expiresAt,
      isRead: n.reads.length > 0,
      readAt: n.reads[0]?.readAt || null
    }));

    // Filtrar solo no leídas si se solicita
    const result = unreadOnly === 'true' 
      ? formattedNotifications.filter(n => !n.isRead)
      : formattedNotifications;

    // Contar no leídas
    const unreadCount = formattedNotifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      data: {
        notifications: result,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones'
    });
  }
};

// Marcar notificación como leída
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que la notificación existe
    const notification = await prisma.systemNotification.findUnique({
      where: { id }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    // Crear o actualizar registro de lectura
    await prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId: id,
          userId
        }
      },
      create: {
        notificationId: id,
        userId
      },
      update: {
        readAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Notificación marcada como leída'
    });
  } catch (error) {
    console.error('Error marcando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación'
    });
  }
};

// Marcar todas como leídas
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenant_id;

    // Obtener notificaciones no leídas del usuario
    const unreadNotifications = await prisma.systemNotification.findMany({
      where: {
        isActive: true,
        OR: [
          { tenantId: null, userId: null },
          ...(tenantId ? [{ tenantId, userId: null }] : []),
          { userId }
        ],
        reads: {
          none: { userId }
        }
      },
      select: { id: true }
    });

    // Crear registros de lectura para todas
    if (unreadNotifications.length > 0) {
      await prisma.notificationRead.createMany({
        data: unreadNotifications.map(n => ({
          notificationId: n.id,
          userId
        })),
        skipDuplicates: true
      });
    }

    res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas',
      count: unreadNotifications.length
    });
  } catch (error) {
    console.error('Error marcando todas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificaciones'
    });
  }
};

// =====================================================
// FUNCIONES PARA ROOT - Crear notificaciones
// =====================================================

// Crear notificación (solo root)
const createNotification = async (req, res) => {
  try {
    const { 
      type, priority, title, message, 
      actionUrl, actionLabel, metadata,
      tenantId, userId, targetRoles, expiresAt 
    } = req.body;

    const notification = await prisma.systemNotification.create({
      data: {
        type,
        priority: priority || 'NORMAL',
        title,
        message,
        actionUrl,
        actionLabel,
        metadata: metadata || {},
        tenantId,
        userId,
        targetRoles: targetRoles || [],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: req.user.id
      }
    });

    res.status(201).json({
      success: true,
      data: { notification }
    });
  } catch (error) {
    console.error('Error creando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear notificación'
    });
  }
};

// Listar todas las notificaciones (para admin de root)
const listAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (page - 1) * limit;

    const where = type ? { type } : {};

    const [notifications, total] = await Promise.all([
      prisma.systemNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          _count: {
            select: { reads: true }
          }
        }
      }),
      prisma.systemNotification.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error listando notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar notificaciones'
    });
  }
};

// Desactivar notificación
const deactivateNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.systemNotification.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Notificación desactivada'
    });
  } catch (error) {
    console.error('Error desactivando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar notificación'
    });
  }
};

// =====================================================
// FUNCIONES HELPER - Para crear notificaciones automáticas
// =====================================================

// Crear notificación de bienvenida
const createWelcomeNotification = async (userId, tenantId) => {
  try {
    await prisma.systemNotification.create({
      data: {
        type: 'WELCOME',
        priority: 'NORMAL',
        title: '¡Bienvenido a NicRoma!',
        message: 'Gracias por registrarte. Explorá todas las funcionalidades disponibles para gestionar tu negocio.',
        actionUrl: '/dashboard',
        actionLabel: 'Ir al Dashboard',
        userId,
        tenantId
      }
    });
  } catch (error) {
    console.error('Error creando notificación de bienvenida:', error);
  }
};

// Crear notificación de pago fallido
const createPaymentFailedNotification = async (tenantId, details) => {
  try {
    await prisma.systemNotification.create({
      data: {
        type: 'PAYMENT_FAILED',
        priority: 'URGENT',
        title: 'Problema con tu pago',
        message: 'No pudimos procesar tu pago. Por favor, verificá tu método de pago para evitar interrupciones en el servicio.',
        actionUrl: '/billing/subscription',
        actionLabel: 'Ver suscripción',
        tenantId,
        targetRoles: ['admin'],
        metadata: details || {}
      }
    });
  } catch (error) {
    console.error('Error creando notificación de pago fallido:', error);
  }
};

// Crear notificación de trial por vencer
const createTrialExpiringNotification = async (tenantId, daysRemaining) => {
  try {
    const messages = {
      7: 'Te quedan 7 días de prueba. ¿Necesitás más tiempo?',
      3: 'Tu período de prueba termina en 3 días. Elegí un plan para continuar.',
      1: '¡Último día de prueba! Elegí tu plan para no perder acceso.'
    };

    await prisma.systemNotification.create({
      data: {
        type: 'TRIAL_EXPIRING',
        priority: daysRemaining === 1 ? 'URGENT' : 'HIGH',
        title: `Tu prueba termina en ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}`,
        message: messages[daysRemaining] || `Te quedan ${daysRemaining} días de prueba.`,
        actionUrl: '/billing/plans',
        actionLabel: 'Ver planes',
        tenantId,
        targetRoles: ['admin']
      }
    });
  } catch (error) {
    console.error('Error creando notificación de trial:', error);
  }
};

// Crear notificación de límite del plan
const createPlanLimitWarning = async (tenantId, limitType, currentUsage, maxLimit) => {
  try {
    const percentage = Math.round((currentUsage / maxLimit) * 100);
    const limitLabels = {
      users: 'usuarios',
      carpetas: 'carpetas este mes',
      clientes: 'clientes'
    };

    await prisma.systemNotification.create({
      data: {
        type: 'PLAN_LIMIT_WARNING',
        priority: 'HIGH',
        title: `Límite de ${limitLabels[limitType]} al ${percentage}%`,
        message: `Estás usando ${currentUsage} de ${maxLimit} ${limitLabels[limitType]}. Considerá actualizar tu plan para más capacidad.`,
        actionUrl: '/billing/plans',
        actionLabel: 'Ver planes',
        tenantId,
        targetRoles: ['admin'],
        metadata: { limitType, currentUsage, maxLimit, percentage }
      }
    });
  } catch (error) {
    console.error('Error creando notificación de límite:', error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  listAllNotifications,
  deactivateNotification,
  // Helpers
  createWelcomeNotification,
  createPaymentFailedNotification,
  createTrialExpiringNotification,
  createPlanLimitWarning
};
