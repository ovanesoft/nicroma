const PDFDocument = require('pdfkit');
const { drawTenantLogo } = require('./pdfHelpers');

/**
 * Genera un certificado formato carta (Certificación de Flete o de Gastos)
 * según el modelo requerido: dirigido a A.R.C.A. - D.G.A., con bloque de
 * referencia, texto de certificación, conceptos con montos y firma del tenant.
 *
 * @param {Object} opts
 * @param {string} opts.titulo - Título del documento (para metadata PDF)
 * @param {Object} opts.datos - Datos editables del certificado:
 *   { fechaTexto, dirigidoA, consignatario, cuit, origen, destino, incoterm,
 *     hbl, buque, textoIntro, conceptos: [{ concepto, moneda, importe }], textoCierre }
 * @param {Object} opts.tenant - Tenant (para firma y logo)
 * @param {Buffer|null} opts.logoBuffer - Logo decodificado
 */
function generarCertificadoCarta({ titulo, datos, tenant, logoBuffer }) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 60,
    info: {
      Title: titulo,
      Author: tenant?.name || 'Sistema',
      Subject: titulo
    }
  });

  const textColor = '#1a1a1a';

  const formatImporte = (v) => {
    if (v == null || v === '') return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(v);
  };

  // ============ Logo arriba ============
  const logoInfo = drawTenantLogo(doc, logoBuffer, {
    right: 60, top: 40, maxWidth: 110, maxHeight: 55
  });

  let y = logoInfo.drawn ? 110 : 70;

  // ============ Fecha ============
  doc.fontSize(10).fillColor(textColor).font('Helvetica');
  doc.text(datos.fechaTexto, 60, y, { align: 'right', width: doc.page.width - 120 });
  y += 40;

  // ============ Destinatario ============
  doc.font('Helvetica-Bold').text('Señores:', 60, y);
  doc.font('Helvetica').text(datos.dirigidoA || 'A.R.C.A.  -  D.G.A.', 140, y);
  y += 30;

  // ============ Referencia ============
  doc.font('Helvetica-BoldOblique').text('Referencia:', 60, y, { underline: true });
  y += 18;

  const refRows = [
    ['Consignatario:', datos.consignatario],
    ['CUIT', datos.cuit],
    ['Origen:', datos.origen],
    ['Destino:', datos.destino],
    ['Incoterm:', datos.incoterm],
    ['HBL:', datos.hbl],
    ['Buque:', datos.buque]
  ];

  refRows.forEach(([label, value]) => {
    if (value == null || value === '') return;
    doc.font('Helvetica').fontSize(10).fillColor(textColor);
    const h = doc.heightOfString(String(value), { width: 380 });
    doc.text(label, 60, y);
    doc.text(String(value), 150, y, { width: 380 });
    y += Math.max(h, 12) + 3;
  });

  y += 25;

  // ============ Cuerpo ============
  doc.font('Helvetica').fontSize(10);
  doc.text('De nuestra mayor consideración:', 60, y);
  y += 18;

  const intro = datos.textoIntro ||
    'Por intermedio de la presente y a pedido del consignatario certificamos que el flete pagadero en Argentina correspondiente al HBL de referencia asciende al siguiente monto:';
  doc.text(intro, 60, y, { width: doc.page.width - 120, align: 'justify' });
  y += doc.heightOfString(intro, { width: doc.page.width - 120 }) + 30;

  // ============ Conceptos ============
  (datos.conceptos || []).forEach(c => {
    doc.font('Helvetica').fontSize(10).fillColor(textColor);
    const h = doc.heightOfString(c.concepto || '', { width: 300 });
    doc.text(c.concepto || '', 60, y, { width: 300 });
    doc.text(c.moneda || 'USD', 400, y);
    doc.text(formatImporte(c.importe), 450, y, { width: 85, align: 'right' });
    y += Math.max(h, 12) + 6;
  });

  y += 40;

  // ============ Cierre ============
  const cierre = datos.textoCierre ||
    'La presente se extiende a los fines de ser presentado ante la Dirección General de Aduanas.';
  doc.font('Helvetica').fontSize(10);
  doc.text(cierre, 60, y, { width: doc.page.width - 120 });
  y += doc.heightOfString(cierre, { width: doc.page.width - 120 }) + 8;
  doc.text('Sin otro particular, saludamos muy atentamente.', 60, y);
  y += 80;

  // ============ Firma ============
  doc.moveTo(340, y).lineTo(535, y).strokeColor('#333').lineWidth(0.7).stroke();
  y += 8;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text(tenant?.name?.toUpperCase() || '', 340, y, { width: 195, align: 'center' });

  return doc;
}

module.exports = { generarCertificadoCarta };
