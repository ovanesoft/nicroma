/**
 * Servicio de integración con Maersk API
 * Documentación: https://delivers.maersk.com/developer/
 */

const BaseCarrierService = require('./base');

class MaerskService extends BaseCarrierService {
  constructor() {
    super('MAERSK');
    this.baseUrl = 'https://api.maersk.com';
    this.authUrl = 'https://api.maersk.com/oauth2/access_token';
  }

  /**
   * Obtiene token de acceso OAuth2
   */
  async getAccessToken(integration) {
    const clientId = this.decrypt(integration.clientId);
    const clientSecret = this.decrypt(integration.clientSecret);

    if (!clientId || !clientSecret) {
      throw new Error('Missing Maersk credentials');
    }

    // Verificar si el token actual aún es válido
    if (integration.accessToken && integration.tokenExpiresAt) {
      const expiresAt = new Date(integration.tokenExpiresAt);
      const now = new Date();
      // Si expira en más de 5 minutos, reusar
      if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
        return integration.accessToken;
      }
    }

    try {
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Auth failed: ${error}`);
      }

      const data = await response.json();
      
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        tokenExpiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      };
    } catch (error) {
      this.logApiCall(integration, 'oauth2/access_token', false, error);
      throw error;
    }
  }

  /**
   * Verifica las credenciales
   */
  async testConnection(credentials) {
    try {
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Authentication failed: ${error}` };
      }

      const data = await response.json();
      return { 
        success: true, 
        message: 'Conexión exitosa con Maersk API',
        expiresIn: data.expires_in 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Track & Trace - Obtiene eventos de tracking
   * Documentación: https://delivers.maersk.com/developer/apis/tracking
   */
  async getTracking(integration, trackingNumber, trackingType = 'CONTAINER') {
    try {
      const tokenData = await this.getAccessToken(integration);
      const accessToken = tokenData.accessToken || tokenData;

      let endpoint;
      let params = new URLSearchParams();

      switch (trackingType) {
        case 'CONTAINER':
          endpoint = '/track-and-trace-private/event';
          params.append('equipmentReference', trackingNumber);
          break;
        case 'BL':
          endpoint = '/track-and-trace-private/event';
          params.append('transportDocumentReference', trackingNumber);
          break;
        case 'BOOKING':
          endpoint = '/track-and-trace-private/event';
          params.append('carrierBookingReference', trackingNumber);
          break;
        default:
          throw new Error(`Unsupported tracking type: ${trackingType}`);
      }

      const url = `${this.baseUrl}${endpoint}?${params.toString()}`;

      const response = await this.request(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Consumer-Key': this.decrypt(integration.clientId),
        },
      });

      this.logApiCall(integration, endpoint, true);

      return {
        provider: this.provider,
        trackingNumber,
        trackingType,
        events: this.normalizeTrackingEvents(response.events || response),
        rawData: response,
        fetchedAt: new Date(),
      };
    } catch (error) {
      this.logApiCall(integration, 'tracking', false, error);
      throw error;
    }
  }

  /**
   * Obtiene schedules de punto a punto
   */
  async getSchedules(integration, options = {}) {
    const { originPort, destinationPort, departureDate, weeksOut = 4 } = options;

    try {
      const tokenData = await this.getAccessToken(integration);
      const accessToken = tokenData.accessToken || tokenData;

      const params = new URLSearchParams({
        collectionOriginCountryCode: originPort?.substring(0, 2) || '',
        collectionOriginCityName: originPort || '',
        deliveryDestinationCountryCode: destinationPort?.substring(0, 2) || '',
        deliveryDestinationCityName: destinationPort || '',
        dateRange: `P${weeksOut}W`,
      });

      if (departureDate) {
        params.append('earliestDepartureDateTime', departureDate);
      }

      const url = `${this.baseUrl}/products/ocean-products?${params.toString()}`;

      const response = await this.request(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Consumer-Key': this.decrypt(integration.clientId),
        },
      });

      this.logApiCall(integration, 'ocean-products', true);

      return {
        provider: this.provider,
        schedules: this.normalizeSchedules(response),
        rawData: response,
        fetchedAt: new Date(),
      };
    } catch (error) {
      this.logApiCall(integration, 'schedules', false, error);
      throw error;
    }
  }

  /**
   * Normaliza eventos de tracking de Maersk al formato común
   */
  normalizeTrackingEvents(rawEvents) {
    if (!Array.isArray(rawEvents)) {
      rawEvents = rawEvents?.events || [];
    }

    return rawEvents.map(event => ({
      eventType: event.eventType || event.transportEventTypeCode,
      eventCode: event.eventClassifierCode,
      eventDescription: event.description || this.getEventDescription(event),
      eventDateTime: new Date(event.eventDateTime || event.eventCreatedDateTime),
      location: event.location?.locationName || event.location?.UNLocationCode,
      locationCode: event.location?.UNLocationCode,
      facility: event.location?.facilityName,
      vessel: event.transportCall?.vessel?.name,
      voyage: event.transportCall?.exportVoyageNumber,
      rawData: event,
    }));
  }

  /**
   * Obtiene descripción legible del evento
   */
  getEventDescription(event) {
    const descriptions = {
      'ARRI': 'Arrived at port',
      'DEPA': 'Departed from port',
      'LOAD': 'Loaded on vessel',
      'DISC': 'Discharged from vessel',
      'GTIN': 'Gate in at terminal',
      'GTOT': 'Gate out from terminal',
      'CUST': 'Customs cleared',
      'DLVD': 'Delivered',
    };

    return descriptions[event.eventClassifierCode] || event.eventType || 'Event';
  }

  /**
   * Normaliza schedules
   */
  normalizeSchedules(rawSchedules) {
    if (!Array.isArray(rawSchedules)) {
      rawSchedules = rawSchedules?.oceanProducts || [];
    }

    return rawSchedules.map(schedule => ({
      vesselName: schedule.vesselName,
      vesselImo: schedule.vesselIMONumber,
      voyage: schedule.voyageNumber,
      service: schedule.serviceName,
      departurePort: schedule.departureLocation?.cityName,
      departureDate: schedule.departureDateTime,
      arrivalPort: schedule.arrivalLocation?.cityName,
      arrivalDate: schedule.arrivalDateTime,
      transitTime: schedule.transitTime,
    }));
  }
}

module.exports = new MaerskService();
