/**
 * WSAA - Web Service de Autenticación y Autorización de AFIP
 * 
 * Este servicio maneja la autenticación con AFIP mediante certificados digitales.
 * Genera tickets de acceso (TA) válidos por 12 horas.
 */

const soap = require('soap');
const forge = require('node-forge');
const CryptoJS = require('crypto-js');

// URLs de WSAA
const WSAA_URLS = {
  PRODUCTION: 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL',
  TESTING: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL',
};

// Servicios disponibles
const SERVICES = {
  WSFE: 'wsfe', // Factura electrónica
};

class WSAAService {
  constructor() {
    this.encryptionKey = process.env.AFIP_ENCRYPTION_KEY || process.env.JWT_SECRET;
  }

  /**
   * Desencripta datos sensibles
   */
  decrypt(ciphertext) {
    if (!ciphertext) return null;
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error decrypting:', error);
      return null;
    }
  }

  /**
   * Genera el Ticket de Requerimiento de Acceso (TRA)
   * 
   * @param {string} service - Nombre del servicio (ej: 'wsfe')
   * @returns {string} XML del TRA
   */
  generateTRA(service) {
    const now = new Date();
    const generationTime = new Date(now.getTime() - 10 * 60 * 1000); // 10 min antes
    const expirationTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 min después

    const formatDate = (date) => {
      return date.toISOString().replace(/\.\d{3}Z$/, '-03:00');
    };

    return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
    <generationTime>${formatDate(generationTime)}</generationTime>
    <expirationTime>${formatDate(expirationTime)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
  }

  /**
   * Firma el TRA con el certificado digital (CMS)
   * 
   * @param {string} tra - XML del TRA
   * @param {string} certPem - Certificado en formato PEM
   * @param {string} keyPem - Clave privada en formato PEM
   * @param {string} keyPassword - Password de la clave (opcional)
   * @returns {string} CMS firmado en base64
   */
  signTRA(tra, certPem, keyPem, keyPassword = null) {
    try {
      // Parsear certificado y clave
      const cert = forge.pki.certificateFromPem(certPem);
      let privateKey;
      
      if (keyPassword) {
        privateKey = forge.pki.decryptRsaPrivateKey(keyPem, keyPassword);
      } else {
        privateKey = forge.pki.privateKeyFromPem(keyPem);
      }

      if (!privateKey) {
        throw new Error('No se pudo parsear la clave privada');
      }

      // Crear PKCS#7 signed data
      const p7 = forge.pkcs7.createSignedData();
      p7.content = forge.util.createBuffer(tra, 'utf8');
      p7.addCertificate(cert);
      
      p7.addSigner({
        key: privateKey,
        certificate: cert,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: [
          {
            type: forge.pki.oids.contentType,
            value: forge.pki.oids.data,
          },
          {
            type: forge.pki.oids.messageDigest,
          },
          {
            type: forge.pki.oids.signingTime,
            value: new Date(),
          },
        ],
      });

      p7.sign({ detached: false });

      // Convertir a DER y luego a base64
      const asn1 = p7.toAsn1();
      const der = forge.asn1.toDer(asn1);
      const cms = forge.util.encode64(der.getBytes());

      return cms;
    } catch (error) {
      console.error('Error firmando TRA:', error);
      throw new Error(`Error al firmar TRA: ${error.message}`);
    }
  }

  /**
   * Solicita un Ticket de Acceso (TA) a WSAA
   * 
   * @param {Object} config - Configuración fiscal del tenant
   * @param {string} service - Servicio a autenticar (default: wsfe)
   * @returns {Object} { token, sign, expirationTime }
   */
  async getTicketAccess(config, service = SERVICES.WSFE) {
    const isProduction = config.environment === 'PRODUCTION';
    const wsdlUrl = isProduction ? WSAA_URLS.PRODUCTION : WSAA_URLS.TESTING;

    // Desencriptar certificado y clave
    const certPem = this.decrypt(config.certificate);
    const keyPem = this.decrypt(config.privateKey);
    const keyPassword = config.certificatePassword ? this.decrypt(config.certificatePassword) : null;

    if (!certPem || !keyPem) {
      throw new Error('Certificado o clave privada no configurados');
    }

    // Generar y firmar TRA
    const tra = this.generateTRA(service);
    const cms = this.signTRA(tra, certPem, keyPem, keyPassword);

    // Llamar a WSAA
    try {
      const client = await soap.createClientAsync(wsdlUrl);
      
      const result = await client.loginCmsAsync({ in0: cms });
      
      if (!result || !result[0]) {
        throw new Error('Respuesta vacía de WSAA');
      }

      const response = result[0].loginCmsReturn;
      
      // Parsear respuesta XML
      const xml2js = require('xml2js');
      const parser = new xml2js.Parser({ explicitArray: false });
      const parsed = await parser.parseStringPromise(response);
      
      const credentials = parsed.loginTicketResponse.credentials;
      const header = parsed.loginTicketResponse.header;

      return {
        token: credentials.token,
        sign: credentials.sign,
        expirationTime: new Date(header.expirationTime),
        source: header.source,
        destination: header.destination,
      };
    } catch (error) {
      console.error('Error en WSAA:', error);
      
      // Intentar extraer mensaje de error de AFIP
      if (error.root?.Envelope?.Body?.Fault?.faultstring) {
        throw new Error(`AFIP Error: ${error.root.Envelope.Body.Fault.faultstring}`);
      }
      
      throw new Error(`Error al autenticar con AFIP: ${error.message}`);
    }
  }

  /**
   * Verifica si el ticket de acceso actual es válido
   * 
   * @param {Object} config - Configuración fiscal
   * @returns {boolean}
   */
  isTokenValid(config) {
    if (!config.wsaaToken || !config.wsaaSign || !config.wsaaExpires) {
      return false;
    }

    const now = new Date();
    const expires = new Date(config.wsaaExpires);
    
    // Considerar inválido si expira en menos de 10 minutos
    return expires.getTime() - now.getTime() > 10 * 60 * 1000;
  }

  /**
   * Obtiene las credenciales de autenticación (renueva si es necesario)
   * 
   * @param {Object} config - Configuración fiscal
   * @param {Function} updateConfig - Función para actualizar la config en BD
   * @returns {Object} { token, sign }
   */
  async getCredentials(config, updateConfig) {
    // Si el token actual es válido, usarlo
    if (this.isTokenValid(config)) {
      return {
        token: config.wsaaToken,
        sign: config.wsaaSign,
      };
    }

    // Obtener nuevo ticket
    const ticket = await this.getTicketAccess(config);

    // Actualizar en la base de datos
    if (updateConfig) {
      await updateConfig({
        wsaaToken: ticket.token,
        wsaaSign: ticket.sign,
        wsaaExpires: ticket.expirationTime,
      });
    }

    return {
      token: ticket.token,
      sign: ticket.sign,
    };
  }

  /**
   * Valida el certificado digital
   * 
   * @param {string} certPem - Certificado en PEM
   * @returns {Object} Información del certificado
   */
  validateCertificate(certPem) {
    try {
      const cert = forge.pki.certificateFromPem(certPem);
      
      return {
        valid: true,
        subject: cert.subject.attributes.map(a => `${a.shortName}=${a.value}`).join(', '),
        issuer: cert.issuer.attributes.map(a => `${a.shortName}=${a.value}`).join(', '),
        validFrom: cert.validity.notBefore,
        validTo: cert.validity.notAfter,
        serialNumber: cert.serialNumber,
        isExpired: new Date() > cert.validity.notAfter,
        daysToExpire: Math.floor((cert.validity.notAfter - new Date()) / (1000 * 60 * 60 * 24)),
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }
}

module.exports = new WSAAService();
