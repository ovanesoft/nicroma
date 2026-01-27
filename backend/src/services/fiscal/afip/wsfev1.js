/**
 * WSFEv1 - Web Service de Factura Electrónica v1 de AFIP
 * 
 * Este servicio maneja la emisión de comprobantes fiscales electrónicos.
 */

const soap = require('soap');
const wsaa = require('./wsaa');

// URLs de WSFE
const WSFE_URLS = {
  PRODUCTION: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL',
  TESTING: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
};

// Tipos de comprobante
const TIPOS_COMPROBANTE = {
  1: 'Factura A',
  2: 'Nota de Débito A',
  3: 'Nota de Crédito A',
  6: 'Factura B',
  7: 'Nota de Débito B',
  8: 'Nota de Crédito B',
  11: 'Factura C',
  12: 'Nota de Débito C',
  13: 'Nota de Crédito C',
  51: 'Factura M',
  52: 'Nota de Débito M',
  53: 'Nota de Crédito M',
  201: 'Factura de Crédito Electrónica MiPyMEs (FCE) A',
  206: 'Factura de Crédito Electrónica MiPyMEs (FCE) B',
  211: 'Factura de Crédito Electrónica MiPyMEs (FCE) C',
};

// Tipos de documento
const TIPOS_DOCUMENTO = {
  80: 'CUIT',
  86: 'CUIL',
  87: 'CDI',
  89: 'LE',
  90: 'LC',
  91: 'CI Extranjera',
  92: 'En trámite',
  93: 'Acta Nacimiento',
  94: 'Pasaporte',
  95: 'CI Bs. As. RNP',
  96: 'DNI',
  99: 'Sin identificar/consumidor final',
  0: 'CI Policía Federal',
  1: 'CI Buenos Aires',
  2: 'CI Catamarca',
  3: 'CI Córdoba',
  4: 'CI Corrientes',
  5: 'CI Entre Ríos',
  6: 'CI Jujuy',
  7: 'CI Mendoza',
  8: 'CI La Rioja',
  9: 'CI Salta',
  10: 'CI San Juan',
  11: 'CI San Luis',
  12: 'CI Santa Fe',
  13: 'CI Santiago del Estero',
  14: 'CI Tucumán',
  16: 'CI Chaco',
  17: 'CI Chubut',
  18: 'CI Formosa',
  19: 'CI Misiones',
  20: 'CI Neuquén',
  21: 'CI La Pampa',
  22: 'CI Río Negro',
  23: 'CI Santa Cruz',
  24: 'CI Tierra del Fuego',
};

// Alícuotas de IVA
const ALICUOTAS_IVA = {
  3: { descripcion: 'IVA 0%', valor: 0 },
  4: { descripcion: 'IVA 10.5%', valor: 10.5 },
  5: { descripcion: 'IVA 21%', valor: 21 },
  6: { descripcion: 'IVA 27%', valor: 27 },
  8: { descripcion: 'IVA 5%', valor: 5 },
  9: { descripcion: 'IVA 2.5%', valor: 2.5 },
};

class WSFEv1Service {
  constructor() {
    this.client = null;
    this.lastWsdlUrl = null;
  }

  /**
   * Obtiene el cliente SOAP
   */
  async getClient(environment) {
    const wsdlUrl = environment === 'PRODUCTION' ? WSFE_URLS.PRODUCTION : WSFE_URLS.TESTING;
    
    if (!this.client || this.lastWsdlUrl !== wsdlUrl) {
      this.client = await soap.createClientAsync(wsdlUrl);
      this.lastWsdlUrl = wsdlUrl;
    }
    
    return this.client;
  }

  /**
   * Construye el header de autenticación
   */
  buildAuth(token, sign, cuit) {
    return {
      Token: token,
      Sign: sign,
      Cuit: cuit.replace(/-/g, ''),
    };
  }

  /**
   * Maneja errores de AFIP
   */
  handleError(result, methodName) {
    if (result.Errors?.Err) {
      const errors = Array.isArray(result.Errors.Err) 
        ? result.Errors.Err 
        : [result.Errors.Err];
      
      const errorMessages = errors.map(e => `[${e.Code}] ${e.Msg}`).join('; ');
      throw new Error(`Error AFIP en ${methodName}: ${errorMessages}`);
    }
  }

  /**
   * FECompUltimoAutorizado - Obtiene el último número de comprobante autorizado
   * 
   * @param {Object} config - Configuración fiscal
   * @param {Object} credentials - Token y Sign de WSAA
   * @param {number} puntoVenta - Número de punto de venta
   * @param {number} tipoComprobante - Tipo de comprobante
   * @returns {number} Último número autorizado
   */
  async getUltimoAutorizado(config, credentials, puntoVenta, tipoComprobante) {
    const client = await this.getClient(config.environment);
    
    const params = {
      Auth: this.buildAuth(credentials.token, credentials.sign, config.cuit),
      PtoVta: puntoVenta,
      CbteTipo: tipoComprobante,
    };

    const result = await client.FECompUltimoAutorizadoAsync(params);
    const response = result[0]?.FECompUltimoAutorizadoResult;
    
    this.handleError(response, 'FECompUltimoAutorizado');
    
    return response.CbteNro || 0;
  }

