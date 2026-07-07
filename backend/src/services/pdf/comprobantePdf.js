const PDFDocument = require('pdfkit');
const { drawTenantLogo } = require('./pdfHelpers');

const TITULOS = {
  RECIBO: 'RECIBO',
  NOTA_CREDITO: 'NOTA DE CRÉDITO',
  NOTA_DEBITO: 'NOTA DE DÉBITO'
};

const COLORES = {
  RECIBO: '#047857',
  NOTA_CREDITO: '#b91c1c',
  NOTA_DEBITO: '#1d4ed8'
};

/**
 * Genera el PDF de un comprobante (Recibo / Nota de Crédito / Nota de Débito)
 * asociado a una factura.
 */
function generarComprobantePdf(comprobante, tenant, logoBuffer = null) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `${TITULOS[comprobante.tipo]} ${comprobante.numero}`,
      Author: tenant?.name || 'Sistema',
      Subject: TITULOS[comprobante.tipo]
    }
  });

  const primaryColor = COLORES[comprobante.tipo] || '#0f172a';
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

  const factura = comprobante.factura || {};
  const cliente = factura.cliente || {};

  // ============ Encabezado: empresa + logo ============
  const logoInfo = drawTenantLogo(doc, logoBuffer, {
    right: 50, top: 40, maxWidth: 110, maxHeight: 55
  });

  doc.fontSize(13).fillColor(textColor).font('Helvetica-Bold');
  doc.text(tenant?.name || '', 50, 45, { width: 300 });
  doc.fontSize(8).fillColor(lightText).font('Helvetica');
  let hy = 62;
  if (tenant?.paymentBankCuit) { doc.text(`CUIT: ${tenant.paymentBankCuit}`, 50, hy); hy += 11; }
  if (tenant?.companyAddress) { doc.text(tenant.companyAddress, 50, hy, { width: 300 }); hy += 11; }
  const contacto = [tenant?.companyEmail, tenant?.companyPhone].filter(Boolean).join(' • ');
  if (contacto) { doc.text(contacto, 50, hy); hy += 11; }

  let y = Math.max(hy, logoInfo.drawn ? 105 : 90) + 10;

  // ============ Título del comprobante ============
  doc.rect(50, y, doc.page.width - 100, 34).fill(primaryColor);
  doc.fontSize(15).fillColor('#ffffff').font('Helvetica-Bold');
  doc.text(TITULOS[comprobante.tipo], 50, y + 9, { align: 'center', width: doc.page.width - 100 });
  y += 44;

  // Número y fecha
  doc.fontSize(10).fillColor(textColor).font('Helvetica-Bold');
  doc.text(`N° ${comprobante.numero}`, 50, y);
  doc.font('Helvetica').text(`Fecha: ${formatDate(comprobante.fecha)}`, 380, y, { align: 'right', width: 165 });
  y += 25;

  // ============ Datos del cliente ============
  doc.rect(50, y, doc.page.width - 100, 18).fill('#f1f5f9').stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
  doc.text('CLIENTE', 58, y + 5);
  y += 24;

  doc.fontSize(9).fillColor(textColor);
  doc.font('Helvetica-Bold').text('Razón Social:', 58, y);
  doc.font('Helvetica').text(cliente.razonSocial || '-', 135, y, { width: 250 });
  doc.font('Helvetica-Bold').text('CUIT:', 400, y);
  doc.font('Helvetica').text(cliente.numeroDocumento || '-', 435, y);
  y += 14;
  if (cliente.direccion) {
    doc.font('Helvetica-Bold').text('Dirección:', 58, y);
    doc.font('Helvetica').text(cliente.direccion, 135, y, { width: 400 });
    y += 14;
  }
  y += 10;

  // ============ Factura de referencia ============
  doc.rect(50, y, doc.page.width - 100, 18).fill('#f1f5f9').stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
  doc.text('COMPROBANTE DE REFERENCIA', 58, y + 5);
  y += 24;

  doc.fontSize(9).fillColor(textColor);
  doc.font('Helvetica-Bold').text('Factura:', 58, y);
  doc.font('Helvetica').text(factura.numeroCompleto || '-', 135, y);
  doc.font('Helvetica-Bold').text('Total factura:', 300, y);
  doc.font('Helvetica').text(`${factura.moneda || 'USD'} ${formatCurrency(factura.total)}`, 380, y);
  y += 14;
  if (factura.carpeta) {
    doc.font('Helvetica-Bold').text('Carpeta:', 58, y);
    doc.font('Helvetica').text(`${factura.carpeta.numero || ''} ${factura.carpeta.houseBL ? `• HBL ${factura.carpeta.houseBL}` : ''}`, 135, y, { width: 400 });
    y += 14;
  }
  y += 10;

  // ============ Detalle ============
  const items = Array.isArray(comprobante.items) ? comprobante.items : [];
  if (items.length > 0) {
    doc.rect(50, y, doc.page.width - 100, 18).fill('#f1f5f9').stroke();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
    doc.text('DETALLE', 58, y + 5);
    y += 24;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(lightText);
    doc.text('Descripción', 58, y, { width: 280 });
    doc.text('Cant.', 350, y);
    doc.text('P. Unitario', 400, y, { width: 65, align: 'right' });
    doc.text('Total', 480, y, { width: 65, align: 'right' });
    y += 12;
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(borderColor).lineWidth(0.5).stroke();
    y += 6;

    doc.font('Helvetica').fontSize(8.5).fillColor(textColor);
    items.forEach(item => {
      if (y > 700) { doc.addPage(); y = 50; }
      const h = doc.heightOfString(item.descripcion || '-', { width: 280 });
      doc.text(item.descripcion || '-', 58, y, { width: 280 });
      doc.text(`${item.cantidad ?? 1}`, 350, y);
      doc.text(formatCurrency(item.precioUnitario ?? 0), 400, y, { width: 65, align: 'right' });
      doc.font('Helvetica-Bold').text(formatCurrency(item.total ?? 0), 480, y, { width: 65, align: 'right' });
      doc.font('Helvetica');
      y += Math.max(h, 10) + 4;
    });
    y += 10;
  } else if (comprobante.concepto) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor).text('Concepto:', 58, y);
    doc.font('Helvetica').text(comprobante.concepto, 135, y, { width: 400 });
    y += 20;
  }

  // ============ Retenciones (recibos) ============
  const retenciones = Array.isArray(comprobante.retenciones) ? comprobante.retenciones : [];
  const totalRetenciones = retenciones.reduce((s, r) => s + (parseFloat(r.importe) || 0), 0);

  const NOMBRES_RETENCION = {
    GANANCIAS: 'Retención Imp. a las Ganancias',
    IVA: 'Retención IVA',
    IIBB: 'Retención Ingresos Brutos',
    SUSS: 'Retención SUSS',
    OTRA: 'Otra retención'
  };

  if (retenciones.length > 0) {
    doc.rect(50, y, doc.page.width - 100, 18).fill('#fef3c7').stroke();
    doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(9);
    doc.text('RETENCIONES APLICADAS', 58, y + 5);
    y += 24;

    doc.fontSize(8.5).fillColor(textColor);
    retenciones.forEach(r => {
      const label = [NOMBRES_RETENCION[r.tipo] || r.tipo, r.descripcion].filter(Boolean).join(' — ');
      const h = doc.heightOfString(label, { width: 350 });
      doc.font('Helvetica').text(label, 58, y, { width: 350 });
      doc.font('Helvetica-Bold').text(
        `- ${comprobante.moneda || 'USD'} ${formatCurrency(r.importe)}`,
        430, y, { width: 115, align: 'right' }
      );
      y += Math.max(h, 10) + 4;
    });
    y += 6;
  }

  // ============ Totales ============
  y += 4;
  doc.moveTo(300, y).lineTo(doc.page.width - 50, y).strokeColor(borderColor).stroke();
  y += 10;

  if (retenciones.length > 0) {
    // Desglose: importe bruto - retenciones = neto recibido
    const bruto = (parseFloat(comprobante.total) || 0) + totalRetenciones;
    doc.fontSize(9).fillColor(textColor).font('Helvetica');
    doc.text('Importe bruto:', 320, y);
    doc.font('Helvetica-Bold').text(`${comprobante.moneda || 'USD'} ${formatCurrency(bruto)}`, 430, y, { width: 115, align: 'right' });
    y += 14;
    doc.font('Helvetica').text('Total retenciones:', 320, y);
    doc.font('Helvetica-Bold').text(`- ${comprobante.moneda || 'USD'} ${formatCurrency(totalRetenciones)}`, 430, y, { width: 115, align: 'right' });
    y += 16;
  }

  doc.fontSize(13).fillColor(primaryColor).font('Helvetica-Bold');
  const totalLabel = comprobante.tipo === 'RECIBO'
    ? (retenciones.length > 0 ? 'NETO RECIBIDO' : 'TOTAL RECIBIDO')
    : 'TOTAL';
  doc.text(`${totalLabel}:`, 300, y);
  doc.text(`${comprobante.moneda || 'USD'} ${formatCurrency(comprobante.total)}`, 420, y, { width: 125, align: 'right' });
  y += 30;

  // ============ Texto del recibo ============
  if (comprobante.tipo === 'RECIBO') {
    doc.fontSize(9).fillColor(textColor).font('Helvetica');
    const textoRecibo = retenciones.length > 0
      ? `Recibimos de ${cliente.razonSocial || 'el cliente'} la suma indicada como neto recibido, en concepto de pago de la factura ${factura.numeroCompleto || '-'}, con más los certificados de retención detallados que completan el total de la operación.`
      : `Recibimos de ${cliente.razonSocial || 'el cliente'} la suma correspondiente al total indicado, en concepto de pago de la factura ${factura.numeroCompleto || '-'}.`;
    doc.text(textoRecibo, 50, y, { width: doc.page.width - 100, align: 'justify' });
    y += doc.heightOfString(textoRecibo, { width: doc.page.width - 100 }) + 15;
  }

  // Observaciones
  if (comprobante.observaciones) {
    doc.fontSize(8).fillColor(lightText).font('Helvetica-Oblique');
    doc.text(`Observaciones: ${comprobante.observaciones}`, 50, y, { width: doc.page.width - 100 });
    y += 25;
  }

  // ============ Firma ============
  y = Math.max(y + 40, 700);
  doc.moveTo(340, y).lineTo(545, y).strokeColor('#333').lineWidth(0.7).stroke();
  y += 8;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
  doc.text(tenant?.name?.toUpperCase() || '', 340, y, { width: 205, align: 'center' });

  return doc;
}

module.exports = { generarComprobantePdf };
