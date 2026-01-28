/**
 * Controlador de Billing
 * Maneja todos los endpoints relacionados con suscripciones y pagos
 */

const { subscriptions, mercadopago } = require('../services/billing');
const prisma = require('../services/prisma');

// =====================================================
// PLANES
// =====================================================

/**
 * GET /api/billing/plans
 * Obtiene todos los planes activos (público)
 */
const getPlans = async (req, res) => {
  try {
    const plans = await subscriptions.getActivePlans();
    
    // Formatear para el frontend
    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      priceMonthly: parseFloat(plan.priceMonthly || 0),
      priceYearly: parseFloat(plan.priceYearly || 0),
      currency: plan.currency,
      features: plan.features,
      limits: {
        users: plan.maxUsers,
        carpetasPerMonth: plan.maxCarpetasPerMonth,
        clientes: plan.maxClientes,
      },
      includes: {
        portalClientes: plan.hasPortalClientes,
        trackingNavieras: plan.hasTrackingNavieras,
        trackingNavierasLimit: plan.trackingNavierasLimit,
        facturacionAfip: plan.hasFacturacionAfip,
        reportesAvanzados: plan.hasReportesAvanzados,
      },
      supportLevel: plan.supportLevel,
      isContactSales: plan.isContactSales,
      sortOrder: plan.sortOrder,
    }));

    res.json({
      success: true,
      data: { plans: formattedPlans },
    });
  } catch (error) {
    console.error('Error obteniendo planes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener planes',
    });
  }
};

/**
 * GET /api/billing/plans/:slug
 * Obtiene un plan por slug (público)
 */
const getPlanBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const plan = await subscriptions.getPlanBySlug(slug);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado',
      });
    }

    res.json({
      success: true,
      data: { plan },
    });
  } catch (error) {
    console.error('Error obteniendo plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener plan',
    });
  }
};

// =====================================================
// SUSCRIPCIÓN DEL TENANT
// =====================================================

/**
 * GET /api/billing/subscription
 * Obtiene el estado de suscripción del tenant actual
 */
const getSubscription = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización',
      });
    }

    const status = await subscriptions.getSubscriptionStatus(tenantId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error obteniendo suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener suscripción',
    });
  }
};

/**
 * POST /api/billing/subscription/checkout
 * Inicia el proceso de checkout para suscribirse a un plan
 */
const createCheckout = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { planSlug, billingCycle = 'monthly', promotionCode } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización',
      });
    }

    if (!planSlug) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar un plan',
      });
    }

    const result = await subscriptions.subscribeToPlan(
      tenantId,
      planSlug,
      billingCycle,
      promotionCode
    );

    res.json({
      success: true,
      message: 'Checkout iniciado',
      data: {
        checkoutUrl: result.checkoutUrl,
        subscriptionId: result.mpSubscriptionId,
      },
    });
  } catch (error) {
    console.error('Error creando checkout:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al iniciar checkout',
    });
  }
};

/**
 * POST /api/billing/subscription/upgrade
 * Upgrade de plan (inmediato)
 */
const upgradePlan = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { planSlug } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización',
      });
    }

    const result = await subscriptions.upgradePlan(tenantId, planSlug);

    res.json({
      success: true,
      message: result.message,
      data: {
        proratedAmount: result.proratedAmount,
      },
    });
  } catch (error) {
    console.error('Error en upgrade:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al cambiar de plan',
    });
  }
};

/**
 * POST /api/billing/subscription/downgrade
 * Downgrade de plan (aplica al próximo ciclo)
 */
const downgradePlan = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { planSlug } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización',
      });
    }

    const result = await subscriptions.schedulePlanDowngrade(tenantId, planSlug);

    res.json({
      success: true,
      message: result.message,
      data: {
        effectiveDate: result.effectiveDate,
      },
    });
  } catch (error) {
    console.error('Error en downgrade:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al programar cambio de plan',
    });
  }
};

/**
 * POST /api/billing/subscription/cancel
 * Cancela la suscripción al final del período
 */
const cancelSubscription = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { reason } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización',
      });
    }

    await subscriptions.cancelSubscription(tenantId, reason);

    res.json({
      success: true,
      message: 'Suscripción cancelada. Tendrás acceso hasta el final del período actual.',
    });
  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al cancelar suscripción',
    });
  }
};

/**
 * POST /api/billing/subscription/reactivate
 * Reactiva una suscripción cancelada
 */
