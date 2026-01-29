import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Plane, Ship, Truck, X } from 'lucide-react';
import { useBuscarTerminales } from '../../hooks/useApi';

/**
 * Selector de terminal con búsqueda
 * @param {string} area - Tipo de área: 'Marítimo', 'Aéreo', 'Terrestre'
 * @param {string} value - Valor actual (texto o código)
 * @param {function} onChange - Callback cuando cambia el valor
 * @param {string} placeholder - Placeholder del input
 * @param {string} label - Label del campo
 */
export default function TerminalSelector({ 
  area, 
  value, 
  onChange, 
  placeholder,
  label,
  className = ''
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Mapear área a tipo para la API
  const getTipoAPI = () => {
    switch (area) {
      case 'Marítimo': return 'maritima';
      case 'Aéreo': return 'aerea';
      case 'Terrestre': return 'terrestre';
      default: return '';
    }
  };

  const { data: resultados = [], isLoading } = useBuscarTerminales(search, getTipoAPI());

  // Obtener label dinámico según área
  const getLabel = () => {
    if (label) return label;
    switch (area) {
      case 'Marítimo': return 'Puerto';
      case 'Aéreo': return 'Aeropuerto';
      case 'Terrestre': return 'Ubicación';
      default: return 'Terminal';
    }
  };

  // Obtener icono según área
  const getIcon = () => {
    switch (area) {
      case 'Marítimo': return <Ship className="w-4 h-4 text-slate-400" />;
      case 'Aéreo': return <Plane className="w-4 h-4 text-slate-400" />;
      case 'Terrestre': return <Truck className="w-4 h-4 text-slate-400" />;
      default: return <MapPin className="w-4 h-4 text-slate-400" />;
    }
  };

  // Cerrar dropdown al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cuando cambia el value externo, actualizar el display
  useEffect(() => {
    if (value && !selectedTerminal) {
      setSearch(value);
    }
  }, [value]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    setIsOpen(val.length >= 2);
    // Si el usuario escribe manualmente, también actualizar el valor
    onChange(val);
    setSelectedTerminal(null);
  };

  const handleSelect = (terminal) => {
    setSelectedTerminal(terminal);
    setSearch(terminal.label);
    onChange(terminal.label);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearch('');
    setSelectedTerminal(null);
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          {getIcon()}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={() => search.length >= 2 && setIsOpen(true)}
          placeholder={placeholder || `Buscar ${getLabel().toLowerCase()}...`}
          className="w-full pl-10 pr-8 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm"
        />
        {search && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-slate-500 text-sm">
              Buscando...
            </div>
          ) : resultados.length === 0 ? (
            <div className="p-3 text-center text-slate-500 text-sm">
              {search.length < 2 ? 'Escribí al menos 2 caracteres' : 'No se encontraron resultados'}
            </div>
          ) : (
            <ul>
              {resultados.map((terminal, idx) => (
                <li
                  key={`${terminal.codigo}-${idx}`}
                  onClick={() => handleSelect(terminal)}
                  className="px-3 py-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      {terminal.codigo}
                    </span>
                    <span className="text-sm text-slate-800 truncate">
                      {terminal.nombre}
                    </span>
                  </div>
                  {terminal.ciudad && (
                    <div className="text-xs text-slate-500 mt-0.5 pl-12">
                      {terminal.ciudad}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
