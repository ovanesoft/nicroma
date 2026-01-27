/**
 * Rutas para integraciones con navieras
 */

const express = require('express');
const router = express.Router();
const integrationsController = require('../controllers/integrationsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ==================== CARRIERS ====================
// Lista proveedores soportados
router.get('/carriers', integrationsController.listCarriers);

// ==================== INTEGRATIONS ====================
// Lista integraciones del tenant
router.get('/', integrationsController.listIntegrations);

// Detalle de una integración
router.get('/:provider', integrationsController.getIntegration);

// Crear/actualizar integración (solo admin)
router.post('/:provider', 
  requireRole('admin', 'root'),
  integrationsController.saveIntegration
);

// Probar conexión
router.post('/:provider/test',
  requireRole('admin', 'root'),
  integrationsController.testConnection
);

// Eliminar integración (solo admin)
router.delete('/:provider',
  requireRole('admin', 'root'),
  integrationsController.deleteIntegration
);

// ==================== TRACKING ====================
// Tracking directo (sin guardar)
router.post('/track',
  requireRole('admin', 'manager'),
  integrationsController.track
);

// Obtener schedules
router.post('/schedules',
  requireRole('admin', 'manager'),
  integrationsController.getSchedules
);

// ==================== SUBSCRIPTIONS ====================
// Crear suscripción de tracking
router.post('/subscriptions',
  requireRole('admin', 'manager'),
  integrationsController.createSubscription
);

// Listar suscripciones
router.get('/subscriptions',
  requireRole('admin', 'manager'),
  integrationsController.listSubscriptions
);

// Detalle de suscripción
router.get('/subscriptions/:id',
  requireRole('admin', 'manager'),
  integrationsController.getSubscription
);

// Actualizar tracking de suscripción
router.post('/subscriptions/:id/refresh',
  requireRole('admin', 'manager'),
  integrationsController.refreshSubscription
);

// Eliminar suscripción
router.delete('/subscriptions/:id',
  requireRole('admin', 'manager'),
  integrationsController.deleteSubscription
);

module.exports = router;
