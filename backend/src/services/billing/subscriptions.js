/**
 * Servicio de gestión de suscripciones
 * Lógica de negocio para trials, planes, upgrades, etc.
 */

const prisma = require('../prisma');
const mercadopago = require('./mercadopago');

// Constantes de configuración
const TRIAL_DAYS = 7;
const MAX_TRIAL_EXTENSIONS = 2;
const ACCOMPANIMENT_PRICE = 10000; // $10.000
const ACCOMPANIMENT_MONTHS = 2;
const TRIAL_PLAN_SLUG = 'profesional'; // Plan durante el trial

/**
 * Obtiene todos los planes activos
 */
const getActivePlans = async () => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return plans;
};

/**
 * Obtiene un plan por slug
 */
const getPlanBySlug = async (slug) => {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { slug },
  });
  return plan;
};

/**
 * Obtiene la suscripción de un tenant
 */
const getTenantSubscription = async (tenantId) => {
  const subscription = await prisma.tenant_subscriptions.findUnique({
    where: { tenant_id: tenantId },
    include: {
      subscription_plans: true,
      tenants: {
        select: {
          id: true,
          name: true,
          companyEmail: true,
        }
      }
    },
  });
  return subscription;
};

/**
 * Inicia un trial para un tenant nuevo
 */
