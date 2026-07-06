import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, Save, Ship, Package, DollarSign, FileText,
  Plus, Trash2, Search, Receipt, MapPin, RefreshCw, MessageSquare, FileDown, Calculator,
  ChevronDown, Plane, Award, FileCheck
} from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input, Badge
} from '../../components/ui';
import TerminalSelector from '../../components/ui/TerminalSelector';
import DocumentoEditorModal from './DocumentoEditorModal';
import { useAuth } from '../../context/AuthContext';
import { 
  useCarpeta, useCreateCarpeta, useUpdateCarpeta, useBuscarClientes,
  useCreatePrefacturaDesdeCarpeta, useTrack, useIntegrations, useCuentasBancarias,
  useDescargarCarpetaPDF
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { AREAS, SECTORES, TIPOS_OPERACION, TIPOS_OPERACION_AEREA, CARPETA_ESTADOS, INCOTERMS, TIPOS_CONTENEDOR } from '../../lib/constants';
import { cn, formatDate } from '../../lib/utils';
// Mismo cálculo que el presupuesto: garantiza que al convertir presupuesto en
// carpeta los totales no cambien y respeten la base elegida (CANT_CONTENEDORES,
// VOLUMEN, KILOS, TONELADA_M3, etc).
import { calcularTotalesItem } from '../../lib/itemCalc';

const carpetaSchema = z.object({
  area: z.enum(['Marítimo', 'Aéreo', 'Terrestre']),
  sector: z.enum(['Importación', 'Exportación']),
  tipoOperacion: z.string().min(1, 'Requerido'),
  tipoOperacionAerea: z.string().optional(),
  estado: z.string().optional(),
  clienteId: z.string().uuid('Seleccione un cliente'),
  puertoOrigen: z.string().optional(),
  puertoDestino: z.string().optional(),
  puertoTransbordo: z.string().optional(),
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
  observaciones: z.string().optional(),
  notify: z.string().optional()
});

const CONSIGNEE_VACIO = {
  empresa: '', direccion: '', localidad: '', zipCode: '', pais: '', telefono: '', email: ''
};

function CarpetaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = !!id;

  const [activeTab, setActiveTab] = useState('general');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  
  // Datos de mercancías, contenedores y gastos (manejados localmente)
  const [mercancias, setMercancias] = useState([]);
  const [contenedores, setContenedores] = useState([]);
  const [gastos, setGastos] = useState([]);
  
  // Datos del consignatario (texto libre)
  const [consigneeData, setConsigneeData] = useState(CONSIGNEE_VACIO);
  
  // Tracking
  const [trackingData, setTrackingData] = useState({});
  const [trackingLoading, setTrackingLoading] = useState({});

  const { data: carpetaData, isLoading: loadingCarpeta } = useCarpeta(id);
  const { data: clientesData } = useBuscarClientes(clienteSearch, 'cliente');
  const { data: integrationsData } = useIntegrations();
  const { data: cuentasBancarias = [] } = useCuentasBancarias();
  const createCarpeta = useCreateCarpeta();
  const updateCarpeta = useUpdateCarpeta(id);
  const crearPrefactura = useCreatePrefacturaDesdeCarpeta();
  const trackMutation = useTrack();

  const clientes = clientesData?.data?.clientes || [];
  const hasActiveIntegrations = (integrationsData?.data || []).some(i => i.status === 'ACTIVE');
  
  // Cuenta bancaria para PDF
  const cuentaPrincipal = cuentasBancarias.find(c => c.esPrincipal) || cuentasBancarias[0];
  const [bancoPdfId, setBancoPdfId] = useState('');
  
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

  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [showPDFMenu, setShowPDFMenu] = useState(false);
  const [documentoEditor, setDocumentoEditor] = useState(null); // 'bl' | 'certFlete' | 'certGastos'
  const descargarPDF = useDescargarCarpetaPDF();

  const carpetaActual = carpetaData?.data?.carpeta;
  const carpetaArea = carpetaActual?.area;
  const carpetaSector = carpetaActual?.sector;
  // Para Exportación el documento es "Aviso de Salida". Para el resto (Importación,
  // Tránsito) usamos "Aviso de Arribo". Comparación case-insensitive y sin acento.
  const esExportacion = (carpetaSector || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'exportacion';
  const avisoLabel = esExportacion ? 'Aviso de Salida' : 'Aviso de Arribo';
  const avisoFilenamePrefix = esExportacion ? 'Aviso_Salida' : 'Aviso_Arribo';
  const houseBL = carpetaActual?.houseBL || carpetaActual?.numero;

  const handleDescargarAvisoArribo = async () => {
    if (!id) return;
    setDownloadingPDF(true);
    try {
      await descargarPDF.mutateAsync({
        carpetaId: id,
        documento: 'aviso-arribo',
        filename: `${avisoFilenamePrefix}_${houseBL}.pdf`
      });
      toast.success('PDF descargado');
    } catch (error) {
      console.error('Error descargando PDF:', error);
      toast.error(error.response?.data?.message || error.message || 'Error al descargar el PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const descargarDocumentoCarpeta = async (documento, prefijo) => {
    if (!id) return;
    try {
      await descargarPDF.mutateAsync({
        carpetaId: id,
        documento,
        filename: `${prefijo}_${houseBL}.pdf`
      });
      toast.success('PDF descargado');
      setShowPDFMenu(false);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      toast.error(error.response?.data?.message || 'Error al descargar el PDF');
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
      tipoOperacion: 'FCL-FCL',
      tipoOperacionAerea: ''
    }
  });

  // Flag para evitar submit antes de que se carguen los datos (evita borrar relaciones por accidente)
  const [dataLoaded, setDataLoaded] = useState(!isEditing);

  // Cargar datos de la carpeta SOLO una vez por id. Si rehidratáramos en cada
  // cambio del objeto `carpetaData` (por ej. al volver del auto-save), pisaríamos
  // el state local y haríamos "desaparecer" filas que el usuario acaba de agregar
  // pero todavía no tienen descripción (la protección anti-pérdida las filtra).
  const hidratedCarpetaIdRef = useRef(null);
  useEffect(() => {
    const c = carpetaData?.data?.carpeta;
    if (c && hidratedCarpetaIdRef.current !== c.id) {
      hidratedCarpetaIdRef.current = c.id;
      setValue('area', c.area);
      setValue('sector', c.sector);
      setValue('tipoOperacion', c.tipoOperacion);
      setValue('tipoOperacionAerea', c.tipoOperacionAerea || '');
      setValue('estado', c.estado || 'ABIERTA');
      setValue('clienteId', c.clienteId);
      setValue('puertoOrigen', c.puertoOrigen || '');
      setValue('puertoDestino', c.puertoDestino || '');
      setValue('puertoTransbordo', c.puertoTransbordo || '');
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
      setValue('notify', c.notify || '');
      
      setConsigneeData({ ...CONSIGNEE_VACIO, ...(c.consigneeData || {}) });
      setSelectedCliente(c.cliente);
      setMercancias(c.mercancias || []);
      setContenedores(c.contenedores || []);
      // Hidratar categoría IVA respetando lo guardado. Si un gasto viejo no la tiene,
      // la derivamos del booleano `gravado` (true → GRAVADO, false → NO_GRAVADO).
      setGastos((c.gastos || []).map(g => ({
        ...g,
        categoriaIVA: g.categoriaIVA || (g.gravado === false ? 'NO_GRAVADO' : 'GRAVADO'),
      })));
      setBancoPdfId(c.bancoPdfId || '');
      setDataLoaded(true);
    }
  }, [carpetaData, setValue]);
  
  // Setear cuenta principal por defecto
  useEffect(() => {
    if (!bancoPdfId && cuentaPrincipal?.id) {
      setBancoPdfId(cuentaPrincipal.id);
    }
  }, [cuentaPrincipal, bancoPdfId]);

  // Sanea cada entidad para evitar mandar campos que el backend no usa (id, timestamps,
  // proveedor populado, etc.) y forzar tipos correctos.
  // Considera "rellena" toda fila con cualquier dato útil (no sólo descripción).
  // Si el usuario empezó cargando bultos pero todavía no la descripción, la fila
  // igual se persiste con un placeholder para que no quede sólo en state local.
  const mercanciaTieneDatos = (m) => !!(
    m && (
      (m.descripcion && m.descripcion.trim()) ||
      m.embalaje || m.marcas || m.hsCode ||
      (m.bultos != null && m.bultos !== '' && Number(m.bultos) > 0) ||
      (m.largo != null && m.largo !== '' && Number(m.largo) > 0) ||
      (m.ancho != null && m.ancho !== '' && Number(m.ancho) > 0) ||
      (m.alto != null && m.alto !== '' && Number(m.alto) > 0) ||
      (m.volumen != null && m.volumen !== '' && Number(m.volumen) > 0) ||
      (m.peso != null && m.peso !== '' && Number(m.peso) > 0) ||
      (m.valorMercaderia != null && m.valorMercaderia !== '') ||
      (m.valorCIF != null && m.valorCIF !== '')
    )
  );

  const sanitizeMercancia = (m) => ({
    descripcion: (m.descripcion && m.descripcion.trim()) || '-',
    embalaje: m.embalaje || null,
    marcas: m.marcas || null,
    bultos: m.bultos != null && m.bultos !== '' ? parseInt(m.bultos) : 0,
    largo: m.largo != null && m.largo !== '' ? Number(m.largo) : null,
    ancho: m.ancho != null && m.ancho !== '' ? Number(m.ancho) : null,
    alto: m.alto != null && m.alto !== '' ? Number(m.alto) : null,
    volumen: m.volumen != null && m.volumen !== '' ? Number(m.volumen) : 0,
    peso: m.peso != null && m.peso !== '' ? Number(m.peso) : 0,
    valorMercaderia: m.valorMercaderia != null && m.valorMercaderia !== '' ? Number(m.valorMercaderia) : null,
    valorCIF: m.valorCIF != null && m.valorCIF !== '' ? Number(m.valorCIF) : null,
    hsCode: m.hsCode || null,
    contenedorId: m.contenedorId || null,
  });

  const sanitizeContenedor = (c) => ({
    tipo: c.tipo,
    numero: c.numero || null,
    condicion: c.condicion || null,
    precinto: c.precinto || null,
    cantidad: c.cantidad != null && c.cantidad !== '' ? parseInt(c.cantidad) : 1,
    tara: c.tara != null && c.tara !== '' ? Number(c.tara) : null,
    pesoMaximo: c.pesoMaximo != null && c.pesoMaximo !== '' ? Number(c.pesoMaximo) : null,
  });

  const sanitizeGasto = (g) => {
    // Determinar categoría IVA con fallback a partir del booleano legacy `gravado`
    // para mantener compatibilidad con gastos viejos guardados antes del selector.
    let categoriaIVA = g.categoriaIVA;
    if (!categoriaIVA) {
      categoriaIVA = g.gravado === false ? 'NO_GRAVADO' : 'GRAVADO';
    }
    const esGravado = categoriaIVA === 'GRAVADO';
    // Recalcular totales con el mismo método que el presupuesto para que la
    // conversión sea idempotente y los valores guardados respeten la base.
    const { totalVenta, totalCosto } = calcularTotalesItem(g, mercancias, contenedores);
    return {
      concepto: g.concepto,
      prepaidCollect: g.prepaidCollect || 'Prepaid',
      divisa: g.divisa || 'USD',
      montoVenta: g.montoVenta != null ? Number(g.montoVenta) : 0,
      montoCosto: g.montoCosto != null ? Number(g.montoCosto) : 0,
      base: g.base || null,
      cantidad: g.cantidad != null && g.cantidad !== '' ? Number(g.cantidad) : 1,
      totalVenta,
      totalCosto,
      categoriaIVA,
      gravado: esGravado,
      porcentajeIVA: esGravado
        ? (g.porcentajeIVA != null ? Number(g.porcentajeIVA) : 21)
        : 0,
      proveedorId: g.proveedorId || null,
      proveedorNombre: g.proveedorNombre || null,
    };
  };

  const onSubmit = async (formData) => {
    // Protección: no guardar si los datos aún no se cargaron (evita borrar relaciones existentes)
    if (isEditing && !dataLoaded) {
      toast.error('Espera a que la carpeta termine de cargar antes de guardar');
      return;
    }
    try {
      const payload = {
        ...formData,
        mercancias: mercancias.filter(mercanciaTieneDatos).map(sanitizeMercancia),
        contenedores: contenedores.filter(c => c && c.tipo).map(sanitizeContenedor),
        gastos: gastos.filter(g => g && g.concepto).map(sanitizeGasto),
        bancoPdfId: bancoPdfId || null,
        consigneeData
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
  const addMercancia = (contenedorIndex = null) => {
    setMercancias([...mercancias, { 
      descripcion: '', embalaje: '', bultos: 0, largo: null, ancho: null, alto: null, peso: 0, volumen: 0, hsCode: '',
      contenedorIndex: contenedorIndex
    }]);
  };

  const updateMercancia = (index, field, value) => {
    const updated = [...mercancias];
    updated[index][field] = value;
    setMercancias(updated);
  };

  const calcularCBM = (index) => {
    const merc = mercancias[index];
    const largo = parseFloat(merc.largo) || 0;
    const ancho = parseFloat(merc.ancho) || 0;
    const alto = parseFloat(merc.alto) || 0;
    const bultos = parseInt(merc.bultos) || 1;
    if (!largo || !ancho || !alto) return;
    // CBM = (L cm × A cm × H cm × bultos) / 1.000.000 → resultado en m³
    const cbmTotal = parseFloat(((largo * ancho * alto * bultos) / 1_000_000).toFixed(4));
    updateMercancia(index, 'volumen', cbmTotal);
  };

  const removeMercancia = (index) => {
    setMercancias(mercancias.filter((_, i) => i !== index));
  };

  // Contenedores handlers
  const addContenedor = () => {
    setContenedores([...contenedores, { 
      tipo: '40DC', numero: '', blContenedor: '', cantidad: 1, precinto: '', tempId: Date.now()
    }]);
  };

  const updateContenedor = (index, field, value) => {
    const updated = [...contenedores];
    updated[index][field] = value;
    setContenedores(updated);
  };

  const removeContenedor = (index) => {
    // También remover las mercancías asociadas a este contenedor
    setMercancias(mercancias.filter(m => m.contenedorIndex !== index).map(m => ({
      ...m,
      // Ajustar índices de mercancías con contenedorIndex mayor
      contenedorIndex: m.contenedorIndex !== null && m.contenedorIndex > index 
        ? m.contenedorIndex - 1 
        : m.contenedorIndex
    })));
    setContenedores(contenedores.filter((_, i) => i !== index));
  };

  // Obtener mercancías de un contenedor específico
  const getMercanciasContenedor = (contenedorIndex) => {
    return mercancias
      .map((m, idx) => ({ ...m, originalIndex: idx }))
      .filter(m => m.contenedorIndex === contenedorIndex);
  };

  // Mercancías sin contenedor asignado
  const mercanciasSinContenedor = mercancias
    .map((m, idx) => ({ ...m, originalIndex: idx }))
    .filter(m => m.contenedorIndex === null || m.contenedorIndex === undefined);

  // Opciones de base para gastos
  const BASES_GASTO = [
    { value: 'CANT_CONTENEDORES', label: 'Cant. Contenedores' },
    { value: 'IMPORTE_FIJO', label: 'Importe Fijo' },
    { value: 'KILOS', label: 'Kilos' },
    { value: 'POR_CONTENEDOR', label: 'Por Contenedor' },
    { value: 'POR_CNT_FLETE', label: 'Por Cnt Flete' },
    { value: 'POR_ESCALA', label: 'Por Escala' },
    { value: 'TONELADA', label: 'Tonelada' },
    { value: 'TONELADA_M3', label: 'Tonelada/m3' },
    { value: 'VOLUMEN', label: 'Volumen' }
  ];

  // Gastos handlers
  const addGasto = () => {
    setGastos([...gastos, { 
      concepto: '', 
      prepaidCollect: 'P', 
      divisa: 'USD',
      montoVenta: 0, 
      montoCosto: 0, 
      base: 'CANT_CONTENEDORES',
      cantidad: 1,
      categoriaIVA: 'GRAVADO',
      gravado: true,
      porcentajeIVA: 21
    }]);
  };

  const updateGasto = (index, field, value) => {
    const updated = [...gastos];
    if (field === 'montoVenta' || field === 'montoCosto' || field === 'cantidad' || field === 'porcentajeIVA') {
      updated[index][field] = parseFloat(value) || 0;
    } else if (field === 'categoriaIVA') {
      // El usuario eligió manualmente la categoría → preservamos su decisión y
      // sincronizamos el booleano legacy `gravado` y el porcentaje correspondiente.
      updated[index].categoriaIVA = value;
      updated[index].gravado = value === 'GRAVADO';
      if (value !== 'GRAVADO') {
        updated[index].porcentajeIVA = 0;
      } else if (!updated[index].porcentajeIVA) {
        updated[index].porcentajeIVA = 21;
      }
    } else if (field === 'gravado') {
      // Mantiene compatibilidad si algún código viejo todavía toggleaba el bool.
      updated[index].gravado = value;
      updated[index].categoriaIVA = value ? 'GRAVADO' : 'NO_GRAVADO';
      if (!value) updated[index].porcentajeIVA = 0;
    } else {
      updated[index][field] = value;
    }
    setGastos(updated);
  };

  const removeGasto = (index) => {
    setGastos(gastos.filter((_, i) => i !== index));
  };

  const duplicateGasto = (index) => {
    const gasto = { ...gastos[index] };
    setGastos([...gastos.slice(0, index + 1), gasto, ...gastos.slice(index + 1)]);
  };

  // Obtener presupuesto vinculado si existe
  const presupuestoVinculado = carpetaData?.data?.carpeta?.presupuesto;
  const mensajesPresupuesto = presupuestoVinculado?.mensajes || [];

  const tabs = [
    { id: 'general', label: 'General', icon: Ship },
    { id: 'mercancias', label: 'Mercancías', icon: Package },
    { id: 'gastos', label: 'Gastos', icon: DollarSign },
    // Mostrar tab de conversación solo si hay presupuesto vinculado con mensajes
    ...(presupuestoVinculado ? [{ 
      id: 'conversacion', 
      label: 'Conversación', 
      icon: MessageSquare,
      badge: mensajesPresupuesto.length 
    }] : [])
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
          {isEditing && (
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPDFMenu(!showPDFMenu)}
                loading={downloadingPDF || descargarPDF.isPending}
              >
                <FileDown className="w-4 h-4" />
                Generar Documento
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
              {showPDFMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPDFMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                    <button
                      type="button"
                      onClick={() => { setShowPDFMenu(false); handleDescargarAvisoArribo(); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                      <FileDown className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-medium">{avisoLabel}</div>
                        <div className="text-xs text-slate-400">Notificación al cliente</div>
                      </div>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    {carpetaArea === 'Marítimo' && (
                      <button
                        type="button"
                        onClick={() => { setShowPDFMenu(false); setDocumentoEditor('bl'); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Ship className="w-4 h-4 text-cyan-600" />
                        <div>
                          <div className="font-medium">Bill of Lading (BL)</div>
                          <div className="text-xs text-slate-400">Editable antes de generar</div>
                        </div>
                      </button>
                    )}

                    {carpetaArea === 'Aéreo' && (
                      <button
                        type="button"
                        onClick={() => descargarDocumentoCarpeta('air-waybill', 'AWB')}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Plane className="w-4 h-4 text-orange-600" />
                        <div>
                          <div className="font-medium">Air Waybill (AWB)</div>
                          <div className="text-xs text-slate-400">Guía aérea</div>
                        </div>
                      </button>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => { setShowPDFMenu(false); setDocumentoEditor('certFlete'); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Award className="w-4 h-4 text-teal-600" />
                      <div>
                        <div className="font-medium">Certificación de Flete</div>
                        <div className="text-xs text-slate-400">Editable antes de generar</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setShowPDFMenu(false); setDocumentoEditor('certGastos'); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                      <FileCheck className="w-4 h-4 text-violet-600" />
                      <div>
                        <div className="font-medium">Certificación de Gastos</div>
                        <div className="text-xs text-slate-400">Editable antes de generar</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
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
            {tab.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                {tab.badge}
              </span>
            )}
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
                {isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado</label>
                    <select
                      {...register('estado')}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
                    >
                      {Object.entries(CARPETA_ESTADOS).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Tipo de Operación Aérea - solo visible para cargas aéreas */}
                {watch('area') === 'Aéreo' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Operación Aérea</label>
                    <select
                      {...register('tipoOperacionAerea')}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
                    >
                      <option value="">Seleccionar</option>
                      {TIPOS_OPERACION_AEREA.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cliente / Shipper y Consignee */}
            <Card>
              <CardHeader>
                <CardTitle>Shipper y Consignee</CardTitle>
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

                {/* Consignado (Consignee) */}
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Consignado (Consignee)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Empresa"
                      value={consigneeData.empresa}
                      onChange={(e) => setConsigneeData(prev => ({ ...prev, empresa: e.target.value }))}
                      className="md:col-span-2"
                    />
                    <Input
                      label="Número de Teléfono"
                      value={consigneeData.telefono}
                      onChange={(e) => setConsigneeData(prev => ({ ...prev, telefono: e.target.value }))}
                    />
                    <Input
                      label="Dirección"
                      value={consigneeData.direccion}
                      onChange={(e) => setConsigneeData(prev => ({ ...prev, direccion: e.target.value }))}
                      className="md:col-span-2"
                    />
                    <Input
                      label="Localidad"
                      value={consigneeData.localidad}
                      onChange={(e) => setConsigneeData(prev => ({ ...prev, localidad: e.target.value }))}
                    />
                    <Input
                      label="ZIP Code"
                      value={consigneeData.zipCode}
                      onChange={(e) => setConsigneeData(prev => ({ ...prev, zipCode: e.target.value }))}
                    />
                    <Input
                      label="País"
                      value={consigneeData.pais}
                      onChange={(e) => setConsigneeData(prev => ({ ...prev, pais: e.target.value }))}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={consigneeData.email}
                      onChange={(e) => setConsigneeData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Notify Party */}
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">Notify Party</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const partes = [
                          consigneeData.empresa,
                          consigneeData.direccion,
                          [consigneeData.localidad, consigneeData.zipCode, consigneeData.pais].filter(Boolean).join(', '),
                          consigneeData.telefono ? `TEL: ${consigneeData.telefono}` : '',
                          consigneeData.email ? `EMAIL: ${consigneeData.email}` : ''
                        ].filter(Boolean);
                        setValue('notify', partes.length > 0 ? partes.join('\n') : 'SAME AS CONSIGNEE');
                        toast.success('Datos del Consignee copiados a Notify Party');
                      }}
                    >
                      Igual que Consignee
                    </Button>
                  </div>
                  <textarea
                    {...register('notify')}
                    rows={3}
                    placeholder="Datos del Notify Party..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm resize-y focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ruta y Fechas */}
            <Card>
              <CardHeader>
                <CardTitle>Ruta y Fechas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {watch('area') === 'Aéreo' ? 'Aeropuerto Origen' : watch('area') === 'Terrestre' ? 'Origen' : 'Puerto Origen'}
                  </label>
                  <Controller
                    name="puertoOrigen"
                    control={control}
                    render={({ field }) => (
                      <TerminalSelector
                        area={watch('area')}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={watch('area') === 'Aéreo' ? 'EZE - Buenos Aires...' : 'ARBUE - Buenos Aires...'}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {watch('area') === 'Aéreo' ? 'Aeropuerto Destino' : watch('area') === 'Terrestre' ? 'Destino' : 'Puerto Destino'}
                  </label>
                  <Controller
                    name="puertoDestino"
                    control={control}
                    render={({ field }) => (
                      <TerminalSelector
                        area={watch('area')}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={watch('area') === 'Aéreo' ? 'JFK - New York...' : 'CNSHA - Shanghai...'}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {watch('area') === 'Aéreo' ? 'Aeropuerto Transbordo' : watch('area') === 'Terrestre' ? 'Transbordo' : 'Puerto Transbordo'}
                  </label>
                  <Controller
                    name="puertoTransbordo"
                    control={control}
                    render={({ field }) => (
                      <TerminalSelector
                        area={watch('area')}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={watch('area') === 'Aéreo' ? 'MIA - Miami...' : 'SGSIN - Singapur...'}
                      />
                    )}
                  />
                </div>
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
            {/* Contenedores con sus mercancías */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Contenedores y Mercancías
                </CardTitle>
                <Button type="button" size="sm" onClick={addContenedor}>
                  <Plus className="w-4 h-4" />
                  Agregar Contenedor
                </Button>
              </CardHeader>
              <CardContent>
                {contenedores.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">No hay contenedores agregados</p>
                    <p className="text-sm text-slate-400">Agregá contenedores para asignar mercancías</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {contenedores.map((cont, contIndex) => {
                      const mercContIndex = getMercanciasContenedor(contIndex);
                      return (
                        <div key={cont.tempId || contIndex} className="border border-slate-200 rounded-xl overflow-hidden">
                          {/* Header del contenedor */}
                          <div className="bg-slate-100 p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                                  <select
                                    value={cont.tipo}
                                    onChange={(e) => updateContenedor(contIndex, 'tipo', e.target.value)}
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
                                    onChange={(e) => updateContenedor(contIndex, 'numero', e.target.value)}
                                    placeholder="MSKU1234567"
                                    className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
                                  <input
                                    type="number"
                                    value={cont.cantidad || 1}
                                    onChange={(e) => updateContenedor(contIndex, 'cantidad', parseInt(e.target.value) || 1)}
                                    className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">Precinto</label>
                                  <input
                                    type="text"
                                    value={cont.precinto || ''}
                                    onChange={(e) => updateContenedor(contIndex, 'precinto', e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">BL Contenedor</label>
                                  <input
                                    type="text"
                                    placeholder="ML-CN..."
                                    value={cont.blContenedor || ''}
                                    onChange={(e) => updateContenedor(contIndex, 'blContenedor', e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {cont.numero && hasActiveIntegrations && (
                                  <button 
                                    type="button"
                                    onClick={() => handleTrackContainer(cont.numero, contIndex)}
                                    disabled={trackingLoading[contIndex]}
                                    className="p-2 text-primary-500 hover:bg-primary-50 rounded disabled:opacity-50"
                                    title="Tracking"
                                  >
                                    {trackingLoading[contIndex] ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <MapPin className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                                <button 
                                  type="button"
                                  onClick={() => removeContenedor(contIndex)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded"
                                  title="Eliminar contenedor"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Tracking info */}
                            {trackingData[contIndex] && (
                              <div className="mt-3 pt-3 border-t border-slate-200">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                                    {trackingData[contIndex].provider}
                                  </span>
                                  {trackingData[contIndex].currentStatus && (
                                    <>
                                      <span className="text-slate-600">
                                        {trackingData[contIndex].currentStatus.status}
                                      </span>
                                      <span className="text-slate-400">•</span>
                                      <span className="text-slate-500">
                                        {trackingData[contIndex].currentStatus.location}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Mercancías del contenedor */}
                          <div className="p-4 bg-white">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Mercancías en este contenedor
                                <Badge variant="secondary">{mercContIndex.length}</Badge>
                              </h4>
                              <Button 
                                type="button" 
                                size="sm" 
                                variant="ghost"
                                onClick={() => addMercancia(contIndex)}
                              >
                                <Plus className="w-3 h-3" />
                                Agregar
                              </Button>
                            </div>
                            
                            {mercContIndex.length === 0 ? (
                              <p className="text-center text-slate-400 py-4 text-sm">
                                Sin mercancías asignadas
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {mercContIndex.map((merc) => (
                                  <div key={merc.originalIndex} className="p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-2">
                                        <div className="md:col-span-2">
                                          <input
                                            type="text"
                                            value={merc.descripcion || ''}
                                            onChange={(e) => updateMercancia(merc.originalIndex, 'descripcion', e.target.value)}
                                            placeholder="Descripción"
                                            className="w-full px-2 py-1 text-sm rounded border border-slate-300"
                                          />
                                        </div>
                                        <div>
                                          <input
                                            type="text"
                                            value={merc.embalaje || ''}
                                            onChange={(e) => updateMercancia(merc.originalIndex, 'embalaje', e.target.value)}
                                            placeholder="Embalaje"
                                            className="w-full px-2 py-1 text-sm rounded border border-slate-300"
                                          />
                                        </div>
                                        <div>
                                          <input
                                            type="number"
                                            value={merc.bultos || ''}
                                            onChange={(e) => updateMercancia(merc.originalIndex, 'bultos', parseInt(e.target.value) || 0)}
                                            placeholder="Bultos"
                                            className="w-full px-2 py-1 text-sm rounded border border-slate-300"
                                          />
                                        </div>
                                        <div>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={merc.peso || ''}
                                            onChange={(e) => updateMercancia(merc.originalIndex, 'peso', parseFloat(e.target.value) || 0)}
                                            placeholder="Peso (kg)"
                                            className="w-full px-2 py-1 text-sm rounded border border-slate-300"
                                          />
                                        </div>
                                        <div>
                                          <input
                                            type="text"
                                            value={merc.hsCode || ''}
                                            onChange={(e) => updateMercancia(merc.originalIndex, 'hsCode', e.target.value)}
                                            placeholder="HS Code"
                                            className="w-full px-2 py-1 text-sm rounded border border-slate-300"
                                          />
                                        </div>
                                        <div>
                                          <input
                                            type="text"
                                            value={merc.marcas || ''}
                                            onChange={(e) => updateMercancia(merc.originalIndex, 'marcas', e.target.value)}
                                            placeholder="Marks & Numbers"
                                            className="w-full px-2 py-1 text-sm rounded border border-slate-300"
                                          />
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeMercancia(merc.originalIndex)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <div className="flex items-end gap-2 mt-2 pt-2 border-t border-slate-200">
                                      <div className="flex-1 grid grid-cols-4 gap-2">
                                        <div>
                                          <label className="block text-xs text-slate-500 mb-1">Largo (cm)</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={merc.largo || ''}
                                            onChange={(e) => updateMercancia(merc.originalIndex, 'largo', parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm rounded border border-slate-300"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-slate-500 mb-1">Ancho (cm)</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={merc.ancho || ''}
                                            onChange={(e) => updateMercancia(merc.originalIndex, 'ancho', parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm rounded border border-slate-300"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-slate-500 mb-1">Alto (cm)</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={merc.alto || ''}
                                            onChange={(e) => updateMercancia(merc.originalIndex, 'alto', parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm rounded border border-slate-300"
                                          />
                                        </div>
                                        <div className="flex items-end gap-2">
                                          <div className="flex-1">
                                            <label className="block text-xs text-slate-500 mb-1">Vol. CBM</label>
                                            <input
                                              type="number"
                                              step="0.0001"
                                              value={merc.volumen || ''}
                                              onChange={(e) => updateMercancia(merc.originalIndex, 'volumen', parseFloat(e.target.value) || 0)}
                                              className="w-full px-2 py-1 text-sm rounded border border-slate-300 bg-blue-50"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => calcularCBM(merc.originalIndex)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded border border-blue-300 mb-0"
                                            title="Calcular CBM (L × A × H × Bultos / 1.000.000)"
                                          >
                                            <Calculator className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mercancías sin contenedor asignado */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Mercancías Sueltas
                  <span className="text-xs font-normal text-slate-500">(sin contenedor asignado)</span>
                </CardTitle>
                <Button type="button" size="sm" variant="secondary" onClick={() => addMercancia(null)}>
                  <Plus className="w-4 h-4" />
                  Agregar
                </Button>
              </CardHeader>
              <CardContent>
                {mercanciasSinContenedor.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-sm">
                    Todas las mercancías están asignadas a contenedores
                  </p>
                ) : (
                  <div className="space-y-2">
                    {mercanciasSinContenedor.map((merc) => (
                      <div key={merc.originalIndex} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-7 gap-2">
                            <div className="md:col-span-2">
                              <label className="block text-xs text-slate-500 mb-1">Descripción</label>
                              <input
                                type="text"
                                value={merc.descripcion || ''}
                                onChange={(e) => updateMercancia(merc.originalIndex, 'descripcion', e.target.value)}
                                placeholder="Descripción"
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Embalaje</label>
                              <input
                                type="text"
                                value={merc.embalaje || ''}
                                onChange={(e) => updateMercancia(merc.originalIndex, 'embalaje', e.target.value)}
                                placeholder="Cajas"
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Bultos</label>
                              <input
                                type="number"
                                value={merc.bultos || ''}
                                onChange={(e) => updateMercancia(merc.originalIndex, 'bultos', parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Peso (kg)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={merc.peso || ''}
                                onChange={(e) => updateMercancia(merc.originalIndex, 'peso', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">HS Code</label>
                              <input
                                type="text"
                                value={merc.hsCode || ''}
                                onChange={(e) => updateMercancia(merc.originalIndex, 'hsCode', e.target.value)}
                                placeholder="8471.30"
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Marks & Numbers</label>
                              <input
                                type="text"
                                value={merc.marcas || ''}
                                onChange={(e) => updateMercancia(merc.originalIndex, 'marcas', e.target.value)}
                                placeholder="N/M"
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                              />
                            </div>
                            {contenedores.length > 0 && (
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Asignar a</label>
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value !== '') {
                                      updateMercancia(merc.originalIndex, 'contenedorIndex', parseInt(e.target.value));
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 bg-white"
                                >
                                  <option value="">Sin contenedor</option>
                                  {contenedores.map((c, idx) => (
                                    <option key={idx} value={idx}>
                                      {c.numero || `${c.tipo} #${idx + 1}`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeMercancia(merc.originalIndex)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded mt-5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-end gap-2 mt-2 pt-2 border-t border-slate-200">
                          <div className="flex-1 grid grid-cols-4 gap-2">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Largo (cm)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={merc.largo || ''}
                                onChange={(e) => updateMercancia(merc.originalIndex, 'largo', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Ancho (cm)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={merc.ancho || ''}
                                onChange={(e) => updateMercancia(merc.originalIndex, 'ancho', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Alto (cm)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={merc.alto || ''}
                                onChange={(e) => updateMercancia(merc.originalIndex, 'alto', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300"
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <label className="block text-xs text-slate-500 mb-1">Vol. CBM</label>
                                <input
                                  type="number"
                                  step="0.0001"
                                  value={merc.volumen || ''}
                                  onChange={(e) => updateMercancia(merc.originalIndex, 'volumen', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 bg-blue-50"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => calcularCBM(merc.originalIndex)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded border border-blue-300 mb-0"
                                title="Calcular CBM (L × A × H × Bultos / 1.000.000)"
                              >
                                <Calculator className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumen */}
            {(contenedores.length > 0 || mercancias.length > 0) && (
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{contenedores.length}</p>
                      <p className="text-xs text-slate-500">Contenedores</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{mercancias.length}</p>
                      <p className="text-xs text-slate-500">Mercancías</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">
                        {mercancias.reduce((sum, m) => sum + (parseInt(m.bultos) || 0), 0)}
                      </p>
                      <p className="text-xs text-slate-500">Total Bultos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">
                        {mercancias.reduce((sum, m) => sum + (parseFloat(m.peso) || 0), 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">Total Peso (kg)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tab: Gastos */}
        {activeTab === 'gastos' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Gastos
              </CardTitle>
              <Button type="button" size="sm" onClick={addGasto}>
                <Plus className="w-4 h-4" />
                Agregar Gasto
              </Button>
            </CardHeader>
            <CardContent>
              {gastos.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No hay gastos agregados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="text-xs text-slate-500 border-b border-slate-200 bg-slate-50">
                        <th className="py-3 px-2 text-left font-medium w-[200px]">Gasto</th>
                        <th className="py-3 px-2 text-center font-medium w-[60px]">P/C</th>
                        <th className="py-3 px-2 text-center font-medium w-[80px]">Divisa</th>
                        <th className="py-3 px-2 text-right font-medium w-[100px]">Venta</th>
                        <th className="py-3 px-2 text-right font-medium w-[100px]">Costo</th>
                        <th className="py-3 px-2 text-center font-medium w-[160px]">Base</th>
                        <th className="py-3 px-2 text-right font-medium w-[100px]">Total Venta</th>
                        <th className="py-3 px-2 text-right font-medium w-[100px]">Total Costo</th>
                        <th className="py-3 px-2 text-center font-medium w-[80px]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gastos.map((gasto, index) => {
                        // Mismo cálculo que el presupuesto: aplica multiplicador
                        // según la base (cant. contenedores, kilos, volumen, etc.).
                        const { totalVenta, totalCosto } = calcularTotalesItem(
                          gasto, mercancias, contenedores
                        );
                        return (
                          <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                            {/* Gasto (Concepto) */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={gasto.concepto || ''}
                                onChange={(e) => updateGasto(index, 'concepto', e.target.value)}
                                placeholder="FLETE MARITIMO"
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                              />
                              <div className="flex items-center gap-2 mt-1">
                                <select
                                  value={gasto.categoriaIVA || 'GRAVADO'}
                                  onChange={(e) => updateGasto(index, 'categoriaIVA', e.target.value)}
                                  className="px-1.5 py-0.5 text-xs rounded border border-slate-300 bg-white"
                                  title="Condición frente al IVA"
                                >
                                  <option value="GRAVADO">Gravado</option>
                                  <option value="NO_GRAVADO">No Gravado</option>
                                  <option value="EXENTO">Exento</option>
                                </select>
                                {(gasto.categoriaIVA || 'GRAVADO') === 'GRAVADO' && (
                                  <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={gasto.porcentajeIVA ?? 21}
                                      onChange={(e) => updateGasto(index, 'porcentajeIVA', e.target.value)}
                                      className="w-12 px-1 py-0.5 text-xs rounded border border-slate-300 text-right"
                                      title="% IVA"
                                    />
                                    <span>%</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            
                            {/* P/C (Prepaid/Collect) */}
                            <td className="py-2 px-2">
                              <select
                                value={gasto.prepaidCollect || 'P'}
                                onChange={(e) => updateGasto(index, 'prepaidCollect', e.target.value)}
                                className="w-full px-1 py-1.5 text-sm rounded border border-slate-300 bg-white text-center"
                              >
                                <option value="P">P</option>
                                <option value="C">C</option>
                              </select>
                            </td>
                            
                            {/* Divisa */}
                            <td className="py-2 px-2">
                              <select
                                value={gasto.divisa || 'USD'}
                                onChange={(e) => updateGasto(index, 'divisa', e.target.value)}
                                className="w-full px-1 py-1.5 text-sm rounded border border-slate-300 bg-white"
                              >
                                <option value="USD">USD</option>
                                <option value="ARS">ARS</option>
                                <option value="EUR">EUR</option>
                              </select>
                            </td>
                            
                            {/* Venta */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="0.01"
                                value={gasto.montoVenta || ''}
                                onChange={(e) => updateGasto(index, 'montoVenta', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 text-right"
                              />
                            </td>
                            
                            {/* Costo */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="0.01"
                                value={gasto.montoCosto || ''}
                                onChange={(e) => updateGasto(index, 'montoCosto', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 text-right"
                              />
                            </td>
                            
                            {/* Base */}
                            <td className="py-2 px-2">
                              <select
                                value={gasto.base || 'CANT_CONTENEDORES'}
                                onChange={(e) => updateGasto(index, 'base', e.target.value)}
                                className="w-full px-1 py-1.5 text-sm rounded border border-slate-300 bg-white"
                              >
                                {BASES_GASTO.map(b => (
                                  <option key={b.value} value={b.value}>{b.label}</option>
                                ))}
                              </select>
                            </td>
                            
                            {/* Total Venta */}
                            <td className="py-2 px-2 text-right">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-sm font-medium">
                                {gasto.divisa || 'USD'}
                                <span>{totalVenta.toFixed(2)}</span>
                              </span>
                            </td>
                            
                            {/* Total Costo */}
                            <td className="py-2 px-2 text-right">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-sm font-medium">
                                {gasto.divisa || 'USD'}
                                <span>{totalCosto.toFixed(2)}</span>
                              </span>
                            </td>
                            
                            {/* Acciones */}
                            <td className="py-2 px-2">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  type="button"
                                  onClick={() => duplicateGasto(index)}
                                  className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded"
                                  title="Duplicar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => removeGasto(index)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Totales — mismo método de cálculo que el presupuesto:
                      sumamos el total real por gasto (monto * multiplicadorBase * cantidad)
                      en vez de la fórmula simple monto*cantidad. */}
                  {(() => {
                    const totales = gastos.reduce((acc, g) => {
                      const { totalVenta: tv, totalCosto: tc } =
                        calcularTotalesItem(g, mercancias, contenedores);
                      acc.venta += tv;
                      acc.costo += tc;
                      return acc;
                    }, { venta: 0, costo: 0 });
                    const margen = totales.venta - totales.costo;
                    return (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex justify-end gap-8">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">Total Venta</p>
                        <p className="text-lg font-bold text-green-600">
                          USD {totales.venta.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">Total Costo</p>
                        <p className="text-lg font-bold text-red-600">
                          USD {totales.costo.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">Margen</p>
                        <p className={`text-lg font-bold ${margen >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          USD {margen.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Selector de Banco para PDF */}
                    {cuentasBancarias.length > 0 && (
                      <div className="mt-6 pt-4 border-t">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Banco para el PDF de {avisoLabel}
                        </label>
                        <select
                          value={bancoPdfId}
                          onChange={(e) => setBancoPdfId(e.target.value)}
                          className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                          {cuentasBancarias.map(cuenta => (
                            <option key={cuenta.id} value={cuenta.id}>
                              {cuenta.banco} ({cuenta.moneda}) - {cuenta.alias || cuenta.cbu}
                              {cuenta.esPrincipal ? ' ★ Principal' : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                          Estos datos bancarios aparecerán en el PDF del {avisoLabel}
                        </p>
                      </div>
                    )}
                  </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab: Conversación (del presupuesto vinculado) */}
        {activeTab === 'conversacion' && presupuestoVinculado && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversación del Presupuesto
                <Badge variant="secondary" className="ml-2">
                  {presupuestoVinculado.numero}
                </Badge>
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Historial de conversación desde la etapa de presupuesto
              </p>
            </CardHeader>
            <CardContent>
              {mensajesPresupuesto.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p>No hay mensajes en este presupuesto</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto p-2">
                  {mensajesPresupuesto.map((msg) => {
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
                  })}
                </div>
              )}

              {/* Info del presupuesto */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Presupuesto</p>
                    <p className="font-medium">{presupuestoVinculado.numero}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Estado</p>
                    <Badge className="bg-emerald-100 text-emerald-800">Convertido</Badge>
                  </div>
                  <div>
                    <p className="text-slate-500">Solicitado</p>
                    <p className="font-medium">{formatDate(presupuestoVinculado.fechaSolicitud)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Aprobado</p>
                    <p className="font-medium">{presupuestoVinculado.fechaAprobacion ? formatDate(presupuestoVinculado.fechaAprobacion) : '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>

      {/* Modal editor de documentos (BL / Certificados) */}
      {documentoEditor && carpetaActual && (
        <DocumentoEditorModal
          tipo={documentoEditor}
          carpeta={{ ...carpetaActual, mercancias, contenedores, gastos }}
          tenantName={user?.tenantName}
          onClose={() => setDocumentoEditor(null)}
        />
      )}
    </Layout>
  );
}

export default CarpetaForm;
