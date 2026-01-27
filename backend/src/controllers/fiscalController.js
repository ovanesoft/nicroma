/**
 * Controlador para facturación electrónica
 */

const { PrismaClient } = require('@prisma/client');
const { 
  service: afipService, 
  TIPOS_COMPROBANTE, 
  TIPOS_DOCUMENTO,
  ALICUOTAS_IVA 
} = require('../services/fiscal/afip');

const prisma = new PrismaClient();

/**
 * GET /api/fiscal/config
 * Obtiene la configuración fiscal del tenant
 */
exports.getConfig = async (req, res) => {
  try {
    const config = await afipService.getConfig(req.user.tenant_id);

    // No devolver datos sensibles
    res.json({
      success: true,
      data: {
        id: config.id,
        country: config.country,
        environment: config.environment,
        status: config.status,
        cuit: config.cuit,
        razonSocial: config.razonSocial,
        domicilioFiscal: config.domicilioFiscal,
        condicionIVA: config.condicionIVA,
        inicioActividades: config.inicioActividades,
        hasCertificate: !!config.certificate,
        hasPrivateKey: !!config.privateKey,
        certificateExpires: config.certificateExpires,
        lastTestedAt: config.lastTestedAt,
        lastError: config.lastError,
        puntosVenta: config.puntosVenta,
      },
    });
  } catch (error) {
    console.error('Error getting fiscal config:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuración fiscal' });
  }
};

/**
 * POST /api/fiscal/config
 * Guarda la configuración fiscal
 */
