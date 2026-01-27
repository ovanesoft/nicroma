const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

// Actualizar perfil del usuario actual
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(firstName.trim());
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(lastName.trim());
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    values.push(userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING id, email, first_name, last_name, phone, avatar_url, role`,
      values
    );

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.user.tenant_id, userId, 'PROFILE_UPDATED', 'users', userId,
        null, JSON.stringify(req.body),
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.json({
      success: true,
      message: 'Perfil actualizado',
      data: {
        user: {
          id: result.rows[0].id,
          email: result.rows[0].email,
          firstName: result.rows[0].first_name,
          lastName: result.rows[0].last_name,
          phone: result.rows[0].phone,
          avatarUrl: result.rows[0].avatar_url,
          role: result.rows[0].role
        }
      }
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil'
    });
  }
};

// Obtener usuario por ID (admin)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Verificar permisos
    if (user.role !== 'root' && user.id !== id) {
      // Solo puede ver usuarios de su tenant si es admin
      if (user.role === 'admin' || user.role === 'manager') {
        const targetUser = await query(
          'SELECT tenant_id FROM users WHERE id = $1',
          [id]
        );
        
        if (targetUser.rows.length === 0 || targetUser.rows[0].tenant_id !== user.tenant_id) {
          return res.status(403).json({
            success: false,
            message: 'No tiene permisos para ver este usuario'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para ver este usuario'
        });
      }
    }

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.role, u.tenant_id, u.auth_provider, u.email_verified,
              u.is_active, u.last_login, u.created_at,
              t.name as tenant_name, t.slug as tenant_slug
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const userData = result.rows[0];

    res.json({
      success: true,
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          phone: userData.phone,
          avatarUrl: userData.avatar_url,
          role: userData.role,
          tenantId: userData.tenant_id,
          tenantName: userData.tenant_name,
          authProvider: userData.auth_provider,
          emailVerified: userData.email_verified,
          isActive: userData.is_active,
          lastLogin: userData.last_login,
          createdAt: userData.created_at
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario'
    });
  }
};

// Actualizar usuario (admin)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { firstName, lastName, phone, role, isActive } = req.body;

    // Verificar permisos
    if (user.role !== 'root') {
      const targetUser = await query(
        'SELECT tenant_id, role FROM users WHERE id = $1',
        [id]
      );
      
      if (targetUser.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const target = targetUser.rows[0];

      if (target.tenant_id !== user.tenant_id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para modificar este usuario'
        });
      }

      // Solo admin puede modificar usuarios
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos de administrador'
        });
      }

      // No puede modificar a usuarios con rol superior o igual
      const roleHierarchy = { root: 4, admin: 3, manager: 2, user: 1 };
      if (roleHierarchy[target.role] >= roleHierarchy[user.role]) {
        return res.status(403).json({
          success: false,
          message: 'No puede modificar usuarios con rol igual o superior'
        });
      }

      // No puede asignar rol superior al propio
      if (role && roleHierarchy[role] >= roleHierarchy[user.role]) {
        return res.status(403).json({
          success: false,
          message: 'No puede asignar un rol igual o superior al propio'
        });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(firstName.trim());
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(lastName.trim());
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone.trim());
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING id, email, first_name, last_name, phone, role, is_active`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        user.tenant_id, user.id, 'USER_UPDATED', 'users', id,
        null, JSON.stringify(req.body),
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.json({
      success: true,
      message: 'Usuario actualizado',
      data: { user: result.rows[0] }
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario'
    });
  }
};

