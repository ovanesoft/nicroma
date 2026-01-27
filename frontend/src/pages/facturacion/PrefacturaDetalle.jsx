import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, FileText, CheckCircle, XCircle, Receipt, Building, Calendar, Ship
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../../components/ui';
import { 
  usePrefactura, useConfirmarPrefactura, useCancelarPrefactura, 
  useCreateFacturaDesdePrefactura 
} from '../../hooks/useApi';
import { formatDate, cn } from '../../lib/utils';

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

  const prefactura = data?.data?.prefactura;

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
    if (!confirm('¿Generar factura desde esta prefactura?')) return;
    try {
      const result = await facturar.mutateAsync({ prefacturaId: id });
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
                    {prefactura.items?.map((item, idx) => (
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
