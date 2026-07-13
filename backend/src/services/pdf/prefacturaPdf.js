const PDFDocument = require('pdfkit');
const { drawTenantLogo } = require('./pdfHelpers');

/**
 * Genera el PDF de una Prefactura con:
 * - Encabezado con datos fiscales de la empresa
 * - Bloque de datos de la operación (carpeta): HBL, origen, destino, shipper,
 *   fechas, bultos, peso, volumen, ref. cliente, buque, contenedores
 * - Ítems con su divisa
 * - Conversión de monedas con los tipos de cambio cargados
 */
function generarPrefacturaPdf(prefactura, tenant, logoBuffer = null) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Prefactura ${prefactura.numero}`,
      Author: tenant?.name || 'Sistema',
      Subject: 'Prefactura'
    }
  });

  const primaryColor = '#0f766e';
  const headerBg = '#f0fdfa';
  const textColor = '#1e293b';
  const lightText = '#64748b';
  const borderColor = '#cbd5e1';

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (v) => {
    if (v == null) return '-';
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  };

  const cliente = prefactura.cliente || {};
  const carpeta = prefactura.carpeta || {};
  const items = prefactura.items || [];
  const tc = prefactura.tiposCambio || {};

  // ============ Encabezado: empresa + logo ============
  const logoInfo = drawTenantLogo(doc, logoBuffer, {
    right: 50, top: 40, maxWidth: 110, maxHeight: 55
  });

  doc.fontSize(13).fillColor(textColor).font('Helvetica-Bold');
  doc.text(tenant?.name || '', 50, 45, { width: 300 });
  doc.fontSize(8).fillColor(lightText).font('Helvetica');
  let hy = 62;
  const emisorCuit = tenant?.companyCuit || tenant?.paymentBankCuit;
  if (emisorCuit) { doc.text(`CUIT: ${emisorCuit}`, 50, hy); hy += 11; }
  if (tenant?.companyCondicionFiscal) { doc.text(`Cond. Fiscal: ${tenant.companyCondicionFiscal}`, 50, hy, { width: 300 }); hy += 11; }
  if (tenant?.companyIngresosBrutos) { doc.text(`Ingresos Brutos: ${tenant.companyIngresosBrutos}`, 50, hy, { width: 300 }); hy += 11; }
  if (tenant?.companyInicioActividad) { doc.text(`Inicio de Actividad: ${formatDate(tenant.companyInicioActividad)}`, 50, hy); hy += 11; }
  if (tenant?.companyAddress) { doc.text(tenant.companyAddress, 50, hy, { width: 300 }); hy += 11; }
  const contacto = [tenant?.companyEmail, tenant?.companyPhone].filter(Boolean).join(' • ');
  if (contacto) { doc.text(contacto, 50, hy); hy += 11; }

  let y = Math.max(hy, logoInfo.drawn ? 105 : 90) + 8;

  // ============ Título ============
  doc.rect(50, y, doc.page.width - 100, 30).fill(primaryColor);
  doc.fontSize(14).fillColor('#ffffff').font('Helvetica-Bold');
  doc.text(`PREFACTURA ${prefactura.numero}`, 50, y + 8, { align: 'center', width: doc.page.width - 100 });
  y += 40;

  doc.fontSize(9).fillColor(textColor).font('Helvetica');
  doc.text(`Fecha: ${formatDate(prefactura.fecha)}`, 50, y);
  doc.text(`Moneda: ${prefactura.moneda || 'USD'}`, 400, y, { align: 'right', width: 145 });
  y += 20;

  // ============ Cliente ============
  doc.rect(50, y, doc.page.width - 100, 18).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
  doc.text('CLIENTE', 58, y + 5);
  y += 24;
  doc.fontSize(9).fillColor(textColor);
  doc.font('Helvetica-Bold').text('Razón Social:', 58, y);
  doc.font('Helvetica').text(cliente.razonSocial || '-', 135, y, { width: 250 });
  doc.font('Helvetica-Bold').text('CUIT:', 400, y);
  doc.font('Helvetica').text(cliente.numeroDocumento || '-', 435, y);
  y += 18;

  // ============ Período de facturación y condición de venta ============
  if (prefactura.periodoDesde || prefactura.periodoHasta || prefactura.fechaVencimiento || prefactura.condicionVenta) {
    doc.fontSize(8.5).fillColor(textColor);
    doc.font('Helvetica-Bold').text('Período:', 58, y);
    doc.font('Helvetica').text(`${formatDate(prefactura.periodoDesde)} al ${formatDate(prefactura.periodoHasta)}`, 135, y, { width: 200 });
    doc.font('Helvetica-Bold').text('Vto. pago:', 350, y);
    doc.font('Helvetica').text(formatDate(prefactura.fechaVencimiento), 420, y, { width: 125 });
    y += 14;
    if (prefactura.condicionVenta) {
      doc.font('Helvetica-Bold').text('Condición de venta:', 58, y);
      doc.font('Helvetica').text(prefactura.condicionVenta, 165, y, { width: 380 });
      y += 14;
    }
    y += 4;
  }

  // ============ Datos de la operación (carpeta) ============
  if (prefactura.carpetaId && carpeta.numero) {
    doc.rect(50, y, doc.page.width - 100, 18).fill(headerBg).stroke();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
    doc.text('DATOS DE LA OPERACIÓN', 58, y + 5);
    y += 24;

    // Calcular totales de mercancías
    const totalBultos = carpeta.mercancias?.reduce((s, m) => s + (m.bultos || 0), 0) || 0;
    const totalPeso = carpeta.mercancias?.reduce((s, m) => s + (m.peso || 0), 0) || 0;
    const totalVolumen = carpeta.mercancias?.reduce((s, m) => s + (m.volumen || 0), 0) || 0;
    const contenedoresStr = carpeta.contenedores
      ?.map(c => [c.tipo, c.numero].filter(Boolean).join(' '))
      .join(', ') || '-';

    // Shipper: datos libres o cliente-shipper vinculado
    const sd = carpeta.shipperData || {};
    const shipperStr = sd.empresa || carpeta.shipper?.razonSocial || '-';

    const grid = [
      ['Nro. de HBL', carpeta.houseBL || '-', 'Ref. Cliente', carpeta.referenciaCliente || '-'],
      ['Origen', carpeta.puertoOrigen || '-', 'Destino', carpeta.puertoDestino || '-'],
      ['Shipper', shipperStr, 'Buque', carpeta.buque || '-'],
      ['Fecha Salida', formatDate(carpeta.fechaSalidaEstimada), 'Fecha Llegada', formatDate(carpeta.fechaLlegadaEstimada)],
      ['Bultos', `${totalBultos}`, 'Peso', `${formatCurrency(totalPeso)} KG`],
      ['Volumen', `${formatCurrency(totalVolumen)} M³`, 'Contenedor', contenedoresStr],
    ];

    // Altura dinámica por fila: los valores largos (puertos, shipper,
    // contenedores) pueden ocupar varias líneas y no deben solaparse.
    doc.fontSize(8.5).fillColor(textColor);
    grid.forEach(([lblA, valA, lblB, valB]) => {
      doc.font('Helvetica');
      const hA = doc.heightOfString(String(valA || '-'), { width: 160 });
      const hB = doc.heightOfString(String(valB || '-'), { width: 155 });
      doc.font('Helvetica-Bold').text(`${lblA}:`, 58, y);
      doc.font('Helvetica').text(String(valA || '-'), 135, y, { width: 160 });
      doc.font('Helvetica-Bold').text(`${lblB}:`, 310, y);
      doc.font('Helvetica').text(String(valB || '-'), 390, y, { width: 155 });
      y += Math.max(hA, hB, 11) + 4;
    });
    y += 8;
  }

  // ============ Ítems ============
  doc.rect(50, y, doc.page.width - 100, 18).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
  doc.text('DETALLE DE CONCEPTOS', 58, y + 5);
  y += 24;

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(lightText);
  doc.text('Descripción', 58, y, { width: 190 });
  doc.text('Divisa', 255, y);
  doc.text('Cant.', 295, y);
  doc.text('P. Unit.', 330, y, { width: 55, align: 'right' });
  doc.text('Subtotal', 393, y, { width: 55, align: 'right' });
  doc.text('IVA', 455, y, { width: 40, align: 'right' });
  doc.text('Total', 500, y, { width: 45, align: 'right' });
  y += 11;
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(borderColor).lineWidth(0.5).stroke();
  y += 6;

  doc.font('Helvetica').fontSize(8).fillColor(textColor);
  items.forEach(item => {
    if (y > 720) { doc.addPage(); y = 50; }
    const hDesc = doc.heightOfString(item.descripcion || '-', { width: 190 });
    doc.text(item.descripcion || '-', 58, y, { width: 190 });
    doc.text(item.divisa || 'USD', 255, y);
    doc.text(`${item.cantidad ?? 1}`, 295, y);
    doc.text(formatCurrency(item.precioUnitario), 330, y, { width: 55, align: 'right' });
    doc.text(formatCurrency(item.subtotal), 393, y, { width: 55, align: 'right' });
    doc.text(formatCurrency(item.iva), 455, y, { width: 40, align: 'right' });
    doc.font('Helvetica-Bold').text(formatCurrency(item.total), 500, y, { width: 45, align: 'right' });
    doc.font('Helvetica');
    y += Math.max(hDesc, 10) + 4;
  });
  y += 8;

  // ============ Conversión de monedas ============
  // Agrupar totales por divisa
  const porDivisa = {};
  items.forEach(item => {
    const d = item.divisa || 'USD';
    porDivisa[d] = (porDivisa[d] || 0) + (item.total || 0);
  });
  const divisas = Object.keys(porDivisa);
  const hayMultiplesMonedas = divisas.length > 1;
  const tcCargados = Object.entries(tc).filter(([, v]) => v != null && v > 0);

  if (y > 640) { doc.addPage(); y = 50; }

  doc.moveTo(280, y).lineTo(doc.page.width - 50, y).strokeColor(borderColor).stroke();
  y += 8;

  // Totales por divisa
  if (hayMultiplesMonedas) {
    doc.fontSize(8.5).fillColor(textColor).font('Helvetica');
    divisas.forEach(d => {
      doc.text(`Total ${d}:`, 350, y);
      doc.font('Helvetica-Bold').text(`${d} ${formatCurrency(porDivisa[d])}`, 450, y, { width: 95, align: 'right' });
      doc.font('Helvetica');
      y += 13;
    });
    y += 4;
  }

  // Tipos de cambio aplicados
  if (tcCargados.length > 0) {
    doc.fontSize(8).fillColor(lightText).font('Helvetica-Oblique');
    const tcStr = tcCargados.map(([m, v]) => `${m.toUpperCase()}: ${formatCurrency(v)}`).join('  •  ');
    doc.text(`Tipos de cambio aplicados — ${tcStr}`, 58, y, { width: doc.page.width - 116 });
    y += 16;
  }

  // Totales finales (en la moneda de la prefactura)
  doc.fontSize(9).fillColor(textColor).font('Helvetica');
  doc.text('Subtotal:', 380, y);
  doc.font('Helvetica-Bold').text(`${prefactura.moneda} ${formatCurrency(prefactura.subtotal)}`, 450, y, { width: 95, align: 'right' });
  y += 14;
  doc.font('Helvetica').text('IVA:', 380, y);
  doc.font('Helvetica-Bold').text(`${prefactura.moneda} ${formatCurrency(prefactura.iva)}`, 450, y, { width: 95, align: 'right' });
  y += 16;
  doc.fontSize(12).fillColor(primaryColor).font('Helvetica-Bold');
  doc.text('TOTAL:', 360, y);
  doc.text(`${prefactura.moneda} ${formatCurrency(prefactura.total)}`, 430, y, { width: 115, align: 'right' });
  y += 25;

  // Observaciones
  if (prefactura.observaciones) {
    doc.fontSize(8).fillColor(lightText).font('Helvetica-Oblique');
    doc.text(`Observaciones: ${prefactura.observaciones}`, 50, y, { width: doc.page.width - 100 });
    y += 20;
  }

  // Footer
  doc.fontSize(7).fillColor(lightText).font('Helvetica-Oblique');
  doc.text(
    'Documento no válido como factura. Emitido a efectos informativos, sujeto a facturación definitiva.',
    50, Math.max(y + 15, 760), { width: doc.page.width - 100, align: 'center' }
  );

  return doc;
}

module.exports = { generarPrefacturaPdf };
