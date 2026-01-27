const express = require('express');
const router = express.Router();
const { authenticateToken, requireTenant } = require('../middleware/auth');
const carpetaController = require('../controllers/carpetaController');

// Todas las rutas requieren autenticación y pertenecer a un tenant
router.use(authenticateToken);
router.use(requireTenant);

// CRUD de carpetas
router.get('/', carpetaController.listarCarpetas);
router.get('/siguiente-numero', carpetaController.siguienteNumero);
router.get('/:id', carpetaController.obtenerCarpeta);
router.post('/', carpetaController.crearCarpeta);
router.put('/:id', carpetaController.actualizarCarpeta);
router.delete('/:id', carpetaController.eliminarCarpeta);
router.post('/:id/duplicar', carpetaController.duplicarCarpeta);

module.exports = router;
