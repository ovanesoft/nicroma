const PDFDocument = require('pdfkit');
const { drawTenantLogo } = require('./pdfHelpers');

/**
 * Genera un PDF de Certificación de Flete para una carpeta de embarque.
 * Lista los gastos cuyo concepto contiene la palabra "FLETE" (o todos si no hay
 * filtro explícito), con detalle de proveedor responsable y montos.
 *
 * @param {Object} carpeta - Carpeta con relaciones
 * @param {Object} tenant - Datos del tenant
 * @param {Object} bancoSeleccionado - Cuenta bancaria opcional
 * @param {Buffer|null} logoBuffer - Logo del tenant ya decodificado
 */
function generarCertificacionFlete(carpeta, tenant, bancoSeleccionado = null, logoBuffer = null) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `Certificación de Flete - ${carpeta.houseBL || carpeta.numero}`,
      Author: tenant?.name || 'Sistema',
      Subject: 'Certificación de Flete'
    }
  });

  const primaryColor = '#0e7490';
  const headerBg = '#ecfeff';
  const borderColor = '#cbd5e1';
  const textColor = '#0f172a';
  const lightText = '#475569';

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (amount == null || amount === '') return '-';
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  // Filtrar gastos de flete (concepto contiene "FLETE" o base es POR_CONTENEDOR/KILOS/VOLUMEN típicas de flete)
  const fletes = (carpeta.gastos || []).filter(g => {
    const c = (g.concepto || '').toUpperCase();
    return c.includes('FLETE') || c.includes('FREIGHT') || c.includes('OCEAN') || c.includes('AIR');
  });

  // Si no se encontraron por concepto, mostrar todos
  const gastosCert = fletes.length > 0 ? fletes : (carpeta.gastos || []);

  const totalVenta = gastosCert.reduce((s, g) => s + (g.totalVenta || 0), 0);
  const totalIVA = gastosCert.reduce((s, g) => {
    return s + (g.gravado ? (g.totalVenta || 0) * (g.porcentajeIVA || 21) / 100 : 0);
  }, 0);

  // ============ Encabezado ============
  // Logo del tenant arriba a la derecha
  const logoInfo = drawTenantLogo(doc, logoBuffer, {
    right: 40, top: 30, maxWidth: 100, maxHeight: 50
  });

  const titleMaxW = logoInfo.drawn
    ? doc.page.width - 80 - logoInfo.width - 14
    : doc.page.width - 80;
  doc.fontSize(20).fillColor(primaryColor).font('Helvetica-Bold');
  doc.text('CERTIFICACIÓN DE FLETE', 40, 40, { align: 'center', width: titleMaxW });

  doc.fontSize(10).fillColor(textColor).font('Helvetica');
  const fechaHoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`CABA, ${fechaHoy}`, 40, 75);
  doc.text(`Carpeta: ${carpeta.numero}`, 300, 75, { align: 'right', width: 235 });

  // ============ Datos del cliente ============
  let y = 105;
  doc.rect(40, y, 515, 18).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10);
  doc.text('CLIENTE / IMPORTADOR', 50, y + 5);
  y += 22;

  doc.font('Helvetica').fontSize(9).fillColor(textColor);
  doc.font('Helvetica-Bold').text('Razón Social:', 50, y);
  doc.font('Helvetica').text(carpeta.cliente?.razonSocial || '-', 130, y, { width: 250 });
  doc.font('Helvetica-Bold').text('CUIT:', 400, y);
  doc.font('Helvetica').text(carpeta.cliente?.numeroDocumento || '-', 440, y);
  y += 13;
  doc.font('Helvetica-Bold').text('Email:', 50, y);
  doc.font('Helvetica').text(carpeta.cliente?.email || '-', 130, y, { width: 250 });
  doc.font('Helvetica-Bold').text('Tel:', 400, y);
  doc.font('Helvetica').text(carpeta.cliente?.telefono || '-', 440, y);

  // ============ Datos del embarque ============
  y += 25;
  doc.rect(40, y, 515, 18).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10);
  doc.text('DATOS DEL EMBARQUE', 50, y + 5);
  y += 22;
  doc.font('Helvetica').fontSize(9).fillColor(textColor);

  const grid = [
    ['Operación', `${carpeta.area || ''} ${carpeta.tipoOperacionAerea || carpeta.tipoOperacion || ''}`, 'Booking', carpeta.booking || '-'],
    ['HBL/HAWB', carpeta.houseBL || '-', 'MBL/MAWB', carpeta.masterBL || '-'],
    ['Origen', carpeta.puertoOrigen || '-', 'Destino', carpeta.puertoDestino || '-'],
    ['Buque/Vuelo', carpeta.buque || '-', 'Viaje', carpeta.viaje || '-'],
    ['ETD', formatDate(carpeta.fechaSalidaEstimada), 'ETA', formatDate(carpeta.fechaLlegadaEstimada)],
    ['Transportista', carpeta.transportista || '-', 'Incoterm', carpeta.incoterm || '-'],
  ];

  grid.forEach(([lblA, valA, lblB, valB]) => {
    doc.font('Helvetica-Bold').text(`${lblA}:`, 50, y);
    doc.font('Helvetica').text(valA, 130, y, { width: 165 });
    doc.font('Helvetica-Bold').text(`${lblB}:`, 320, y);
    doc.font('Helvetica').text(valB, 400, y, { width: 155 });
    y += 13;
  });

  // ============ Detalle de la carga ============
  y += 8;
  const totalBultos = carpeta.mercancias?.reduce((s, m) => s + (m.bultos || 0), 0) || 0;
  const totalVolumen = carpeta.mercancias?.reduce((s, m) => s + (m.volumen || 0), 0) || 0;
  const totalPeso = carpeta.mercancias?.reduce((s, m) => s + (m.peso || 0), 0) || 0;
  const contenedoresStr = carpeta.contenedores?.map(c => `${c.tipo} × ${c.cantidad || 1}`).join(', ') || '-';

  doc.font('Helvetica-Bold').fontSize(9).text('Bultos:', 50, y);
  doc.font('Helvetica').text(`${totalBultos} PCS`, 100, y);
  doc.font('Helvetica-Bold').text('Volumen:', 180, y);
  doc.font('Helvetica').text(`${formatCurrency(totalVolumen)} CBM`, 235, y);
  doc.font('Helvetica-Bold').text('Peso:', 340, y);
  doc.font('Helvetica').text(`${formatCurrency(totalPeso)} KG`, 380, y);
  y += 13;
  doc.font('Helvetica-Bold').text('Contenedores:', 50, y);
  doc.font('Helvetica').text(contenedoresStr, 130, y, { width: 425 });

  // ============ Tabla de Conceptos de Flete ============
  y += 25;
  doc.rect(40, y, 515, 18).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10);
  doc.text('CONCEPTOS DE FLETE CERTIFICADOS', 50, y + 5);
  y += 22;

  doc.font('Helvetica-Bold').fontSize(8).fillColor(lightText);
  doc.text('Concepto', 50, y);
  doc.text('Proveedor', 200, y);
  doc.text('P/C', 340, y);
  doc.text('Base', 365, y);
  doc.text('Total', 470, y, { width: 80, align: 'right' });
  y += 4;
  doc.moveTo(50, y + 8).lineTo(550, y + 8).strokeColor(borderColor).lineWidth(0.5).stroke();
  y += 12;

  doc.font('Helvetica').fontSize(8).fillColor(textColor);
  gastosCert.forEach(g => {
    if (y > 720) { doc.addPage(); y = 50; }
    const provLabel = g.proveedor?.razonSocial || g.proveedorNombre || '-';
    const baseLabel = g.base || '-';
    const ivaText = g.gravado ? ` +IVA ${g.porcentajeIVA || 21}%` : ' (exento)';
    doc.font('Helvetica-Bold').text(g.concepto || '-', 50, y, { width: 145 });
    doc.font('Helvetica').text(provLabel, 200, y, { width: 130 });
    doc.text(g.prepaidCollect || 'P', 340, y);
    doc.text(baseLabel, 365, y, { width: 95 });
    doc.font('Helvetica-Bold').text(`${g.divisa || 'USD'} ${formatCurrency(g.totalVenta || 0)}`, 470, y, { width: 80, align: 'right' });
    y += 11;
    doc.font('Helvetica-Oblique').fontSize(7).fillColor(lightText);
    doc.text(ivaText, 470, y, { width: 80, align: 'right' });
    doc.fontSize(8).font('Helvetica').fillColor(textColor);
    y += 10;
  });

  // ============ Totales ============
  y += 10;
  doc.moveTo(300, y).lineTo(550, y).strokeColor(borderColor).stroke();
  y += 8;
  doc.font('Helvetica').fontSize(9).fillColor(textColor);
  doc.text('Subtotal:', 350, y);
  doc.font('Helvetica-Bold').text(`${carpeta.moneda || 'USD'} ${formatCurrency(totalVenta)}`, 470, y, { width: 80, align: 'right' });
  y += 13;
  doc.font('Helvetica').text('IVA:', 350, y);
  doc.font('Helvetica-Bold').text(`${carpeta.moneda || 'USD'} ${formatCurrency(totalIVA)}`, 470, y, { width: 80, align: 'right' });
  y += 13;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryColor);
  doc.text('TOTAL CERTIFICADO:', 320, y);
  doc.text(`${carpeta.moneda || 'USD'} ${formatCurrency(totalVenta + totalIVA)}`, 460, y, { width: 90, align: 'right' });

  // ============ Datos bancarios ============
  if (bancoSeleccionado) {
    y += 35;
    if (y > 720) { doc.addPage(); y = 50; }
    doc.rect(40, y, 515, 18).fill(headerBg).stroke();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10);
    doc.text('DATOS BANCARIOS PARA TRANSFERENCIA', 50, y + 5);
    y += 22;

    doc.fillColor(textColor).font('Helvetica').fontSize(9);
    if (bancoSeleccionado.banco) { doc.text(`Banco: ${bancoSeleccionado.banco}`, 50, y); y += 12; }
    if (bancoSeleccionado.titular) { doc.text(`Titular: ${bancoSeleccionado.titular}`, 50, y); y += 12; }
    if (bancoSeleccionado.cuenta) { doc.text(`Cuenta: ${bancoSeleccionado.cuenta}`, 50, y); y += 12; }
    if (bancoSeleccionado.cbu) { doc.text(`CBU: ${bancoSeleccionado.cbu}`, 50, y); y += 12; }
    if (bancoSeleccionado.alias) { doc.text(`Alias: ${bancoSeleccionado.alias}`, 50, y); y += 12; }
  }

  // ============ Footer ============
  y = Math.max(y + 25, 740);
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(lightText);
  doc.text(
    `Se certifica que los montos detallados corresponden al flete del embarque indicado, emitido por ${tenant?.name || 'la empresa'}.`,
    40, y, { width: 515, align: 'justify' }
  );
  y += 24;
  doc.moveTo(360, y + 25).lineTo(540, y + 25).strokeColor('#000').stroke();
  doc.font('Helvetica').fontSize(8).fillColor(textColor);
  doc.text('Firma y aclaración', 405, y + 28, { width: 110, align: 'center' });

  return doc;
}

module.exports = { generarCertificacionFlete };
