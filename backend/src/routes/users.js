const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { authenticateToken, requireRole, requireTenantAdmin } = require('../middleware/auth');
const { 
  updateProfileValidation, 
  registerValidation,
  uuidValidation,
  paginationValidation 
} = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ===========================================
// Rutas del usuario actual
// ===========================================

// Obtener perfil propio
router.get('/profile', userController.getProfile);

// Actualizar perfil propio
router.put('/profile',
  updateProfileValidation,
  userController.updateProfile
);

// Cambiar contraseña
router.post('/change-password', userController.changePassword);

// ===========================================
// Rutas de administración de usuarios
// ===========================================

// Listar todos los usuarios (solo root)
router.get('/',
  requireRole('root'),
  paginationValidation,
  userController.listAllUsers
);

// Crear usuario (admin o root)
router.post('/',
  requireTenantAdmin,
  registerValidation,
  userController.createUser
);

// Obtener usuario por ID
router.get('/:id',
  uuidValidation('id'),
  userController.getUserById
);

// Actualizar usuario
router.put('/:id',
  requireTenantAdmin,
  uuidValidation('id'),
  userController.updateUser
);

// Activar/Desactivar usuario
router.patch('/:id/toggle-active',
  requireRole('root'),
  uuidValidation('id'),
  userController.toggleUserActive
);

// Bloquear/Desbloquear usuario
router.patch('/:id/toggle-lock',
  requireRole('root'),
  uuidValidation('id'),
  userController.toggleUserLock
);

// Cambiar rol de usuario
router.patch('/:id/role',
  requireRole('root'),
  uuidValidation('id'),
  userController.changeUserRole
);

// Desactivar usuario
router.delete('/:id',
  requireRole('root'),
  uuidValidation('id'),
  userController.deleteUser
);

module.exports = router;

