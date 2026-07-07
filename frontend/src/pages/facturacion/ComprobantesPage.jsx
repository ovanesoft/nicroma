import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, Search, Download, FileText, CheckCircle, Clock,
  FilePlus, FileMinus, X, Trash2, Plus
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '../../components/ui';
import { 
  usePanelComprobantes, useComprobantes, useCrearComprobante, useEliminarComprobante 
} from '../../hooks/useApi';
import { formatDate, formatCurrency, cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const TIPOS = {
  RECIBO: { label: 'Recibo', color: 'bg-green-100 text-green-800', icon: Receipt },
  NOTA_CREDITO: { label: 'Nota de Crédito', color: 'bg-red-100 text-red-800', icon: FileMinus },
  NOTA_DEBITO: { label: 'Nota de Débito', color: 'bg-blue-100 text-blue-800', icon: FilePlus }
};

const TIPOS_RETENCION = [
  { value: 'GANANCIAS', label: 'Imp. a las Ganancias' },
  { value: 'IVA', label: 'IVA' },
  { value: 'IIBB', label: 'Ingresos Brutos' },
  { value: 'SUSS', label: 'SUSS' },
  { value: 'OTRA', label: 'Otra' }
];

// Modal para emitir un comprobante
function EmitirModal({ factura, tipo, onClose, onEmitido }) {
  const crear = useCrearComprobante();
  const [total, setTotal] = useState(factura.total ?? '');
  const [concepto, setConcepto] = useState(
    tipo === 'RECIBO' 
      ? `Pago de factura ${factura.numeroCompleto}` 
      : ''
  );
  const [observaciones, setObservaciones] = useState('');
  const [retenciones, setRetenciones] = useState([]);

  const info = TIPOS[tipo];
  const esRecibo = tipo === 'RECIBO';

  const totalRetenciones = retenciones.reduce((s, r) => s + (parseFloat(r.importe) || 0), 0);
  const netoRecibido = (parseFloat(factura.total) || 0) - totalRetenciones;

  // Al modificar retenciones en un recibo, el total (neto) se recalcula solo
  const actualizarRetencion = (idx, field, value) => {
    const nuevas = [...retenciones];
    nuevas[idx] = { ...nuevas[idx], [field]: value };
    setRetenciones(nuevas);
    if (esRecibo) {
      const totRet = nuevas.reduce((s, r) => s + (parseFloat(r.importe) || 0), 0);
      setTotal(((parseFloat(factura.total) || 0) - totRet).toFixed(2));
    }
  };

  const agregarRetencion = () => {
    setRetenciones(prev => [...prev, { tipo: 'GANANCIAS', descripcion: '', importe: '' }]);
  };

  const quitarRetencion = (idx) => {
    const nuevas = retenciones.filter((_, i) => i !== idx);
    setRetenciones(nuevas);
    if (esRecibo) {
      const totRet = nuevas.reduce((s, r) => s + (parseFloat(r.importe) || 0), 0);
      setTotal(((parseFloat(factura.total) || 0) - totRet).toFixed(2));
    }
  };

  const handleEmitir = async () => {
    try {
      const result = await crear.mutateAsync({
        facturaId: factura.id,
        tipo,
        total,
        concepto,
        observaciones,
        retenciones: esRecibo ? retenciones : []
      });
      toast.success(result.message);
      onEmitido(result.data.comprobante);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al emitir el comprobante');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Emitir {info.label}</h2>
            <p className="text-sm text-slate-500">
              Factura {factura.numeroCompleto} • {factura.cliente?.razonSocial}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 flex justify-between">
            <span>Total de la factura:</span>
            <span className="font-bold">{factura.moneda} {formatCurrency(factura.total)}</span>
          </div>
          {/* Retenciones (solo recibos) */}
          {esRecibo && (
            <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-amber-800">Retenciones aplicadas</label>
                <Button type="button" variant="ghost" size="sm" onClick={agregarRetencion}>
                  <Plus className="w-4 h-4" /> Agregar
                </Button>
              </div>
              {retenciones.length === 0 ? (
                <p className="text-xs text-amber-600">
                  Sin retenciones. Si el cliente aplicó retenciones (Ganancias, IVA, IIBB, SUSS), agregalas acá.
                </p>
              ) : (
                <div className="space-y-2">
                  {retenciones.map((r, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <select
                        value={r.tipo}
                        onChange={(e) => actualizarRetencion(idx, 'tipo', e.target.value)}
                        className="col-span-4 px-2 py-1.5 rounded border border-slate-300 text-sm bg-white"
                      >
                        {TIPOS_RETENCION.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <input
                        placeholder="N° certificado / detalle"
                        value={r.descripcion}
                        onChange={(e) => actualizarRetencion(idx, 'descripcion', e.target.value)}
                        className="col-span-4 px-2 py-1.5 rounded border border-slate-300 text-sm"
                      />
                      <input
                        type="number" step="0.01" placeholder="Importe"
                        value={r.importe}
                        onChange={(e) => actualizarRetencion(idx, 'importe', e.target.value)}
                        className="col-span-3 px-2 py-1.5 rounded border border-slate-300 text-sm text-right"
                      />
                      <button
                        type="button"
                        onClick={() => quitarRetencion(idx)}
                        className="col-span-1 p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t border-amber-200">
                    <span className="text-amber-700">Total retenciones:</span>
                    <span className="font-bold text-amber-900">
                      {factura.moneda} {totalRetenciones.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">Neto a recibir:</span>
                    <span className="font-bold text-amber-900">
                      {factura.moneda} {netoRecibido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <Input
            label={esRecibo && retenciones.length > 0 ? 'Neto recibido (efectivo/transferencia)' : `Importe del ${info.label.toLowerCase()}`}
            type="number" step="0.01"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
          <Input
            label="Concepto"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder={tipo === 'RECIBO' ? 'Pago de factura...' : 'Motivo de la nota...'}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm resize-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleEmitir} loading={crear.isPending}>
            <Receipt className="w-4 h-4" /> Emitir {info.label}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ComprobantesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { factura, tipo }
  const [vistaComprobantes, setVistaComprobantes] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');

  const { data: panelData, isLoading } = usePanelComprobantes({ search, page, limit: 20 });
  const { data: comprobantesData, isLoading: loadingComprobantes } = useComprobantes({ tipo: filtroTipo });
  const eliminarComprobante = useEliminarComprobante();

  const facturas = panelData?.data?.facturas || [];
  const pagination = panelData?.data?.pagination || {};
  const comprobantes = comprobantesData?.data?.comprobantes || [];

  const descargarPdf = async (comprobante) => {
    try {
      const response = await api.get(`/comprobantes/${comprobante.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${comprobante.numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar el PDF');
    }
  };

  const handleEliminar = async (comprobante) => {
    if (!confirm(`¿Eliminar el comprobante ${comprobante.numero}? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarComprobante.mutateAsync(comprobante.id);
      toast.success('Comprobante eliminado');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  return (
    <Layout 
      title="Comprobantes" 
      subtitle="Recibos, notas de crédito y notas de débito de tus facturas"
    >
      {/* Selector de vista */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setVistaComprobantes(false)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            !vistaComprobantes ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          Facturas
        </button>
        <button
          onClick={() => setVistaComprobantes(true)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            vistaComprobantes ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          Comprobantes Emitidos
        </button>
      </div>

      {!vistaComprobantes ? (
        <>
          {/* Buscador */}
          <div className="relative mb-6 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar por número de factura o cliente..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>

          {/* Tabla de facturas */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : facturas.length === 0 ? (
                <div className="text-center py-16">
                  <Receipt className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No hay facturas emitidas</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factura</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado Recibo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facturas.map(f => (
                      <TableRow key={f.id} className="hover:bg-slate-50">
                        <TableCell>
                          <button
                            className="font-mono font-medium text-primary-600 hover:underline"
                            onClick={() => navigate(`/facturas/${f.id}`)}
                          >
                            {f.numeroCompleto}
                          </button>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-slate-800">{f.cliente?.razonSocial}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{f.moneda} {formatCurrency(f.total)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">{formatDate(f.fecha)}</span>
                        </TableCell>
                        <TableCell>
                          {f.reciboEmitido ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3.5 h-3.5" /> Realizado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <Clock className="w-3.5 h-3.5" /> Pendiente
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {!f.reciboEmitido && (
                              <Button size="sm" onClick={() => setModal({ factura: f, tipo: 'RECIBO' })}>
                                <Receipt className="w-3.5 h-3.5" /> Recibo
                              </Button>
                            )}
                            <Button size="sm" variant="outline"
                              onClick={() => setModal({ factura: f, tipo: 'NOTA_CREDITO' })}>
                              NC
                            </Button>
                            <Button size="sm" variant="outline"
                              onClick={() => setModal({ factura: f, tipo: 'NOTA_DEBITO' })}>
                              ND
                            </Button>
                            {/* Descargar comprobantes ya emitidos de esta factura */}
                            {f.comprobantes?.map(c => (
                              <button
                                key={c.id}
                                onClick={() => descargarPdf(c)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg"
                                title={`Descargar ${TIPOS[c.tipo]?.label} ${c.numero}`}
                              >
                                <Download className="w-4 h-4 text-slate-400" />
                              </button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1}
                onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="flex items-center px-4 text-sm text-slate-600">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Filtro por tipo */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFiltroTipo('')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                !filtroTipo ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              )}
            >
              Todos
            </button>
            {Object.entries(TIPOS).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setFiltroTipo(filtroTipo === key ? '' : key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  filtroTipo === key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tabla de comprobantes emitidos */}
          <Card>
            <CardContent className="p-0">
              {loadingComprobantes ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : comprobantes.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No hay comprobantes emitidos</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comprobantes.map(c => {
                      const info = TIPOS[c.tipo] || TIPOS.RECIBO;
                      return (
                        <TableRow key={c.id} className="hover:bg-slate-50">
                          <TableCell>
                            <span className="font-mono font-medium text-primary-600">{c.numero}</span>
                          </TableCell>
                          <TableCell>
                            <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', info.color)}>
                              {info.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{c.factura?.numeroCompleto}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-700">{c.factura?.cliente?.razonSocial}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">{c.moneda} {formatCurrency(c.total)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-500">{formatDate(c.fecha)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" onClick={() => descargarPdf(c)}>
                                <Download className="w-3.5 h-3.5" /> PDF
                              </Button>
                              <button
                                onClick={() => handleEliminar(c)}
                                className="p-1.5 text-red-300 hover:text-red-600 rounded"
                                title="Eliminar comprobante"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal emitir */}
      {modal && (
        <EmitirModal
          factura={modal.factura}
          tipo={modal.tipo}
          onClose={() => setModal(null)}
          onEmitido={(comprobante) => descargarPdf(comprobante)}
        />
      )}
    </Layout>
  );
}

export default ComprobantesPage;