// Crear usuario (admin)
const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const adminUser = req.user;

    // Verificar permisos
    const roleHierarchy = { root: 4, admin: 3, manager: 2, user: 1 };
    
    if (adminUser.role !== 'root' && adminUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para crear usuarios'
      });
    }

    // No puede crear usuarios con rol superior o igual (excepto root)
    if (adminUser.role !== 'root' && roleHierarchy[role] >= roleHierarchy[adminUser.role]) {
      return res.status(403).json({
        success: false,
        message: 'No puede crear usuarios con rol igual o superior al propio'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verificar si el email ya existe
    const existingUser = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Este email ya está registrado'
      });
    }

    // Hash de contraseña
    const passwordHash = await bcrypt.hash(password, 12);

    // Determinar tenant_id
    const tenantId = adminUser.role === 'root' ? req.body.tenantId : adminUser.tenant_id;

    // Validar que hay tenant_id (excepto para root creando usuarios sin tenant)
    if (!tenantId && adminUser.role !== 'root') {
      return res.status(400).json({
        success: false,
        message: 'Tu cuenta no está vinculada a una organización. Contactá al administrador.'
      });
    }

    const result = await query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name,
        tenant_id, role, auth_provider, email_verified, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, 'local', true, true)
      RETURNING id, email, first_name, last_name, role`,
      [normalizedEmail, passwordHash, firstName, lastName, tenantId, role]
    );

    const newUser = result.rows[0];

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tenantId, adminUser.id, 'USER_CREATED', 'users', newUser.id,
        null, JSON.stringify({ email: normalizedEmail, role }),
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role
        }
      }
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario'
    });
  }
};

// Desactivar usuario (admin)
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // No puede desactivarse a sí mismo
    if (id === user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puede desactivar su propia cuenta'
      });
    }

    // Verificar permisos
    if (user.role !== 'root') {
      const targetUser = await query(
        'SELECT tenant_id, role FROM users WHERE id = $1',
        [id]
      );
      
      if (targetUser.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const target = targetUser.rows[0];

      if (target.tenant_id !== user.tenant_id || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para desactivar este usuario'
        });
      }

      // No puede desactivar usuarios con rol superior o igual
      const roleHierarchy = { root: 4, admin: 3, manager: 2, user: 1 };
      if (roleHierarchy[target.role] >= roleHierarchy[user.role]) {
        return res.status(403).json({
          success: false,
          message: 'No puede desactivar usuarios con rol igual o superior'
        });
      }
    }

    const result = await query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Revocar todos los tokens del usuario
    await query(
      'UPDATE refresh_tokens SET is_revoked = true, revoked_at = NOW() WHERE user_id = $1',
      [id]
    );

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        user.tenant_id, user.id, 'USER_DEACTIVATED', 'users', id,
        null, null, req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.json({
      success: true,
      message: 'Usuario desactivado'
    });

  } catch (error) {
    console.error('Error desactivando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar usuario'
    });
  }
};

// Listar todos los usuarios (root only)
const listAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tenantId, role } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    const params = [limit, offset];
    let paramCount = 3;

    if (search) {
      whereConditions.push(`(email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (tenantId) {
      whereConditions.push(`tenant_id = $${paramCount}`);
      params.push(tenantId);
      paramCount++;
    }

    if (role) {
      whereConditions.push(`role = $${paramCount}`);
      params.push(role);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active,
              u.auth_provider, u.last_login, u.created_at,
              t.name as tenant_name, t.slug as tenant_slug
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const countParams = params.slice(2);
    const countResult = await query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      countParams
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar usuarios'
    });
  }
};

// Cambiar contraseña del usuario actual
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva son requeridas'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 8 caracteres'
      });
    }

    // Obtener contraseña actual
    const userResult = await query(
      'SELECT password_hash, auth_provider FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = userResult.rows[0];

    // Verificar que no sea usuario de OAuth sin contraseña
    if (user.auth_provider !== 'local' && !user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'Tu cuenta usa inicio de sesión con ' + user.auth_provider + '. No puedes cambiar la contraseña aquí.'
      });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'La contraseña actual es incorrecta'
      });
    }

    // Hash de nueva contraseña
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Revocar todos los refresh tokens (cerrar otras sesiones)
    await query(
      `UPDATE refresh_tokens SET is_revoked = true, revoked_at = NOW() 
       WHERE user_id = $1 AND is_revoked = false`,
      [userId]
    );

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.user.tenant_id, userId, 'PASSWORD_CHANGED', 'users', userId,
        null, null,
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña'
    });
  }
};

