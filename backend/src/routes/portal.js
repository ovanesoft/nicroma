/**
 * Rutas del Portal de Clientes
 * 
 * Todas las rutas requieren autenticación y rol 'client'
 */

const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Middleware: todas las rutas requieren autenticación con rol client
router.use(authenticateToken);
router.use(requireRole('client', 'admin', 'manager', 'user'));

// Dashboard
router.get('/dashboard', portalController.getDashboard);

// Envíos
router.get('/envios', portalController.getEnvios);
router.get('/envios/:id', portalController.getEnvio);

// Facturas
router.get('/facturas', portalController.getFacturas);
router.get('/facturas/:id', portalController.getFactura);

// Prefacturas
router.get('/prefacturas', portalController.getPrefacturas);

// Mi Cuenta
router.get('/mi-cuenta', portalController.getMiCuenta);

// Información de medios de pago
router.get('/payment-info', portalController.getPaymentInfo);

module.exports = router;
