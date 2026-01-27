/**
 * Clase base para servicios de navieras
 * Proporciona funcionalidad común para todas las integraciones
 */

const CryptoJS = require('crypto-js');

class BaseCarrierService {
  constructor(provider) {
    this.provider = provider;
    this.baseUrl = '';
    this.encryptionKey = process.env.CARRIER_ENCRYPTION_KEY || process.env.JWT_SECRET;
  }

  /**
   * Encripta datos sensibles antes de guardar
   */
  encrypt(text) {
    if (!text) return null;
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
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
   * Realiza una petición HTTP con manejo de errores
   */
  async request(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), mergedOptions.timeout);

      const response = await fetch(url, {
        ...mergedOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Obtiene o renueva el token de acceso
   * Debe ser implementado por cada servicio
   */
  async getAccessToken(integration) {
    throw new Error('Not implemented');
  }

  /**
   * Verifica las credenciales
   * Debe ser implementado por cada servicio
   */
  async testConnection(credentials) {
    throw new Error('Not implemented');
  }

  /**
   * Obtiene el tracking de un contenedor/BL
   * Debe ser implementado por cada servicio
   */
  async getTracking(integration, trackingNumber, trackingType) {
    throw new Error('Not implemented');
  }

  /**
   * Obtiene los schedules de un puerto
   * Debe ser implementado por cada servicio
   */
  async getSchedules(integration, portCode, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Mapea los eventos de la API a formato normalizado
   */
  normalizeTrackingEvents(rawEvents) {
    throw new Error('Not implemented');
  }

  /**
   * Mapea estados de la API a estados normalizados
   */
  normalizeStatus(apiStatus) {
    const statusMap = {
      // Estados comunes
      'LOADED': 'LOADED',
      'DISCHARGED': 'DISCHARGED',
      'IN_TRANSIT': 'IN_TRANSIT',
      'ARRIVED': 'ARRIVED',
      'DEPARTED': 'DEPARTED',
      'GATE_IN': 'GATE_IN',
      'GATE_OUT': 'GATE_OUT',
      'CUSTOMS_CLEARED': 'CUSTOMS_CLEARED',
      'DELIVERED': 'DELIVERED',
    };

    return statusMap[apiStatus] || apiStatus;
  }

  /**
   * Log de auditoría para llamadas a API
   */
  logApiCall(integration, endpoint, success, error = null) {
    console.log(`[${this.provider}] ${success ? 'SUCCESS' : 'ERROR'} - ${endpoint}`, {
      tenantId: integration.tenantId,
      timestamp: new Date().toISOString(),
      error: error?.message,
    });
  }
}

module.exports = BaseCarrierService;