const reactivateSubscription = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización',
      });
    }

    await subscriptions.reactivateSubscription(tenantId);

    res.json({
      success: true,
      message: 'Suscripción reactivada',
    });
  } catch (error) {
    console.error('Error reactivando suscripción:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al reactivar suscripción',
    });
  }
};

// =====================================================
// TRIAL
// =====================================================

/**
 * POST /api/billing/trial/extend
 * Extiende el trial del tenant actual
 */
const extendTrial = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización',
      });
    }

    const subscription = await subscriptions.extendTrial(tenantId);

    res.json({
      success: true,
      message: '¡Listo! Te dimos 7 días más de prueba.',
      data: {
        trialEndsAt: subscription.trial_ends_at,
        extensionsUsed: subscription.trial_extensions,
        extensionsRemaining: subscriptions.MAX_TRIAL_EXTENSIONS - subscription.trial_extensions,
      },
    });
  } catch (error) {
    console.error('Error extendiendo trial:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al extender trial',
    });
  }
};

// =====================================================
// OFERTA DE ACOMPAÑAMIENTO
// =====================================================

/**
 * POST /api/billing/accompaniment/activate
 * Activa la oferta de acompañamiento ($10.000 x 2 meses)
 */
const activateAccompaniment = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización',
      });
    }

    const subscription = await subscriptions.activateAccompanimentOffer(tenantId);

    res.json({
      success: true,
      message: '¡Genial! Te acompañamos en tu crecimiento. Los primeros 2 meses pagás solo $10.000.',
      data: {
        currentPrice: subscription.accompaniment_price,
        monthsRemaining: subscriptions.ACCOMPANIMENT_MONTHS - subscription.accompaniment_months_used,
      },
    });
  } catch (error) {
    console.error('Error activando acompañamiento:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al activar oferta de acompañamiento',
    });
  }
};

// =====================================================
// PROMOCIONES
// =====================================================

/**
 * POST /api/billing/promotions/validate
 * Valida un código de promoción
 */
const validatePromotion = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { code, planSlug } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Debe ingresar un código',
      });
    }

    // Obtener el precio del plan para calcular descuento
    const plan = await subscriptions.getPlanBySlug(planSlug);
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Plan no encontrado',
      });
    }

    const result = await subscriptions.applyPromotion(
      tenantId,
      code,
      planSlug,
      plan.priceMonthly
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: '¡Código válido!',
      data: {
        discountType: result.discountType,
        discountValue: result.discountValue,
        discountAmount: result.discountAmount,
        durationMonths: result.durationMonths,
        finalPrice: parseFloat(plan.priceMonthly) - result.discountAmount,
      },
    });
  } catch (error) {
    console.error('Error validando promoción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar código',
    });
  }
};

// =====================================================
// HISTORIAL DE PAGOS
// =====================================================

/**
 * GET /api/billing/payments
 * Obtiene el historial de pagos del tenant
 */
const getPayments = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { page = 1, limit = 20 } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización',
      });
    }

    const offset = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payments.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: parseInt(limit),
      }),
      prisma.payments.count({
        where: { tenant_id: tenantId },
      }),
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de pagos',
    });
  }
};

// =====================================================
// WEBHOOKS DE MERCADOPAGO
// =====================================================

/**
 * POST /api/billing/webhooks/mercadopago
 * Recibe notificaciones de MercadoPago
 */
