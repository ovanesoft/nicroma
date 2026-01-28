const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const presupuestoController = require('../controllers/presupuestoController');

// Rutas públicas/portal (con autenticación opcional)
router.post('/solicitar/:portalSlug', optionalAuth, presupuestoController.solicitarPresupuesto);

// Rutas para clientes autenticados
router.get('/mis-presupuestos', authenticateToken, presupuestoController.listarPresupuestosCliente);

// Rutas protegidas para tenant
router.use(authenticateToken);

// Notificaciones (para todos los usuarios autenticados)
router.get('/notificaciones', presupuestoController.obtenerNotificaciones);

// CRUD de presupuestos
router.get('/', requireRole('admin', 'manager', 'user'), presupuestoController.listarPresupuestos);
router.get('/:id', presupuestoController.obtenerPresupuesto);
router.post('/', requireRole('admin', 'manager'), presupuestoController.crearPresupuesto);
router.put('/:id', requireRole('admin', 'manager'), presupuestoController.actualizarPresupuesto);

// Acciones especiales
router.post('/:id/estado', presupuestoController.cambiarEstado);
router.post('/:id/convertir', requireRole('admin', 'manager'), presupuestoController.convertirACarpeta);

// Mensajes/Chat
router.get('/:id/mensajes', presupuestoController.obtenerMensajes);
router.post('/:id/mensajes', presupuestoController.agregarMensaje);
router.post('/:id/mensajes/leidos', presupuestoController.marcarMensajesLeidos);

module.exports = router;
