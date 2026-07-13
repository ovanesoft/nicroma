const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { drawTenantLogo } = require('./pdfHelpers');

const TIPO_LETRA = {
  1: 'A', 2: 'A', 3: 'A',
  6: 'B', 7: 'B', 8: 'B',
  11: 'C', 12: 'C', 13: 'C'
};

const TIPO_NOMBRE = {
  1: 'FACTURA', 6: 'FACTURA', 11: 'FACTURA',
  2: 'NOTA DE DÉBITO', 7: 'NOTA DE DÉBITO', 12: 'NOTA DE DÉBITO',
  3: 'NOTA DE CRÉDITO', 8: 'NOTA DE CRÉDITO', 13: 'NOTA DE CRÉDITO'
};

/**
 * Genera el PDF de una Factura con el logo del tenant, detalle de ítems,
 * y si tiene CAE incluye el código, vencimiento y QR de ARCA.
 *
 * @param {Object} factura - Factura con cliente, items, carpeta
 * @param {Object} tenant - Datos del tenant
 * @param {Object|null} comprobanteFiscal - Registro fiscal (para QR y tipo)
 * @param {Buffer|null} logoBuffer - Logo decodificado
 * @param {Buffer|null} qrBuffer - Imagen PNG del QR de ARCA
 */
