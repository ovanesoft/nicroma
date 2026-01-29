const prisma = require('../services/prisma');

// Tipos de proveedor disponibles
const TIPOS_PROVEEDOR = [
  'Naviera',
  'Aerolínea',
  'Transportista',
  'Agente',
  'Despachante',
  'Terminal',
  'Depósito',
  'Aseguradora',
  'Freight Forwarder',
  'Otros'
];

// Listar proveedores
const listarProveedores = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { 
      page = 1, 
      limit = 20, 
      search,
      tipoProveedor,
      activo
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { tenantId };
    
    if (search) {
      where.OR = [
        { razonSocial: { contains: search, mode: 'insensitive' } },
        { nombreFantasia: { contains: search, mode: 'insensitive' } },
        { numeroDocumento: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (tipoProveedor) where.tipoProveedor = tipoProveedor;
    if (activo !== undefined) where.activo = activo === 'true';

    const [proveedores, total] = await Promise.all([
      prisma.proveedor.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { razonSocial: 'asc' }
      }),
      prisma.proveedor.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        proveedores,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error listando proveedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar proveedores'
    });
  }
};

// Obtener proveedor por ID
const obtenerProveedor = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const proveedor = await prisma.proveedor.findFirst({
      where: { id, tenantId }
    });

    if (!proveedor) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    res.json({
      success: true,
      data: { proveedor }
    });
  } catch (error) {
    console.error('Error obteniendo proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener proveedor'
    });
  }
};

// Crear proveedor
const crearProveedor = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const {
      razonSocial,
      nombreFantasia,
      tipoDocumento,
      numeroDocumento,
      condicionFiscal,
      tipoProveedor,
      email,
      telefono,
      whatsapp,
      website,
      direccion,
      ciudad,
      provincia,
      pais,
      codigoPostal,
      contactoNombre,
      contactoEmail,
      contactoTelefono,
      contactoCargo,
      bancoNombre,
      bancoCuenta,
      bancoCbu,
      bancoAlias,
      servicios,
      notas
    } = req.body;

    // Validaciones
    if (!razonSocial || !tipoDocumento || !numeroDocumento || !tipoProveedor) {
      return res.status(400).json({
        success: false,
        message: 'Razón social, tipo documento, número de documento y tipo de proveedor son requeridos'
      });
    }

    // Verificar que no exista ya
    const existente = await prisma.proveedor.findFirst({
      where: {
        tenantId,
        numeroDocumento
      }
    });

    if (existente) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un proveedor con ese número de documento'
      });
    }

    const proveedor = await prisma.proveedor.create({
      data: {
        tenantId,
        razonSocial,
        nombreFantasia,
        tipoDocumento,
        numeroDocumento,
        condicionFiscal,
        tipoProveedor,
        email,
        telefono,
        whatsapp,
        website,
        direccion,
        ciudad,
        provincia,
        pais: pais || 'Argentina',
        codigoPostal,
        contactoNombre,
        contactoEmail,
        contactoTelefono,
        contactoCargo,
        bancoNombre,
        bancoCuenta,
        bancoCbu,
        bancoAlias,
        servicios,
        notas,
        createdBy: userId
      }
    });

    res.status(201).json({
      success: true,
      data: { proveedor },
      message: 'Proveedor creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear proveedor'
    });
  }
};

// Actualizar proveedor
const actualizarProveedor = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const updateData = req.body;

    // Verificar que existe
    const existente = await prisma.proveedor.findFirst({
      where: { id, tenantId }
    });

    if (!existente) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    // Si cambia el número de documento, verificar que no exista otro
    if (updateData.numeroDocumento && updateData.numeroDocumento !== existente.numeroDocumento) {
      const duplicado = await prisma.proveedor.findFirst({
        where: {
          tenantId,
          numeroDocumento: updateData.numeroDocumento,
          id: { not: id }
        }
      });

      if (duplicado) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe otro proveedor con ese número de documento'
        });
      }
    }

    const proveedor = await prisma.proveedor.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: { proveedor },
      message: 'Proveedor actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar proveedor'
    });
  }
};

// Eliminar proveedor (soft delete)
const eliminarProveedor = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const existente = await prisma.proveedor.findFirst({
      where: { id, tenantId }
    });

    if (!existente) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    await prisma.proveedor.update({
      where: { id },
      data: { activo: false }
    });

    res.json({
      success: true,
      message: 'Proveedor eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar proveedor'
    });
  }
};

// Buscar proveedores (para autocompletado)
const buscarProveedores = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { q, tipo } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { proveedores: [] }
      });
    }

    const where = {
      tenantId,
      activo: true,
      OR: [
        { razonSocial: { contains: q, mode: 'insensitive' } },
        { nombreFantasia: { contains: q, mode: 'insensitive' } },
        { numeroDocumento: { contains: q, mode: 'insensitive' } }
      ]
    };

    if (tipo) {
      where.tipoProveedor = tipo;
    }

    const proveedores = await prisma.proveedor.findMany({
      where,
      take: 10,
      orderBy: { razonSocial: 'asc' },
      select: {
        id: true,
        razonSocial: true,
        nombreFantasia: true,
        numeroDocumento: true,
        tipoProveedor: true,
        email: true,
        telefono: true
      }
    });

    res.json({
      success: true,
      data: { proveedores }
    });
  } catch (error) {
    console.error('Error buscando proveedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar proveedores'
    });
  }
};

// Obtener tipos de proveedor
const obtenerTiposProveedor = async (req, res) => {
  res.json({
    success: true,
    data: { tipos: TIPOS_PROVEEDOR }
  });
};

module.exports = {
  listarProveedores,
  obtenerProveedor,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  buscarProveedores,
  obtenerTiposProveedor
};
