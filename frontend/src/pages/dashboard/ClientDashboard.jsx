import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Ship, FileText, MapPin, Package, CreditCard, Clock, 
  CheckCircle, AlertCircle, ArrowRight, TrendingUp, RefreshCw,
  Landmark, Copy, Check, Wallet, Phone, Mail, FileCheck, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { usePortalDashboard, usePaymentInfo } from '../../hooks/useApi';
import { cn, formatDate, formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

const estadoColors = {
  'BORRADOR': 'bg-gray-100 text-gray-700',
  'CONFIRMADA': 'bg-blue-100 text-blue-700',
  'EN_TRANSITO': 'bg-yellow-100 text-yellow-700',
  'EN_PUERTO': 'bg-purple-100 text-purple-700',
  'DESPACHADA': 'bg-green-100 text-green-700',
  'ENTREGADA': 'bg-green-100 text-green-700',
  'CERRADA': 'bg-gray-100 text-gray-700',
  'CANCELADA': 'bg-red-100 text-red-700'
};

const estadoLabels = {
  'BORRADOR': 'Borrador',
  'CONFIRMADA': 'Confirmada',
  'EN_TRANSITO': 'En Tránsito',
  'EN_PUERTO': 'En Puerto',
  'DESPACHADA': 'Despachada',
  'ENTREGADA': 'Entregada',
  'CERRADA': 'Cerrada',
  'CANCELADA': 'Cancelada'
};

function StatCard({ title, value, icon: Icon, color, subtitle, loading }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">{title}</p>
            {loading ? (
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <p className="text-2xl font-bold text-slate-800">{value}</p>
            )}
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ShipmentCard({ shipment }) {
  const statusConfig = {
    'EN_TRANSITO': { icon: Ship },
    'EN_PUERTO': { icon: Package },
    'DESPACHADA': { icon: CheckCircle },
    'ENTREGADA': { icon: CheckCircle },
  };

  const config = statusConfig[shipment.estado] || { icon: Clock };
  const StatusIcon = config.icon;
  const colorClass = estadoColors[shipment.estado] || 'bg-slate-100 text-slate-700';

  return (
    <Link to={`/mis-envios/${shipment.id}`}>
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
        <div className="flex items-center gap-4">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClass)}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-slate-800">{shipment.numero}</p>
            <p className="text-sm text-slate-500">{shipment.origen || 'Origen'} → {shipment.destino || 'Destino'}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={cn('text-xs px-2 py-1 rounded-full', colorClass)}>
            {estadoLabels[shipment.estado] || shipment.estado}
          </span>
          {shipment.eta && (
            <p className="text-xs text-slate-400 mt-1">ETA: {formatDate(shipment.eta, 'short')}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

function ClientDashboard() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = usePortalDashboard();
  const { data: paymentData } = usePaymentInfo();
  const [copiedField, setCopiedField] = useState(null);
  
  const dashboardData = data?.data || {};
  const stats = dashboardData.stats || {};
  const enviosRecientes = dashboardData.enviosRecientes || [];
  const facturasRecientes = dashboardData.facturasRecientes || [];
  const predespachosRecientes = dashboardData.predespachosRecientes || [];
  const predespachosPendientes = dashboardData.predespachosPendientes || 0;
  const predespachosActivos = dashboardData.predespachosActivos || 0;
  const paymentInfo = paymentData?.data || {};

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Error al copiar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Hola, {user?.firstName || 'Cliente'}! 👋
            </h2>
            <p className="text-white/80">
              Bienvenido a tu portal. Aquí podés ver el estado de tus envíos, 
              facturas y más.
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Cliente no vinculado */}
      {!dashboardData.clienteId && !isLoading && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Cuenta pendiente de vinculación</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Tu cuenta aún no está vinculada a un perfil de cliente. 
                Contactá al administrador para que te asigne tus envíos y facturas.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Predespachos"
          value={predespachosActivos}
          icon={FileCheck}
          color="bg-indigo-500"
          subtitle={predespachosPendientes ? `${predespachosPendientes} para revisar` : null}
          loading={isLoading}
        />
        <StatCard
          title="Envíos Activos"
          value={stats.enviosActivos || 0}
          icon={Ship}
          color="bg-blue-500"
          subtitle={stats.enviosEnTransito ? `${stats.enviosEnTransito} en tránsito` : null}
          loading={isLoading}
        />
        <StatCard
          title="Facturas Pendientes"
          value={stats.facturasPendientes || 0}
          icon={FileText}
          color="bg-amber-500"
          loading={isLoading}
        />
        <StatCard
          title="Próxima Llegada"
          value={stats.proximaLlegada ? `${stats.proximaLlegada.diasRestantes} días` : '-'}
          icon={Clock}
          color="bg-green-500"
          subtitle={stats.proximaLlegada?.numero || null}
          loading={isLoading}
        />
        <StatCard
          title="Total Facturado"
          value={formatCurrency(stats.totalFacturado || 0)}
          icon={TrendingUp}
          color="bg-purple-500"
          subtitle="Este mes"
          loading={isLoading}
        />
      </div>

      {/* Alerta de predespachos pendientes de revisión */}
      {predespachosPendientes > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-purple-800">
                    Tenés {predespachosPendientes} predespacho{predespachosPendientes !== 1 ? 's' : ''} para revisar
                  </p>
                  <p className="text-sm text-purple-600">Revisalos y aprobá o rechazá</p>
                </div>
              </div>
              <Link to="/mis-predespachos">
                <Button size="sm">
                  Ver predespachos <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predespachos recientes */}
      {predespachosRecientes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Predespachos Recientes
            </CardTitle>
            <Link to="/mis-predespachos">
              <Button variant="ghost" size="sm">
                Ver todos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {predespachosRecientes.map(pd => {
              const estadoConfig = {
                'BORRADOR': { color: 'bg-slate-100 text-slate-700', label: 'Borrador' },
                'ENVIADO': { color: 'bg-purple-100 text-purple-700', label: 'Para revisar' },
                'APROBADO': { color: 'bg-green-100 text-green-700', label: 'Aprobado' },
                'RECHAZADO': { color: 'bg-red-100 text-red-700', label: 'Rechazado' },
                'EN_PROCESO': { color: 'bg-blue-100 text-blue-700', label: 'En Proceso' },
                'FINALIZADO': { color: 'bg-emerald-100 text-emerald-700', label: 'Finalizado' }
              };
              const estado = estadoConfig[pd.estado] || estadoConfig.BORRADOR;
              return (
                <Link key={pd.id} to={`/predespachos/${pd.id}`}>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', estado.color)}>
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{pd.numero}</p>
                        <p className="text-sm text-slate-500">{pd.mercaderia || pd.tipoDocumento?.replace(/_/g, ' ') || '-'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn('text-xs px-2 py-1 rounded-full', estado.color)}>
                        {estado.label}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">{pd.via || ''}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Envíos recientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Ship className="w-5 h-5" />
              Mis Envíos
            </CardTitle>
            <Link to="/mis-envios">
              <Button variant="ghost" size="sm">
                Ver todos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : enviosRecientes.length > 0 ? (
              enviosRecientes.map(shipment => (
                <ShipmentCard key={shipment.id} shipment={shipment} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Ship className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>No hay envíos recientes</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facturas recientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Mis Facturas
            </CardTitle>
            <Link to="/mis-facturas">
              <Button variant="ghost" size="sm">
                Ver todas <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl"></div>
                  ))}
                </div>
              ) : facturasRecientes.length > 0 ? (
                facturasRecientes.map(invoice => (
                  <Link key={invoice.id} to={`/mis-facturas/${invoice.id}`}>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-slate-800">{invoice.numero}</p>
                        <p className="text-sm text-slate-500">{formatDate(invoice.fecha, 'short')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">
                          {formatCurrency(invoice.total, invoice.moneda)}
                        </p>
                        <span className={cn(
                          'text-xs px-2 py-1 rounded-full',
                          invoice.estado === 'PAGADA' 
                            ? 'bg-green-100 text-green-700' 
                            : invoice.estado === 'VENCIDA'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        )}>
                          {invoice.estado === 'PAGADA' ? 'Pagada' : 
                           invoice.estado === 'VENCIDA' ? 'Vencida' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>No hay facturas recientes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link to="/mis-predespachos" className="block">
              <div className="p-4 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors">
                <FileCheck className="w-8 h-8 mx-auto text-indigo-500 mb-2" />
                <p className="text-sm font-medium text-slate-700">Predespachos</p>
              </div>
            </Link>
            <Link to="/tracking" className="block">
              <div className="p-4 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors">
                <MapPin className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <p className="text-sm font-medium text-slate-700">Tracking</p>
              </div>
            </Link>
            <Link to="/mis-facturas" className="block">
              <div className="p-4 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors">
                <FileText className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm font-medium text-slate-700">Facturas</p>
              </div>
            </Link>
            <Link to="/mis-envios" className="block">
              <div className="p-4 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors">
                <Package className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <p className="text-sm font-medium text-slate-700">Envíos</p>
              </div>
            </Link>
            <Link to="/pagos" className="block">
              <div className="p-4 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors">
                <CreditCard className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                <p className="text-sm font-medium text-slate-700">Pagos</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Información de Pago */}
      {paymentInfo.hasPaymentMethods && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Medios de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Transferencia Bancaria */}
              {(paymentInfo.bank?.cbu || paymentInfo.bank?.alias) && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-medium text-blue-800 flex items-center gap-2 mb-3">
                    <Landmark className="w-4 h-4" />
                    Transferencia Bancaria
                  </h4>
                  <div className="space-y-2 text-sm">
                    {paymentInfo.bank?.bankName && (
                      <p className="text-blue-700">
                        <span className="font-medium">Banco:</span> {paymentInfo.bank.bankName}
                      </p>
                    )}
                    {paymentInfo.bank?.holder && (
                      <p className="text-blue-700">
                        <span className="font-medium">Titular:</span> {paymentInfo.bank.holder}
                      </p>
                    )}
                    {paymentInfo.bank?.cuit && (
                      <p className="text-blue-700">
                        <span className="font-medium">CUIT:</span> {paymentInfo.bank.cuit}
                      </p>
                    )}
                    {paymentInfo.bank?.cbu && (
                      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 mt-2">
                        <div>
                          <span className="text-xs text-blue-600 font-medium">CBU</span>
                          <p className="font-mono text-blue-900">{paymentInfo.bank.cbu}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(paymentInfo.bank.cbu, 'cbu')}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          {copiedField === 'cbu' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-blue-500" />
                          )}
                        </button>
                      </div>
                    )}
                    {paymentInfo.bank?.alias && (
                      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                        <div>
                          <span className="text-xs text-blue-600 font-medium">Alias</span>
                          <p className="font-medium text-blue-900">{paymentInfo.bank.alias}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(paymentInfo.bank.alias, 'alias')}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          {copiedField === 'alias' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-blue-500" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pagos Digitales */}
              {(paymentInfo.digital?.mercadoPago || paymentInfo.digital?.paypal) && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="font-medium text-green-800 flex items-center gap-2 mb-3">
                    <Wallet className="w-4 h-4" />
                    Pagos Digitales
                  </h4>
                  <div className="space-y-2 text-sm">
                    {paymentInfo.digital?.mercadoPago && (
                      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                        <div>
                          <span className="text-xs text-green-600 font-medium">MercadoPago</span>
                          <p className="text-green-900">{paymentInfo.digital.mercadoPago}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(paymentInfo.digital.mercadoPago, 'mp')}
                          className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          {copiedField === 'mp' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-green-500" />
                          )}
                        </button>
                      </div>
                    )}
                    {paymentInfo.digital?.paypal && (
                      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                        <div>
                          <span className="text-xs text-green-600 font-medium">PayPal</span>
                          <p className="text-green-900">{paymentInfo.digital.paypal}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(paymentInfo.digital.paypal, 'paypal')}
                          className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          {copiedField === 'paypal' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-green-500" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Otros medios */}
              {(paymentInfo.other?.chequeOrder || paymentInfo.other?.otherMethods) && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <h4 className="font-medium text-purple-800 flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4" />
                    Otros Medios
                  </h4>
                  <div className="space-y-2 text-sm text-purple-700">
                    {paymentInfo.other?.chequeOrder && (
                      <p>
                        <span className="font-medium">Cheques a la orden de:</span> {paymentInfo.other.chequeOrder}
                      </p>
                    )}
                    {paymentInfo.other?.otherMethods && (
                      <p className="whitespace-pre-wrap">{paymentInfo.other.otherMethods}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notas */}
              {paymentInfo.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">Nota:</span> {paymentInfo.notes}
                  </p>
                </div>
              )}

              {/* Contacto */}
              {(paymentInfo.companyPhone || paymentInfo.companyEmail) && (
                <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    ¿Dudas sobre pagos? Contactanos:
                  </p>
                  {paymentInfo.companyPhone && (
                    <a 
                      href={`tel:${paymentInfo.companyPhone}`}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Phone className="w-4 h-4" />
                      {paymentInfo.companyPhone}
                    </a>
                  )}
                  {paymentInfo.companyEmail && (
                    <a 
                      href={`mailto:${paymentInfo.companyEmail}`}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Mail className="w-4 h-4" />
                      {paymentInfo.companyEmail}
                    </a>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ClientDashboard;
