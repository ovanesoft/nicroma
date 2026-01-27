/**
 * Servicio de integración con MSC API
 * Documentación: https://developerportal.msc.com/
 */

const BaseCarrierService = require('./base');

class MscService extends BaseCarrierService {
  constructor() {
    super('MSC');
    this.baseUrl = 'https://api.msc.com';
    this.authUrl = 'https://api.msc.com/oauth/token';
  }

  /**
   * Obtiene token de acceso OAuth2
   */
  async getAccessToken(integration) {
    const clientId = this.decrypt(integration.clientId);
    const clientSecret = this.decrypt(integration.clientSecret);

    if (!clientId || !clientSecret) {
      throw new Error('Missing MSC credentials');
    }

    // Verificar token actual
    if (integration.accessToken && integration.tokenExpiresAt) {
      const expiresAt = new Date(integration.tokenExpiresAt);
      const now = new Date();
      if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
        return integration.accessToken;
      }
    }

    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'track-trace',
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
      this.logApiCall(integration, 'oauth/token', false, error);
      throw error;
    }
  }

  /**
   * Verifica las credenciales
   */
  async testConnection(credentials) {
    try {
      const creds = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');

      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${creds}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'track-trace',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Authentication failed: ${error}` };
      }

      return { 
        success: true, 
        message: 'Conexión exitosa con MSC API',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Track & Trace
   */
  async getTracking(integration, trackingNumber, trackingType = 'CONTAINER') {
    try {
      const tokenData = await this.getAccessToken(integration);
      const accessToken = tokenData.accessToken || tokenData;

      let endpoint = '/track-and-trace/v1/events';
      const params = new URLSearchParams();

      switch (trackingType) {
        case 'CONTAINER':
          params.append('equipmentReference', trackingNumber);
          break;
        case 'BL':
          params.append('transportDocumentReference', trackingNumber);
          break;
        case 'BOOKING':
          params.append('carrierBookingReference', trackingNumber);
          break;
        default:
          throw new Error(`Unsupported tracking type: ${trackingType}`);
      }

      const url = `${this.baseUrl}${endpoint}?${params.toString()}`;

      const response = await this.request(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      this.logApiCall(integration, endpoint, true);

      return {
        provider: this.provider,
        trackingNumber,
        trackingType,
        events: this.normalizeTrackingEvents(response.events || response),
        currentStatus: this.extractCurrentStatus(response),
        rawData: response,
        fetchedAt: new Date(),
      };
    } catch (error) {
      this.logApiCall(integration, 'tracking', false, error);
      throw error;
    }
  }

  /**
   * Obtiene schedules
   */
  async getSchedules(integration, options = {}) {
    const { originPort, destinationPort, departureDate } = options;

    try {
      const tokenData = await this.getAccessToken(integration);
      const accessToken = tokenData.accessToken || tokenData;

      const params = new URLSearchParams();
      if (originPort) params.append('placeOfReceipt', originPort);
      if (destinationPort) params.append('placeOfDelivery', destinationPort);
      if (departureDate) params.append('departureDateTime', departureDate);

      const url = `${this.baseUrl}/schedules/v1/point-to-point?${params.toString()}`;

      const response = await this.request(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      this.logApiCall(integration, 'schedules', true);

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
   * Normaliza eventos de tracking
   */
  normalizeTrackingEvents(rawEvents) {
    if (!Array.isArray(rawEvents)) {
      rawEvents = [];
    }

    return rawEvents.map(event => ({
      eventType: event.eventType,
      eventCode: event.eventClassifierCode,
      eventDescription: event.description,
      eventDateTime: new Date(event.eventDateTime),
      location: event.location?.locationName,
      locationCode: event.location?.UNLocationCode,
      facility: event.location?.facilityName,
      vessel: event.transportCall?.vessel?.name,
      voyage: event.transportCall?.carrierVoyageNumber,
      rawData: event,
    }));
  }

  /**
   * Extrae estado actual del contenedor
   */
  extractCurrentStatus(response) {
    if (!response.events?.length) return null;

    const latestEvent = response.events.sort((a, b) => 
      new Date(b.eventDateTime) - new Date(a.eventDateTime)
    )[0];

    return {
      status: latestEvent.eventType,
      location: latestEvent.location?.locationName,
      dateTime: latestEvent.eventDateTime,
    };
  }

  /**
   * Normaliza schedules
   */
  normalizeSchedules(rawSchedules) {
    if (!Array.isArray(rawSchedules)) {
      rawSchedules = rawSchedules?.schedules || [];
    }

    return rawSchedules.map(schedule => ({
      vesselName: schedule.vesselName,
      vesselImo: schedule.vesselIMONumber,
      voyage: schedule.voyageNumber,
      service: schedule.serviceName,
      departurePort: schedule.departureLocation?.cityName,
      departurePortCode: schedule.departureLocation?.UNLocationCode,
      departureDate: schedule.departureDateTime,
      arrivalPort: schedule.arrivalLocation?.cityName,
      arrivalPortCode: schedule.arrivalLocation?.UNLocationCode,
      arrivalDate: schedule.arrivalDateTime,
      transitTime: schedule.transitTimeDays,
    }));
  }
}

module.exports = new MscService();
