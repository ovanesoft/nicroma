/**
 * Servicio de integración con MercadoPago
 * Maneja la creación de suscripciones, pagos y webhooks
 */

const { MercadoPagoConfig, PreApproval, PreApprovalPlan, Payment } = require('mercadopago');

// Configuración del cliente de MercadoPago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: {
    timeout: 5000,
  }
});

// Instancias de los servicios de MP
const preApproval = new PreApproval(client);
const preApprovalPlan = new PreApprovalPlan(client);
const payment = new Payment(client);

/**
 * Crea un plan de suscripción en MercadoPago
 * (Se usa para definir los planes, no es necesario si usamos preapproval directo)
 */
const createSubscriptionPlan = async (planData) => {
  try {
    const response = await preApprovalPlan.create({
      body: {
        reason: planData.name,
        auto_recurring: {
          frequency: 1,
          frequency_type: planData.billingCycle === 'yearly' ? 'years' : 'months',
          transaction_amount: parseFloat(planData.price),
          currency_id: 'ARS',
        },
        back_url: `${process.env.FRONTEND_URL}/billing/callback`,
      }
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Error creando plan en MP:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Crea una suscripción (preapproval) para un tenant
 * Esto genera el link de pago para que el usuario autorice el débito automático
 */
const createSubscription = async ({
  tenantId,
  planName,
  amount,
  billingCycle = 'monthly',
  payerEmail,
  externalReference,
  promotionCode = null,
  discountAmount = 0
}) => {
  try {
    const finalAmount = Math.max(0, parseFloat(amount) - parseFloat(discountAmount));
    
    const subscriptionData = {
      body: {
        reason: `Nicroma - Plan ${planName}`,
        auto_recurring: {
          frequency: billingCycle === 'yearly' ? 1 : 1,
          frequency_type: billingCycle === 'yearly' ? 'years' : 'months',
          transaction_amount: finalAmount,
          currency_id: 'ARS',
        },
        payer_email: payerEmail,
        external_reference: externalReference || tenantId,
        back_url: `${process.env.FRONTEND_URL}/billing/suscripcion?status=callback`,
        notification_url: `${process.env.BACKEND_URL}/api/billing/webhooks/mercadopago`,
      }
    };

    const response = await preApproval.create(subscriptionData);
    
    return {
      success: true,
      data: {
        id: response.id,
        initPoint: response.init_point,
        status: response.status,
        payerId: response.payer_id,
      }
    };
  } catch (error) {
    console.error('Error creando suscripción en MP:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtiene el estado de una suscripción
 */
const getSubscription = async (subscriptionId) => {
  try {
    const response = await preApproval.get({ id: subscriptionId });
    return {
      success: true,
      data: {
        id: response.id,
        status: response.status,
        payerId: response.payer_id,
        reason: response.reason,
        nextPaymentDate: response.next_payment_date,
        lastModified: response.last_modified,
      }
    };
  } catch (error) {
    console.error('Error obteniendo suscripción de MP:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Actualiza una suscripción (cambio de monto por upgrade)
 */
const updateSubscription = async (subscriptionId, { amount, reason }) => {
  try {
    const updateData = {
      id: subscriptionId,
      body: {}
    };

    if (amount !== undefined) {
      updateData.body.auto_recurring = {
        transaction_amount: parseFloat(amount),
        currency_id: 'ARS',
      };
    }

    if (reason) {
      updateData.body.reason = reason;
    }

    const response = await preApproval.update(updateData);
    return { success: true, data: response };
  } catch (error) {
    console.error('Error actualizando suscripción en MP:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cancela una suscripción
 */
const cancelSubscription = async (subscriptionId) => {
  try {
    const response = await preApproval.update({
      id: subscriptionId,
      body: {
        status: 'cancelled'
      }
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Error cancelando suscripción en MP:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Pausa una suscripción
 */
const pauseSubscription = async (subscriptionId) => {
  try {
    const response = await preApproval.update({
      id: subscriptionId,
      body: {
        status: 'paused'
      }
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Error pausando suscripción en MP:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reactiva una suscripción pausada
 */
const reactivateSubscription = async (subscriptionId) => {
  try {
    const response = await preApproval.update({
      id: subscriptionId,
      body: {
        status: 'authorized'
      }
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Error reactivando suscripción en MP:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtiene información de un pago
 */
const getPayment = async (paymentId) => {
  try {
    const response = await payment.get({ id: paymentId });
    return {
      success: true,
      data: {
        id: response.id,
        status: response.status,
        statusDetail: response.status_detail,
        amount: response.transaction_amount,
        currency: response.currency_id,
        paymentMethod: response.payment_method_id,
        paymentType: response.payment_type_id,
        externalReference: response.external_reference,
        dateCreated: response.date_created,
        dateApproved: response.date_approved,
      }
    };
  } catch (error) {
    console.error('Error obteniendo pago de MP:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verifica la firma del webhook de MercadoPago
 */
const verifyWebhookSignature = (xSignature, xRequestId, dataId) => {
  // MercadoPago envía x-signature en formato: ts=xxx,v1=xxx
  // Para verificar, necesitamos el secret del webhook
  const webhookSecret = process.env.MP_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('MP_WEBHOOK_SECRET no configurado, omitiendo verificación');
    return true; // En desarrollo, permitir sin verificar
  }

  try {
    const crypto = require('crypto');
    const parts = xSignature.split(',');
    const tsValue = parts.find(p => p.startsWith('ts='))?.split('=')[1];
    const v1Value = parts.find(p => p.startsWith('v1='))?.split('=')[1];

    // Crear el manifest para verificar
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${tsValue};`;
    
    // Calcular HMAC
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(manifest);
    const calculatedSignature = hmac.digest('hex');

    return calculatedSignature === v1Value;
  } catch (error) {
    console.error('Error verificando firma de webhook:', error);
    return false;
  }
};

/**
 * Mapea el status de MP a nuestro status interno
 */
const mapMPStatusToInternal = (mpStatus) => {
  const statusMap = {
    'pending': 'pending',
    'authorized': 'active',
    'paused': 'suspended',
    'cancelled': 'cancelled',
  };
  return statusMap[mpStatus] || 'pending';
};

/**
 * Mapea el status de pago de MP a nuestro status interno
 */
const mapMPPaymentStatusToInternal = (mpStatus) => {
  const statusMap = {
    'pending': 'pending',
    'approved': 'completed',
    'authorized': 'completed',
    'in_process': 'pending',
    'in_mediation': 'pending',
    'rejected': 'failed',
    'cancelled': 'cancelled',
    'refunded': 'refunded',
    'charged_back': 'refunded',
  };
  return statusMap[mpStatus] || 'pending';
};

module.exports = {
  createSubscriptionPlan,
  createSubscription,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  pauseSubscription,
  reactivateSubscription,
  getPayment,
  verifyWebhookSignature,
  mapMPStatusToInternal,
  mapMPPaymentStatusToInternal,
};