// Obtener perfil del usuario actual
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.role, u.tenant_id, u.auth_provider, u.email_verified,
              u.is_active, u.last_login, u.created_at,
              t.name as tenant_name, t.slug as tenant_slug
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const userData = result.rows[0];

    res.json({
      success: true,
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          phone: userData.phone,
          avatarUrl: userData.avatar_url,
          role: userData.role,
          tenantId: userData.tenant_id,
          tenantName: userData.tenant_name,
          authProvider: userData.auth_provider,
          emailVerified: userData.email_verified,
          isActive: userData.is_active,
          lastLogin: userData.last_login,
          createdAt: userData.created_at
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil'
    });
  }
};

// Activar/Desactivar usuario (root only)
const toggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `UPDATE users 
       SET is_active = NOT is_active, updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, email, first_name, last_name, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = result.rows[0];

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        null, req.user.id, 
        user.is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 
        'users', id,
        JSON.stringify({ is_active: !user.is_active }),
        JSON.stringify({ is_active: user.is_active }),
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.json({
      success: true,
      message: user.is_active ? 'Usuario activado' : 'Usuario desactivado',
      data: { user }
    });

  } catch (error) {
    console.error('Error toggling user active:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado del usuario'
    });
  }
};

// Bloquear/Desbloquear usuario (root only)
const toggleUserLock = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `UPDATE users 
       SET is_locked = NOT COALESCE(is_locked, false), 
           locked_until = CASE WHEN NOT COALESCE(is_locked, false) THEN NOW() + INTERVAL '100 years' ELSE NULL END,
           updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, email, first_name, last_name, is_locked`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = result.rows[0];

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        null, req.user.id, 
        user.is_locked ? 'USER_LOCKED' : 'USER_UNLOCKED', 
        'users', id,
        JSON.stringify({ is_locked: !user.is_locked }),
        JSON.stringify({ is_locked: user.is_locked }),
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.json({
      success: true,
      message: user.is_locked ? 'Usuario bloqueado' : 'Usuario desbloqueado',
      data: { user }
    });

  } catch (error) {
    console.error('Error toggling user lock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar bloqueo del usuario'
    });
  }
};

// Cambiar rol de usuario (root only)
const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['root', 'admin', 'manager', 'user', 'client'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido'
      });
    }

    // Obtener rol anterior
    const current = await query('SELECT role FROM users WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    const oldRole = current.rows[0].role;

    const result = await query(
      `UPDATE users 
       SET role = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, email, first_name, last_name, role`,
      [role, id]
    );

    const user = result.rows[0];

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        null, req.user.id, 'USER_ROLE_CHANGED', 'users', id,
        JSON.stringify({ role: oldRole }),
        JSON.stringify({ role: user.role }),
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.json({
      success: true,
      message: 'Rol actualizado',
      data: { user }
    });

  } catch (error) {
    console.error('Error changing user role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar rol del usuario'
    });
  }
};

// Eliminar usuario (root only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir eliminar el propio usuario
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No podés eliminar tu propia cuenta'
      });
    }

    // Obtener datos del usuario antes de eliminar
    const userResult = await query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = userResult.rows[0];

    // Eliminar usuario
    await query('DELETE FROM users WHERE id = $1', [id]);

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        null, req.user.id, 'USER_DELETED', 'users', id,
        JSON.stringify({ email: user.email, name: `${user.first_name} ${user.last_name}` }),
        null,
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.json({
      success: true,
      message: 'Usuario eliminado'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario'
    });
  }
};

module.exports = {
  updateProfile,
  changePassword,
  getProfile,
  getUserById,
  updateUser,
  createUser,
  deactivateUser,
  listAllUsers,
  toggleUserActive,
  toggleUserLock,
  changeUserRole,
  deleteUser
};

