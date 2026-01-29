const prisma = require('../services/prisma');
const { generarAvisoArribo } = require('../services/pdf/avisoArribo');

// Generar número de carpeta
const generarNumeroCarpeta = async (tenantId, area, sector) => {
  const year = new Date().getFullYear();
  const areaCode = area.substring(0, 2).toUpperCase(); // MA, AE, TE
  const sectorCode = sector === 'Importación' ? 'I' : 'E';
  
  // Buscar el último número del año
  const ultimaCarpeta = await prisma.carpeta.findFirst({
    where: {
      tenantId,
      numero: {
        startsWith: `${year}-${areaCode}${sectorCode}-`
      }
    },
    orderBy: {
      numero: 'desc'
    }
  });

  let secuencia = 1;
  if (ultimaCarpeta) {
    const parts = ultimaCarpeta.numero.split('-');
    secuencia = parseInt(parts[2]) + 1;
  }

  return `${year}-${areaCode}${sectorCode}-${secuencia.toString().padStart(6, '0')}`;
};

// Listar carpetas
const listarCarpetas = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { 
      page = 1, 
      limit = 20, 
      search, 
      estado, 
      area, 
      sector,
      clienteId,
      fechaDesde,
      fechaHasta,
      orderBy = 'fechaEmision',
      orderDir = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Construir filtros
    const where = { tenantId };
    
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { booking: { contains: search, mode: 'insensitive' } },
        { referenciaCliente: { contains: search, mode: 'insensitive' } },
        { masterBL: { contains: search, mode: 'insensitive' } },
        { houseBL: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (estado) where.estado = estado;
    if (area) where.area = area;
    if (sector) where.sector = sector;
    if (clienteId) where.clienteId = clienteId;
    
    if (fechaDesde || fechaHasta) {
      where.fechaEmision = {};
      if (fechaDesde) where.fechaEmision.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaEmision.lte = new Date(fechaHasta);
    }

    // Ejecutar consultas en paralelo
    const [carpetas, total] = await Promise.all([
      prisma.carpeta.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [orderBy]: orderDir },
        include: {
          cliente: {
            select: {
              id: true,
              razonSocial: true,
              numeroDocumento: true
            }
          },
          _count: {
            select: {
              contenedores: true,
              gastos: true
            }
          }
        }
      }),
      prisma.carpeta.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        carpetas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error listando carpetas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar carpetas'
    });
  }
};

// Obtener carpeta por ID
const obtenerCarpeta = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const carpeta = await prisma.carpeta.findFirst({
      where: { id, tenantId },
      include: {
        cliente: true,
        consignee: true,
        shipper: true,
        mercancias: true,
        contenedores: true,
        gastos: {
          orderBy: { createdAt: 'asc' }
        },
        tarifasContenedor: true,
        prefacturas: {
          select: {
            id: true,
            numero: true,
            fecha: true,
            total: true,
            estado: true
          }
        },
        facturas: {
          select: {
            id: true,
            numeroCompleto: true,
            fecha: true,
            total: true,
            estado: true
          }
        },
        // Incluir presupuesto asociado con sus mensajes
        presupuesto: {
          include: {
            mensajes: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    });

    if (!carpeta) {
      return res.status(404).json({
        success: false,
        message: 'Carpeta no encontrada'
      });
    }

    res.json({
      success: true,
      data: { carpeta }
    });
  } catch (error) {
    console.error('Error obteniendo carpeta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener carpeta'
    });
  }
};

