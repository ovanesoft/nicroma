const PDFDocument = require('pdfkit');

/**
 * Genera un PDF de Aviso de Arribo basado en los datos de una carpeta
 * @param {Object} carpeta - Datos completos de la carpeta con relaciones
 * @param {Object} tenant - Datos del tenant (despachante)
 * @param {Object} bancoSeleccionado - Cuenta bancaria seleccionada para el PDF
 * @returns {PDFDocument} - Documento PDF
 */
function generarAvisoArribo(carpeta, tenant, bancoSeleccionado = null) {
  const doc = new PDFDocument({ 
    size: 'A4', 
    margin: 40,
    info: {
      Title: `Aviso de Arribo - ${carpeta.houseBL || carpeta.numero}`,
      Author: tenant?.name || 'Sistema',
      Subject: 'Aviso de Arribo de Embarque'
    }
  });

  // Colores
  const primaryColor = '#1e40af'; // Azul
  const headerBg = '#f1f5f9';
  const borderColor = '#cbd5e1';
  const textColor = '#1e293b';
  const lightText = '#64748b';

  // Helpers
  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Calcular totales de mercancías
  const totalBultos = carpeta.mercancias?.reduce((sum, m) => sum + (m.bultos || 0), 0) || 0;
  const totalVolumen = carpeta.mercancias?.reduce((sum, m) => sum + (m.volumen || 0), 0) || 0;
  const totalPeso = carpeta.mercancias?.reduce((sum, m) => sum + (m.peso || 0), 0) || 0;
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
  // Título principal
  doc.fontSize(20).fillColor(primaryColor).font('Helvetica-Bold');
  doc.text('AVISO DE ARRIBO', 40, 40, { align: 'center' });

  // Fecha y destinatario
  doc.fontSize(10).fillColor(textColor).font('Helvetica');
  const fechaHoy = new Date().toLocaleDateString('es-AR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  doc.text(`CABA, ${fechaHoy}`, 40, 70);
  doc.text('Atte,', 40, 85);
  doc.text('Depto. Operaciones', 40, 97);

  // ============ SECCIÓN DATOS DE EMBARQUE ============
  let y = 120;
  
  // Fondo del header
  doc.rect(40, y, 515, 20).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11);
  doc.text('DATOS DEL EMBARQUE', 50, y + 5);
  
  y += 25;
  
  // Grid de datos del embarque
  const colWidth = 257;
  doc.font('Helvetica').fontSize(9).fillColor(textColor);
  
  // Fila 1
  doc.font('Helvetica-Bold').text('Tráfico:', 50, y);
  doc.font('Helvetica').text(`${carpeta.area || ''} ${carpeta.tipoOperacion || ''}`, 110, y);
  doc.font('Helvetica-Bold').text('Customer:', 300, y);
  doc.font('Helvetica').text(carpeta.cliente?.razonSocial || '-', 360, y, { width: 180 });
  
  y += 15;
  doc.font('Helvetica-Bold').text('Operación:', 50, y);
  doc.font('Helvetica').text(carpeta.numero || '-', 110, y);
  doc.font('Helvetica-Bold').text('Ref. Cliente:', 300, y);
  doc.font('Helvetica').text(carpeta.referenciaCliente || '-', 360, y);
  
  y += 15;
  doc.font('Helvetica-Bold').text('HBL:', 50, y);
  doc.font('Helvetica').text(carpeta.houseBL || '-', 110, y);
  doc.font('Helvetica-Bold').text('MBL:', 300, y);
  doc.font('Helvetica').text(carpeta.masterBL || '-', 360, y);
  
  y += 15;
  doc.font('Helvetica-Bold').text('Origen:', 50, y);
  doc.font('Helvetica').text(carpeta.puertoOrigen || '-', 110, y);
  doc.font('Helvetica-Bold').text('Destino:', 300, y);
  doc.font('Helvetica').text(carpeta.puertoDestino || '-', 360, y);
  
  y += 15;
  doc.font('Helvetica-Bold').text('Salida:', 50, y);
  doc.font('Helvetica').text(formatDate(carpeta.fechaSalidaConfirmada || carpeta.fechaSalidaEstimada), 110, y);
  doc.font('Helvetica-Bold').text('Llegada:', 300, y);
  doc.font('Helvetica').text(formatDate(carpeta.fechaLlegadaConfirmada || carpeta.fechaLlegadaEstimada), 360, y);
  
  y += 15;
  doc.font('Helvetica-Bold').text('Buque:', 50, y);
  doc.font('Helvetica').text(carpeta.buque || '-', 110, y);
  doc.font('Helvetica-Bold').text('Viaje:', 300, y);
  doc.font('Helvetica').text(carpeta.viaje || '-', 360, y);
  
  y += 15;
  if (carpeta.puertoTransbordo) {
    doc.font('Helvetica-Bold').text('Transbordo:', 50, y);
    doc.font('Helvetica').text(carpeta.puertoTransbordo, 110, y);
    y += 15;
  }
  
  doc.font('Helvetica-Bold').text('Dep. Fiscal:', 50, y);
  doc.font('Helvetica').text(carpeta.depositoFiscal || '-', 110, y);
  doc.font('Helvetica-Bold').text('Shipper:', 300, y);
  doc.font('Helvetica').text(carpeta.shipper?.razonSocial || '-', 360, y, { width: 180 });

  // ============ SECCIÓN DETALLE DE LA CARGA ============
  y += 30;
  doc.rect(40, y, 515, 20).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11);
  doc.text('DETALLE DE LA CARGA', 50, y + 5);
  
  y += 25;
  doc.font('Helvetica').fontSize(9).fillColor(textColor);
  
  // Fila de bultos/volumen/peso
  doc.font('Helvetica-Bold').text('Bultos:', 50, y);
  doc.font('Helvetica').text(`${totalBultos} PCS`, 100, y);
  doc.font('Helvetica-Bold').text('Volumen:', 180, y);
  doc.font('Helvetica').text(`${formatCurrency(totalVolumen)} CBM`, 230, y);
  doc.font('Helvetica-Bold').text('Kg. Brutos:', 350, y);
  doc.font('Helvetica').text(`${formatCurrency(totalPeso)} KG`, 410, y);
  
  y += 18;
  doc.font('Helvetica-Bold').text('CNTDs:', 50, y);
  // Contenedores pueden ser multilínea
  const contenedorLines = contenedoresStr.split('\n');
  contenedorLines.forEach((line, i) => {
    doc.font('Helvetica').text(line, 100, y + (i * 12), { width: 440 });
  });
  y += Math.max(12, contenedorLines.length * 12);
  
  y += 5;
  doc.font('Helvetica-Bold').text('Mercadería:', 50, y);
  doc.font('Helvetica').text(descripcionMercaderia, 110, y, { width: 435 });

  // ============ SECCIÓN CLIENTE ============
  y += 35;
  doc.rect(40, y, 515, 20).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11);
  doc.text('CLIENTE', 50, y + 5);
  
  y += 25;
  doc.font('Helvetica').fontSize(9).fillColor(textColor);
  
  doc.font('Helvetica-Bold').text('Nombre:', 50, y);
  doc.font('Helvetica').text(carpeta.cliente?.razonSocial || '-', 110, y);
  doc.font('Helvetica-Bold').text('Teléfono:', 300, y);
  doc.font('Helvetica').text(carpeta.cliente?.telefono || '-', 360, y);
  
  y += 15;
  doc.font('Helvetica-Bold').text('CUIT:', 50, y);
  doc.font('Helvetica').text(carpeta.cliente?.numeroDocumento || '-', 110, y);
  doc.font('Helvetica-Bold').text('E-mail:', 300, y);
  doc.font('Helvetica').text(carpeta.cliente?.email || '-', 360, y, { width: 180 });

  // ============ SECCIÓN CARGOS ============
  if (carpeta.gastos && carpeta.gastos.length > 0) {
    y += 35;
    doc.rect(40, y, 515, 20).fill(headerBg).stroke();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11);
    doc.text('CARGOS', 50, y + 5);
    
    y += 25;
    
    // Encabezado de tabla
    doc.font('Helvetica-Bold').fontSize(8).fillColor(lightText);
    doc.text('Descripción', 50, y);
    doc.text('Tipo', 350, y);
    doc.text('Importe', 400, y, { align: 'right', width: 60 });
    doc.text('IVA', 470, y, { align: 'right', width: 60 });
    
    y += 12;
    doc.moveTo(50, y).lineTo(530, y).strokeColor(borderColor).stroke();
    y += 5;
    
    // Filas de gastos
    doc.font('Helvetica').fontSize(8).fillColor(textColor);
    carpeta.gastos.forEach(gasto => {
      const tipo = gasto.gravado ? 'G' : 'E';
      const iva = gasto.gravado ? (gasto.totalVenta * (gasto.porcentajeIVA || 21) / 100) : 0;
      
      doc.text(gasto.concepto, 50, y, { width: 290 });
      doc.text(tipo, 355, y);
      doc.text(formatCurrency(gasto.totalVenta), 400, y, { align: 'right', width: 60 });
      doc.text(iva > 0 ? formatCurrency(iva) : '', 470, y, { align: 'right', width: 60 });
      
      y += 12;
      
      // Nueva página si es necesario
      if (y > 720) {
        doc.addPage();
        y = 50;
      }
    });
    
    // Línea separadora
    y += 5;
    doc.moveTo(300, y).lineTo(530, y).strokeColor(borderColor).stroke();
    y += 10;
    
    // Total
    doc.font('Helvetica-Bold').fontSize(10);
    const moneda = carpeta.moneda || 'USD';
    doc.text(`TOTAL ${moneda} (IVA Inc.):`, 300, y);
    doc.text(formatCurrency(totalGeneral), 470, y, { align: 'right', width: 60 });
  }

  // ============ NOTA DE PAGO ============
  y += 30;
  doc.font('Helvetica').fontSize(8).fillColor(lightText);
  doc.text(
    'Estimado cliente: el pago deberá efectuarse mediante transferencia bancaria en pesos, al tipo de cambio informado por',
    50, y, { width: 480, align: 'left' }
  );
  y += 12;
  doc.text(
    `${tenant?.name || 'la empresa'} al momento de realizar la transferencia.`,
    50, y, { width: 480, align: 'left' }
  );

  // ============ DATOS BANCARIOS DEL TENANT ============
  if (bancoSeleccionado) {
    y += 25;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
    doc.text('Datos Bancarios:', 50, y);
    y += 15;
    
    doc.font('Helvetica').fontSize(9);
    
    if (bancoSeleccionado.banco) {
      doc.text(bancoSeleccionado.banco, 50, y);
      y += 12;
    }
    if (bancoSeleccionado.alias) {
      doc.text(`ALIAS: ${bancoSeleccionado.alias}`, 50, y);
      y += 12;
    }
    if (bancoSeleccionado.cuenta) {
      doc.text(`Cuenta: ${bancoSeleccionado.cuenta}`, 50, y);
      y += 12;
    }
    if (bancoSeleccionado.cbu) {
      doc.text(`CBU: ${bancoSeleccionado.cbu}`, 50, y);
      y += 12;
    }
    if (bancoSeleccionado.cuit) {
      doc.text(`CUIT: ${bancoSeleccionado.cuit}`, 50, y);
      y += 12;
    }
    if (bancoSeleccionado.titular) {
      doc.text(`Titular: ${bancoSeleccionado.titular}`, 50, y);
      y += 12;
    }
    if (bancoSeleccionado.moneda && bancoSeleccionado.moneda !== 'ARS') {
      doc.text(`Moneda: ${bancoSeleccionado.moneda}`, 50, y);
      y += 12;
    }
  }

  // Mensaje final
  y += 15;
  doc.font('Helvetica').fontSize(8).fillColor(lightText);
  doc.text('Agradecemos adjuntar el comprobante una vez realizado el pago.', 50, y);

  return doc;
}

module.exports = { generarAvisoArribo };
