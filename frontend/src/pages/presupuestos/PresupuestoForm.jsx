import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Send, CheckCircle, XCircle, FolderOpen,
  Plus, Trash2, Search, MessageSquare, User, Building2, Clock
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input, Badge
} from '../../components/ui';
import { 
  usePresupuesto, useCreatePresupuesto, useUpdatePresupuesto,
  useBuscarClientes, useCambiarEstadoPresupuesto, useConvertirPresupuesto,
  useMensajesPresupuesto, useAgregarMensaje
} from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { AREAS, SECTORES, TIPOS_OPERACION, INCOTERMS } from '../../lib/constants';
import { cn, formatDate } from '../../lib/utils';

// Opciones de base para items
const BASES_ITEM = [
  { value: 'CANT_CONTENEDORES', label: 'Cant. Contenedores' },
  { value: 'IMPORTE_FIJO', label: 'Importe Fijo' },
  { value: 'KILOS', label: 'Kilos' },
  { value: 'POR_CONTENEDOR', label: 'Por Contenedor' },
  { value: 'TONELADA', label: 'Tonelada' },
  { value: 'VOLUMEN', label: 'Volumen' }
];

const ESTADOS = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800' },
  EN_PROCESO: { label: 'En Proceso', color: 'bg-blue-100 text-blue-800' },
  ENVIADO: { label: 'Enviado', color: 'bg-purple-100 text-purple-800' },
  APROBADO: { label: 'Aprobado', color: 'bg-green-100 text-green-800' },
  RECHAZADO: { label: 'Rechazado', color: 'bg-red-100 text-red-800' },
  CONVERTIDO: { label: 'Convertido', color: 'bg-emerald-100 text-emerald-800' }
};

function PresupuestoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = !!id;
  const chatEndRef = useRef(null);

  const [activeTab, setActiveTab] = useState('datos');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    solicitanteNombre: '',
    solicitanteEmail: '',
    solicitanteTelefono: '',
    solicitanteEmpresa: '',
    descripcionPedido: '',
    area: 'Marítimo',
    sector: 'Importación',
    tipoOperacion: '',
    puertoOrigen: '',
    puertoDestino: '',
    fechaValidez: '',
    incoterm: '',
    condiciones: '',
    moneda: 'USD',
    observaciones: '',
    notasInternas: ''
  });

  const [items, setItems] = useState([]);

  const { data: presupuestoData, isLoading } = usePresupuesto(id);
  const { data: clientesData } = useBuscarClientes(clienteSearch, 'cliente');
  const { data: mensajesData, refetch: refetchMensajes } = useMensajesPresupuesto(id);
  
  const createPresupuesto = useCreatePresupuesto();
  const updatePresupuesto = useUpdatePresupuesto(id);
  const cambiarEstado = useCambiarEstadoPresupuesto();
  const convertir = useConvertirPresupuesto();
  const agregarMensaje = useAgregarMensaje();

  const clientes = clientesData?.data?.clientes || [];
  const mensajes = mensajesData?.data?.mensajes || [];
  const presupuesto = presupuestoData?.data?.presupuesto;

  // Cargar datos si estamos editando
  useEffect(() => {
    if (presupuesto) {
      setFormData({
        solicitanteNombre: presupuesto.solicitanteNombre || '',
        solicitanteEmail: presupuesto.solicitanteEmail || '',
        solicitanteTelefono: presupuesto.solicitanteTelefono || '',
        solicitanteEmpresa: presupuesto.solicitanteEmpresa || '',
        descripcionPedido: presupuesto.descripcionPedido || '',
        area: presupuesto.area || 'Marítimo',
        sector: presupuesto.sector || 'Importación',
        tipoOperacion: presupuesto.tipoOperacion || '',
        puertoOrigen: presupuesto.puertoOrigen || '',
        puertoDestino: presupuesto.puertoDestino || '',
        fechaValidez: presupuesto.fechaValidez ? presupuesto.fechaValidez.split('T')[0] : '',
        incoterm: presupuesto.incoterm || '',
        condiciones: presupuesto.condiciones || '',
        moneda: presupuesto.moneda || 'USD',
        observaciones: presupuesto.observaciones || '',
        notasInternas: presupuesto.notasInternas || ''
      });
      setSelectedCliente(presupuesto.cliente);
      setItems(presupuesto.items || []);
    }
  }, [presupuesto]);

  // Scroll al final del chat cuando hay nuevos mensajes
  useEffect(() => {
    if (chatEndRef.current && activeTab === 'chat') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, activeTab]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectCliente = (cliente) => {
    setSelectedCliente(cliente);
    setShowClienteDropdown(false);
    setClienteSearch('');
    // Auto-llenar datos del solicitante
    setFormData(prev => ({
      ...prev,
      solicitanteNombre: cliente.razonSocial,
      solicitanteEmail: cliente.email || '',
      solicitanteTelefono: cliente.telefono || ''
    }));
  };

  // Items handlers
  const addItem = () => {
    setItems([...items, {
      concepto: '',
      descripcion: '',
      prepaidCollect: 'P',
      divisa: 'USD',
      montoVenta: 0,
      montoCosto: 0,
      base: 'IMPORTE_FIJO',
      cantidad: 1
    }]);
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    if (['montoVenta', 'montoCosto', 'cantidad'].includes(field)) {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.descripcionPedido && !selectedCliente) {
      toast.error('Ingresa una descripción o selecciona un cliente');
      return;
    }

    try {
      const payload = {
        ...formData,
        clienteId: selectedCliente?.id || null,
        items: items.filter(i => i.concepto)
      };

      if (isEditing) {
        await updatePresupuesto.mutateAsync(payload);
        toast.success('Presupuesto actualizado');
      } else {
        const result = await createPresupuesto.mutateAsync(payload);
        toast.success('Presupuesto creado');
        navigate(`/presupuestos/${result.data.presupuesto.id}`);
        return;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleCambiarEstado = async (nuevoEstado) => {
    try {
      await cambiarEstado.mutateAsync({ id, estado: nuevoEstado });
      toast.success(`Presupuesto ${ESTADOS[nuevoEstado].label.toLowerCase()}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const handleConvertir = async () => {
    if (!confirm('¿Convertir este presupuesto en una carpeta de operación?')) return;
    try {
      const result = await convertir.mutateAsync(id);
      toast.success('Convertido a carpeta exitosamente');
      navigate(`/carpetas/${result.data.carpeta.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al convertir');
    }
  };

  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    try {
      await agregarMensaje.mutateAsync({
        presupuestoId: id,
        mensaje: nuevoMensaje
      });
      setNuevoMensaje('');
      refetchMensajes();
    } catch (error) {
      toast.error('Error al enviar mensaje');
    }
  };

  // Calcular totales
  const totalVenta = items.reduce((sum, i) => sum + (i.montoVenta || 0) * (i.cantidad || 1), 0);
  const totalCosto = items.reduce((sum, i) => sum + (i.montoCosto || 0) * (i.cantidad || 1), 0);
  const margen = totalVenta - totalCosto;

  if (isLoading && isEditing) {
    return (
      <Layout title="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  const tabs = [
    { id: 'datos', label: 'Datos', icon: Building2 },
    { id: 'items', label: 'Cotización', icon: Plus },
    ...(isEditing ? [{ id: 'chat', label: 'Conversación', icon: MessageSquare, badge: mensajes.length }] : [])
  ];

  return (
    <Layout 
      title={isEditing ? `Presupuesto ${presupuesto?.numero || ''}` : 'Nuevo Presupuesto'}
      subtitle={isEditing ? 'Editar presupuesto' : 'Crear nueva cotización'}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/presupuestos')}>
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
          {presupuesto && (
            <Badge className={ESTADOS[presupuesto.estado]?.color}>
              {ESTADOS[presupuesto.estado]?.label}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing && presupuesto?.estado === 'EN_PROCESO' && (
            <Button variant="secondary" onClick={() => handleCambiarEstado('ENVIADO')}>
              <Send className="w-4 h-4" />
              Enviar al cliente
            </Button>
          )}
          {isEditing && presupuesto?.estado === 'APROBADO' && !presupuesto?.carpetaId && (
            <Button variant="secondary" onClick={handleConvertir}>
              <FolderOpen className="w-4 h-4" />
              Convertir a Carpeta
            </Button>
          )}
          <Button onClick={handleSubmit} loading={createPresupuesto.isPending || updatePresupuesto.isPending}>
            <Save className="w-4 h-4" />
            {isEditing ? 'Guardar' : 'Crear'}
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
            {tab.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Datos */}
      {activeTab === 'datos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Cliente/Solicitante */}
            <Card>
              <CardHeader>
                <CardTitle>Cliente / Solicitante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Buscador de cliente */}
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Vincular con cliente existente
                  </label>
                  {selectedCliente ? (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div>
                        <p className="font-medium">{selectedCliente.razonSocial}</p>
                        <p className="text-sm text-slate-500">{selectedCliente.numeroDocumento}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCliente(null)}>
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={clienteSearch}
                        onChange={(e) => {
                          setClienteSearch(e.target.value);
                          setShowClienteDropdown(true);
                        }}
                        onFocus={() => setShowClienteDropdown(true)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500"
                      />
                      {showClienteDropdown && clientes.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-10 max-h-48 overflow-y-auto">
                          {clientes.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => selectCliente(c)}
                              className="w-full px-4 py-2 text-left hover:bg-slate-50"
                            >
                              <p className="font-medium">{c.razonSocial}</p>
                              <p className="text-sm text-slate-500">{c.email}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nombre del solicitante"
                    value={formData.solicitanteNombre}
                    onChange={(e) => handleChange('solicitanteNombre', e.target.value)}
                    placeholder="Nombre completo"
                  />
                  <Input
                    label="Empresa"
                    value={formData.solicitanteEmpresa}
                    onChange={(e) => handleChange('solicitanteEmpresa', e.target.value)}
                    placeholder="Nombre de la empresa"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={formData.solicitanteEmail}
                    onChange={(e) => handleChange('solicitanteEmail', e.target.value)}
                    placeholder="email@ejemplo.com"
                  />
                  <Input
                    label="Teléfono"
                    value={formData.solicitanteTelefono}
                    onChange={(e) => handleChange('solicitanteTelefono', e.target.value)}
                    placeholder="+54 11 1234-5678"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Descripción del pedido */}
            <Card>
              <CardHeader>
                <CardTitle>Descripción del Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.descripcionPedido}
                  onChange={(e) => handleChange('descripcionPedido', e.target.value)}
                  placeholder="Describe qué necesita el cliente: tipo de carga, cantidad, origen, destino, fechas estimadas..."
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
                />
              </CardContent>
            </Card>

            {/* Detalles de la operación */}
            <Card>
              <CardHeader>
                <CardTitle>Detalles de la Operación</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Área</label>
                  <select
                    value={formData.area}
                    onChange={(e) => handleChange('area', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Sector</label>
                  <select
                    value={formData.sector}
                    onChange={(e) => handleChange('sector', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo Operación</label>
                  <select
                    value={formData.tipoOperacion}
                    onChange={(e) => handleChange('tipoOperacion', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">Seleccionar</option>
                    {TIPOS_OPERACION.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <Input
                  label="Puerto Origen"
                  value={formData.puertoOrigen}
                  onChange={(e) => handleChange('puertoOrigen', e.target.value)}
                  placeholder="CNSHA - Shanghai"
                />
                <Input
                  label="Puerto Destino"
                  value={formData.puertoDestino}
                  onChange={(e) => handleChange('puertoDestino', e.target.value)}
                  placeholder="ARBUE - Buenos Aires"
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Incoterm</label>
                  <select
                    value={formData.incoterm}
                    onChange={(e) => handleChange('incoterm', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">Seleccionar</option>
                    {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Validez</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Válido hasta"
                  type="date"
                  value={formData.fechaValidez}
                  onChange={(e) => handleChange('fechaValidez', e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Moneda</label>
                  <select
                    value={formData.moneda}
                    onChange={(e) => handleChange('moneda', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="USD">USD - Dólar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="ARS">ARS - Peso</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notas internas</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.notasInternas}
                  onChange={(e) => handleChange('notasInternas', e.target.value)}
                  placeholder="Notas visibles solo para tu equipo..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 outline-none resize-none text-sm"
                />
              </CardContent>
            </Card>

            {/* Resumen */}
            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Resumen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Items:</span>
                    <span className="font-medium">{items.filter(i => i.concepto).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Venta:</span>
                    <span className="font-medium text-green-600">{formData.moneda} {totalVenta.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Costo:</span>
                    <span className="font-medium text-red-600">{formData.moneda} {totalCosto.toFixed(2)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between">
                    <span className="text-slate-600">Margen:</span>
                    <span className={cn('font-bold', margen >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {formData.moneda} {margen.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Tab: Items/Cotización */}
      {activeTab === 'items' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items de la Cotización</CardTitle>
            <Button type="button" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4" />
              Agregar Item
            </Button>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-12">
                <Plus className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 mb-4">No hay items en la cotización</p>
                <Button onClick={addItem}>Agregar primer item</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b bg-slate-50">
                      <th className="py-3 px-2 text-left font-medium">Concepto</th>
                      <th className="py-3 px-2 text-center font-medium w-16">P/C</th>
                      <th className="py-3 px-2 text-center font-medium w-20">Divisa</th>
                      <th className="py-3 px-2 text-right font-medium w-24">Venta</th>
                      <th className="py-3 px-2 text-right font-medium w-24">Costo</th>
                      <th className="py-3 px-2 text-center font-medium w-32">Base</th>
                      <th className="py-3 px-2 text-right font-medium w-20">Cant</th>
                      <th className="py-3 px-2 text-right font-medium w-24">Total</th>
                      <th className="py-3 px-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.concepto || ''}
                            onChange={(e) => updateItem(index, 'concepto', e.target.value)}
                            placeholder="FLETE MARITIMO"
                            className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={item.prepaidCollect || 'P'}
                            onChange={(e) => updateItem(index, 'prepaidCollect', e.target.value)}
                            className="w-full px-1 py-1.5 text-sm rounded border border-slate-300 bg-white text-center"
                          >
                            <option value="P">P</option>
                            <option value="C">C</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={item.divisa || 'USD'}
                            onChange={(e) => updateItem(index, 'divisa', e.target.value)}
                            className="w-full px-1 py-1.5 text-sm rounded border border-slate-300 bg-white"
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="ARS">ARS</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.montoVenta || ''}
                            onChange={(e) => updateItem(index, 'montoVenta', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.montoCosto || ''}
                            onChange={(e) => updateItem(index, 'montoCosto', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={item.base || 'IMPORTE_FIJO'}
                            onChange={(e) => updateItem(index, 'base', e.target.value)}
                            className="w-full px-1 py-1.5 text-sm rounded border border-slate-300 bg-white"
                          >
                            {BASES_ITEM.map(b => (
                              <option key={b.value} value={b.value}>{b.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={item.cantidad || 1}
                            onChange={(e) => updateItem(index, 'cantidad', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 text-right"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span className="text-sm font-medium text-green-600">
                            {((item.montoVenta || 0) * (item.cantidad || 1)).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totales */}
                <div className="mt-6 pt-4 border-t flex justify-end gap-8">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total Venta</p>
                    <p className="text-lg font-bold text-green-600">{formData.moneda} {totalVenta.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total Costo</p>
                    <p className="text-lg font-bold text-red-600">{formData.moneda} {totalCosto.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Margen</p>
                    <p className={cn('text-lg font-bold', margen >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {formData.moneda} {margen.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Chat */}
      {activeTab === 'chat' && isEditing && (
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversación con el cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {mensajes.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>No hay mensajes aún</p>
                <p className="text-sm">Inicia la conversación enviando un mensaje</p>
              </div>
            ) : (
              mensajes.map((msg) => {
                const isOwn = msg.tipoRemitente === 'TENANT';
                const isSystem = msg.tipoRemitente === 'SISTEMA';
                
                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center">
                      <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                        {msg.mensaje}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(msg.createdAt)}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                  >
                    <div className={cn(
                      'max-w-[70%] rounded-2xl px-4 py-2',
                      isOwn
                        ? 'bg-primary-500 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    )}>
                      <p className={cn('text-xs mb-1 font-medium', isOwn ? 'text-primary-100' : 'text-slate-500')}>
                        {msg.nombreRemitente}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                      <p className={cn('text-xs mt-1', isOwn ? 'text-primary-200' : 'text-slate-400')}>
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </CardContent>
          
          {/* Input de mensaje */}
          <div className="p-4 border-t">
            <form onSubmit={handleEnviarMensaje} className="flex gap-2">
              <input
                type="text"
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-4 py-2 rounded-full border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              />
              <Button type="submit" disabled={!nuevoMensaje.trim() || agregarMensaje.isPending}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </Layout>
  );
}

export default PresupuestoForm;
