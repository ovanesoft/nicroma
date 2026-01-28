import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, Filter, MoreVertical, Eye, Pause, Play, 
  Mail, Clock, CreditCard, Building2, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button, Input, Select, Badge, Modal } from '../../components/ui';
import { 
  useAdminSubscriptions, 
  useAdminSuspendSubscription, 
  useAdminReactivateSubscription 
} from '../../hooks/useApi';

const BillingSubscriptions = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');

  const page = parseInt(searchParams.get('page') || '1');
  const statusFilter = searchParams.get('filter') || '';

  const { data, isLoading, refetch } = useAdminSubscriptions({ 
    page, 
    limit: 20,
    status: statusFilter || undefined,
  });

  const suspendMutation = useAdminSuspendSubscription();
  const reactivateMutation = useAdminReactivateSubscription();

  const subscriptions = data?.data?.subscriptions || [];
  const pagination = data?.data?.pagination;

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
      year: 'numeric',
    });
  };

  const handleFilterChange = (filter) => {
    const params = new URLSearchParams(searchParams);
    if (filter) {
      params.set('filter', filter);
    } else {
      params.delete('filter');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const handleSuspend = async () => {
    if (!selectedSub) return;
    try {
      await suspendMutation.mutateAsync({ 
        tenantId: selectedSub.tenant_id, 
        reason: suspendReason 
      });
      setActionModal(null);
      setSelectedSub(null);
      setSuspendReason('');
      refetch();
    } catch (error) {
      console.error('Error suspendiendo:', error);
    }
  };

  const handleReactivate = async () => {
    if (!selectedSub) return;
    try {
      await reactivateMutation.mutateAsync(selectedSub.tenant_id);
      setActionModal(null);
      setSelectedSub(null);
      refetch();
    } catch (error) {
      console.error('Error reactivando:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-700', text: 'Activa' },
      trialing: { color: 'bg-blue-100 text-blue-700', text: 'Trial' },
      past_due: { color: 'bg-amber-100 text-amber-700', text: 'Pago pendiente' },
      cancelled: { color: 'bg-red-100 text-red-700', text: 'Cancelada' },
      suspended: { color: 'bg-slate-100 text-slate-700', text: 'Suspendida' },
      pending: { color: 'bg-purple-100 text-purple-700', text: 'Pendiente' },
    };
    return badges[status] || badges.pending;
  };

  const filteredSubscriptions = subscriptions.filter(sub => 
    !search || 
    sub.tenants?.name?.toLowerCase().includes(search.toLowerCase()) ||
    sub.tenants?.companyEmail?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              Suscripciones
            </h1>
            <p style={{ color: 'var(--color-textSecondary)' }}>
              Gestión de todas las suscripciones de tenants
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/billing')}>
            <ChevronLeft className="w-4 h-4" />
            Volver al dashboard
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-textSecondary)' }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg"
                  style={{ 
                    backgroundColor: 'var(--color-background)', 
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="px-4 py-2 rounded-lg"
                  style={{ 
                    backgroundColor: 'var(--color-background)', 
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activas</option>
                  <option value="trialing">En trial</option>
                  <option value="past_due">Pago pendiente</option>
                  <option value="cancelled">Canceladas</option>
                  <option value="suspended">Suspendidas</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <div className="text-center py-20">
                <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-textSecondary)' }} />
                <p style={{ color: 'var(--color-textSecondary)' }}>No hay suscripciones</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Organización</th>
                      <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Plan</th>
                      <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Estado</th>
                      <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Monto</th>
                      <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Próximo cobro</th>
                      <th className="text-right px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscriptions.map((sub) => {
                      const badge = getStatusBadge(sub.status);
                      return (
                        <tr 
                          key={sub.id} 
                          className="hover:bg-slate-50 transition-colors"
                          style={{ borderBottom: '1px solid var(--color-border)' }}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                                {sub.tenants?.name || 'Sin nombre'}
                              </p>
                              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                                {sub.tenants?.companyEmail}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span style={{ color: 'var(--color-text)' }}>
                              {sub.subscription_plans?.name || 'Sin plan'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                              {badge.text}
                            </span>
                            {sub.status === 'trialing' && sub.trial_ends_at && (
                              <p className="text-xs mt-1" style={{ color: 'var(--color-textSecondary)' }}>
                                Vence: {formatDate(sub.trial_ends_at)}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                              {formatPrice(sub.amount)}
                            </span>
                            <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                              /{sub.billing_cycle === 'yearly' ? 'año' : 'mes'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span style={{ color: 'var(--color-text)' }}>
                              {sub.cancel_at_period_end ? 'No renovará' : formatDate(sub.current_period_end)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/admin/tenants?id=${sub.tenant_id}`)}
                                title="Ver tenant"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {sub.status === 'active' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedSub(sub);
                                    setActionModal('suspend');
                                  }}
                                  title="Suspender"
                                >
                                  <Pause className="w-4 h-4" />
                                </Button>
                              )}
                              {sub.status === 'suspended' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedSub(sub);
                                    setActionModal('reactivate');
                                  }}
                                  title="Reactivar"
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.location.href = `mailto:${sub.tenants?.companyEmail}`}
                                title="Enviar email"
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  Mostrando {((page - 1) * 20) + 1} - {Math.min(page * 20, pagination.total)} de {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= pagination.totalPages}
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suspend Modal */}
        {actionModal === 'suspend' && selectedSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div 
              className="w-full max-w-md rounded-2xl p-6 shadow-xl"
              style={{ backgroundColor: 'var(--color-card)' }}
            >
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                Suspender suscripción
              </h3>
              <p className="mb-4" style={{ color: 'var(--color-textSecondary)' }}>
                ¿Estás seguro de suspender la suscripción de <strong>{selectedSub.tenants?.name}</strong>?
                El tenant perderá acceso a las funcionalidades del plan.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                  Motivo de suspensión
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Ej: Pago no recibido después de múltiples intentos..."
                  className="w-full px-4 py-3 rounded-xl resize-none"
                  style={{ 
                    backgroundColor: 'var(--color-background)', 
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setActionModal(null);
                    setSelectedSub(null);
                    setSuspendReason('');
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="danger" 
                  className="flex-1"
                  onClick={handleSuspend}
                  loading={suspendMutation.isPending}
                >
                  Suspender
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reactivate Modal */}
        {actionModal === 'reactivate' && selectedSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div 
              className="w-full max-w-md rounded-2xl p-6 shadow-xl"
              style={{ backgroundColor: 'var(--color-card)' }}
            >
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                Reactivar suscripción
              </h3>
              <p className="mb-6" style={{ color: 'var(--color-textSecondary)' }}>
                ¿Reactivar la suscripción de <strong>{selectedSub.tenants?.name}</strong>?
                El tenant recuperará acceso a todas las funcionalidades de su plan.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setActionModal(null);
                    setSelectedSub(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleReactivate}
                  loading={reactivateMutation.isPending}
                >
                  Reactivar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BillingSubscriptions;
