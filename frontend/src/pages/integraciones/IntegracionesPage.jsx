import { useState } from 'react';
import { 
  Ship, CheckCircle, XCircle, AlertCircle, Settings, 
  ExternalLink, RefreshCw, Trash2, Key, Eye, EyeOff
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Badge } from '../../components/ui';
import { useCarriers, useSaveIntegration, useTestConnection, useDeleteIntegration } from '../../hooks/useApi';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

// Logos de navieras
const carrierLogos = {
  MAERSK: '🚢',
  MSC: '🚢',
  CMA_CGM: '🚢',
  HAPAG_LLOYD: '🚢',
  EVERGREEN: '🚢',
};

function StatusBadge({ status }) {
  const config = {
    ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Activa' },
    ERROR: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Error' },
    PENDING_VERIFICATION: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'Pendiente' },
    INACTIVE: { color: 'bg-slate-100 text-slate-800', icon: XCircle, label: 'Inactiva' },
    NOT_CONFIGURED: { color: 'bg-slate-100 text-slate-500', icon: Settings, label: 'No configurada' },
  };

  const { color, icon: Icon, label } = config[status] || config.NOT_CONFIGURED;

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function CarrierCard({ carrier, onConfigure }) {
  return (
    <Card className={cn(
      'hover:shadow-md transition-shadow cursor-pointer',
      carrier.isConfigured && carrier.status === 'ACTIVE' && 'ring-2 ring-green-500'
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">
              {carrierLogos[carrier.code] || '🚢'}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{carrier.name}</h3>
              <p className="text-sm text-slate-500">{carrier.country}</p>
            </div>
          </div>
          <StatusBadge status={carrier.status} />
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {carrier.features?.map(feature => (
            <span key={feature} className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs">
              {feature === 'tracking' ? 'Tracking' : feature === 'schedules' ? 'Schedules' : feature === 'booking' ? 'Booking' : feature}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <a
            href={carrier.apiPortal}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            Portal API <ExternalLink className="w-3 h-3" />
          </a>
          <Button size="sm" onClick={() => onConfigure(carrier)}>
            {carrier.isConfigured ? 'Configurar' : 'Agregar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigureModal({ carrier, onClose }) {
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: '',
  });
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const saveMutation = useSaveIntegration(carrier.code);
  const testMutation = useTestConnection(carrier.code);
  const deleteMutation = useDeleteIntegration(carrier.code);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testMutation.mutateAsync(credentials);
      setTestResult(result);
      if (result.success) {
        toast.success('Conexión exitosa');
      } else {
        toast.error(result.message || 'Error en la conexión');
      }
    } catch (error) {
      setTestResult({ success: false, message: error.message });
      toast.error(error.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(credentials);
      toast.success('Credenciales guardadas');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta integración?')) return;
    try {
      await deleteMutation.mutateAsync();
      toast.success('Integración eliminada');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">
              {carrierLogos[carrier.code] || '🚢'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">{carrier.name}</h2>
              <p className="text-sm text-slate-500">Configurar integración API</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">¿Cómo obtener las credenciales?</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Visitá el <a href={carrier.apiPortal} target="_blank" rel="noopener noreferrer" className="underline">Portal de Desarrolladores</a></li>
              <li>Registrate o iniciá sesión</li>
              <li>Creá una nueva aplicación</li>
              <li>Copiá el Client ID y Client Secret</li>
            </ol>
          </div>

          {/* Formulario */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                value={credentials.clientId}
                onChange={(e) => setCredentials(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="Ingresá tu Client ID"
              />
            </div>

            <div>
              <Label htmlFor="clientSecret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="clientSecret"
                  type={showSecret ? 'text' : 'password'}
                  value={credentials.clientSecret}
                  onChange={(e) => setCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
                  placeholder="Ingresá tu Client Secret"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Resultado del test */}
          {testResult && (
            <div className={cn(
              'p-4 rounded-lg border',
              testResult.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            )}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {testResult.success ? 'Conexión exitosa' : 'Error de conexión'}
                </span>
              </div>
              {testResult.message && (
                <p className="mt-1 text-sm">{testResult.message}</p>
              )}
            </div>
          )}

          {/* Info de la integración existente */}
          {carrier.isConfigured && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-700 mb-2">Integración actual</h4>
              <div className="flex items-center justify-between">
                <StatusBadge status={carrier.status} />
                {carrier.lastTestedAt && (
                  <span className="text-xs text-slate-500">
                    Última prueba: {new Date(carrier.lastTestedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-slate-50 flex items-center justify-between">
          <div>
            {carrier.isConfigured && (
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!credentials.clientId || !credentials.clientSecret || testing}
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', testing && 'animate-spin')} />
              {testing ? 'Probando...' : 'Probar'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!credentials.clientId || !credentials.clientSecret || saveMutation.isPending}
            >
              <Key className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegracionesPage() {
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const { data, isLoading, error } = useCarriers();

  const carriers = data?.data || [];

  if (isLoading) {
    return (
      <Layout title="Integraciones" subtitle="Conectá con las principales navieras">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 bg-slate-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </Layout>
    );
  }

  const configuredCarriers = carriers.filter(c => c.isConfigured && c.status === 'ACTIVE');
  const pendingCarriers = carriers.filter(c => c.isConfigured && c.status !== 'ACTIVE');
  const availableCarriers = carriers.filter(c => !c.isConfigured);

  return (
    <Layout title="Integraciones" subtitle="Conectá con las principales navieras del mundo">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{configuredCarriers.length}</p>
              <p className="text-sm text-slate-500">Activas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{pendingCarriers.length}</p>
              <p className="text-sm text-slate-500">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <Ship className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{availableCarriers.length}</p>
              <p className="text-sm text-slate-500">Disponibles</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activas */}
      {configuredCarriers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Integraciones Activas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configuredCarriers.map(carrier => (
              <CarrierCard
                key={carrier.code}
                carrier={carrier}
                onConfigure={setSelectedCarrier}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pendientes */}
      {pendingCarriers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Requieren Atención
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingCarriers.map(carrier => (
              <CarrierCard
                key={carrier.code}
                carrier={carrier}
                onConfigure={setSelectedCarrier}
              />
            ))}
          </div>
        </div>
      )}

      {/* Disponibles */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Ship className="w-5 h-5 text-slate-500" />
          Navieras Disponibles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableCarriers.map(carrier => (
            <CarrierCard
              key={carrier.code}
              carrier={carrier}
              onConfigure={setSelectedCarrier}
            />
          ))}
        </div>
      </div>

      {/* Modal de configuración */}
      {selectedCarrier && (
        <ConfigureModal
          carrier={selectedCarrier}
          onClose={() => setSelectedCarrier(null)}
        />
      )}
    </Layout>
  );
}

export default IntegracionesPage;
