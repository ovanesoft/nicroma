import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, Save, Ship, Package, DollarSign, FileText,
  Plus, Trash2, Search, Receipt, MapPin, RefreshCw
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input, Badge
} from '../../components/ui';
import { 
  useCarpeta, useCreateCarpeta, useUpdateCarpeta, useBuscarClientes,
  useCreatePrefacturaDesdeCarpeta, useTrack, useIntegrations
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { AREAS, SECTORES, TIPOS_OPERACION, CARPETA_ESTADOS, INCOTERMS, TIPOS_CONTENEDOR } from '../../lib/constants';
import { cn } from '../../lib/utils';

const carpetaSchema = z.object({
  area: z.enum(['Marítimo', 'Aéreo', 'Terrestre']),
  sector: z.enum(['Importación', 'Exportación']),
  tipoOperacion: z.string().min(1, 'Requerido'),
  clienteId: z.string().uuid('Seleccione un cliente'),
  puertoOrigen: z.string().optional(),
  puertoDestino: z.string().optional(),
  etd: z.string().optional(),
  eta: z.string().optional(),
  booking: z.string().optional(),
  incoterm: z.string().optional(),
  buque: z.string().optional(),
  viaje: z.string().optional(),
  transportista: z.string().optional(),
  masterBL: z.string().optional(),
  houseBL: z.string().optional(),
  referenciaCliente: z.string().optional(),
  observaciones: z.string().optional()
});

function CarpetaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [activeTab, setActiveTab] = useState('general');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  
  // Datos de mercancías, contenedores y gastos (manejados localmente)
  const [mercancias, setMercancias] = useState([]);
  const [contenedores, setContenedores] = useState([]);
  const [gastos, setGastos] = useState([]);
  
  // Tracking
  const [trackingData, setTrackingData] = useState({});
  const [trackingLoading, setTrackingLoading] = useState({});

  const { data: carpetaData, isLoading: loadingCarpeta } = useCarpeta(id);
  const { data: clientesData } = useBuscarClientes(clienteSearch, 'cliente');
  const { data: integrationsData } = useIntegrations();
  const createCarpeta = useCreateCarpeta();
  const updateCarpeta = useUpdateCarpeta(id);
  const crearPrefactura = useCreatePrefacturaDesdeCarpeta();
  const trackMutation = useTrack();

  const clientes = clientesData?.data?.clientes || [];
  const hasActiveIntegrations = (integrationsData?.data || []).some(i => i.status === 'ACTIVE');
  
  // Función para tracking de contenedor
  const handleTrackContainer = async (containerNumber, index) => {
    if (!containerNumber || !hasActiveIntegrations) return;
    
    setTrackingLoading(prev => ({ ...prev, [index]: true }));
    
    try {
      const response = await trackMutation.mutateAsync({
        trackingNumber: containerNumber.toUpperCase(),
        trackingType: 'CONTAINER',
      });
      
      if (response.success) {
        setTrackingData(prev => ({ ...prev, [index]: response.data }));
        toast.success('Tracking actualizado');
      } else {
        toast.error('No se encontró información');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al obtener tracking');
    } finally {
      setTrackingLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleGenerarPrefactura = async () => {
    if (!id) return;
    if (gastos.length === 0) {
      alert('No hay gastos para facturar');
      return;
    }
    if (!confirm('¿Generar prefactura desde los gastos de esta carpeta?')) return;
    try {
      const result = await crearPrefactura.mutateAsync({ carpetaId: id });
      navigate(`/prefacturas/${result.data.prefactura.id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Error al generar prefactura');
    }
  };

  const { 
    register, 
    handleSubmit, 
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(carpetaSchema),
    defaultValues: {
      area: 'Marítimo',
      sector: 'Importación',
      tipoOperacion: 'FCL-FCL'
    }
  });

  // Cargar datos si estamos editando
  useEffect(() => {
    if (carpetaData?.data?.carpeta) {
      const c = carpetaData.data.carpeta;
      setValue('area', c.area);
      setValue('sector', c.sector);
      setValue('tipoOperacion', c.tipoOperacion);
      setValue('clienteId', c.clienteId);
      setValue('puertoOrigen', c.puertoOrigen || '');
      setValue('puertoDestino', c.puertoDestino || '');
      setValue('etd', c.fechaSalidaEstimada ? c.fechaSalidaEstimada.split('T')[0] : '');
      setValue('eta', c.fechaLlegadaEstimada ? c.fechaLlegadaEstimada.split('T')[0] : '');
      setValue('booking', c.booking || '');
      setValue('incoterm', c.incoterm || '');
      setValue('buque', c.buque || '');
      setValue('viaje', c.viaje || '');
      setValue('transportista', c.transportista || '');
      setValue('masterBL', c.masterBL || '');
      setValue('houseBL', c.houseBL || '');
      setValue('referenciaCliente', c.referenciaCliente || '');
      setValue('observaciones', c.observaciones || '');
      
      setSelectedCliente(c.cliente);
      setMercancias(c.mercancias || []);
      setContenedores(c.contenedores || []);
      setGastos(c.gastos || []);
    }
  }, [carpetaData, setValue]);

  const onSubmit = async (formData) => {
    try {
      const payload = {
        ...formData,
        mercancias: mercancias.filter(m => m.descripcion),
        contenedores: contenedores.filter(c => c.tipo),
        gastos: gastos.filter(g => g.concepto)
      };

      if (isEditing) {
        await updateCarpeta.mutateAsync(payload);
      } else {
        const result = await createCarpeta.mutateAsync(payload);
        navigate(`/carpetas/${result.data.carpeta.id}`);
        return;
      }
      navigate('/carpetas');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const selectCliente = (cliente) => {
    setSelectedCliente(cliente);
    setValue('clienteId', cliente.id);
    setShowClienteDropdown(false);
    setClienteSearch('');
  };

  // Mercancías handlers
  const addMercancia = () => {
    setMercancias([...mercancias, { 
      descripcion: '', embalaje: '', bultos: 0, peso: 0, volumen: 0, hsCode: '' 
    }]);
  };

  const updateMercancia = (index, field, value) => {
    const updated = [...mercancias];
    updated[index][field] = value;
    setMercancias(updated);
  };

  const removeMercancia = (index) => {
    setMercancias(mercancias.filter((_, i) => i !== index));
  };

  // Contenedores handlers
  const addContenedor = () => {
    setContenedores([...contenedores, { 
      tipo: '40DC', numero: '', cantidad: 1, precinto: '' 
    }]);
  };

  const updateContenedor = (index, field, value) => {
    const updated = [...contenedores];
    updated[index][field] = value;
    setContenedores(updated);
  };

  const removeContenedor = (index) => {
    setContenedores(contenedores.filter((_, i) => i !== index));
  };

  // Gastos handlers
  const addGasto = () => {
    setGastos([...gastos, { 
      concepto: '', montoVenta: 0, montoCosto: 0, cantidad: 1, divisa: 'USD' 
    }]);
  };

  const updateGasto = (index, field, value) => {
    const updated = [...gastos];
    updated[index][field] = field.includes('monto') || field === 'cantidad' ? parseFloat(value) || 0 : value;
    setGastos(updated);
  };

  const removeGasto = (index) => {
    setGastos(gastos.filter((_, i) => i !== index));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Ship },
    { id: 'mercancias', label: 'Mercancías', icon: Package },
    { id: 'gastos', label: 'Gastos', icon: DollarSign }
  ];

  if (loadingCarpeta && isEditing) {
    return (
      <Layout title="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title={isEditing ? `Carpeta ${carpetaData?.data?.carpeta?.numero || ''}` : 'Nueva Carpeta'}
      subtitle={isEditing ? 'Editar carpeta de embarque' : 'Crear nueva carpeta de embarque'}
    >
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/carpetas')}>
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
        <div className="flex gap-2">
          {isEditing && gastos.length > 0 && (
            <Button 
              type="button"
              variant="secondary" 
              onClick={handleGenerarPrefactura}
              loading={crearPrefactura.isPending}
            >
              <Receipt className="w-4 h-4" />
              Generar Prefactura
            </Button>
          )}
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            <Save className="w-4 h-4" />
            {isEditing ? 'Guardar Cambios' : 'Crear Carpeta'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Tab: General */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Clasificación */}
            <Card>
              <CardHeader>
                <CardTitle>Clasificación</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Área *</label>
                  <select
                    {...register('area')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
                  >
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Sector *</label>
                  <select
                    {...register('sector')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
                  >
                    {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo Operación *</label>
                  <select
                    {...register('tipoOperacion')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
                  >
                    {TIPOS_OPERACION.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Cliente *</label>
                  {selectedCliente ? (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <p className="font-medium text-slate-800">{selectedCliente.razonSocial}</p>
                        <p className="text-sm text-slate-500">{selectedCliente.numeroDocumento}</p>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedCliente(null);
                          setValue('clienteId', '');
                        }}
                      >
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar cliente por nombre o CUIT..."
                        value={clienteSearch}
                        onChange={(e) => {
                          setClienteSearch(e.target.value);
                          setShowClienteDropdown(true);
                        }}
                        onFocus={() => setShowClienteDropdown(true)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                      />
                      {showClienteDropdown && clientes.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-10 max-h-60 overflow-y-auto">
                          {clientes.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => selectCliente(c)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
                            >
                              <div>
                                <p className="font-medium text-slate-800">{c.razonSocial}</p>
                                <p className="text-sm text-slate-500">{c.numeroDocumento}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {errors.clienteId && (
                    <p className="mt-1 text-sm text-red-500">{errors.clienteId.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ruta y Fechas */}
            <Card>
              <CardHeader>
                <CardTitle>Ruta y Fechas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Puerto Origen"
                  placeholder="CNSHA - Shanghai"
                  {...register('puertoOrigen')}
                />
                <Input
                  label="Puerto Destino"
                  placeholder="ARBUE - Buenos Aires"
                  {...register('puertoDestino')}
                />
                <Input
                  label="ETD (Salida Estimada)"
                  type="date"
                  {...register('etd')}
                />
                <Input
                  label="ETA (Llegada Estimada)"
                  type="date"
                  {...register('eta')}
                />
              </CardContent>
            </Card>

            {/* Transporte */}
            <Card>
              <CardHeader>
                <CardTitle>Transporte</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Booking"
                  placeholder="BK123456"
                  {...register('booking')}
                />
                <Input
                  label="Buque"
                  placeholder="MSC ANNA"
                  {...register('buque')}
                />
                <Input
                  label="Viaje"
                  placeholder="V.123E"
                  {...register('viaje')}
                />
                <Input
                  label="Transportista / Naviera"
                  placeholder="MSC"
                  {...register('transportista')}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Incoterm</label>
                  <select
                    {...register('incoterm')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
                  >
                    <option value="">Seleccionar</option>
                    {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <Input
                  label="Referencia Cliente"
                  placeholder="PO-12345"
                  {...register('referenciaCliente')}
                />
              </CardContent>
            </Card>

            {/* BL */}
            <Card>
              <CardHeader>
                <CardTitle>Documentación</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Master BL"
                  placeholder="MEDU123456789"
                  {...register('masterBL')}
                />
                <Input
                  label="House BL"
                  placeholder="HBL123456"
                  {...register('houseBL')}
                />
              </CardContent>
            </Card>

            {/* Observaciones */}
            <Card>
              <CardHeader>
                <CardTitle>Observaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  {...register('observaciones')}
                  placeholder="Notas adicionales..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: Mercancías */}
        {activeTab === 'mercancias' && (
          <div className="space-y-6">
            {/* Contenedores */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Contenedores</CardTitle>
                <Button type="button" size="sm" onClick={addContenedor}>
                  <Plus className="w-4 h-4" />
                  Agregar
                </Button>
              </CardHeader>
              <CardContent>
                {contenedores.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No hay contenedores agregados</p>
                ) : (
                  <div className="space-y-3">
                    {contenedores.map((cont, index) => (
                      <div key={index} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                              <select
                                value={cont.tipo}
                                onChange={(e) => updateContenedor(index, 'tipo', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 bg-white"
                              >
                                {TIPOS_CONTENEDOR.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Número</label>
                              <input
                                type="text"
                                value={cont.numero || ''}
                                onChange={(e) => updateContenedor(index, 'numero', e.target.value)}
                                placeholder="MSKU1234567"
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
                              <input
                                type="number"
                                value={cont.cantidad || 1}
                                onChange={(e) => updateContenedor(index, 'cantidad', parseInt(e.target.value) || 1)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Precinto</label>
                              <input
                                type="text"
                                value={cont.precinto || ''}
                                onChange={(e) => updateContenedor(index, 'precinto', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                              />
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {cont.numero && hasActiveIntegrations && (
                              <button 
                                type="button"
                                onClick={() => handleTrackContainer(cont.numero, index)}
                                disabled={trackingLoading[index]}
                                className="p-2 text-primary-500 hover:bg-primary-50 rounded disabled:opacity-50"
                                title="Tracking"
                              >
                                {trackingLoading[index] ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MapPin className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button 
                              type="button"
                              onClick={() => removeContenedor(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Tracking info */}
                        {trackingData[index] && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                                {trackingData[index].provider}
                              </span>
                              {trackingData[index].currentStatus && (
                                <>
                                  <span className="text-slate-600">
                                    {trackingData[index].currentStatus.status}
                                  </span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-500">
                                    {trackingData[index].currentStatus.location}
                                  </span>
                                </>
                              )}
                            </div>
                            {trackingData[index].events?.length > 0 && (
                              <p className="text-xs text-slate-400 mt-1">
                                Último evento: {new Date(trackingData[index].events[0].eventDateTime).toLocaleString('es-AR')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mercancías */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Mercancías</CardTitle>
                <Button type="button" size="sm" onClick={addMercancia}>
                  <Plus className="w-4 h-4" />
                  Agregar
                </Button>
              </CardHeader>
              <CardContent>
                {mercancias.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No hay mercancías agregadas</p>
                ) : (
                  <div className="space-y-3">
                    {mercancias.map((merc, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-xs text-slate-500 mb-1">Descripción</label>
                            <input
                              type="text"
                              value={merc.descripcion || ''}
                              onChange={(e) => updateMercancia(index, 'descripcion', e.target.value)}
                              placeholder="Descripción de la mercancía"
                              className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Embalaje</label>
                            <input
                              type="text"
                              value={merc.embalaje || ''}
                              onChange={(e) => updateMercancia(index, 'embalaje', e.target.value)}
                              placeholder="Cajas"
                              className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Bultos</label>
                            <input
                              type="number"
                              value={merc.bultos || ''}
                              onChange={(e) => updateMercancia(index, 'bultos', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Peso (kg)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={merc.peso || ''}
                              onChange={(e) => updateMercancia(index, 'peso', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">HS Code</label>
                            <input
                              type="text"
                              value={merc.hsCode || ''}
                              onChange={(e) => updateMercancia(index, 'hsCode', e.target.value)}
                              placeholder="8471.30"
                              className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                            />
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeMercancia(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: Gastos */}
        {activeTab === 'gastos' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gastos</CardTitle>
              <Button type="button" size="sm" onClick={addGasto}>
                <Plus className="w-4 h-4" />
                Agregar Gasto
              </Button>
            </CardHeader>
            <CardContent>
              {gastos.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No hay gastos agregados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b">
                        <th className="pb-2 font-medium">Concepto</th>
                        <th className="pb-2 font-medium">Divisa</th>
                        <th className="pb-2 font-medium text-right">Venta</th>
                        <th className="pb-2 font-medium text-right">Costo</th>
                        <th className="pb-2 font-medium text-right">Cantidad</th>
                        <th className="pb-2 font-medium text-right">Total Venta</th>
                        <th className="pb-2 font-medium text-right">Total Costo</th>
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {gastos.map((gasto, index) => (
                        <tr key={index} className="border-b border-slate-100">
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              value={gasto.concepto || ''}
                              onChange={(e) => updateGasto(index, 'concepto', e.target.value)}
                              placeholder="FLETE MARITIMO"
                              className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <select
                              value={gasto.divisa || 'USD'}
                              onChange={(e) => updateGasto(index, 'divisa', e.target.value)}
                              className="w-20 px-2 py-1.5 text-sm rounded border border-slate-300 bg-white"
                            >
                              <option value="USD">USD</option>
                              <option value="ARS">ARS</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              step="0.01"
                              value={gasto.montoVenta || ''}
                              onChange={(e) => updateGasto(index, 'montoVenta', e.target.value)}
                              className="w-24 px-2 py-1.5 text-sm rounded border border-slate-300 text-right"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              step="0.01"
                              value={gasto.montoCosto || ''}
                              onChange={(e) => updateGasto(index, 'montoCosto', e.target.value)}
                              className="w-24 px-2 py-1.5 text-sm rounded border border-slate-300 text-right"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              value={gasto.cantidad || 1}
                              onChange={(e) => updateGasto(index, 'cantidad', e.target.value)}
                              className="w-16 px-2 py-1.5 text-sm rounded border border-slate-300 text-right"
                            />
                          </td>
                          <td className="py-2 pr-2 text-right text-sm font-medium text-slate-700">
                            {((gasto.montoVenta || 0) * (gasto.cantidad || 1)).toFixed(2)}
                          </td>
                          <td className="py-2 pr-2 text-right text-sm font-medium text-slate-700">
                            {((gasto.montoCosto || 0) * (gasto.cantidad || 1)).toFixed(2)}
                          </td>
                          <td className="py-2">
                            <button 
                              type="button"
                              onClick={() => removeGasto(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-medium text-slate-800">
                        <td colSpan={5} className="pt-4 text-right">Totales:</td>
                        <td className="pt-4 text-right">
                          {gastos.reduce((sum, g) => sum + (g.montoVenta || 0) * (g.cantidad || 1), 0).toFixed(2)}
                        </td>
                        <td className="pt-4 text-right">
                          {gastos.reduce((sum, g) => sum + (g.montoCosto || 0) * (g.cantidad || 1), 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr className="text-green-600 font-medium">
                        <td colSpan={5} className="pt-2 text-right">Margen:</td>
                        <td colSpan={2} className="pt-2 text-right">
                          {(
                            gastos.reduce((sum, g) => sum + (g.montoVenta || 0) * (g.cantidad || 1), 0) -
                            gastos.reduce((sum, g) => sum + (g.montoCosto || 0) * (g.cantidad || 1), 0)
                          ).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </form>
    </Layout>
  );
}

export default CarpetaForm;
