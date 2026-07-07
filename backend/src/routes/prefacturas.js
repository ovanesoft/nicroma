const express = require('express');
const router = express.Router();
const { authenticateToken, requireTenant } = require('../middleware/auth');
const prefacturaController = require('../controllers/prefacturaController');

router.use(authenticateToken);
router.use(requireTenant);

router.get('/', prefacturaController.listarPrefacturas);
router.get('/:id', prefacturaController.obtenerPrefactura);
router.post('/', prefacturaController.crearPrefactura);
router.post('/desde-carpeta', prefacturaController.crearDesdeCarpeta);
router.put('/:id', prefacturaController.actualizarPrefactura);
router.post('/:id/confirmar', prefacturaController.confirmarPrefactura);
router.post('/:id/cancelar', prefacturaController.cancelarPrefactura);
router.post('/:id/tipos-cambio', prefacturaController.actualizarTiposCambio);
router.get('/:id/pdf', prefacturaController.generarPDF);

module.exports = router;
