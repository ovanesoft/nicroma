import { useNavigate } from 'react-router-dom';
import { 
  Ship, Users, FileText, DollarSign, TrendingUp, Receipt, 
  Clock, CheckCircle, AlertCircle, ArrowRight, Building,
  Calendar, Package, ExternalLink, Globe, FileCheck, MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useStats, useCompanyConfig, useNotificaciones } from '../../hooks/useApi';
import { formatDate, cn } from '../../lib/utils';

const ESTADO_COLORS = {
  HOUSE: 'bg-blue-100 text-blue-700',
  EN_TRANSITO: 'bg-amber-100 text-amber-700',
  ARRIBADA: 'bg-green-100 text-green-700',
  CERRADA: 'bg-slate-100 text-slate-700',
  PENDIENTE: 'bg-amber-100 text-amber-700',
  PAGADA: 'bg-green-100 text-green-700',
  PAGADA_PARCIAL: 'bg-blue-100 text-blue-700'
};

function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useStats();
  const { data: companyData } = useCompanyConfig();
  const { data: notifData } = useNotificaciones();

  const stats = data?.data || {};
  const notificaciones = notifData?.data?.notificaciones || {};
  const portalSlug = companyData?.data?.portal?.slug;
  const portalEnabled = companyData?.data?.portal?.enabled;
  const frontendUrl = window.location.origin;
  const carpetas = stats.carpetas || {};
  const facturacion = stats.facturacion || {};
  const clientes = stats.clientes || {};
  const recientes = stats.recientes || {};

  const kpis = [
    {
      title: 'Carpetas Activas',
      value: carpetas.total || 0,
      subtitle: `${carpetas.delMes || 0} este mes`,
      icon: Ship,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      href: '/carpetas'
    },
    {
      title: 'En Tránsito',
      value: carpetas.enTransito || 0,
      subtitle: 'Operaciones en curso',
      icon: Package,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50',
      href: '/carpetas?estado=EN_TRANSITO'
    },
    {
      title: 'Por Cobrar',
      value: `$${(facturacion.totalPorCobrar || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
      subtitle: `${facturacion.facturasPendientes || 0} facturas pendientes`,
      icon: DollarSign,
      color: 'bg-red-500',
      lightColor: 'bg-red-50',
      href: '/facturas?estado=PENDIENTE'
    },
    {
      title: 'Cobrado este Mes',
      value: `$${(facturacion.cobradoDelMes || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
      subtitle: stats.periodo ? `${stats.periodo.mes} ${stats.periodo.año}` : '',
      icon: TrendingUp,
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      href: '/facturas'
    }
  ];

  const quickActions = [
    { label: 'Nueva Carpeta', href: '/carpetas/nueva', icon: Ship },
    { label: 'Nuevo Cliente', href: '/clientes', icon: Building },
    { label: 'Ver Prefacturas', href: '/prefacturas', icon: FileText },
    { label: 'Ver Facturas', href: '/facturas', icon: Receipt }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-slate-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Hola, {user?.first_name || 'Usuario'}
          </h2>
          <p className="text-slate-500">
            Resumen de tu organización · {stats.periodo?.mes} {stats.periodo?.año}
          </p>
        </div>
      </div>

      {/* Acceso al Portal de Clientes */}
      {portalEnabled && portalSlug && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-lg">
              <Globe className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-indigo-900">Portal de Clientes</p>
              <p className="text-sm text-indigo-600">{frontendUrl}/portal/{portalSlug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`${frontendUrl}/portal/${portalSlug}`);
                // toast se importa por separado si lo necesitás
              }}
              className="text-indigo-700 border-indigo-300 hover:bg-indigo-100"
            >
              Copiar link
            </Button>
            <a 
              href={`${frontendUrl}/portal/${portalSlug}`}
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <ExternalLink className="w-4 h-4" />
                Abrir Portal
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Alertas de solicitudes nuevas */}
      {((notificaciones.presupuestosPendientes || 0) > 0 || (notificaciones.predespachosPendientes || 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(notificaciones.presupuestosPendientes || 0) > 0 && (
            <div 
              className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => navigate('/presupuestos')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-900">
                    {notificaciones.presupuestosPendientes} solicitud{notificaciones.presupuestosPendientes !== 1 ? 'es' : ''} de presupuesto
                  </p>
                  <p className="text-sm text-amber-600">Nuevas solicitudes de clientes por atender</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-amber-500" />
            </div>
          )}
          {(notificaciones.predespachosPendientes || 0) > 0 && (
            <div 
              className="flex items-center justify-between p-4 rounded-xl border border-indigo-200 bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-colors"
              onClick={() => navigate('/predespachos')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 rounded-lg">
                  <FileCheck className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-indigo-900">
                    {notificaciones.predespachosPendientes} solicitud{notificaciones.predespachosPendientes !== 1 ? 'es' : ''} de predespacho
                  </p>
                  <p className="text-sm text-indigo-600">Nuevos pedidos de fondos por atender</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-500" />
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <Card 
            key={index} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(kpi.href)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className={cn('p-3 rounded-xl', kpi.lightColor)}>
                  <kpi.icon className={cn('w-6 h-6', kpi.color.replace('bg-', 'text-'))} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
                <p className="text-sm text-slate-500">{kpi.title}</p>
                <p className="text-xs text-slate-400 mt-1">{kpi.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => navigate(action.href)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <action.icon className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="font-medium text-slate-700">{action.label}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Resumen de Estados */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Carpetas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(carpetas.porEstado || {}).map(([estado, count]) => (
                <div key={estado} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-3 h-3 rounded-full',
                      ESTADO_COLORS[estado]?.replace('text-', 'bg-').split(' ')[0] || 'bg-slate-300'
                    )} />
                    <span className="text-sm text-slate-600">{estado.replace('_', ' ')}</span>
                  </div>
                  <span className="font-semibold text-slate-800">{count}</span>
                </div>
              ))}
              {Object.keys(carpetas.porEstado || {}).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">Sin datos</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mini Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-600">Clientes Activos</span>
                </div>
                <span className="font-bold text-slate-800">{clientes.total || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-600">Prefacturas Pendientes</span>
                </div>
                <span className="font-bold text-slate-800">{facturacion.prefacturasPendientes || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-600">Facturas del Mes</span>
                </div>
                <span className="font-bold text-slate-800">{facturacion.facturasDelMes || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas Carpetas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Últimas Carpetas</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/carpetas')}>
              Ver todas
            </Button>
          </CardHeader>
          <CardContent>
            {recientes.carpetas?.length > 0 ? (
              <div className="space-y-3">
                {recientes.carpetas.map((c) => (
                  <div 
                    key={c.id}
                    onClick={() => navigate(`/carpetas/${c.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Ship className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{c.numero}</p>
                        <p className="text-xs text-slate-500">{c.cliente || 'Sin cliente'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        ESTADO_COLORS[c.estado] || 'bg-slate-100'
                      )}>
                        {c.estado}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        {c.puertoOrigen} → {c.puertoDestino}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No hay carpetas recientes</p>
            )}
          </CardContent>
        </Card>

        {/* Últimas Facturas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Últimas Facturas</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/facturas')}>
              Ver todas
            </Button>
          </CardHeader>
          <CardContent>
            {recientes.facturas?.length > 0 ? (
              <div className="space-y-3">
                {recientes.facturas.map((f) => (
                  <div 
                    key={f.id}
                    onClick={() => navigate(`/facturas/${f.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{f.tipo} {f.numero}</p>
                        <p className="text-xs text-slate-500">{f.cliente || 'Sin cliente'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">
                        {f.moneda} {f.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        ESTADO_COLORS[f.estado] || 'bg-slate-100'
                      )}>
                        {f.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No hay facturas recientes</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AdminDashboard;
