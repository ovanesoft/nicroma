const { query, getClient } = require('../config/database');
const crypto = require('crypto');
const { sendInvitationEmail } = require('../utils/email');

// Crear nuevo tenant (solo root)
const createTenant = async (req, res) => {
  const client = await getClient();
  
  try {
    const { name, slug, domain } = req.body;
    const createdBy = req.user.id;

    await client.query('BEGIN');

    // Verificar que el slug no exista
    const existingTenant = await client.query(
      'SELECT id FROM tenants WHERE slug = $1',
      [slug.toLowerCase()]
    );

    if (existingTenant.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'El slug ya está en uso'
      });
    }

    // Crear tenant
    const result = await client.query(
      `INSERT INTO tenants (name, slug, domain, created_by, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, slug, domain, is_active, created_at`,
      [name, slug.toLowerCase(), domain, createdBy]
    );

    const tenant = result.rows[0];

    await client.query('COMMIT');

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tenant.id, createdBy, 'TENANT_CREATED', 'tenants', tenant.id,
        null, JSON.stringify({ name, slug }),
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.status(201).json({
      success: true,
      message: 'Organización creada exitosamente',
      data: { tenant }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creando tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear organización'
    });
  } finally {
    client.release();
  }
};

// Listar tenants (solo root)
const listTenants = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [limit, offset];

    if (search) {
      whereClause = `WHERE name ILIKE $3 OR slug ILIKE $3`;
      params.push(`%${search}%`);
    }

    const result = await query(
      `SELECT t.*, 
              (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
              u.email as created_by_email
       FROM tenants t
       LEFT JOIN users u ON t.created_by = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM tenants ${whereClause}`,
      search ? [`%${search}%`] : []
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        tenants: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error listando tenants:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar organizaciones'
    });
  }
};

