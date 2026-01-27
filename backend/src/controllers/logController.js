const { query } = require('../config/database');

// Obtener logs del sistema (solo root)
const getSystemLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      tenantId, 
      userId,
      startDate,
      endDate,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = [];
    let paramIndex = 1;

    // Filtros
    if (action) {
      whereConditions.push(`al.action = $${paramIndex}`);
      params.push(action);
      paramIndex++;
    }

    if (tenantId) {
      whereConditions.push(`al.tenant_id = $${paramIndex}`);
      params.push(tenantId);
      paramIndex++;
    }

    if (userId) {
      whereConditions.push(`al.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`al.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`al.created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        al.action ILIKE $${paramIndex} OR 
        al.entity_type ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR
        u.first_name ILIKE $${paramIndex} OR
        t.name ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Query principal
    const logsQuery = `
      SELECT 
        al.id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.created_at,
        al.tenant_id,
        al.user_id,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN tenants t ON al.tenant_id = t.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);

    // Query de conteo
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN tenants t ON al.tenant_id = t.id
      ${whereClause}
    `;

    const [logsResult, countResult] = await Promise.all([
      query(logsQuery, params),
      query(countQuery, params.slice(0, -2)) // Sin limit y offset
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        logs: logsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener logs del sistema'
    });
  }
};

// Obtener acciones únicas para filtros
const getLogActions = async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT action, COUNT(*) as count
      FROM audit_logs
      GROUP BY action
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo acciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener acciones'
    });
  }
};

// Estadísticas de logs
const getLogStats = async (req, res) => {
  try {
    const [
      totalResult,
      todayResult,
      actionsResult,
      recentErrorsResult
    ] = await Promise.all([
      // Total de logs
      query('SELECT COUNT(*) as total FROM audit_logs'),
      
      // Logs de hoy
      query(`
        SELECT COUNT(*) as total 
        FROM audit_logs 
        WHERE created_at >= CURRENT_DATE
      `),
      
      // Top 5 acciones
      query(`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        GROUP BY action
        ORDER BY count DESC
        LIMIT 5
      `),
      
      // Errores recientes (si hay acciones de error)
      query(`
        SELECT COUNT(*) as total
        FROM audit_logs
        WHERE action ILIKE '%error%' OR action ILIKE '%fail%'
        AND created_at >= NOW() - INTERVAL '24 hours'
      `)
    ]);

    res.json({
      success: true,
      data: {
        totalLogs: parseInt(totalResult.rows[0].total),
        todayLogs: parseInt(todayResult.rows[0].total),
        topActions: actionsResult.rows,
        recentErrors: parseInt(recentErrorsResult.rows[0].total)
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

// Logs en tiempo real (últimos N)
const getRealtimeLogs = async (req, res) => {
  try {
    const { limit = 20, since } = req.query;
    
    let whereClause = '';
    const params = [parseInt(limit)];
    
    if (since) {
      whereClause = 'WHERE al.created_at > $2';
      params.push(since);
    }

    const result = await query(`
      SELECT 
        al.id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.ip_address,
        al.created_at,
        u.email as user_email,
        u.first_name as user_first_name,
        t.name as tenant_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN tenants t ON al.tenant_id = t.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $1
    `, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo logs realtime:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener logs en tiempo real'
    });
  }
};

module.exports = {
  getSystemLogs,
  getLogActions,
  getLogStats,
  getRealtimeLogs
};
