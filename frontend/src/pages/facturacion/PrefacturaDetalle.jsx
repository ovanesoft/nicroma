import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, FileText, CheckCircle, XCircle, Receipt, Building, Calendar, Ship,
  Download, Banknote, RefreshCw
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input } from '../../components/ui';
import { 
  usePrefactura, useConfirmarPrefactura, useCancelarPrefactura, 
  useCreateFacturaDesdePrefactura, useActualizarTiposCambioPrefactura,
  useTiposCambioUltimos, useActualizarPrefactura
} from '../../hooks/useApi';
import { formatDate, cn } from '../../lib/utils';
import { CONDICIONES_VENTA_FACTURA } from '../../lib/constants';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const ESTADOS = {
  BORRADOR: { label: 'Borrador', color: 'bg-slate-100 text-slate-700' },
  CONFIRMADA: { label: 'Confirmada', color: 'bg-blue-100 text-blue-700' },
  FACTURADA: { label: 'Facturada', color: 'bg-green-100 text-green-700' },
  CANCELADA: { label: 'Cancelada', color: 'bg-red-100 text-red-700' }
};

function PrefacturaDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const { data, isLoading, refetch } = usePrefactura(id);
  const confirmar = useConfirmarPrefactura();
  const cancelar = useCancelarPrefactura();
  const facturar = useCreateFacturaDesdePrefactura();
  const actualizarTC = useActualizarTiposCambioPrefactura(id);
  const actualizarPrefactura = useActualizarPrefactura(id);
  const { data: tcUltimosData } = useTiposCambioUltimos();

  const prefactura = data?.data?.prefactura;
  const tcUltimos = tcUltimosData?.data?.ultimos || {};

  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [tcValores, setTcValores] = useState({});
  const [monedaUnificada, setMonedaUnificada] = useState('');
  const [tcHidratado, setTcHidratado] = useState(false);

  // Período de facturación y condición de venta (editable en borrador/confirmada)
  const [facturacion, setFacturacion] = useState({
    periodoDesde: '',
    periodoHasta: '',
    fechaVencimiento: '',
    condicionVenta: '',
  });
  const [facturacionHidratado, setFacturacionHidratado] = useState(false);

  useEffect(() => {
    if (!prefactura || facturacionHidratado) return;
    setFacturacionHidratado(true);
    const hoy = new Date().toISOString().slice(0, 10);
    const toDate = (v) => (v ? String(v).slice(0, 10) : hoy);
    setFacturacion({
      periodoDesde: toDate(prefactura.periodoDesde),
      periodoHasta: toDate(prefactura.periodoHasta),
      fechaVencimiento: toDate(prefactura.fechaVencimiento),
      condicionVenta: prefactura.condicionVenta || '',
    });
  }, [prefactura]);

  const handleGuardarFacturacion = async () => {
    try {
      await actualizarPrefactura.mutateAsync({
        periodoDesde: facturacion.periodoDesde || null,
        periodoHasta: facturacion.periodoHasta || null,
        fechaVencimiento: facturacion.fechaVencimiento || null,
        condicionVenta: facturacion.condicionVenta || null,
      });
      toast.success('Datos de facturación guardados');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  // Divisas presentes en los ítems
  const divisasItems = [...new Set((prefactura?.items || []).map(i => (i.divisa || 'USD').toUpperCase()))];
  const hayMultiplesMonedas = divisasItems.length > 1;

  // Hidratar TC guardados o últimos del sistema (una sola vez)
  useEffect(() => {
    if (!prefactura || tcHidratado) return;
    setTcHidratado(true);
    const guardados = prefactura.tiposCambio || {};
    const iniciales = {};
    divisasItems.filter(d => d !== 'ARS').forEach(d => {
      iniciales[d] = guardados[d] ?? tcUltimos[d]?.valor ?? '';
    });
    setTcValores(iniciales);
    setMonedaUnificada(prefactura.moneda || 'USD');
  }, [prefactura, tcUltimos]);

  const handleDescargarPdf = async () => {
    setDescargandoPdf(true);
    try {
      const response = await api.get(`/prefacturas/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Prefactura_${prefactura.numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar el PDF');
    } finally {
      setDescargandoPdf(false);
    }
  };

  const handleUnificar = async () => {
    try {
      const result = await actualizarTC.mutateAsync({
        tiposCambio: tcValores,
        monedaUnificada
      });
      toast.success(result.message || 'Moneda unificada');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al unificar');
    }
  };

  const handleConfirmar = async () => {
    if (!confirm('¿Confirmar esta prefactura?')) return;
    try {
      await confirmar.mutateAsync(id);
      refetch();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al confirmar');
    }
  };

  const handleCancelar = async () => {
    if (!confirm('¿Cancelar esta prefactura?')) return;
    try {
      await cancelar.mutateAsync(id);
      refetch();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al cancelar');
    }
  };

  const handleFacturar = async () => {
    if (!facturacion.condicionVenta && !prefactura.condicionVenta) {
      toast.error('Seleccioná la condición de venta antes de facturar');
      return;
    }
    if (!confirm('¿Generar factura desde esta prefactura?')) return;
    try {
      await facturar.mutateAsync({
        prefacturaId: id,
        periodoDesde: facturacion.periodoDesde || null,
        periodoHasta: facturacion.periodoHasta || null,
        fechaVencimiento: facturacion.fechaVencimiento || null,
        condicionVenta: facturacion.condicionVenta || prefactura.condicionVenta || null,
      });
      navigate(`/facturas`);
    } catch (error) {
      alert(error.response?.data?.message || 'Error al facturar');
    }
  };

  if (isLoading) {
    return (
      <Layout title="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  if (!prefactura) {
    return (
      <Layout title="Prefactura no encontrada">
        <Button variant="ghost" onClick={() => navigate('/prefacturas')}>
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
      </Layout>
    );
  }

  return (
    <Layout 
      title={`Prefactura ${prefactura.numero}`}
      subtitle="Detalle de prefactura"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/prefacturas')}>
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDescargarPdf} loading={descargandoPdf}>
            <Download className="w-4 h-4" />
            Descargar PDF
          </Button>
          {prefactura.estado === 'BORRADOR' && (
            <>
              <Button variant="secondary" onClick={handleCancelar}>
                <XCircle className="w-4 h-4" />
                Cancelar
              </Button>
              <Button onClick={handleConfirmar} loading={confirmar.isPending}>
                <CheckCircle className="w-4 h-4" />
                Confirmar
              </Button>
            </>
          )}
          {prefactura.estado === 'CONFIRMADA' && (
            <>
              <Button variant="secondary" onClick={handleCancelar}>
                <XCircle className="w-4 h-4" />
                Cancelar
              </Button>
              <Button onClick={handleFacturar} loading={facturar.isPending}>
                <Receipt className="w-4 h-4" />
                Generar Factura
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos generales */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {prefactura.numero}
                </CardTitle>
                <span className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  ESTADOS[prefactura.estado]?.color
                )}>
                  {ESTADOS[prefactura.estado]?.label}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Fecha</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(prefactura.fecha)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Moneda</p>
                  <p className="font-medium">{prefactura.moneda}</p>
                </div>
                {prefactura.carpeta && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500">Carpeta asociada</p>
                    <p className="font-medium flex items-center gap-1 text-primary-600">
                      <Ship className="w-4 h-4" />
                      {prefactura.carpeta.numero}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Datos de la operación (carpeta) */}
          {prefactura.carpeta && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ship className="w-5 h-5" />
                  Datos de la Operación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {(() => {
                    const c = prefactura.carpeta;
                    const totalBultos = c.mercancias?.reduce((s, m) => s + (m.bultos || 0), 0) || 0;
                    const totalPeso = c.mercancias?.reduce((s, m) => s + (m.peso || 0), 0) || 0;
                    const totalVolumen = c.mercancias?.reduce((s, m) => s + (m.volumen || 0), 0) || 0;
                    const contenedores = c.contenedores?.map(ct => [ct.tipo, ct.numero].filter(Boolean).join(' ')).join(', ') || '-';
                    const shipper = c.shipperData?.empresa || c.shipper?.razonSocial || '-';
                    const campos = [
                      ['Nro. de HBL', c.houseBL || '-'],
                      ['Origen', c.puertoOrigen || '-'],
                      ['Destino', c.puertoDestino || '-'],
                      ['Shipper', shipper],
                      ['Fecha Salida', c.fechaSalidaEstimada ? formatDate(c.fechaSalidaEstimada) : '-'],
                      ['Fecha Llegada', c.fechaLlegadaEstimada ? formatDate(c.fechaLlegadaEstimada) : '-'],
                      ['Bultos', `${totalBultos}`],
                      ['Peso', `${totalPeso.toLocaleString('es-AR')} KG`],
                      ['Volumen', `${totalVolumen.toLocaleString('es-AR')} M³`],
                      ['Ref. Cliente', c.referenciaCliente || '-'],
                      ['Buque', c.buque || '-'],
                      ['Contenedor', contenedores]
                    ];
                    return campos.map(([label, value]) => (
                      <div key={label}>
                        <p className="text-slate-500 text-xs">{label}</p>
                        <p className="font-medium text-slate-800">{value}</p>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-500 border-b">
                      <th className="pb-3 font-medium">Descripción</th>
                      <th className="pb-3 font-medium">Divisa</th>
                      <th className="pb-3 font-medium text-right">Cantidad</th>
                      <th className="pb-3 font-medium text-right">Precio Unit.</th>
                      <th className="pb-3 font-medium text-right">Subtotal</th>
                      <th className="pb-3 font-medium text-right">IVA</th>
                      <th className="pb-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prefactura.items?.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-3 text-slate-700">{item.descripcion}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            {item.divisa || 'USD'}
                          </span>
                        </td>
                        <td className="py-3 text-right">{item.cantidad}</td>
                        <td className="py-3 text-right">
                          {item.precioUnitario?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right">
                          {item.subtotal?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right text-slate-500">
                          {item.iva?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right font-medium">
                          {item.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Observaciones */}
          {prefactura.observaciones && (
            <Card>
              <CardHeader>
                <CardTitle>Observaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{prefactura.observaciones}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-slate-800">{prefactura.cliente?.razonSocial}</p>
              <p className="text-sm text-slate-500">{prefactura.cliente?.tipoDocumento}: {prefactura.cliente?.numeroDocumento}</p>
              {prefactura.cliente?.email && (
                <p className="text-sm text-slate-500 mt-2">{prefactura.cliente.email}</p>
              )}
              {prefactura.cliente?.telefono && (
                <p className="text-sm text-slate-500">{prefactura.cliente.telefono}</p>
              )}
            </CardContent>
          </Card>

          {/* Período de facturación y condición de venta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Período y Condición de Venta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {['BORRADOR', 'CONFIRMADA'].includes(prefactura.estado) ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Desde</label>
                    <Input
                      type="date"
                      value={facturacion.periodoDesde}
                      onChange={(e) => setFacturacion(prev => ({ ...prev, periodoDesde: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hasta</label>
                    <Input
                      type="date"
                      value={facturacion.periodoHasta}
                      onChange={(e) => setFacturacion(prev => ({ ...prev, periodoHasta: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Vto. para el pago</label>
                    <Input
                      type="date"
                      value={facturacion.fechaVencimiento}
                      onChange={(e) => setFacturacion(prev => ({ ...prev, fechaVencimiento: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Condición de venta <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={facturacion.condicionVenta}
                      onChange={(e) => setFacturacion(prev => ({ ...prev, condicionVenta: e.target.value }))}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border bg-white text-sm',
                        facturacion.condicionVenta ? 'border-slate-300' : 'border-red-300'
                      )}
                    >
                      <option value="">Seleccionar...</option>
                      {CONDICIONES_VENTA_FACTURA.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    className="w-full"
                    size="sm"
                    variant="secondary"
                    onClick={handleGuardarFacturacion}
                    loading={actualizarPrefactura.isPending}
                  >
                    Guardar datos de facturación
                  </Button>
                </>
              ) : (
                <div className="text-sm space-y-1">
                  <p><span className="text-slate-500">Período:</span> {formatDate(prefactura.periodoDesde)} al {formatDate(prefactura.periodoHasta)}</p>
                  <p><span className="text-slate-500">Vto. pago:</span> {formatDate(prefactura.fechaVencimiento)}</p>
                  <p><span className="text-slate-500">Condición de venta:</span> {prefactura.condicionVenta || '-'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tipos de cambio y unificación de moneda */}
          {['BORRADOR', 'CONFIRMADA'].includes(prefactura.estado) && (
            <Card className={hayMultiplesMonedas ? 'border-amber-300 bg-amber-50/40' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="w-5 h-5" />
                  Tipo de Cambio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hayMultiplesMonedas && (
                  <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
                    Esta prefactura tiene ítems en varias monedas ({divisasItems.join(', ')}).
                    Cargá los tipos de cambio para unificar el total.
                  </p>
                )}
                {Object.keys(tcValores).map(divisa => (
                  <div key={divisa} className="flex items-center gap-2">
                    <span className="w-12 text-sm font-semibold text-slate-700">{divisa}</span>
                    <input
                      type="number" step="0.01" placeholder="0.00"
                      value={tcValores[divisa]}
                      onChange={(e) => setTcValores(prev => ({ ...prev, [divisa]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-right focus:border-primary-500 outline-none"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <span className="text-sm text-slate-600 flex-shrink-0">Unificar en:</span>
                  <select
                    value={monedaUnificada}
                    onChange={(e) => setMonedaUnificada(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    {[...new Set(['USD', 'EUR', 'ARS', ...divisasItems])].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <Button className="w-full" size="sm" onClick={handleUnificar} loading={actualizarTC.isPending}>
                  <RefreshCw className="w-4 h-4" />
                  Aplicar Conversión
                </Button>
                {Object.keys(prefactura.tiposCambio || {}).length > 0 && (
                  <p className="text-xs text-slate-400">
                    TC aplicados: {Object.entries(prefactura.tiposCambio).map(([m, v]) => `${m} ${Number(v).toLocaleString('es-AR')}`).join(' • ')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Totales */}
          <Card>
            <CardHeader>
              <CardTitle>Totales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">
                  {prefactura.moneda} {prefactura.subtotal?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IVA</span>
                <span className="font-medium">
                  {prefactura.moneda} {prefactura.iva?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <hr />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary-600">
                  {prefactura.moneda} {prefactura.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Factura generada */}
          {prefactura.factura && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-green-600" />
                  Factura Generada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-green-600">{prefactura.factura.numeroCompleto}</p>
                <p className="text-sm text-slate-500">{formatDate(prefactura.factura.fecha)}</p>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="mt-3 w-full"
                  onClick={() => navigate(`/facturas/${prefactura.factura.id}`)}
                >
                  Ver Factura
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default PrefacturaDetalle;
