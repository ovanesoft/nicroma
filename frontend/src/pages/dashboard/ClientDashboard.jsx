import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Ship, FileText, MapPin, Package, CreditCard, Clock, 
  CheckCircle, AlertCircle, ArrowRight, TrendingUp, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { usePortalDashboard } from '../../hooks/useApi';
import { cn, formatDate, formatCurrency } from '../../lib/utils';

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
  
  const dashboardData = data?.data || {};
  const stats = dashboardData.stats || {};
  const enviosRecientes = dashboardData.enviosRecientes || [];
  const facturasRecientes = dashboardData.facturasRecientes || [];

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
    </div>
  );
}

export default ClientDashboard;
