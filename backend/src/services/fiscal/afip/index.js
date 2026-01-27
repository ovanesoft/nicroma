/**
 * Servicio principal de integración con AFIP (Argentina)
 * 
 * Maneja:
 * - Autenticación (WSAA)
 * - Factura Electrónica (WSFEv1)
 */

const { PrismaClient } = require('@prisma/client');
const CryptoJS = require('crypto-js');
const wsaa = require('./wsaa');
const { service: wsfev1, TIPOS_COMPROBANTE, TIPOS_DOCUMENTO, ALICUOTAS_IVA } = require('./wsfev1');

const prisma = new PrismaClient();
const encryptionKey = process.env.AFIP_ENCRYPTION_KEY || process.env.JWT_SECRET;

/**
 * Encripta datos sensibles
 */
function encrypt(text) {
  if (!text) return null;
  return CryptoJS.AES.encrypt(text, encryptionKey).toString();
}

/**
 * Desencripta datos sensibles
 */
function decrypt(ciphertext) {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return null;
  }
}

class AFIPService {
  /**
   * Obtiene o crea la configuración fiscal de un tenant
   */
  async getConfig(tenantId) {
    let config = await prisma.fiscalConfig.findUnique({
      where: { tenantId },
      include: { puntosVenta: true },
    });

    if (!config) {
      config = await prisma.fiscalConfig.create({
        data: {
          tenantId,
          country: 'AR',
          environment: 'TESTING',
          status: 'PENDING_SETUP',
        },
        include: { puntosVenta: true },
      });
    }

    return config;
  }

