const { generarCertificadoCarta } = require('./certificacionCarta');

/**
 * Certificación de Gastos — mismo formato carta que la Certificación de Flete,
 * pero detallando todos los gastos de la operación.
 * Datos editables en carpeta.documentosData.certGastos.
 */
function generarCertificacionGastos(carpeta, tenant, bancoSeleccionado = null, logoBuffer = null) {
  const overrides = carpeta.documentosData?.certGastos || {};

  const gastos = carpeta.gastos || [];
  const conceptosDefault = gastos
    .filter(g => g.concepto)
    .map(g => ({
      concepto: (g.concepto || '').toUpperCase(),
      moneda: g.divisa || carpeta.moneda || 'USD',
      importe: g.totalVenta || 0
    }));

  const fechaHoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  const datos = {
    fechaTexto: overrides.fechaTexto || `CABA, ${fechaHoy}`,
    dirigidoA: overrides.dirigidoA || 'A.R.C.A.  -  D.G.A.',
    consignatario: overrides.consignatario ?? (carpeta.cliente?.razonSocial || carpeta.consignee?.razonSocial || '-'),
    cuit: overrides.cuit ?? (carpeta.cliente?.numeroDocumento || carpeta.consignee?.numeroDocumento || '-'),
    origen: overrides.origen ?? (carpeta.puertoOrigen || '-'),
    destino: overrides.destino ?? (carpeta.puertoDestino || '-'),
    incoterm: overrides.incoterm ?? (carpeta.incoterm || '-'),
    hbl: overrides.hbl ?? (carpeta.houseBL || '-'),
    buque: overrides.buque ?? (carpeta.buque || '-'),
    textoIntro: overrides.textoIntro ||
      'Por intermedio de la presente y a pedido del consignatario certificamos que los gastos pagaderos en Argentina correspondientes al HBL de referencia ascienden a los siguientes montos:',
    conceptos: overrides.conceptos?.length ? overrides.conceptos : conceptosDefault,
    textoCierre: overrides.textoCierre ||
      'La presente se extiende a los fines de ser presentado ante la Dirección General de Aduanas.'
  };

  return generarCertificadoCarta({
    titulo: `Certificación de Gastos - ${carpeta.houseBL || carpeta.numero}`,
    datos,
    tenant,
    logoBuffer
  });
}

module.exports = { generarCertificacionGastos };