  /**
   * FECAESolicitar - Solicita CAE para un comprobante
   * 
   * @param {Object} config - Configuración fiscal
   * @param {Object} credentials - Token y Sign de WSAA
   * @param {Object} comprobante - Datos del comprobante
   * @returns {Object} Respuesta de AFIP con CAE
   */
  async solicitarCAE(config, credentials, comprobante) {
    const client = await this.getClient(config.environment);

    // Obtener próximo número de comprobante
    const ultimoNro = await this.getUltimoAutorizado(
      config, 
      credentials, 
      comprobante.puntoVenta, 
      comprobante.tipoComprobante
    );
    const nroComprobante = ultimoNro + 1;

    // Formatear fecha
    const formatFecha = (date) => {
      if (!date) return null;
      const d = new Date(date);
      return d.toISOString().slice(0, 10).replace(/-/g, '');
    };

    // Construir detalle del comprobante
    const detalle = {
      Concepto: comprobante.concepto || 1, // 1=Productos, 2=Servicios, 3=Ambos
      DocTipo: comprobante.tipoDocReceptor || 80, // 80=CUIT
      DocNro: (comprobante.nroDocReceptor || '').replace(/-/g, ''),
      CbteDesde: nroComprobante,
      CbteHasta: nroComprobante,
      CbteFch: formatFecha(comprobante.fecha || new Date()),
      ImpTotal: comprobante.importeTotal,
      ImpTotConc: comprobante.importeNoGravado || 0,
      ImpNeto: comprobante.importeNeto,
      ImpOpEx: comprobante.importeExento || 0,
      ImpIVA: comprobante.importeIVA,
      ImpTrib: comprobante.importeTributos || 0,
      MonId: comprobante.moneda || 'PES',
      MonCotiz: comprobante.cotizacion || 1,
    };

    // Agregar fechas de servicio si es necesario (concepto 2 o 3)
    if (comprobante.concepto >= 2) {
      detalle.FchServDesde = formatFecha(comprobante.fechaServicioDesde || comprobante.fecha);
      detalle.FchServHasta = formatFecha(comprobante.fechaServicioHasta || comprobante.fecha);
      detalle.FchVtoPago = formatFecha(comprobante.fechaVencimiento || comprobante.fecha);
    }

    // Agregar IVA si corresponde
    if (comprobante.iva && comprobante.iva.length > 0) {
      detalle.Iva = {
        AlicIva: comprobante.iva.map(item => ({
          Id: item.id, // ID de alícuota (5=21%, 4=10.5%, etc)
          BaseImp: item.baseImponible,
          Importe: item.importe,
        })),
      };
    }

    // Agregar tributos si hay
    if (comprobante.tributos && comprobante.tributos.length > 0) {
      detalle.Tributos = {
        Tributo: comprobante.tributos.map(t => ({
          Id: t.id,
          Desc: t.descripcion,
          BaseImp: t.baseImponible,
          Alic: t.alicuota,
          Importe: t.importe,
        })),
      };
    }

    // Comprobantes asociados (para notas de crédito/débito)
    if (comprobante.comprobantesAsociados && comprobante.comprobantesAsociados.length > 0) {
      detalle.CbtesAsoc = {
        CbteAsoc: comprobante.comprobantesAsociados.map(ca => ({
          Tipo: ca.tipo,
          PtoVta: ca.puntoVenta,
          Nro: ca.numero,
          Cuit: ca.cuit?.replace(/-/g, ''),
          CbteFch: formatFecha(ca.fecha),
        })),
      };
    }

    const params = {
      Auth: this.buildAuth(credentials.token, credentials.sign, config.cuit),
      FeCAEReq: {
        FeCabReq: {
          CantReg: 1,
          PtoVta: comprobante.puntoVenta,
          CbteTipo: comprobante.tipoComprobante,
        },
        FeDetReq: {
          FECAEDetRequest: detalle,
        },
      },
    };

    const result = await client.FECAESolicitarAsync(params);
    const response = result[0]?.FECAESolicitarResult;
    
    // Verificar errores generales
    this.handleError(response, 'FECAESolicitar');

    // Obtener detalle de respuesta
    const detResponse = response.FeDetResp?.FECAEDetResponse;
    if (!detResponse) {
      throw new Error('Respuesta vacía de AFIP');
    }

    // Verificar resultado del comprobante
    if (detResponse.Resultado === 'R') {
      const observaciones = detResponse.Observaciones?.Obs;
      const obsArray = Array.isArray(observaciones) ? observaciones : [observaciones];
      const obsMessages = obsArray.filter(Boolean).map(o => `[${o.Code}] ${o.Msg}`).join('; ');
      throw new Error(`Comprobante rechazado: ${obsMessages || 'Sin detalles'}`);
    }

    return {
      resultado: detResponse.Resultado,
      cae: detResponse.CAE,
      caeVencimiento: this.parseAFIPDate(detResponse.CAEFchVto),
      numeroComprobante: nroComprobante,
      puntoVenta: comprobante.puntoVenta,
      tipoComprobante: comprobante.tipoComprobante,
      numeroCompleto: this.formatNumeroCompleto(comprobante.puntoVenta, nroComprobante),
      observaciones: detResponse.Observaciones?.Obs,
      reproceso: response.Reproceso,
    };
  }