const handleMercadoPagoWebhook = async (req, res) => {
  try {
    const { type, data, action } = req.body;
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];

    console.log('Webhook MP recibido:', { type, action, dataId: data?.id });

    // Verificar firma (en producción)
    if (process.env.NODE_ENV === 'production' && xSignature) {
      const isValid = mercadopago.verifyWebhookSignature(xSignature, xRequestId, data?.id);
      if (!isValid) {
        console.warn('Firma de webhook inválida');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Procesar según el tipo de evento
    switch (type) {
      case 'payment':
        await handlePaymentWebhook(data.id, action);
        break;
      
      case 'subscription_preapproval':
        await handleSubscriptionWebhook(data.id, action);
        break;
      
      case 'subscription_authorized_payment':
        await handleAuthorizedPaymentWebhook(data.id, action);
        break;
      
      default:
        console.log('Tipo de webhook no manejado:', type);
    }

    // Siempre responder 200 para que MP no reintente
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error procesando webhook:', error);
    // Aún así responder 200 para evitar reintentos
    res.status(200).json({ received: true, error: error.message });
  }
};

/**
 * Procesa webhook de pago
 */
const handlePaymentWebhook = async (paymentId, action) => {
  const paymentData = await mercadopago.getPayment(paymentId);
  
  if (!paymentData.success) {
    console.error('Error obteniendo datos del pago:', paymentData.error);
    return;
  }

  const payment = paymentData.data;
  const internalStatus = mercadopago.mapMPPaymentStatusToInternal(payment.status);

  // Extraer tenantId del external_reference
  const [tenantId] = (payment.externalReference || '').split('|');

  if (!tenantId) {
    console.warn('No se pudo extraer tenantId del pago');
    return;
  }

  // Registrar o actualizar pago
  await prisma.payments.upsert({
    where: { provider_payment_id: paymentId.toString() },
    create: {
      tenant_id: tenantId,
      amount: payment.amount,
      currency: payment.currency || 'ARS',
      status: internalStatus,
      payment_method: payment.paymentMethod,
      payment_provider: 'mercadopago',
      provider_payment_id: paymentId.toString(),
      paid_at: payment.dateApproved ? new Date(payment.dateApproved) : null,
      failed_at: internalStatus === 'failed' ? new Date() : null,
    },
    update: {
      status: internalStatus,
      paid_at: payment.dateApproved ? new Date(payment.dateApproved) : null,
      failed_at: internalStatus === 'failed' ? new Date() : null,
    },
  });

  // Si el pago fue aprobado, actualizar estado de suscripción
  if (internalStatus === 'completed') {
    await prisma.tenant_subscriptions.updateMany({
      where: { tenant_id: tenantId },
      data: {
        status: 'active',
        current_period_start: new Date(),
        current_period_end: subscriptions.getNextBillingDate('monthly'),
      },
    });
  }
};

/**
 * Procesa webhook de suscripción
 */
const handleSubscriptionWebhook = async (preapprovalId, action) => {
  const subscriptionData = await mercadopago.getSubscription(preapprovalId);
  
  if (!subscriptionData.success) {
    console.error('Error obteniendo datos de suscripción:', subscriptionData.error);
    return;
  }

  const mpSubscription = subscriptionData.data;
  const internalStatus = mercadopago.mapMPStatusToInternal(mpSubscription.status);

  // Buscar suscripción por mp_preapproval_id
  const subscription = await prisma.tenant_subscriptions.findFirst({
    where: { mp_preapproval_id: preapprovalId.toString() },
  });

  if (!subscription) {
    console.warn('No se encontró suscripción para preapproval:', preapprovalId);
    return;
  }

  // Actualizar estado
  await prisma.tenant_subscriptions.update({
    where: { id: subscription.id },
    data: {
      status: internalStatus,
      mp_payer_id: mpSubscription.payerId,
    },
  });
};

/**
 * Procesa webhook de pago autorizado de suscripción
 */
const handleAuthorizedPaymentWebhook = async (paymentId, action) => {
  // Similar a handlePaymentWebhook
  await handlePaymentWebhook(paymentId, action);
};

// =====================================================
// ADMIN (ROOT) - GESTIÓN DE SUSCRIPCIONES
// =====================================================

/**
 * GET /api/billing/admin/subscriptions
 * Lista todas las suscripciones (solo root)
 */
const adminListSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) {
      where.status = status;
    }

    const subscriptionsList = await prisma.tenant_subscriptions.findMany({
      where,
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
            slug: true,
            companyEmail: true,
          },
        },
        subscription_plans: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: parseInt(limit),
    });

    const total = await prisma.tenant_subscriptions.count({ where });

    res.json({
      success: true,
      data: {
        subscriptions: subscriptionsList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error listando suscripciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar suscripciones',
    });
  }
};

/**
 * GET /api/billing/admin/subscriptions/:tenantId
 * Obtiene detalle de suscripción de un tenant (solo root)
 */
const adminGetSubscription = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const subscription = await subscriptions.getTenantSubscription(tenantId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Suscripción no encontrada',
      });
    }

    // Obtener historial de pagos
    const payments = await prisma.payments.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        subscription,
        payments,
      },
    });
  } catch (error) {
    console.error('Error obteniendo suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener suscripción',
    });
  }
};

/**
 * PUT /api/billing/admin/subscriptions/:tenantId
 * Actualiza suscripción manualmente (solo root)
 */
