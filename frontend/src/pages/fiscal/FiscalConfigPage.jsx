import { useState } from 'react';
import { 
  FileText, Upload, CheckCircle, XCircle, AlertCircle, 
  RefreshCw, Building2, Key, Calendar, Server, Plus
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle, 
  Button, Input, Label, Select, Badge 
} from '../../components/ui';
import { 
  useFiscalConfig, useSaveFiscalConfig, useTestFiscalConnection,
  useValidateCertificate, usePuntosVenta, useSyncPuntosVenta,
  useFiscalServerStatus
} from '../../hooks/useApi';
import { cn, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

const CONDICIONES_IVA = [
  'Responsable Inscripto',
  'Monotributista',
  'Exento',
  'No Responsable',
  'Consumidor Final',
];

function StatusBadge({ status }) {
  const config = {
    ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Activa' },
    ERROR: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Error' },
    PENDING_SETUP: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'Pendiente' },
    INACTIVE: { color: 'bg-slate-100 text-slate-800', icon: XCircle, label: 'Inactiva' },
  };

  const { color, icon: Icon, label } = config[status] || config.PENDING_SETUP;

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function ServerStatusIndicator({ status }) {
  if (!status) return null;

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <span className={cn(
          'w-2 h-2 rounded-full',
          status.appServer === 'OK' ? 'bg-green-500' : 'bg-red-500'
        )} />
        <span className="text-slate-600">App Server</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          'w-2 h-2 rounded-full',
          status.dbServer === 'OK' ? 'bg-green-500' : 'bg-red-500'
        )} />
        <span className="text-slate-600">DB Server</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          'w-2 h-2 rounded-full',
          status.authServer === 'OK' ? 'bg-green-500' : 'bg-red-500'
        )} />
        <span className="text-slate-600">Auth Server</span>
      </div>
    </div>
  );
}