// Obtener tenant por ID
const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Verificar acceso
    if (user.role !== 'root' && user.tenant_id !== id) {
      return res.status(403).json({
        success: false,
        message: 'No tiene acceso a esta organización'
      });
    }

    const result = await query(
      `SELECT t.*, 
              (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
              u.email as created_by_email
       FROM tenants t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Organización no encontrada'
      });
    }

    res.json({
      success: true,
      data: { tenant: result.rows[0] }
    });

  } catch (error) {
    console.error('Error obteniendo tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener organización'
    });
  }
};

// Actualizar tenant
const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, domain, settings, is_active } = req.body;
    const user = req.user;

    // Verificar acceso
    if (user.role !== 'root' && (user.tenant_id !== id || user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para modificar esta organización'
      });
    }

    // Solo root puede activar/desactivar
    if (is_active !== undefined && user.role !== 'root') {
      return res.status(403).json({
        success: false,
        message: 'Solo el administrador puede activar/desactivar organizaciones'
      });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (domain !== undefined) {
      updates.push(`domain = $${paramCount++}`);
      values.push(domain);
    }
    if (settings !== undefined) {
      updates.push(`settings = $${paramCount++}`);
      values.push(JSON.stringify(settings));
    }
    if (is_active !== undefined && user.role === 'root') {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    values.push(id);
    
    const result = await query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Organización no encontrada'
      });
    }

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id, user.id, 'TENANT_UPDATED', 'tenants', id,
        null, JSON.stringify(req.body),
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.json({
      success: true,
      message: 'Organización actualizada',
      data: { tenant: result.rows[0] }
    });

  } catch (error) {
    console.error('Error actualizando tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar organización'
    });
  }
};

// Invitar usuario al tenant
const inviteUser = async (req, res) => {
  const client = await getClient();
  
  try {
    const { email, role } = req.body;
    const user = req.user;
    const tenantId = req.params.id || user.tenant_id;

    // Verificar que el usuario pueda invitar
    if (user.role !== 'root' && user.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para invitar usuarios'
      });
    }

    // Solo admin y root pueden invitar admins
    if (role === 'admin' && user.role !== 'root' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para invitar administradores'
      });
    }

    await client.query('BEGIN');

    // Verificar que el tenant existe
    const tenantResult = await client.query(
      'SELECT id, name FROM tenants WHERE id = $1 AND is_active = true',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Organización no encontrada'
      });
    }

    const tenant = tenantResult.rows[0];

    // Verificar si el email ya está registrado en el tenant
    const existingUser = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 AND tenant_id = $2',
      [email.toLowerCase(), tenantId]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Este usuario ya pertenece a la organización'
      });
    }

    // Verificar si ya existe una invitación pendiente
    const existingInvite = await client.query(
      `SELECT id FROM user_invitations 
       WHERE LOWER(email) = $1 AND tenant_id = $2 AND status = 'pending' AND expires_at > NOW()`,
      [email.toLowerCase(), tenantId]
    );

    if (existingInvite.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Ya existe una invitación pendiente para este email'
      });
    }

    // Generar token de invitación
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // Crear invitación
    const inviteResult = await client.query(
      `INSERT INTO user_invitations (tenant_id, email, role, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, expires_at`,
      [tenantId, email.toLowerCase(), role, token, user.id, expiresAt]
    );

    await client.query('COMMIT');

    // Enviar email de invitación
    const inviterName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
    
    try {
      await sendInvitationEmail(email, inviterName, tenant.name, token, role);
    } catch (emailError) {
      console.error('Error enviando email de invitación:', emailError);
    }

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tenantId, user.id, 'USER_INVITED', 'user_invitations', inviteResult.rows[0].id,
        null, JSON.stringify({ email, role }),
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.status(201).json({
      success: true,
      message: 'Invitación enviada exitosamente',
      data: {
        invitation: {
          id: inviteResult.rows[0].id,
          email: inviteResult.rows[0].email,
          role: inviteResult.rows[0].role,
          expiresAt: inviteResult.rows[0].expires_at
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error invitando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar invitación'
    });
  } finally {
    client.release();
  }
};

// Aceptar invitación
const acceptInvitation = async (req, res) => {
  const client = await getClient();
  
  try {
    const { token, password, firstName, lastName } = req.body;

    await client.query('BEGIN');

    // Buscar invitación válida
    const inviteResult = await client.query(
      `SELECT i.*, t.name as tenant_name 
       FROM user_invitations i
       JOIN tenants t ON i.tenant_id = t.id
       WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW() AND t.is_active = true`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invitación inválida o expirada'
      });
    }

    const invitation = inviteResult.rows[0];

    // Verificar si el usuario ya existe
    const existingUser = await client.query(
      'SELECT id, tenant_id FROM users WHERE LOWER(email) = $1',
      [invitation.email]
    );

    let userId;

    if (existingUser.rows.length > 0) {
      // Usuario existe, actualizar su tenant
      const existingUserData = existingUser.rows[0];
      
      if (existingUserData.tenant_id) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Ya perteneces a una organización'
        });
      }

      await client.query(
        `UPDATE users SET tenant_id = $1, role = $2 WHERE id = $3`,
        [invitation.tenant_id, invitation.role, existingUserData.id]
      );

      userId = existingUserData.id;
    } else {
      // Crear nuevo usuario
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 12);

      const userResult = await client.query(
        `INSERT INTO users (
          email, password_hash, first_name, last_name,
          tenant_id, role, auth_provider, email_verified, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, 'local', true, true)
        RETURNING id`,
        [invitation.email, passwordHash, firstName, lastName, invitation.tenant_id, invitation.role]
      );

      userId = userResult.rows[0].id;
    }

    // Marcar invitación como aceptada
    await client.query(
      `UPDATE user_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [invitation.id]
    );

    await client.query('COMMIT');

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        invitation.tenant_id, userId, 'INVITATION_ACCEPTED', 'users', userId,
        null, JSON.stringify({ email: invitation.email }),
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.json({
      success: true,
      message: 'Invitación aceptada. Ya puedes iniciar sesión.',
      data: {
        tenantName: invitation.tenant_name
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error aceptando invitación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aceptar invitación'
    });
  } finally {
    client.release();
  }
};

// Listar invitaciones del tenant
const listInvitations = async (req, res) => {
  try {
    const user = req.user;
    const tenantId = req.params.id || user.tenant_id;

    // Verificar acceso
    if (user.role !== 'root' && user.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene acceso a esta organización'
      });
    }

    const result = await query(
      `SELECT i.*, u.email as invited_by_email,
              u.first_name as invited_by_first_name, u.last_name as invited_by_last_name
       FROM user_invitations i
       JOIN users u ON i.invited_by = u.id
       WHERE i.tenant_id = $1
       ORDER BY i.created_at DESC`,
      [tenantId]
    );

    res.json({
      success: true,
      data: { invitations: result.rows }
    });

  } catch (error) {
    console.error('Error listando invitaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar invitaciones'
    });
  }
};

// Cancelar invitación
const cancelInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const user = req.user;

    const result = await query(
      `UPDATE user_invitations 
       SET status = 'cancelled' 
       WHERE id = $1 AND status = 'pending'
       AND (
         tenant_id = $2 
         OR EXISTS (SELECT 1 FROM users WHERE id = $3 AND role = 'root')
       )
       RETURNING id, tenant_id`,
      [invitationId, user.tenant_id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invitación no encontrada o ya procesada'
      });
    }

    res.json({
      success: true,
      message: 'Invitación cancelada'
    });

  } catch (error) {
    console.error('Error cancelando invitación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar invitación'
    });
  }
};

