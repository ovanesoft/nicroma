const PDFDocument = require('pdfkit');

/**
 * Genera un PDF de Predespacho / Pedido de Fondos
 */
function generarPredespachoPdf(predespacho, tenant, bancoSeleccionado = null) {
  const doc = new PDFDocument({ 
    size: 'A4', 
    margin: 35,
    info: {
      Title: `${predespacho.tipoDocumento === 'PRESUPUESTO' ? 'Presupuesto' : 'Pedido de Fondos'} - ${predespacho.numero}`,
      Author: tenant?.name || 'Sistema',
      Subject: 'Predespacho'
    }
  });

  const primaryColor = '#1e40af';
  const headerBg = '#f1f5f9';
  const borderColor = '#cbd5e1';
  const textColor = '#1e293b';
  const lightText = '#64748b';

  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatNumber = (amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const pageWidth = doc.page.width - 70;
  let y = 35;

  // ============ ENCABEZADO CON LOGO ============
  const logoMaxW = 100;
  const logoMaxH = 50;
  let logoDrawn = false;

  // Intentar dibujar el logo del tenant arriba a la derecha
  if (tenant?.logoUrl) {
    try {
      const logoData = tenant.logoUrl;
      if (logoData.startsWith('data:image/')) {
        // Extraer el buffer del base64
        const base64Match = logoData.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
        if (base64Match) {
          const imgBuffer = Buffer.from(base64Match[2], 'base64');
          const logoX = doc.page.width - 35 - logoMaxW;
          doc.image(imgBuffer, logoX, y, { 
            fit: [logoMaxW, logoMaxH],
            align: 'right',
            valign: 'top'
          });
          logoDrawn = true;
        }
      }
    } catch (logoErr) {
      // Si falla el logo, simplemente no lo muestra
      console.error('Error insertando logo en PDF:', logoErr.message);
    }
  }

  // Nombre de la empresa arriba a la izquierda si hay logo
  if (logoDrawn && tenant?.name) {
    doc.fontSize(10).fillColor(textColor).font('Helvetica-Bold');
    doc.text(tenant.name, 35, y, { width: pageWidth - logoMaxW - 20 });
    if (tenant.companyPhone || tenant.companyEmail) {
      doc.fontSize(7).fillColor(lightText).font('Helvetica');
      const contactParts = [tenant.companyEmail, tenant.companyPhone].filter(Boolean);
      doc.text(contactParts.join(' • '), 35, y + 14, { width: pageWidth - logoMaxW - 20 });
    }
    y += logoMaxH + 8;
  }

  // Título principal
  doc.fontSize(16).fillColor(primaryColor).font('Helvetica-Bold');
  const titulo = predespacho.tipoDocumento === 'PRESUPUESTO' ? 'PRESUPUESTO' : 'PEDIDO DE FONDOS';
  doc.text(titulo, 35, y, { align: 'center' });
  y += 22;

  // Via badge
  if (predespacho.via) {
    doc.fontSize(10).fillColor(lightText).font('Helvetica');
    doc.text(predespacho.via, 35, y, { align: 'center' });
    y += 16;
  }

  doc.fontSize(10).fillColor(textColor).font('Helvetica-Bold');
  doc.text(`N° ${predespacho.numero}`, 35, y, { align: 'center' });
  y += 20;

  // ============ REFERENCIAS Y FECHAS ============
  doc.fontSize(8).fillColor(textColor).font('Helvetica');
  const col1 = 35, col2 = 200, col3 = 350;
  
  doc.font('Helvetica-Bold').text('Nuestra ref.:', col1, y);
  doc.font('Helvetica').text(predespacho.nuestraReferencia || '-', col1 + 65, y);
  doc.font('Helvetica-Bold').text('Vuestra ref.:', col2, y);
  doc.font('Helvetica').text(predespacho.vuestraReferencia || '-', col2 + 65, y);
  doc.font('Helvetica-Bold').text('Moneda:', col3, y);
  doc.font('Helvetica').text(predespacho.monedaPrincipal || 'USD', col3 + 45, y);
  y += 14;

  doc.font('Helvetica-Bold').text('Fecha:', col1, y);
  doc.font('Helvetica').text(formatDate(predespacho.fecha), col1 + 65, y);
  doc.font('Helvetica-Bold').text('Válido hasta:', col2, y);
  doc.font('Helvetica').text(formatDate(predespacho.validoHasta), col2 + 65, y);
  y += 20;

  // ============ DATOS DE LA OPERACIÓN ============
  // Nota informativa
  doc.fontSize(6).fillColor(lightText);
  doc.text('Solicitud y/o previsión de fondos para la importación o exportación de las mercaderías detalladas a continuación. Los valores son estimativos y sujetos a reajustes.', col1, y, { width: pageWidth });
  y += 16;

  // Tabla de datos de operación
  const drawField = (label, value, x, yPos, width = 150) => {
    doc.fontSize(7).fillColor(lightText).font('Helvetica-Bold').text(label, x, yPos);
    doc.fontSize(8).fillColor(textColor).font('Helvetica').text(value || '-', x, yPos + 9, { width });
  };

  const halfW = pageWidth / 2 - 5;
  
  drawField('Cliente', predespacho.cliente?.razonSocial || predespacho.solicitanteNombre || '-', col1, y, halfW);
  drawField('CUIT', predespacho.clienteCuit || predespacho.cliente?.numeroDocumento || '-', col1 + halfW + 10, y);
  y += 24;
  
  drawField('Mercadería', predespacho.mercaderia, col1, y, halfW);
  drawField('Cliente / Vend. Exterior', predespacho.clienteVendedorExterior, col1 + halfW + 10, y);
  y += 24;
  
  drawField('Destinación', predespacho.destinacion?.replace(/_/g, ' '), col1, y, halfW);
  drawField('Facturas proforma', predespacho.facturasProforma, col1 + halfW + 10, y);
  y += 24;
  
  drawField('ETA / ETD', predespacho.etaEtd, col1, y, 120);
  drawField('Aduana', predespacho.aduana, col1 + 130, y, 120);
  drawField('Vía', predespacho.via, col1 + 265, y, 80);
  drawField('Origen / Destino', predespacho.origenDestino, col1 + 350, y, 180);
  y += 24;
  
  drawField('B/L - Guía', predespacho.blGuia, col1, y, 120);
  drawField('Despachante', predespacho.despachante, col1 + 130, y, 120);
  drawField('Condición venta', predespacho.condicionVenta, col1 + 265, y, 80);
  drawField('Agente de Carga', predespacho.agenteCarga, col1 + 350, y, 180);
  y += 24;
  
  drawField('Peso neto', predespacho.pesoNeto ? `${formatNumber(predespacho.pesoNeto)} kg` : '-', col1, y, 100);
  drawField('Peso bruto', predespacho.pesoBruto ? `${formatNumber(predespacho.pesoBruto)} kg` : '-', col1 + 110, y, 100);
  drawField('Volumen', predespacho.volumenM3 ? `${formatNumber(predespacho.volumenM3)} m³` : '-', col1 + 220, y, 80);
  drawField('NCM', predespacho.posicionArancelaria, col1 + 310, y, 180);
  y += 24;

  drawField('SIMI / Fecha SALI', predespacho.simiSali, col1, y, 200);
  y += 26;

  // ============ VALORES BASE ============
  doc.moveTo(col1, y).lineTo(col1 + pageWidth, y).strokeColor(borderColor).lineWidth(0.5).stroke();
  y += 8;

  doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold').text('VALORES BASE', col1, y);
  y += 16;

  // Tabla de valores
  const vCol1 = col1, vCol2 = col1 + 120, vCol3 = col1 + 240;
  doc.fontSize(7).fillColor(lightText).font('Helvetica-Bold');
  doc.text('Concepto', vCol1, y);
  doc.text('En Divisas', vCol2, y, { align: 'right', width: 80 });
  doc.text('En U$S', vCol3, y, { align: 'right', width: 80 });
  y += 14;

  const drawValueRow = (label, divisas, usd) => {
    doc.fontSize(8).fillColor(textColor).font('Helvetica');
    doc.text(label, vCol1, y);
    doc.text(divisas !== null && divisas !== undefined ? formatNumber(divisas) : '-', vCol2, y, { align: 'right', width: 80 });
    doc.text(usd !== null && usd !== undefined ? formatNumber(usd) : '-', vCol3, y, { align: 'right', width: 80 });
    y += 12;
  };

  drawValueRow('FOB', predespacho.fobDivisas, predespacho.fobUsd);
  drawValueRow('Flete', predespacho.fleteDivisas, predespacho.fleteUsd);
  drawValueRow('Seguro', predespacho.seguroDivisas, predespacho.seguroUsd);
  drawValueRow('Ajuste incluir', null, predespacho.ajusteIncluir);
  drawValueRow('Ajuste a deducir', null, predespacho.ajusteDeducir);
  y += 4;

  // Tipos de cambio
  doc.fontSize(7).fillColor(lightText).font('Helvetica');
  doc.text(`TC SIM: ${predespacho.tipoCambioSim ? formatNumber(predespacho.tipoCambioSim) : '-'}`, vCol2, y);
  doc.text(`TC Gastos: ${predespacho.tipoCambioGastos ? formatNumber(predespacho.tipoCambioGastos) : '-'}`, vCol3, y);
  y += 12;

  doc.fontSize(8).fillColor(textColor).font('Helvetica-Bold');
  doc.text('Valor en Aduana U$S', vCol1, y);
  doc.text(formatNumber(predespacho.valorAduana), vCol2, y, { align: 'right', width: 80 });
  y += 12;
  doc.text('Base Imponible', vCol1, y);
  doc.text(formatNumber(predespacho.baseImponible), vCol2, y, { align: 'right', width: 80 });
  y += 20;

  // ============ DERECHOS ============
  const drawSection = (title, items, showAlicuota = true) => {
    if (y > 700) { doc.addPage(); y = 40; }
    
    doc.moveTo(col1, y).lineTo(col1 + pageWidth, y).strokeColor(borderColor).lineWidth(0.5).stroke();
    y += 8;
    doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold').text(title, col1, y);
    y += 16;

    // Header
    doc.fontSize(7).fillColor(lightText).font('Helvetica-Bold');
    doc.text('Concepto', col1, y, { width: 180 });
    if (showAlicuota) doc.text('Alícuota', col1 + 200, y, { align: 'right', width: 60 });
    doc.text('Importe U$S', col1 + 280, y, { align: 'right', width: 80 });
    doc.text('Importe AR$', col1 + 380, y, { align: 'right', width: 80 });
    y += 12;

    let totalUsd = 0, totalArs = 0;
    const parsedItems = Array.isArray(items) ? items : (typeof items === 'string' ? JSON.parse(items) : []);
    
    parsedItems.forEach(item => {
      if (y > 750) { doc.addPage(); y = 40; }
      doc.fontSize(7.5).fillColor(textColor).font('Helvetica');
      doc.text(item.concepto, col1, y, { width: 180 });
      if (showAlicuota && item.alicuota) {
        doc.text(`${(item.alicuota * 100).toFixed(1)}%`, col1 + 200, y, { align: 'right', width: 60 });
      }
      doc.text(formatNumber(item.importeUsd || 0), col1 + 280, y, { align: 'right', width: 80 });
      doc.text(formatNumber(item.importeArs || 0), col1 + 380, y, { align: 'right', width: 80 });
      totalUsd += (item.importeUsd || 0);
      totalArs += (item.importeArs || 0);
      y += 11;
    });

    y += 4;
    doc.fontSize(8).fillColor(textColor).font('Helvetica-Bold');
    doc.text(`Total ${title}`, col1, y, { width: 180 });
    doc.text(formatNumber(totalUsd), col1 + 280, y, { align: 'right', width: 80 });
    doc.text(formatNumber(totalArs), col1 + 380, y, { align: 'right', width: 80 });
    y += 18;
  };

  drawSection('DERECHOS', predespacho.derechos);
  drawSection('IMPUESTOS', predespacho.impuestos);
  drawSection('GASTOS', predespacho.gastos, false);

  // ============ TOTALES A TRANSFERIR ============
  if (y > 680) { doc.addPage(); y = 40; }
  doc.moveTo(col1, y).lineTo(col1 + pageWidth, y).strokeColor(primaryColor).lineWidth(1).stroke();
  y += 10;

  doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold').text('RESUMEN DE TRANSFERENCIAS', col1, y);
  y += 16;

  const drawTotalRow = (label, usd, ars, bold = false) => {
    doc.fontSize(8).fillColor(textColor).font(bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(label, col1, y, { width: 250 });
    doc.text(usd != null ? `U$S ${formatNumber(usd)}` : '-', col1 + 280, y, { align: 'right', width: 80 });
    doc.text(ars != null ? `AR$ ${formatNumber(ars)}` : '-', col1 + 380, y, { align: 'right', width: 80 });
    y += 14;
  };

  drawTotalRow('Total a transferir a cuenta forwarder', predespacho.totalTransferirForwarderUsd, predespacho.totalTransferirForwarderArs);
  drawTotalRow('Total a transferir a cuenta depósito fiscal', predespacho.totalTransferirDepositoUsd, predespacho.totalTransferirDepositoArs);
  drawTotalRow('Total a transferir a cuenta despachante', predespacho.totalTransferirDespachanteUsd, predespacho.totalTransferirDespachanteArs, true);
  drawTotalRow('Total gravámenes (vía VEP)', predespacho.totalGravamenesVepUsd, predespacho.totalGravamenesVepArs, true);
  y += 10;

  // ============ DATOS BANCARIOS ============
  if (bancoSeleccionado || tenant) {
    if (y > 680) { doc.addPage(); y = 40; }
    doc.moveTo(col1, y).lineTo(col1 + pageWidth, y).strokeColor(borderColor).lineWidth(0.5).stroke();
    y += 10;

    doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold').text('DATOS BANCARIOS', col1, y);
    y += 14;

    if (tenant) {
      doc.fontSize(8).fillColor(textColor).font('Helvetica-Bold');
      doc.text(tenant.name || '', col1, y);
      if (tenant.paymentBankCuit) doc.text(`CUIT: ${tenant.paymentBankCuit}`, col1 + 250, y);
      y += 14;
    }

    if (bancoSeleccionado) {
      doc.fontSize(7).fillColor(lightText).font('Helvetica-Bold');
      doc.text('Banco', col1, y); doc.text('Cuenta', col1 + 100, y); doc.text('CBU', col1 + 250, y); doc.text('Alias', col1 + 400, y);
      y += 10;
      doc.fontSize(8).fillColor(textColor).font('Helvetica');
      doc.text(bancoSeleccionado.banco || '-', col1, y);
      doc.text(bancoSeleccionado.cuenta || '-', col1 + 100, y);
      doc.text(bancoSeleccionado.cbu || '-', col1 + 250, y);
      doc.text(bancoSeleccionado.alias || '-', col1 + 400, y);
      y += 16;
    }
  }

  // ============ DISCLAIMER ============
  y += 10;
  doc.fontSize(6).fillColor(lightText).font('Helvetica');
  doc.text(
    'EL PRESENTE PRESUPUESTO DE GASTOS, ESTÁ EFECTUADO EN BASE A LOS COSTOS ESTIMADOS POR LOS AGENTES INTERVINIENTES AL DÍA DE LA FECHA, LOS CUALES PUEDEN VARIAR AL MOMENTO DE LA LIQUIDACIÓN DEFINITIVA.',
    col1, y, { width: pageWidth, align: 'center' }
  );

  return doc;
}

module.exports = { generarPredespachoPdf };
