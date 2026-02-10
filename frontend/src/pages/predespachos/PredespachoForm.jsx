import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Send, Download, FileCheck, MessageSquare,
  Plus, Trash2, DollarSign, Building2, Ship, Package, Receipt,
  X, Minimize2, Maximize2
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { 
  usePredespacho, useCreatePredespacho, useUpdatePredespacho,
  useCambiarEstadoPredespacho, useBuscarClientes, 
  useMensajesPredespacho, useAgregarMensajePredespacho
} from '../../hooks/useApi';
import { 
  DESTINACIONES, VIAS, ADUANAS, CONDICIONES_VENTA, 
  TIPOS_DOCUMENTO_PD, PREDESPACHO_ESTADOS
} from '../../lib/constants';
import { formatDate, cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import api from '../../api/axios';

// Valores default
const DERECHOS_DEFAULT = [
  { concepto: 'DERECHOS', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'TASA DE ESTADISTICA', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'DERECHO ADICIONAL', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'OTRO', alicuota: 0, importeUsd: 0, importeArs: 0 }
];

const IMPUESTOS_DEFAULT = [
  { concepto: 'I.V.A.', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'IVA ADICIONAL INSCR.', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'IMP. A LAS GANANCIAS', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'IIBB', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'ARANCEL SIM IMPO', alicuota: 0, importeUsd: 0, importeArs: 0 },
  { concepto: 'SERV GUARDA/DIGITALI', alicuota: 0, importeUsd: 0, importeArs: 0 }
];

const GASTOS_DEFAULT = [
  { concepto: 'GASTOS', importeUsd: 0, importeArs: 0, grupo: 'AGENTE_CARGA' },
  { concepto: 'FLETE', importeUsd: 0, importeArs: 0, grupo: 'AGENTE_CARGA' },
  { concepto: 'SEGURO INTERNACIONAL', importeUsd: 0, importeArs: 0, grupo: 'AGENTE_CARGA' },
  { concepto: 'DEPOSITO FISCAL / TERMINAL', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'GASTOS DE ADUANA', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'TAP / IVETRA', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'SENASA NIMF15 GESTION Y ARANCEL', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'ACARREO DE DEPOSITO FISCAL A DEPOSITO CLIENTE', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'LEVANTAMIENTO REZAGO', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'GESTION TERCEROS ORGANISMOS', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'GASTOS OPERATIVOS & VIATICOS', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'HONORARIOS', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'SEDI', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'SERV GUARDA/DIGITALI', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' },
  { concepto: 'OTRO ANULACION SIMI-SEDI', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' }
];

const INITIAL_STATE = {
  tipoDocumento: 'PEDIDO_DE_FONDOS',
  monedaPrincipal: 'USD',
  nuestraReferencia: '',
  vuestraReferencia: '',
  fecha: new Date().toISOString().split('T')[0],
  validoHasta: '',
  clienteId: null,
  clienteCuit: '',
  mercaderia: '',
  destinacion: '',
  etaEtd: '',
  facturasProforma: '',
  blGuia: '',
  aduana: '',
  via: 'MARITIMO',
  despachante: '',
  origenDestino: '',
  condicionVenta: '',
  clienteVendedorExterior: '',
  agenteCarga: '',
  simiSali: '',
  pesoNeto: '',
  pesoBruto: '',
  volumenM3: '',
  posicionArancelaria: '',
  fobDivisas: '',
  fobUsd: '',
  fleteDivisas: '',
  fleteUsd: '',
  seguroDivisas: '',
  seguroUsd: '',
  ajusteIncluir: 0,
  ajusteDeducir: 0,
  paseUsdFlete: '',
  paseUsdSeguro: '',
  tipoCambioSim: '',
  tipoCambioGastos: '',
  valorAduana: 0,
  baseImponible: 0,
  derechos: DERECHOS_DEFAULT,
  impuestos: IMPUESTOS_DEFAULT,
  gastos: GASTOS_DEFAULT,
  totalDerechosUsd: 0,
  totalDerechosArs: 0,
  totalImpuestosUsd: 0,
  totalImpuestosArs: 0,
  totalGastosUsd: 0,
  totalGastosArs: 0,
  totalTransferirForwarderUsd: 0,
  totalTransferirForwarderArs: 0,
  totalTransferirDepositoUsd: 0,
  totalTransferirDepositoArs: 0,
  totalTransferirDespachanteUsd: 0,
  totalTransferirDespachanteArs: 0,
  totalGravamenesVepUsd: 0,
  totalGravamenesVepArs: 0,
  observaciones: '',
  notasInternas: '',
  bancoPdfId: ''
};

// Componente Select reutilizable
const Select = ({ label, value, onChange, options, placeholder = 'Seleccionar...', className = '' }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
      ))}
    </select>
  </div>
);

function PredespachoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !id;
  const isClient = user?.role === 'client';

  const queryClient = useQueryClient();
  const { data: predespachoData, isLoading } = usePredespacho(id);
  const createMutation = useCreatePredespacho();
  const updateMutation = useUpdatePredespacho(id);
  const cambiarEstado = useCambiarEstadoPredespacho();

  const [formData, setFormData] = useState(INITIAL_STATE);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const autoSaveTimer = useRef(null);

  const { data: clientesData } = useBuscarClientes(clienteSearch, 'cliente');
  const clientesResultados = clientesData?.data?.clientes || clientesData || [];

  const { data: mensajesData } = useMensajesPredespacho(id);
  const agregarMensaje = useAgregarMensajePredespacho();
  const mensajes = mensajesData?.data?.mensajes || [];

  // Al abrir, refrescar notificaciones inmediatamente (el backend ya marcó como visto)
  useEffect(() => {
    if (id && predespachoData?.data?.predespacho) {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    }
  }, [id, predespachoData]);

  // Cargar datos existentes
  useEffect(() => {
    if (predespachoData?.data?.predespacho) {
      const pd = predespachoData.data.predespacho;
      setFormData({
        ...INITIAL_STATE,
        ...pd,
        fecha: pd.fecha ? new Date(pd.fecha).toISOString().split('T')[0] : '',
        validoHasta: pd.validoHasta ? new Date(pd.validoHasta).toISOString().split('T')[0] : '',
        derechos: pd.derechos || DERECHOS_DEFAULT,
        impuestos: pd.impuestos || IMPUESTOS_DEFAULT,
        gastos: pd.gastos || GASTOS_DEFAULT
      });
      if (pd.cliente) {
        setSelectedCliente(pd.cliente);
        setClienteSearch(pd.cliente.razonSocial);
      }
    }
  }, [predespachoData]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Recalcular totales
  useEffect(() => {
    const fob = parseFloat(formData.fobUsd) || 0;
    const flete = parseFloat(formData.fleteUsd) || 0;
    const seguro = parseFloat(formData.seguroUsd) || 0;
    const ajusteInc = parseFloat(formData.ajusteIncluir) || 0;
    const ajusteDed = parseFloat(formData.ajusteDeducir) || 0;
    const valorAduana = fob + flete + seguro + ajusteInc - ajusteDed;
    
    const tcSim = parseFloat(formData.tipoCambioSim) || 1;
    const baseImponible = valorAduana * (tcSim > 1 ? 1.19 : 1); // Ajuste base imponible estándar

    const totalDerechosUsd = (formData.derechos || []).reduce((s, d) => s + (parseFloat(d.importeUsd) || 0), 0);
    const totalDerechosArs = (formData.derechos || []).reduce((s, d) => s + (parseFloat(d.importeArs) || 0), 0);
    const totalImpuestosUsd = (formData.impuestos || []).reduce((s, i) => s + (parseFloat(i.importeUsd) || 0), 0);
    const totalImpuestosArs = (formData.impuestos || []).reduce((s, i) => s + (parseFloat(i.importeArs) || 0), 0);
    const totalGastosUsd = (formData.gastos || []).reduce((s, g) => s + (parseFloat(g.importeUsd) || 0), 0);
    const totalGastosArs = (formData.gastos || []).reduce((s, g) => s + (parseFloat(g.importeArs) || 0), 0);

    const gastosAgente = (formData.gastos || []).filter(g => g.grupo === 'AGENTE_CARGA');
    const totalForwarderUsd = gastosAgente.reduce((s, g) => s + (parseFloat(g.importeUsd) || 0), 0);
    const totalForwarderArs = gastosAgente.reduce((s, g) => s + (parseFloat(g.importeArs) || 0), 0);

    const totalGravamenesUsd = totalDerechosUsd + totalImpuestosUsd;
    const totalGravamenesArs = totalDerechosArs + totalImpuestosArs;

    const gastosOperativos = (formData.gastos || []).filter(g => g.grupo === 'OPERATIVO');
    const totalOperativosUsd = gastosOperativos.reduce((s, g) => s + (parseFloat(g.importeUsd) || 0), 0);
    const totalOperativosArs = gastosOperativos.reduce((s, g) => s + (parseFloat(g.importeArs) || 0), 0);

    setFormData(prev => ({
      ...prev,
      valorAduana,
      baseImponible,
      totalDerechosUsd, totalDerechosArs,
      totalImpuestosUsd, totalImpuestosArs,
      totalGastosUsd, totalGastosArs,
      totalTransferirForwarderUsd: totalForwarderUsd,
      totalTransferirForwarderArs: totalForwarderArs,
      totalTransferirDepositoUsd: 0,
      totalTransferirDepositoArs: 0,
      totalTransferirDespachanteUsd: totalOperativosUsd,
      totalTransferirDespachanteArs: totalOperativosArs,
      totalGravamenesVepUsd: totalGravamenesUsd,
      totalGravamenesVepArs: totalGravamenesArs
    }));
  }, [
    formData.fobUsd, formData.fleteUsd, formData.seguroUsd,
    formData.ajusteIncluir, formData.ajusteDeducir, formData.tipoCambioSim,
    formData.derechos, formData.impuestos, formData.gastos
  ]);

  // Auto-guardar
  useEffect(() => {
    if (!id || isClient) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave(true);
    }, 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [formData]);

  const handleSave = async (silent = false) => {
    if (saving) return;
    setSaving(true);
    try {
      const dataToSend = { ...formData };
      delete dataToSend.cliente;
      delete dataToSend.mensajes;
      delete dataToSend._count;

      if (isNew) {
        const result = await createMutation.mutateAsync(dataToSend);
        if (!silent) toast.success('Predespacho creado');
        navigate(`/predespachos/${result.data.predespacho.id}`, { replace: true });
      } else {
        await updateMutation.mutateAsync(dataToSend);
        if (!silent) toast.success('Guardado');
      }
    } catch (error) {
      if (!silent) toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarCliente = async () => {
    if (!confirm('¿Enviar este predespacho al cliente?')) return;
    try {
      await handleSave(true);
      await cambiarEstado.mutateAsync({ id, estado: 'ENVIADO' });
      toast.success('Predespacho enviado al cliente');
    } catch (error) {
      toast.error('Error al enviar');
    }
  };

  const handleDescargarPdf = async () => {
    try {
      await handleSave(true);
      const response = await api.get(`/predespachos/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Predespacho-${formData.numero || 'nuevo'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Error al generar PDF');
    }
  };

  const handleEnviarMensaje = async () => {
    if (!nuevoMensaje.trim()) return;
    try {
      await agregarMensaje.mutateAsync({ predespachoId: id, mensaje: nuevoMensaje });
      setNuevoMensaje('');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      toast.error('Error al enviar mensaje');
    }
  };

  // Scroll al final del chat cuando se abren o llegan mensajes
  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatOpen, mensajes]);

  // Helpers para arrays (derechos, impuestos, gastos)
  const updateArrayItem = (arrayName, index, field, value) => {
    setFormData(prev => {
      const arr = [...(prev[arrayName] || [])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [arrayName]: arr };
    });
  };

  const addArrayItem = (arrayName, item) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: [...(prev[arrayName] || []), item]
    }));
  };

  const removeArrayItem = (arrayName, index) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: (prev[arrayName] || []).filter((_, i) => i !== index)
    }));
  };

  const handleSelectCliente = (cliente) => {
    setSelectedCliente(cliente);
    // No mostrar CUIT si es un temporal generado por el sistema
    const cuit = cliente.numeroDocumento?.startsWith('TEMP-') ? '' : (cliente.numeroDocumento || '');
    setFormData(prev => ({
      ...prev,
      clienteId: cliente.id,
      clienteCuit: cuit
    }));
    setClienteSearch('');
    setShowClienteDropdown(false);
  };

  if (isLoading && !isNew) {
    return (
      <Layout title="Predespacho">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  const estado = PREDESPACHO_ESTADOS[formData.estado] || PREDESPACHO_ESTADOS.BORRADOR;
  const readOnly = isClient && formData.estado !== 'BORRADOR';

  return (
    <Layout 
      title={isNew ? 'Nuevo Predespacho' : `Predespacho ${formData.numero || ''}`}
      subtitle={isNew ? 'Crear un nuevo pedido de fondos / presupuesto' : estado.label}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header actions */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/predespachos')}>
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>
          <div className="flex items-center gap-2">
            {!isClient && id && (
              <>
                <Button variant="outline" onClick={handleDescargarPdf}>
                  <Download className="w-4 h-4" /> PDF
                </Button>
                {formData.estado === 'BORRADOR' && (
                  <Button variant="secondary" onClick={handleEnviarCliente}>
                    <Send className="w-4 h-4" /> Enviar al Cliente
                  </Button>
                )}
              </>
            )}
            {!isClient && (
              <Button onClick={() => handleSave(false)} loading={saving}>
                <Save className="w-4 h-4" /> Guardar
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">

          {/* ==================== DATOS GENERALES ==================== */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" /> Datos Generales
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select label="Tipo de Documento" value={formData.tipoDocumento}
                onChange={(v) => handleChange('tipoDocumento', v)} options={TIPOS_DOCUMENTO_PD} />
              <Select label="Moneda Principal" value={formData.monedaPrincipal}
                onChange={(v) => handleChange('monedaPrincipal', v)}
                options={[
                  { value: 'USD', label: 'USD - Dólar Estadounidense' },
                  { value: 'EUR', label: 'EUR - Euro' },
                  { value: 'ARS', label: 'ARS - Peso Argentino' },
                  { value: 'CNY', label: 'CNY - Yuan Chino' },
                  { value: 'BRL', label: 'BRL - Real Brasileño' },
                  { value: 'GBP', label: 'GBP - Libra Esterlina' },
                  { value: 'JPY', label: 'JPY - Yen Japonés' },
                  { value: 'KRW', label: 'KRW - Won Coreano' },
                  { value: 'INR', label: 'INR - Rupia India' },
                  { value: 'TWD', label: 'TWD - Dólar Taiwanés' },
                  { value: 'CHF', label: 'CHF - Franco Suizo' },
                  { value: 'CLP', label: 'CLP - Peso Chileno' },
                  { value: 'UYU', label: 'UYU - Peso Uruguayo' },
                  { value: 'PYG', label: 'PYG - Guaraní Paraguayo' },
                  { value: 'MXN', label: 'MXN - Peso Mexicano' },
                  { value: 'COP', label: 'COP - Peso Colombiano' }
                ]} />
              <Select label="Vía" value={formData.via}
                onChange={(v) => handleChange('via', v)} options={VIAS} />
              <Input label="Nuestra Referencia" value={formData.nuestraReferencia}
                onChange={(e) => handleChange('nuestraReferencia', e.target.value)} />
              <Input label="Vuestra Referencia" value={formData.vuestraReferencia}
                onChange={(e) => handleChange('vuestraReferencia', e.target.value)} />
              <div></div>
              <Input label="Fecha" type="date" value={formData.fecha}
                onChange={(e) => handleChange('fecha', e.target.value)} />
              <Input label="Válido Hasta" type="date" value={formData.validoHasta}
                onChange={(e) => handleChange('validoHasta', e.target.value)} />
            </CardContent>
          </Card>

          {/* ==================== CLIENTE ==================== */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" /> Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selector de cliente */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Cliente</label>
                {selectedCliente ? (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <p className="font-medium text-slate-800">{selectedCliente.razonSocial}</p>
                      <p className="text-sm text-slate-500">
                        {selectedCliente.numeroDocumento && !selectedCliente.numeroDocumento.startsWith('TEMP-') ? selectedCliente.numeroDocumento : ''}
                        {selectedCliente.email ? `${selectedCliente.numeroDocumento && !selectedCliente.numeroDocumento.startsWith('TEMP-') ? ' • ' : ''}${selectedCliente.email}` : ''}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedCliente(null); handleChange('clienteId', null); }}>
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar cliente por nombre o CUIT..."
                      value={clienteSearch}
                      onChange={(e) => { setClienteSearch(e.target.value); setShowClienteDropdown(true); }}
                      onFocus={() => clienteSearch.length >= 2 && setShowClienteDropdown(true)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                    {showClienteDropdown && clientesResultados.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {clientesResultados.map(c => (
                          <button key={c.id} type="button"
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 text-sm"
                            onClick={() => handleSelectCliente(c)}
                          >
                            <p className="font-medium">{c.razonSocial}</p>
                            <p className="text-xs text-slate-500">{c.numeroDocumento} {c.email ? `• ${c.email}` : ''}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="CUIT" value={formData.clienteCuit}
                  onChange={(e) => handleChange('clienteCuit', e.target.value)} />
                <Input label="Cliente / Vendedor Exterior" value={formData.clienteVendedorExterior}
                  onChange={(e) => handleChange('clienteVendedorExterior', e.target.value)} />
                <Input label="Agente de Carga" value={formData.agenteCarga}
                  onChange={(e) => handleChange('agenteCarga', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* ==================== DATOS DE LA OPERACIÓN ==================== */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="w-5 h-5" /> Datos de la Operación
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Mercadería" value={formData.mercaderia}
                onChange={(e) => handleChange('mercaderia', e.target.value)}
                className="md:col-span-2" />
              <Select label="Destinación" value={formData.destinacion}
                onChange={(v) => handleChange('destinacion', v)} options={DESTINACIONES} />
              <Input label="ETA / ETD" value={formData.etaEtd}
                onChange={(e) => handleChange('etaEtd', e.target.value)} />
              <Input label="Facturas Proforma" value={formData.facturasProforma}
                onChange={(e) => handleChange('facturasProforma', e.target.value)} />
              <Select label="Aduana" value={formData.aduana}
                onChange={(v) => handleChange('aduana', v)} options={ADUANAS} />
              <Input label="B/L - Guía" value={formData.blGuia}
                onChange={(e) => handleChange('blGuia', e.target.value)} />
              <Input label="Despachante" value={formData.despachante}
                onChange={(e) => handleChange('despachante', e.target.value)} />
              <Input label="Origen / Destino" value={formData.origenDestino}
                onChange={(e) => handleChange('origenDestino', e.target.value)} />
              <Select label="Condición de Venta" value={formData.condicionVenta}
                onChange={(v) => handleChange('condicionVenta', v)} options={CONDICIONES_VENTA} />
              <Input label="SIMI / Fecha SALI" value={formData.simiSali}
                onChange={(e) => handleChange('simiSali', e.target.value)} />
              <Input label="Posición Arancelaria (NCM)" value={formData.posicionArancelaria}
                onChange={(e) => handleChange('posicionArancelaria', e.target.value)} />
            </CardContent>
          </Card>

          {/* ==================== PESOS Y MEDIDAS ==================== */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" /> Pesos y Medidas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Peso Neto (kg)" type="number" step="0.01" value={formData.pesoNeto}
                onChange={(e) => handleChange('pesoNeto', e.target.value)} />
              <Input label="Peso Bruto (kg)" type="number" step="0.01" value={formData.pesoBruto}
                onChange={(e) => handleChange('pesoBruto', e.target.value)} />
              <Input label="Volumen (m³)" type="number" step="0.01" value={formData.volumenM3}
                onChange={(e) => handleChange('volumenM3', e.target.value)} />
            </CardContent>
          </Card>

          {/* ==================== VALORES BASE ==================== */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Valores Base
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Input label="FOB (Divisas)" type="number" step="0.01" value={formData.fobDivisas}
                  onChange={(e) => handleChange('fobDivisas', e.target.value)} />
                <Input label="FOB (U$S)" type="number" step="0.01" value={formData.fobUsd}
                  onChange={(e) => handleChange('fobUsd', e.target.value)} />
                <div></div>
                <Input label="Flete (Divisas)" type="number" step="0.01" value={formData.fleteDivisas}
                  onChange={(e) => handleChange('fleteDivisas', e.target.value)} />
                <Input label="Flete (U$S)" type="number" step="0.01" value={formData.fleteUsd}
                  onChange={(e) => handleChange('fleteUsd', e.target.value)} />
                <Input label="Pase a U$S (Flete)" type="number" step="0.000001" value={formData.paseUsdFlete}
                  onChange={(e) => handleChange('paseUsdFlete', e.target.value)} />
                <Input label="Seguro (Divisas)" type="number" step="0.01" value={formData.seguroDivisas}
                  onChange={(e) => handleChange('seguroDivisas', e.target.value)} />
                <Input label="Seguro (U$S)" type="number" step="0.01" value={formData.seguroUsd}
                  onChange={(e) => handleChange('seguroUsd', e.target.value)} />
                <Input label="Pase a U$S (Seguro)" type="number" step="0.000001" value={formData.paseUsdSeguro}
                  onChange={(e) => handleChange('paseUsdSeguro', e.target.value)} />
                <Input label="Ajuste a incluir" type="number" step="0.01" value={formData.ajusteIncluir}
                  onChange={(e) => handleChange('ajusteIncluir', e.target.value)} />
                <Input label="Ajuste a deducir" type="number" step="0.01" value={formData.ajusteDeducir}
                  onChange={(e) => handleChange('ajusteDeducir', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
                <Input label="TC SIM (Mayorista BCRA)" type="number" step="0.01" value={formData.tipoCambioSim}
                  onChange={(e) => handleChange('tipoCambioSim', e.target.value)} />
                <Input label="TC Gastos (Mercado)" type="number" step="0.01" value={formData.tipoCambioGastos}
                  onChange={(e) => handleChange('tipoCambioGastos', e.target.value)} />
                <div className="flex flex-col justify-end">
                  <label className="text-sm font-medium text-slate-700 mb-1.5">Valor en Aduana U$S</label>
                  <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-medium">
                    {(formData.valorAduana || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <label className="text-sm font-medium text-slate-700 mb-1.5">Base Imponible</label>
                  <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-medium">
                    {(formData.baseImponible || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ==================== DERECHOS ==================== */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" /> Derechos
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => addArrayItem('derechos', { concepto: '', alicuota: 0, importeUsd: 0, importeArs: 0 })}>
                <Plus className="w-4 h-4" /> Agregar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                  <div className="col-span-4">Concepto</div>
                  <div className="col-span-2">Alícuota</div>
                  <div className="col-span-2">Importe U$S</div>
                  <div className="col-span-3">Importe AR$</div>
                  <div className="col-span-1"></div>
                </div>
                {(formData.derechos || []).map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input className="col-span-4 px-2 py-1.5 rounded border border-slate-300 text-sm" value={item.concepto}
                      onChange={(e) => updateArrayItem('derechos', idx, 'concepto', e.target.value)} />
                    <input className="col-span-2 px-2 py-1.5 rounded border border-slate-300 text-sm text-right" type="number" step="0.001" value={item.alicuota}
                      onChange={(e) => updateArrayItem('derechos', idx, 'alicuota', parseFloat(e.target.value) || 0)} />
                    <input className="col-span-2 px-2 py-1.5 rounded border border-slate-300 text-sm text-right" type="number" step="0.01" value={item.importeUsd}
                      onChange={(e) => updateArrayItem('derechos', idx, 'importeUsd', parseFloat(e.target.value) || 0)} />
                    <input className="col-span-3 px-2 py-1.5 rounded border border-slate-300 text-sm text-right" type="number" step="0.01" value={item.importeArs}
                      onChange={(e) => updateArrayItem('derechos', idx, 'importeArs', parseFloat(e.target.value) || 0)} />
                    <button className="col-span-1 p-1 text-red-400 hover:text-red-600" onClick={() => removeArrayItem('derechos', idx)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-12 gap-2 pt-2 border-t border-slate-200 font-medium text-sm">
                  <div className="col-span-4">Total Derechos</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right">{(formData.totalDerechosUsd || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  <div className="col-span-3 text-right">{(formData.totalDerechosArs || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  <div className="col-span-1"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ==================== IMPUESTOS ==================== */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" /> Impuestos
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => addArrayItem('impuestos', { concepto: '', alicuota: 0, importeUsd: 0, importeArs: 0 })}>
                <Plus className="w-4 h-4" /> Agregar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                  <div className="col-span-4">Concepto</div>
                  <div className="col-span-2">Alícuota</div>
                  <div className="col-span-2">Importe U$S</div>
                  <div className="col-span-3">Importe AR$</div>
                  <div className="col-span-1"></div>
                </div>
                {(formData.impuestos || []).map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input className="col-span-4 px-2 py-1.5 rounded border border-slate-300 text-sm" value={item.concepto}
                      onChange={(e) => updateArrayItem('impuestos', idx, 'concepto', e.target.value)} />
                    <input className="col-span-2 px-2 py-1.5 rounded border border-slate-300 text-sm text-right" type="number" step="0.001" value={item.alicuota}
                      onChange={(e) => updateArrayItem('impuestos', idx, 'alicuota', parseFloat(e.target.value) || 0)} />
                    <input className="col-span-2 px-2 py-1.5 rounded border border-slate-300 text-sm text-right" type="number" step="0.01" value={item.importeUsd}
                      onChange={(e) => updateArrayItem('impuestos', idx, 'importeUsd', parseFloat(e.target.value) || 0)} />
                    <input className="col-span-3 px-2 py-1.5 rounded border border-slate-300 text-sm text-right" type="number" step="0.01" value={item.importeArs}
                      onChange={(e) => updateArrayItem('impuestos', idx, 'importeArs', parseFloat(e.target.value) || 0)} />
                    <button className="col-span-1 p-1 text-red-400 hover:text-red-600" onClick={() => removeArrayItem('impuestos', idx)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-12 gap-2 pt-2 border-t border-slate-200 font-medium text-sm">
                  <div className="col-span-4">Total Impuestos</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right">{(formData.totalImpuestosUsd || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  <div className="col-span-3 text-right">{(formData.totalImpuestosArs || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  <div className="col-span-1"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ==================== GASTOS ==================== */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Gastos
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => addArrayItem('gastos', { concepto: '', importeUsd: 0, importeArs: 0, grupo: 'OPERATIVO' })}>
                <Plus className="w-4 h-4" /> Agregar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Agente de carga */}
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2 mb-1">Agente de Carga</p>
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                  <div className="col-span-5">Concepto</div>
                  <div className="col-span-3">Importe U$S</div>
                  <div className="col-span-3">Importe AR$</div>
                  <div className="col-span-1"></div>
                </div>
                {(formData.gastos || []).filter(g => g.grupo === 'AGENTE_CARGA').map((item, idx) => {
                  const realIdx = (formData.gastos || []).indexOf(item);
                  return (
                    <div key={realIdx} className="grid grid-cols-12 gap-2 items-center">
                      <input className="col-span-5 px-2 py-1.5 rounded border border-slate-300 text-sm" value={item.concepto}
                        onChange={(e) => updateArrayItem('gastos', realIdx, 'concepto', e.target.value)} />
                      <input className="col-span-3 px-2 py-1.5 rounded border border-slate-300 text-sm text-right" type="number" step="0.01" value={item.importeUsd}
                        onChange={(e) => updateArrayItem('gastos', realIdx, 'importeUsd', parseFloat(e.target.value) || 0)} />
                      <input className="col-span-3 px-2 py-1.5 rounded border border-slate-300 text-sm text-right" type="number" step="0.01" value={item.importeArs}
                        onChange={(e) => updateArrayItem('gastos', realIdx, 'importeArs', parseFloat(e.target.value) || 0)} />
                      <button className="col-span-1 p-1 text-red-400 hover:text-red-600" onClick={() => removeArrayItem('gastos', realIdx)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Operativos */}
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-1">Gastos Operativos / Administrativos</p>
                {(formData.gastos || []).filter(g => g.grupo === 'OPERATIVO').map((item, idx) => {
                  const realIdx = (formData.gastos || []).indexOf(item);
                  return (
                    <div key={realIdx} className="grid grid-cols-12 gap-2 items-center">
                      <input className="col-span-5 px-2 py-1.5 rounded border border-slate-300 text-sm" value={item.concepto}
                        onChange={(e) => updateArrayItem('gastos', realIdx, 'concepto', e.target.value)} />
                      <input className="col-span-3 px-2 py-1.5 rounded border border-slate-300 text-sm text-right" type="number" step="0.01" value={item.importeUsd}
                        onChange={(e) => updateArrayItem('gastos', realIdx, 'importeUsd', parseFloat(e.target.value) || 0)} />
                      <input className="col-span-3 px-2 py-1.5 rounded border border-slate-300 text-sm text-right" type="number" step="0.01" value={item.importeArs}
                        onChange={(e) => updateArrayItem('gastos', realIdx, 'importeArs', parseFloat(e.target.value) || 0)} />
                      <button className="col-span-1 p-1 text-red-400 hover:text-red-600" onClick={() => removeArrayItem('gastos', realIdx)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                <div className="grid grid-cols-12 gap-2 pt-2 border-t border-slate-200 font-medium text-sm">
                  <div className="col-span-5">Total Gastos</div>
                  <div className="col-span-3 text-right">{(formData.totalGastosUsd || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  <div className="col-span-3 text-right">{(formData.totalGastosArs || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  <div className="col-span-1"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ==================== RESUMEN TOTALES ==================== */}
          <Card className="border-primary-200 bg-primary-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary-800">
                <DollarSign className="w-5 h-5" /> Resumen de Transferencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Total a transferir a cuenta forwarder', usd: formData.totalTransferirForwarderUsd, ars: formData.totalTransferirForwarderArs },
                  { label: 'Total a transferir a cuenta depósito fiscal', usd: formData.totalTransferirDepositoUsd, ars: formData.totalTransferirDepositoArs },
                  { label: 'Total a transferir a cuenta despachante', usd: formData.totalTransferirDespachanteUsd, ars: formData.totalTransferirDespachanteArs, bold: true },
                  { label: 'Total gravámenes (vía VEP)', usd: formData.totalGravamenesVepUsd, ars: formData.totalGravamenesVepArs, bold: true },
                ].map((row, i) => (
                  <div key={i} className={cn('flex items-center justify-between py-2', row.bold && 'border-t border-primary-200 pt-3')}>
                    <span className={cn('text-sm', row.bold ? 'font-bold text-primary-900' : 'text-slate-700')}>
                      {row.label}
                    </span>
                    <div className="flex gap-8">
                      <span className={cn('text-sm tabular-nums', row.bold ? 'font-bold' : '')}>
                        U$S {(row.usd || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={cn('text-sm tabular-nums', row.bold ? 'font-bold' : '')}>
                        AR$ {(row.ars || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-4 border-t border-primary-200">
                <Input label="Total transf. forwarder U$S" type="number" step="0.01"
                  value={formData.totalTransferirForwarderUsd}
                  onChange={(e) => handleChange('totalTransferirForwarderUsd', parseFloat(e.target.value) || 0)} />
                <Input label="Total transf. depósito fiscal U$S" type="number" step="0.01"
                  value={formData.totalTransferirDepositoUsd}
                  onChange={(e) => handleChange('totalTransferirDepositoUsd', parseFloat(e.target.value) || 0)} />
                <Input label="Total transf. despachante U$S" type="number" step="0.01"
                  value={formData.totalTransferirDespachanteUsd}
                  onChange={(e) => handleChange('totalTransferirDespachanteUsd', parseFloat(e.target.value) || 0)} />
                <Input label="Total transf. despachante AR$" type="number" step="0.01"
                  value={formData.totalTransferirDespachanteArs}
                  onChange={(e) => handleChange('totalTransferirDespachanteArs', parseFloat(e.target.value) || 0)} />
              </div>
            </CardContent>
          </Card>

          {/* ==================== OBSERVACIONES ==================== */}
          <Card>
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Observaciones (visible al cliente)</label>
                <textarea value={formData.observaciones || ''} onChange={(e) => handleChange('observaciones', e.target.value)}
                  rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm resize-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
              </div>
              {!isClient && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas Internas (solo equipo)</label>
                  <textarea value={formData.notasInternas || ''} onChange={(e) => handleChange('notasInternas', e.target.value)}
                    rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm resize-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Espaciado inferior para que el botón flotante no tape el contenido */}
          {id && formData.clienteId && <div className="h-16" />}
        </div>
      </div>

      {/* ==================== CHAT FLOTANTE (solo si hay cliente asignado) ==================== */}
      {id && formData.clienteId && (
        <>
          {/* Panel de chat */}
          {chatOpen && (
            <div className="fixed bottom-20 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
              style={{ 
                backgroundColor: 'var(--color-card, #ffffff)',
                height: '480px',
                maxHeight: 'calc(100vh - 140px)'
              }}
            >
              {/* Header del chat */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200"
                style={{ backgroundColor: 'var(--color-primary, #6366f1)' }}>
                <div className="flex items-center gap-2 text-white">
                  <MessageSquare className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">Conversación</p>
                    <p className="text-xs opacity-80">
                      {formData.numero} • {mensajes.length} mensaje{mensajes.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {mensajes.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm text-slate-400">No hay mensajes aún</p>
                    <p className="text-xs text-slate-300 mt-1">Escribí un mensaje para iniciar la conversación</p>
                  </div>
                ) : (
                  mensajes.map(msg => {
                    const isMine = msg.tipoRemitente === (isClient ? 'CLIENTE' : 'TENANT');
                    const isSystem = msg.tipoRemitente === 'SISTEMA';
                    return (
                      <div key={msg.id} className={cn(
                        'rounded-xl px-3 py-2.5',
                        isSystem
                          ? 'bg-slate-100 mx-auto text-center text-xs max-w-[90%]'
                          : isMine
                          ? 'bg-primary-100 ml-auto max-w-[85%]'
                          : 'bg-slate-100 mr-auto max-w-[85%]'
                      )}>
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <p className="text-xs font-semibold" style={{ color: isMine ? 'var(--color-primary, #6366f1)' : '#64748b' }}>
                            {msg.nombreRemitente}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {msg.tipoRemitente === 'CLIENTE' ? 'Cliente' : msg.tipoRemitente === 'TENANT' ? 'Equipo' : ''}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{msg.mensaje}</p>
                        <p className="text-[10px] text-slate-400 mt-1 text-right">
                          {new Date(msg.createdAt).toLocaleString('es-AR', { 
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input de mensaje */}
              <div className="p-3 border-t border-slate-200" style={{ backgroundColor: 'var(--color-background, #f8fafc)' }}>
                <div className="flex gap-2">
                  <input
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleEnviarMensaje();
                      }
                    }}
                    placeholder="Escribir un mensaje..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    style={{ backgroundColor: 'var(--color-card, #ffffff)' }}
                  />
                  <button onClick={handleEnviarMensaje}
                    disabled={agregarMensaje.isPending || !nuevoMensaje.trim()}
                    className="p-2.5 rounded-xl text-white transition-all disabled:opacity-50 hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary, #6366f1)' }}>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Botón flotante */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={cn(
              'fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95',
              chatOpen ? 'bg-slate-600 hover:bg-slate-700' : 'hover:shadow-xl'
            )}
            style={{ backgroundColor: chatOpen ? undefined : 'var(--color-primary, #6366f1)' }}
          >
            {chatOpen ? (
              <Minimize2 className="w-6 h-6 text-white" />
            ) : (
              <div className="relative">
                <MessageSquare className="w-6 h-6 text-white" />
                {mensajes.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {mensajes.length}
                  </span>
                )}
              </div>
            )}
          </button>
        </>
      )}
    </Layout>
  );
}

export default PredespachoForm;
