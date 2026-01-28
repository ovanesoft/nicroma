const prisma = require('../services/prisma');

// Obtener mis conversaciones
const getMyConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenant_id;
    const { status, type } = req.query;

    let whereConditions = {};

    if (userRole === 'root') {
      // Root ve todas las conversaciones de soporte + las que él creó
      whereConditions = {
        OR: [
          { isRootConversation: true },
          { createdByUserId: userId }
        ]
      };
    } else if (userRole === 'client') {
      // Cliente ve sus conversaciones y las que le enviaron
      whereConditions = {
        OR: [
          { createdByUserId: userId },
          { targetUserId: userId }
        ]
      };
    } else {
      // Admin/Manager/User ve conversaciones de su tenant + las dirigidas a ellos
      whereConditions = {
        OR: [
          { createdByTenantId: tenantId },
          { targetTenantId: tenantId },
          { createdByUserId: userId },
          { targetUserId: userId }
        ]
      };
    }

    // Filtros adicionales
    if (status) {
      whereConditions.status = status;
    }
    if (type) {
      whereConditions.type = type;
    }

    const conversations = await prisma.conversation.findMany({
      where: whereConditions,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        participants: {
          where: { userId }
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true, role: true, email: true }
        },
        targetUser: {
          select: { id: true, firstName: true, lastName: true, role: true, email: true }
        },
        createdByTenant: {
          select: { id: true, name: true }
        },
        targetTenant: {
          select: { id: true, name: true }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    // Calcular mensajes no leídos y determinar el "otro" participante
    const formattedConversations = conversations.map(conv => {
      const participant = conv.participants[0];
      const lastRead = participant?.lastReadAt;
      
      // Determinar quién es el "otro" en la conversación
      let otherParty = null;
      if (conv.createdByUserId === userId) {
        // Yo creé la conversación, el otro es el target
        if (conv.targetUser) {
          otherParty = {
            name: `${conv.targetUser.firstName} ${conv.targetUser.lastName}`,
            role: conv.targetUser.role
          };
        } else if (conv.targetTenant) {
          otherParty = {
            name: conv.targetTenant.name,
            role: 'tenant'
          };
        } else if (conv.isRootConversation) {
          otherParty = {
            name: 'Soporte Nicroma',
            role: 'root'
          };
        }
      } else {
        // El otro me escribió a mí
        if (conv.createdByUser) {
          otherParty = {
            name: `${conv.createdByUser.firstName} ${conv.createdByUser.lastName}`,
            role: conv.createdByUser.role
          };
        }
      }
      
      return {
        id: conv.id,
        type: conv.type,
        status: conv.status,
        subject: conv.subject,
        priority: conv.priority,
        lastMessage: conv.messages[0] || null,
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv._count.messages,
        createdAt: conv.createdAt,
        createdByUserId: conv.createdByUserId,
        otherParty, // Info del otro participante
        // Para saber si hay mensajes no leídos
        hasUnread: lastRead ? conv.lastMessageAt > lastRead : conv._count.messages > 0
      };
    });

    res.json({
      success: true,
      data: { conversations: formattedConversations }
    });
  } catch (error) {
    console.error('Error obteniendo conversaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener conversaciones'
    });
  }
};

// Obtener una conversación con sus mensajes
const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenant_id;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            reads: {
              where: { userId }
            }
          }
        },
        participants: true
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }

    // Verificar acceso
    const hasAccess = 
      userRole === 'root' ||
      conversation.createdByUserId === userId ||
      conversation.targetUserId === userId ||
      conversation.createdByTenantId === tenantId ||
      conversation.targetTenantId === tenantId;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'No tenés acceso a esta conversación'
      });
    }

    // Actualizar última lectura del participante
    await prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId
        }
      },
      create: {
        conversationId: id,
        userId,
        lastReadAt: new Date()
      },
      update: {
        lastReadAt: new Date()
      }
    });

    // Formatear mensajes
    const messages = conversation.messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      authorUserId: msg.authorUserId,
      authorName: msg.authorName,
      authorRole: msg.authorRole,
      attachments: msg.attachments,
      isSystemMessage: msg.isSystemMessage,
      createdAt: msg.createdAt,
      isRead: msg.reads.length > 0,
      isOwn: msg.authorUserId === userId
    }));

    res.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          type: conversation.type,
          status: conversation.status,
          subject: conversation.subject,
          priority: conversation.priority,
          createdAt: conversation.createdAt,
          resolvedAt: conversation.resolvedAt
        },
        messages
      }
    });
  } catch (error) {
    console.error('Error obteniendo conversación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener conversación'
    });
  }
};