// Crear carpeta
const crearCarpeta = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const usuarioId = req.user.id;
    const data = req.body;

    // Generar número de carpeta
    const numero = await generarNumeroCarpeta(tenantId, data.area, data.sector);

    // Crear carpeta con relaciones
    const carpeta = await prisma.carpeta.create({
      data: {
        tenantId,
        usuarioId,
        numero,
        estado: data.estado || 'HOUSE',
        area: data.area,
        sector: data.sector,
        tipoOperacion: data.tipoOperacion,
        categoriaEmbarque: data.categoriaEmbarque,
        consolidado: data.consolidado || false,
        
        // Fechas
        fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : new Date(),
        fechaSalidaEstimada: data.etd ? new Date(data.etd) : null,
        fechaSalidaConfirmada: data.atd ? new Date(data.atd) : null,
        fechaLlegadaEstimada: data.eta ? new Date(data.eta) : null,
        fechaLlegadaConfirmada: data.ata ? new Date(data.ata) : null,
        fechaCarga: data.fechaCarga ? new Date(data.fechaCarga) : null,
        fechaDescarga: data.fechaDescarga ? new Date(data.fechaDescarga) : null,
        
        // Lugares
        puertoOrigen: data.puertoOrigen,
        lugarCarga: data.lugarCarga,
        puertoDestino: data.puertoDestino,
        lugarDescarga: data.lugarDescarga,
        puertoTransbordo: data.puertoTransbordo,
        
        // Partes
        clienteId: data.clienteId,
        consigneeId: data.consigneeId,
        shipperId: data.shipperId,
        transportista: data.transportista,
        notify: data.notify,
        agente: data.agente,
        agente2: data.agente2,
        agenteAduanal: data.agenteAduanal,
        empresaFacturacion: data.empresaFacturacion,
        clienteFinal: data.clienteFinal,
        trader: data.trader,
        
        // Referencias
        referenciaInterna: data.referenciaInterna,
        referenciaExterna: data.referenciaExterna,
        referenciaCliente: data.referenciaCliente,
        booking: data.booking,
        documentador: data.documentador,
        mane: data.mane,
        
        // Transporte
        buque: data.buque,
        viaje: data.viaje,
        terminalPortuaria: data.terminalPortuaria,
        depositoFiscal: data.depositoFiscal,
        
        // Operativo
        frecuencia: data.frecuencia,
        transito: data.transito,
        incoterm: data.incoterm,
        ciudadInc: data.ciudadInc,
        
        // Cut-off
        cutOffDoc: data.cutOffDoc ? new Date(data.cutOffDoc) : null,
        cutOffFisico: data.cutOffFisico ? new Date(data.cutOffFisico) : null,
        cutOffIMO: data.cutOffIMO ? new Date(data.cutOffIMO) : null,
        cutOffVGM: data.cutOffVGM ? new Date(data.cutOffVGM) : null,
        
        // Financiero
        moneda: data.moneda || 'USD',
        prepaidCollect: data.prepaidCollect || 'Prepaid',
        
        // BL
        masterBL: data.masterBL,
        houseBL: data.houseBL,
        
        // Observaciones
        observaciones: data.observaciones,
        notasInternas: data.notasInternas,
        
        // Banco para PDF
        bancoPdfId: data.bancoPdfId || null,
        
        // Crear mercancías si se enviaron
        mercancias: data.mercancias ? {
          create: data.mercancias.map(m => ({
            descripcion: m.descripcion,
            embalaje: m.embalaje,
            marcas: m.marcas,
            bultos: m.bultos,
            volumen: m.volumen,
            peso: m.peso,
            valorMercaderia: m.valorMercaderia,
            valorCIF: m.valorCIF,
            hsCode: m.hsCode
          }))
        } : undefined,
        
        // Crear contenedores si se enviaron
        contenedores: data.contenedores ? {
          create: data.contenedores.map(c => ({
            tipo: c.tipo,
            numero: c.numero,
            condicion: c.condicion,
            precinto: c.precinto,
            cantidad: c.cantidad || 1,
            tara: c.tara,
            pesoMaximo: c.pesoMaximo
          }))
        } : undefined,
        
        // Crear gastos si se enviaron
        gastos: data.gastos ? {
          create: data.gastos.map(g => ({
            concepto: g.concepto,
            prepaidCollect: g.prepaidCollect || 'Prepaid',
            divisa: g.divisa || 'USD',
            montoVenta: g.montoVenta,
            montoCosto: g.montoCosto,
            base: g.base,
            cantidad: g.cantidad || 1,
            totalVenta: (g.montoVenta || 0) * (g.cantidad || 1),
            totalCosto: (g.montoCosto || 0) * (g.cantidad || 1),
            gravado: g.gravado !== false,
            porcentajeIVA: g.porcentajeIVA || 21
          }))
        } : undefined
      },
      include: {
        cliente: true,
        mercancias: true,
        contenedores: true,
        gastos: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Carpeta creada exitosamente',
      data: { carpeta }
    });
  } catch (error) {
    console.error('Error creando carpeta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear carpeta',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Actualizar carpeta
const actualizarCarpeta = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const data = req.body;

    // Verificar que la carpeta exista
    const existing = await prisma.carpeta.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Carpeta no encontrada'
      });
    }

    // No permitir cambiar número ni tenant
    delete data.numero;
    delete data.tenantId;

    // Extraer relaciones antes de procesarlas
    const { mercancias, contenedores, gastos, ...restData } = data;

    // Preparar datos para actualizar
    const updateData = {
      ...restData,
      // Convertir fechas
      fechaEmision: restData.fechaEmision ? new Date(restData.fechaEmision) : undefined,
      fechaSalidaEstimada: restData.etd ? new Date(restData.etd) : undefined,
      fechaSalidaConfirmada: restData.atd ? new Date(restData.atd) : undefined,
      fechaLlegadaEstimada: restData.eta ? new Date(restData.eta) : undefined,
      fechaLlegadaConfirmada: restData.ata ? new Date(restData.ata) : undefined,
      fechaCarga: restData.fechaCarga ? new Date(restData.fechaCarga) : undefined,
      fechaDescarga: restData.fechaDescarga ? new Date(restData.fechaDescarga) : undefined,
      cutOffDoc: restData.cutOffDoc ? new Date(restData.cutOffDoc) : undefined,
      cutOffFisico: restData.cutOffFisico ? new Date(restData.cutOffFisico) : undefined,
      cutOffIMO: restData.cutOffIMO ? new Date(restData.cutOffIMO) : undefined,
      cutOffVGM: restData.cutOffVGM ? new Date(restData.cutOffVGM) : undefined
    };

    // Eliminar campos undefined y los que no son del modelo Carpeta
    const fieldsToRemove = ['etd', 'atd', 'eta', 'ata', 'cliente', 'id'];
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || fieldsToRemove.includes(key)) {
        delete updateData[key];
      }
    });

    // Usar transacción para actualizar todo
    const carpeta = await prisma.$transaction(async (tx) => {
      // 1. Actualizar datos principales de la carpeta
      await tx.carpeta.update({
        where: { id },
        data: updateData
      });

      // 2. Actualizar mercancías (eliminar existentes y crear nuevas)
      if (mercancias !== undefined) {
        await tx.mercancia.deleteMany({ where: { carpetaId: id } });
        
        if (mercancias && mercancias.length > 0) {
          await tx.mercancia.createMany({
            data: mercancias.filter(m => m.descripcion).map(m => ({
              carpetaId: id,
              descripcion: m.descripcion,
              embalaje: m.embalaje || null,
              marcas: m.marcas || null,
              bultos: parseInt(m.bultos) || 0,
              volumen: parseFloat(m.volumen) || 0,
              peso: parseFloat(m.peso) || 0,
              valorMercaderia: m.valorMercaderia ? parseFloat(m.valorMercaderia) : null,
              valorCIF: m.valorCIF ? parseFloat(m.valorCIF) : null,
              hsCode: m.hsCode || null,
              contenedorId: m.contenedorId || null
            }))
          });
        }
      }

      // 3. Actualizar contenedores (eliminar existentes y crear nuevos)
      if (contenedores !== undefined) {
        // Primero desvincular mercancías de contenedores que se eliminarán
        await tx.mercancia.updateMany({
          where: { carpetaId: id, contenedorId: { not: null } },
          data: { contenedorId: null }
        });
        
        await tx.contenedor.deleteMany({ where: { carpetaId: id } });
        
        if (contenedores && contenedores.length > 0) {
          for (const c of contenedores.filter(c => c.tipo)) {
            await tx.contenedor.create({
              data: {
                carpetaId: id,
                tipo: c.tipo,
                numero: c.numero || null,
                condicion: c.condicion || null,
                precinto: c.precinto || null,
                cantidad: parseInt(c.cantidad) || 1,
                tara: c.tara ? parseFloat(c.tara) : null,
                pesoMaximo: c.pesoMaximo ? parseFloat(c.pesoMaximo) : null
              }
            });
          }
        }
      }

      // 4. Actualizar gastos (eliminar existentes y crear nuevos)
      if (gastos !== undefined) {
        await tx.gasto.deleteMany({ where: { carpetaId: id } });
        
        if (gastos && gastos.length > 0) {
          await tx.gasto.createMany({
            data: gastos.filter(g => g.concepto).map(g => ({
              carpetaId: id,
              concepto: g.concepto,
              prepaidCollect: g.prepaidCollect || 'Prepaid',
              divisa: g.divisa || 'USD',
              montoVenta: parseFloat(g.montoVenta) || 0,
              montoCosto: parseFloat(g.montoCosto) || 0,
              base: g.base || null,
              cantidad: parseFloat(g.cantidad) || 1,
              totalVenta: (parseFloat(g.montoVenta) || 0) * (parseFloat(g.cantidad) || 1),
              totalCosto: (parseFloat(g.montoCosto) || 0) * (parseFloat(g.cantidad) || 1),
              gravado: g.gravado !== false,
              porcentajeIVA: parseFloat(g.porcentajeIVA) || 21
            }))
          });
        }
      }

      // 5. Retornar carpeta actualizada con relaciones
      return tx.carpeta.findFirst({
        where: { id },
        include: {
          cliente: true,
          mercancias: {
            include: { contenedor: true }
          },
          contenedores: {
            include: { mercancias: true }
          },
          gastos: { orderBy: { createdAt: 'asc' } }
        }
      });
    });

    res.json({
      success: true,
      message: 'Carpeta actualizada',
      data: { carpeta }
    });
  } catch (error) {
    console.error('Error actualizando carpeta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar carpeta',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Eliminar carpeta (soft delete - cambiar estado a CANCELADA)
const eliminarCarpeta = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const carpeta = await prisma.carpeta.findFirst({
      where: { id, tenantId }
    });

    if (!carpeta) {
      return res.status(404).json({
        success: false,
        message: 'Carpeta no encontrada'
      });
    }

    // Soft delete - cambiar estado
    await prisma.carpeta.update({
      where: { id },
      data: { estado: 'CANCELADA' }
    });

    res.json({
      success: true,
      message: 'Carpeta cancelada'
    });
  } catch (error) {
    console.error('Error eliminando carpeta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar carpeta'
    });
  }
};

