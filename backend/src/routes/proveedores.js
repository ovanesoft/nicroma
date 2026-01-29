const express = require('express');
const router = express.Router();

const proveedorController = require('../controllers/proveedorController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener tipos de proveedor
router.get('/tipos', proveedorController.obtenerTiposProveedor);

// Buscar proveedores (autocompletado)
router.get('/buscar', proveedorController.buscarProveedores);

// Listar proveedores
router.get('/', proveedorController.listarProveedores);

// Obtener proveedor por ID
router.get('/:id', proveedorController.obtenerProveedor);

// Crear proveedor
router.post('/',
  requireRole('admin', 'manager', 'user'),
  proveedorController.crearProveedor
);

// Actualizar proveedor
router.put('/:id',
  requireRole('admin', 'manager', 'user'),
  proveedorController.actualizarProveedor
);

// Eliminar proveedor
router.delete('/:id',
  requireRole('admin', 'manager'),
  proveedorController.eliminarProveedor
);

module.exports = router;