exports.saveConfig = async (req, res) => {
  try {
    const {
      environment,
      cuit,
      razonSocial,
      domicilioFiscal,
      condicionIVA,
      inicioActividades,
      certificate,
      privateKey,
      certificatePassword,
    } = req.body;

    // Validar CUIT
    if (cuit && !/^\d{2}-?\d{8}-?\d{1}$/.test(cuit)) {
      return res.status(400).json({
        success: false,
        error: 'CUIT inválido. Formato: XX-XXXXXXXX-X',
      });
    }

    const config = await afipService.saveConfig(req.user.tenant_id, {
      environment,
      cuit: cuit?.replace(/-/g, ''),
      razonSocial,
      domicilioFiscal,
      condicionIVA,
      inicioActividades: inicioActividades ? new Date(inicioActividades) : null,
      certificate,
      privateKey,
      certificatePassword,
      status: 'PENDING_SETUP',
    });

    res.json({
      success: true,
      message: 'Configuración guardada. Probá la conexión para verificar.',
      data: {
        id: config.id,
        status: config.status,
        hasCertificate: !!config.certificate,
        certificateExpires: config.certificateExpires,
      },
    });
  } catch (error) {
    console.error('Error saving fiscal config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/fiscal/validate-certificate
 * Valida un certificado digital
 */
exports.validateCertificate = async (req, res) => {
  try {
    const { certificate } = req.body;

    if (!certificate) {
      return res.status(400).json({
        success: false,
        error: 'Certificado requerido',
      });
    }

    const result = afipService.validateCertificate(certificate);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error validating certificate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/fiscal/test-connection
 * Prueba la conexión con AFIP
 */
exports.testConnection = async (req, res) => {
  try {
    const result = await afipService.testConnection(req.user.tenant_id);
    
    res.json(result);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fiscal/server-status
 * Verifica el estado de los servidores de AFIP
 */
exports.getServerStatus = async (req, res) => {
  try {
    const { environment = 'TESTING' } = req.query;
    const status = await afipService.checkServerStatus(environment);
    
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Error checking server status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fiscal/puntos-venta
 * Lista puntos de venta configurados
 */
exports.getPuntosVenta = async (req, res) => {
  try {
    const config = await afipService.getConfig(req.user.tenant_id);
    
    const puntosVenta = await prisma.puntoVenta.findMany({
      where: { fiscalConfigId: config.id },
      orderBy: { numero: 'asc' },
    });

    res.json({ success: true, data: puntosVenta });
  } catch (error) {
    console.error('Error getting puntos venta:', error);
    res.status(500).json({ success: false, error: 'Error al obtener puntos de venta' });
  }
};

/**
 * POST /api/fiscal/puntos-venta/sync
 * Sincroniza puntos de venta desde AFIP
 */
exports.syncPuntosVenta = async (req, res) => {
  try {
    const puntosVenta = await afipService.syncPuntosVenta(req.user.tenant_id);
    
    res.json({
      success: true,
      message: `${puntosVenta.length} puntos de venta sincronizados`,
      data: puntosVenta,
    });
  } catch (error) {
    console.error('Error syncing puntos venta:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/fiscal/puntos-venta
 * Crea o actualiza un punto de venta
 */
exports.savePuntoVenta = async (req, res) => {
  try {
    const { numero, nombre, tipoEmision, isActive, isDefault } = req.body;

    const config = await afipService.getConfig(req.user.tenant_id);

    // Si se marca como default, quitar default de los demás
    if (isDefault) {
      await prisma.puntoVenta.updateMany({
        where: { fiscalConfigId: config.id },
        data: { isDefault: false },
      });
    }

    const puntoVenta = await prisma.puntoVenta.upsert({
      where: {
        fiscalConfigId_numero: {
          fiscalConfigId: config.id,
          numero,
        },
      },
      create: {
        fiscalConfigId: config.id,
        numero,
        nombre,
        tipoEmision: tipoEmision || 'CAE',
        isActive: isActive !== false,
        isDefault: isDefault || false,
      },
      update: {
        nombre,
        tipoEmision,
        isActive,
        isDefault,
      },
    });

    res.json({ success: true, data: puntoVenta });
  } catch (error) {
    console.error('Error saving punto venta:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fiscal/tipos-comprobante
 * Obtiene tipos de comprobante disponibles
 */
exports.getTiposComprobante = async (req, res) => {
  try {
    // Devolver la lista estática primero (más rápido)
    const tiposLocales = Object.entries(TIPOS_COMPROBANTE).map(([id, nombre]) => ({
      id: parseInt(id),
      nombre,
    }));

    res.json({ success: true, data: tiposLocales });
  } catch (error) {
    console.error('Error getting tipos comprobante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fiscal/tipos-documento
 * Obtiene tipos de documento
 */
exports.getTiposDocumento = async (req, res) => {
  try {
    const tipos = Object.entries(TIPOS_DOCUMENTO).map(([id, nombre]) => ({
      id: parseInt(id),
      nombre,
    }));

    res.json({ success: true, data: tipos });
  } catch (error) {
    console.error('Error getting tipos documento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fiscal/alicuotas-iva
 * Obtiene alícuotas de IVA
 */
exports.getAlicuotasIVA = async (req, res) => {
  try {
    const alicuotas = Object.entries(ALICUOTAS_IVA).map(([id, data]) => ({
      id: parseInt(id),
      ...data,
    }));

    res.json({ success: true, data: alicuotas });
  } catch (error) {
    console.error('Error getting alicuotas IVA:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fiscal/ultimo-autorizado
 * Obtiene el último número de comprobante autorizado
 */
exports.getUltimoAutorizado = async (req, res) => {
  try {
    const { puntoVenta, tipoComprobante } = req.query;

    if (!puntoVenta || !tipoComprobante) {
      return res.status(400).json({
        success: false,
        error: 'Punto de venta y tipo de comprobante requeridos',
      });
    }

    const ultimo = await afipService.getUltimoAutorizado(
      req.user.tenant_id,
      parseInt(puntoVenta),
      parseInt(tipoComprobante)
    );

    res.json({
      success: true,
      data: {
        ultimoAutorizado: ultimo,
        siguiente: ultimo + 1,
      },
    });
  } catch (error) {
    console.error('Error getting ultimo autorizado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/fiscal/emitir
 * Emite un comprobante fiscal
 */
exports.emitirComprobante = async (req, res) => {
  try {
    const comprobante = req.body;

    // Validaciones básicas
    if (!comprobante.puntoVenta) {
      return res.status(400).json({ success: false, error: 'Punto de venta requerido' });
    }
    if (!comprobante.tipoComprobante) {
      return res.status(400).json({ success: false, error: 'Tipo de comprobante requerido' });
    }
    if (!comprobante.nroDocReceptor) {
      return res.status(400).json({ success: false, error: 'Documento del receptor requerido' });
    }
    if (!comprobante.importeTotal) {
      return res.status(400).json({ success: false, error: 'Importe total requerido' });
    }

    const resultado = await afipService.emitirComprobante(req.user.tenant_id, comprobante);

    res.json({
      success: true,
      message: resultado.resultado === 'A' ? 'Comprobante autorizado' : 'Comprobante con observaciones',
      data: resultado,
    });
  } catch (error) {
    console.error('Error emitiendo comprobante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/fiscal/emitir-desde-factura/:facturaId
 * Emite comprobante fiscal desde una factura del sistema
 */
exports.emitirDesdeFactura = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { puntoVenta, tipoComprobante } = req.body;

    // Obtener factura
    const factura = await prisma.factura.findFirst({
      where: {
        id: facturaId,
        tenantId: req.user.tenant_id,
      },
      include: {
        cliente: true,
        items: true,
      },
    });

    if (!factura) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada' });
    }

    if (factura.cae) {
      return res.status(400).json({ success: false, error: 'Esta factura ya tiene CAE' });
    }

    // Obtener punto de venta por defecto si no se especifica
    let pv = puntoVenta;
    if (!pv) {
      const config = await afipService.getConfig(req.user.tenant_id);
      const defaultPV = await prisma.puntoVenta.findFirst({
        where: { fiscalConfigId: config.id, isDefault: true, isActive: true },
      });
      if (!defaultPV) {
        return res.status(400).json({ 
          success: false, 
          error: 'No hay punto de venta configurado' 
        });
      }
      pv = defaultPV.numero;
    }

    // Construir comprobante
    const comprobante = {
      facturaId: factura.id,
      puntoVenta: pv,
      tipoComprobante: tipoComprobante || determinarTipoComprobante(factura),
      tipoDocReceptor: 80, // CUIT
      nroDocReceptor: factura.cliente.numeroDocumento,
      concepto: 2, // Servicios
      fecha: factura.fecha,
      fechaServicioDesde: factura.fecha,
      fechaServicioHasta: factura.fecha,
      fechaVencimiento: factura.fechaVencimiento,
      importeTotal: parseFloat(factura.total),
      importeNeto: parseFloat(factura.subtotal),
      importeIVA: parseFloat(factura.iva),
      importeExento: 0,
      importeTributos: parseFloat(factura.percepcionIVA || 0) + parseFloat(factura.percepcionIIBB || 0),
      moneda: factura.moneda === 'ARS' ? 'PES' : 'DOL',
      cotizacion: parseFloat(factura.cotizacion) || 1,
      // IVA desglosado
      iva: [{
        id: 5, // 21%
        baseImponible: parseFloat(factura.subtotal),
        importe: parseFloat(factura.iva),
      }],
    };

    const resultado = await afipService.emitirComprobante(req.user.tenant_id, comprobante);

    res.json({
      success: true,
      message: 'Factura electrónica emitida',
      data: resultado,
    });
  } catch (error) {
    console.error('Error emitiendo desde factura:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fiscal/comprobantes
 * Lista comprobantes fiscales emitidos
 */
exports.getComprobantes = async (req, res) => {
  try {
    const { page = 1, limit = 20, estado } = req.query;

    const where = { tenantId: req.user.tenant_id };
    if (estado) where.estado = estado;

    const [comprobantes, total] = await Promise.all([
      prisma.comprobanteFiscal.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          puntoVenta: true,
        },
      }),
      prisma.comprobanteFiscal.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        comprobantes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error getting comprobantes:', error);
    res.status(500).json({ success: false, error: 'Error al listar comprobantes' });
  }
};

/**
 * GET /api/fiscal/comprobantes/:id
 * Obtiene detalle de un comprobante fiscal
 */
exports.getComprobante = async (req, res) => {
  try {
    const { id } = req.params;

    const comprobante = await prisma.comprobanteFiscal.findFirst({
      where: {
        id,
        tenantId: req.user.tenant_id,
      },
      include: {
        puntoVenta: true,
      },
    });

    if (!comprobante) {
      return res.status(404).json({ success: false, error: 'Comprobante no encontrado' });
    }

    res.json({ success: true, data: comprobante });
  } catch (error) {
    console.error('Error getting comprobante:', error);
    res.status(500).json({ success: false, error: 'Error al obtener comprobante' });
  }
};

/**
 * POST /api/fiscal/consultar
 * Consulta un comprobante en AFIP
 */
exports.consultarComprobante = async (req, res) => {
  try {
    const { puntoVenta, tipoComprobante, numero } = req.body;

    if (!puntoVenta || !tipoComprobante || !numero) {
      return res.status(400).json({
        success: false,
        error: 'Punto de venta, tipo de comprobante y número requeridos',
      });
    }

    const resultado = await afipService.consultarComprobante(
      req.user.tenant_id,
      puntoVenta,
      tipoComprobante,
      numero
    );

    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Error consultando comprobante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Determina el tipo de comprobante según el cliente
 */
function determinarTipoComprobante(factura) {
  // Por defecto Factura B (para consumidor final o monotributistas)
  // Factura A para Responsable Inscripto
  const condicion = factura.cliente?.condicionFiscal?.toUpperCase();
  
  if (condicion?.includes('RESPONSABLE INSCRIPTO') || condicion?.includes('RI')) {
    return 1; // Factura A
  }
  
  return 6; // Factura B
}
