/**
 * Rutas de Billing
 * /api/billing
 */

const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// =====================================================
// RUTAS PÚBLICAS (sin autenticación)
// =====================================================

// Planes - cualquiera puede verlos
router.get('/plans', billingController.getPlans);
router.get('/plans/:slug', billingController.getPlanBySlug);

// Webhook de MercadoPago (sin auth, pero con verificación de firma)
router.post('/webhooks/mercadopago', billingController.handleMercadoPagoWebhook);

// =====================================================
// RUTAS AUTENTICADAS (requieren login)
// =====================================================

// Suscripción del tenant actual
router.get('/subscription', authenticateToken, billingController.getSubscription);
router.post('/subscription/checkout', authenticateToken, billingController.createCheckout);
router.post('/subscription/upgrade', authenticateToken, billingController.upgradePlan);
router.post('/subscription/downgrade', authenticateToken, billingController.downgradePlan);
router.post('/subscription/cancel', authenticateToken, billingController.cancelSubscription);
router.post('/subscription/reactivate', authenticateToken, billingController.reactivateSubscription);

// Trial
router.post('/trial/extend', authenticateToken, billingController.extendTrial);

// Oferta de acompañamiento
router.post('/accompaniment/activate', authenticateToken, billingController.activateAccompaniment);

// Promociones
router.post('/promotions/validate', authenticateToken, billingController.validatePromotion);

// Historial de pagos
router.get('/payments', authenticateToken, billingController.getPayments);

// =====================================================
// RUTAS ADMIN (solo root)
// =====================================================

// Gestión de suscripciones
router.get('/admin/subscriptions', authenticateToken, requireRole('root'), billingController.adminListSubscriptions);
router.get('/admin/subscriptions/:tenantId', authenticateToken, requireRole('root'), billingController.adminGetSubscription);
router.put('/admin/subscriptions/:tenantId', authenticateToken, requireRole('root'), billingController.adminUpdateSubscription);
router.post('/admin/subscriptions/:tenantId/suspend', authenticateToken, requireRole('root'), billingController.adminSuspendSubscription);
router.post('/admin/subscriptions/:tenantId/reactivate', authenticateToken, requireRole('root'), billingController.adminReactivateSubscription);

// Alertas
router.get('/admin/alerts', authenticateToken, requireRole('root'), billingController.adminGetAlerts);

// Promociones
router.get('/admin/promotions', authenticateToken, requireRole('root'), billingController.adminListPromotions);
router.post('/admin/promotions', authenticateToken, requireRole('root'), billingController.adminCreatePromotion);
router.put('/admin/promotions/:id', authenticateToken, requireRole('root'), billingController.adminUpdatePromotion);
router.delete('/admin/promotions/:id', authenticateToken, requireRole('root'), billingController.adminDeletePromotion);

// Estadísticas
router.get('/admin/stats', authenticateToken, requireRole('root'), billingController.adminGetStats);

module.exports = router;
