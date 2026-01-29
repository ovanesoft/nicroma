const terminales = require('../data/terminales.json');

/**
 * Buscar terminales por nombre o código
 * GET /api/terminales/buscar?q=texto&tipo=maritima|aerea|terrestre
 * 
 * El JSON usa keys cortas para optimizar tamaño:
 * m = marítimas, a = aéreas, t = terrestres
 * n = nombre, c = código, u = ciudad
 */
const buscarTerminales = async (req, res) => {
  try {
    const { q, tipo } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const searchTerm = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    let lista = [];
    
    // Seleccionar lista según tipo (keys optimizadas: m, a, t)
    if (tipo === 'maritima' || tipo === 'Marítimo') {
      lista = terminales.m || [];
    } else if (tipo === 'aerea' || tipo === 'Aéreo') {
      lista = terminales.a || [];
    } else if (tipo === 'terrestre' || tipo === 'Terrestre') {
      lista = terminales.t || [];
    } else {
      // Si no hay tipo, buscar en todas
      lista = [...(terminales.m || []), ...(terminales.a || []), ...(terminales.t || [])];
    }

    // Filtrar por nombre (n), código (c) o ciudad (u)
    const resultados = lista
      .filter(t => {
        const nombre = (t.n || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const codigo = (t.c || '').toLowerCase();
        const ciudad = (t.u || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        return nombre.includes(searchTerm) || 
               codigo.includes(searchTerm) || 
               ciudad.includes(searchTerm);
      })
      .slice(0, 20) // Limitar a 20 resultados
      .map(t => ({
        nombre: t.n,
        codigo: t.c,
        ciudad: t.u,
        // Formato para mostrar: "Código - Nombre (Ciudad)"
        label: `${t.c} - ${t.n}${t.u ? ` (${t.u})` : ''}`
      }));

    res.json({
      success: true,
      data: resultados
    });

  } catch (error) {
    console.error('Error buscando terminales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar terminales'
    });
  }
};

/**
 * Obtener terminal por código
 * GET /api/terminales/:codigo
 */
const obtenerTerminal = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { tipo } = req.query;
    
    let lista = [];
    
    if (tipo === 'maritima' || tipo === 'Marítimo') {
      lista = terminales.m || [];
    } else if (tipo === 'aerea' || tipo === 'Aéreo') {
      lista = terminales.a || [];
    } else if (tipo === 'terrestre' || tipo === 'Terrestre') {
      lista = terminales.t || [];
    } else {
      lista = [...(terminales.m || []), ...(terminales.a || []), ...(terminales.t || [])];
    }

    const terminal = lista.find(t => t.c === codigo);

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: 'Terminal no encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        nombre: terminal.n,
        codigo: terminal.c,
        ciudad: terminal.u
      }
    });

  } catch (error) {
    console.error('Error obteniendo terminal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener terminal'
    });
  }
};

module.exports = {
  buscarTerminales,
  obtenerTerminal
};
