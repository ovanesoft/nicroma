const prisma = require('../services/prisma');
const { generarAvisoArribo } = require('../services/pdf/avisoArribo');
const { generarBillOfLading } = require('../services/pdf/billOfLading');
const { generarAirWaybill } = require('../services/pdf/airWaybill');
const { generarCertificacionFlete } = require('../services/pdf/certificacionFlete');
const { generarCertificacionGastos } = require('../services/pdf/certificacionGastos');
const { loadLogoBuffer } = require('../services/pdf/pdfHelpers');
const { generarNumeroCarpetaCfg } = require('../utils/numbering');
// Mismo cálculo que usa el presupuesto: garantiza idempotencia al convertir
// presupuesto → carpeta y respeta la base (cant. contenedores, kilos, etc.).
const { calcularTotalesItem } = require('../utils/itemCalc');

// Usa la configuración del tenant (formato y siguiente número manual)
const generarNumeroCarpeta = (tenantId, area, sector) => generarNumeroCarpetaCfg(tenantId, area, sector);

// Parsear fecha evitando el corrimiento de día por timezone:
// "2026-07-06" se interpretaría como medianoche UTC (día anterior en Argentina).
// Se fija mediodía UTC para que siempre caiga en el día correcto.
const parseFecha = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value + 'T12:00:00.000Z');
  }
  return new Date(value);
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
        estado: data.estado || 'ABIERTA',
        area: data.area,
        sector: data.sector,
        tipoOperacion: data.tipoOperacion,
        tipoOperacionAerea: data.tipoOperacionAerea || null,
        categoriaEmbarque: data.categoriaEmbarque,
        consolidado: data.consolidado || false,
        
        // Fechas
        fechaEmision: data.fechaEmision ? parseFecha(data.fechaEmision) : new Date(),
        fechaSalidaEstimada: parseFecha(data.etd),
        fechaSalidaConfirmada: parseFecha(data.atd),
        fechaLlegadaEstimada: parseFecha(data.eta),
        fechaLlegadaConfirmada: parseFecha(data.ata),
        fechaCarga: parseFecha(data.fechaCarga),
        fechaDescarga: parseFecha(data.fechaDescarga),
        
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
        consigneeData: data.consigneeData || {},
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
          create: data.gastos.map(g => {
            // Preservar la categoría IVA elegida por el usuario.
            // Si no vino explícita, derivar del booleano `gravado` para retro-compat.
            const categoriaIVA = g.categoriaIVA
              || (g.gravado === false ? 'NO_GRAVADO' : 'GRAVADO');
            const esGravado = categoriaIVA === 'GRAVADO';
            // Recalcular siempre con la fórmula compartida para que coincida
            // con lo que muestra el frontend y con el presupuesto origen.
            const { totalVenta, totalCosto } = calcularTotalesItem(
              g, data.mercancias || [], data.contenedores || []
            );
            return {
              concepto: g.concepto,
              prepaidCollect: g.prepaidCollect || 'Prepaid',
              divisa: g.divisa || 'USD',
              montoVenta: g.montoVenta,
              montoCosto: g.montoCosto,
              base: g.base,
              cantidad: g.cantidad || 1,
              totalVenta,
              totalCosto,
              categoriaIVA,
              gravado: esGravado,
              porcentajeIVA: esGravado ? (parseFloat(g.porcentajeIVA) || 21) : 0,
              proveedorId: g.proveedorId || null,
              proveedorNombre: g.proveedorNombre || null
            };
          })
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
      // Convertir fechas (parseFecha evita corrimiento de día por timezone)
      fechaEmision: restData.fechaEmision ? parseFecha(restData.fechaEmision) : undefined,
      fechaSalidaEstimada: restData.etd ? parseFecha(restData.etd) : undefined,
      fechaSalidaConfirmada: restData.atd ? parseFecha(restData.atd) : undefined,
      fechaLlegadaEstimada: restData.eta ? parseFecha(restData.eta) : undefined,
      fechaLlegadaConfirmada: restData.ata ? parseFecha(restData.ata) : undefined,
      fechaCarga: restData.fechaCarga ? parseFecha(restData.fechaCarga) : undefined,
      fechaDescarga: restData.fechaDescarga ? parseFecha(restData.fechaDescarga) : undefined,
      cutOffDoc: restData.cutOffDoc ? parseFecha(restData.cutOffDoc) : undefined,
      cutOffFisico: restData.cutOffFisico ? parseFecha(restData.cutOffFisico) : undefined,
      cutOffIMO: restData.cutOffIMO ? parseFecha(restData.cutOffIMO) : undefined,
      cutOffVGM: restData.cutOffVGM ? parseFecha(restData.cutOffVGM) : undefined
    };

    // Eliminar campos undefined y los que no son del modelo Carpeta
    const fieldsToRemove = ['etd', 'atd', 'eta', 'ata', 'cliente', 'id'];
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || fieldsToRemove.includes(key)) {
        delete updateData[key];
      }
    });

    // ⚠️ PROTECCIÓN ANTI-PÉRDIDA DE DATOS
    // Cuando el frontend manda un array vacío para mercancías/contenedores/gastos puede ser:
    //   a) auto-save disparado antes de que el form termine de cargar los datos del backend
    //   b) edición legítima donde el usuario borró todo
    // Para evitar (a) miramos cuántas relaciones existen ya en la carpeta. Si el frontend
    // está mandando MENOS items que los que hay en DB sin items válidos, asumimos que es
    // auto-save prematuro y NO tocamos esas relaciones. Sólo borramos cuando el array
    // viene con al menos un item válido (es decir, hubo un cambio real con datos).
    const [mercanciasExistentes, contenedoresExistentes, gastosExistentes] = await Promise.all([
      prisma.mercancia.count({ where: { carpetaId: id } }),
      prisma.contenedor.count({ where: { carpetaId: id } }),
      prisma.gasto.count({ where: { carpetaId: id } }),
    ]);

    const mercanciasValidas = Array.isArray(mercancias) ? mercancias.filter(m => m && m.descripcion) : [];
    const contenedoresValidos = Array.isArray(contenedores) ? contenedores.filter(c => c && c.tipo) : [];
    const gastosValidos = Array.isArray(gastos) ? gastos.filter(g => g && g.concepto) : [];

    // Aceptar el cambio si:
    //  - el array no llegó (undefined) → no tocar
    //  - llegó con items válidos → reemplazar
    //  - llegó vacío Y la carpeta también está vacía → noop seguro
    //  - llegó vacío Y la carpeta tenía datos → NO TOCAR (protección)
    const actualizarMercancias = Array.isArray(mercancias) && (mercanciasValidas.length > 0 || mercanciasExistentes === 0);
    const actualizarContenedores = Array.isArray(contenedores) && (contenedoresValidos.length > 0 || contenedoresExistentes === 0);
    const actualizarGastos = Array.isArray(gastos) && (gastosValidos.length > 0 || gastosExistentes === 0);

    if (Array.isArray(mercancias) && mercanciasValidas.length === 0 && mercanciasExistentes > 0) {
      console.warn(`[carpeta ${id}] Recibido mercancias=[] con ${mercanciasExistentes} en DB → se ignora para evitar pérdida de datos`);
    }
    if (Array.isArray(contenedores) && contenedoresValidos.length === 0 && contenedoresExistentes > 0) {
      console.warn(`[carpeta ${id}] Recibido contenedores=[] con ${contenedoresExistentes} en DB → se ignora`);
    }
    if (Array.isArray(gastos) && gastosValidos.length === 0 && gastosExistentes > 0) {
      console.warn(`[carpeta ${id}] Recibido gastos=[] con ${gastosExistentes} en DB → se ignora`);
    }

    // Usar transacción para actualizar todo
    const carpeta = await prisma.$transaction(async (tx) => {
      // 1. Actualizar datos principales de la carpeta
      await tx.carpeta.update({
        where: { id },
        data: updateData
      });

      // 2. Actualizar mercancías (eliminar existentes y crear nuevas)
      if (actualizarMercancias) {
        await tx.mercancia.deleteMany({ where: { carpetaId: id } });

        if (mercanciasValidas.length > 0) {
          await tx.mercancia.createMany({
            data: mercanciasValidas.map(m => ({
              carpetaId: id,
              descripcion: m.descripcion,
              embalaje: m.embalaje || null,
              marcas: m.marcas || null,
              bultos: parseInt(m.bultos) || 0,
              largo: m.largo != null ? parseFloat(m.largo) || null : null,
              ancho: m.ancho != null ? parseFloat(m.ancho) || null : null,
              alto: m.alto != null ? parseFloat(m.alto) || null : null,
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
      if (actualizarContenedores) {
        // Primero desvincular mercancías de contenedores que se eliminarán
        await tx.mercancia.updateMany({
          where: { carpetaId: id, contenedorId: { not: null } },
          data: { contenedorId: null }
        });

        await tx.contenedor.deleteMany({ where: { carpetaId: id } });

        if (contenedoresValidos.length > 0) {
          for (const c of contenedoresValidos) {
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
      if (actualizarGastos) {
        await tx.gasto.deleteMany({ where: { carpetaId: id } });

        if (gastosValidos.length > 0) {
          // Para que el cálculo respete la base (cant. contenedores, kilos, etc.)
          // usamos las mercancías y contenedores efectivos que vamos a guardar.
          const mercParaCalc = Array.isArray(mercancias) && mercanciasValidas.length > 0
            ? mercanciasValidas
            : (await tx.mercancia.findMany({ where: { carpetaId: id } }));
          const contParaCalc = Array.isArray(contenedores) && contenedoresValidos.length > 0
            ? contenedoresValidos
            : (await tx.contenedor.findMany({ where: { carpetaId: id } }));

          await tx.gasto.createMany({
            data: gastosValidos.map(g => {
              const categoriaIVA = g.categoriaIVA
                || (g.gravado === false ? 'NO_GRAVADO' : 'GRAVADO');
              const esGravado = categoriaIVA === 'GRAVADO';
              const { totalVenta, totalCosto } = calcularTotalesItem(
                g, mercParaCalc, contParaCalc
              );
              return {
                carpetaId: id,
                concepto: g.concepto,
                prepaidCollect: g.prepaidCollect || 'Prepaid',
                divisa: g.divisa || 'USD',
                montoVenta: parseFloat(g.montoVenta) || 0,
                montoCosto: parseFloat(g.montoCosto) || 0,
                base: g.base || null,
                cantidad: parseFloat(g.cantidad) || 1,
                totalVenta,
                totalCosto,
                categoriaIVA,
                gravado: esGravado,
                porcentajeIVA: esGravado ? (parseFloat(g.porcentajeIVA) || 21) : 0,
                proveedorId: g.proveedorId || null,
                proveedorNombre: g.proveedorNombre || null
              };
            })
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
        estado: 'ABIERTA',
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

// ---------------------------------------------------------------------------
// Helper: obtiene carpeta + tenant + bancoSeleccionado para generadores PDF.
// Acepta un campo `gastosInclude` opcional para hacer el include de proveedor
// (necesario cuando el PDF muestra nombre del proveedor).
// ---------------------------------------------------------------------------
async function _cargarCarpetaParaPDF(tenantId, carpetaId, { conProveedorEnGastos = false } = {}) {
  const carpeta = await prisma.carpeta.findFirst({
    where: { id: carpetaId, tenantId },
    include: {
      cliente: true,
      shipper: true,
      consignee: true,
      mercancias: true,
      contenedores: true,
      gastos: conProveedorEnGastos
        ? { include: { proveedor: true }, orderBy: { createdAt: 'asc' } }
        : { orderBy: { createdAt: 'asc' } },
    }
  });

  if (!carpeta) return { carpeta: null };

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      cuentasBancarias: true,
      companyAddress: true,
      companyPhone: true,
      companyEmail: true
    }
  });

  let bancoSeleccionado = null;
  const cuentasBancarias = tenant?.cuentasBancarias || [];
  if (cuentasBancarias.length > 0) {
    if (carpeta.bancoPdfId) {
      bancoSeleccionado = cuentasBancarias.find(c => c.id === carpeta.bancoPdfId);
    }
    if (!bancoSeleccionado) {
      bancoSeleccionado = cuentasBancarias.find(c => c.esPrincipal) || cuentasBancarias[0];
    }
  }

  return { carpeta, tenant, bancoSeleccionado };
}

function _enviarPDF(res, doc, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  doc.end();
}

// Calendario de ETAs: carpetas con llegada estimada en un rango de fechas
const calendarioEtas = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
      return res.status(400).json({ success: false, message: 'Parámetros desde/hasta requeridos' });
    }

    const carpetas = await prisma.carpeta.findMany({
      where: {
        tenantId,
        fechaLlegadaEstimada: {
          gte: new Date(desde + 'T00:00:00.000Z'),
          lte: new Date(hasta + 'T23:59:59.999Z')
        }
      },
      select: {
        id: true,
        numero: true,
        houseBL: true,
        masterBL: true,
        area: true,
        sector: true,
        estado: true,
        fechaLlegadaEstimada: true,
        cliente: {
          select: { razonSocial: true }
        }
      },
      orderBy: { fechaLlegadaEstimada: 'asc' }
    });

    res.json({ success: true, data: { carpetas } });
  } catch (error) {
    console.error('Error obteniendo calendario de ETAs:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el calendario' });
  }
};

// Generar PDF de Aviso de Arribo
const generarPDFAvisoArribo = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const { carpeta, tenant, bancoSeleccionado } = await _cargarCarpetaParaPDF(tenantId, id);
    if (!carpeta) return res.status(404).json({ success: false, message: 'Carpeta no encontrada' });

    const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
    const doc = generarAvisoArribo(carpeta, tenant, bancoSeleccionado, logoBuffer);
    _enviarPDF(res, doc, `Aviso_Arribo_${carpeta.houseBL || carpeta.numero}.pdf`);
  } catch (error) {
    console.error('Error generando PDF de aviso de arribo:', error);
    res.status(500).json({ success: false, message: 'Error al generar el PDF' });
  }
};

// Generar PDF de Bill of Lading (carpetas marítimas)
const generarPDFBillOfLading = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const { carpeta, tenant } = await _cargarCarpetaParaPDF(tenantId, id);
    if (!carpeta) return res.status(404).json({ success: false, message: 'Carpeta no encontrada' });

    if (carpeta.area !== 'Marítimo') {
      return res.status(400).json({
        success: false,
        message: 'El BL solo se genera para carpetas marítimas. Usá AWB para carpetas aéreas.'
      });
    }

    const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
    const doc = generarBillOfLading(carpeta, tenant, logoBuffer);
    _enviarPDF(res, doc, `BL_${carpeta.houseBL || carpeta.numero}.pdf`);
  } catch (error) {
    console.error('Error generando PDF de Bill of Lading:', error);
    res.status(500).json({ success: false, message: 'Error al generar el PDF' });
  }
};

// Generar PDF de Air Waybill (carpetas aéreas)
const generarPDFAirWaybill = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const { carpeta, tenant } = await _cargarCarpetaParaPDF(tenantId, id);
    if (!carpeta) return res.status(404).json({ success: false, message: 'Carpeta no encontrada' });

    if (carpeta.area !== 'Aéreo') {
      return res.status(400).json({
        success: false,
        message: 'El AWB solo se genera para carpetas aéreas. Usá BL para carpetas marítimas.'
      });
    }

    const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
    const doc = generarAirWaybill(carpeta, tenant, logoBuffer);
    _enviarPDF(res, doc, `AWB_${carpeta.houseBL || carpeta.numero}.pdf`);
  } catch (error) {
    console.error('Error generando PDF de Air Waybill:', error);
    res.status(500).json({ success: false, message: 'Error al generar el PDF' });
  }
};

// Generar PDF de Certificación de Flete (ambas modalidades)
const generarPDFCertificacionFlete = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const { carpeta, tenant, bancoSeleccionado } = await _cargarCarpetaParaPDF(tenantId, id, { conProveedorEnGastos: true });
    if (!carpeta) return res.status(404).json({ success: false, message: 'Carpeta no encontrada' });

    const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
    const doc = generarCertificacionFlete(carpeta, tenant, bancoSeleccionado, logoBuffer);
    _enviarPDF(res, doc, `Cert_Flete_${carpeta.houseBL || carpeta.numero}.pdf`);
  } catch (error) {
    console.error('Error generando Certificación de Flete:', error);
    res.status(500).json({ success: false, message: 'Error al generar el PDF' });
  }
};

// Generar PDF de Certificación de Gastos (ambas modalidades)
const generarPDFCertificacionGastos = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const { carpeta, tenant, bancoSeleccionado } = await _cargarCarpetaParaPDF(tenantId, id, { conProveedorEnGastos: true });
    if (!carpeta) return res.status(404).json({ success: false, message: 'Carpeta no encontrada' });

    const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
    const doc = generarCertificacionGastos(carpeta, tenant, bancoSeleccionado, logoBuffer);
    _enviarPDF(res, doc, `Cert_Gastos_${carpeta.houseBL || carpeta.numero}.pdf`);
  } catch (error) {
    console.error('Error generando Certificación de Gastos:', error);
    res.status(500).json({ success: false, message: 'Error al generar el PDF' });
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
  calendarioEtas,
  generarPDFAvisoArribo,
  generarPDFBillOfLading,
  generarPDFAirWaybill,
  generarPDFCertificacionFlete,
  generarPDFCertificacionGastos
};
