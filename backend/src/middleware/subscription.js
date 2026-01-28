/**
 * Middleware de verificación de suscripción
 * Verifica que el tenant tenga una suscripción activa y los límites del plan
 */

const { subscriptions } = require('../services/billing');

/**
 * Verifica que el tenant tenga una suscripción activa (o trial válido)
 * Usar en rutas que requieren suscripción
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    // Root no requiere suscripción
    if (req.user?.role === 'root') {
      return next();
    }

    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        code: 'NO_TENANT',
        message: 'Usuario sin organización asignada',
      });
    }

    const subscription = await subscriptions.getTenantSubscription(tenantId);

    if (!subscription) {
      return res.status(402).json({
        success: false,
        code: 'NO_SUBSCRIPTION',
        message: 'Se requiere una suscripción para acceder',
        data: {
          needsSubscription: true,
          redirectTo: '/billing/planes',
        },
      });
    }

    // Verificar estado de la suscripción
    switch (subscription.status) {
      case 'active':
        // OK, continuar
        break;

      case 'trialing':
        // Verificar si el trial expiró
        if (subscriptions.isTrialExpired(subscription)) {
          return res.status(402).json({
            success: false,
            code: 'TRIAL_EXPIRED',
            message: 'Tu período de prueba ha terminado',
            data: {
              trialExpired: true,
              canExtend: subscription.trial_extensions < subscriptions.MAX_TRIAL_EXTENSIONS,
              redirectTo: '/billing/planes',
            },
          });
        }
        break;

      case 'past_due':
        // Pago pendiente pero aún permitimos acceso
        // Solo notificamos en el frontend
        req.subscriptionWarning = {
          type: 'past_due',
          message: 'Hay un problema con tu pago. Por favor, actualiza tu método de pago.',
        };
        break;

      case 'cancelled':
        // Si está cancelado pero aún no terminó el período
        if (subscription.current_period_end && new Date() < new Date(subscription.current_period_end)) {
          req.subscriptionWarning = {
            type: 'cancelled',
            message: 'Tu suscripción está cancelada y terminará el ' + 
              new Date(subscription.current_period_end).toLocaleDateString(),
          };
        } else {
          return res.status(402).json({
            success: false,
            code: 'SUBSCRIPTION_ENDED',
            message: 'Tu suscripción ha terminado',
            data: {
              subscriptionEnded: true,
              redirectTo: '/billing/planes',
            },
          });
        }
        break;

      case 'suspended':
        return res.status(402).json({
          success: false,
          code: 'SUBSCRIPTION_SUSPENDED',
          message: 'Tu cuenta está suspendida. Contacta a soporte.',
          data: {
            suspended: true,
            reason: subscription.suspension_reason,
          },
        });

      default:
        // Estado desconocido o pendiente
        return res.status(402).json({
          success: false,
          code: 'SUBSCRIPTION_PENDING',
          message: 'Tu suscripción está pendiente de activación',
        });
    }

    // Agregar info de suscripción al request para uso posterior
    req.subscription = subscription;
    req.subscriptionPlan = subscription.status === 'trialing' && subscription.trial_plan_id
      ? await require('../services/prisma').subscriptionPlan.findUnique({ 
          where: { id: subscription.trial_plan_id } 
        })
      : subscription.subscription_plans;

    next();
  } catch (error) {
    console.error('Error verificando suscripción:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar suscripción',
    });
  }
};

/**
 * Verifica un límite específico del plan
 * @param {string} limitType - Tipo de límite: 'users', 'carpetas', 'clientes', 
 *                             'tracking_navieras', 'facturacion_afip', 'reportes_avanzados'
 */
const checkPlanLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      // Root no tiene límites
      if (req.user?.role === 'root') {
        return next();
      }

      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        return next(); // Dejar que otro middleware maneje esto
      }

      const result = await subscriptions.checkPlanLimits(tenantId, limitType);

      if (!result.allowed) {
        const response = {
          success: false,
          code: 'PLAN_LIMIT_REACHED',
          message: result.reason || 'Has alcanzado el límite de tu plan',
          data: {
            limitType,
            current: result.current,
            limit: result.limit,
            upgradeRequired: true,
            upgradeMessage: getUpgradeMessage(limitType),
          },
        };

        // Usar 403 para límites de features, 402 para límites que requieren upgrade
        const statusCode = result.upgradeRequired ? 402 : 403;
        return res.status(statusCode).json(response);
      }

      // Agregar info del límite al request
      req.planLimit = {
        type: limitType,
        current: result.current,
        limit: result.limit,
        remaining: result.limit ? result.limit - result.current : null,
      };

      next();
    } catch (error) {
      console.error('Error verificando límite de plan:', error);
      // En caso de error, permitir (fail-open) para no bloquear operaciones
      next();
    }
  };
};

/**
 * Mensajes amigables de upgrade según el tipo de límite
 */
const getUpgradeMessage = (limitType) => {
  const messages = {
    users: '¿Necesitás más usuarios? Mejorá tu plan para agregar más colaboradores a tu equipo.',
    carpetas: '¿Necesitás crear más carpetas? Mejorá tu plan para gestionar más operaciones.',
    clientes: '¿Necesitás registrar más clientes? Mejorá tu plan para hacer crecer tu cartera.',
    tracking_navieras: 'El tracking de navieras te permite seguir tus contenedores en tiempo real. Disponible desde el plan Profesional.',
    facturacion_afip: 'La facturación electrónica AFIP te permite emitir comprobantes fiscales. Disponible desde el plan Starter.',
    reportes_avanzados: 'Los reportes avanzados te dan insights para tomar mejores decisiones. Disponible desde el plan Profesional.',
  };

  return messages[limitType] || 'Mejorá tu plan para acceder a más funcionalidades.';
};

/**
 * Middleware que solo advierte sobre límites pero no bloquea
 * Útil para mostrar warnings en el frontend
 */
const warnPlanLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'root') {
        return next();
      }

      const tenantId = req.user?.tenant_id;
      if (!tenantId) return next();

      const result = await subscriptions.checkPlanLimits(tenantId, limitType);

      if (!result.allowed) {
        req.planLimitWarning = {
          type: limitType,
          message: result.reason,
          upgradeMessage: getUpgradeMessage(limitType),
        };
      } else if (result.limit && result.current >= result.limit * 0.8) {
        // Advertir cuando está al 80% del límite
        req.planLimitWarning = {
          type: limitType,
          message: `Estás cerca del límite de ${limitType} (${result.current}/${result.limit})`,
          approaching: true,
        };
      }

      next();
    } catch (error) {
      next();
    }
  };
};

/**
 * Combina requireActiveSubscription con checkPlanLimit
 */
const requireSubscriptionAndLimit = (limitType) => {
  return [requireActiveSubscription, checkPlanLimit(limitType)];
};

module.exports = {
  requireActiveSubscription,
  checkPlanLimit,
  warnPlanLimit,
  requireSubscriptionAndLimit,
  getUpgradeMessage,
};