const adminUpdateSubscription = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { status, planId, internalNotes, extendTrialDays } = req.body;

    const updates = {};

    if (status) updates.status = status;
    if (planId) updates.plan_id = planId;
    if (internalNotes !== undefined) updates.internal_notes = internalNotes;

    // Extensión manual de trial
    if (extendTrialDays) {
      const subscription = await subscriptions.getTenantSubscription(tenantId);
      if (subscription && subscription.trial_ends_at) {
        const newTrialEnd = new Date(subscription.trial_ends_at);
        newTrialEnd.setDate(newTrialEnd.getDate() + parseInt(extendTrialDays));
        updates.trial_ends_at = newTrialEnd;
      }
    }

    const updated = await prisma.tenant_subscriptions.update({
      where: { tenant_id: tenantId },
      data: updates,
    });

    res.json({
      success: true,
      message: 'Suscripción actualizada',
      data: { subscription: updated },
    });
  } catch (error) {
    console.error('Error actualizando suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar suscripción',
    });
  }
};

/**
 * POST /api/billing/admin/subscriptions/:tenantId/suspend
 * Suspende una suscripción manualmente (solo root)
 */
const adminSuspendSubscription = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { reason } = req.body;

    const subscription = await subscriptions.getTenantSubscription(tenantId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Suscripción no encontrada',
      });
    }

    // Pausar en MP si existe
    if (subscription.mp_preapproval_id) {
      await mercadopago.pauseSubscription(subscription.mp_preapproval_id);
    }

    await prisma.tenant_subscriptions.update({
      where: { tenant_id: tenantId },
      data: {
        status: 'suspended',
        suspended_at: new Date(),
        suspension_reason: reason,
      },
    });

    res.json({
      success: true,
      message: 'Suscripción suspendida',
    });
  } catch (error) {
    console.error('Error suspendiendo suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al suspender suscripción',
    });
  }
};

/**
 * POST /api/billing/admin/subscriptions/:tenantId/reactivate
 * Reactiva una suscripción suspendida (solo root)
 */
const adminReactivateSubscription = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const subscription = await subscriptions.getTenantSubscription(tenantId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Suscripción no encontrada',
      });
    }

    // Reactivar en MP si existe
    if (subscription.mp_preapproval_id) {
      await mercadopago.reactivateSubscription(subscription.mp_preapproval_id);
    }

    await prisma.tenant_subscriptions.update({
      where: { tenant_id: tenantId },
      data: {
        status: 'active',
        suspended_at: null,
        suspension_reason: null,
      },
    });

    res.json({
      success: true,
      message: 'Suscripción reactivada',
    });
  } catch (error) {
    console.error('Error reactivando suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reactivar suscripción',
    });
  }
};

/**
 * GET /api/billing/admin/alerts
 * Obtiene alertas de billing (pagos fallidos, trials por vencer, etc.)
 */
const adminGetAlerts = async (req, res) => {
  try {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Pagos fallidos
    const failedPayments = await prisma.payments.findMany({
      where: {
        status: 'failed',
        created_at: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: {
        tenants: {
          select: { id: true, name: true, companyEmail: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    // Trials por vencer (próximos 3 días)
    const expiringTrials = await prisma.tenant_subscriptions.findMany({
      where: {
        status: 'trialing',
        trial_ends_at: {
          gte: now,
          lte: in3Days,
        },
      },
      include: {
        tenants: {
          select: { id: true, name: true, companyEmail: true },
        },
      },
    });

    // Suscripciones con pago pendiente
    const pastDue = await prisma.tenant_subscriptions.findMany({
      where: {
        status: 'past_due',
      },
      include: {
        tenants: {
          select: { id: true, name: true, companyEmail: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        failedPayments,
        expiringTrials,
        pastDue,
        summary: {
          failedPaymentsCount: failedPayments.length,
          expiringTrialsCount: expiringTrials.length,
          pastDueCount: pastDue.length,
        },
      },
    });
  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener alertas',
    });
  }
};

// =====================================================
// ADMIN - PROMOCIONES
// =====================================================

/**
 * GET /api/billing/admin/promotions
 * Lista todas las promociones (solo root)
 */
const adminListPromotions = async (req, res) => {
  try {
    const promotions = await prisma.promotions.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { promotion_uses: true },
        },
      },
    });

    res.json({
      success: true,
      data: { promotions },
    });
  } catch (error) {
    console.error('Error listando promociones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar promociones',
    });
  }
};

/**
 * POST /api/billing/admin/promotions
 * Crea una nueva promoción (solo root)
 */
const adminCreatePromotion = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      discountType = 'percentage',
      discountValue,
      applicablePlans = [],
      maxUses,
      maxUsesPerTenant = 1,
      durationMonths,
      startsAt,
      expiresAt,
    } = req.body;

    if (!code || !name || discountValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Código, nombre y valor de descuento son requeridos',
      });
    }

    // Verificar que el código no exista
    const existing = await prisma.promotions.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una promoción con ese código',
      });
    }

    const promotion = await prisma.promotions.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        discount_type: discountType,
        discount_value: discountValue,
        applicable_plans: applicablePlans,
        max_uses: maxUses,
        max_uses_per_tenant: maxUsesPerTenant,
        duration_months: durationMonths,
        starts_at: startsAt ? new Date(startsAt) : new Date(),
        expires_at: expiresAt ? new Date(expiresAt) : null,
        created_by: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Promoción creada',
      data: { promotion },
    });
  } catch (error) {
    console.error('Error creando promoción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear promoción',
    });
  }
};

