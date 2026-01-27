const express = require('express');
const router = express.Router();

const tenantController = require('../controllers/tenantController');
const { authenticateToken, requireRole, requireTenantAdmin } = require('../middleware/auth');
const { 
  createTenantValidation, 
  inviteUserValidation, 
  uuidValidation,
  paginationValidation 
} = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ===========================================
// Rutas de tenants (solo root)
// ===========================================

// Crear tenant
router.post('/',
  requireRole('root'),
  createTenantValidation,
  tenantController.createTenant
);

// Listar todos los tenants
router.get('/',
  requireRole('root'),
  paginationValidation,
  tenantController.listTenants
);

// Obtener tenant por ID
router.get('/:id',
  uuidValidation('id'),
  tenantController.getTenantById
);

// Actualizar tenant
router.put('/:id',
  requireRole('root'),
  uuidValidation('id'),
  tenantController.updateTenant
);

// Activar/Pausar tenant
router.patch('/:id/toggle-active',
  requireRole('root'),
  uuidValidation('id'),
  tenantController.toggleTenantActive
);

// Eliminar tenant
router.delete('/:id',
  requireRole('root'),
  uuidValidation('id'),
  tenantController.deleteTenant
);

// ===========================================
// Rutas de usuarios del tenant
// ===========================================

// Listar usuarios del tenant
router.get('/:id/users',
  uuidValidation('id'),
  tenantController.listTenantUsers
);

// ===========================================
// Rutas de invitaciones
// ===========================================

// Invitar usuario al tenant
router.post('/:id/invite',
  requireTenantAdmin,
  uuidValidation('id'),
  inviteUserValidation,
  tenantController.inviteUser
);

// Invitar usuario al tenant actual del usuario
router.post('/invite',
  requireTenantAdmin,
  inviteUserValidation,
  tenantController.inviteUser
);

// Listar invitaciones del tenant
router.get('/:id/invitations',
  uuidValidation('id'),
  tenantController.listInvitations
);

// Cancelar invitación
router.delete('/invitations/:invitationId',
  uuidValidation('invitationId'),
  tenantController.cancelInvitation
);

// ===========================================
// Rutas de configuración de empresa
// ===========================================

// Obtener configuración de la empresa actual
router.get('/my/company',
  tenantController.getCompanyConfig
);

// Actualizar configuración de la empresa
router.put('/my/company',
  requireRole('admin', 'root'),
  tenantController.updateCompanyConfig
);

// Subir logo de la empresa
router.post('/my/company/logo',
  requireRole('admin', 'root'),
  tenantController.uploadCompanyLogo
);

// Eliminar logo de la empresa
router.delete('/my/company/logo',
  requireRole('admin', 'root'),
  tenantController.deleteCompanyLogo
);

// Generar/habilitar link del portal de clientes
router.post('/my/company/portal',
  requireRole('admin', 'root'),
  tenantController.generatePortalSlug
);

module.exports = router;

