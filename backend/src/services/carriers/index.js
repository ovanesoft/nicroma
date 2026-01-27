/**
 * Módulo de integraciones con navieras
 * Exporta todos los servicios y el gestor principal
 */

const maersk = require('./maersk');
const msc = require('./msc');
const cmaCgm = require('./cmacgm');
const hapagLloyd = require('./hapagLloyd');
const evergreen = require('./evergreen');

// Mapa de proveedores a servicios
const carrierServices = {
  MAERSK: maersk,
  MSC: msc,
  CMA_CGM: cmaCgm,
  HAPAG_LLOYD: hapagLloyd,
  EVERGREEN: evergreen,
};

// Información de cada naviera
const carrierInfo = {
  MAERSK: {
    code: 'MAERSK',
    name: 'Maersk',
    country: 'Dinamarca',
    logo: '/carriers/maersk.png',
    website: 'https://www.maersk.com',
    apiPortal: 'https://delivers.maersk.com/developer/',
    features: ['tracking', 'schedules', 'booking'],
    authType: 'oauth2',
    requiredFields: ['clientId', 'clientSecret'],
  },
  MSC: {
    code: 'MSC',
    name: 'MSC - Mediterranean Shipping Company',
    country: 'Suiza',
    logo: '/carriers/msc.png',
    website: 'https://www.msc.com',
    apiPortal: 'https://developerportal.msc.com/',
    features: ['tracking', 'schedules'],
    authType: 'oauth2',
    requiredFields: ['clientId', 'clientSecret'],
  },
  CMA_CGM: {
    code: 'CMA_CGM',
    name: 'CMA CGM',
    country: 'Francia',
    logo: '/carriers/cmacgm.png',
    website: 'https://www.cma-cgm.com',
    apiPortal: 'https://www.cma-cgm.com/products-services/ecommerce/edi-api-channels',
    features: ['tracking', 'schedules'],
    authType: 'oauth2',
    requiredFields: ['clientId', 'clientSecret'],
  },
  HAPAG_LLOYD: {
    code: 'HAPAG_LLOYD',
    name: 'Hapag-Lloyd',
    country: 'Alemania',
    logo: '/carriers/hapag-lloyd.png',
    website: 'https://www.hapag-lloyd.com',
    apiPortal: 'https://api-portal.hlag.com/',
    features: ['tracking', 'schedules', 'livePosition'],
    authType: 'oauth2',
    requiredFields: ['clientId', 'clientSecret'],
  },
  EVERGREEN: {
    code: 'EVERGREEN',
    name: 'Evergreen Line',
    country: 'Taiwán',
    logo: '/carriers/evergreen.png',
    website: 'https://www.evergreen-line.com',
    apiPortal: 'https://www.shipmentlink.com/_ec/APIPORTAL_Home',
    features: ['tracking', 'schedules'],
    authType: 'jwt',
    requiredFields: ['clientId', 'clientSecret'],
  },
};

/**
 * Obtiene el servicio correspondiente a un proveedor
 */
function getCarrierService(provider) {
  const service = carrierServices[provider];
  if (!service) {
    throw new Error(`Carrier service not found: ${provider}`);
  }
  return service;
}

/**
 * Obtiene información de un proveedor
 */
function getCarrierInfo(provider) {
  return carrierInfo[provider] || null;
}

/**
 * Lista todos los proveedores soportados
 */
function listCarriers() {
  return Object.values(carrierInfo);
}

/**
 * Verifica si un proveedor soporta una característica
 */
function carrierSupports(provider, feature) {
  const info = carrierInfo[provider];
  return info?.features?.includes(feature) || false;
}

module.exports = {
  // Servicios individuales
  maersk,
  msc,
  cmaCgm,
  hapagLloyd,
  evergreen,
  
  // Funciones de gestión
  getCarrierService,
  getCarrierInfo,
  listCarriers,
  carrierSupports,
  
  // Datos
  carrierServices,
  carrierInfo,
};
