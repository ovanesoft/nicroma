const prisma = require('../services/prisma');

/**
 * Resuelve los placeholders de un template de numeración.
 *
 * Placeholders soportados:
 *   {YEAR}      → 2026
 *   {YY}        → 26
 *   {MONTH}     → 05
 *   {AREA}      → 2 letras mayúsculas del area, ej Marítimo → MA, Aéreo → AE
 *   {AREA1}     → 1 letra, ej M / A
 *   {SECTOR}    → IMP / EXP (3 letras de Importación / Exportación)
 *   {SECTOR1}   → I / E
 *   {N}         → secuencia sin padding
 *   {NN}..{NNNNNNNN} → secuencia con padding de la cantidad de N
 */
function aplicarPlaceholders(template, { secuencia, area, sector, fecha = new Date() }) {
  const year = fecha.getFullYear();
  const yy = String(year).slice(-2);
  const month = String(fecha.getMonth() + 1).padStart(2, '0');

  // Normalizamos quitando tildes para que "Aéreo" → "AEREO" (no "AREO")
  const stripAccents = (s) => (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const areaStr = stripAccents(area).replace(/[^A-Z]/g, '');
  const area2 = areaStr.substring(0, 2);
  const area1 = areaStr.substring(0, 1);

  const sectorStr = stripAccents(sector).replace(/[^A-Z]/g, '');
  const sector3 = sectorStr.substring(0, 3);
  const sector1 = sectorStr.startsWith('EXP') ? 'E' : 'I';

  let resultado = template
    .replace(/\{YEAR\}/g, String(year))
    .replace(/\{YY\}/g, yy)
    .replace(/\{MONTH\}/g, month)
    .replace(/\{AREA\}/g, area2)
    .replace(/\{AREA1\}/g, area1)
    .replace(/\{SECTOR\}/g, sector3)
    .replace(/\{SECTOR1\}/g, sector1);

  // {N}, {NN}, {NNN}, etc. → padding según cantidad de N
  resultado = resultado.replace(/\{(N+)\}/g, (_, ns) => {
    const width = ns.length;
    return String(secuencia).padStart(width, '0');
  });

  return resultado;
}

/**
 * Convierte un template en un patrón "starts-with" para buscar el último número:
 * reemplaza placeholders fijos con sus valores y los placeholders de secuencia con ''.
 */
function templateStartsWith(template, opts) {
  const fija = aplicarPlaceholders(template, { ...opts, secuencia: '' });
  // Cortar el template hasta el primer placeholder de secuencia para usar como prefix exacto
  const idx = fija.search(/\{N+\}|0+$/);
  if (idx >= 0) return fija.slice(0, idx);
  return fija;
}

/**
 * Genera el siguiente número de Presupuesto respetando la config del tenant.
 *  - Si tenant.numeracionPresupuestoSiguiente está seteado, se usa esa secuencia (y
 *    se incrementa para el próximo).
 *  - Sino, se busca el último número con el mismo prefix y se incrementa.
 */
async function generarNumeroPresupuestoCfg(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      numeracionPresupuestoFormato: true,
      numeracionPresupuestoSiguiente: true,
    },
  });
  const template = tenant?.numeracionPresupuestoFormato || 'PRES-{YEAR}-{NNNNN}';

  let secuencia;
  if (tenant?.numeracionPresupuestoSiguiente != null) {
    secuencia = tenant.numeracionPresupuestoSiguiente;
    // Consumimos el override: la próxima llamada vuelve a auto-secuencia
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { numeracionPresupuestoSiguiente: null },
    });
  } else {
    // Detectar última secuencia con el prefix calculado
    const prefix = templateStartsWith(template, { area: '', sector: '' });
    const ultimo = await prisma.presupuesto.findFirst({
      where: { tenantId, numero: { startsWith: prefix } },
      orderBy: { createdAt: 'desc' },
      select: { numero: true },
    });
    secuencia = 1;
    if (ultimo?.numero) {
      // Extraer la última secuencia de dígitos del número
      const match = ultimo.numero.match(/(\d+)(?!.*\d)/);
      if (match) secuencia = parseInt(match[1], 10) + 1;
    }
  }

  return aplicarPlaceholders(template, { secuencia });
}

/**
 * Genera el siguiente número de Carpeta respetando la config del tenant.
 */
async function generarNumeroCarpetaCfg(tenantId, area, sector) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      numeracionCarpetaFormato: true,
      numeracionCarpetaSiguiente: true,
    },
  });
  const template = tenant?.numeracionCarpetaFormato || '{YEAR}-{AREA}{SECTOR1}-{NNNNNN}';

  let secuencia;
  if (tenant?.numeracionCarpetaSiguiente != null) {
    secuencia = tenant.numeracionCarpetaSiguiente;
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { numeracionCarpetaSiguiente: null },
    });
  } else {
    const prefix = templateStartsWith(template, { area, sector });
    const ultimo = await prisma.carpeta.findFirst({
      where: { tenantId, numero: { startsWith: prefix } },
      orderBy: { createdAt: 'desc' },
      select: { numero: true },
    });
    secuencia = 1;
    if (ultimo?.numero) {
      const match = ultimo.numero.match(/(\d+)(?!.*\d)/);
      if (match) secuencia = parseInt(match[1], 10) + 1;
    }
  }

  return aplicarPlaceholders(template, { secuencia, area, sector });
}

module.exports = {
  aplicarPlaceholders,
  generarNumeroPresupuestoCfg,
  generarNumeroCarpetaCfg,
};
