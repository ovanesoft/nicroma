import { useState } from 'react';
import { 
  Search, Ship, Calendar, Clock, MapPin, ArrowRight,
  RefreshCw, AlertCircle, Anchor
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '../../components/ui';
import { useSchedules, useIntegrations } from '../../hooks/useApi';
import { cn, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

function ScheduleCard({ schedule }) {
  const transitDays = schedule.transitTime || 
    (schedule.departureDate && schedule.arrivalDate 
      ? Math.round((new Date(schedule.arrivalDate) - new Date(schedule.departureDate)) / (1000 * 60 * 60 * 24))
      : null);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-primary-500" />
            <span className="font-semibold text-slate-800">{schedule.vesselName}</span>
            {schedule.voyage && (
              <span className="text-sm text-slate-500">v.{schedule.voyage}</span>
            )}
          </div>
          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
            {schedule.provider}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Puerto origen */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Anchor className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Salida</span>
            </div>
            <p className="font-semibold text-slate-800">
              {schedule.departurePort || schedule.departurePortCode}
            </p>
            {schedule.departureDate && (
              <p className="text-sm text-slate-500">{formatDate(schedule.departureDate)}</p>
            )}
          </div>

          {/* Flecha y tránsito */}
          <div className="flex flex-col items-center px-4">
            <ArrowRight className="w-6 h-6 text-primary-500" />
            {transitDays && (
              <span className="text-xs text-slate-500 mt-1">{transitDays}d</span>
            )}
          </div>

          {/* Puerto destino */}
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <span className="text-sm font-medium text-slate-600">Llegada</span>
              <MapPin className="w-4 h-4 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-800">
              {schedule.arrivalPort || schedule.arrivalPortCode}
            </p>
            {schedule.arrivalDate && (
              <p className="text-sm text-slate-500">{formatDate(schedule.arrivalDate)}</p>
            )}
          </div>
        </div>

        {/* Info adicional */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-slate-500">
          {schedule.service && (
            <span>Servicio: {schedule.service}</span>
          )}
          {schedule.transhipments !== undefined && (
            <span>
              {schedule.transhipments === 0 
                ? 'Directo' 
                : `${schedule.transhipments} transbordos`}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SchedulesPage() {
  const [originPort, setOriginPort] = useState('');
  const [destinationPort, setDestinationPort] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const schedulesMutation = useSchedules();
  const { data: integrationsData } = useIntegrations();
  const activeIntegrations = (integrationsData?.data || []).filter(i => i.status === 'ACTIVE');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!originPort.trim() || !destinationPort.trim()) {
      toast.error('Ingresá puerto de origen y destino');
      return;
    }

    if (activeIntegrations.length === 0) {
      toast.error('No hay integraciones activas');
      return;
    }

    setSearching(true);
    setResults(null);

    try {
      const response = await schedulesMutation.mutateAsync({
        originPort: originPort.trim().toUpperCase(),
        destinationPort: destinationPort.trim().toUpperCase(),
        departureDate: departureDate || undefined,
        weeksOut: 4,
      });

      if (response.success) {
        setResults(response.data);
        if (response.data.schedules?.length === 0) {
          toast('No se encontraron schedules para esta ruta', { icon: '📭' });
        } else {
          toast.success(`${response.data.schedules.length} schedules encontrados`);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al buscar schedules');
    } finally {
      setSearching(false);
    }
  };

  // Puertos populares para autocompletado
  const popularPorts = [
    { code: 'ARBUE', name: 'Buenos Aires' },
    { code: 'BRSSZ', name: 'Santos' },
    { code: 'CLVAP', name: 'Valparaíso' },
    { code: 'CNSHA', name: 'Shanghai' },
    { code: 'USNYC', name: 'New York' },
    { code: 'NLRTM', name: 'Rotterdam' },
    { code: 'DEHAM', name: 'Hamburg' },
    { code: 'SGSIN', name: 'Singapore' },
  ];

  return (
    <Layout title="Schedules" subtitle="Consulta itinerarios de buques">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel de búsqueda */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Puerto Origen</Label>
                    <Input
                      value={originPort}
                      onChange={(e) => setOriginPort(e.target.value.toUpperCase())}
                      placeholder="Ej: ARBUE"
                      className="font-mono"
                      list="ports-origin"
                    />
                    <datalist id="ports-origin">
                      {popularPorts.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <Label>Puerto Destino</Label>
                    <Input
                      value={destinationPort}
                      onChange={(e) => setDestinationPort(e.target.value.toUpperCase())}
                      placeholder="Ej: CNSHA"
                      className="font-mono"
                      list="ports-dest"
                    />
                    <datalist id="ports-dest">
                      {popularPorts.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <Label>Fecha desde</Label>
                    <Input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={searching || !originPort.trim() || !destinationPort.trim()}
                    >
                      {searching ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      {searching ? 'Buscando...' : 'Buscar'}
                    </Button>
                  </div>
                </div>

                {activeIntegrations.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>No hay integraciones activas. <a href="/integraciones" className="underline">Configurá una naviera</a></span>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Resultados */}
          {results?.schedules?.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  {results.schedules.length} schedules encontrados
                </h2>
                <span className="text-sm text-slate-500">
                  {results.originPort} → {results.destinationPort}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {results.schedules.map((schedule, idx) => (
                  <ScheduleCard key={idx} schedule={schedule} />
                ))}
              </div>
            </div>
          )}

          {/* Estado inicial */}
          {!results && !searching && (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  Consulta itinerarios
                </h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Ingresá el puerto de origen y destino para consultar 
                  los próximos itinerarios disponibles.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Sin resultados */}
          {results?.schedules?.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Ship className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  No hay schedules disponibles
                </h3>
                <p className="text-slate-500">
                  No se encontraron itinerarios para la ruta {results.originPort} → {results.destinationPort}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Puertos populares */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Puertos Populares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {popularPorts.map(port => (
                  <div 
                    key={port.code}
                    className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer"
                    onClick={() => {
                      if (!originPort) setOriginPort(port.code);
                      else if (!destinationPort) setDestinationPort(port.code);
                    }}
                  >
                    <span className="text-sm text-slate-600">{port.name}</span>
                    <span className="text-xs font-mono text-slate-400">{port.code}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Códigos de Puerto</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p className="mb-2">
                Usá códigos <strong>UN/LOCODE</strong> de 5 letras:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>2 letras: país (AR, BR, CN...)</li>
                <li>3 letras: ubicación (BUE, SHA...)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

export default SchedulesPage;