const startTrial = async (tenantId) => {
  const trialPlan = await getPlanBySlug(TRIAL_PLAN_SLUG);
  
  if (!trialPlan) {
    throw new Error('Plan de trial no encontrado');
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const subscription = await prisma.tenant_subscriptions.create({
    data: {
      tenant_id: tenantId,
      status: 'trialing',
      trial_started_at: new Date(),
      trial_ends_at: trialEndsAt,
      trial_extensions: 0,
      trial_plan_id: trialPlan.id,
      plan_id: null, // No tiene plan pagado aún
      billing_cycle: 'monthly',
      currency: 'ARS',
    },
  });

  return subscription;
};

/**
 * Extiende el trial de un tenant (máximo 2 extensiones)
 */
const extendTrial = async (tenantId) => {
  const subscription = await getTenantSubscription(tenantId);

  if (!subscription) {
    throw new Error('Suscripción no encontrada');
  }

  if (subscription.status !== 'trialing') {
    throw new Error('Solo se puede extender trials activos');
  }

  if (subscription.trial_extensions >= MAX_TRIAL_EXTENSIONS) {
    throw new Error('Ya se alcanzó el máximo de extensiones de trial');
  }

  const newTrialEndsAt = new Date(subscription.trial_ends_at);
  newTrialEndsAt.setDate(newTrialEndsAt.getDate() + TRIAL_DAYS);

  const updated = await prisma.tenant_subscriptions.update({
    where: { tenant_id: tenantId },
    data: {
      trial_ends_at: newTrialEndsAt,
      trial_extensions: subscription.trial_extensions + 1,
    },
  });

  return updated;
};

/**
 * Verifica si el trial expiró
 */
const isTrialExpired = (subscription) => {
  if (subscription.status !== 'trialing') return false;
  return new Date() > new Date(subscription.trial_ends_at);
};

/**
 * Obtiene los días restantes del trial
 */
const getTrialDaysRemaining = (subscription) => {
  if (subscription.status !== 'trialing') return 0;
  const now = new Date();
  const trialEnd = new Date(subscription.trial_ends_at);
  const diffTime = trialEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/**
 * Activa la oferta de acompañamiento para un tenant
 */
const activateAccompanimentOffer = async (tenantId, planId) => {
  const emprendedorPlan = await getPlanBySlug('emprendedor');
  
  if (!emprendedorPlan) {
    throw new Error('Plan Emprendedor no encontrado');
  }

  const subscription = await prisma.tenant_subscriptions.update({
    where: { tenant_id: tenantId },
    data: {
      status: 'active',
      plan_id: emprendedorPlan.id,
      has_accompaniment_offer: true,
      accompaniment_months_used: 0,
      accompaniment_price: ACCOMPANIMENT_PRICE,
      amount: ACCOMPANIMENT_PRICE,
      current_period_start: new Date(),
      current_period_end: getNextBillingDate('monthly'),
    },
  });

  return subscription;
};

/**
 * Procesa el avance del mes de acompañamiento
 * Llamar cuando se renueva el mes
 */
const processAccompanimentMonth = async (tenantId) => {
  const subscription = await getTenantSubscription(tenantId);

  if (!subscription || !subscription.has_accompaniment_offer) {
    return subscription;
  }

  const monthsUsed = subscription.accompaniment_months_used + 1;

  // Si ya usó los 2 meses de acompañamiento, volver al precio normal
  if (monthsUsed >= ACCOMPANIMENT_MONTHS) {
    const plan = subscription.subscription_plans;
    return await prisma.tenant_subscriptions.update({
      where: { tenant_id: tenantId },
      data: {
        accompaniment_months_used: monthsUsed,
        has_accompaniment_offer: false,
        amount: plan.priceMonthly,
      },
    });
  }

  return await prisma.tenant_subscriptions.update({
    where: { tenant_id: tenantId },
    data: {
      accompaniment_months_used: monthsUsed,
    },
  });
};

/**
 * Suscribe a un tenant a un plan (después del trial o upgrade)
 */
const subscribeToPlan = async (tenantId, planSlug, billingCycle = 'monthly', promotionCode = null) => {
  const plan = await getPlanBySlug(planSlug);
  
  if (!plan) {
    throw new Error('Plan no encontrado');
  }

  if (plan.isContactSales) {
    throw new Error('Este plan requiere contactar a ventas');
  }

  // Calcular precio
  let amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  let discountAmount = 0;
  let appliedPromotionId = null;

  // Aplicar promoción si existe
  if (promotionCode) {
    const promotionResult = await applyPromotion(tenantId, promotionCode, planSlug, amount);
    if (promotionResult.success) {
      discountAmount = promotionResult.discountAmount;
      appliedPromotionId = promotionResult.promotionId;
    }
  }

  const finalAmount = Math.max(0, parseFloat(amount) - discountAmount);

  // Obtener email del tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        where: { role: 'admin' },
        take: 1,
      }
    }
  });

  const payerEmail = tenant?.companyEmail || tenant?.users[0]?.email;

  if (!payerEmail) {
    throw new Error('No se encontró email para el pago');
  }

  // Crear suscripción en MercadoPago
  const mpResult = await mercadopago.createSubscription({
    tenantId,
    planName: plan.name,
    amount: finalAmount,
    billingCycle,
    payerEmail,
    externalReference: `${tenantId}|${plan.slug}`,
    promotionCode,
    discountAmount,
  });

  if (!mpResult.success) {
    throw new Error(`Error en MercadoPago: ${mpResult.error}`);
  }

  // Actualizar o crear suscripción en nuestra BD
  const subscriptionData = {
    plan_id: plan.id,
    status: 'pending', // Cambiará a 'active' cuando MP confirme
    billing_cycle: billingCycle,
    amount: finalAmount,
    currency: 'ARS',
    mp_preapproval_id: mpResult.data.id,
    applied_promotion_id: appliedPromotionId,
    current_period_start: new Date(),
    current_period_end: getNextBillingDate(billingCycle),
  };

  const subscription = await prisma.tenant_subscriptions.upsert({
    where: { tenant_id: tenantId },
    create: {
      tenant_id: tenantId,
      ...subscriptionData,
    },
    update: subscriptionData,
  });

  return {
    subscription,
    checkoutUrl: mpResult.data.initPoint,
    mpSubscriptionId: mpResult.data.id,
  };
};

/**
 * Procesa un upgrade de plan (inmediato con prorrateo)
 */
