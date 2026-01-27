import { useParams, Link } from 'react-router-dom';
import { 
  FileText, DollarSign, Calendar, ArrowLeft, Building,
  CheckCircle, Clock, AlertCircle, Download, QrCode
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, Button, Badge } from '../../components/ui';
import { usePortalFactura } from '../../hooks/useApi';
import { formatDate, formatCurrency, cn } from '../../lib/utils';

const estadoColors = {
  'PENDIENTE': 'bg-yellow-100 text-yellow-700',
  'PAGADA': 'bg-green-100 text-green-700',
  'PAGADA_PARCIAL': 'bg-blue-100 text-blue-700',
  'VENCIDA': 'bg-red-100 text-red-700',
  'ANULADA': 'bg-gray-100 text-gray-700'
};

const estadoLabels = {
  'PENDIENTE': 'Pendiente de Pago',
  'PAGADA': 'Pagada',
  'PAGADA_PARCIAL': 'Pago Parcial',
  'VENCIDA': 'Vencida',
  'ANULADA': 'Anulada'
};

export default function FacturaDetalle() {
  const { id } = useParams();
  const { data, isLoading, error } = usePortalFactura(id);
  const factura = data?.data;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !factura) {
    return (
      <Layout>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Factura no encontrada</h2>
          <Link to="/mis-facturas">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Mis Facturas
            </Button>
          </Link>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/mis-facturas">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Factura {factura.numero}
              </h1>
              <span className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                estadoColors[factura.estado] || 'bg-gray-100 text-gray-700'
              )}>
                {estadoLabels[factura.estado] || factura.estado}
              </span>
            </div>
            <p className="text-gray-500 mt-1">
              {factura.tipo} • Emitida el {formatDate(factura.fecha)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info de la factura */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos generales */}
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Datos del Comprobante
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">TIPO</p>
                  <p className="font-medium">{factura.tipo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">NÚMERO</p>
                  <p className="font-mono font-medium">{factura.numero}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">FECHA EMISIÓN</p>
                  <p className="font-medium">{formatDate(factura.fecha)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">FECHA VENCIMIENTO</p>
                  <p className="font-medium">{factura.fechaVencimiento ? formatDate(factura.fechaVencimiento) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">MONEDA</p>
                  <p className="font-medium">{factura.moneda}</p>
                </div>
                {factura.cotizacion && factura.moneda !== 'ARS' && (
                  <div>
                    <p className="text-xs text-gray-500">COTIZACIÓN</p>
                    <p className="font-medium">{factura.cotizacion}</p>
                  </div>
                )}
              </div>

              {factura.carpeta && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500">CARPETA ASOCIADA</p>
                  <p className="font-medium">{factura.carpeta.numero}</p>
                </div>
              )}
            </Card>

            {/* Items */}
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Detalle</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500">
                      <th className="pb-3 font-medium">CONCEPTO</th>
                      <th className="pb-3 font-medium text-right">CANT.</th>
                      <th className="pb-3 font-medium text-right">P. UNIT.</th>
                      <th className="pb-3 font-medium text-right">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {factura.items?.map((item, i) => (
                      <tr key={i} className="text-sm">
                        <td className="py-3">
                          <p className="font-medium">{item.concepto}</p>
                          {item.descripcion && (
                            <p className="text-gray-500 text-xs">{item.descripcion}</p>
                          )}
                        </td>
                        <td className="py-3 text-right">{item.cantidad}</td>
                        <td className="py-3 text-right">{formatCurrency(item.precioUnitario, factura.moneda)}</td>
                        <td className="py-3 text-right font-medium">{formatCurrency(item.subtotal, factura.moneda)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t">
                    <tr className="text-sm">
                      <td colSpan="3" className="py-3 text-right text-gray-500">Subtotal</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(factura.subtotal, factura.moneda)}</td>
                    </tr>
                    {factura.iva > 0 && (
                      <tr className="text-sm">
                        <td colSpan="3" className="py-1 text-right text-gray-500">IVA (21%)</td>
                        <td className="py-1 text-right">{formatCurrency(factura.iva, factura.moneda)}</td>
                      </tr>
                    )}
                    {factura.percepcionIVA > 0 && (
                      <tr className="text-sm">
                        <td colSpan="3" className="py-1 text-right text-gray-500">Percepción IVA</td>
                        <td className="py-1 text-right">{formatCurrency(factura.percepcionIVA, factura.moneda)}</td>
                      </tr>
                    )}
                    {factura.percepcionIIBB > 0 && (
                      <tr className="text-sm">
                        <td colSpan="3" className="py-1 text-right text-gray-500">Percepción IIBB</td>
                        <td className="py-1 text-right">{formatCurrency(factura.percepcionIIBB, factura.moneda)}</td>
                      </tr>
                    )}
                    <tr className="text-lg font-bold">
                      <td colSpan="3" className="py-3 text-right">Total</td>
                      <td className="py-3 text-right text-blue-600">{formatCurrency(factura.total, factura.moneda)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            {/* Cobranzas */}
            {factura.cobranzas?.length > 0 && (
              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Pagos Registrados
                </h3>
                <div className="space-y-3">
                  {factura.cobranzas.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">{formatCurrency(c.monto, factura.moneda)}</p>
                          <p className="text-xs text-green-600">{c.medioPago} • {formatDate(c.fecha)}</p>
                        </div>
                      </div>
                      {c.referencia && (
                        <span className="text-sm text-green-600">Ref: {c.referencia}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Resumen lateral */}
          <div className="space-y-6">
            {/* Totales */}
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Resumen</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Total factura</span>
                  <span className="font-bold text-xl">{formatCurrency(factura.total, factura.moneda)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Total pagado</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(factura.totalCobrado, factura.moneda)}
                  </span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Saldo pendiente</span>
                  <span className={cn(
                    "font-bold text-xl",
                    factura.saldoPendiente > 0 ? 'text-yellow-600' : 'text-green-600'
                  )}>
                    {formatCurrency(factura.saldoPendiente, factura.moneda)}
                  </span>
                </div>
              </div>

              {factura.saldoPendiente > 0 && (
                <div className="mt-6">
                  <Link to="/pagos">
                    <Button className="w-full">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Ir a Pagos
                    </Button>
                  </Link>
                </div>
              )}
            </Card>

            {/* CAE */}
            {factura.cae && (
              <Card className="p-6 bg-green-50 border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm font-medium text-green-800">Comprobante Electrónico</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-green-600">CAE</p>
                    <p className="font-mono font-medium text-green-900">{factura.cae}</p>
                  </div>
                  {factura.vencimientoCAE && (
                    <div>
                      <p className="text-xs text-green-600">Vencimiento CAE</p>
                      <p className="font-medium text-green-900">{formatDate(factura.vencimientoCAE)}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Acciones */}
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Acciones</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                * Próximamente podrás descargar tus comprobantes
              </p>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
