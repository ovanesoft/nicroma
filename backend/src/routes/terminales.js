const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const terminalesController = require('../controllers/terminalesController');

// Buscar terminales (puertos/aeropuertos)
router.get('/buscar', authenticate, terminalesController.buscarTerminales);

// Obtener terminal por código
router.get('/:codigo', authenticate, terminalesController.obtenerTerminal);

module.exports = router;
