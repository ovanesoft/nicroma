const PDFDocument = require('pdfkit');

/**
 * Genera un PDF de Certificación de Gastos para una carpeta de embarque.
 * Lista TODOS los gastos asociados a la carpeta con desglose por proveedor,
 * P/C, divisa, base y total. Útil para certificar gastos al cliente o auditoría.
 *
 * @param {Object} carpeta - Carpeta con relaciones
 * @param {Object} tenant - Tenant
 * @param {Object} bancoSeleccionado - Cuenta bancaria opcional
 */
function generarCertificacionGastos(carpeta, tenant, bancoSeleccionado = null) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `Certificación de Gastos - ${carpeta.houseBL || carpeta.numero}`,
      Author: tenant?.name || 'Sistema',
      Subject: 'Certificación de Gastos de Operación'
    }
  });

  const primaryColor = '#7c3aed';
  const headerBg = '#f5f3ff';
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

  const gastos = carpeta.gastos || [];

  // Agrupar por proveedor (los sin proveedor van a "Sin asignar")
  const gruposByProv = {};
  gastos.forEach(g => {
    const key = g.proveedor?.razonSocial || g.proveedorNombre || 'Sin proveedor asignado';
    if (!gruposByProv[key]) gruposByProv[key] = [];
    gruposByProv[key].push(g);
  });

  const totalVenta = gastos.reduce((s, g) => s + (g.totalVenta || 0), 0);
  const totalIVA = gastos.reduce((s, g) => {
    return s + (g.gravado ? (g.totalVenta || 0) * (g.porcentajeIVA || 21) / 100 : 0);
  }, 0);

  // ============ Encabezado ============
  doc.fontSize(20).fillColor(primaryColor).font('Helvetica-Bold');
  doc.text('CERTIFICACIÓN DE GASTOS', 40, 40, { align: 'center' });

  doc.fontSize(10).fillColor(textColor).font('Helvetica');
  const fechaHoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`CABA, ${fechaHoy}`, 40, 75);
  doc.text(`Carpeta: ${carpeta.numero}`, 400, 75, { align: 'right' });

  // ============ Cliente ============
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

  // ============ Embarque (resumido) ============
  y += 25;
  doc.rect(40, y, 515, 18).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10);
  doc.text('RESUMEN DEL EMBARQUE', 50, y + 5);
  y += 22;
  doc.font('Helvetica').fontSize(9).fillColor(textColor);

  const grid = [
    ['Operación', `${carpeta.area || ''} ${carpeta.tipoOperacionAerea || carpeta.tipoOperacion || ''}`, 'Booking', carpeta.booking || '-'],
    ['HBL/HAWB', carpeta.houseBL || '-', 'Origen → Destino', `${carpeta.puertoOrigen || '-'} → ${carpeta.puertoDestino || '-'}`],
    ['ETD', formatDate(carpeta.fechaSalidaEstimada), 'ETA', formatDate(carpeta.fechaLlegadaEstimada)],
  ];

  grid.forEach(([lblA, valA, lblB, valB]) => {
    doc.font('Helvetica-Bold').text(`${lblA}:`, 50, y);
    doc.font('Helvetica').text(valA, 130, y, { width: 165 });
    doc.font('Helvetica-Bold').text(`${lblB}:`, 320, y);
    doc.font('Helvetica').text(valB, 400, y, { width: 155 });
    y += 13;
  });

  // ============ Detalle de Gastos Agrupados por Proveedor ============
  y += 10;
  doc.rect(40, y, 515, 18).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10);
  doc.text('DETALLE DE GASTOS POR PROVEEDOR / RESPONSABLE', 50, y + 5);
  y += 22;

  Object.entries(gruposByProv).forEach(([provName, items]) => {
    if (y > 700) { doc.addPage(); y = 50; }

    // Header del grupo
    doc.rect(40, y, 515, 16).fill('#faf5ff').stroke(borderColor);
    doc.fillColor('#581c87').font('Helvetica-Bold').fontSize(9);
    doc.text(provName, 50, y + 4);

    const subtotalGrupo = items.reduce((s, g) => s + (g.totalVenta || 0), 0);
    doc.text(`Subtotal: ${carpeta.moneda || 'USD'} ${formatCurrency(subtotalGrupo)}`, 380, y + 4, {
      width: 165, align: 'right'
    });
    y += 20;

    // Tabla de items del grupo
    doc.font('Helvetica-Bold').fontSize(8).fillColor(lightText);
    doc.text('Concepto', 50, y);
    doc.text('P/C', 280, y);
    doc.text('Base', 310, y);
    doc.text('Divisa', 405, y);
    doc.text('Total', 470, y, { width: 80, align: 'right' });
    y += 4;
    doc.moveTo(50, y + 8).lineTo(550, y + 8).strokeColor(borderColor).lineWidth(0.5).stroke();
    y += 12;

    doc.font('Helvetica').fontSize(8).fillColor(textColor);
    items.forEach(g => {
      if (y > 750) { doc.addPage(); y = 50; }
      doc.text(g.concepto || '-', 50, y, { width: 225 });
      doc.text(g.prepaidCollect || 'P', 280, y);
      doc.text(g.base || '-', 310, y, { width: 90 });
      doc.text(g.divisa || 'USD', 405, y);
      doc.font('Helvetica-Bold').text(formatCurrency(g.totalVenta || 0), 470, y, { width: 80, align: 'right' });
      doc.font('Helvetica');
      y += 12;
    });
    y += 5;
  });

  // ============ Totales generales ============
  y += 10;
  if (y > 700) { doc.addPage(); y = 50; }
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
    `Se certifica que los gastos detallados corresponden a la operación de la carpeta ${carpeta.numero}, emitidos por ${tenant?.name || 'la empresa'}.`,
    40, y, { width: 515, align: 'justify' }
  );

  return doc;
}

module.exports = { generarCertificacionGastos };
