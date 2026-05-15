// Cálculo unificado de totales para items de presupuesto y gastos de carpeta.
// Mismo input/output → garantiza que al convertir un presupuesto en carpeta
// los totales no cambien.

const safe = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

// Calcula el multiplicador a aplicar al monto según la base seleccionada
// y los datos de mercancías/contenedores cargados. Si la base requiere datos
// que no hay disponibles, devuelve 1 para que al menos refleje el monto unitario.
export function calcularMultiplicadorBase(base, mercancias = [], contenedores = []) {
  const totalPeso = mercancias.reduce(
    (acc, m) => acc + safe(m.peso) * (safe(m.bultos) || 1),
    0
  );
  const totalVolumen = mercancias.reduce((acc, m) => acc + safe(m.volumen), 0);
  const totalContenedores = contenedores.reduce(
    (acc, c) => acc + (parseInt(c.cantidad) || 1),
    0
  );

  switch (base) {
    case 'KILOS':
      return totalPeso > 0 ? totalPeso : 1;
    case 'TONELADA':
      return totalPeso > 0 ? totalPeso / 1000 : 1;
    case 'TONELADA_M3':
      // Toneladas o m³ (lo que sea mayor) — convención de flete
      return Math.max(totalPeso / 1000, totalVolumen) || 1;
    case 'VOLUMEN':
      return totalVolumen > 0 ? totalVolumen : 1;
    case 'CANT_CONTENEDORES':
    case 'POR_CONTENEDOR':
    case 'POR_CNT_FLETE':
      return totalContenedores > 0 ? totalContenedores : 1;
    case 'POR_ESCALA':
      // Sin info de escalas todavía → comporta como importe fijo
      return 1;
    case 'IMPORTE_FIJO':
    default:
      return 1;
  }
}

// Calcula los totales (costo / venta) de un item/gasto aplicando
// base + cantidad + min/max.
export function calcularTotalesItem(item, mercancias = [], contenedores = []) {
  const cantidad = safe(item.cantidad) || 1;
  const multiplicador = calcularMultiplicadorBase(item.base, mercancias, contenedores);

  let totalVenta = safe(item.montoVenta) * multiplicador * cantidad;
  let totalCosto = safe(item.montoCosto) * multiplicador * cantidad;

  const min = item.importeMinimo != null ? safe(item.importeMinimo) : null;
  const max = item.importeMaximo != null ? safe(item.importeMaximo) : null;
  if (min != null && totalVenta > 0 && totalVenta < min) totalVenta = min;
  if (max != null && totalVenta > max) totalVenta = max;
  if (min != null && totalCosto > 0 && totalCosto < min) totalCosto = min;
  if (max != null && totalCosto > max) totalCosto = max;

  return { totalVenta, totalCosto, multiplicador };
}