  /**
   * Guarda la configuración fiscal
   */
  async saveConfig(tenantId, data) {
    // Encriptar datos sensibles
    const encryptedData = {
      ...data,
      certificate: data.certificate ? encrypt(data.certificate) : undefined,
      privateKey: data.privateKey ? encrypt(data.privateKey) : undefined,
      certificatePassword: data.certificatePassword ? encrypt(data.certificatePassword) : undefined,
    };

    // Si viene certificado, validarlo y obtener fecha de expiración
    if (data.certificate) {
      const certInfo = wsaa.validateCertificate(data.certificate);
      if (!certInfo.valid) {
        throw new Error(`Certificado inválido: ${certInfo.error}`);
      }
      encryptedData.certificateExpires = certInfo.validTo;
    }

    const config = await prisma.fiscalConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        country: 'AR',
        ...encryptedData,
      },
      update: encryptedData,
      include: { puntosVenta: true },
    });

    return config;
  }

  /**
   * Valida el certificado digital
   */
  validateCertificate(certPem) {
    return wsaa.validateCertificate(certPem);
  }

  /**
   * Prueba la conexión con AFIP
   */
  async testConnection(tenantId) {
    const config = await this.getConfig(tenantId);

    if (!config.certificate || !config.privateKey || !config.cuit) {
      return {
        success: false,
        error: 'Configuración incompleta. Faltan certificado, clave privada o CUIT.',
      };
    }

    try {
      // Verificar estado del servidor
      const serverStatus = await wsfev1.checkServerStatus(config.environment);
      if (!serverStatus.allOnline) {
        return {
          success: false,
          error: 'Servicios de AFIP no disponibles',
          details: serverStatus,
        };
      }

      // Intentar autenticación
      const updateFn = async (data) => {
        await prisma.fiscalConfig.update({
          where: { tenantId },
          data: {
            ...data,
            lastTestedAt: new Date(),
            lastError: null,
            status: 'ACTIVE',
          },
        });
      };

      await wsaa.getCredentials(config, updateFn);

      return {
        success: true,
        message: 'Conexión exitosa con AFIP',
        serverStatus,
      };
    } catch (error) {
      await prisma.fiscalConfig.update({
        where: { tenantId },
        data: {
          lastTestedAt: new Date(),
          lastError: error.message,
          status: 'ERROR',
        },
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene las credenciales de autenticación (token + sign)
   */
  async getCredentials(tenantId) {
    const config = await this.getConfig(tenantId);

    if (config.status !== 'ACTIVE' && config.status !== 'PENDING_SETUP') {
      throw new Error('Configuración fiscal no activa');
    }

    const updateFn = async (data) => {
      await prisma.fiscalConfig.update({
        where: { tenantId },
        data,
      });
    };

    return wsaa.getCredentials(config, updateFn);
  }

  /**
   * Obtiene puntos de venta habilitados en AFIP
   */
  async getPuntosVentaAFIP(tenantId) {
    const config = await this.getConfig(tenantId);
    const credentials = await this.getCredentials(tenantId);
    
    return wsfev1.getPuntosVenta(config, credentials);
  }

  /**
   * Sincroniza puntos de venta desde AFIP
   */
  async syncPuntosVenta(tenantId) {
    const config = await this.getConfig(tenantId);
    const puntosAFIP = await this.getPuntosVentaAFIP(tenantId);

    // Crear o actualizar puntos de venta
    for (const pv of puntosAFIP) {
      await prisma.puntoVenta.upsert({
        where: {
          fiscalConfigId_numero: {
            fiscalConfigId: config.id,
            numero: pv.Nro,
          },
        },
        create: {
          fiscalConfigId: config.id,
          numero: pv.Nro,
          nombre: `Punto de Venta ${pv.Nro}`,
          tipoEmision: pv.EmisionTipo === 'CAE' ? 'CAE' : 'CAEA',
          isActive: pv.Bloqueado === 'N',
        },
        update: {
          tipoEmision: pv.EmisionTipo === 'CAE' ? 'CAE' : 'CAEA',
          isActive: pv.Bloqueado === 'N',
        },
      });
    }

    return prisma.puntoVenta.findMany({
      where: { fiscalConfigId: config.id },
    });
  }

  /**
   * Obtiene tipos de comprobante disponibles
   */
  async getTiposComprobante(tenantId) {
    const config = await this.getConfig(tenantId);
    const credentials = await this.getCredentials(tenantId);
    
    return wsfev1.getTiposComprobante(config, credentials);
  }

  /**
   * Obtiene el último número de comprobante autorizado
   */
  async getUltimoAutorizado(tenantId, puntoVenta, tipoComprobante) {
    const config = await this.getConfig(tenantId);
    const credentials = await this.getCredentials(tenantId);
    
    return wsfev1.getUltimoAutorizado(config, credentials, puntoVenta, tipoComprobante);
  }

  /**
   * Emite un comprobante fiscal (solicita CAE)
   * 
   * @param {string} tenantId - ID del tenant
   * @param {Object} comprobante - Datos del comprobante
   * @returns {Object} Comprobante con CAE
   */
  async emitirComprobante(tenantId, comprobante) {
    const config = await this.getConfig(tenantId);
    const credentials = await this.getCredentials(tenantId);

    // Verificar punto de venta
    const puntoVenta = await prisma.puntoVenta.findFirst({
      where: {
        fiscalConfigId: config.id,
        numero: comprobante.puntoVenta,
        isActive: true,
      },
    });

    if (!puntoVenta) {
      throw new Error(`Punto de venta ${comprobante.puntoVenta} no encontrado o no activo`);
    }

    // Solicitar CAE
    const resultado = await wsfev1.solicitarCAE(config, credentials, comprobante);

    // Generar QR
    const qrData = wsfev1.generateQRData({
      ...comprobante,
      ...resultado,
    }, config);

    // Guardar comprobante fiscal
    const comprobanteFiscal = await prisma.comprobanteFiscal.create({
      data: {
        tenantId,
        facturaId: comprobante.facturaId || null,
        puntoVentaId: puntoVenta.id,
        tipoComprobante: comprobante.tipoComprobante,
        puntoVentaNum: comprobante.puntoVenta,
        numeroComprobante: resultado.numeroComprobante,
        numeroCompleto: resultado.numeroCompleto,
        tipoDocReceptor: comprobante.tipoDocReceptor || 80,
        nroDocReceptor: comprobante.nroDocReceptor,
        importeTotal: comprobante.importeTotal,
        importeNeto: comprobante.importeNeto,
        importeIVA: comprobante.importeIVA,
        importeTributos: comprobante.importeTributos || 0,
        importeExento: comprobante.importeExento || 0,
        fechaComprobante: comprobante.fecha || new Date(),
        fechaServicioDesde: comprobante.fechaServicioDesde,
        fechaServicioHasta: comprobante.fechaServicioHasta,
        fechaVencimiento: comprobante.fechaVencimiento,
        cae: resultado.cae,
        caeVencimiento: resultado.caeVencimiento,
        estado: resultado.resultado === 'A' ? 'AUTORIZADO' : 'RECHAZADO',
        resultado: resultado.resultado,
        afipResponse: resultado,
        observaciones: resultado.observaciones 
          ? JSON.stringify(resultado.observaciones) 
          : null,
        qrData,
      },
    });

    // Si tiene factura asociada, actualizar con el CAE
    if (comprobante.facturaId) {
      await prisma.factura.update({
        where: { id: comprobante.facturaId },
        data: {
          cae: resultado.cae,
          vencimientoCAE: resultado.caeVencimiento,
        },
      });
    }

    return {
      ...resultado,
      qrData,
      comprobanteFiscal,
    };
  }

  /**
   * Consulta un comprobante emitido
   */
  async consultarComprobante(tenantId, puntoVenta, tipoComprobante, numero) {
    const config = await this.getConfig(tenantId);
    const credentials = await this.getCredentials(tenantId);
    
    return wsfev1.consultarComprobante(config, credentials, puntoVenta, tipoComprobante, numero);
  }

  /**
   * Verifica el estado de los servicios de AFIP
   */
  async checkServerStatus(environment = 'TESTING') {
    return wsfev1.checkServerStatus(environment);
  }
}

module.exports = {
  service: new AFIPService(),
  TIPOS_COMPROBANTE,
  TIPOS_DOCUMENTO,
  ALICUOTAS_IVA,
  encrypt,
  decrypt,
};
