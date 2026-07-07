const express = require('express');
const router = express.Router();
const { authenticateToken, requireTenant, requireRole } = require('../middleware/auth');
const tipoCambioController = require('../controllers/tipoCambioController');

router.use(authenticateToken);
router.use(requireTenant);

router.get('/ultimos', tipoCambioController.obtenerUltimos);
router.get('/historico', tipoCambioController.obtenerHistorico);
router.post('/', requireRole('admin', 'manager'), tipoCambioController.cargarTiposCambio);
router.delete('/:id', requireRole('admin', 'manager'), tipoCambioController.eliminarTipoCambio);

module.exports = router;
