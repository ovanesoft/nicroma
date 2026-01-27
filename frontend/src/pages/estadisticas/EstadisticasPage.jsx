import { useState } from 'react';
import { 
  BarChart3, TrendingUp, Ship, DollarSign, Users, Receipt,
  Calendar, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { useStats } from '../../hooks/useApi';
import { cn } from '../../lib/utils';

// Componente de barra simple
function BarChart({ data, maxValue, colorClass = 'bg-primary-500' }) {
  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <span className="text-sm text-slate-600 w-24 truncate">{item.label}</span>
          <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn('h-full rounded-full transition-all duration-500', colorClass)}
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-700 w-12 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// Componente de métrica con tendencia
function MetricCard({ title, value, subtitle, icon: Icon, trend, trendLabel, colorClass }) {
  const getTrendIcon = () => {
    if (trend > 0) return <ArrowUp className="w-4 h-4" />;
    if (trend < 0) return <ArrowDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (trend > 0) return 'text-green-600 bg-green-50';
    if (trend < 0) return 'text-red-600 bg-red-50';
    return 'text-slate-600 bg-slate-50';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className={cn('p-3 rounded-xl', colorClass)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', getTrendColor())}>
              {getTrendIcon()}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-slate-800">{value}</p>
          <p className="text-sm font-medium text-slate-600 mt-1">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de distribución circular simple
function DonutChart({ data, total }) {
  let cumulativePercent = 0;
  
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          {data.map((item, idx) => {
            const percent = total > 0 ? (item.value / total) * 100 : 0;
            const dashArray = `${percent} ${100 - percent}`;
            const dashOffset = -cumulativePercent;
            cumulativePercent += percent;
            
            return (
              <circle
                key={idx}
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke={item.color}
                strokeWidth="3"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-slate-800">{total}</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-slate-600">{item.label}</span>
            <span className="text-sm font-semibold text-slate-800">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EstadisticasPage() {
  const { data, isLoading } = useStats();

  const stats = data?.data || {};
  const carpetas = stats.carpetas || {};
  const facturacion = stats.facturacion || {};
  const clientes = stats.clientes || {};

  // Datos para el gráfico de estados
  const estadosData = Object.entries(carpetas.porEstado || {}).map(([estado, count]) => ({
    label: estado.replace('_', ' '),
    value: count,
    color: {
      'HOUSE': '#3b82f6',
      'EN_TRANSITO': '#f59e0b',
      'ARRIBADA': '#10b981',
      'CERRADA': '#6b7280',
      'CANCELADA': '#ef4444',
      'DIRECTA': '#8b5cf6',
      'CONSOLIDADA': '#ec4899'
    }[estado] || '#94a3b8'
  }));

  const totalCarpetasPorEstado = estadosData.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return (
      <Layout title="Estadísticas" subtitle="Análisis y métricas">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-28 bg-slate-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Estadísticas" subtitle="Análisis y métricas de tu organización">
      {/* Período */}
      <div className="flex items-center gap-2 mb-6 text-slate-500">
        <Calendar className="w-4 h-4" />
        <span>Período: {stats.periodo?.mes} {stats.periodo?.año}</span>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Carpetas Totales"
          value={carpetas.total || 0}
          subtitle={`${carpetas.delMes || 0} nuevas este mes`}
          icon={Ship}
          colorClass="bg-blue-500"
        />
        <MetricCard
          title="En Tránsito"
          value={carpetas.enTransito || 0}
          subtitle="Operaciones activas"
          icon={TrendingUp}
          colorClass="bg-amber-500"
        />
        <MetricCard
          title="Total Por Cobrar"
          value={`$${(facturacion.totalPorCobrar || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          subtitle={`${facturacion.facturasPendientes || 0} facturas pendientes`}
          icon={DollarSign}
          colorClass="bg-red-500"
        />
        <MetricCard
          title="Cobrado del Mes"
          value={`$${(facturacion.cobradoDelMes || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          subtitle={stats.periodo?.mes}
          icon={Receipt}
          colorClass="bg-green-500"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Distribución de estados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Distribución de Carpetas por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estadosData.length > 0 ? (
              <DonutChart data={estadosData} total={totalCarpetasPorEstado} />
            ) : (
              <p className="text-center text-slate-500 py-8">Sin datos disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Resumen de facturación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Resumen de Facturación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Total Facturas</p>
                  <p className="text-2xl font-bold text-slate-800">{facturacion.totalFacturas || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Facturas del Mes</p>
                  <p className="text-2xl font-bold text-slate-800">{facturacion.facturasDelMes || 0}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Prefacturas Pendientes</span>
                  <span className="text-lg font-semibold text-amber-600">{facturacion.prefacturasPendientes || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Facturas Pendientes de Cobro</span>
                  <span className="text-lg font-semibold text-red-600">{facturacion.facturasPendientes || 0}</span>
                </div>
              </div>

              {/* Barra de progreso de cobranza */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Progreso de Cobranza</span>
                  <span className="font-medium text-slate-700">
                    {facturacion.totalPorCobrar > 0 
                      ? Math.round((facturacion.cobradoDelMes / (facturacion.cobradoDelMes + facturacion.totalPorCobrar)) * 100)
                      : 100}%
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${facturacion.totalPorCobrar > 0 
                        ? (facturacion.cobradoDelMes / (facturacion.cobradoDelMes + facturacion.totalPorCobrar)) * 100 
                        : 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-800">{clientes.total || 0}</p>
            <p className="text-slate-500">Clientes Activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ship className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-slate-800">{carpetas.delMes || 0}</p>
            <p className="text-slate-500">Carpetas este Mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-800">
              ${((facturacion.cobradoDelMes || 0) + (facturacion.totalPorCobrar || 0)).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-slate-500">Facturación Total</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default EstadisticasPage;
