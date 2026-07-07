import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Receipt, XCircle, DollarSign, Building, Calendar, Ship, FileText,
  Send, CheckCircle, QrCode, Download, RefreshCw
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input,
  Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter
} from '../../components/ui';
import { useFactura, useAnularFactura, useRegistrarCobranza, useEmitirDesdeFactura, useFiscalConfig } from '../../hooks/useApi';
import { formatDate, cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const ESTADOS = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  PAGADA_PARCIAL: { label: 'Pago Parcial', color: 'bg-blue-100 text-blue-700' },
  PAGADA: { label: 'Pagada', color: 'bg-green-100 text-green-700' },
  VENCIDA: { label: 'Vencida', color: 'bg-red-100 text-red-700' },
  ANULADA: { label: 'Anulada', color: 'bg-slate-100 text-slate-700' }
};

function FacturaDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const { data, isLoading, refetch } = useFactura(id);
  const { data: fiscalConfigData } = useFiscalConfig();
  const anular = useAnularFactura();
  const registrarCobranza = useRegistrarCobranza();
  const emitirCAE = useEmitirDesdeFactura(id);

  const [cobranzaModal, setCobranzaModal] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [cobranzaForm, setCobranzaForm] = useState({ 
    monto: '', 
    medioPago: 'Transferencia', 
    referencia: '' 
  });

  const factura = data?.data?.factura;

  const handleAnular = async () => {
    if (!confirm('¿Anular esta factura?')) return;
    try {
      await anular.mutateAsync(id);
      refetch();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al anular');
    }
  };

  const handleCobranza = async () => {
    try {
      await registrarCobranza.mutateAsync({
        facturaId: id,
        ...cobranzaForm
      });
      setCobranzaModal(false);
      setCobranzaForm({ monto: '', medioPago: 'Transferencia', referencia: '' });
      refetch();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al registrar cobranza');
    }
  };

  const openCobranzaModal = () => {
    const pendiente = factura.total - (factura.cobranzas?.reduce((sum, c) => sum + c.monto, 0) || 0);
    setCobranzaForm({ 
      monto: pendiente.toFixed(2), 
      medioPago: 'Transferencia', 
      referencia: '' 
    });
    setCobranzaModal(true);
  };

  // Modal de emisión CAE con cotización editable
  const [emisionModal, setEmisionModal] = useState(false);
  const [cotizOficial, setCotizOficial] = useState(null);
  const [cotizManual, setCotizManual] = useState('');
  const [cargandoCotiz, setCargandoCotiz] = useState(false);

  const esMonedaExtranjera = factura && factura.moneda !== 'ARS';
  const limInf = cotizOficial ? cotizOficial * 0.98 : null;
  const limSup = cotizOficial ? cotizOficial * 5 : null;
  const cotizNum = parseFloat(cotizManual);
  const cotizValida = !esMonedaExtranjera || (
    cotizNum > 0 && (!cotizOficial || (cotizNum >= limInf && cotizNum <= limSup))
  );

  const abrirEmisionModal = async () => {
    setEmisionModal(true);
    if (!esMonedaExtranjera) return;
    setCargandoCotiz(true);
    try {
      const MONEDA_AFIP = { USD: 'DOL', EUR: '060', BRL: '012' };
      const response = await api.get(`/fiscal/cotizacion?moneda=${MONEDA_AFIP[factura.moneda] || 'DOL'}`);
      const oficial = response.data?.data?.cotizacion;
      setCotizOficial(oficial);
      // Precargar: cotización de la factura si es válida, sino la oficial
      const propia = parseFloat(factura.cotizacion);
      setCotizManual(
        propia > 1 && oficial && propia >= oficial * 0.98 && propia <= oficial * 5
          ? String(propia)
          : String(oficial ?? '')
      );
    } catch {
      toast.error('No se pudo obtener la cotización oficial de ARCA. Podés ingresarla manualmente.');
      setCotizOficial(null);
      setCotizManual(factura.cotizacion > 1 ? String(factura.cotizacion) : '');
    } finally {
      setCargandoCotiz(false);
    }
  };

  const handleEmitirCAE = async () => {
    setEmitiendo(true);
    try {
      const payload = esMonedaExtranjera && cotizNum > 0 ? { cotizacion: cotizNum } : {};
      const result = await emitirCAE.mutateAsync(payload);
      if (result.success) {
        if (result.data?.advertencia) {
          toast.error(result.data.advertencia, { duration: 10000 });
        }
        toast.success(`CAE obtenido: ${result.data.cae}`, { duration: 8000 });
        setEmisionModal(false);
        refetch();
      } else {
        toast.error(result.error || 'Error al emitir');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al emitir factura electrónica', { duration: 10000 });
    } finally {
      setEmitiendo(false);
    }
  };

  const [recuperando, setRecuperando] = useState(false);
  const handleRecuperarCAE = async () => {
    if (!confirm('¿Buscar en ARCA el CAE de esta factura? Se consultará el último comprobante autorizado y, si el importe coincide, se guardará el CAE en el sistema.')) return;
    setRecuperando(true);
    try {
      const result = await api.post(`/fiscal/recuperar-cae/${id}`, {});
      toast.success(result.data.message, { duration: 8000 });
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo recuperar el CAE', { duration: 10000 });
    } finally {
      setRecuperando(false);
    }
  };

  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const handleDescargarPdf = async () => {
    setDescargandoPdf(true);
    try {
      const response = await api.get(`/facturas/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Factura_${factura.numeroCompleto}.pdf`);
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

  const fiscalConfig = fiscalConfigData?.data;
  const canEmitCAE = fiscalConfig?.status === 'ACTIVE' && !factura?.cae && factura?.estado !== 'ANULADA';

  if (isLoading) {
    return (
      <Layout title="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  if (!factura) {
    return (
      <Layout title="Factura no encontrada">
        <Button variant="ghost" onClick={() => navigate('/facturas')}>
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
      </Layout>
    );
  }

  const totalCobrado = factura.cobranzas?.reduce((sum, c) => sum + c.monto, 0) || 0;
  const saldoPendiente = factura.total - totalCobrado;

  return (
    <Layout 
      title={`Factura ${factura.tipoComprobante} ${factura.numeroCompleto}`}
      subtitle="Detalle de factura"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/facturas')}>
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDescargarPdf} loading={descargandoPdf}>
            <Download className="w-4 h-4" />
            Descargar PDF
          </Button>
          {canEmitCAE && (
            <>
              <Button 
                onClick={abrirEmisionModal} 
                disabled={emitiendo}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4" />
                Emitir CAE
              </Button>
              <Button 
                variant="outline"
                onClick={handleRecuperarCAE}
                loading={recuperando}
                title="Si emitiste y el CAE quedó en ARCA pero no se guardó acá, usá esta opción"
              >
                <RefreshCw className="w-4 h-4" />
                Recuperar CAE
              </Button>
            </>
          )}
          {(factura.estado === 'PENDIENTE' || factura.estado === 'PAGADA_PARCIAL') && (
            <Button onClick={openCobranzaModal}>
              <DollarSign className="w-4 h-4" />
              Registrar Cobranza
            </Button>
          )}
          {factura.estado === 'PENDIENTE' && !factura.cae && (
            <Button variant="danger" onClick={handleAnular}>
              <XCircle className="w-4 h-4" />
              Anular
            </Button>
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
                  <Receipt className="w-5 h-5" />
                  {factura.tipoComprobante} {factura.numeroCompleto}
                </CardTitle>
                <span className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  ESTADOS[factura.estado]?.color
                )}>
                  {ESTADOS[factura.estado]?.label}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Fecha</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(factura.fecha)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Punto de Venta</p>
                  <p className="font-medium">{factura.puntoVenta.toString().padStart(4, '0')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Moneda</p>
                  <p className="font-medium">{factura.moneda}</p>
                </div>
                {factura.cae && (
                  <>
                    <div>
                      <p className="text-sm text-slate-500">CAE</p>
                      <p className="font-medium flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        {factura.cae}
                      </p>
                    </div>
                    {factura.vencimientoCAE && (
                      <div>
                        <p className="text-sm text-slate-500">Vto. CAE</p>
                        <p className="font-medium">{formatDate(factura.vencimientoCAE)}</p>
                      </div>
                    )}
                  </>
                )}
                {!factura.cae && fiscalConfig?.status === 'ACTIVE' && factura.estado !== 'ANULADA' && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500">Factura Electrónica</p>
                    <p className="text-amber-600 text-sm flex items-center gap-1">
                      <Send className="w-4 h-4" />
                      Pendiente de emisión a AFIP
                    </p>
                  </div>
                )}
                {factura.carpeta && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500">Carpeta asociada</p>
                    <p className="font-medium flex items-center gap-1 text-primary-600">
                      <Ship className="w-4 h-4" />
                      {factura.carpeta.numero}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
                      <th className="pb-3 font-medium text-right">Cantidad</th>
                      <th className="pb-3 font-medium text-right">Precio Unit.</th>
                      <th className="pb-3 font-medium text-right">Subtotal</th>
                      <th className="pb-3 font-medium text-right">IVA</th>
                      <th className="pb-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factura.items?.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-3 text-slate-700">{item.descripcion}</td>
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

          {/* Cobranzas */}
          {factura.cobranzas?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Cobranzas Registradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-slate-500 border-b">
                        <th className="pb-3 font-medium">Número</th>
                        <th className="pb-3 font-medium">Fecha</th>
                        <th className="pb-3 font-medium">Medio</th>
                        <th className="pb-3 font-medium">Referencia</th>
                        <th className="pb-3 font-medium text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {factura.cobranzas.map((cob, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-3 font-medium text-slate-700">{cob.numero}</td>
                          <td className="py-3">{formatDate(cob.fecha)}</td>
                          <td className="py-3">{cob.medioPago}</td>
                          <td className="py-3 text-slate-500">{cob.referencia || '—'}</td>
                          <td className="py-3 text-right font-medium text-green-600">
                            {cob.moneda} {cob.monto?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
              <p className="font-medium text-slate-800">{factura.cliente?.razonSocial}</p>
              <p className="text-sm text-slate-500">
                {factura.cliente?.tipoDocumento}: {factura.cliente?.numeroDocumento}
              </p>
              {factura.cliente?.email && (
                <p className="text-sm text-slate-500 mt-2">{factura.cliente.email}</p>
              )}
            </CardContent>
          </Card>

          {/* Totales */}
          <Card>
            <CardHeader>
              <CardTitle>Totales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">
                  {factura.moneda} {factura.subtotal?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IVA</span>
                <span className="font-medium">
                  {factura.moneda} {factura.iva?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <hr />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold">
                  {factura.moneda} {factura.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {totalCobrado > 0 && (
                <>
                  <hr />
                  <div className="flex justify-between text-green-600">
                    <span>Cobrado</span>
                    <span className="font-medium">
                      {factura.moneda} {totalCobrado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>Saldo Pendiente</span>
                    <span className="font-bold">
                      {factura.moneda} {saldoPendiente.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Prefactura origen */}
          {factura.prefactura && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Prefactura Origen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{factura.prefactura.numero}</p>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="mt-3 w-full"
                  onClick={() => navigate(`/prefacturas/${factura.prefactura.id}`)}
                >
                  Ver Prefactura
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Cobranza */}
      <Modal open={cobranzaModal} onClose={() => setCobranzaModal(false)}>
        <ModalHeader onClose={() => setCobranzaModal(false)}>
          <ModalTitle>Registrar Cobranza</ModalTitle>
        </ModalHeader>
        <ModalContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Saldo pendiente: <strong>{factura?.moneda} {saldoPendiente?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
          </p>
          <Input
            label="Monto"
            type="number"
            step="0.01"
            value={cobranzaForm.monto}
            onChange={(e) => setCobranzaForm(prev => ({ ...prev, monto: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Medio de Pago</label>
            <select
              value={cobranzaForm.medioPago}
              onChange={(e) => setCobranzaForm(prev => ({ ...prev, medioPago: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
            >
              <option value="Transferencia">Transferencia</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Cheque">Cheque</option>
              <option value="Tarjeta">Tarjeta</option>
            </select>
          </div>
          <Input
            label="Referencia"
            placeholder="Nro. de transferencia, cheque, etc."
            value={cobranzaForm.referencia}
            onChange={(e) => setCobranzaForm(prev => ({ ...prev, referencia: e.target.value }))}
          />
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setCobranzaModal(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCobranza} loading={registrarCobranza.isPending}>
            Registrar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Emisión CAE con cotización */}
      <Modal open={emisionModal} onClose={() => setEmisionModal(false)}>
        <ModalHeader onClose={() => setEmisionModal(false)}>
          <ModalTitle>Emitir Factura Electrónica</ModalTitle>
        </ModalHeader>
        <ModalContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Se emitirá la factura <span className="font-mono font-medium">{factura.numeroCompleto}</span> ante ARCA.
            Esta acción no se puede deshacer.
          </p>

          {esMonedaExtranjera && (
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-emerald-800">
                Tipo de cambio ({factura.moneda} → ARS)
              </p>
              {cargandoCotiz ? (
                <p className="text-sm text-slate-500">Consultando cotización oficial de ARCA...</p>
              ) : (
                <>
                  {cotizOficial && (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Cotización oficial ARCA:</span>
                      <span className="font-bold tabular-nums">
                        $ {cotizOficial.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Cotización a utilizar
                    </label>
                    <input
                      type="number" step="0.01"
                      value={cotizManual}
                      onChange={(e) => setCotizManual(e.target.value)}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border text-sm text-right tabular-nums outline-none focus:ring-2',
                        cotizValida
                          ? 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                          : 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                      )}
                    />
                  </div>
                  {cotizOficial && (
                    <p className={cn('text-xs', cotizValida ? 'text-slate-500' : 'text-red-600 font-medium')}>
                      {cotizValida
                        ? `Rango aceptado por ARCA: $ ${limInf.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (-2%) a $ ${limSup.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (+400%)`
                        : `⚠ Fuera del rango de ARCA: debe estar entre $ ${limInf.toLocaleString('es-AR', { minimumFractionDigits: 2 })} y $ ${limSup.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setEmisionModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleEmitirCAE}
            disabled={emitiendo || cargandoCotiz || !cotizValida}
            loading={emitiendo}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4" />
            {emitiendo ? 'Emitiendo...' : 'Confirmar y Emitir'}
          </Button>
        </ModalFooter>
      </Modal>
    </Layout>
  );
}

export default FacturaDetalle;
