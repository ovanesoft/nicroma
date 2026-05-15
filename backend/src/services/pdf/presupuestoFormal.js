const PDFDocument = require('pdfkit');
const { drawTenantLogo } = require('./pdfHelpers');

/**
 * Genera un PDF de Presupuesto Formal basado en los datos de un presupuesto
 * @param {Object} presupuesto - Datos completos del presupuesto con relaciones
 * @param {Object} tenant - Datos del tenant (despachante)
 * @param {Object} bancoSeleccionado - Cuenta bancaria seleccionada para el PDF
 * @param {Buffer|null} logoBuffer - Logo del tenant ya decodificado
 * @returns {PDFDocument} - Documento PDF
 */
function generarPresupuestoFormal(presupuesto, tenant, bancoSeleccionado = null, logoBuffer = null) {
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

  // Resumen de cantidad de contenedores por tipo (ej: "2 × 40DC, 1 × 20DC")
  const cantidadContenedoresTotal = presupuesto.contenedores?.length || 0;
  const contenedoresResumen = (() => {
    if (!cantidadContenedoresTotal) return '';
    const acc = {};
    presupuesto.contenedores.forEach(c => {
      const tipo = c.tipo || 'S/T';
      acc[tipo] = (acc[tipo] || 0) + 1;
    });
    return Object.entries(acc).map(([t, n]) => `${n} × ${t}`).join(', ');
  })();

  // Detectar si es operación FCL para mostrar el aviso adicional al pie.
  // Acepta variantes con guion, slash o sin separador (FCL-FCL, FCL/FCL, FCLFCL).
  const tipoOpUpper = (presupuesto.tipoOperacion || '').toUpperCase().replace(/[\s/_-]+/g, '');
  const esFclFcl = tipoOpUpper === 'FCLFCL';

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
  // Logo del tenant arriba a la derecha (si está cargado)
  const logoInfo = drawTenantLogo(doc, logoBuffer, {
    right: 40, top: 30, maxWidth: 100, maxHeight: 50
  });
  const titleMaxW = logoInfo.drawn
    ? doc.page.width - 80 - logoInfo.width - 14
    : doc.page.width - 80;

  // Título principal
  doc.fontSize(20).fillColor(primaryColor).font('Helvetica-Bold');
  doc.text('PRESUPUESTO FORMAL', 40, 40, { align: 'center', width: titleMaxW });

  // Número de presupuesto destacado
  doc.fontSize(12).fillColor(textColor);
  doc.text(`N° ${presupuesto.numero}`, 40, 65, { align: 'center', width: titleMaxW });

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
  const operacionText = presupuesto.area === 'Aéreo' && presupuesto.tipoOperacionAerea
    ? `${presupuesto.tipoOperacion || ''} - ${presupuesto.tipoOperacionAerea}`
    : presupuesto.tipoOperacion || '-';
  doc.font('Helvetica').text(operacionText, 110, y);
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
      // Resumen de cantidad de contenedores (siempre visible cuando hay contenedores)
      doc.font('Helvetica-Bold').text('Cant. Contenedores:', 50, y);
      doc.font('Helvetica').text(
        `${cantidadContenedoresTotal}${contenedoresResumen ? ` (${contenedoresResumen})` : ''}`,
        165, y, { width: 380 }
      );
      y += 14;

      // Listado detallado (tipo - número - bl). Si los contenedores no tienen
      // número/BL cargados aún (presupuesto), se muestra sólo el tipo.
      const tieneDetalle = presupuesto.contenedores.some(c => c.numero || c.blContenedor);
      if (tieneDetalle) {
        doc.font('Helvetica-Bold').text('CNTDs:', 50, y);
        const contenedorLines = contenedoresStr.split('\n');
        contenedorLines.forEach((line, i) => {
          doc.font('Helvetica').text(line, 100, y + (i * 12), { width: 440 });
        });
        y += Math.max(12, contenedorLines.length * 12);
      }
    }
    
    if (descripcionMercaderia !== '-') {
      y += 5;
      doc.font('Helvetica-Bold').text('Mercadería:', 50, y);
      doc.font('Helvetica').text(descripcionMercaderia, 110, y, { width: 435 });
    }

    // Detalle individual de mercancías con dimensiones
    const mercConDimensiones = presupuesto.mercancias?.filter(m => m.largo || m.ancho || m.alto) || [];
    if (mercConDimensiones.length > 0) {
      y += 20;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor);
      doc.text('DESCRIPCIÓN', 50, y);
      doc.text('BULTOS', 200, y);
      doc.text('L×A×H (cm)', 260, y);
      doc.text('CBM', 370, y);
      doc.text('PESO', 430, y);
      y += 3;
      doc.moveTo(50, y + 10).lineTo(515, y + 10).strokeColor('#cccccc').lineWidth(0.5).stroke();
      y += 14;
      doc.font('Helvetica').fontSize(8).fillColor(textColor);
      mercConDimensiones.forEach(m => {
        const dims = `${m.largo || 0} × ${m.ancho || 0} × ${m.alto || 0}`;
        doc.text(m.descripcion || '-', 50, y, { width: 145 });
        doc.text(`${m.bultos || 0}`, 200, y);
        doc.text(dims, 260, y);
        doc.text(m.volumen ? `${formatCurrency(m.volumen)}` : '-', 370, y);
        doc.text(m.peso ? `${formatCurrency(m.peso)} kg` : '-', 430, y);
        y += 14;
      });
    }
  }

  // ============ SECCIÓN ACTORES DEL PROCESO ============
  y += 35;
  doc.rect(40, y, 515, 20).fill(headerBg).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11);
  doc.text('ACTORES DEL PROCESO', 50, y + 5);
  
  y += 25;
  doc.font('Helvetica').fontSize(9).fillColor(textColor);
  
  const actores = [
    {
      rol: 'Customer',
      datos: presupuesto.cliente
        ? { nombre: presupuesto.cliente.razonSocial, doc: presupuesto.cliente.numeroDocumento, email: presupuesto.cliente.email, tel: presupuesto.cliente.telefono }
        : (presupuesto.solicitanteNombre || presupuesto.solicitanteEmpresa)
          ? { nombre: presupuesto.solicitanteNombre || presupuesto.solicitanteEmpresa, doc: null, email: presupuesto.solicitanteEmail, tel: presupuesto.solicitanteTelefono }
          : null
    },
    {
      rol: 'Shipper',
      datos: presupuesto.shipper
        ? { nombre: presupuesto.shipper.razonSocial, doc: presupuesto.shipper.numeroDocumento, email: presupuesto.shipper.email, tel: presupuesto.shipper.telefono }
        : null
    },
    {
      rol: 'Consignee',
      datos: presupuesto.consignee
        ? { nombre: presupuesto.consignee.razonSocial, doc: presupuesto.consignee.numeroDocumento, email: presupuesto.consignee.email, tel: presupuesto.consignee.telefono }
        : null
    },
    {
      rol: 'Proveedor',
      datos: presupuesto.proveedor
        ? { nombre: presupuesto.proveedor.razonSocial, doc: presupuesto.proveedor.numeroDocumento, email: presupuesto.proveedor.email, tel: presupuesto.proveedor.telefono, tipo: presupuesto.proveedor.tipoProveedor }
        : null
    }
  ].filter(a => a.datos);

  actores.forEach((actor, idx) => {
    if (y > 700) { doc.addPage(); y = 50; }
    
    doc.font('Helvetica-Bold').text(`${actor.rol}:`, 50, y, { width: 70 });
    doc.font('Helvetica').text(actor.datos.nombre || '-', 125, y, { width: 180 });
    if (actor.datos.doc) {
      doc.font('Helvetica-Bold').text('CUIT:', 310, y);
      doc.font('Helvetica').text(actor.datos.doc, 345, y, { width: 190 });
    }
    if (actor.datos.tipo) {
      doc.font('Helvetica').fillColor(lightText).text(`(${actor.datos.tipo})`, 310, y, { width: 190 });
      doc.fillColor(textColor);
    }
    y += 13;
    
    const hasContact = actor.datos.email || actor.datos.tel;
    if (hasContact) {
      if (actor.datos.email) {
        doc.font('Helvetica-Bold').text('Email:', 125, y);
        doc.font('Helvetica').text(actor.datos.email, 165, y, { width: 140 });
      }
      if (actor.datos.tel) {
        doc.font('Helvetica-Bold').text('Tel:', 310, y);
        doc.font('Helvetica').text(actor.datos.tel, 335, y, { width: 200 });
      }
      y += 13;
    }
    
    if (idx < actores.length - 1) {
      y += 2;
    }
  });

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

  // ============ AVISO ESPECIAL FCL-FCL ============
  // Para operaciones FCL-FCL se incluye un texto aclaratorio obligatorio.
  if (esFclFcl) {
    const empresaNombre = (tenant?.name || 'la empresa').toUpperCase();
    const avisoLineas = [
      'Por favor tener presente que para el pago de toda carga FCL se tomará el TC de la naviera cotizada.',
      `Presentar CARTA DE GARANTIA impresa en papel original con membrete del consignatario del B/L, dirigida a ${empresaNombre}, firmada por apoderado del consignatario del B/L y certificada por Escribano público.`,
      'Se da aviso a los clientes que para la entrega de documentos originales referidos a las cargas FCL se deberá haber cancelado el embarque en su totalidad. A su vez, la disponibilidad del libre deuda estará a disposición del cliente entre 24 hs - 48 hs luego de la cancelación del embarque.',
    ];

    // Calcular alto requerido para decidir si saltamos de página
    const altoTexto = avisoLineas.reduce(
      (acc, t) => acc + doc.heightOfString(t, { width: 480 }) + 6,
      18 + 6 // título + margen
    );
    if (y + altoTexto > doc.page.height - 50) {
      doc.addPage();
      y = 50;
    } else {
      y += 22;
    }

    // Caja resaltada
    doc.rect(40, y - 4, 515, altoTexto - 6).fillOpacity(0.05).fill('#dc2626').fillOpacity(1).stroke();
    doc.fillColor('#991b1b').font('Helvetica-Bold').fontSize(9);
    doc.text('AVISO IMPORTANTE — CARGA FCL', 50, y);
    y += 14;

    doc.font('Helvetica').fontSize(8).fillColor('#1e293b');
    avisoLineas.forEach(linea => {
      doc.text(linea, 50, y, { width: 495, align: 'justify' });
      y += doc.heightOfString(linea, { width: 495 }) + 6;
    });
  }

  // NOTA: En el PDF de Presupuesto Formal no se muestran datos bancarios ni
  // la nota sobre tipo de cambio. Esa información va al pedido de fondos /
  // aviso de arribo / aviso de salida, no al presupuesto inicial al cliente.

  // Mensaje final
  y += 25;
  doc.font('Helvetica').fontSize(8).fillColor(lightText);
  doc.text('Agradecemos su consulta. Quedamos a disposición para cualquier aclaración.', 50, y);

  return doc;
}

module.exports = { generarPresupuestoFormal };
