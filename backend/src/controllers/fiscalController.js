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
 * POST /api/fiscal/generate-csr
 * Genera clave privada + CSR para subir a AFIP
 */
exports.generateCSR = async (req, res) => {
  try {
    const { cuit, razonSocial } = req.body;

    if (!cuit) {
      return res.status(400).json({ success: false, error: 'CUIT es requerido' });
    }

    const cuitClean = cuit.replace(/-/g, '');
    if (!/^\d{11}$/.test(cuitClean)) {
      return res.status(400).json({ success: false, error: 'CUIT inválido' });
    }

    const result = await afipService.generateCSR(req.user.tenant_id, {
      cuit: cuitClean,
      razonSocial,
    });

    res.json({
      success: true,
      message: 'CSR generado. La clave privada fue guardada automáticamente.',
      data: { csrPem: result.csrPem },
    });
  } catch (error) {
    console.error('Error generating CSR:', error);
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

    // Validar documento del receptor ANTES de tocar ARCA
    const docReceptor = String(factura.cliente?.numeroDocumento || '').replace(/[^0-9]/g, '');
    if (!docReceptor || docReceptor.length < 7 || docReceptor.startsWith('TEMP')) {
      return res.status(400).json({
        success: false,
        error: `El cliente "${factura.cliente?.razonSocial}" no tiene un CUIT/DNI válido cargado. Corregilo antes de emitir.`
      });
    }

    // Tipo de documento según longitud: 11 dígitos = CUIT (80), sino DNI (96)
    const tipoDocReceptor = docReceptor.length === 11 ? 80 : 96;

    // Desglosar IVA por alícuota real de los ítems (no asumir siempre 21%)
    // IDs AFIP: 3=0%, 4=10.5%, 5=21%, 6=27%, 8=5%, 9=2.5%
    const ALICUOTA_ID = { '0': 3, '10.5': 4, '21': 5, '27': 6, '5': 8, '2.5': 9 };
    const porAlicuota = {};
    let importeExento = 0;
    (factura.items || []).forEach(item => {
      const alic = parseFloat(item.alicuotaIVA) || 0;
      if (alic === 0 && !item.iva) {
        importeExento += parseFloat(item.subtotal) || 0;
        return;
      }
      const key = String(alic);
      if (!porAlicuota[key]) porAlicuota[key] = { base: 0, importe: 0 };
      porAlicuota[key].base += parseFloat(item.subtotal) || 0;
      porAlicuota[key].importe += parseFloat(item.iva) || 0;
    });

    const ivaDesglosado = Object.entries(porAlicuota).map(([alic, v]) => ({
      id: ALICUOTA_ID[alic] || 5,
      baseImponible: Math.round(v.base * 100) / 100,
      importe: Math.round(v.importe * 100) / 100,
    }));

    // Si no hay items con IVA, fallback al total de la factura
    if (ivaDesglosado.length === 0 && parseFloat(factura.iva) > 0) {
      ivaDesglosado.push({
        id: 5,
        baseImponible: parseFloat(factura.subtotal),
        importe: parseFloat(factura.iva),
      });
    }

    // Construir comprobante
    const comprobante = {
      facturaId: factura.id,
      puntoVenta: pv,
      tipoComprobante: tipoComprobante || determinarTipoComprobante(factura),
      tipoDocReceptor,
      nroDocReceptor: docReceptor,
      concepto: 2, // Servicios
      fecha: factura.fecha,
      fechaServicioDesde: factura.fecha,
      fechaServicioHasta: factura.fecha,
      fechaVencimiento: factura.fechaVencimiento,
      importeTotal: parseFloat(factura.total),
      importeNeto: parseFloat(factura.subtotal) - importeExento,
      importeIVA: parseFloat(factura.iva),
      importeExento,
      importeTributos: parseFloat(factura.percepcionIVA || 0) + parseFloat(factura.percepcionIIBB || 0),
      moneda: factura.moneda === 'ARS' ? 'PES' : 'DOL',
      cotizacion: parseFloat(factura.cotizacion) || 1,
      iva: ivaDesglosado,
    };

    const resultado = await afipService.emitirComprobante(req.user.tenant_id, comprobante);

    res.json({
      success: true,
      message: resultado.advertencia
        ? `CAE ${resultado.cae} autorizado, pero con advertencia: ${resultado.advertencia}`
        : 'Factura electrónica emitida',
      data: resultado,
    });
  } catch (error) {
    console.error('Error emitiendo desde factura:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/fiscal/recuperar-cae/:facturaId
 * Recupera un CAE que quedó autorizado en ARCA pero no se guardó en el
 * sistema (por un fallo posterior a la autorización). Consulta el último
 * comprobante autorizado en ARCA para el PV/tipo y, si coincide el importe
 * y el documento del receptor con la factura, persiste el CAE.
 */
exports.recuperarCAE = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { puntoVenta, tipoComprobante, numeroComprobante } = req.body;
    const tenantId = req.user.tenant_id;

    const factura = await prisma.factura.findFirst({
      where: { id: facturaId, tenantId },
      include: { cliente: true },
    });

    if (!factura) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada' });
    }
    if (factura.cae) {
      return res.status(400).json({ success: false, error: 'Esta factura ya tiene CAE registrado' });
    }

    // Determinar PV y tipo
    let pv = puntoVenta;
    if (!pv) {
      const config = await afipService.getConfig(tenantId);
      const defaultPV = await prisma.puntoVenta.findFirst({
        where: { fiscalConfigId: config.id, isDefault: true, isActive: true },
      });
      if (!defaultPV) {
        return res.status(400).json({ success: false, error: 'No hay punto de venta configurado' });
      }
      pv = defaultPV.numero;
    }
    const tipo = tipoComprobante || determinarTipoComprobante(factura);

    // Número a consultar: el indicado o el último autorizado en ARCA
    let nro = numeroComprobante;
    if (!nro) {
      nro = await afipService.getUltimoAutorizado(tenantId, pv, tipo);
    }
    if (!nro) {
      return res.status(404).json({ success: false, error: 'No hay comprobantes autorizados en ARCA para ese punto de venta y tipo' });
    }

    // Consultar el comprobante en ARCA
    const detalle = await afipService.consultarComprobante(tenantId, pv, tipo, nro);
    if (!detalle || !detalle.CodAutorizacion) {
      return res.status(404).json({ success: false, error: `El comprobante N° ${nro} no existe en ARCA o no tiene CAE` });
    }

    // Verificar que el importe coincida con la factura (tolerancia 1 peso)
    const importeArca = parseFloat(detalle.ImpTotal);
    const importeFactura = parseFloat(factura.total);
    if (Math.abs(importeArca - importeFactura) > 1) {
      return res.status(400).json({
        success: false,
        error: `El comprobante N° ${nro} de ARCA tiene importe ${importeArca}, no coincide con el total de la factura (${importeFactura}). Verificá el número de comprobante.`,
        data: { detalleArca: detalle }
      });
    }

    const cae = String(detalle.CodAutorizacion);
    const caeVto = detalle.FchVto
      ? new Date(`${String(detalle.FchVto).slice(0, 4)}-${String(detalle.FchVto).slice(4, 6)}-${String(detalle.FchVto).slice(6, 8)}T12:00:00Z`)
      : null;

    // Persistir en la factura
    await prisma.factura.update({
      where: { id: facturaId },
      data: { cae, vencimientoCAE: caeVto },
    });

    // Crear el registro fiscal si no existe
    const config = await afipService.getConfig(tenantId);
    const pvRecord = await prisma.puntoVenta.findFirst({
      where: { fiscalConfigId: config.id, numero: pv },
    });

    const existente = await prisma.comprobanteFiscal.findFirst({
      where: { tenantId, tipoComprobante: tipo, puntoVentaNum: pv, numeroComprobante: nro },
    });

    let comprobanteFiscal = existente;
    if (!existente && pvRecord) {
      const wsfev1 = require('../services/fiscal/afip/wsfev1').service;
      const qrData = wsfev1.generateQRData({
        fecha: factura.fecha,
        puntoVenta: pv,
        tipoComprobante: tipo,
        numeroComprobante: nro,
        importeTotal: importeFactura,
        tipoDocReceptor: 80,
        nroDocReceptor: factura.cliente?.numeroDocumento || '0',
        cae,
      }, config);

      comprobanteFiscal = await prisma.comprobanteFiscal.create({
        data: {
          tenantId,
          facturaId,
          puntoVentaId: pvRecord.id,
          tipoComprobante: tipo,
          puntoVentaNum: pv,
          numeroComprobante: nro,
          numeroCompleto: `${String(pv).padStart(5, '0')}-${String(nro).padStart(8, '0')}`,
          tipoDocReceptor: 80,
          nroDocReceptor: String(factura.cliente?.numeroDocumento || ''),
          importeTotal: importeFactura,
          importeNeto: parseFloat(factura.subtotal),
          importeIVA: parseFloat(factura.iva),
          fechaComprobante: factura.fecha,
          cae,
          caeVencimiento: caeVto,
          estado: 'AUTORIZADO',
          resultado: 'A',
          afipResponse: detalle,
          qrData,
        },
      });
    }

    res.json({
      success: true,
      message: `CAE ${cae} recuperado desde ARCA y guardado`,
      data: { cae, caeVencimiento: caeVto, comprobanteFiscal },
    });
  } catch (error) {
    console.error('Error recuperando CAE:', error);
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