const upgradePlan = async (tenantId, newPlanSlug) => {
  const subscription = await getTenantSubscription(tenantId);
  const newPlan = await getPlanBySlug(newPlanSlug);

  if (!subscription || !subscription.subscription_plans) {
    throw new Error('Suscripción no encontrada');
  }

  if (!newPlan) {
    throw new Error('Plan no encontrado');
  }

  const currentPlan = subscription.subscription_plans;

  // Verificar que es un upgrade (plan más caro)
  if (parseFloat(newPlan.priceMonthly) <= parseFloat(currentPlan.priceMonthly)) {
    throw new Error('Para bajar de plan, usa la función de downgrade');
  }

  // Calcular prorrateo
  const now = new Date();
  const periodEnd = new Date(subscription.current_period_end);
  const periodStart = new Date(subscription.current_period_start);
  
  const totalDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));
  
  const currentDailyRate = parseFloat(currentPlan.priceMonthly) / totalDays;
  const newDailyRate = parseFloat(newPlan.priceMonthly) / totalDays;
  
  const creditFromCurrent = currentDailyRate * remainingDays;
  const costForNew = newDailyRate * remainingDays;
  const proratedAmount = Math.max(0, costForNew - creditFromCurrent);

  // Actualizar suscripción en MP si existe
  if (subscription.mp_preapproval_id) {
    await mercadopago.updateSubscription(subscription.mp_preapproval_id, {
      amount: parseFloat(newPlan.priceMonthly),
      reason: `Nicroma - Plan ${newPlan.name}`,
    });
  }

  // Actualizar en nuestra BD
  const updated = await prisma.tenant_subscriptions.update({
    where: { tenant_id: tenantId },
    data: {
      plan_id: newPlan.id,
      amount: newPlan.priceMonthly,
    },
  });

  return {
    subscription: updated,
    proratedAmount,
    message: `Upgrade exitoso. Monto prorrateado a cobrar: $${proratedAmount.toFixed(2)}`,
  };
};

/**
 * Programa un downgrade de plan (aplica al próximo ciclo)
 */
const schedulePlanDowngrade = async (tenantId, newPlanSlug) => {
  const subscription = await getTenantSubscription(tenantId);
  const newPlan = await getPlanBySlug(newPlanSlug);

  if (!subscription) {
    throw new Error('Suscripción no encontrada');
  }

  if (!newPlan) {
    throw new Error('Plan no encontrado');
  }

  const updated = await prisma.tenant_subscriptions.update({
    where: { tenant_id: tenantId },
    data: {
      pending_plan_id: newPlan.id,
      pending_plan_change_at: subscription.current_period_end,
    },
  });

  return {
    subscription: updated,
    effectiveDate: subscription.current_period_end,
    message: `El cambio a ${newPlan.name} se aplicará el ${subscription.current_period_end.toLocaleDateString()}`,
  };
};

/**
 * Aplica un código de promoción
 */
const applyPromotion = async (tenantId, code, planSlug, amount) => {
  const promotion = await prisma.promotions.findFirst({
    where: {
      code: code.toUpperCase(),
      is_active: true,
      OR: [
        { expires_at: null },
        { expires_at: { gt: new Date() } },
      ],
      OR: [
        { starts_at: null },
        { starts_at: { lte: new Date() } },
      ],
    },
  });

  if (!promotion) {
    return { success: false, error: 'Código de promoción inválido o expirado' };
  }

  // Verificar si el plan aplica
  const applicablePlans = promotion.applicable_plans || [];
  if (applicablePlans.length > 0 && !applicablePlans.includes(planSlug)) {
    return { success: false, error: 'Este código no aplica para el plan seleccionado' };
  }

  // Verificar límite de usos totales
  if (promotion.max_uses && promotion.uses_count >= promotion.max_uses) {
    return { success: false, error: 'Este código ya alcanzó su límite de usos' };
  }

  // Verificar uso por tenant
  const tenantUses = await prisma.promotion_uses.count({
    where: {
      promotion_id: promotion.id,
      tenant_id: tenantId,
    },
  });

  if (promotion.max_uses_per_tenant && tenantUses >= promotion.max_uses_per_tenant) {
    return { success: false, error: 'Ya usaste este código' };
  }

  // Calcular descuento
  let discountAmount = 0;
  if (promotion.discount_type === 'percentage') {
    discountAmount = (parseFloat(amount) * parseFloat(promotion.discount_value)) / 100;
  } else {
    discountAmount = parseFloat(promotion.discount_value);
  }

  return {
    success: true,
    promotionId: promotion.id,
    discountAmount,
    discountType: promotion.discount_type,
    discountValue: promotion.discount_value,
    durationMonths: promotion.duration_months,
  };
};

