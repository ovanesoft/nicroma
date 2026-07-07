const express = require('express');
const router = express.Router();
const { authenticateToken, requireTenant } = require('../middleware/auth');
const facturaController = require('../controllers/facturaController');

router.use(authenticateToken);
router.use(requireTenant);

router.get('/', facturaController.listarFacturas);
router.get('/:id', facturaController.obtenerFactura);
router.post('/', facturaController.crearFactura);
router.post('/desde-prefactura', facturaController.crearDesdePrefactura);
router.post('/:id/anular', facturaController.anularFactura);
router.post('/:id/cobranza', facturaController.registrarCobranza);
router.get('/:id/pdf', facturaController.generarPDF);

module.exports = router;