  /**
   * FEParamGetTiposCbte - Obtiene tipos de comprobantes disponibles
   */
  async getTiposComprobante(config, credentials) {
    const client = await this.getClient(config.environment);
    
    const params = {
      Auth: this.buildAuth(credentials.token, credentials.sign, config.cuit),
    };

    const result = await client.FEParamGetTiposCbteAsync(params);
    const response = result[0]?.FEParamGetTiposCbteResult;
    
    this.handleError(response, 'FEParamGetTiposCbte');
    
    return response.ResultGet?.CbteTipo || [];
  }

  /**
   * FEParamGetPtosVenta - Obtiene puntos de venta habilitados
   */
  async getPuntosVenta(config, credentials) {
    const client = await this.getClient(config.environment);
    
    const params = {
      Auth: this.buildAuth(credentials.token, credentials.sign, config.cuit),
    };

    const result = await client.FEParamGetPtosVentaAsync(params);
    const response = result[0]?.FEParamGetPtosVentaResult;
    
    this.handleError(response, 'FEParamGetPtosVenta');
    
    return response.ResultGet?.PtoVenta || [];
  }

  /**
   * FECompConsultar - Consulta un comprobante emitido
   */
  async consultarComprobante(config, credentials, puntoVenta, tipoComprobante, numero) {
    const client = await this.getClient(config.environment);
    
    const params = {
      Auth: this.buildAuth(credentials.token, credentials.sign, config.cuit),
      FeCompConsReq: {
        CbteTipo: tipoComprobante,
        CbteNro: numero,
        PtoVta: puntoVenta,
      },
    };

    const result = await client.FECompConsultarAsync(params);
    const response = result[0]?.FECompConsultarResult;
    
    this.handleError(response, 'FECompConsultar');
    
    return response.ResultGet;
  }

  /**
   * FEDummy - Verifica estado de los servicios de AFIP
   */
  async checkServerStatus(environment = 'TESTING') {
    const client = await this.getClient(environment);
    
    const result = await client.FEDummyAsync({});
    const response = result[0]?.FEDummyResult;
    
    return {
      appServer: response?.AppServer,
      dbServer: response?.DbServer,
      authServer: response?.AuthServer,
      allOnline: response?.AppServer === 'OK' && 
                 response?.DbServer === 'OK' && 
                 response?.AuthServer === 'OK',
    };
  }

  /**
   * Parsea fecha de AFIP (YYYYMMDD) a Date
   */
  parseAFIPDate(dateStr) {
    if (!dateStr) return null;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
  }

  /**
   * Formatea número completo de comprobante
   */
  formatNumeroCompleto(puntoVenta, numero) {
    return `${String(puntoVenta).padStart(5, '0')}-${String(numero).padStart(8, '0')}`;
  }

  /**
   * Genera el código QR para el comprobante (según RG 4291)
   */
  generateQRData(comprobante, config) {
    const data = {
      ver: 1,
      fecha: comprobante.fechaComprobante,
      cuit: config.cuit.replace(/-/g, ''),
      ptoVta: comprobante.puntoVenta,
      tipoCmp: comprobante.tipoComprobante,
      nroCmp: comprobante.numeroComprobante,
      importe: comprobante.importeTotal,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: comprobante.tipoDocReceptor,
      nroDocRec: comprobante.nroDocReceptor.replace(/-/g, ''),
      tipoCodAut: 'E', // E=CAE
      codAut: comprobante.cae,
    };

    const jsonStr = JSON.stringify(data);
    const base64 = Buffer.from(jsonStr).toString('base64');
    
    return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
  }
}

// Exportar instancia y constantes
module.exports = {
  service: new WSFEv1Service(),
  TIPOS_COMPROBANTE,
  TIPOS_DOCUMENTO,
  ALICUOTAS_IVA,
};
