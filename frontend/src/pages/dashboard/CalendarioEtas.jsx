import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Ship, Plane, Truck, Calendar, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../../components/ui';
import { useCalendarioEtas } from '../../hooks/useApi';
import { cn } from '../../lib/utils';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Colores por estado de carpeta
const ESTADO_STYLE = {
  ABIERTA: { chip: 'bg-green-100 text-green-800 border-green-300', dot: 'bg-green-500' },
  CERRADA: { chip: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  FINALIZADA: { chip: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  CANCELADA: { chip: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' }
};

// Ícono según área de la carpeta
const AREA_ICON = {
  'Marítimo': Ship,
  'Aéreo': Plane,
  'Terrestre': Truck,
  'Aduana': Landmark
};

function CalendarioEtas() {
  const navigate = useNavigate();
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());

  // Rango del mes visible
  const desde = `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  const hasta = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  const { data, isLoading } = useCalendarioEtas(desde, hasta);
  const carpetas = data?.data?.carpetas || [];

  // Agrupar carpetas por día del mes
  const carpetasPorDia = useMemo(() => {
    const map = {};
    carpetas.forEach(c => {
      if (!c.fechaLlegadaEstimada) return;
      const d = new Date(c.fechaLlegadaEstimada);
      const dia = d.getUTCDate();
      if (!map[dia]) map[dia] = [];
      map[dia].push(c);
    });
    return map;
  }, [carpetas]);

  // Armar la grilla del mes (semanas empiezan lunes)
  const celdas = useMemo(() => {
    const primerDia = new Date(anio, mes, 1);
    // getDay(): 0=domingo... convertir a lunes=0
    let offset = primerDia.getDay() - 1;
    if (offset < 0) offset = 6;
    const dias = [];
    for (let i = 0; i < offset; i++) dias.push(null);
    for (let d = 1; d <= ultimoDia; d++) dias.push(d);
    return dias;
  }, [mes, anio, ultimoDia]);

  const cambiarMes = (delta) => {
    let nuevoMes = mes + delta;
    let nuevoAnio = anio;
    if (nuevoMes < 0) { nuevoMes = 11; nuevoAnio--; }
    if (nuevoMes > 11) { nuevoMes = 0; nuevoAnio++; }
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  };

  const esHoy = (dia) =>
    dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Calendario de Llegadas (ETA)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => cambiarMes(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium text-slate-700 min-w-[140px] text-center">
            {MESES[mes]} {anio}
          </span>
          <Button variant="ghost" size="sm" onClick={() => cambiarMes(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Leyenda */}
        <div className="flex items-center gap-4 mb-4 flex-wrap text-xs">
          {Object.entries({ ABIERTA: 'Abierta', CERRADA: 'Cerrada', FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada' }).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5 text-slate-600">
              <span className={cn('w-2.5 h-2.5 rounded-full', ESTADO_STYLE[key].dot)} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-3 ml-auto text-slate-400">
            <span className="flex items-center gap-1"><Ship className="w-3.5 h-3.5" /> Marítima</span>
            <span className="flex items-center gap-1"><Plane className="w-3.5 h-3.5" /> Aérea</span>
            <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Terrestre</span>
          </span>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : (
          <>
            {/* Encabezado días de la semana */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Grilla del mes */}
            <div className="grid grid-cols-7 gap-1">
              {celdas.map((dia, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'min-h-[80px] rounded-lg border p-1',
                    dia === null
                      ? 'border-transparent'
                      : esHoy(dia)
                      ? 'border-primary-400 bg-primary-50/50'
                      : 'border-slate-100 bg-slate-50/50'
                  )}
                >
                  {dia !== null && (
                    <>
                      <p className={cn(
                        'text-xs font-medium mb-1 px-1',
                        esHoy(dia) ? 'text-primary-700' : 'text-slate-500'
                      )}>
                        {dia}
                      </p>
                      <div className="space-y-1">
                        {(carpetasPorDia[dia] || []).map(c => {
                          const style = ESTADO_STYLE[c.estado] || ESTADO_STYLE.ABIERTA;
                          const AreaIcon = AREA_ICON[c.area] || Ship;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => navigate(`/carpetas/${c.id}`)}
                              className={cn(
                                'w-full text-left px-1.5 py-1 rounded border text-[10px] leading-tight hover:opacity-80 transition-opacity',
                                style.chip
                              )}
                              title={`${c.cliente?.razonSocial || 'Sin cliente'} — ${c.houseBL || c.numero} (${c.estado})`}
                            >
                              <span className="flex items-center gap-1 font-semibold truncate">
                                <AreaIcon className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{c.cliente?.razonSocial || 'Sin cliente'}</span>
                              </span>
                              <span className="block truncate font-mono opacity-75">
                                {c.houseBL || c.numero}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {carpetas.length === 0 && (
              <p className="text-center text-sm text-slate-400 mt-4">
                No hay llegadas estimadas en {MESES[mes]} {anio}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default CalendarioEtas;