/**
 * Registra el uso de una promoción
 */
const recordPromotionUse = async (promotionId, tenantId, subscriptionId, discountApplied) => {
  await prisma.promotion_uses.create({
    data: {
      promotion_id: promotionId,
      tenant_id: tenantId,
      subscription_id: subscriptionId,
      discount_applied: discountApplied,
    },
  });

  // Incrementar contador de usos
  await prisma.promotions.update({
    where: { id: promotionId },
    data: {
      uses_count: { increment: 1 },
    },
  });
};

/**
 * Cancela la suscripción al final del período
 */
const cancelSubscription = async (tenantId, reason = null) => {
  const subscription = await getTenantSubscription(tenantId);

  if (!subscription) {
    throw new Error('Suscripción no encontrada');
  }

  // Cancelar en MercadoPago si existe
  if (subscription.mp_preapproval_id) {
    await mercadopago.cancelSubscription(subscription.mp_preapproval_id);
  }

  const updated = await prisma.tenant_subscriptions.update({
    where: { tenant_id: tenantId },
    data: {
      cancel_at_period_end: true,
      cancel_reason: reason,
      cancelled_at: new Date(),
    },
  });

  return updated;
};

/**
 * Reactiva una suscripción cancelada (antes de que termine el período)
 */
const reactivateSubscription = async (tenantId) => {
  const subscription = await getTenantSubscription(tenantId);

  if (!subscription) {
    throw new Error('Suscripción no encontrada');
  }

  // Reactivar en MercadoPago si existe
  if (subscription.mp_preapproval_id) {
    await mercadopago.reactivateSubscription(subscription.mp_preapproval_id);
  }

  const updated = await prisma.tenant_subscriptions.update({
    where: { tenant_id: tenantId },
    data: {
      cancel_at_period_end: false,
      cancel_reason: null,
      cancelled_at: null,
      status: 'active',
    },
  });

  return updated;
};

/**
 * Obtiene la fecha del próximo ciclo de facturación
 */
const getNextBillingDate = (billingCycle) => {
  const date = new Date();
  if (billingCycle === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date;
};

/**
 * Verifica los límites del plan para una acción específica
 */
const checkPlanLimits = async (tenantId, limitType) => {
  const subscription = await getTenantSubscription(tenantId);
  
  if (!subscription) {
    return { allowed: false, reason: 'Sin suscripción activa' };
  }

  // Durante el trial, usar el plan de trial
  let plan;
  if (subscription.status === 'trialing' && subscription.trial_plan_id) {
    plan = await prisma.subscriptionPlan.findUnique({
      where: { id: subscription.trial_plan_id },
    });
  } else {
    plan = subscription.subscription_plans;
  }

  if (!plan) {
    return { allowed: false, reason: 'Plan no encontrado' };
  }

  switch (limitType) {
    case 'users': {
      const userCount = await prisma.user.count({
        where: { tenantId, role: { not: 'client' } },
      });
      const limit = plan.maxUsers;
      return {
        allowed: limit === null || userCount < limit,
        current: userCount,
        limit,
        reason: limit && userCount >= limit ? `Límite de ${limit} usuarios alcanzado` : null,
      };
    }

    case 'carpetas': {
      // Contar carpetas del mes actual
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const carpetaCount = await prisma.carpeta.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth },
        },
      });
      const limit = plan.maxCarpetasPerMonth;
      return {
        allowed: limit === null || carpetaCount < limit,
        current: carpetaCount,
        limit,
        reason: limit && carpetaCount >= limit ? `Límite de ${limit} carpetas/mes alcanzado` : null,
      };
    }

    case 'clientes': {
      const clienteCount = await prisma.cliente.count({
        where: { tenantId },
      });
      const limit = plan.maxClientes;
      return {
        allowed: limit === null || clienteCount < limit,
        current: clienteCount,
        limit,
        reason: limit && clienteCount >= limit ? `Límite de ${limit} clientes alcanzado` : null,
      };
    }

    case 'tracking_navieras': {
      return {
        allowed: plan.hasTrackingNavieras,
        reason: !plan.hasTrackingNavieras ? 'Tracking de navieras no incluido en tu plan' : null,
        upgradeRequired: !plan.hasTrackingNavieras,
      };
    }

    case 'facturacion_afip': {
      return {
        allowed: plan.hasFacturacionAfip,
        reason: !plan.hasFacturacionAfip ? 'Facturación AFIP no incluida en tu plan' : null,
        upgradeRequired: !plan.hasFacturacionAfip,
      };
    }

    case 'reportes_avanzados': {
      return {
        allowed: plan.hasReportesAvanzados,
        reason: !plan.hasReportesAvanzados ? 'Reportes avanzados no incluidos en tu plan' : null,
        upgradeRequired: !plan.hasReportesAvanzados,
      };
    }

    default:
      return { allowed: true };
  }
};

