import { useState } from 'react';
import { CreditCard, Check, X, Clock, AlertCircle, Download, ExternalLink } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui';
import { useBillingPayments } from '../../hooks/useApi';

const PaymentsPage = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBillingPayments({ page, limit: 20 });

  const payments = data?.data?.payments || [];
  const pagination = data?.data?.pagination;

  const formatPrice = (amount, currency = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { color: 'bg-green-100 text-green-700', text: 'Completado', icon: Check },
      pending: { color: 'bg-amber-100 text-amber-700', text: 'Pendiente', icon: Clock },
      failed: { color: 'bg-red-100 text-red-700', text: 'Fallido', icon: X },
      refunded: { color: 'bg-slate-100 text-slate-700', text: 'Reembolsado', icon: AlertCircle },
      cancelled: { color: 'bg-slate-100 text-slate-700', text: 'Cancelado', icon: X },
    };
    return badges[status] || badges.pending;
  };

  if (isLoading) {
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Historial de Pagos
          </h1>
          <p style={{ color: 'var(--color-textSecondary)' }}>
            Todos tus pagos y comprobantes
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <SummaryCard
            title="Total pagado"
            value={formatPrice(
              payments
                .filter(p => p.status === 'completed')
                .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
            )}
            icon={CreditCard}
            color="green"
          />
          <SummaryCard
            title="Último pago"
            value={payments.length > 0 ? formatDate(payments[0].created_at).split(',')[0] : '-'}
            icon={Clock}
            color="blue"
          />
          <SummaryCard
            title="Pagos realizados"
            value={payments.filter(p => p.status === 'completed').length}
            icon={Check}
            color="indigo"
          />
        </div>

        {/* Payments List */}
        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-textSecondary)' }} />
                <p style={{ color: 'var(--color-textSecondary)' }}>
                  No hay pagos registrados todavía.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => {
                  const badge = getStatusBadge(payment.status);
                  const BadgeIcon = badge.icon;

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors"
                      style={{ backgroundColor: 'var(--color-background)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            payment.status === 'completed' ? 'bg-green-100' : 'bg-slate-100'
                          }`}
                        >
                          <CreditCard className={`w-5 h-5 ${
                            payment.status === 'completed' ? 'text-green-600' : 'text-slate-500'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                            {payment.description || 'Pago de suscripción'}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                            {formatDate(payment.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.text}
                        </span>
                        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                          {formatPrice(payment.amount, payment.currency)}
                        </span>
                        {payment.receipt_url && (
                          <a
                            href={payment.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" style={{ color: 'var(--color-textSecondary)' }} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  Página {pagination.page} de {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

// Summary Card Component
const SummaryCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div 
      className="p-5 rounded-xl"
      style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>{title}</p>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
    </div>
  );
};

export default PaymentsPage;