// Obtener siguiente número de carpeta
const siguienteNumero = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { area = 'Marítimo', sector = 'Importación' } = req.query;
    
    const numero = await generarNumeroCarpeta(tenantId, area, sector);
    
    res.json({
      success: true,
      data: { numero }
    });
  } catch (error) {
    console.error('Error generando número:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar número'
    });
  }
};

// Duplicar carpeta
const duplicarCarpeta = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const usuarioId = req.user.id;

    // Obtener carpeta original con relaciones
    const original = await prisma.carpeta.findFirst({
      where: { id, tenantId },
      include: {
        mercancias: true,
        contenedores: true,
        gastos: true,
        tarifasContenedor: true
      }
    });

    if (!original) {
      return res.status(404).json({
        success: false,
        message: 'Carpeta no encontrada'
      });
    }

    // Generar nuevo número
    const numero = await generarNumeroCarpeta(tenantId, original.area, original.sector);

    // Crear copia
    const { id: _, createdAt, updatedAt, numero: __, ...carpetaData } = original;
    
    const nueva = await prisma.carpeta.create({
      data: {
        ...carpetaData,
        numero,
        usuarioId,
        estado: 'HOUSE',
        fechaEmision: new Date(),
        // Duplicar relaciones
        mercancias: {
          create: original.mercancias.map(({ id, carpetaId, createdAt, updatedAt, ...m }) => m)
        },
        contenedores: {
          create: original.contenedores.map(({ id, carpetaId, createdAt, updatedAt, ...c }) => c)
        },
        gastos: {
          create: original.gastos.map(({ id, carpetaId, createdAt, updatedAt, ...g }) => g)
        },
        tarifasContenedor: {
          create: original.tarifasContenedor.map(({ id, carpetaId, createdAt, updatedAt, ...t }) => t)
        }
      },
      include: {
        cliente: true,
        mercancias: true,
        contenedores: true,
        gastos: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Carpeta duplicada',
      data: { carpeta: nueva }
    });
  } catch (error) {
    console.error('Error duplicando carpeta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al duplicar carpeta'
    });
  }
};