/**
 * PUT /api/billing/admin/promotions/:id
 * Actualiza una promoción (solo root)
 */
const adminUpdatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // No permitir cambiar el código
    delete updates.code;

    const promotion = await prisma.promotions.update({
      where: { id },
      data: updates,
    });

    res.json({
      success: true,
      message: 'Promoción actualizada',
      data: { promotion },
    });
  } catch (error) {
    console.error('Error actualizando promoción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar promoción',
    });
  }
};

/**
 * DELETE /api/billing/admin/promotions/:id
 * Desactiva una promoción (solo root)
 */
const adminDeletePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.promotions.update({
      where: { id },
      data: { is_active: false },
    });

    res.json({
      success: true,
      message: 'Promoción desactivada',
    });
  } catch (error) {
    console.error('Error desactivando promoción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar promoción',
    });
  }
};

// =====================================================
// ADMIN - ESTADÍSTICAS
// =====================================================

/**
 * GET /api/billing/admin/stats
 * Obtiene estadísticas de billing (solo root)
 */
const adminGetStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // MRR (Monthly Recurring Revenue)
    const activeSubscriptions = await prisma.tenant_subscriptions.findMany({
      where: {
        status: 'active',
      },
      select: {
        amount: true,
        billing_cycle: true,
      },
    });

    const mrr = activeSubscriptions.reduce((sum, sub) => {
      const monthly = sub.billing_cycle === 'yearly'
        ? parseFloat(sub.amount || 0) / 12
        : parseFloat(sub.amount || 0);
      return sum + monthly;
    }, 0);

    // Conteo por estado
    const statusCounts = await prisma.tenant_subscriptions.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Pagos del mes
    const monthlyPayments = await prisma.payments.aggregate({
      where: {
        status: 'completed',
        created_at: { gte: startOfMonth },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Trials activos
    const activeTrials = await prisma.tenant_subscriptions.count({
      where: { status: 'trialing' },
    });

    // Conversiones del mes (trial -> active)
    // Esto es una aproximación
    const conversionsThisMonth = await prisma.tenant_subscriptions.count({
      where: {
        status: 'active',
        created_at: { gte: startOfMonth },
      },
    });

    res.json({
      success: true,
      data: {
        mrr,
        arr: mrr * 12,
        activeSubscriptions: activeSubscriptions.length,
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {}),
        monthlyRevenue: parseFloat(monthlyPayments._sum.amount || 0),
        monthlyTransactions: monthlyPayments._count.id,
        activeTrials,
        conversionsThisMonth,
      },
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
    });
  }
};

module.exports = {
  // Planes (público)
  getPlans,
  getPlanBySlug,
  
  // Suscripción del tenant
  getSubscription,
  createCheckout,
  upgradePlan,
  downgradePlan,
  cancelSubscription,
  reactivateSubscription,
  
  // Trial
  extendTrial,
  
  // Acompañamiento
  activateAccompaniment,
  
  // Promociones
  validatePromotion,
  
  // Pagos
  getPayments,
  
  // Webhooks
  handleMercadoPagoWebhook,
  
  // Admin
  adminListSubscriptions,
  adminGetSubscription,
  adminUpdateSubscription,
  adminSuspendSubscription,
  adminReactivateSubscription,
  adminGetAlerts,
  adminListPromotions,
  adminCreatePromotion,
  adminUpdatePromotion,
  adminDeletePromotion,
  adminGetStats,
};