// Listar usuarios del tenant
const listTenantUsers = async (req, res) => {
  try {
    const user = req.user;
    const tenantId = req.params.id || user.tenant_id;

    // Verificar acceso
    if (user.role !== 'root' && user.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene acceso a esta organización'
      });
    }

    const result = await query(
      `SELECT id, email, first_name, last_name, role, is_active,
              auth_provider, last_login, created_at
       FROM users
       WHERE tenant_id = $1
         AND role != 'client'
       ORDER BY created_at DESC`,
      [tenantId]
    );

    res.json({
      success: true,
      data: { users: result.rows }
    });

  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar usuarios'
    });
  }
};

// =====================================================
// CONFIGURACIÓN DE EMPRESA
// =====================================================

// Obtener configuración de la empresa (tenant actual)
const getCompanyConfig = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización asignada'
      });
    }

    const result = await query(
      `SELECT id, name, slug, domain, logo_url, settings,
              company_email, company_phone, company_address, company_city, company_country, company_website,
              portal_enabled, portal_slug, portal_welcome_message, portal_primary_color,
              plan, is_active, created_at
       FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Organización no encontrada'
      });
    }

    const tenant = result.rows[0];

    // Generar URL del portal si está habilitado
    const portalUrl = tenant.portal_enabled && tenant.portal_slug
      ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/${tenant.portal_slug}`
      : null;

    res.json({
      success: true,
      data: {
        company: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain,
          logoUrl: tenant.logo_url,
          settings: tenant.settings,
          email: tenant.company_email,
          phone: tenant.company_phone,
          address: tenant.company_address,
          city: tenant.company_city,
          country: tenant.company_country,
          website: tenant.company_website,
          plan: tenant.plan,
          createdAt: tenant.created_at
        },
        portal: {
          enabled: tenant.portal_enabled,
          slug: tenant.portal_slug,
          url: portalUrl,
          welcomeMessage: tenant.portal_welcome_message,
          primaryColor: tenant.portal_primary_color
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo config empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de empresa'
    });
  }
};

// Actualizar configuración de la empresa
const updateCompanyConfig = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      name, domain, 
      companyEmail, companyPhone, companyAddress, companyCity, companyCountry, companyWebsite,
      portalEnabled, portalSlug, portalWelcomeMessage, portalPrimaryColor
    } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización asignada'
      });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (domain !== undefined) {
      updates.push(`domain = $${paramCount++}`);
      values.push(domain?.trim() || null);
    }
    if (companyEmail !== undefined) {
      updates.push(`company_email = $${paramCount++}`);
      values.push(companyEmail?.trim() || null);
    }
    if (companyPhone !== undefined) {
      updates.push(`company_phone = $${paramCount++}`);
      values.push(companyPhone?.trim() || null);
    }
    if (companyAddress !== undefined) {
      updates.push(`company_address = $${paramCount++}`);
      values.push(companyAddress?.trim() || null);
    }
    if (companyCity !== undefined) {
      updates.push(`company_city = $${paramCount++}`);
      values.push(companyCity?.trim() || null);
    }
    if (companyCountry !== undefined) {
      updates.push(`company_country = $${paramCount++}`);
      values.push(companyCountry?.trim() || null);
    }
    if (companyWebsite !== undefined) {
      updates.push(`company_website = $${paramCount++}`);
      values.push(companyWebsite?.trim() || null);
    }
    if (portalEnabled !== undefined) {
      updates.push(`portal_enabled = $${paramCount++}`);
      values.push(portalEnabled);
    }
    if (portalSlug !== undefined) {
      // Verificar que el slug no esté en uso por otro tenant
      if (portalSlug) {
        const existingSlug = await query(
          'SELECT id FROM tenants WHERE portal_slug = $1 AND id != $2',
          [portalSlug.toLowerCase(), tenantId]
        );
        if (existingSlug.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Este slug de portal ya está en uso'
          });
        }
      }
      updates.push(`portal_slug = $${paramCount++}`);
      values.push(portalSlug?.toLowerCase().trim() || null);
    }
    if (portalWelcomeMessage !== undefined) {
      updates.push(`portal_welcome_message = $${paramCount++}`);
      values.push(portalWelcomeMessage?.trim() || null);
    }
    if (portalPrimaryColor !== undefined) {
      updates.push(`portal_primary_color = $${paramCount++}`);
      values.push(portalPrimaryColor || '#3b82f6');
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(tenantId);

    const result = await query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tenantId, req.user.id, 'COMPANY_CONFIG_UPDATED', 'tenants', tenantId,
        null, JSON.stringify(req.body),
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.json({
      success: true,
      message: 'Configuración actualizada',
      data: { tenant: result.rows[0] }
    });

  } catch (error) {
    console.error('Error actualizando config empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración'
    });
  }
};

