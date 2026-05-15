/**
 * Helpers compartidos para los PDFs del módulo Carpeta.
 *
 * - `drawTenantLogo(doc, tenant, opts)`: dibuja el logo del tenant (si existe)
 *   arriba a la derecha de la página actual. Soporta data URLs (`data:image/...`)
 *   y URLs http(s) que devuelvan PNG/JPG. Si falla la descarga, no rompe el
 *   render del PDF.
 */

/**
 * Carga la imagen del logo del tenant como Buffer.
 * Maneja:
 *   - data URLs (base64)
 *   - URLs http/https remotas (PNG/JPG)
 * Devuelve null si no hay logo válido.
 */
async function loadLogoBuffer(logoUrl) {
  if (!logoUrl) return null;
  try {
    if (typeof logoUrl !== 'string') return null;
    if (logoUrl.startsWith('data:image/')) {
      const m = logoUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
      if (!m) return null;
      return Buffer.from(m[2], 'base64');
    }
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      // fetch nativo de node 18+
      const res = await fetch(logoUrl, { method: 'GET' });
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    }
    return null;
  } catch (err) {
    console.error('[pdfHelpers] Error cargando logo:', err.message);
    return null;
  }
}

/**
 * Versión sincrónica: sólo intenta decodificar el data URL (base64).
 * Se usa cuando no querés hacer fetch (no async).
 */
function loadLogoBufferSync(logoUrl) {
  if (!logoUrl || typeof logoUrl !== 'string') return null;
  try {
    if (logoUrl.startsWith('data:image/')) {
      const m = logoUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
      if (!m) return null;
      return Buffer.from(m[2], 'base64');
    }
    // Si es URL remota, este helper sincrónico no puede traerla.
    return null;
  } catch (err) {
    console.error('[pdfHelpers] Error decodificando logo:', err.message);
    return null;
  }
}

/**
 * Dibuja el logo del tenant en la esquina superior derecha de la página actual.
 * No mueve el cursor `y` interno del documento, sino que retorna la altura
 * que ocupó el logo para que el caller la use si quiere reservar espacio.
 *
 * @param {PDFDocument} doc
 * @param {Buffer|null} logoBuffer - Buffer ya decodificado (usá loadLogoBuffer/Sync)
 * @param {Object} opts
 * @param {number} [opts.right=40]   - margen derecho desde el borde de la página
 * @param {number} [opts.top=30]     - distancia desde el tope de la página
 * @param {number} [opts.maxWidth=110]
 * @param {number} [opts.maxHeight=55]
 * @returns {{drawn:boolean, width:number, height:number}}
 */
function drawTenantLogo(doc, logoBuffer, opts = {}) {
  if (!logoBuffer) return { drawn: false, width: 0, height: 0 };
  const right    = opts.right    ?? 40;
  const top      = opts.top      ?? 30;
  const maxW     = opts.maxWidth ?? 110;
  const maxH     = opts.maxHeight ?? 55;
  try {
    const x = doc.page.width - right - maxW;
    doc.save();
    doc.image(logoBuffer, x, top, {
      fit: [maxW, maxH],
      align: 'right',
      valign: 'top',
    });
    doc.restore();
    return { drawn: true, width: maxW, height: maxH };
  } catch (err) {
    console.error('[pdfHelpers] Error pintando logo:', err.message);
    return { drawn: false, width: 0, height: 0 };
  }
}

module.exports = {
  loadLogoBuffer,
  loadLogoBufferSync,
  drawTenantLogo,
};
