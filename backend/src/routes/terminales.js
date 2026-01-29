const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const terminalesController = require('../controllers/terminalesController');

// Buscar terminales (puertos/aeropuertos)
router.get('/buscar', authenticateToken, terminalesController.buscarTerminales);

// Obtener terminal por código
router.get('/:codigo', authenticateToken, terminalesController.obtenerTerminal);

module.exports = router;
