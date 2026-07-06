import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Save, Download, Plus, Trash2, Eye } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import api from '../../api/axios';
import toast from 'react-hot-toast';

/**
 * Modal para editar los datos de un documento (BL / Cert. Flete / Cert. Gastos)
 * antes de generar el PDF. Los cambios se guardan en carpeta.documentosData
 * y el PDF se genera con esos datos.
 */

const CAMPOS_CERT = [
  { key: 'fechaTexto', label: 'Fecha (texto)', placeholder: 'CABA, 6 de julio de 2026' },
  { key: 'dirigidoA', label: 'Dirigido a', placeholder: 'A.R.C.A.  -  D.G.A.' },
  { key: 'consignatario', label: 'Consignatario' },
  { key: 'cuit', label: 'CUIT' },
  { key: 'origen', label: 'Origen' },
  { key: 'destino', label: 'Destino' },
  { key: 'incoterm', label: 'Incoterm' },
  { key: 'hbl', label: 'HBL' },
  { key: 'buque', label: 'Buque' }
];

const CAMPOS_BL = [
  { key: 'blNumber', label: 'Bill of Lading N°' },
  { key: 'references', label: 'References N°' },
  { key: 'exportReferences', label: 'Export References' },
  { key: 'shipper', label: 'Shipper / Exporter', multiline: true },
  { key: 'consignee', label: 'Consignee', multiline: true },
  { key: 'notifyParty', label: 'Notify Party', multiline: true },
  { key: 'routingInstructions', label: 'Routing Instructions' },
  { key: 'originCountry', label: 'Point and Country of Origin' },
  { key: 'forwardingAgent', label: 'Forwarding Agent', multiline: true },
  { key: 'deliveryApplyTo', label: 'For delivery please apply to', multiline: true },
  { key: 'placeOfReceipt', label: 'Place of Receipt by pre carrier' },
  { key: 'vessel', label: 'Vessel / Voyage' },
  { key: 'portOfLoading', label: 'Port of Loading' },
  { key: 'finalDestination', label: 'Final Destination' },
  { key: 'typeOfMove', label: 'Type of move' },
  { key: 'portOfDischarge', label: 'Port of discharge' },
  { key: 'placeOfDelivery', label: 'Place of delivery by on carrier' },
  { key: 'freightPayableAt', label: 'Freight payable at' },
  { key: 'numberOfOriginals', label: 'Number of original BL' },
  { key: 'marksNumbers', label: 'Marks & Numbers' },
  { key: 'packages', label: 'N° of Packages' },
  { key: 'description', label: 'Description', multiline: true, rows: 5 },
  { key: 'kilograms', label: 'Kilograms' },
  { key: 'cubicMeters', label: 'Cubic Meters' },
  { key: 'freightText', label: 'Freight and Charges' },
  { key: 'placeDateOfIssue', label: 'Place and date of issue' },
  { key: 'signedFor', label: 'Signed for' }
];

