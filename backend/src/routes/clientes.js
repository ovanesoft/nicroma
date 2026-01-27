const express = require('express');
const router = express.Router();
const { authenticateToken, requireTenant } = require('../middleware/auth');
const clienteController = require('../controllers/clienteController');

// Todas las rutas requieren autenticación y pertenecer a un tenant
router.use(authenticateToken);
router.use(requireTenant);

// CRUD de clientes
router.get('/', clienteController.listarClientes);
router.get('/buscar', clienteController.buscarClientes);
router.get('/:id', clienteController.obtenerCliente);
router.post('/', clienteController.crearCliente);
router.put('/:id', clienteController.actualizarCliente);
router.delete('/:id', clienteController.desactivarCliente);

// Portal de clientes
router.post('/:id/invitar-portal', clienteController.invitarAlPortal);
router.post('/:id/vincular-usuario', clienteController.vincularUsuario);
router.delete('/:id/desvincular-usuario', clienteController.desvincularUsuario);

module.exports = router;
