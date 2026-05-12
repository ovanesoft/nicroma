const PDFDocument = require('pdfkit');

/**
 * Genera un PDF de Air Waybill (AWB) — formato genérico tipo "house" para carga aérea.
 * Para AWBs oficiales de cada aerolínea se debe usar la integración correspondiente.
 *
 * @param {Object} carpeta - Datos completos de la carpeta con relaciones
 * @param {Object} tenant - Datos del tenant (forwarder)
 * @returns {PDFDocument} - Documento PDF
 */
function generarAirWaybill(carpeta, tenant) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 30,
    info: {
      Title: `Air Waybill - ${carpeta.houseBL || carpeta.numero}`,
      Author: tenant?.name || 'Sistema',
      Subject: 'Air Waybill (HAWB)'
    }
  });

  const primaryColor = '#7c2d12';
  const accentBg = '#fff7ed';
  const borderColor = '#94a3b8';
  const textColor = '#1c1917';
  const lightText = '#57534e';

  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  };

  const formatNumber = (v) => {
    if (v == null || v === '') return '-';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(v);
  };

  const totalBultos = carpeta.mercancias?.reduce((s, m) => s + (m.bultos || 0), 0) || 0;
  const totalVolumen = carpeta.mercancias?.reduce((s, m) => s + (m.volumen || 0), 0) || 0;
  const totalPeso = carpeta.mercancias?.reduce((s, m) => s + (m.peso || 0), 0) || 0;
  const descripcionMercaderia = carpeta.mercancias?.map(m => m.descripcion).filter(Boolean).join(', ') || '-';
  // Peso volumétrico para aéreo: vol(m³) × 167 = chargeable weight
  const pesoVolumetrico = totalVolumen * 167;
  const chargeableWeight = Math.max(totalPeso, pesoVolumetrico);

  // ============ ENCABEZADO ============
  doc.rect(30, 30, 535, 50).fill(accentBg).stroke();
  doc.fontSize(22).fillColor(primaryColor).font('Helvetica-Bold');
  doc.text('AIR WAYBILL', 40, 38);
  doc.fontSize(8).fillColor(lightText).font('Helvetica');
  doc.text('HAWB - HOUSE AIR WAYBILL', 40, 60);

  doc.fontSize(10).fillColor(textColor).font('Helvetica-Bold');
  doc.text('HAWB No:', 380, 40);
  doc.fontSize(13).fillColor(primaryColor);
  doc.text(carpeta.houseBL || carpeta.numero, 380, 53);

  if (carpeta.masterBL) {
    doc.fontSize(8).font('Helvetica').fillColor(lightText);
    doc.text(`MAWB: ${carpeta.masterBL}`, 380, 70);
  }

  // ============ Issuing Carrier / Forwarder ============
  let y = 90;
  doc.rect(30, y, 535, 16).fill(accentBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
  doc.text('ISSUING CARRIER / AGENT', 35, y + 4);
  y += 20;

  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10);
  doc.text(tenant?.name || '-', 35, y);
  y += 12;
  doc.font('Helvetica').fontSize(8).fillColor(lightText);
  if (tenant?.companyAddress) {
    doc.text(tenant.companyAddress, 35, y, { width: 525 });
    y += 12;
  }
  const contactLine = [tenant?.companyPhone, tenant?.companyEmail].filter(Boolean).join(' | ');
  if (contactLine) {
    doc.text(contactLine, 35, y);
    y += 12;
  }

  // ============ Shipper / Consignee ============
  y += 5;
  const colW = (535 - 5) / 2;
  const drawPartyBox = (title, party, x, yStart, w, h) => {
    doc.rect(x, yStart, w, 14).fill(accentBg).stroke();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8);
    doc.text(title, x + 5, yStart + 3);
    doc.rect(x, yStart + 14, w, h - 14).strokeColor(borderColor).stroke();

    let py = yStart + 18;
    doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9);
    doc.text(party?.razonSocial || '-', x + 5, py, { width: w - 10 });
    py += 12;
    doc.font('Helvetica').fontSize(8).fillColor(lightText);
    if (party?.numeroDocumento) {
      doc.text(`Tax ID: ${party.numeroDocumento}`, x + 5, py, { width: w - 10 });
      py += 10;
    }
    if (party?.direccion || party?.address) {
      doc.text(party.direccion || party.address, x + 5, py, { width: w - 10 });
      py += 10;
    }
    if (party?.email) {
      doc.text(party.email, x + 5, py, { width: w - 10 });
      py += 10;
    }
    if (party?.telefono) {
      doc.text(party.telefono, x + 5, py, { width: w - 10 });
    }
  };

  drawPartyBox('SHIPPER', carpeta.shipper, 30, y, colW, 75);
  drawPartyBox('CONSIGNEE', carpeta.consignee, 30 + colW + 5, y, colW, 75);
  y += 80;

  drawPartyBox('NOTIFY PARTY', { razonSocial: carpeta.notify || carpeta.cliente?.razonSocial || '-' }, 30, y, colW, 55);
  drawPartyBox('AGENT', { razonSocial: carpeta.agente || '-' }, 30 + colW + 5, y, colW, 55);
  y += 60;

  // ============ Routing ============
  doc.rect(30, y, 535, 16).fill(accentBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
  doc.text('ROUTING', 35, y + 4);
  y += 20;

  doc.font('Helvetica').fontSize(8).fillColor(textColor);
  const routingGrid = [
    ['Airport of Departure', carpeta.puertoOrigen || '-', 'Airport of Destination', carpeta.puertoDestino || '-'],
    ['By First Carrier', carpeta.transportista || '-', 'Flight / Date', `${carpeta.buque || '-'} / ${formatDate(carpeta.fechaSalidaEstimada)}`],
    ['Operation Type', carpeta.tipoOperacionAerea || carpeta.tipoOperacion || '-', 'Incoterm', carpeta.incoterm || '-'],
  ];

  routingGrid.forEach(([lblA, valA, lblB, valB]) => {
    doc.font('Helvetica-Bold').text(`${lblA}:`, 35, y);
    doc.font('Helvetica').text(valA, 140, y, { width: 150 });
    doc.font('Helvetica-Bold').text(`${lblB}:`, 305, y);
    doc.font('Helvetica').text(valB, 405, y, { width: 155 });
    y += 13;
  });

  // ============ Detalle de la carga ============
  y += 8;
  doc.rect(30, y, 535, 16).fill(accentBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
  doc.text('NATURE & QUANTITY OF GOODS', 35, y + 4);
  y += 20;

  doc.font('Helvetica-Bold').fontSize(8).fillColor(lightText);
  doc.text('No. Pieces', 35, y);
  doc.text('Gross Weight', 100, y);
  doc.text('Volume', 175, y);
  doc.text('Chargeable Wt.', 235, y);
  doc.text('Nature & Description', 320, y);
  y += 4;
  doc.moveTo(35, y + 8).lineTo(560, y + 8).strokeColor(borderColor).lineWidth(0.5).stroke();
  y += 12;

  doc.font('Helvetica').fontSize(8).fillColor(textColor);
  doc.text(`${totalBultos}`, 35, y);
  doc.text(`${formatNumber(totalPeso)} kg`, 100, y);
  doc.text(`${formatNumber(totalVolumen)} m³`, 175, y);
  doc.text(`${formatNumber(chargeableWeight)} kg`, 235, y);
  doc.text(descripcionMercaderia, 320, y, { width: 240 });
  y += Math.max(20, descripcionMercaderia.split('\n').length * 10);

  // Marcas si hay
  if (carpeta.referenciaCliente) {
    y += 5;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor);
    doc.text('Marks & Numbers:', 35, y);
    doc.font('Helvetica').fillColor(textColor);
    doc.text(carpeta.referenciaCliente, 130, y, { width: 430 });
    y += 12;
  }

  // ============ Charges ============
  y += 10;
  doc.rect(30, y, 535, 16).fill(accentBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
  doc.text('CHARGES', 35, y + 4);
  y += 20;

  doc.font('Helvetica').fontSize(8).fillColor(textColor);
  doc.font('Helvetica-Bold').text('Weight / Valuation Charge:', 35, y);
  doc.font('Helvetica').text(carpeta.prepaidCollect || 'Prepaid', 180, y);
  doc.font('Helvetica-Bold').text('Currency:', 300, y);
  doc.font('Helvetica').text(carpeta.moneda || 'USD', 380, y);

  // ============ Footer ============
  y = 760;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(textColor);
  doc.text('Place of Issue:', 30, y);
  doc.font('Helvetica').text('BUENOS AIRES, ARGENTINA', 120, y);
  doc.font('Helvetica-Bold').text('Date of Issue:', 300, y);
  doc.font('Helvetica').text(formatDate(carpeta.fechaEmision || new Date()), 380, y);

  y += 16;
  doc.font('Helvetica-Oblique').fontSize(7).fillColor(lightText);
  doc.text('It is agreed that the goods described herein are accepted in apparent good order and condition for carriage subject to the conditions of contract on the reverse hereof.', 30, y, { width: 530, align: 'justify' });

  return doc;
}

module.exports = { generarAirWaybill };