function generarFacturaPdf(factura, tenant, comprobanteFiscal = null, logoBuffer = null, qrBuffer = null) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `Factura ${factura.numeroCompleto}`,
      Author: tenant?.name || 'Sistema',
      Subject: 'Factura'
    }
  });

  const textColor = '#1e293b';
  const lightText = '#64748b';
  const borderColor = '#94a3b8';

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (v) => {
    if (v == null) return '-';
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  };

  const cliente = factura.cliente || {};
  const tipoCbte = comprobanteFiscal?.tipoComprobante;
  const letra = TIPO_LETRA[tipoCbte] || (factura.tipoComprobante?.length === 1 ? factura.tipoComprobante : 'X');
  const nombreDoc = TIPO_NOMBRE[tipoCbte] || 'FACTURA';

  const W = doc.page.width - 80;
  const X = 40;

  // ============ ENCABEZADO ============
  // Marco superior con datos del emisor (izq) y del comprobante (der)
  const headH = 140;
  doc.rect(X, 40, W, headH).strokeColor(borderColor).lineWidth(0.8).stroke();
  // Divisor central
  doc.moveTo(X + W / 2, 40).lineTo(X + W / 2, 40 + headH).stroke();

  // Recuadro de la letra (centro arriba)
  const letraBox = 34;
  doc.rect(X + W / 2 - letraBox / 2, 40, letraBox, letraBox).fillAndStroke('#ffffff', borderColor);
  doc.fontSize(20).fillColor('#000').font('Helvetica-Bold');
  doc.text(letra, X + W / 2 - letraBox / 2, 47, { width: letraBox, align: 'center' });
  doc.fontSize(5.5).font('Helvetica').fillColor(lightText);
  if (tipoCbte) {
    doc.text(`COD. ${String(tipoCbte).padStart(2, '0')}`, X + W / 2 - letraBox / 2, 68, { width: letraBox, align: 'center' });
  }

  // Izquierda: logo + datos del emisor
  drawTenantLogo(doc, logoBuffer, { right: doc.page.width - X - 130, top: 46, maxWidth: 110, maxHeight: 38 });
  doc.fontSize(10.5).fillColor(textColor).font('Helvetica-Bold');
  doc.text(tenant?.name || '', X + 8, 88, { width: W / 2 - 20 });
  doc.fontSize(6.5).fillColor(lightText).font('Helvetica');
  let ly = 102;
  const emisorCuit = tenant?.companyCuit || tenant?.paymentBankCuit;
  if (tenant?.companyAddress) { doc.text(tenant.companyAddress, X + 8, ly, { width: W / 2 - 20 }); ly += 8.5; }
  if (emisorCuit) { doc.text(`CUIT: ${emisorCuit}`, X + 8, ly); ly += 8.5; }
  if (tenant?.companyCondicionFiscal) { doc.text(`Cond. Fiscal: ${tenant.companyCondicionFiscal}`, X + 8, ly, { width: W / 2 - 20 }); ly += 8.5; }
  if (tenant?.companyIngresosBrutos) { doc.text(`Ingresos Brutos: ${tenant.companyIngresosBrutos}`, X + 8, ly, { width: W / 2 - 20 }); ly += 8.5; }
  if (tenant?.companyInicioActividad) { doc.text(`Inicio de Actividad: ${formatDate(tenant.companyInicioActividad)}`, X + 8, ly); ly += 8.5; }
  const contacto = [tenant?.companyEmail, tenant?.companyPhone].filter(Boolean).join(' • ');
  if (contacto) { doc.text(contacto, X + 8, ly, { width: W / 2 - 20 }); }

  // Derecha: tipo de documento + número + fechas
  const rx = X + W / 2 + 24;
  doc.fontSize(13).fillColor(textColor).font('Helvetica-Bold');
  doc.text(nombreDoc, rx, 48);
  doc.fontSize(10);
  doc.text(`N° ${comprobanteFiscal?.numeroCompleto || factura.numeroCompleto}`, rx, 64);
  doc.fontSize(7.5).font('Helvetica').fillColor(textColor);
  doc.text(`Fecha de emisión: ${formatDate(factura.fecha)}`, rx, 80);
  if (factura.fechaVencimiento) {
    doc.text(`Vto. pago: ${formatDate(factura.fechaVencimiento)}`, rx, 91);
  }
  doc.text(`Moneda: ${factura.moneda || 'USD'}${factura.cotizacion && factura.cotizacion !== 1 ? ` (cotiz. ${formatCurrency(factura.cotizacion)})` : ''}`, rx, 102);
  if (factura.periodoDesde || factura.periodoHasta) {
    doc.text(`Período: ${formatDate(factura.periodoDesde)} al ${formatDate(factura.periodoHasta)}`, rx, 113, { width: W / 2 - 30 });
  }
  if (factura.condicionVenta) {
    doc.text(`Condición de venta: ${factura.condicionVenta}`, rx, 124, { width: W / 2 - 30 });
  }

  let y = 40 + headH + 12;

  // ============ CLIENTE ============
  // Alturas dinámicas: razón social y domicilio pueden ocupar varias líneas
  doc.fontSize(8);
  doc.font('Helvetica');
  const hRazon = doc.heightOfString(cliente.razonSocial || '-', { width: W / 2 - 90 });
  const hDom = doc.heightOfString(cliente.direccion || '-', { width: W / 2 - 90 });
  const filaRazonH = Math.max(hRazon, 10) + 4;
  const filaDomH = Math.max(hDom, 10) + 4;
  const filaRefH = factura.carpeta?.numero ? 14 : 0;
  const clienteH = 8 + filaRazonH + filaDomH + filaRefH + 8;

  doc.rect(X, y, W, clienteH).strokeColor(borderColor).lineWidth(0.8).stroke();
  doc.fillColor(textColor);
  let cy = y + 8;
  doc.font('Helvetica-Bold').text('Señores:', X + 8, cy);
  doc.font('Helvetica').text(cliente.razonSocial || '-', X + 60, cy, { width: W / 2 - 90 });
  doc.font('Helvetica-Bold').text('CUIT:', X + W / 2 + 24, cy);
  doc.font('Helvetica').text(cliente.numeroDocumento || '-', X + W / 2 + 60, cy);
  cy += filaRazonH;
  doc.font('Helvetica-Bold').text('Domicilio:', X + 8, cy);
  doc.font('Helvetica').text(cliente.direccion || '-', X + 60, cy, { width: W / 2 - 90 });
  doc.font('Helvetica-Bold').text('Cond. IVA:', X + W / 2 + 24, cy);
  doc.font('Helvetica').text(cliente.condicionFiscal || 'Responsable Inscripto', X + W / 2 + 80, cy, { width: 140 });
  cy += filaDomH;
  if (factura.carpeta?.numero) {
    doc.font('Helvetica-Bold').text('Ref. Operación:', X + 8, cy);
    doc.font('Helvetica').text(
      `${factura.carpeta.numero}${factura.carpeta.houseBL ? ` • HBL ${factura.carpeta.houseBL}` : ''}`,
      X + 80, cy, { width: W - 100 }
    );
  }
  y += clienteH + 12;

  // ============ ÍTEMS ============
  // Columnas: descripción 175 | cant 30 | p.unit 70 | subtotal 75 | iva 70 | total 80
  const cDesc = X + 8, cCant = X + 190, cPU = X + 222, cSub = X + 297, cIva = X + 377, cTot = X + 442;
  const wPU = 70, wSub = 75, wIva = 60, wTot = W - (cTot - X) - 8;

  // Header de tabla
  doc.rect(X, y, W, 18).fill('#f1f5f9').strokeColor(borderColor).stroke();
  doc.fontSize(7.5).fillColor(textColor).font('Helvetica-Bold');
  doc.text('Descripción', cDesc, y + 5, { width: 175 });
  doc.text('Cant.', cCant, y + 5);
  doc.text('P. Unitario', cPU, y + 5, { width: wPU, align: 'right' });
  doc.text('Subtotal', cSub, y + 5, { width: wSub, align: 'right' });
  doc.text('IVA', cIva, y + 5, { width: wIva, align: 'right' });
  doc.text('Total', cTot, y + 5, { width: wTot, align: 'right' });
  y += 22;

  doc.font('Helvetica').fontSize(8).fillColor(textColor);
  (factura.items || []).forEach(item => {
    if (y > 620) { doc.addPage(); y = 50; }
    doc.text(item.descripcion || '-', cDesc, y, { width: 175 });
    const altura = Math.max(doc.heightOfString(item.descripcion || '-', { width: 175 }), 10);
    doc.text(`${item.cantidad ?? 1}`, cCant, y);
    doc.text(formatCurrency(item.precioUnitario), cPU, y, { width: wPU, align: 'right' });
    doc.text(formatCurrency(item.subtotal), cSub, y, { width: wSub, align: 'right' });
    doc.text(formatCurrency(item.iva), cIva, y, { width: wIva, align: 'right' });
    doc.font('Helvetica-Bold').text(formatCurrency(item.total), cTot, y, { width: wTot, align: 'right' });
    doc.font('Helvetica');
    y += altura + 6;
  });

  y += 6;
  doc.moveTo(X + 300, y).lineTo(X + W, y).strokeColor(borderColor).lineWidth(0.5).stroke();
  y += 10;

  // ============ TOTALES ============
  doc.fontSize(9).fillColor(textColor).font('Helvetica');
  doc.text('Subtotal:', X + 340, y);
  doc.font('Helvetica-Bold').text(`${factura.moneda} ${formatCurrency(factura.subtotal)}`, X + 430, y, { width: W - 438, align: 'right' });
  y += 14;
  doc.font('Helvetica').text('IVA:', X + 340, y);
  doc.font('Helvetica-Bold').text(`${factura.moneda} ${formatCurrency(factura.iva)}`, X + 430, y, { width: W - 438, align: 'right' });
  y += 14;
  if (parseFloat(factura.percepcionIVA) > 0) {
    doc.font('Helvetica').text('Percepción IVA:', X + 340, y);
    doc.font('Helvetica-Bold').text(`${factura.moneda} ${formatCurrency(factura.percepcionIVA)}`, X + 430, y, { width: W - 438, align: 'right' });
    y += 14;
  }
  if (parseFloat(factura.percepcionIIBB) > 0) {
    doc.font('Helvetica').text('Percepción IIBB:', X + 340, y);
    doc.font('Helvetica-Bold').text(`${factura.moneda} ${formatCurrency(factura.percepcionIIBB)}`, X + 430, y, { width: W - 438, align: 'right' });
    y += 14;
  }
  doc.fontSize(13).fillColor('#000').font('Helvetica-Bold');
  doc.text('TOTAL:', X + 320, y);
  doc.text(`${factura.moneda} ${formatCurrency(factura.total)}`, X + 400, y, { width: W - 408, align: 'right' });
  y += 30;

  // Observaciones
  if (factura.observaciones) {
    doc.fontSize(8).fillColor(lightText).font('Helvetica-Oblique');
    doc.text(`Observaciones: ${factura.observaciones}`, X, y, { width: W });
    y += 20;
  }

  // ============ PIE FISCAL: CAE + QR ============
  if (factura.cae) {
    const footY = Math.max(y + 10, 690);
    doc.rect(X, footY, W, 80).strokeColor(borderColor).lineWidth(0.8).stroke();

    // QR a la izquierda
    if (qrBuffer) {
      try {
        doc.image(qrBuffer, X + 10, footY + 8, { fit: [64, 64] });
      } catch (e) {
        console.error('Error insertando QR en PDF:', e.message);
      }
    }

    // Datos del CAE
    const caeX = X + (qrBuffer ? 90 : 12);
    doc.fontSize(10).fillColor(textColor).font('Helvetica-Bold');
    doc.text(`CAE: ${factura.cae}`, caeX, footY + 16);
    doc.fontSize(8).font('Helvetica');
    if (factura.vencimientoCAE) {
      doc.text(`Vencimiento CAE: ${formatDate(factura.vencimientoCAE)}`, caeX, footY + 32);
    }
    doc.fontSize(7).fillColor(lightText);
    doc.text('Comprobante Autorizado por ARCA (ex AFIP)', caeX, footY + 46);
    doc.text('Esta agencia no se responsabiliza por los datos ingresados en el detalle de la operación.', caeX, footY + 56, { width: W - 110 });
  } else {
    const footY = Math.max(y + 10, 720);
    doc.fontSize(8).fillColor('#b45309').font('Helvetica-Oblique');
    doc.text('Documento sin CAE — pendiente de autorización electrónica ante ARCA.', X, footY, { width: W, align: 'center' });
  }

  return doc;
}

/**
 * Genera el buffer PNG del QR de ARCA a partir del qrData (URL).
 */
async function generarQRBuffer(qrData) {
  if (!qrData) return null;
  try {
    return await QRCode.toBuffer(qrData, { width: 180, margin: 1 });
  } catch (error) {
    console.error('Error generando imagen QR:', error.message);
    return null;
  }
}

module.exports = { generarFacturaPdf, generarQRBuffer };
