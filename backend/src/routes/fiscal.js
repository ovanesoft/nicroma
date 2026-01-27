/**
 * Rutas para facturación electrónica
 */

const express = require('express');
const router = express.Router();
const fiscalController = require('../controllers/fiscalController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ==================== CONFIGURACIÓN ====================

// Obtener configuración fiscal
router.get('/config', fiscalController.getConfig);

// Guardar configuración fiscal (solo admin)
router.post('/config',
  requireRole('admin', 'root'),
  fiscalController.saveConfig
);

// Validar certificado digital
router.post('/validate-certificate',
  requireRole('admin', 'root'),
  fiscalController.validateCertificate
);

// Probar conexión con AFIP
router.post('/test-connection',
  requireRole('admin', 'root'),
  fiscalController.testConnection
);

// Estado de servidores AFIP
router.get('/server-status', fiscalController.getServerStatus);

// ==================== PUNTOS DE VENTA ====================

// Listar puntos de venta
router.get('/puntos-venta', fiscalController.getPuntosVenta);

// Sincronizar desde AFIP
router.post('/puntos-venta/sync',
  requireRole('admin', 'root'),
  fiscalController.syncPuntosVenta
);

// Crear/actualizar punto de venta
router.post('/puntos-venta',
  requireRole('admin', 'root'),
  fiscalController.savePuntoVenta
);

// ==================== DATOS DE REFERENCIA ====================

// Tipos de comprobante
router.get('/tipos-comprobante', fiscalController.getTiposComprobante);

// Tipos de documento
router.get('/tipos-documento', fiscalController.getTiposDocumento);

// Alícuotas IVA
router.get('/alicuotas-iva', fiscalController.getAlicuotasIVA);

// Último comprobante autorizado
router.get('/ultimo-autorizado', fiscalController.getUltimoAutorizado);

// ==================== EMISIÓN ====================

// Emitir comprobante fiscal
router.post('/emitir',
  requireRole('admin', 'manager'),
  fiscalController.emitirComprobante
);

// Emitir desde factura existente
router.post('/emitir-desde-factura/:facturaId',
  requireRole('admin', 'manager'),
  fiscalController.emitirDesdeFactura
);

// ==================== CONSULTAS ====================

// Listar comprobantes emitidos
router.get('/comprobantes', fiscalController.getComprobantes);

// Detalle de comprobante
router.get('/comprobantes/:id', fiscalController.getComprobante);

// Consultar comprobante en AFIP
router.post('/consultar', fiscalController.consultarComprobante);

module.exports = router;