// Generar PDF de Aviso de Arribo
const generarPDFAvisoArribo = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    // Obtener carpeta con todas las relaciones necesarias
    const carpeta = await prisma.carpeta.findFirst({
      where: { id, tenantId },
      include: {
        cliente: true,
        shipper: true,
        consignee: true,
        mercancias: true,
        contenedores: true,
        gastos: true
      }
    });

    if (!carpeta) {
      return res.status(404).json({
        success: false,
        message: 'Carpeta no encontrada'
      });
    }

    // Obtener datos del tenant para incluir datos bancarios
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        cuentasBancarias: true,
        companyAddress: true,
        companyPhone: true,
        companyEmail: true
      }
    });

    // Obtener banco seleccionado o el principal
    let bancoSeleccionado = null;
    const cuentasBancarias = tenant?.cuentasBancarias || [];
    if (cuentasBancarias.length > 0) {
      if (carpeta.bancoPdfId) {
        bancoSeleccionado = cuentasBancarias.find(c => c.id === carpeta.bancoPdfId);
      }
      // Si no hay seleccionado o no se encontró, usar el principal
      if (!bancoSeleccionado) {
        bancoSeleccionado = cuentasBancarias.find(c => c.esPrincipal) || cuentasBancarias[0];
      }
    }

    // Generar el PDF
    const doc = generarAvisoArribo(carpeta, tenant, bancoSeleccionado);

    // Configurar headers para descarga
    const filename = `Aviso_Arribo_${carpeta.houseBL || carpeta.numero}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Enviar el PDF como stream
    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error('Error generando PDF de aviso de arribo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el PDF'
    });
  }
};

module.exports = {
  listarCarpetas,
  obtenerCarpeta,
  crearCarpeta,
  actualizarCarpeta,
  eliminarCarpeta,
  siguienteNumero,
  duplicarCarpeta,
  generarPDFAvisoArribo
};
