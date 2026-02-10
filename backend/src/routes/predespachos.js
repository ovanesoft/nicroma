const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const predespachoController = require('../controllers/predespachoController');

// Rutas públicas/portal (con autenticación opcional)
router.post('/solicitar/:portalSlug', optionalAuth, predespachoController.solicitarPredespacho);

// Rutas para clientes autenticados
router.get('/mis-predespachos', authenticateToken, predespachoController.listarPredespachosCliente);

// Rutas protegidas para tenant
router.use(authenticateToken);

// CRUD de predespachos
router.get('/', requireRole('admin', 'manager', 'user'), predespachoController.listarPredespachos);
router.get('/:id', predespachoController.obtenerPredespacho);
router.post('/', requireRole('admin', 'manager'), predespachoController.crearPredespacho);
router.put('/:id', requireRole('admin', 'manager'), predespachoController.actualizarPredespacho);

// Acciones especiales
router.post('/:id/estado', predespachoController.cambiarEstado);

// Mensajes/Chat
router.get('/:id/mensajes', predespachoController.obtenerMensajes);
router.post('/:id/mensajes', predespachoController.agregarMensaje);
router.post('/:id/mensajes/leidos', predespachoController.marcarMensajesLeidos);

// Marcar como visto (clientes)
router.post('/:id/visto', predespachoController.marcarPredespachoVisto);

// PDF
router.get('/:id/pdf', requireRole('admin', 'manager', 'user'), predespachoController.generarPDF);

module.exports = router;
