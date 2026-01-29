const terminales = require('../data/terminales.json');

/**
 * Buscar terminales por nombre o código
 * GET /api/terminales/buscar?q=texto&tipo=maritima|aerea|terrestre
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
    
    // Seleccionar lista según tipo
    if (tipo === 'maritima' || tipo === 'Marítimo') {
      lista = terminales.maritimas;
    } else if (tipo === 'aerea' || tipo === 'Aéreo') {
      lista = terminales.aereas;
    } else if (tipo === 'terrestre' || tipo === 'Terrestre') {
      lista = terminales.terrestres;
    } else {
      // Si no hay tipo, buscar en todas
      lista = [...terminales.maritimas, ...terminales.aereas, ...terminales.terrestres];
    }

    // Filtrar por nombre, código o ciudad
    const resultados = lista
      .filter(t => {
        const nombre = (t.Nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const codigo = (t.Código || '').toLowerCase();
        const ciudad = (t.Ciudad || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        return nombre.includes(searchTerm) || 
               codigo.includes(searchTerm) || 
               ciudad.includes(searchTerm);
      })
      .slice(0, 20) // Limitar a 20 resultados
      .map(t => ({
        nombre: t.Nombre,
        codigo: t.Código,
        ciudad: t.Ciudad,
        // Formato para mostrar: "Código - Nombre (Ciudad)"
        label: `${t.Código} - ${t.Nombre}${t.Ciudad ? ` (${t.Ciudad})` : ''}`
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
      lista = terminales.maritimas;
    } else if (tipo === 'aerea' || tipo === 'Aéreo') {
      lista = terminales.aereas;
    } else if (tipo === 'terrestre' || tipo === 'Terrestre') {
      lista = terminales.terrestres;
    } else {
      lista = [...terminales.maritimas, ...terminales.aereas, ...terminales.terrestres];
    }

    const terminal = lista.find(t => t.Código === codigo);

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: 'Terminal no encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        nombre: terminal.Nombre,
        codigo: terminal.Código,
        ciudad: terminal.Ciudad
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
