/**
 * Servicio de integración con CMA CGM API
 * Documentación: https://www.cma-cgm.com/products-services/ecommerce/edi-api-channels
 */

const BaseCarrierService = require('./base');

class CmaCgmService extends BaseCarrierService {
  constructor() {
    super('CMA_CGM');
    this.baseUrl = 'https://apis.cma-cgm.net';
    this.authUrl = 'https://apis.cma-cgm.net/oauth/token';
  }

  /**
   * Obtiene token de acceso OAuth2
   */
  async getAccessToken(integration) {
    const clientId = this.decrypt(integration.clientId);
    const clientSecret = this.decrypt(integration.clientSecret);

    if (!clientId || !clientSecret) {
      throw new Error('Missing CMA CGM credentials');
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
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Authentication failed: ${error}` };
      }

      return { 
        success: true, 
        message: 'Conexión exitosa con CMA CGM API',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Track & Trace - DCSA Standard
   */
  async getTracking(integration, trackingNumber, trackingType = 'CONTAINER') {
    try {
      const tokenData = await this.getAccessToken(integration);
      const accessToken = tokenData.accessToken || tokenData;

      let endpoint = '/trackandtrace/v1/events';
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

      // Agregar filtros para obtener todos los tipos de eventos
      params.append('eventType', 'SHIPMENT,TRANSPORT,EQUIPMENT');

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
        eta: this.extractETA(response),
        rawData: response,
        fetchedAt: new Date(),
      };
    } catch (error) {
      this.logApiCall(integration, 'tracking', false, error);
      throw error;
    }
  }

  /**
   * Obtiene schedules punto a punto
   */
  async getSchedules(integration, options = {}) {
    const { originPort, destinationPort, departureDate, weeksOut = 4 } = options;

    try {
      const tokenData = await this.getAccessToken(integration);
      const accessToken = tokenData.accessToken || tokenData;

      const params = new URLSearchParams();
      if (originPort) params.append('placeOfLoading', originPort);
      if (destinationPort) params.append('placeOfDischarge', destinationPort);
      if (departureDate) {
        params.append('dateFrom', departureDate);
        const dateTo = new Date(departureDate);
        dateTo.setDate(dateTo.getDate() + (weeksOut * 7));
        params.append('dateTo', dateTo.toISOString().split('T')[0]);
      }

      const url = `${this.baseUrl}/schedule/v1/portSchedules?${params.toString()}`;

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
      facility: event.location?.facilityName || event.location?.facilityCode,
      vessel: event.transportCall?.vessel?.vesselName,
      voyage: event.transportCall?.exportVoyageNumber || event.transportCall?.carrierVoyageNumber,
      rawData: event,
    }));
  }

  /**
   * Genera descripción legible del evento
   */
  getEventDescription(event) {
    const typeMap = {
      'SHIPMENT': {
        'RECE': 'Received',
        'DRFT': 'Draft',
        'PENA': 'Pending Approval',
        'PENU': 'Pending Update',
        'REJE': 'Rejected',
        'APPR': 'Approved',
        'ISSU': 'Issued',
        'SURR': 'Surrendered',
        'SUBM': 'Submitted',
        'VOID': 'Void',
        'CONF': 'Confirmed',
        'REFU': 'Refusal',
        'DECL': 'Declined',
      },
      'TRANSPORT': {
        'ARRI': 'Arrived',
        'DEPA': 'Departed',
      },
      'EQUIPMENT': {
        'LOAD': 'Loaded',
        'DISC': 'Discharged',
        'GTIN': 'Gate in',
        'GTOT': 'Gate out',
        'STUF': 'Stuffed',
        'STRP': 'Stripped',
        'PICK': 'Picked up',
        'DROP': 'Dropped off',
        'INSP': 'Inspected',
        'RSEA': 'Resealed',
        'RMVD': 'Removed',
      },
    };

    const eventType = event.eventType;
    const classifier = event.eventClassifierCode;

    if (typeMap[eventType]?.[classifier]) {
      return typeMap[eventType][classifier];
    }

    return event.description || `${eventType} - ${classifier}`;
  }

  /**
   * Extrae estado actual
   */
  extractCurrentStatus(response) {
    const events = response.events || response;
    if (!events?.length) return null;

    const latestEvent = events.sort((a, b) =>
      new Date(b.eventDateTime || b.eventCreatedDateTime) - 
      new Date(a.eventDateTime || a.eventCreatedDateTime)
    )[0];

    return {
      status: this.getEventDescription(latestEvent),
      location: latestEvent.location?.locationName || latestEvent.location?.UNLocationCode,
      dateTime: latestEvent.eventDateTime || latestEvent.eventCreatedDateTime,
    };
  }

  /**
   * Extrae ETA si está disponible
   */
  extractETA(response) {
    // Buscar eventos futuros estimados
    const events = response.events || response;
    if (!events?.length) return null;

    const estimatedArrival = events.find(e => 
      e.eventClassifierCode === 'EST' && 
      e.eventType === 'TRANSPORT' &&
      e.transportEventTypeCode === 'ARRI'
    );

    return estimatedArrival?.eventDateTime || null;
  }

  /**
   * Normaliza schedules
   */
  normalizeSchedules(rawSchedules) {
    if (!Array.isArray(rawSchedules)) {
      rawSchedules = rawSchedules?.schedules || rawSchedules?.portSchedules || [];
    }

    return rawSchedules.map(schedule => ({
      vesselName: schedule.vesselName || schedule.vessel?.vesselName,
      vesselImo: schedule.vesselIMONumber || schedule.vessel?.vesselIMONumber,
      voyage: schedule.carrierVoyageNumber || schedule.voyageNumber,
      service: schedule.serviceName,
      departurePort: schedule.placeOfLoading?.facilityName || schedule.placeOfLoading,
      departurePortCode: schedule.placeOfLoading?.UNLocationCode,
      departureDate: schedule.departureDateTime || schedule.estimatedDepartureDate,
      arrivalPort: schedule.placeOfDischarge?.facilityName || schedule.placeOfDischarge,
      arrivalPortCode: schedule.placeOfDischarge?.UNLocationCode,
      arrivalDate: schedule.arrivalDateTime || schedule.estimatedArrivalDate,
      transitTime: schedule.transitTimeDays,
    }));
  }
}

module.exports = new CmaCgmService();
