/**
 * Servicio de integración con Evergreen API (ShipmentLink)
 * Documentación: https://www.shipmentlink.com/_ec/APIPORTAL_Home
 */

const BaseCarrierService = require('./base');

class EvergreenService extends BaseCarrierService {
  constructor() {
    super('EVERGREEN');
    this.baseUrl = 'https://api.shipmentlink.com';
    this.authUrl = 'https://api.shipmentlink.com/oauth/token';
  }

  /**
   * Obtiene token JWT
   */
  async getAccessToken(integration) {
    const clientId = this.decrypt(integration.clientId);
    const clientSecret = this.decrypt(integration.clientSecret);

    if (!clientId || !clientSecret) {
      throw new Error('Missing Evergreen credentials');
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
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Auth failed: ${error}`);
      }

      const data = await response.json();

      return {
        accessToken: data.accessToken || data.token,
        expiresIn: data.expiresIn || 3600,
        tokenExpiresAt: new Date(Date.now() + ((data.expiresIn || 3600) * 1000)),
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
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Authentication failed: ${error}` };
      }

      return {
        success: true,
        message: 'Conexión exitosa con Evergreen API (ShipmentLink)',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Track & Trace API (DCSA Standard)
   */
  async getTracking(integration, trackingNumber, trackingType = 'CONTAINER') {
    try {
      const tokenData = await this.getAccessToken(integration);
      const accessToken = tokenData.accessToken || tokenData;

      let endpoint = '/api/v1/tnt/events';
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

      const events = this.normalizeTrackingEvents(response.events || response);

      return {
        provider: this.provider,
        trackingNumber,
        trackingType,
        events,
        currentStatus: this.extractCurrentStatus(events),
        eta: this.extractETA(response),
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
   * Obtiene schedules punto a punto
   */
  async getSchedules(integration, options = {}) {
    const { originPort, destinationPort, departureDate, weeksOut = 4 } = options;

    try {
      const tokenData = await this.getAccessToken(integration);
      const accessToken = tokenData.accessToken || tokenData;

      const params = new URLSearchParams();
      if (originPort) params.append('pol', originPort);
      if (destinationPort) params.append('pod', destinationPort);
      
      const startDate = departureDate || new Date().toISOString().split('T')[0];
      params.append('departureStartDate', startDate);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (weeksOut * 7));
      params.append('departureEndDate', endDate.toISOString().split('T')[0]);

      const url = `${this.baseUrl}/api/v1/schedules/point-to-point?${params.toString()}`;

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
   * Obtiene schedules por puerto
   */
  async getPortSchedules(integration, portCode, options = {}) {
    const { startDate, endDate, vessel } = options;

    try {
      const tokenData = await this.getAccessToken(integration);
      const accessToken = tokenData.accessToken || tokenData;

      const params = new URLSearchParams();
      params.append('portCode', portCode);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (vessel) params.append('vesselName', vessel);

      const url = `${this.baseUrl}/api/v1/schedules/port?${params.toString()}`;

      const response = await this.request(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      this.logApiCall(integration, 'port-schedules', true);

      return {
        provider: this.provider,
        portCode,
        schedules: this.normalizePortSchedules(response),
        rawData: response,
        fetchedAt: new Date(),
      };
    } catch (error) {
      this.logApiCall(integration, 'port-schedules', false, error);
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
      facility: event.location?.facilityName || event.facilityCode,
      vessel: event.transportCall?.vessel?.vesselName || event.vesselName,
      vesselImo: event.transportCall?.vessel?.vesselIMONumber,
      voyage: event.transportCall?.carrierVoyageNumber || event.voyageNumber,
      rawData: event,
    })).sort((a, b) => new Date(b.eventDateTime) - new Date(a.eventDateTime));
  }

  /**
   * Genera descripción legible del evento
   */
  getEventDescription(event) {
    const descriptions = {
      // Transport events
      'ARRI': 'Vessel arrived',
      'DEPA': 'Vessel departed',
      // Equipment events
      'LOAD': 'Loaded on vessel',
      'DISC': 'Discharged from vessel',
      'GTIN': 'Gate in',
      'GTOT': 'Gate out',
      'STUF': 'Stuffed',
      'STRP': 'Stripped',
      'PICK': 'Picked up',
      'DROP': 'Dropped off',
      'INSP': 'Inspected',
      'SEAL': 'Sealed',
      // Shipment events
      'RECE': 'Received',
      'DRFT': 'Draft',
      'CONF': 'Confirmed',
      'ISSU': 'Issued',
      'RELE': 'Released',
      'SURR': 'Surrendered',
    };

    return descriptions[event.eventClassifierCode] ||
           event.description ||
           `${event.eventType || ''} ${event.eventClassifierCode || ''}`.trim();
  }

  /**
   * Extrae estado actual
   */
  extractCurrentStatus(events) {
    if (!events?.length) return null;

    const latestEvent = events[0];

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
  extractETA(response) {
    // Buscar en datos adicionales de la respuesta
    if (response.estimatedArrival) {
      return new Date(response.estimatedArrival);
    }

    if (response.eta) {
      return new Date(response.eta);
    }

    // Buscar en eventos estimados
    const events = response.events || [];
    const estimatedArrival = events.find(e =>
      (e.eventClassifierCode === 'PLN' || e.eventClassifierCode === 'EST') &&
      e.eventType === 'TRANSPORT'
    );

    return estimatedArrival?.eventDateTime || null;
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
   * Normaliza schedules punto a punto
   */
  normalizeSchedules(rawSchedules) {
    if (!Array.isArray(rawSchedules)) {
      rawSchedules = rawSchedules?.schedules || rawSchedules?.routings || [];
    }

    return rawSchedules.map(schedule => ({
      routingId: schedule.routingId,
      vesselName: schedule.vesselName || schedule.vessel?.vesselName,
      vesselImo: schedule.vesselIMONumber || schedule.vessel?.vesselIMONumber,
      voyage: schedule.voyageNumber || schedule.carrierVoyageNumber,
      service: schedule.serviceName || schedule.serviceCode,
      departurePort: schedule.pol?.portName || schedule.placeOfLoading?.locationName,
      departurePortCode: schedule.pol?.unlocode || schedule.placeOfLoading?.UNLocationCode,
      departureDate: schedule.etd || schedule.departureDateTime,
      arrivalPort: schedule.pod?.portName || schedule.placeOfDischarge?.locationName,
      arrivalPortCode: schedule.pod?.unlocode || schedule.placeOfDischarge?.UNLocationCode,
      arrivalDate: schedule.eta || schedule.arrivalDateTime,
      transitTime: schedule.transitTimeDays || schedule.transitTime,
      transhipments: schedule.transhipments || 0,
      cutoffDoc: schedule.cutoffDoc || schedule.documentationCutoff,
      cutoffCargo: schedule.cutoffCargo || schedule.cargoCutoff,
    }));
  }

  /**
   * Normaliza schedules por puerto
   */
  normalizePortSchedules(rawSchedules) {
    if (!Array.isArray(rawSchedules)) {
      rawSchedules = rawSchedules?.portCalls || rawSchedules?.schedules || [];
    }

    return rawSchedules.map(schedule => ({
      vesselName: schedule.vesselName || schedule.vessel?.vesselName,
      vesselImo: schedule.vesselIMONumber,
      voyage: schedule.voyageNumber,
      service: schedule.serviceName || schedule.serviceCode,
      port: schedule.portName || schedule.location?.locationName,
      portCode: schedule.portCode || schedule.location?.UNLocationCode,
      terminal: schedule.terminalName || schedule.terminal,
      eta: schedule.eta || schedule.estimatedArrival,
      etd: schedule.etd || schedule.estimatedDeparture,
      ata: schedule.ata || schedule.actualArrival,
      atd: schedule.atd || schedule.actualDeparture,
      berthNumber: schedule.berthNumber,
    }));
  }
}

module.exports = new EvergreenService();
