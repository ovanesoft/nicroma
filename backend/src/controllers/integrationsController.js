/**
 * Controlador para gestión de integraciones con navieras
 */

const { PrismaClient } = require('@prisma/client');
const { 
  getCarrierService, 
  getCarrierInfo, 
  listCarriers 
} = require('../services/carriers');
const CryptoJS = require('crypto-js');

const prisma = new PrismaClient();
const encryptionKey = process.env.CARRIER_ENCRYPTION_KEY || process.env.JWT_SECRET;

/**
 * Encripta datos sensibles
 */
function encrypt(text) {
  if (!text) return null;
  return CryptoJS.AES.encrypt(text, encryptionKey).toString();
}

/**
 * Desencripta datos sensibles
 */
function decrypt(ciphertext) {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return null;
  }
}

/**
 * GET /api/integrations/carriers
 * Lista todos los proveedores soportados
 */
exports.listCarriers = async (req, res) => {
  try {
    const carriers = listCarriers();
    
    // Obtener integraciones activas del tenant
    const activeIntegrations = await prisma.carrierIntegration.findMany({
      where: { tenantId: req.user.tenantId },
      select: { provider: true, status: true, lastTestedAt: true },
    });

    // Combinar info con estado de integración
    const result = carriers.map(carrier => {
      const integration = activeIntegrations.find(i => i.provider === carrier.code);
      return {
        ...carrier,
        isConfigured: !!integration,
        status: integration?.status || 'NOT_CONFIGURED',
        lastTestedAt: integration?.lastTestedAt,
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error listing carriers:', error);
    res.status(500).json({ success: false, error: 'Error al listar navieras' });
  }
};

/**
 * GET /api/integrations
 * Lista las integraciones configuradas del tenant
 */
exports.listIntegrations = async (req, res) => {
  try {
    const integrations = await prisma.carrierIntegration.findMany({
      where: { tenantId: req.user.tenantId },
      select: {
        id: true,
        provider: true,
        status: true,
        lastTestedAt: true,
        lastError: true,
        apiCallsToday: true,
        apiCallsMonth: true,
        lastApiCall: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Agregar info del carrier
    const result = integrations.map(integration => ({
      ...integration,
      carrierInfo: getCarrierInfo(integration.provider),
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error listing integrations:', error);
    res.status(500).json({ success: false, error: 'Error al listar integraciones' });
  }
};

/**
 * GET /api/integrations/:provider
 * Obtiene detalle de una integración
 */
exports.getIntegration = async (req, res) => {
  try {
    const { provider } = req.params;

    const integration = await prisma.carrierIntegration.findUnique({
      where: {
        tenantId_provider: {
          tenantId: req.user.tenantId,
          provider: provider,
        },
      },
    });

    if (!integration) {
      return res.json({
        success: true,
        data: {
          provider,
          carrierInfo: getCarrierInfo(provider),
          isConfigured: false,
        },
      });
    }

    // No devolver credenciales, solo indicar si están configuradas
    res.json({
      success: true,
      data: {
        id: integration.id,
        provider: integration.provider,
        status: integration.status,
        lastTestedAt: integration.lastTestedAt,
        lastError: integration.lastError,
        apiCallsToday: integration.apiCallsToday,
        apiCallsMonth: integration.apiCallsMonth,
        lastApiCall: integration.lastApiCall,
        hasClientId: !!integration.clientId,
        hasClientSecret: !!integration.clientSecret,
        hasApiKey: !!integration.apiKey,
        settings: integration.settings,
        carrierInfo: getCarrierInfo(provider),
        isConfigured: true,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error getting integration:', error);
    res.status(500).json({ success: false, error: 'Error al obtener integración' });
  }
};

/**
 * POST /api/integrations/:provider
 * Crea o actualiza una integración
 */
exports.saveIntegration = async (req, res) => {
  try {
    const { provider } = req.params;
    const { clientId, clientSecret, apiKey, username, password, settings } = req.body;

    const carrierInfo = getCarrierInfo(provider);
    if (!carrierInfo) {
      return res.status(400).json({ success: false, error: 'Proveedor no soportado' });
    }

    // Validar campos requeridos
    for (const field of carrierInfo.requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          error: `Campo requerido: ${field}`,
        });
      }
    }

    // Preparar datos encriptados
    const data = {
      tenantId: req.user.tenantId,
      provider,
      clientId: clientId ? encrypt(clientId) : undefined,
      clientSecret: clientSecret ? encrypt(clientSecret) : undefined,
      apiKey: apiKey ? encrypt(apiKey) : undefined,
      username: username ? encrypt(username) : undefined,
      password: password ? encrypt(password) : undefined,
      settings: settings || {},
      status: 'PENDING_VERIFICATION',
      createdBy: req.user.id,
    };

    const integration = await prisma.carrierIntegration.upsert({
      where: {
        tenantId_provider: {
          tenantId: req.user.tenantId,
          provider,
        },
      },
      create: data,
      update: {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        apiKey: data.apiKey,
        username: data.username,
        password: data.password,
        settings: data.settings,
        status: 'PENDING_VERIFICATION',
        lastError: null,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Integración guardada. Probá la conexión para verificar las credenciales.',
      data: {
        id: integration.id,
        provider: integration.provider,
        status: integration.status,
      },
    });
  } catch (error) {
    console.error('Error saving integration:', error);
    res.status(500).json({ success: false, error: 'Error al guardar integración' });
  }
};

/**
 * POST /api/integrations/:provider/test
 * Prueba la conexión con el proveedor
 */
exports.testConnection = async (req, res) => {
  try {
    const { provider } = req.params;
    const { clientId, clientSecret, apiKey, username, password } = req.body;

    const carrierInfo = getCarrierInfo(provider);
    if (!carrierInfo) {
      return res.status(400).json({ success: false, error: 'Proveedor no soportado' });
    }

    const service = getCarrierService(provider);

    // Si se proporcionan credenciales en el body, usarlas (para probar antes de guardar)
    // Si no, buscar la integración existente
    let credentials;

    if (clientId && clientSecret) {
      credentials = { clientId, clientSecret, apiKey, username, password };
    } else {
      const integration = await prisma.carrierIntegration.findUnique({
        where: {
          tenantId_provider: {
            tenantId: req.user.tenantId,
            provider,
          },
        },
      });

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: 'No hay credenciales configuradas para este proveedor',
        });
      }

      credentials = {
        clientId: decrypt(integration.clientId),
        clientSecret: decrypt(integration.clientSecret),
        apiKey: decrypt(integration.apiKey),
        username: decrypt(integration.username),
        password: decrypt(integration.password),
      };
    }

    // Probar conexión
    const result = await service.testConnection(credentials);

    // Actualizar estado de la integración si existe
    if (!clientId) {
      await prisma.carrierIntegration.update({
        where: {
          tenantId_provider: {
            tenantId: req.user.tenantId,
            provider,
          },
        },
        data: {
          status: result.success ? 'ACTIVE' : 'ERROR',
          lastTestedAt: new Date(),
          lastError: result.success ? null : result.error,
        },
      });
    }

    res.json({
      success: result.success,
      message: result.message || result.error,
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/integrations/:provider
 * Elimina una integración
 */
exports.deleteIntegration = async (req, res) => {
  try {
    const { provider } = req.params;

    await prisma.carrierIntegration.delete({
      where: {
        tenantId_provider: {
          tenantId: req.user.tenantId,
          provider,
        },
      },
    });

    res.json({ success: true, message: 'Integración eliminada' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Integración no encontrada' });
    }
    console.error('Error deleting integration:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar integración' });
  }
};

/**
 * POST /api/integrations/track
 * Realiza tracking de un contenedor/BL
 */
exports.track = async (req, res) => {
  try {
    const { trackingNumber, trackingType = 'CONTAINER', provider } = req.body;

    if (!trackingNumber) {
      return res.status(400).json({ success: false, error: 'Número de tracking requerido' });
    }

    // Si se especifica provider, usar solo ese
    // Si no, intentar con todas las integraciones activas
    let integrations;

    if (provider) {
      const integration = await prisma.carrierIntegration.findUnique({
        where: {
          tenantId_provider: {
            tenantId: req.user.tenantId,
            provider,
          },
        },
      });

      if (!integration || integration.status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          error: `Integración con ${provider} no está activa`,
        });
      }

      integrations = [integration];
    } else {
      integrations = await prisma.carrierIntegration.findMany({
        where: {
          tenantId: req.user.tenantId,
          status: 'ACTIVE',
        },
      });

      if (integrations.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay integraciones activas configuradas',
        });
      }
    }

    // Intentar tracking con cada integración
    const results = [];
    const errors = [];

    for (const integration of integrations) {
      try {
        const service = getCarrierService(integration.provider);
        const result = await service.getTracking(integration, trackingNumber, trackingType);
        
        // Actualizar contador de API calls
        await prisma.carrierIntegration.update({
          where: { id: integration.id },
          data: {
            apiCallsToday: { increment: 1 },
            apiCallsMonth: { increment: 1 },
            lastApiCall: new Date(),
          },
        });

        if (result.events?.length > 0) {
          results.push(result);
        }
      } catch (error) {
        errors.push({
          provider: integration.provider,
          error: error.message,
        });
      }
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró información de tracking',
        details: errors,
      });
    }

    // Si hay múltiples resultados, combinar eventos
    if (results.length > 1) {
      const allEvents = results.flatMap(r => r.events);
      allEvents.sort((a, b) => new Date(b.eventDateTime) - new Date(a.eventDateTime));

      return res.json({
        success: true,
        data: {
          trackingNumber,
          trackingType,
          providers: results.map(r => r.provider),
          events: allEvents,
          currentStatus: results[0].currentStatus,
          fetchedAt: new Date(),
        },
      });
    }

    res.json({ success: true, data: results[0] });
  } catch (error) {
    console.error('Error tracking:', error);
    res.status(500).json({ success: false, error: 'Error al realizar tracking' });
  }
};

/**
 * POST /api/integrations/schedules
 * Obtiene schedules punto a punto
 */
exports.getSchedules = async (req, res) => {
  try {
    const { originPort, destinationPort, departureDate, provider, weeksOut = 4 } = req.body;

    if (!originPort || !destinationPort) {
      return res.status(400).json({
        success: false,
        error: 'Puerto de origen y destino requeridos',
      });
    }

    let integrations;

    if (provider) {
      const integration = await prisma.carrierIntegration.findUnique({
        where: {
          tenantId_provider: {
            tenantId: req.user.tenantId,
            provider,
          },
        },
      });

      if (!integration || integration.status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          error: `Integración con ${provider} no está activa`,
        });
      }

      integrations = [integration];
    } else {
      integrations = await prisma.carrierIntegration.findMany({
        where: {
          tenantId: req.user.tenantId,
          status: 'ACTIVE',
        },
      });
    }

    const results = [];
    const errors = [];

    for (const integration of integrations) {
      try {
        const service = getCarrierService(integration.provider);
        const result = await service.getSchedules(integration, {
          originPort,
          destinationPort,
          departureDate,
          weeksOut,
        });

        await prisma.carrierIntegration.update({
          where: { id: integration.id },
          data: {
            apiCallsToday: { increment: 1 },
            apiCallsMonth: { increment: 1 },
            lastApiCall: new Date(),
          },
        });

        if (result.schedules?.length > 0) {
          results.push(result);
        }
      } catch (error) {
        errors.push({
          provider: integration.provider,
          error: error.message,
        });
      }
    }

    // Combinar y ordenar schedules de todos los proveedores
    const allSchedules = results.flatMap(r =>
      r.schedules.map(s => ({ ...s, provider: r.provider }))
    );
    allSchedules.sort((a, b) => new Date(a.departureDate) - new Date(b.departureDate));

    res.json({
      success: true,
      data: {
        originPort,
        destinationPort,
        schedules: allSchedules,
        providers: results.map(r => r.provider),
        fetchedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error getting schedules:', error);
    res.status(500).json({ success: false, error: 'Error al obtener schedules' });
  }
};

/**
 * POST /api/integrations/subscriptions
 * Crea una suscripción de tracking
 */
exports.createSubscription = async (req, res) => {
  try {
    const { 
      trackingNumber, 
      trackingType = 'CONTAINER', 
      provider, 
      carpetaId, 
      contenedorId,
      checkIntervalMinutes = 60,
    } = req.body;

    if (!trackingNumber || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Número de tracking y proveedor requeridos',
      });
    }

    // Verificar integración activa
    const integration = await prisma.carrierIntegration.findUnique({
      where: {
        tenantId_provider: {
          tenantId: req.user.tenantId,
          provider,
        },
      },
    });

    if (!integration || integration.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: `Integración con ${provider} no está activa`,
      });
    }

    // Crear suscripción
    const subscription = await prisma.trackingSubscription.upsert({
      where: {
        tenantId_trackingNumber_integrationId: {
          tenantId: req.user.tenantId,
          trackingNumber,
          integrationId: integration.id,
        },
      },
      create: {
        tenantId: req.user.tenantId,
        integrationId: integration.id,
        trackingNumber,
        trackingType,
        carpetaId,
        contenedorId,
        checkIntervalMinutes,
        isActive: true,
      },
      update: {
        isActive: true,
        carpetaId,
        contenedorId,
        checkIntervalMinutes,
      },
    });

    // Hacer tracking inicial
    try {
      const service = getCarrierService(provider);
      const trackingData = await service.getTracking(integration, trackingNumber, trackingType);

      // Actualizar suscripción con datos actuales
      await prisma.trackingSubscription.update({
        where: { id: subscription.id },
        data: {
          currentStatus: trackingData.currentStatus?.status,
          currentLocation: trackingData.currentStatus?.location,
          vessel: trackingData.vessel?.name,
          voyage: trackingData.vessel?.voyage,
          eta: trackingData.eta ? new Date(trackingData.eta) : null,
          lastCheckedAt: new Date(),
          lastEventAt: trackingData.events?.[0]?.eventDateTime,
        },
      });

      // Guardar eventos
      if (trackingData.events?.length > 0) {
        await prisma.trackingEvent.createMany({
          data: trackingData.events.map(event => ({
            subscriptionId: subscription.id,
            eventType: event.eventType,
            eventCode: event.eventCode,
            eventDescription: event.eventDescription,
            eventDateTime: new Date(event.eventDateTime),
            location: event.location,
            locationCode: event.locationCode,
            facility: event.facility,
            vessel: event.vessel,
            voyage: event.voyage,
            rawData: event.rawData,
          })),
          skipDuplicates: true,
        });
      }
    } catch (trackingError) {
      console.error('Error en tracking inicial:', trackingError);
    }

    res.json({
      success: true,
      message: 'Suscripción de tracking creada',
      data: subscription,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ success: false, error: 'Error al crear suscripción' });
  }
};

/**
 * GET /api/integrations/subscriptions
 * Lista suscripciones de tracking
 */
exports.listSubscriptions = async (req, res) => {
  try {
    const { carpetaId, isActive } = req.query;

    const where = { tenantId: req.user.tenantId };
    if (carpetaId) where.carpetaId = carpetaId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const subscriptions = await prisma.trackingSubscription.findMany({
      where,
      include: {
        integration: {
          select: { provider: true },
        },
        events: {
          take: 5,
          orderBy: { eventDateTime: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    res.status(500).json({ success: false, error: 'Error al listar suscripciones' });
  }
};

/**
 * GET /api/integrations/subscriptions/:id
 * Obtiene detalle de una suscripción con todos sus eventos
 */
exports.getSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await prisma.trackingSubscription.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        integration: {
          select: { provider: true },
        },
        events: {
          orderBy: { eventDateTime: 'desc' },
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Suscripción no encontrada' });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ success: false, error: 'Error al obtener suscripción' });
  }
};

/**
 * POST /api/integrations/subscriptions/:id/refresh
 * Actualiza tracking de una suscripción
 */
exports.refreshSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await prisma.trackingSubscription.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        integration: true,
      },
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Suscripción no encontrada' });
    }

    const service = getCarrierService(subscription.integration.provider);
    const trackingData = await service.getTracking(
      subscription.integration,
      subscription.trackingNumber,
      subscription.trackingType
    );

    // Actualizar suscripción
    await prisma.trackingSubscription.update({
      where: { id },
      data: {
        currentStatus: trackingData.currentStatus?.status,
        currentLocation: trackingData.currentStatus?.location,
        vessel: trackingData.vessel?.name,
        voyage: trackingData.vessel?.voyage,
        eta: trackingData.eta ? new Date(trackingData.eta) : null,
        lastCheckedAt: new Date(),
        lastEventAt: trackingData.events?.[0]?.eventDateTime,
      },
    });

    // Agregar nuevos eventos
    if (trackingData.events?.length > 0) {
      for (const event of trackingData.events) {
        try {
          await prisma.trackingEvent.create({
            data: {
              subscriptionId: subscription.id,
              eventType: event.eventType,
              eventCode: event.eventCode,
              eventDescription: event.eventDescription,
              eventDateTime: new Date(event.eventDateTime),
              location: event.location,
              locationCode: event.locationCode,
              facility: event.facility,
              vessel: event.vessel,
              voyage: event.voyage,
              rawData: event.rawData,
            },
          });
        } catch (e) {
          // Ignorar duplicados
        }
      }
    }

    res.json({
      success: true,
      message: 'Tracking actualizado',
      data: trackingData,
    });
  } catch (error) {
    console.error('Error refreshing subscription:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar tracking' });
  }
};

/**
 * DELETE /api/integrations/subscriptions/:id
 * Elimina una suscripción
 */
exports.deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.trackingSubscription.deleteMany({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    res.json({ success: true, message: 'Suscripción eliminada' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar suscripción' });
  }
};