// Crear nueva conversación
const createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenant_id;
    const { type, subject, message, targetTenantId, targetUserId, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Asunto y mensaje son requeridos'
      });
    }

    // Obtener nombre del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });
    const authorName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Usuario';

    // Determinar si es conversación con root (si NO es root quien inicia)
    // Si el root inicia una conversación hacia un usuario, no es "root conversation"
    // Las conversaciones CLIENT_TENANT van al tenant, no al root
    const isRootConversation = userRole !== 'root' && 
      type !== 'CLIENT_TENANT' && 
      (type === 'SUPPORT' || type === 'BILLING' || !targetTenantId);

    // Si el root está iniciando hacia un usuario específico, obtener su tenantId
    let finalTargetTenantId = targetTenantId;
    let finalTargetUserId = targetUserId;
    
    if (userRole === 'root' && targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { tenantId: true }
      });
      if (targetUser?.tenantId) {
        finalTargetTenantId = targetUser.tenantId;
      }
      finalTargetUserId = targetUserId;
    }

    // Si es conversación CLIENT_TENANT, el target es el tenant del cliente
    if (type === 'CLIENT_TENANT' && userRole === 'client' && tenantId) {
      finalTargetTenantId = tenantId;
    }

    const conversation = await prisma.conversation.create({
      data: {
        type: type || 'GENERAL',
        subject,
        createdByUserId: userId,
        createdByTenantId: tenantId,
        targetTenantId: finalTargetTenantId || null,
        targetUserId: finalTargetUserId || null,
        isRootConversation,
        priority: priority || 'NORMAL',
        lastMessageAt: new Date(),
        messages: {
          create: {
            authorUserId: userId,
            authorName,
            authorRole: userRole,
            content: message
          }
        },
        participants: {
          create: {
            userId,
            role: 'creator',
            lastReadAt: new Date()
          }
        }
      },
      include: {
        messages: true
      }
    });
    
    // Si hay un usuario destino, agregarlo como participante
    if (finalTargetUserId) {
      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: finalTargetUserId,
          role: 'participant'
        }
      });
    }

    res.status(201).json({
      success: true,
      data: { conversation }
    });
  } catch (error) {
    console.error('Error creando conversación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear conversación'
    });
  }
};

// Agregar mensaje a conversación
const addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenant_id;
    const { content, attachments } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje no puede estar vacío'
      });
    }

    // Verificar que la conversación existe y el usuario tiene acceso
    const conversation = await prisma.conversation.findUnique({
      where: { id }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }

    // Verificar acceso
    const hasAccess = 
      userRole === 'root' ||
      conversation.createdByUserId === userId ||
      conversation.targetUserId === userId ||
      conversation.createdByTenantId === tenantId ||
      conversation.targetTenantId === tenantId;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'No tenés acceso a esta conversación'
      });
    }

    // Obtener nombre del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });
    const authorName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Usuario';

    // Crear mensaje y actualizar conversación
    const [message] = await prisma.$transaction([
      prisma.conversationMessage.create({
        data: {
          conversationId: id,
          authorUserId: userId,
          authorName,
          authorRole: userRole,
          content,
          attachments: attachments || []
        }
      }),
      prisma.conversation.update({
        where: { id },
        data: {
          lastMessageAt: new Date(),
          status: conversation.status === 'RESOLVED' ? 'OPEN' : conversation.status
        }
      }),
      // Actualizar última lectura del autor
      prisma.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: id,
            userId
          }
        },
        create: {
          conversationId: id,
          userId,
          lastReadAt: new Date()
        },
        update: {
          lastReadAt: new Date()
        }
      })
    ]);

    res.status(201).json({
      success: true,
      data: {
        message: {
          id: message.id,
          content: message.content,
          authorUserId: message.authorUserId,
          authorName: message.authorName,
          authorRole: message.authorRole,
          createdAt: message.createdAt,
          isOwn: true
        }
      }
    });
  } catch (error) {
    console.error('Error agregando mensaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje'
    });
  }
};

// Cambiar estado de conversación
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const conversation = await prisma.conversation.findUnique({
      where: { id }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }

    const updateData = { status };
    
    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    await prisma.conversation.update({
      where: { id },
      data: updateData
    });

    // Agregar mensaje de sistema
    const statusMessages = {
      RESOLVED: 'La conversación fue marcada como resuelta',
      CLOSED: 'La conversación fue cerrada',
      OPEN: 'La conversación fue reabierta',
      PENDING: 'Esperando respuesta'
    };

    if (statusMessages[status]) {
      await prisma.conversationMessage.create({
        data: {
          conversationId: id,
          authorUserId: userId,
          authorName: 'Sistema',
          authorRole: userRole,
          content: statusMessages[status],
          isSystemMessage: true
        }
      });
    }

    res.json({
      success: true,
      message: 'Estado actualizado'
    });
  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado'
    });
  }
};

// Obtener conteo de conversaciones no leídas
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenant_id;

    let whereConditions = {};

    if (userRole === 'root') {
      // Root ve conversaciones de soporte + las que creó
      whereConditions = {
        OR: [
          { isRootConversation: true },
          { createdByUserId: userId }
        ]
      };
    } else if (userRole === 'client') {
      // Cliente ve sus conversaciones y las que le enviaron
      whereConditions = {
        OR: [
          { createdByUserId: userId },
          { targetUserId: userId }
        ]
      };
    } else {
      // Admin/Manager/User ve conversaciones de su tenant + las dirigidas a ellos
      whereConditions = {
        OR: [
          { createdByTenantId: tenantId },
          { targetTenantId: tenantId },
          { createdByUserId: userId },
          { targetUserId: userId }
        ]
      };
    }

    // Obtener conversaciones con participación del usuario
    const conversations = await prisma.conversation.findMany({
      where: {
        ...whereConditions,
        status: { not: 'CLOSED' }
      },
      include: {
        participants: {
          where: { userId }
        }
      }
    });

    // Contar las que tienen mensajes no leídos
    let unreadCount = 0;
    for (const conv of conversations) {
      const participant = conv.participants[0];
      const lastRead = participant?.lastReadAt;
      
      if (!lastRead || (conv.lastMessageAt && conv.lastMessageAt > lastRead)) {
        unreadCount++;
      }
    }

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Error obteniendo conteo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener conteo'
    });
  }
};

module.exports = {
  getMyConversations,
  getConversation,
  createConversation,
  addMessage,
  updateStatus,
  getUnreadCount
};
