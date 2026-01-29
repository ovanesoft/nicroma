const PDFDocument = require('pdfkit');

/**
 * Genera un PDF de Presupuesto Formal basado en los datos de un presupuesto
 * @param {Object} presupuesto - Datos completos del presupuesto con relaciones
 * @param {Object} tenant - Datos del tenant (despachante)
 * @returns {PDFDocument} - Documento PDF
 */
function generarPresupuestoFormal(presupuesto, tenant) {
  const doc = new PDFDocument({ 
    size: 'A4', 
    margin: 40,
    info: {
      Title: `Presupuesto Formal - ${presupuesto.houseBL || presupuesto.numero}`,
      Author: tenant?.name || 'Sistema',
      Subject: 'Presupuesto Formal de Operación'
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
  const totalBultos = presupuesto.mercancias?.reduce((sum, m) => sum + (m.bultos || 0), 0) || 0;
  const totalVolumen = presupuesto.mercancias?.reduce((sum, m) => sum + (m.volumen || 0), 0) || 0;
  const totalPeso = presupuesto.mercancias?.reduce((sum, m) => sum + (m.peso || 0), 0) || 0;
  const descripcionMercaderia = presupuesto.mercancias?.map(m => m.descripcion).filter(Boolean).join(', ') || '-';

  // Formatear contenedores
  const contenedoresStr = presupuesto.contenedores?.map(c => {
    const parts = [c.tipo];
    if (c.numero) parts.push(c.numero);
    if (c.blContenedor) parts.push(c.blContenedor);
    return parts.join(' - ');
  }).join('\n') || '-';

  // Calcular totales de items
  let totalGravado = 0;
  let totalIVA = 0;
  let totalExento = 0;
  
  presupuesto.items?.forEach(item => {
    if (item.gravado) {
      totalGravado += item.totalVenta || 0;
      totalIVA += (item.totalVenta || 0) * (item.porcentajeIVA || 21) / 100;
    } else {
      totalExento += item.totalVenta || 0;
    }
  });
  
  const totalGeneral = totalGravado + totalIVA + totalExento;

  // ============ ENCABEZADO ============
  // Título principal
  doc.fontSize(20).fillColor(primaryColor).font('Helvetica-Bold');
  doc.text('PRESUPUESTO FORMAL', 40, 40, { align: 'center' });

  // Número de presupuesto destacado
  doc.fontSize(12).fillColor(textColor);
  doc.text(`N° ${presupuesto.numero}`, 40, 65, { align: 'center' });

  // Fecha y destinatario
  doc.fontSize(10).fillColor(textColor).font('Helvetica');
  const fechaHoy = new Date().toLocaleDateString('es-AR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  doc.text(`CABA, ${fechaHoy}`, 40, 90);
  doc.text('Atte,', 40, 105);
  doc.text('Depto. Comercial', 40, 117);

  // Validez
  if (presupuesto.fechaValidez) {
    doc.font('Helvetica-Bold').fillColor('#dc2626');
    doc.text(`Válido hasta: ${formatDate(presupuesto.fechaValidez)}`, 400, 90, { align: 'right' });
    doc.font('Helvetica').fillColor(textColor);
  }

  // ============ SECCIÓN DATOS DE LA OPERACIÓN ============
  let y = 140;
  
  // Fondo del header
  doc.rect(40, y, 515, 20).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11);
  doc.text('DATOS DE LA OPERACIÓN', 50, y + 5);
  
  y += 25;
  
  // Grid de datos
  doc.font('Helvetica').fontSize(9).fillColor(textColor);
  
  // Fila 1
  doc.font('Helvetica-Bold').text('Tráfico:', 50, y);
  doc.font('Helvetica').text(`${presupuesto.area || ''} ${presupuesto.sector || ''}`, 110, y);
  doc.font('Helvetica-Bold').text('Customer:', 300, y);
  doc.font('Helvetica').text(presupuesto.cliente?.razonSocial || presupuesto.solicitanteEmpresa || '-', 360, y, { width: 180 });
  
  y += 15;
  doc.font('Helvetica-Bold').text('Operación:', 50, y);
  doc.font('Helvetica').text(presupuesto.tipoOperacion || '-', 110, y);
  doc.font('Helvetica-Bold').text('Ref. Cliente:', 300, y);
  doc.font('Helvetica').text(presupuesto.referenciaCliente || '-', 360, y);
  
  y += 15;
  if (presupuesto.houseBL || presupuesto.masterBL) {
    doc.font('Helvetica-Bold').text('HBL:', 50, y);
    doc.font('Helvetica').text(presupuesto.houseBL || '-', 110, y);
    doc.font('Helvetica-Bold').text('MBL:', 300, y);
    doc.font('Helvetica').text(presupuesto.masterBL || '-', 360, y);
    y += 15;
  }
  
  doc.font('Helvetica-Bold').text('Origen:', 50, y);
  doc.font('Helvetica').text(presupuesto.puertoOrigen || '-', 110, y);
  doc.font('Helvetica-Bold').text('Destino:', 300, y);
  doc.font('Helvetica').text(presupuesto.puertoDestino || '-', 360, y);
  
  y += 15;
  if (presupuesto.fechaSalidaEstimada || presupuesto.fechaLlegadaEstimada) {
    doc.font('Helvetica-Bold').text('Salida Est.:', 50, y);
    doc.font('Helvetica').text(formatDate(presupuesto.fechaSalidaEstimada), 110, y);
    doc.font('Helvetica-Bold').text('Llegada Est.:', 300, y);
    doc.font('Helvetica').text(formatDate(presupuesto.fechaLlegadaEstimada), 360, y);
    y += 15;
  }
  
  if (presupuesto.buque || presupuesto.viaje) {
    doc.font('Helvetica-Bold').text('Buque:', 50, y);
    doc.font('Helvetica').text(presupuesto.buque || '-', 110, y);
    doc.font('Helvetica-Bold').text('Viaje:', 300, y);
    doc.font('Helvetica').text(presupuesto.viaje || '-', 360, y);
    y += 15;
  }
  
  if (presupuesto.puertoTransbordo) {
    doc.font('Helvetica-Bold').text('Transbordo:', 50, y);
    doc.font('Helvetica').text(presupuesto.puertoTransbordo, 110, y);
    y += 15;
  }
  
  if (presupuesto.incoterm) {
    doc.font('Helvetica-Bold').text('Incoterm:', 50, y);
    doc.font('Helvetica').text(presupuesto.incoterm, 110, y);
  }
  
  if (presupuesto.shipper) {
    doc.font('Helvetica-Bold').text('Shipper:', 300, y);
    doc.font('Helvetica').text(presupuesto.shipper?.razonSocial || '-', 360, y, { width: 180 });
  }

  // ============ SECCIÓN DETALLE DE LA CARGA ============
  if (presupuesto.mercancias?.length > 0 || presupuesto.contenedores?.length > 0) {
    y += 30;
    doc.rect(40, y, 515, 20).fill(headerBg).stroke();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11);
    doc.text('DETALLE DE LA CARGA', 50, y + 5);
    
    y += 25;
    doc.font('Helvetica').fontSize(9).fillColor(textColor);
    
    // Fila de bultos/volumen/peso
    if (totalBultos || totalVolumen || totalPeso) {
      doc.font('Helvetica-Bold').text('Bultos:', 50, y);
      doc.font('Helvetica').text(`${totalBultos} PCS`, 100, y);
      doc.font('Helvetica-Bold').text('Volumen:', 180, y);
      doc.font('Helvetica').text(`${formatCurrency(totalVolumen)} CBM`, 230, y);
      doc.font('Helvetica-Bold').text('Kg. Brutos:', 350, y);
      doc.font('Helvetica').text(`${formatCurrency(totalPeso)} KG`, 410, y);
      y += 18;
    }
    
    if (presupuesto.contenedores?.length > 0) {
      doc.font('Helvetica-Bold').text('CNTDs:', 50, y);
      const contenedorLines = contenedoresStr.split('\n');
      contenedorLines.forEach((line, i) => {
        doc.font('Helvetica').text(line, 100, y + (i * 12), { width: 440 });
      });
      y += Math.max(12, contenedorLines.length * 12);
    }
    
    if (descripcionMercaderia !== '-') {
      y += 5;
      doc.font('Helvetica-Bold').text('Mercadería:', 50, y);
      doc.font('Helvetica').text(descripcionMercaderia, 110, y, { width: 435 });
    }
  }

  // ============ SECCIÓN CLIENTE ============
  y += 35;
  doc.rect(40, y, 515, 20).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11);
  doc.text('CLIENTE', 50, y + 5);
  
  y += 25;
  doc.font('Helvetica').fontSize(9).fillColor(textColor);
  
  const clienteNombre = presupuesto.cliente?.razonSocial || presupuesto.solicitanteNombre || '-';
  const clienteCuit = presupuesto.cliente?.numeroDocumento || '-';
  const clienteTel = presupuesto.cliente?.telefono || presupuesto.solicitanteTelefono || '-';
  const clienteEmail = presupuesto.cliente?.email || presupuesto.solicitanteEmail || '-';
  
  doc.font('Helvetica-Bold').text('Nombre:', 50, y);
  doc.font('Helvetica').text(clienteNombre, 110, y);
  doc.font('Helvetica-Bold').text('Teléfono:', 300, y);
  doc.font('Helvetica').text(clienteTel, 360, y);
  
  y += 15;
  doc.font('Helvetica-Bold').text('CUIT:', 50, y);
  doc.font('Helvetica').text(clienteCuit, 110, y);
  doc.font('Helvetica-Bold').text('E-mail:', 300, y);
  doc.font('Helvetica').text(clienteEmail, 360, y, { width: 180 });

  // ============ SECCIÓN COTIZACIÓN ============
  if (presupuesto.items && presupuesto.items.length > 0) {
    y += 35;
    doc.rect(40, y, 515, 20).fill(headerBg).stroke();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11);
    doc.text('COTIZACIÓN', 50, y + 5);
    
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
    
    // Filas de items
    doc.font('Helvetica').fontSize(8).fillColor(textColor);
    presupuesto.items.forEach(item => {
      const tipo = item.gravado ? 'G' : 'E';
      const iva = item.gravado ? (item.totalVenta * (item.porcentajeIVA || 21) / 100) : 0;
      
      doc.text(item.concepto, 50, y, { width: 290 });
      doc.text(tipo, 355, y);
      doc.text(formatCurrency(item.totalVenta), 400, y, { align: 'right', width: 60 });
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
    const moneda = presupuesto.moneda || 'USD';
    doc.text(`TOTAL ${moneda} (IVA Inc.):`, 300, y);
    doc.text(formatCurrency(totalGeneral), 470, y, { align: 'right', width: 60 });
  }

  // ============ CONDICIONES ============
  if (presupuesto.condiciones) {
    y += 30;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
    doc.text('CONDICIONES:', 50, y);
    y += 12;
    doc.font('Helvetica').fontSize(8).fillColor(lightText);
    doc.text(presupuesto.condiciones, 50, y, { width: 480 });
    y += doc.heightOfString(presupuesto.condiciones, { width: 480 }) + 10;
  }

  // ============ NOTA DE PAGO ============
  y += 20;
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
  if (tenant?.paymentMethods) {
    y += 25;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
    doc.text('Datos Bancarios:', 50, y);
    y += 15;
    
    const paymentMethods = typeof tenant.paymentMethods === 'string' 
      ? JSON.parse(tenant.paymentMethods) 
      : tenant.paymentMethods;
    
    doc.font('Helvetica').fontSize(9);
    
    const transferencia = paymentMethods?.find(p => p.type === 'bank_transfer' && p.enabled);
    if (transferencia) {
      if (transferencia.bankName) {
        doc.text(transferencia.bankName, 50, y);
        y += 12;
      }
      if (transferencia.alias) {
        doc.text(`ALIAS: ${transferencia.alias}`, 50, y);
        y += 12;
      }
      if (transferencia.accountNumber) {
        doc.text(`Cuenta: ${transferencia.accountNumber}`, 50, y);
        y += 12;
      }
      if (transferencia.cbu) {
        doc.text(`CBU: ${transferencia.cbu}`, 50, y);
        y += 12;
      }
      if (tenant.cuit) {
        doc.text(`CUIT: ${tenant.cuit}`, 50, y);
        y += 12;
      }
    }
  }

  // Mensaje final
  y += 15;
  doc.font('Helvetica').fontSize(8).fillColor(lightText);
  doc.text('Agradecemos su consulta. Quedamos a disposición para cualquier aclaración.', 50, y);

  return doc;
}

module.exports = { generarPresupuestoFormal };
