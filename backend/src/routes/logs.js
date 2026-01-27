const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const logController = require('../controllers/logController');

// Todas las rutas requieren autenticación y rol root
router.use(authenticateToken);
router.use(requireRole(['root']));

// GET /api/logs - Obtener todos los logs con paginación y filtros
router.get('/', logController.getSystemLogs);

// GET /api/logs/actions - Obtener acciones únicas para filtros
router.get('/actions', logController.getLogActions);

// GET /api/logs/stats - Estadísticas de logs
router.get('/stats', logController.getLogStats);

// GET /api/logs/realtime - Logs en tiempo real
router.get('/realtime', logController.getRealtimeLogs);

module.exports = router;