// Defaults calculados desde la carpeta (espejo de la lógica backend)
function calcularDefaults(tipo, carpeta, tenantName, tenantCuit) {
  const hoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  if (tipo === 'certFlete' || tipo === 'certGastos') {
    const base = {
      fechaTexto: `CABA, ${hoy}`,
      dirigidoA: 'A.R.C.A.  -  D.G.A.',
      consignatario: carpeta.cliente?.razonSocial || carpeta.consignee?.razonSocial || '',
      cuit: carpeta.cliente?.numeroDocumento || carpeta.consignee?.numeroDocumento || '',
      origen: carpeta.puertoOrigen || '',
      destino: carpeta.puertoDestino || '',
      incoterm: carpeta.incoterm || '',
      hbl: carpeta.houseBL || '',
      buque: carpeta.buque || ''
    };
    if (tipo === 'certFlete') {
      const esAereo = carpeta.area === 'Aéreo';
      const fletes = (carpeta.gastos || []).filter(g => {
        const c = (g.concepto || '').toUpperCase();
        return c.includes('FLETE') || c.includes('FREIGHT') || c.includes('OCEAN') || c.includes('AIR');
      });
      const importe = fletes.reduce((s, g) => s + (g.totalVenta || 0), 0);
      return {
        ...base,
        conceptos: [{
          concepto: esAereo ? 'FLETE AEREO IMPORTACION' : 'FLETE MARITIMO IMPORTACION',
          moneda: carpeta.moneda || 'USD',
          importe
        }]
      };
    }
    return {
      ...base,
      conceptos: (carpeta.gastos || []).filter(g => g.concepto).map(g => ({
        concepto: (g.concepto || '').toUpperCase(),
        moneda: g.divisa || carpeta.moneda || 'USD',
        importe: g.totalVenta || 0
      }))
    };
  }

  // BL
  const totalBultos = carpeta.mercancias?.reduce((s, m) => s + (m.bultos || 0), 0) || 0;
  const totalVolumen = carpeta.mercancias?.reduce((s, m) => s + (m.volumen || 0), 0) || 0;
  const totalPeso = carpeta.mercancias?.reduce((s, m) => s + (m.peso || 0), 0) || 0;
  const fmt = (v) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v);
  const hoyD = new Date();

  const descripcion = [
    ...(carpeta.mercancias?.map(m => m.descripcion).filter(Boolean) || []),
    ...(carpeta.contenedores?.map(c => [c.tipo, c.numero, c.precinto].filter(Boolean).join('/')) || [])
  ].join('\n');

  // Shipper: priorizar datos libres del formulario (shipperData)
  const sd = carpeta.shipperData || {};
  const shipperStr = sd.empresa
    ? [
        sd.empresa,
        sd.direccion,
        [sd.localidad, sd.zipCode, sd.pais].filter(Boolean).join(', '),
        sd.telefono ? `TEL: ${sd.telefono}` : '',
        sd.email ? `EMAIL: ${sd.email}` : ''
      ].filter(Boolean).join('\n')
    : (carpeta.shipper ? `${carpeta.shipper.razonSocial}\n${carpeta.shipper.direccion || ''}` : '');

  // Consignee: el cliente de la carpeta (importador)
  const consigneeStr = carpeta.consignee
    ? `${carpeta.consignee.razonSocial} (CUIT ${carpeta.consignee.numeroDocumento || '-'})\n${carpeta.consignee.direccion || ''}`
    : (carpeta.cliente ? `${carpeta.cliente.razonSocial} (CUIT ${carpeta.cliente.numeroDocumento || '-'})\n${carpeta.cliente.direccion || ''}` : '');

  // Marks & Numbers desde las mercancías
  const marksStr = carpeta.mercancias?.map(m => m.marcas).filter(Boolean).join('\n') || 'N/M';

  return {
    blNumber: carpeta.houseBL || carpeta.numero || '',
    references: carpeta.referenciaInterna || carpeta.referenciaCliente || '',
    exportReferences: '',
    shipper: shipperStr,
    consignee: consigneeStr,
    notifyParty: carpeta.notify || 'SAME AS CONSIGNEE',
    routingInstructions: '',
    originCountry: '',
    forwardingAgent: [
      tenantName || '',
      'AGENTE DE TRANSPORTE ADUANERO',
      tenantCuit ? `CUIT ${tenantCuit}` : ''
    ].filter(Boolean).join('\n'),
    deliveryApplyTo: '',
    placeOfReceipt: carpeta.lugarCarga || carpeta.puertoOrigen || '',
    vessel: [carpeta.buque, carpeta.viaje].filter(Boolean).join(' '),
    portOfLoading: carpeta.puertoOrigen || '',
    finalDestination: carpeta.puertoDestino || '',
    typeOfMove: carpeta.tipoOperacion || '',
    portOfDischarge: carpeta.puertoDestino || '',
    placeOfDelivery: carpeta.lugarDescarga || carpeta.puertoDestino || '',
    freightPayableAt: 'DESTINATION',
    numberOfOriginals: '3',
    marksNumbers: marksStr,
    packages: `${totalBultos}`,
    description: descripcion,
    kilograms: `${fmt(totalPeso)}KGS`,
    cubicMeters: `${fmt(totalVolumen)}CBM`,
    freightText: `Freight: FREIGHT ${(carpeta.prepaidCollect || 'Collect').toUpperCase() === 'COLLECT' ? 'COLLECT' : 'PREPAID'} | AS ARRANGED`,
    placeDateOfIssue: `${(carpeta.puertoOrigen || '').toUpperCase()}, ${hoyD.getFullYear()}/${hoyD.getMonth() + 1}/${hoyD.getDate()}`,
    signedFor: tenantName || ''
  };
}

const TITULOS = {
  bl: 'Bill of Lading',
  certFlete: 'Certificación de Flete',
  certGastos: 'Certificación de Gastos'
};

const SLUGS_PDF = {
  bl: 'bill-of-lading',
  certFlete: 'cert-flete',
  certGastos: 'cert-gastos'
};

