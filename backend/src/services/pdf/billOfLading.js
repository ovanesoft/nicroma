const PDFDocument = require('pdfkit');
const { drawTenantLogo } = require('./pdfHelpers');

/**
 * Genera un PDF de Bill of Lading (BL House) basado en los datos de una carpeta marítima.
 * Es un formato genérico "house" no oficial de carrier — para BLs oficiales del carrier
 * (Maersk, MSC, etc.) se debe usar la integración con cada naviera.
 *
 * @param {Object} carpeta - Datos completos de la carpeta con relaciones
 * @param {Object} tenant - Datos del tenant (forwarder)
 * @param {Buffer|null} logoBuffer - Logo del tenant ya decodificado
 * @returns {PDFDocument} - Documento PDF
 */
function generarBillOfLading(carpeta, tenant, logoBuffer = null) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 35,
    info: {
      Title: `Bill of Lading - ${carpeta.houseBL || carpeta.numero}`,
      Author: tenant?.name || 'Sistema',
      Subject: 'Bill of Lading'
    }
  });

  const primaryColor = '#0c4a6e';
  const headerBg = '#e0f2fe';
  const borderColor = '#94a3b8';
  const textColor = '#0f172a';
  const lightText = '#475569';

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
  const descripcionMercaderia = carpeta.mercancias?.map(m => m.descripcion).filter(Boolean).join('\n') || '-';

  const contenedoresStr = carpeta.contenedores?.map(c => {
    const parts = [c.tipo];
    if (c.numero) parts.push(c.numero);
    if (c.precinto) parts.push(`Seal: ${c.precinto}`);
    return parts.join(' / ');
  }).join('\n') || '-';

  // ============ ENCABEZADO ============
  // Logo del tenant arriba a la derecha
  const logoInfo = drawTenantLogo(doc, logoBuffer, {
    right: 35, top: 30, maxWidth: 95, maxHeight: 48
  });

  const titleMaxW = logoInfo.drawn ? doc.page.width - 70 - logoInfo.width - 14 : doc.page.width - 70;
  doc.fontSize(22).fillColor(primaryColor).font('Helvetica-Bold');
  doc.text('BILL OF LADING', 35, 35, { align: 'center', width: titleMaxW });

  doc.fontSize(8).fillColor(lightText).font('Helvetica');
  doc.text('Non-Negotiable unless consigned to order', 35, 60, { align: 'center', width: titleMaxW });

  // Número de BL destacado (se corre a la izquierda si hay logo)
  const blNoX = logoInfo.drawn ? 280 : 400;
  doc.fontSize(11).fillColor(textColor).font('Helvetica-Bold');
  doc.text(`B/L No: ${carpeta.houseBL || carpeta.numero}`, blNoX, 38);
  if (carpeta.masterBL) {
    doc.fontSize(8).font('Helvetica');
    doc.text(`Master B/L: ${carpeta.masterBL}`, blNoX, 53);
  }

  // ============ Forwarder (Tenant) ============
  let y = 85;
  doc.rect(35, y, 525, 18).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10);
  doc.text('FREIGHT FORWARDER / CARRIER', 40, y + 5);
  y += 22;
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10);
  doc.text(tenant?.name || '-', 40, y);
  y += 12;
  doc.font('Helvetica').fontSize(8).fillColor(lightText);
  if (tenant?.companyAddress) {
    doc.text(tenant.companyAddress, 40, y, { width: 510 });
    y += 12;
  }
  const contactLine = [tenant?.companyPhone, tenant?.companyEmail].filter(Boolean).join(' | ');
  if (contactLine) {
    doc.text(contactLine, 40, y);
    y += 12;
  }

  // ============ Partes (Shipper / Consignee / Notify) ============
  y += 5;
  const colW = (525 - 5) / 2;
  const drawPartyBox = (title, party, x, yStart, w, h) => {
    doc.rect(x, yStart, w, 16).fill(headerBg).stroke();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
    doc.text(title, x + 5, yStart + 4);
    doc.rect(x, yStart + 16, w, h - 16).strokeColor(borderColor).stroke();

    let py = yStart + 21;
    doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9);
    doc.text(party?.razonSocial || '-', x + 5, py, { width: w - 10 });
    py += 12;
    doc.font('Helvetica').fontSize(8).fillColor(lightText);
    if (party?.numeroDocumento) {
      doc.text(`Tax ID / CUIT: ${party.numeroDocumento}`, x + 5, py, { width: w - 10 });
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

  drawPartyBox('SHIPPER', carpeta.shipper, 35, y, colW, 75);
  drawPartyBox('CONSIGNEE', carpeta.consignee, 35 + colW + 5, y, colW, 75);
  y += 80;

  drawPartyBox('NOTIFY PARTY', { razonSocial: carpeta.notify || carpeta.cliente?.razonSocial || '-' }, 35, y, colW, 60);
  drawPartyBox('AGENT', { razonSocial: carpeta.agente || '-' }, 35 + colW + 5, y, colW, 60);
  y += 65;

  // ============ Datos de Embarque ============
  doc.rect(35, y, 525, 18).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10);
  doc.text('OCEAN VOYAGE', 40, y + 5);
  y += 22;

  doc.font('Helvetica').fontSize(8).fillColor(textColor);
  const grid = [
    ['Vessel', carpeta.buque || '-', 'Voyage', carpeta.viaje || '-'],
    ['Port of Loading', carpeta.puertoOrigen || '-', 'Port of Discharge', carpeta.puertoDestino || '-'],
    ['Place of Receipt', carpeta.lugarCarga || '-', 'Place of Delivery', carpeta.lugarDescarga || '-'],
    ['Booking No', carpeta.booking || '-', 'Transhipment Port', carpeta.puertoTransbordo || '-'],
    ['ETD', formatDate(carpeta.fechaSalidaEstimada), 'ETA', formatDate(carpeta.fechaLlegadaEstimada)],
  ];

  grid.forEach(([lblA, valA, lblB, valB]) => {
    doc.font('Helvetica-Bold').text(`${lblA}:`, 40, y);
    doc.font('Helvetica').text(valA, 120, y, { width: 160 });
    doc.font('Helvetica-Bold').text(`${lblB}:`, 300, y);
    doc.font('Helvetica').text(valB, 380, y, { width: 175 });
    y += 13;
  });

  // ============ Carga / Mercadería ============
  y += 8;
  doc.rect(35, y, 525, 18).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10);
  doc.text('PARTICULARS FURNISHED BY SHIPPER', 40, y + 5);
  y += 22;

  // Tabla con header
  doc.font('Helvetica-Bold').fontSize(8).fillColor(lightText);
  doc.text('MARKS & NUMBERS', 40, y);
  doc.text('NO. OF PKGS', 200, y);
  doc.text('DESCRIPTION OF GOODS', 280, y);
  doc.text('GROSS WEIGHT', 440, y, { width: 60, align: 'right' });
  doc.text('MEASUREMENT', 510, y, { width: 50, align: 'right' });
  y += 4;
  doc.moveTo(40, y + 8).lineTo(560, y + 8).strokeColor(borderColor).lineWidth(0.5).stroke();
  y += 12;

  doc.font('Helvetica').fontSize(8).fillColor(textColor);
  const marcas = carpeta.mercancias?.map(m => m.marcas).filter(Boolean).join(', ') || carpeta.referenciaCliente || '-';
  doc.text(marcas, 40, y, { width: 155 });
  doc.text(`${totalBultos} PCS`, 200, y);
  doc.text(descripcionMercaderia, 280, y, { width: 155 });
  doc.text(`${formatNumber(totalPeso)} KG`, 440, y, { width: 60, align: 'right' });
  doc.text(`${formatNumber(totalVolumen)} M³`, 510, y, { width: 50, align: 'right' });
  y += Math.max(30, (descripcionMercaderia.split('\n').length * 11));

  // Contenedores
  if (carpeta.contenedores && carpeta.contenedores.length > 0) {
    y += 4;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor);
    doc.text('CONTAINERS:', 40, y);
    doc.font('Helvetica').fontSize(8).fillColor(textColor);
    const contLines = contenedoresStr.split('\n');
    contLines.forEach((line, i) => {
      doc.text(line, 130, y + (i * 11), { width: 430 });
    });
    y += Math.max(11, contLines.length * 11);
  }

  // ============ Freight / Charges ============
  y += 10;
  doc.rect(35, y, 525, 18).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10);
  doc.text('FREIGHT & CHARGES', 40, y + 5);
  y += 22;
  doc.font('Helvetica').fontSize(8).fillColor(textColor);
  doc.font('Helvetica-Bold').text('Freight:', 40, y);
  doc.font('Helvetica').text(carpeta.prepaidCollect || 'Prepaid', 120, y);
  doc.font('Helvetica-Bold').text('Incoterm:', 300, y);
  doc.font('Helvetica').text(carpeta.incoterm || '-', 380, y);
  y += 13;
  doc.font('Helvetica-Bold').text('Currency:', 40, y);
  doc.font('Helvetica').text(carpeta.moneda || 'USD', 120, y);
  doc.font('Helvetica-Bold').text('Number of Original B/L:', 300, y);
  doc.font('Helvetica').text('THREE (3)', 420, y);

  // ============ Footer: Lugar y Fecha de Emisión ============
  y = 760;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(textColor);
  doc.text('Place of Issue:', 40, y);
  doc.font('Helvetica').text('BUENOS AIRES, ARGENTINA', 130, y);
  doc.font('Helvetica-Bold').text('Date of Issue:', 300, y);
  doc.font('Helvetica').text(formatDate(carpeta.fechaEmision || new Date()), 380, y);
  y += 16;

  doc.font('Helvetica-Oblique').fontSize(7).fillColor(lightText);
  doc.text('Received in apparent good order and condition the goods described above to be transported subject to the terms and conditions of the carrier.', 40, y, {
    width: 520, align: 'justify'
  });

  return doc;
}

module.exports = { generarBillOfLading };
