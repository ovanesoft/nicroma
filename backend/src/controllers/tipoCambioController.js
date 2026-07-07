const prisma = require('../services/prisma');

// Últimos valores de cada moneda (para el dashboard y selectores)
const obtenerUltimos = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Traer el registro más reciente de cada moneda
    const registros = await prisma.tipoCambio.findMany({
      where: { tenantId },
      orderBy: { fecha: 'desc' },
      take: 200
    });

    const ultimos = {};
    registros.forEach(r => {
      if (!ultimos[r.moneda]) {
        ultimos[r.moneda] = { valor: r.valor, fecha: r.fecha };
      }
    });

    res.json({ success: true, data: { ultimos } });
  } catch (error) {
    console.error('Error obteniendo tipos de cambio:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tipos de cambio' });
  }
};

// Histórico (para ver la evolución), con filtro opcional por moneda
const obtenerHistorico = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { moneda, limit = 100 } = req.query;

    const where = { tenantId };
    if (moneda) where.moneda = moneda;

    const historico = await prisma.tipoCambio.findMany({
      where,
      orderBy: { fecha: 'desc' },
      take: parseInt(limit)
    });

    res.json({ success: true, data: { historico } });
  } catch (error) {
    console.error('Error obteniendo histórico:', error);
    res.status(500).json({ success: false, message: 'Error al obtener histórico' });
  }
};

// Cargar cotizaciones (una o varias monedas a la vez)
const cargarTiposCambio = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const usuarioId = req.user.id;
    const { cotizaciones } = req.body;
    // cotizaciones: [{ moneda: 'USD', valor: 1475 }, { moneda: 'EUR', valor: 1600 }]

    if (!Array.isArray(cotizaciones) || cotizaciones.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe enviar al menos una cotización' });
    }

    const validas = cotizaciones.filter(c => 
      c.moneda && c.valor != null && !isNaN(parseFloat(c.valor)) && parseFloat(c.valor) > 0
    );

    if (validas.length === 0) {
      return res.status(400).json({ success: false, message: 'Ninguna cotización válida' });
    }

    await prisma.tipoCambio.createMany({
      data: validas.map(c => ({
        tenantId,
        usuarioId,
        moneda: c.moneda.toUpperCase(),
        valor: parseFloat(c.valor),
        fecha: new Date()
      }))
    });

    res.status(201).json({ success: true, message: `${validas.length} cotización(es) guardada(s)` });
  } catch (error) {
    console.error('Error cargando tipos de cambio:', error);
    res.status(500).json({ success: false, message: 'Error al cargar tipos de cambio' });
  }
};

// Eliminar un registro del histórico
const eliminarTipoCambio = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const registro = await prisma.tipoCambio.findFirst({ where: { id, tenantId } });
    if (!registro) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }

    await prisma.tipoCambio.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando tipo de cambio:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar' });
  }
};

module.exports = {
  obtenerUltimos,
  obtenerHistorico,
  cargarTiposCambio,
  eliminarTipoCambio
};