function FiscalConfigPage() {
  const { data: configData, isLoading } = useFiscalConfig();
  const { data: puntosVentaData } = usePuntosVenta();
  const { data: serverStatusData } = useFiscalServerStatus();
  
  const saveMutation = useSaveFiscalConfig();
  const testMutation = useTestFiscalConnection();
  const validateCertMutation = useValidateCertificate();
  const syncPVMutation = useSyncPuntosVenta();

  const [formData, setFormData] = useState({
    environment: 'TESTING',
    cuit: '',
    razonSocial: '',
    domicilioFiscal: '',
    condicionIVA: '',
    inicioActividades: '',
  });
  const [certificate, setCertificate] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [certPassword, setCertPassword] = useState('');
  const [certInfo, setCertInfo] = useState(null);

  const config = configData?.data;
  const puntosVenta = puntosVentaData?.data || [];
  const serverStatus = serverStatusData?.data;

  // Cargar datos cuando llegan
  useState(() => {
    if (config) {
      setFormData({
        environment: config.environment || 'TESTING',
        cuit: config.cuit || '',
        razonSocial: config.razonSocial || '',
        domicilioFiscal: config.domicilioFiscal || '',
        condicionIVA: config.condicionIVA || '',
        inicioActividades: config.inicioActividades?.split('T')[0] || '',
      });
    }
  }, [config]);

  const handleFileUpload = async (file, type) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      
      if (type === 'certificate') {
        setCertificate(content);
        // Validar certificado
        try {
          const result = await validateCertMutation.mutateAsync(content);
          if (result.data?.valid) {
            setCertInfo(result.data);
            toast.success('Certificado válido');
          } else {
            toast.error(result.data?.error || 'Certificado inválido');
          }
        } catch (error) {
          toast.error('Error al validar certificado');
        }
      } else {
        setPrivateKey(content);
        toast.success('Clave privada cargada');
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!formData.cuit) {
      toast.error('CUIT es requerido');
      return;
    }

    try {
      await saveMutation.mutateAsync({
        ...formData,
        certificate: certificate || undefined,
        privateKey: privateKey || undefined,
        certificatePassword: certPassword || undefined,
      });
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleTest = async () => {
    try {
      const result = await testMutation.mutateAsync();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al probar conexión');
    }
  };

  const handleSyncPV = async () => {
    try {
      const result = await syncPVMutation.mutateAsync();
      toast.success(result.message);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al sincronizar');
    }
  };

  if (isLoading) {
    return (
      <Layout title="Facturación Electrónica" subtitle="Configuración AFIP">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-100 rounded-lg" />
          <div className="h-64 bg-slate-100 rounded-lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Facturación Electrónica" subtitle="Configuración AFIP (Argentina)">
      {/* Estado general */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              config?.status === 'ACTIVE' ? 'bg-green-100' : 'bg-yellow-100'
            )}>
              <FileText className={cn(
                'w-6 h-6',
                config?.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'
              )} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Estado</p>
              <StatusBadge status={config?.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">CUIT</p>
              <p className="font-semibold text-slate-800">{config?.cuit || 'No configurado'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Key className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Certificado</p>
              {config?.hasCertificate ? (
                <p className="text-sm text-green-600">
                  Vence: {formatDate(config.certificateExpires)}
                </p>
              ) : (
                <p className="text-sm text-slate-400">No cargado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado del servidor */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Estado de Servidores AFIP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ServerStatusIndicator status={serverStatus} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos fiscales */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Fiscales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Ambiente</Label>
              <Select
                value={formData.environment}
                onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value }))}
              >
                <option value="TESTING">Testing (Homologación)</option>
                <option value="PRODUCTION">Producción</option>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Usá Testing para pruebas antes de pasar a Producción
              </p>
            </div>

            <div>
              <Label required>CUIT</Label>
              <Input
                value={formData.cuit}
                onChange={(e) => setFormData(prev => ({ ...prev, cuit: e.target.value }))}
                placeholder="20-12345678-9"
              />
            </div>

            <div>
              <Label>Razón Social</Label>
              <Input
                value={formData.razonSocial}
                onChange={(e) => setFormData(prev => ({ ...prev, razonSocial: e.target.value }))}
                placeholder="Mi Empresa S.A."
              />
            </div>

            <div>
              <Label>Domicilio Fiscal</Label>
              <Input
                value={formData.domicilioFiscal}
                onChange={(e) => setFormData(prev => ({ ...prev, domicilioFiscal: e.target.value }))}
                placeholder="Av. Ejemplo 1234, CABA"
              />
            </div>

            <div>
              <Label>Condición IVA</Label>
              <Select
                value={formData.condicionIVA}
                onChange={(e) => setFormData(prev => ({ ...prev, condicionIVA: e.target.value }))}
              >
                <option value="">Seleccionar...</option>
                {CONDICIONES_IVA.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Inicio de Actividades</Label>
              <Input
                type="date"
                value={formData.inicioActividades}
                onChange={(e) => setFormData(prev => ({ ...prev, inicioActividades: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Certificados */}
        <Card>
          <CardHeader>
            <CardTitle>Certificado Digital</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-blue-800 mb-2">¿Cómo obtener el certificado?</p>
              <ol className="list-decimal list-inside text-blue-700 space-y-1">
                <li>Ingresá a AFIP con clave fiscal</li>
                <li>Buscá "Administración de Certificados Digitales"</li>
                <li>Generá un nuevo certificado para Web Services</li>
                <li>Descargá el certificado (.crt) y la clave (.key)</li>
              </ol>
            </div>

            <div>
              <Label>Certificado (.crt o .pem)</Label>
              <div className="mt-1">
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {certificate ? 'Certificado cargado ✓' : 'Seleccionar certificado'}
                  </span>
                  <input
                    type="file"
                    accept=".crt,.pem,.cer"
                    className="hidden"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'certificate')}
                  />
                </label>
              </div>
              {certInfo && certInfo.valid && (
                <div className="mt-2 p-3 bg-green-50 rounded-lg text-sm">
                  <p className="text-green-700">
                    <strong>Sujeto:</strong> {certInfo.subject}
                  </p>
                  <p className="text-green-700">
                    <strong>Válido hasta:</strong> {formatDate(certInfo.validTo)} 
                    ({certInfo.daysToExpire} días)
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label>Clave Privada (.key)</Label>
              <div className="mt-1">
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {privateKey ? 'Clave cargada ✓' : 'Seleccionar clave privada'}
                  </span>
                  <input
                    type="file"
                    accept=".key,.pem"
                    className="hidden"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'privateKey')}
                  />
                </label>
              </div>
            </div>

            <div>
              <Label>Contraseña del certificado (si tiene)</Label>
              <Input
                type="password"
                value={certPassword}
                onChange={(e) => setCertPassword(e.target.value)}
                placeholder="Dejar vacío si no tiene"
              />
            </div>

            {config?.lastError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>Último error:</strong> {config.lastError}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex-1"
              >
                {saveMutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending || !config?.hasCertificate}
              >
                {testMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Probar Conexión'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Puntos de Venta */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Puntos de Venta</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncPV}
            disabled={syncPVMutation.isPending || config?.status !== 'ACTIVE'}
          >
            {syncPVMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sincronizar desde AFIP
          </Button>
        </CardHeader>
        <CardContent>
          {puntosVenta.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay puntos de venta configurados</p>
              <p className="text-sm">Sincronizá desde AFIP o creá uno nuevo</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {puntosVenta.map(pv => (
                <div
                  key={pv.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    pv.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-slate-800">
                      {String(pv.numero).padStart(5, '0')}
                    </span>
                    {pv.isDefault && (
                      <Badge variant="success">Por defecto</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{pv.nombre || `Punto de Venta ${pv.numero}`}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      pv.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                    )}>
                      {pv.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className="text-xs text-slate-500">{pv.tipoEmision}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}

export default FiscalConfigPage;
