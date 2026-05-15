const PDFDocument = require('pdfkit');
const { drawTenantLogo } = require('./pdfHelpers');

/**
 * Genera un PDF de Aviso de Arribo (Importación) o Aviso de Salida (Exportación)
 * basado en el sector de la carpeta.
 *
 * @param {Object} carpeta - Datos completos de la carpeta con relaciones
 * @param {Object} tenant - Datos del tenant (despachante)
 * @param {Object} bancoSeleccionado - Cuenta bancaria seleccionada para el PDF
 * @param {Buffer|null} logoBuffer - Logo ya decodificado (cargado por el caller)
 * @returns {PDFDocument} - Documento PDF
 */
function generarAvisoArribo(carpeta, tenant, bancoSeleccionado = null, logoBuffer = null) {
  const esExportacion = (carpeta.sector || '').toLowerCase() === 'exportación'
    || (carpeta.sector || '').toLowerCase() === 'exportacion';
  const tituloDoc = esExportacion ? 'Aviso de Salida' : 'Aviso de Arribo';
  const tituloUpper = esExportacion ? 'AVISO DE SALIDA' : 'AVISO DE ARRIBO';

  const doc = new PDFDocument({
    size: 'A4',
    margin: 36,
    info: {
      Title: `${tituloDoc} - ${carpeta.houseBL || carpeta.numero}`,
      Author: tenant?.name || 'Sistema',
      Subject: `${tituloDoc} de Embarque`
    }
  });

  // Constantes geometría
  const PAGE_W = doc.page.width;       // 595.28 en A4
  const PAGE_H = doc.page.height;      // 841.89 en A4
  const M_LEFT  = 36;
  const M_RIGHT = 36;
  const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT; // ~523
  const COL_DIVIDER = M_LEFT + Math.floor(CONTENT_W / 2); // ~298

  // Colores
  const primaryColor = '#1e40af';
  const headerBg     = '#f1f5f9';
  const borderColor  = '#cbd5e1';
  const textColor    = '#1e293b';
  const lightText    = '#64748b';

  // Helpers
  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatNumber = (amount) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Calcular totales de mercancías
  const totalBultos  = carpeta.mercancias?.reduce((s, m) => s + (m.bultos  || 0), 0) || 0;
  const totalVolumen = carpeta.mercancias?.reduce((s, m) => s + (m.volumen || 0), 0) || 0;
  const totalPeso    = carpeta.mercancias?.reduce((s, m) => s + (m.peso    || 0), 0) || 0;
  const descripcionMercaderia = carpeta.mercancias?.map(m => m.descripcion).filter(Boolean).join(', ') || '-';

  // Formatear contenedores
  const contenedoresStr = carpeta.contenedores?.map(c => {
    const parts = [c.tipo];
    if (c.numero) parts.push(c.numero);
    if (c.blContenedor) parts.push(c.blContenedor);
    return parts.join(' - ');
  }).join('\n') || '-';

  // Calcular totales de gastos
  let totalGravado = 0;
  let totalIVA = 0;
  let totalExento = 0;
  carpeta.gastos?.forEach(g => {
    if (g.gravado) {
      totalGravado += g.totalVenta || 0;
      totalIVA += (g.totalVenta || 0) * (g.porcentajeIVA || 21) / 100;
    } else {
      totalExento += g.totalVenta || 0;
    }
  });
  const totalGeneral = totalGravado + totalIVA + totalExento;

  // ============ ENCABEZADO ============
  const logoInfo = drawTenantLogo(doc, logoBuffer, {
    right: M_RIGHT, top: 28, maxWidth: 100, maxHeight: 50
  });

  // Reservamos un ancho de texto que no se monte sobre el logo
  const titleTextWidth = logoInfo.drawn ? CONTENT_W - logoInfo.width - 14 : CONTENT_W;
  doc.fontSize(18).fillColor(primaryColor).font('Helvetica-Bold');
  doc.text(tituloUpper, M_LEFT, 34, { align: 'center', width: titleTextWidth });

  // Fecha y destinatario
  doc.fontSize(9).fillColor(textColor).font('Helvetica');
  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  doc.text(`CABA, ${fechaHoy}`, M_LEFT, 62);
  doc.text('Atte,', M_LEFT, 75);
  doc.text('Depto. Operaciones', M_LEFT, 86);

  // ============ Helper: header de sección compacto ============
  const drawSectionHeader = (title, y) => {
    doc.rect(M_LEFT, y, CONTENT_W, 16).fill(headerBg).stroke();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10);
    doc.text(title, M_LEFT + 8, y + 4);
    return y + 20;
  };

  // ============ DATOS DEL EMBARQUE ============
  let y = 105;
  y = drawSectionHeader('DATOS DEL EMBARQUE', y);

  const labelX1 = M_LEFT + 4;
  const valueX1 = M_LEFT + 70;
  const labelX2 = COL_DIVIDER + 4;
  const valueX2 = COL_DIVIDER + 70;
  const colMaxW = (CONTENT_W / 2) - 70;
  const ROW_H = 13;

  doc.fontSize(8.5).fillColor(textColor);
  const fila = (label1, val1, label2, val2) => {
    doc.font('Helvetica-Bold').text(label1, labelX1, y);
    doc.font('Helvetica').text(val1 || '-', valueX1, y, { width: colMaxW });
    if (label2) {
      doc.font('Helvetica-Bold').text(label2, labelX2, y);
      doc.font('Helvetica').text(val2 || '-', valueX2, y, { width: colMaxW });
    }
    y += ROW_H;
  };

  const traficoText = carpeta.area === 'Aéreo' && carpeta.tipoOperacionAerea
    ? `${carpeta.area} - ${carpeta.tipoOperacionAerea}`
    : `${carpeta.area || ''} ${carpeta.tipoOperacion || ''}`.trim();

  fila('Tráfico:',   traficoText,                  'Customer:',     carpeta.cliente?.razonSocial);
  fila('Operación:', carpeta.numero,               'Ref. Cliente:', carpeta.referenciaCliente);
  fila('HBL:',       carpeta.houseBL,              'MBL:',          carpeta.masterBL);
  fila('Origen:',    carpeta.puertoOrigen,         'Destino:',      carpeta.puertoDestino);
  fila('Salida:',    formatDate(carpeta.fechaSalidaConfirmada  || carpeta.fechaSalidaEstimada),
       'Llegada:',   formatDate(carpeta.fechaLlegadaConfirmada || carpeta.fechaLlegadaEstimada));
  fila('Buque:',     carpeta.buque,                'Viaje:',        carpeta.viaje);
  if (carpeta.puertoTransbordo) {
    fila('Transbordo:', carpeta.puertoTransbordo, null, null);
  }
  fila('Dep. Fiscal:', carpeta.depositoFiscal,    'Shipper:',      carpeta.shipper?.razonSocial);

  // ============ DETALLE DE LA CARGA ============
  y += 6;
  y = drawSectionHeader('DETALLE DE LA CARGA', y);

  doc.fontSize(8.5).fillColor(textColor);
  doc.font('Helvetica-Bold').text('Bultos:',  labelX1,      y);
  doc.font('Helvetica').text(`${totalBultos} PCS`, labelX1 + 45, y);
  doc.font('Helvetica-Bold').text('Volumen:', M_LEFT + 175, y);
  doc.font('Helvetica').text(`${formatNumber(totalVolumen)} CBM`, M_LEFT + 222, y);
  doc.font('Helvetica-Bold').text('Kg. Brutos:', M_LEFT + 330, y);
  doc.font('Helvetica').text(`${formatNumber(totalPeso)} KG`, M_LEFT + 388, y);
  y += ROW_H + 2;

  doc.font('Helvetica-Bold').text('CNTDs:', labelX1, y);
  const contenedorLines = contenedoresStr.split('\n');
  contenedorLines.forEach((line, i) => {
    doc.font('Helvetica').text(line, labelX1 + 45, y + (i * 11), { width: CONTENT_W - 50 });
  });
  y += Math.max(11, contenedorLines.length * 11);

  y += 2;
  doc.font('Helvetica-Bold').text('Mercadería:', labelX1, y);
  doc.font('Helvetica').text(descripcionMercaderia, labelX1 + 62, y, { width: CONTENT_W - 70 });

  // Detalle individual de mercancías con dimensiones (compacto)
  const mercConDimensiones = carpeta.mercancias?.filter(m => m.largo || m.ancho || m.alto) || [];
  if (mercConDimensiones.length > 0) {
    y += 16;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryColor);
    doc.text('DESCRIPCIÓN', labelX1,        y);
    doc.text('BULTOS',      M_LEFT + 200,   y);
    doc.text('L×A×H (cm)',  M_LEFT + 260,   y);
    doc.text('CBM',         M_LEFT + 370,   y);
    doc.text('PESO',        M_LEFT + 430,   y);
    y += 2;
    doc.moveTo(M_LEFT, y + 9).lineTo(M_LEFT + CONTENT_W, y + 9)
       .strokeColor('#cccccc').lineWidth(0.5).stroke();
    y += 12;
    doc.font('Helvetica').fontSize(7.5).fillColor(textColor);
    mercConDimensiones.forEach(m => {
      const dims = `${m.largo || 0} × ${m.ancho || 0} × ${m.alto || 0}`;
      doc.text(m.descripcion || '-', labelX1, y, { width: 145 });
      doc.text(`${m.bultos || 0}`, M_LEFT + 200, y);
      doc.text(dims, M_LEFT + 260, y);
      doc.text(m.volumen ? `${formatNumber(m.volumen)}` : '-', M_LEFT + 370, y);
      doc.text(m.peso    ? `${formatNumber(m.peso)} kg` : '-', M_LEFT + 430, y);
      y += 11;
    });
  }

  // ============ CLIENTE ============
  y += 8;
  y = drawSectionHeader('CLIENTE', y);

  doc.fontSize(8.5).fillColor(textColor);
  doc.font('Helvetica-Bold').text('Nombre:', labelX1, y);
  doc.font('Helvetica').text(carpeta.cliente?.razonSocial || '-', valueX1, y, { width: colMaxW });
  doc.font('Helvetica-Bold').text('Teléfono:', labelX2, y);
  doc.font('Helvetica').text(carpeta.cliente?.telefono || '-', valueX2, y, { width: colMaxW });
  y += ROW_H;
  doc.font('Helvetica-Bold').text('CUIT:', labelX1, y);
  doc.font('Helvetica').text(carpeta.cliente?.numeroDocumento || '-', valueX1, y, { width: colMaxW });
  doc.font('Helvetica-Bold').text('E-mail:', labelX2, y);
  doc.font('Helvetica').text(carpeta.cliente?.email || '-', valueX2, y, { width: colMaxW });

  // ============ CARGOS ============
  if (carpeta.gastos && carpeta.gastos.length > 0) {
    y += 18;
    y = drawSectionHeader('CARGOS', y);

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(lightText);
    doc.text('Descripción', labelX1, y);
    doc.text('Tipo',        M_LEFT + 340, y);
    doc.text('Importe',     M_LEFT + 390, y, { align: 'right', width: 60 });
    doc.text('IVA',         M_LEFT + 460, y, { align: 'right', width: 60 });
    y += 10;
    doc.moveTo(M_LEFT, y).lineTo(M_LEFT + CONTENT_W, y).strokeColor(borderColor).stroke();
    y += 4;

    doc.font('Helvetica').fontSize(8).fillColor(textColor);
    carpeta.gastos.forEach(gasto => {
      // Cortar línea si no entra en la página (deja espacio para totales/nota/bank)
      if (y > PAGE_H - 200) {
        doc.addPage();
        y = 50;
      }
      const tipo = gasto.gravado ? 'G' : 'E';
      const iva = gasto.gravado ? (gasto.totalVenta * (gasto.porcentajeIVA || 21) / 100) : 0;
      doc.text(gasto.concepto || '-', labelX1, y, { width: 290 });
      doc.text(tipo, M_LEFT + 345, y);
      doc.text(formatNumber(gasto.totalVenta), M_LEFT + 390, y, { align: 'right', width: 60 });
      doc.text(iva > 0 ? formatNumber(iva) : '', M_LEFT + 460, y, { align: 'right', width: 60 });
      y += 11;
    });

    y += 3;
    doc.moveTo(M_LEFT + 290, y).lineTo(M_LEFT + CONTENT_W, y).strokeColor(borderColor).stroke();
    y += 6;

    doc.font('Helvetica-Bold').fontSize(9.5);
    const moneda = carpeta.moneda || 'USD';
    doc.text(`TOTAL ${moneda} (IVA Inc.):`, M_LEFT + 290, y);
    doc.text(formatNumber(totalGeneral), M_LEFT + 460, y, { align: 'right', width: 60 });
  }

  // ============ NOTA DE PAGO + DATOS BANCARIOS ============
  // Reservamos espacio mínimo para no romper en saltos innecesarios.
  const espacioRestante = PAGE_H - 36 - y;
  const necesitaPaginaParaBanco = bancoSeleccionado && espacioRestante < 130;
  if (necesitaPaginaParaBanco) {
    doc.addPage();
    y = 50;
  } else {
    y += 18;
  }

  doc.font('Helvetica').fontSize(7.5).fillColor(lightText);
  const notaPago = `Estimado cliente: el pago deberá efectuarse mediante transferencia bancaria en pesos, al tipo de cambio informado por ${tenant?.name || 'la empresa'} al momento de realizar la transferencia.`;
  doc.text(notaPago, M_LEFT, y, { width: CONTENT_W, align: 'left' });
  y += 22;

  if (bancoSeleccionado) {
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(textColor);
    doc.text('Datos Bancarios:', M_LEFT, y);
    y += 12;
    doc.font('Helvetica').fontSize(8.5);

    const bancoLines = [
      bancoSeleccionado.banco,
      bancoSeleccionado.alias && `ALIAS: ${bancoSeleccionado.alias}`,
      bancoSeleccionado.cuenta && `Cuenta: ${bancoSeleccionado.cuenta}`,
      bancoSeleccionado.cbu && `CBU: ${bancoSeleccionado.cbu}`,
      bancoSeleccionado.cuit && `CUIT: ${bancoSeleccionado.cuit}`,
      bancoSeleccionado.titular && `Titular: ${bancoSeleccionado.titular}`,
      bancoSeleccionado.moneda && bancoSeleccionado.moneda !== 'ARS' && `Moneda: ${bancoSeleccionado.moneda}`,
    ].filter(Boolean);

    bancoLines.forEach(line => {
      doc.text(line, M_LEFT, y);
      y += 11;
    });
  }

  y += 6;
  doc.font('Helvetica').fontSize(7.5).fillColor(lightText);
  doc.text('Agradecemos adjuntar el comprobante una vez realizado el pago.', M_LEFT, y);

  return doc;
}

module.exports = { generarAvisoArribo };
