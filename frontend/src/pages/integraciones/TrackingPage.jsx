import { useState } from 'react';
import { 
  Search, Ship, MapPin, Calendar, Clock, RefreshCw,
  Package, Anchor, Navigation, AlertCircle, CheckCircle
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select } from '../../components/ui';
import { useTrack, useIntegrations, useTrackingSubscriptions, useCreateTrackingSubscription } from '../../hooks/useApi';
import { cn, formatDate, formatDateTime } from '../../lib/utils';
import toast from 'react-hot-toast';

// Iconos por tipo de evento
const eventIcons = {
  LOAD: Package,
  DISC: Package,
  GTIN: Anchor,
  GTOT: Anchor,
  ARRI: Ship,
  DEPA: Navigation,
  default: MapPin,
};

function TrackingResult({ data }) {
  if (!data) return null;

  const { trackingNumber, events = [], currentStatus, provider, eta } = data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {trackingNumber}
          </CardTitle>
          <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">
            {provider}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Estado actual */}
        {currentStatus && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                <Ship className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{currentStatus.status}</p>
                <p className="text-sm text-slate-600">{currentStatus.location}</p>
                {currentStatus.dateTime && (
                  <p className="text-xs text-slate-500">
                    {formatDateTime(currentStatus.dateTime)}
                  </p>
                )}
              </div>
            </div>
            {eta && (
              <div className="mt-3 pt-3 border-t border-primary-200 flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary-600" />
                <span className="text-slate-600">ETA:</span>
                <span className="font-medium text-slate-800">{formatDateTime(eta)}</span>
              </div>
            )}
          </div>
        )}

        {/* Timeline de eventos */}
        {events.length > 0 ? (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
            <div className="space-y-4">
              {events.map((event, idx) => {
                const Icon = eventIcons[event.eventCode] || eventIcons.default;
                const isFirst = idx === 0;
                
                return (
                  <div key={idx} className="relative flex gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center z-10',
                      isFirst ? 'bg-primary-500' : 'bg-slate-200'
                    )}>
                      <Icon className={cn('w-5 h-5', isFirst ? 'text-white' : 'text-slate-600')} />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={cn(
                            'font-medium',
                            isFirst ? 'text-slate-800' : 'text-slate-600'
                          )}>
                            {event.eventDescription}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <MapPin className="w-3 h-3" />
                            {event.location || event.locationCode || 'N/A'}
                          </div>
                          {event.vessel && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Ship className="w-3 h-3" />
                              {event.vessel} {event.voyage && `- ${event.voyage}`}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-slate-600">{formatDate(event.eventDateTime)}</p>
                          <p className="text-slate-400">
                            {new Date(event.eventDateTime).toLocaleTimeString('es-AR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay eventos de tracking disponibles</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentSubscriptions() {
  const { data, isLoading } = useTrackingSubscriptions({ isActive: 'true' });
  const subscriptions = data?.data || [];

  if (isLoading || subscriptions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguimientos Activos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {subscriptions.slice(0, 5).map(sub => (
            <div
              key={sub.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-800">{sub.trackingNumber}</p>
                  <p className="text-xs text-slate-500">{sub.integration?.provider}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">{sub.currentStatus || 'N/A'}</p>
                <p className="text-xs text-slate-400">{sub.currentLocation}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingType, setTrackingType] = useState('CONTAINER');
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);

  const trackMutation = useTrack();
  const { data: integrationsData } = useIntegrations();
  const activeIntegrations = (integrationsData?.data || []).filter(i => i.status === 'ACTIVE');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      toast.error('Ingresá un número de tracking');
      return;
    }

    if (activeIntegrations.length === 0) {
      toast.error('No hay integraciones activas. Configurá al menos una naviera.');
      return;
    }

    setSearching(true);
    setResult(null);

    try {
      const response = await trackMutation.mutateAsync({
        trackingNumber: trackingNumber.trim().toUpperCase(),
        trackingType,
      });

      if (response.success) {
        setResult(response.data);
        toast.success('Tracking encontrado');
      } else {
        toast.error(response.error || 'No se encontró información');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al buscar tracking');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Layout title="Tracking" subtitle="Rastrea contenedores y documentos">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de búsqueda */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Label>Número de Tracking</Label>
                    <Input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                      placeholder="Ej: MSKU1234567"
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={trackingType}
                      onChange={(e) => setTrackingType(e.target.value)}
                    >
                      <option value="CONTAINER">Contenedor</option>
                      <option value="BL">Bill of Lading</option>
                      <option value="BOOKING">Booking</option>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={searching || !trackingNumber.trim()}
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

                {/* Navieras activas */}
                {activeIntegrations.length > 0 ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Buscando en: {activeIntegrations.map(i => i.carrierInfo?.name || i.provider).join(', ')}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>No hay integraciones activas. <a href="/integraciones" className="underline">Configurá una naviera</a></span>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Resultado */}
          {result && <TrackingResult data={result} />}

          {/* Estado inicial */}
          {!result && !searching && (
            <Card>
              <CardContent className="p-12 text-center">
                <Ship className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  Rastrea tu carga
                </h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Ingresá el número de contenedor, Bill of Lading o Booking para 
                  obtener información de tracking en tiempo real.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Info de tipos de tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipos de Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-primary-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-700">Contenedor</p>
                  <p className="text-slate-500">Ej: MSKU1234567</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Ship className="w-5 h-5 text-primary-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-700">Bill of Lading</p>
                  <p className="text-slate-500">Ej: MAEU123456789</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Anchor className="w-5 h-5 text-primary-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-700">Booking</p>
                  <p className="text-slate-500">Ej: 987654321</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seguimientos recientes */}
          <RecentSubscriptions />
        </div>
      </div>
    </Layout>
  );
}

export default TrackingPage;
