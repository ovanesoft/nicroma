import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, TrendingUp, Users, AlertTriangle, Clock, 
  CreditCard, ArrowUpRight, ArrowDownRight, Eye, RefreshCcw,
  CheckCircle, XCircle, Pause, Play, ChevronRight
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui';
import { 
  useAdminBillingStats, 
  useAdminBillingAlerts,
  useAdminSubscriptions,
  useAdminSuspendSubscription,
  useAdminReactivateSubscription
} from '../../hooks/useApi';

const BillingDashboard = () => {
  const navigate = useNavigate();
  const { data: statsData, isLoading: loadingStats } = useAdminBillingStats();
  const { data: alertsData, isLoading: loadingAlerts, refetch: refetchAlerts } = useAdminBillingAlerts();
  const { data: subscriptionsData } = useAdminSubscriptions({ limit: 5 });

  const stats = statsData?.data || {};
  const alerts = alertsData?.data || {};
  const recentSubscriptions = subscriptionsData?.data?.subscriptions || [];

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (loadingStats) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              Panel de Billing
            </h1>
            <p style={{ color: 'var(--color-textSecondary)' }}>
              Gestión de suscripciones, pagos y promociones
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/admin/billing/promociones')}>
              Promociones
            </Button>
            <Button onClick={() => navigate('/admin/billing/suscripciones')}>
              Ver todas las suscripciones
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="MRR"
            value={formatPrice(stats.mrr)}
            subtitle="Ingresos recurrentes mensuales"
            icon={DollarSign}
            color="green"
            trend={stats.mrrGrowth}
          />
          <StatCard
            title="ARR"
            value={formatPrice(stats.arr)}
            subtitle="Ingresos anualizados"
            icon={TrendingUp}
            color="indigo"
          />
          <StatCard
            title="Suscripciones activas"
            value={stats.activeSubscriptions || 0}
            subtitle={`${stats.activeTrials || 0} en trial`}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Facturado este mes"
            value={formatPrice(stats.monthlyRevenue)}
            subtitle={`${stats.monthlyTransactions || 0} transacciones`}
            icon={CreditCard}
            color="purple"
          />
        </div>

        {/* Alerts Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Failed Payments Alert */}
          <AlertCard
            title="Pagos fallidos"
            count={alerts.summary?.failedPaymentsCount || 0}
            icon={XCircle}
            color="red"
            items={alerts.failedPayments?.slice(0, 3).map(p => ({
              name: p.tenants?.name || 'Sin nombre',
              subtitle: formatDate(p.created_at),
              amount: formatPrice(p.amount),
            }))}
            onViewAll={() => navigate('/admin/billing/suscripciones?filter=failed')}
          />

          {/* Expiring Trials Alert */}
          <AlertCard
            title="Trials por vencer"
            count={alerts.summary?.expiringTrialsCount || 0}
            icon={Clock}
            color="amber"
            items={alerts.expiringTrials?.slice(0, 3).map(s => ({
              name: s.tenants?.name || 'Sin nombre',
              subtitle: `Vence ${formatDate(s.trial_ends_at)}`,
            }))}
            onViewAll={() => navigate('/admin/billing/suscripciones?filter=trialing')}
          />

          {/* Past Due Alert */}
          <AlertCard
            title="Pagos pendientes"
            count={alerts.summary?.pastDueCount || 0}
            icon={AlertTriangle}
            color="orange"
            items={alerts.pastDue?.slice(0, 3).map(s => ({
              name: s.tenants?.name || 'Sin nombre',
              subtitle: s.tenants?.companyEmail,
            }))}
            onViewAll={() => navigate('/admin/billing/suscripciones?filter=past_due')}
          />
        </div>

        {/* Status Breakdown & Recent */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Estado de suscripciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <StatusBar label="Activas" count={stats.statusBreakdown?.active || 0} total={stats.activeSubscriptions || 1} color="green" />
                <StatusBar label="En trial" count={stats.statusBreakdown?.trialing || 0} total={stats.activeSubscriptions || 1} color="blue" />
                <StatusBar label="Pago pendiente" count={stats.statusBreakdown?.past_due || 0} total={stats.activeSubscriptions || 1} color="amber" />
                <StatusBar label="Canceladas" count={stats.statusBreakdown?.cancelled || 0} total={stats.activeSubscriptions || 1} color="red" />
                <StatusBar label="Suspendidas" count={stats.statusBreakdown?.suspended || 0} total={stats.activeSubscriptions || 1} color="slate" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Subscriptions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Últimas suscripciones</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/billing/suscripciones')}>
                Ver todas
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSubscriptions.map((sub) => (
                  <div 
                    key={sub.id} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    style={{ backgroundColor: 'var(--color-background)' }}
                    onClick={() => navigate(`/admin/billing/suscripciones/${sub.tenant_id}`)}
                  >
                    <div>
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {sub.tenants?.name || 'Sin nombre'}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                        {sub.subscription_plans?.name || 'Sin plan'}
                      </p>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>
                ))}
                {recentSubscriptions.length === 0 && (
                  <p className="text-center py-8" style={{ color: 'var(--color-textSecondary)' }}>
                    No hay suscripciones aún
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickAction
                icon={RefreshCcw}
                title="Recargar alertas"
                onClick={() => refetchAlerts()}
              />
              <QuickAction
                icon={CreditCard}
                title="Ver todos los pagos"
                onClick={() => navigate('/admin/billing/pagos')}
              />
              <QuickAction
                icon={Users}
                title="Gestionar suscripciones"
                onClick={() => navigate('/admin/billing/suscripciones')}
              />
              <QuickAction
                icon={DollarSign}
                title="Crear promoción"
                onClick={() => navigate('/admin/billing/promociones')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => {
  const colors = {
    green: 'bg-green-100 text-green-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>{title}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>{value}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-textSecondary)' }}>{subtitle}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-3 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(trend)}% vs mes anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Alert Card Component
const AlertCard = ({ title, count, icon: Icon, color, items, onViewAll }) => {
  const colors = {
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <Card className={count > 0 ? `ring-2 ring-${color}-200` : ''}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{title}</p>
            <p className="text-2xl font-bold" style={{ color: count > 0 ? `var(--color-${color === 'red' ? 'danger' : 'warning'})` : 'var(--color-text)' }}>
              {count}
            </p>
          </div>
        </div>

        {items && items.length > 0 && (
          <div className="space-y-2 mb-4">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg" style={{ backgroundColor: 'var(--color-background)' }}>
                <div>
                  <p style={{ color: 'var(--color-text)' }}>{item.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>{item.subtitle}</p>
                </div>
                {item.amount && <span className="font-medium" style={{ color: 'var(--color-text)' }}>{item.amount}</span>}
              </div>
            ))}
          </div>
        )}

        {count > 0 && (
          <Button variant="outline" size="sm" className="w-full" onClick={onViewAll}>
            Ver todos
            <Eye className="w-4 h-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// Status Bar Component
const StatusBar = ({ label, count, total, color }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colors = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    slate: 'bg-slate-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm" style={{ color: 'var(--color-text)' }}>{label}</span>
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{count}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div 
          className={`h-full rounded-full ${colors[color]} transition-all`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const badges = {
    active: { color: 'bg-green-100 text-green-700', text: 'Activa' },
    trialing: { color: 'bg-blue-100 text-blue-700', text: 'Trial' },
    past_due: { color: 'bg-amber-100 text-amber-700', text: 'Pendiente' },
    cancelled: { color: 'bg-red-100 text-red-700', text: 'Cancelada' },
    suspended: { color: 'bg-slate-100 text-slate-700', text: 'Suspendida' },
  };
  const badge = badges[status] || badges.active;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
      {badge.text}
    </span>
  );
};

// Quick Action Component
const QuickAction = ({ icon: Icon, title, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors text-left w-full"
    style={{ backgroundColor: 'var(--color-background)' }}
  >
    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
      <Icon className="w-5 h-5 text-indigo-600" />
    </div>
    <span className="font-medium" style={{ color: 'var(--color-text)' }}>{title}</span>
  </button>
);

export default BillingDashboard;
