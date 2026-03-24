const prisma = require('../services/prisma');

const CONCEPTOS_DEFAULT = [
  { nombre: 'FLETE MARÍTIMO', categoriaIVA: 'EXENTO', porcentajeIVA: 0, divisa: 'USD', base: 'POR_CONTENEDOR', prepaidCollect: 'P' },
  { nombre: 'FLETE AÉREO', categoriaIVA: 'EXENTO', porcentajeIVA: 0, divisa: 'USD', base: 'KILOS', prepaidCollect: 'P' },
  { nombre: 'FLETE TERRESTRE', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'ARS', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
  { nombre: 'THC ORIGEN', categoriaIVA: 'EXENTO', porcentajeIVA: 0, divisa: 'USD', base: 'POR_CONTENEDOR', prepaidCollect: 'P' },
  { nombre: 'THC DESTINO', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'USD', base: 'POR_CONTENEDOR', prepaidCollect: 'C' },
  { nombre: 'BL FEE', categoriaIVA: 'EXENTO', porcentajeIVA: 0, divisa: 'USD', base: 'IMPORTE_FIJO', prepaidCollect: 'P' },
  { nombre: 'HANDLING', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'USD', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
  { nombre: 'DESPACHO DE ADUANA', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'ARS', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
  { nombre: 'SEGURO', categoriaIVA: 'EXENTO', porcentajeIVA: 0, divisa: 'USD', base: 'IMPORTE_FIJO', prepaidCollect: 'P' },
  { nombre: 'ALMACENAJE', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'ARS', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
  { nombre: 'GATE IN', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'USD', base: 'POR_CONTENEDOR', prepaidCollect: 'C' },
  { nombre: 'VERIFICACIÓN', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'ARS', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
  { nombre: 'VGM', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'USD', base: 'POR_CONTENEDOR', prepaidCollect: 'P' },
  { nombre: 'AMS/ENS', categoriaIVA: 'EXENTO', porcentajeIVA: 0, divisa: 'USD', base: 'IMPORTE_FIJO', prepaidCollect: 'P' },
  { nombre: 'ACARREO', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'ARS', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
  { nombre: 'GASTOS BANCARIOS', categoriaIVA: 'NO_GRAVADO', porcentajeIVA: 0, divisa: 'USD', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
  { nombre: 'COMISIÓN', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'USD', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
  { nombre: 'ISPS', categoriaIVA: 'EXENTO', porcentajeIVA: 0, divisa: 'USD', base: 'POR_CONTENEDOR', prepaidCollect: 'P' },
  { nombre: 'TOLL', categoriaIVA: 'EXENTO', porcentajeIVA: 0, divisa: 'USD', base: 'IMPORTE_FIJO', prepaidCollect: 'P' },
  { nombre: 'CONSOLIDACIÓN', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'USD', base: 'VOLUMEN', prepaidCollect: 'P' },
  { nombre: 'DESCONSOLIDACIÓN', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'USD', base: 'VOLUMEN', prepaidCollect: 'C' },
  { nombre: 'PRECINTO', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'USD', base: 'POR_CONTENEDOR', prepaidCollect: 'P' },
  { nombre: 'HONORARIOS', categoriaIVA: 'GRAVADO', porcentajeIVA: 21, divisa: 'ARS', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
  { nombre: 'TASA DE ESTADÍSTICA', categoriaIVA: 'NO_GRAVADO', porcentajeIVA: 0, divisa: 'USD', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
  { nombre: 'IVA ADICIONAL', categoriaIVA: 'NO_GRAVADO', porcentajeIVA: 0, divisa: 'ARS', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
  { nombre: 'GANANCIAS', categoriaIVA: 'NO_GRAVADO', porcentajeIVA: 0, divisa: 'ARS', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
  { nombre: 'INGRESOS BRUTOS', categoriaIVA: 'NO_GRAVADO', porcentajeIVA: 0, divisa: 'ARS', base: 'IMPORTE_FIJO', prepaidCollect: 'C' },
];

// Listar conceptos de gasto
const listar = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { search, activo } = req.query;

    const where = { tenantId };
    if (search) {
      where.nombre = { contains: search, mode: 'insensitive' };
    }
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const conceptos = await prisma.conceptoGasto.findMany({
      where,
      orderBy: { nombre: 'asc' }
    });

    res.json({ success: true, data: { conceptos } });
  } catch (error) {
    console.error('Error listando conceptos:', error);
    res.status(500).json({ success: false, message: 'Error al listar conceptos' });
  }
};

// Crear concepto
const crear = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { nombre, categoriaIVA, porcentajeIVA, divisa, base, prepaidCollect } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
    }

    const concepto = await prisma.conceptoGasto.create({
      data: {
        tenantId,
        nombre: nombre.trim().toUpperCase(),
        categoriaIVA: categoriaIVA || 'GRAVADO',
        porcentajeIVA: parseFloat(porcentajeIVA) || 21,
        divisa: divisa || 'USD',
        base: base || 'IMPORTE_FIJO',
        prepaidCollect: prepaidCollect || 'P',
      }
    });

    res.status(201).json({ success: true, data: { concepto } });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Ya existe un concepto con ese nombre' });
    }
    console.error('Error creando concepto:', error);
    res.status(500).json({ success: false, message: 'Error al crear concepto' });
  }
};

// Actualizar concepto
const actualizar = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { nombre, categoriaIVA, porcentajeIVA, divisa, base, prepaidCollect, activo } = req.body;

    const existing = await prisma.conceptoGasto.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Concepto no encontrado' });
    }

    const concepto = await prisma.conceptoGasto.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim().toUpperCase() }),
        ...(categoriaIVA !== undefined && { categoriaIVA }),
        ...(porcentajeIVA !== undefined && { porcentajeIVA: parseFloat(porcentajeIVA) }),
        ...(divisa !== undefined && { divisa }),
        ...(base !== undefined && { base }),
        ...(prepaidCollect !== undefined && { prepaidCollect }),
        ...(activo !== undefined && { activo }),
      }
    });

    res.json({ success: true, data: { concepto } });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Ya existe un concepto con ese nombre' });
    }
    console.error('Error actualizando concepto:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar concepto' });
  }
};

// Eliminar concepto
const eliminar = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const existing = await prisma.conceptoGasto.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Concepto no encontrado' });
    }

    await prisma.conceptoGasto.delete({ where: { id } });
    res.json({ success: true, message: 'Concepto eliminado' });
  } catch (error) {
    console.error('Error eliminando concepto:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar concepto' });
  }
};

// Seed: cargar conceptos por defecto para un tenant
const seedConceptos = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const existentes = await prisma.conceptoGasto.count({ where: { tenantId } });
    if (existentes > 0) {
      return res.json({ success: true, message: 'Ya hay conceptos cargados', data: { creados: 0 } });
    }

    const data = CONCEPTOS_DEFAULT.map(c => ({ ...c, tenantId }));
    const result = await prisma.conceptoGasto.createMany({ data, skipDuplicates: true });

    res.json({ success: true, message: `${result.count} conceptos creados`, data: { creados: result.count } });
  } catch (error) {
    console.error('Error en seed de conceptos:', error);
    res.status(500).json({ success: false, message: 'Error al cargar conceptos por defecto' });
  }
};

module.exports = { listar, crear, actualizar, eliminar, seedConceptos };
