const express = require('express');
const router = express.Router();
const { authenticateToken, requireTenant, requireRole } = require('../middleware/auth');
const comprobanteController = require('../controllers/comprobanteController');

router.use(authenticateToken);
router.use(requireTenant);

router.get('/panel', comprobanteController.panelComprobantes);
router.get('/', comprobanteController.listarComprobantes);
router.post('/', requireRole('admin', 'manager'), comprobanteController.crearComprobante);
router.get('/:id/pdf', comprobanteController.descargarPDF);
router.delete('/:id', requireRole('admin'), comprobanteController.eliminarComprobante);

module.exports = router;
