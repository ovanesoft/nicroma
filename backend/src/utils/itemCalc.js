/**
 * Helpers de cálculo para items de presupuesto y gastos de carpeta.
 *
 * Espejo del helper que vive en el frontend en `PresupuestoForm.jsx`:
 * los totales por item se calculan como `monto * multiplicadorBase * cantidad`,
 * donde el multiplicador depende de la base elegida y de los datos de
 * mercancías / contenedores cargados.
 */

const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Calcula el multiplicador a aplicar al monto del item según la base.
 * Si la base requiere datos no disponibles, devuelve 1 (importe unitario).
 *
 * @param {string} base - Una de IMPORTE_FIJO, KILOS, TONELADA, VOLUMEN,
 *   CANT_CONTENEDORES, POR_CONTENEDOR.
 * @param {Array} mercancias - Lista de mercancías {peso, volumen, bultos}.
 * @param {Array} contenedores - Lista de contenedores {cantidad}.
 */
function calcularMultiplicadorBase(base, mercancias = [], contenedores = []) {
  const totalPeso = (mercancias || []).reduce(
    (acc, m) => acc + safeNum(m.peso) * (safeNum(m.bultos) || 1),
    0
  );
  const totalVolumen = (mercancias || []).reduce(
    (acc, m) => acc + safeNum(m.volumen),
    0
  );
  const totalContenedores = (contenedores || []).reduce(
    (acc, c) => acc + (parseInt(c.cantidad, 10) || 1),
    0
  );

  switch (base) {
    case 'KILOS':
      return totalPeso > 0 ? totalPeso : 1;
    case 'TONELADA':
      return totalPeso > 0 ? totalPeso / 1000 : 1;
    case 'TONELADA_M3':
      // Convención de flete: toneladas vs m³ (lo que sea mayor)
      return Math.max(totalPeso / 1000, totalVolumen) || 1;
    case 'VOLUMEN':
      return totalVolumen > 0 ? totalVolumen : 1;
    case 'CANT_CONTENEDORES':
    case 'POR_CONTENEDOR':
    case 'POR_CNT_FLETE':
      return totalContenedores > 0 ? totalContenedores : 1;
    case 'POR_ESCALA':
      return 1;
    case 'IMPORTE_FIJO':
    default:
      return 1;
  }
}

/**
 * Calcula totalVenta / totalCosto de un item aplicando base + cantidad
 * y respetando los límites importeMinimo / importeMaximo si vinieron.
 */
function calcularTotalesItem(item, mercancias = [], contenedores = []) {
  const cantidad = safeNum(item.cantidad) || 1;
  const multiplicador = calcularMultiplicadorBase(item.base, mercancias, contenedores);

  let totalVenta = safeNum(item.montoVenta) * multiplicador * cantidad;
  let totalCosto = safeNum(item.montoCosto) * multiplicador * cantidad;

  const min = item.importeMinimo != null ? safeNum(item.importeMinimo) : null;
  const max = item.importeMaximo != null ? safeNum(item.importeMaximo) : null;
  if (min != null && totalVenta > 0 && totalVenta < min) totalVenta = min;
  if (max != null && totalVenta > max) totalVenta = max;
  if (min != null && totalCosto > 0 && totalCosto < min) totalCosto = min;
  if (max != null && totalCosto > max) totalCosto = max;

  return { totalVenta, totalCosto, multiplicador };
}

module.exports = {
  calcularMultiplicadorBase,
  calcularTotalesItem,
};
