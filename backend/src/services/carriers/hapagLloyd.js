/**
 * Servicio de integración con Hapag-Lloyd API
 * Documentación: https://api-portal.hlag.com/
 */

const BaseCarrierService = require('./base');

class HapagLloydService extends BaseCarrierService {
  constructor() {
    super('HAPAG_LLOYD');
    this.baseUrl = 'https://api.hlag.com';
    this.authUrl = 'https://api.hlag.com/oauth2/token';
  }

  /**
   * Obtiene token de acceso OAuth2
   */
  async getAccessToken(integration) {
    const clientId = this.decrypt(integration.clientId);
    const clientSecret = this.decrypt(integration.clientSecret);

    if (!clientId || !clientSecret) {
      throw new Error('Missing Hapag-Lloyd credentials');
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
      this.logApiCall(integration, 'oauth2/token', false, error);
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
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Authentication failed: ${error}` };
      }

      return {
        success: true,
        message: 'Conexión exitosa con Hapag-Lloyd API',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Track & Trace API (DCSA Standard)
   * Documentación: https://doc.api-portal.hlag.com/02.products/track-and-trace/
   */
  async getTracking(integration, trackingNumber, trackingType = 'CONTAINER') {
    try {
      const tokenData = await this.getAccessToken(integration);
      const accessToken = tokenData.accessToken || tokenData;

      let endpoint = '/track/v1/events';
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
          'API-Version': '1',
        },
      });

      this.logApiCall(integration, endpoint, true);

      const events = this.normalizeTrackingEvents(response.events || response);

      return {
        provider: this.provider,
        trackingNumber,
        trackingType,
        events,
        currentStatus: this.extractCurrentStatus(events),
        eta: this.extractETA(events),
        vessel: this.extractVessel(events),
        rawData: response,
        fetchedAt: new Date(),
      };
    } catch (error) {
      this.logApiCall(integration, 'tracking', false, error);
      throw error;
    }
  }

  /**
   * Container Live Position API
   * Documentación: https://doc.api-portal.hlag.com/02.products/container-live-position/
   */
  async getLivePosition(integration, containerNumber) {
    try {
      const tokenData = await this.getAccessToken(integration);
      const accessToken = tokenData.accessToken || tokenData;

      const endpoint = `/container-live-position/v1/containers/${containerNumber}/position`;

      const response = await this.request(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'API-Version': '1',
        },
      });

      this.logApiCall(integration, endpoint, true);

      return {
        provider: this.provider,
        containerNumber,
        position: {
          latitude: response.latitude,
          longitude: response.longitude,
          timestamp: response.timestamp,
          accuracy: response.accuracy,
        },
        transportMode: response.transportMode,
        vessel: response.vesselName,
        voyage: response.voyageNumber,
        rawData: response,
        fetchedAt: new Date(),
      };
    } catch (error) {
      this.logApiCall(integration, 'live-position', false, error);
      throw error;
    }
  }

  /**
   * Obtiene schedules
   */
  async getSchedules(integration, options = {}) {
    const { originPort, destinationPort, departureDate, weeksOut = 4 } = options;

    try {
      const tokenData = await this.getAccessToken(integration);
      const accessToken = tokenData.accessToken || tokenData;

      const params = new URLSearchParams();
      if (originPort) params.append('placeOfReceipt', originPort);
      if (destinationPort) params.append('placeOfDelivery', destinationPort);
      
      const startDate = departureDate || new Date().toISOString().split('T')[0];
      params.append('startDate', startDate);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (weeksOut * 7));
      params.append('endDate', endDate.toISOString().split('T')[0]);

      const url = `${this.baseUrl}/schedule/v1/port-calls?${params.toString()}`;

      const response = await this.request(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'API-Version': '1',
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
   * Normaliza eventos de tracking (DCSA format)
   */
  normalizeTrackingEvents(rawEvents) {
    if (!Array.isArray(rawEvents)) {
      rawEvents = [];
    }

    return rawEvents.map(event => ({
      eventType: event.eventType,
      eventCode: event.eventClassifierCode,
      eventDescription: this.getEventDescription(event),
      eventDateTime: new Date(event.eventDateTime || event.eventCreatedDateTime),
      location: event.location?.locationName || event.location?.UNLocationCode,
      locationCode: event.location?.UNLocationCode,
      facility: event.location?.facilityName,
      vessel: event.transportCall?.vessel?.vesselName,
      vesselImo: event.transportCall?.vessel?.vesselIMONumber,
      voyage: event.transportCall?.carrierExportVoyageNumber || event.transportCall?.carrierVoyageNumber,
      rawData: event,
    })).sort((a, b) => new Date(b.eventDateTime) - new Date(a.eventDateTime));
  }

  /**
   * Genera descripción legible del evento
   */
  getEventDescription(event) {
    const descriptions = {
      // Transport events
      'ARRI': 'Vessel arrived at port',
      'DEPA': 'Vessel departed from port',
      // Equipment events
      'LOAD': 'Container loaded on vessel',
      'DISC': 'Container discharged from vessel',
      'GTIN': 'Container gated in at terminal',
      'GTOT': 'Container gated out from terminal',
      'STUF': 'Container stuffed',
      'STRP': 'Container stripped',
      // Shipment events
      'RECE': 'Shipment received',
      'DRFT': 'Draft BL',
      'CONF': 'Confirmed',
      'ISSU': 'BL issued',
      'RELE': 'Released',
    };

    return descriptions[event.eventClassifierCode] || 
           event.description || 
           `${event.eventType} - ${event.eventClassifierCode}`;
  }

  /**
   * Extrae estado actual
   */
  extractCurrentStatus(events) {
    if (!events?.length) return null;

    const latestEvent = events[0]; // Ya está ordenado por fecha desc

    return {
      status: latestEvent.eventDescription,
      statusCode: latestEvent.eventCode,
      location: latestEvent.location,
      dateTime: latestEvent.eventDateTime,
    };
  }

  /**
   * Extrae ETA
   */
  extractETA(events) {
    if (!events?.length) return null;

    // Buscar evento de arribo estimado
    const estimatedArrival = events.find(e =>
      e.rawData?.eventClassifierCode === 'PLN' ||
      e.rawData?.eventClassifierCode === 'EST'
    );

    if (estimatedArrival) {
      return estimatedArrival.eventDateTime;
    }

    return null;
  }

  /**
   * Extrae información del buque
   */
  extractVessel(events) {
    if (!events?.length) return null;

    const eventWithVessel = events.find(e => e.vessel);
    if (!eventWithVessel) return null;

    return {
      name: eventWithVessel.vessel,
      imo: eventWithVessel.vesselImo,
      voyage: eventWithVessel.voyage,
    };
  }

  /**
   * Normaliza schedules
   */
  normalizeSchedules(rawSchedules) {
    if (!Array.isArray(rawSchedules)) {
      rawSchedules = rawSchedules?.portCalls || rawSchedules?.schedules || [];
    }

    return rawSchedules.map(schedule => ({
      vesselName: schedule.vesselName || schedule.vessel?.vesselName,
      vesselImo: schedule.vesselIMONumber || schedule.vessel?.vesselIMONumber,
      voyage: schedule.carrierVoyageNumber || schedule.voyageNumber,
      service: schedule.serviceName || schedule.serviceCode,
      port: schedule.portName || schedule.location?.locationName,
      portCode: schedule.portCode || schedule.location?.UNLocationCode,
      terminal: schedule.terminalName,
      eta: schedule.estimatedArrivalDateTime || schedule.eta,
      etd: schedule.estimatedDepartureDateTime || schedule.etd,
      ata: schedule.actualArrivalDateTime || schedule.ata,
      atd: schedule.actualDepartureDateTime || schedule.atd,
    }));
  }
}

module.exports = new HapagLloydService();