/**
 * Obtiene el estado completo de la suscripción para mostrar en el frontend
 */
const getSubscriptionStatus = async (tenantId) => {
  const subscription = await getTenantSubscription(tenantId);
  
  if (!subscription) {
    return {
      hasSubscription: false,
      status: 'none',
      needsSubscription: true,
    };
  }

  const plan = subscription.status === 'trialing' && subscription.trial_plan_id
    ? await prisma.subscriptionPlan.findUnique({ where: { id: subscription.trial_plan_id } })
    : subscription.subscription_plans;

  const result = {
    hasSubscription: true,
    status: subscription.status,
    plan: plan ? {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
    } : null,
    billingCycle: subscription.billing_cycle,
    amount: subscription.amount,
    currency: subscription.currency,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  if (subscription.status === 'trialing') {
    result.trial = {
      endsAt: subscription.trial_ends_at,
      daysRemaining: getTrialDaysRemaining(subscription),
      extensions: subscription.trial_extensions,
      maxExtensions: MAX_TRIAL_EXTENSIONS,
      canExtend: subscription.trial_extensions < MAX_TRIAL_EXTENSIONS,
      isExpired: isTrialExpired(subscription),
    };
  }

  if (subscription.has_accompaniment_offer) {
    result.accompaniment = {
      active: true,
      monthsUsed: subscription.accompaniment_months_used,
      totalMonths: ACCOMPANIMENT_MONTHS,
      currentPrice: subscription.accompaniment_price,
    };
  }

  if (subscription.pending_plan_id) {
    const pendingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: subscription.pending_plan_id },
    });
    result.pendingChange = {
      plan: pendingPlan,
      effectiveAt: subscription.pending_plan_change_at,
    };
  }

  return result;
};

module.exports = {
  // Planes
  getActivePlans,
  getPlanBySlug,
  
  // Suscripciones
  getTenantSubscription,
  subscribeToPlan,
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionStatus,
  
  // Trial
  startTrial,
  extendTrial,
  isTrialExpired,
  getTrialDaysRemaining,
  
  // Acompañamiento
  activateAccompanimentOffer,
  processAccompanimentMonth,
  
  // Cambios de plan
  upgradePlan,
  schedulePlanDowngrade,
  
  // Promociones
  applyPromotion,
  recordPromotionUse,
  
  // Límites
  checkPlanLimits,
  
  // Utilidades
  getNextBillingDate,
  
  // Constantes exportadas
  TRIAL_DAYS,
  MAX_TRIAL_EXTENSIONS,
  ACCOMPANIMENT_PRICE,
  ACCOMPANIMENT_MONTHS,
};