// Subir logo de la empresa
const uploadCompanyLogo = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { logo } = req.body; // Base64 string

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización asignada'
      });
    }

    if (!logo) {
      return res.status(400).json({
        success: false,
        message: 'Logo es requerido'
      });
    }

    // Validar que sea una imagen válida en base64
    const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/;
    if (!base64Regex.test(logo)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de imagen inválido. Use PNG, JPG, GIF, WebP o SVG.'
      });
    }

    // Limitar tamaño (aprox 2MB en base64)
    if (logo.length > 2 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'El logo no puede superar los 2MB'
      });
    }

    const result = await query(
      'UPDATE tenants SET logo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, logo_url',
      [logo, tenantId]
    );

    // Log de auditoría
    await query(
      `SELECT log_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tenantId, req.user.id, 'COMPANY_LOGO_UPDATED', 'tenants', tenantId,
        null, null,
        req.ip, req.headers['user-agent']
      ]
    ).catch(err => console.error('Error en auditoría:', err));

    res.json({
      success: true,
      message: 'Logo actualizado',
      data: { logoUrl: result.rows[0].logo_url }
    });

  } catch (error) {
    console.error('Error subiendo logo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir logo'
    });
  }
};

// Eliminar logo de la empresa
const deleteCompanyLogo = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización asignada'
      });
    }

    await query(
      'UPDATE tenants SET logo_url = NULL, updated_at = NOW() WHERE id = $1',
      [tenantId]
    );

    res.json({
      success: true,
      message: 'Logo eliminado'
    });

  } catch (error) {
    console.error('Error eliminando logo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar logo'
    });
  }
};

// Generar/regenerar slug del portal
const generatePortalSlug = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario sin organización asignada'
      });
    }

    // Obtener nombre del tenant para generar slug
    const tenantResult = await query(
      'SELECT name, slug FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Organización no encontrada'
      });
    }

    // Generar slug base desde el nombre
    let baseSlug = tenantResult.rows[0].slug || 
      tenantResult.rows[0].name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    // Verificar unicidad y agregar sufijo si es necesario
    let portalSlug = baseSlug;
    let counter = 1;
    
    while (true) {
      const existing = await query(
        'SELECT id FROM tenants WHERE portal_slug = $1 AND id != $2',
        [portalSlug, tenantId]
      );
      
      if (existing.rows.length === 0) break;
      
      portalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Actualizar
    await query(
      'UPDATE tenants SET portal_slug = $1, portal_enabled = true, updated_at = NOW() WHERE id = $2',
      [portalSlug, tenantId]
    );

    const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/${portalSlug}`;

    res.json({
      success: true,
      message: 'Portal habilitado',
      data: {
        portalSlug,
        portalUrl
      }
    });

  } catch (error) {
    console.error('Error generando slug portal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar link del portal'
    });
  }
};

// =====================================================
// PORTAL PÚBLICO (sin autenticación)
// =====================================================

// Obtener información pública del tenant para el portal
const getPortalInfo = async (req, res) => {
  try {
    const { portalSlug } = req.params;

    const result = await query(
      `SELECT id, name, slug, logo_url, 
              company_email, company_phone, company_address, company_city, company_country, company_website,
              portal_welcome_message, portal_primary_color
       FROM tenants 
       WHERE portal_slug = $1 AND portal_enabled = true AND is_active = true`,
      [portalSlug.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Portal no encontrado'
      });
    }

    const tenant = result.rows[0];

    res.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        logoUrl: tenant.logo_url,
        email: tenant.company_email,
        phone: tenant.company_phone,
        address: tenant.company_address,
        city: tenant.company_city,
        country: tenant.company_country,
        website: tenant.company_website,
        welcomeMessage: tenant.portal_welcome_message,
        primaryColor: tenant.portal_primary_color
      }
    });

  } catch (error) {
    console.error('Error obteniendo info portal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información del portal'
    });
  }
};

module.exports = {
  createTenant,
  listTenants,
  getTenantById,
  updateTenant,
  inviteUser,
  acceptInvitation,
  listInvitations,
  cancelInvitation,
  listTenantUsers,
  // Configuración de empresa
  getCompanyConfig,
  updateCompanyConfig,
  uploadCompanyLogo,
  deleteCompanyLogo,
  generatePortalSlug,
  getPortalInfo
};

