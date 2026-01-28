/**
 * Módulo de Billing
 * Exporta todos los servicios relacionados con facturación y suscripciones
 */

const mercadopago = require('./mercadopago');
const subscriptions = require('./subscriptions');

module.exports = {
  mercadopago,
  subscriptions,
};
