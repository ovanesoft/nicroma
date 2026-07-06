const { generarCertificadoCarta } = require('./certificacionCarta');

/**
 * Certificación de Flete — formato carta dirigido a A.R.C.A. - D.G.A.
 * Los datos se toman de la carpeta, pero pueden pisarse con lo editado por el
 * usuario en carpeta.documentosData.certFlete.
 */
function generarCertificacionFlete(carpeta, tenant, bancoSeleccionado = null, logoBuffer = null) {
  const overrides = carpeta.documentosData?.certFlete || {};

  // Concepto según vía
  const esAereo = carpeta.area === 'Aéreo';
  const conceptoDefault = esAereo ? 'FLETE AEREO IMPORTACION' : 'FLETE MARITIMO IMPORTACION';

  // Importe default: suma de gastos cuyo concepto contiene FLETE
  const fletes = (carpeta.gastos || []).filter(g => {
    const c = (g.concepto || '').toUpperCase();
    return c.includes('FLETE') || c.includes('FREIGHT') || c.includes('OCEAN') || c.includes('AIR');
  });
  const importeDefault = fletes.reduce((s, g) => s + (g.totalVenta || 0), 0);

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
      'Por intermedio de la presente y a pedido del consignatario certificamos que el flete pagadero en Argentina correspondiente al HBL de referencia asciende al siguiente monto:',
    conceptos: overrides.conceptos?.length
      ? overrides.conceptos
      : [{ concepto: conceptoDefault, moneda: carpeta.moneda || 'USD', importe: importeDefault }],
    textoCierre: overrides.textoCierre ||
      'La presente se extiende a los fines de ser presentado ante la Dirección General de Aduanas.'
  };

  return generarCertificadoCarta({
    titulo: `Certificación de Flete - ${carpeta.houseBL || carpeta.numero}`,
    datos,
    tenant,
    logoBuffer
  });
}

module.exports = { generarCertificacionFlete };