function DocumentoEditorModal({ tipo, carpeta, tenantName, tenantCuit, onClose }) {
  const queryClient = useQueryClient();
  const [datos, setDatos] = useState({});
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const esCert = tipo === 'certFlete' || tipo === 'certGastos';
  const campos = esCert ? CAMPOS_CERT : CAMPOS_BL;

  // Hidratar SOLO una vez al abrir el modal. Si dependiéramos del objeto
  // `carpeta` completo, cada re-render del padre (auto-refetch cada 15s)
  // crearía un objeto nuevo y pisaría lo que el usuario está editando.
  const hidratedRef = useRef(false);
  useEffect(() => {
    if (hidratedRef.current) return;
    hidratedRef.current = true;
    const guardado = carpeta.documentosData?.[tipo];
    const defaults = calcularDefaults(tipo, carpeta, tenantName, tenantCuit);
    setDatos(guardado && Object.keys(guardado).length > 0 ? { ...defaults, ...guardado } : defaults);
  }, [tipo, carpeta, tenantName, tenantCuit]);

  const handleChange = (key, value) => {
    setDatos(prev => ({ ...prev, [key]: value }));
  };

  const updateConcepto = (idx, field, value) => {
    setDatos(prev => {
      const conceptos = [...(prev.conceptos || [])];
      conceptos[idx] = { ...conceptos[idx], [field]: field === 'importe' ? (parseFloat(value) || 0) : value };
      return { ...prev, conceptos };
    });
  };

  const addConcepto = () => {
    setDatos(prev => ({
      ...prev,
      conceptos: [...(prev.conceptos || []), { concepto: '', moneda: 'USD', importe: 0 }]
    }));
  };

  const removeConcepto = (idx) => {
    setDatos(prev => ({
      ...prev,
      conceptos: (prev.conceptos || []).filter((_, i) => i !== idx)
    }));
  };

  const guardar = async (silent = false) => {
    setSaving(true);
    try {
      // Leer el documentosData más reciente del servidor para no pisar
      // documentos de otro tipo guardados después de abrir este modal
      const { data: fresh } = await api.get(`/carpetas/${carpeta.id}`);
      const actual = fresh?.data?.carpeta?.documentosData || carpeta.documentosData || {};
      const documentosData = { ...actual, [tipo]: datos };
      await api.put(`/carpetas/${carpeta.id}`, { documentosData });
      // Refrescar el cache para que al reabrir el modal traiga lo guardado
      queryClient.invalidateQueries({ queryKey: ['carpeta', carpeta.id] });
      if (!silent) toast.success('Documento guardado');
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Error al guardar el documento';
      toast.error(msg);
      console.error('Error guardando documento:', error.response?.data || error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const previsualizar = async () => {
    setPreviewing(true);
    try {
      const ok = await guardar(true);
      if (!ok) return;
      const response = await api.get(`/carpetas/${carpeta.id}/pdf/${SLUGS_PDF[tipo]}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      // Liberar el objeto después de un rato (la pestaña ya lo tiene cargado)
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error('Error al generar la vista previa');
    } finally {
      setPreviewing(false);
    }
  };

  const descargar = async () => {
    setDownloading(true);
    try {
      const ok = await guardar(true);
      if (!ok) return;
      const response = await api.get(`/carpetas/${carpeta.id}/pdf/${SLUGS_PDF[tipo]}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${TITULOS[tipo].replace(/ /g, '_')}_${carpeta.houseBL || carpeta.numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al generar el PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{TITULOS[tipo]}</h2>
            <p className="text-sm text-slate-500">
              Editá los datos antes de generar el PDF. Los cambios se guardan en la carpeta.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campos.map(campo => (
              campo.multiline ? (
                <div key={campo.key} className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{campo.label}</label>
                  <textarea
                    value={datos[campo.key] || ''}
                    onChange={(e) => handleChange(campo.key, e.target.value)}
                    rows={campo.rows || 2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm resize-y focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  />
                </div>
              ) : (
                <Input
                  key={campo.key}
                  label={campo.label}
                  placeholder={campo.placeholder}
                  value={datos[campo.key] || ''}
                  onChange={(e) => handleChange(campo.key, e.target.value)}
                />
              )
            ))}
          </div>

          {/* Conceptos (solo certificados) */}
          {esCert && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Conceptos</label>
                <Button type="button" variant="ghost" size="sm" onClick={addConcepto}>
                  <Plus className="w-4 h-4" /> Agregar
                </Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                  <div className="col-span-7">Concepto</div>
                  <div className="col-span-2">Moneda</div>
                  <div className="col-span-2">Importe</div>
                  <div className="col-span-1"></div>
                </div>
                {(datos.conceptos || []).map((c, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      className="col-span-7 px-2 py-1.5 rounded border border-slate-300 text-sm"
                      value={c.concepto}
                      onChange={(e) => updateConcepto(idx, 'concepto', e.target.value)}
                    />
                    <input
                      className="col-span-2 px-2 py-1.5 rounded border border-slate-300 text-sm"
                      value={c.moneda}
                      onChange={(e) => updateConcepto(idx, 'moneda', e.target.value)}
                    />
                    <input
                      className="col-span-2 px-2 py-1.5 rounded border border-slate-300 text-sm text-right"
                      type="number" step="0.01"
                      value={c.importe}
                      onChange={(e) => updateConcepto(idx, 'importe', e.target.value)}
                    />
                    <button className="col-span-1 p-1 text-red-400 hover:text-red-600" onClick={() => removeConcepto(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="outline" onClick={() => guardar(false)} loading={saving}>
            <Save className="w-4 h-4" /> Guardar
          </Button>
          <Button variant="secondary" onClick={previsualizar} loading={previewing}>
            <Eye className="w-4 h-4" /> Vista Previa
          </Button>
          <Button onClick={descargar} loading={downloading}>
            <Download className="w-4 h-4" /> Descargar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DocumentoEditorModal;
