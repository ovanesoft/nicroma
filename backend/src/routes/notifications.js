const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para usuarios autenticados
router.get('/my', notificationController.getMyNotifications);
router.post('/:id/read', notificationController.markAsRead);
router.post('/read-all', notificationController.markAllAsRead);

// Rutas solo para root
router.get('/', requireRole('root'), notificationController.listAllNotifications);
router.post('/', requireRole('root'), notificationController.createNotification);
router.delete('/:id', requireRole('root'), notificationController.deactivateNotification);

module.exports = router;
