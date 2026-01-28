import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CreditCard, Calendar, AlertCircle, Check, ArrowRight, 
  Clock, Zap, ChevronRight, RefreshCcw, X, Gift, Sparkles
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui';
import { 
  useSubscription, 
  useBillingPlans, 
  useExtendTrial, 
  useCancelSubscription, 
  useReactivateSubscription,
  useActivateAccompaniment
} from '../../hooks/useApi';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  const { data: subscriptionData, isLoading: loadingSub, refetch } = useSubscription();
  const { data: plansData } = useBillingPlans();
  const extendTrialMutation = useExtendTrial();
  const cancelMutation = useCancelSubscription();
  const reactivateMutation = useReactivateSubscription();
  const accompanimentMutation = useActivateAccompaniment();

  const subscription = subscriptionData?.data;
  const plans = plansData?.data?.plans || [];

  // Mensaje de callback de MercadoPago
  const callbackStatus = searchParams.get('status');

  const formatPrice = (price) => {
    if (!price) return '$0';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleExtendTrial = async () => {
    try {
      await extendTrialMutation.mutateAsync();
      refetch();
    } catch (error) {
      console.error('Error extendiendo trial:', error);
    }
  };

  const handleCancelSubscription = async (reason) => {
    try {
      await cancelMutation.mutateAsync({ reason });
      setShowCancelModal(false);
      refetch();
    } catch (error) {
      console.error('Error cancelando:', error);
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync();
      refetch();
    } catch (error) {
      console.error('Error reactivando:', error);
    }
  };

  const handleAccompaniment = async () => {
    try {
      await accompanimentMutation.mutateAsync();
      refetch();
    } catch (error) {
      console.error('Error activando acompañamiento:', error);
    }
  };

  if (loadingSub) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-700', text: 'Activa', icon: Check },
      trialing: { color: 'bg-blue-100 text-blue-700', text: 'Período de prueba', icon: Clock },
      past_due: { color: 'bg-amber-100 text-amber-700', text: 'Pago pendiente', icon: AlertCircle },
      cancelled: { color: 'bg-red-100 text-red-700', text: 'Cancelada', icon: X },
      suspended: { color: 'bg-slate-100 text-slate-700', text: 'Suspendida', icon: AlertCircle },
    };
    return badges[status] || badges.active;
  };

  const statusBadge = subscription ? getStatusBadge(subscription.status) : null;
  const StatusIcon = statusBadge?.icon;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Mi Suscripción
          </h1>
          <p style={{ color: 'var(--color-textSecondary)' }}>
            Gestioná tu plan y facturación
          </p>
        </div>

        {/* Callback Messages */}
        {callbackStatus === 'callback' && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">¡Pago procesado!</p>
              <p className="text-sm text-green-600">Tu suscripción está siendo activada.</p>
            </div>
          </div>
        )}

        {/* No Subscription State */}
        {!subscription?.hasSubscription && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                Comenzá tu prueba gratuita
              </h2>
              <p className="mb-6 max-w-md mx-auto" style={{ color: 'var(--color-textSecondary)' }}>
                Probá todas las funcionalidades del plan Profesional durante 7 días. 
                Sin compromiso, sin tarjeta de crédito.
              </p>
              <Button onClick={() => navigate('/billing/planes')}>
                Ver planes
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Subscription Details */}
        {subscription?.hasSubscription && (
          <div className="space-y-6">
            {/* Current Plan Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Plan actual</CardTitle>
                    <CardDescription>
                      {subscription.billingCycle === 'yearly' ? 'Facturación anual' : 'Facturación mensual'}
                    </CardDescription>
                  </div>
                  {statusBadge && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusBadge.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {statusBadge.text}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                      {subscription.plan?.name || 'Sin plan'}
                    </h3>
                    <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-primary)' }}>
                      {formatPrice(subscription.amount)}
                      <span className="text-base font-normal" style={{ color: 'var(--color-textSecondary)' }}>/mes</span>
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/billing/planes')}>
                    Cambiar plan
                  </Button>
                </div>

                {/* Billing Info */}
                <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-background)' }}>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5" style={{ color: 'var(--color-textSecondary)' }} />
                    <div>
                      <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Próximo cobro</p>
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {subscription.cancelAtPeriodEnd ? 'No se renovará' : formatDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5" style={{ color: 'var(--color-textSecondary)' }} />
                    <div>
                      <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Método de pago</p>
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>MercadoPago</p>
                    </div>
                  </div>
                </div>

                {/* Cancel Warning */}
                {subscription.cancelAtPeriodEnd && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Tu suscripción está cancelada</p>
                        <p className="text-sm text-amber-600 mt-1">
                          Tendrás acceso hasta el {formatDate(subscription.currentPeriodEnd)}. 
                          ¿Cambiaste de opinión?
                        </p>
                        <Button 
                          size="sm" 
                          className="mt-3"
                          onClick={handleReactivate}
                          loading={reactivateMutation.isPending}
                        >
                          <RefreshCcw className="w-4 h-4" />
                          Reactivar suscripción
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Change */}
                {subscription.pendingChange && (
                  <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="font-medium text-blue-800">Cambio de plan programado</p>
                    <p className="text-sm text-blue-600 mt-1">
                      Cambiarás al plan {subscription.pendingChange.plan?.name} el {formatDate(subscription.pendingChange.effectiveAt)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trial Card */}
            {subscription.trial && (
              <Card className="border-2 border-blue-200 bg-blue-50/50">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900">Período de prueba</h3>
                        <p className="text-blue-700">
                          {subscription.trial.isExpired 
                            ? 'Tu prueba ha terminado'
                            : `Te quedan ${subscription.trial.daysRemaining} días`
                          }
                        </p>
                      </div>
                    </div>
                    {subscription.trial.canExtend && !subscription.trial.isExpired && (
                      <Button
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                        onClick={handleExtendTrial}
                        loading={extendTrialMutation.isPending}
                      >
                        ¿Necesitás más tiempo?
                      </Button>
                    )}
                    {subscription.trial.isExpired && (
                      <Button onClick={() => navigate('/billing/planes')}>
                        Elegir plan
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Progress bar */}
                  {!subscription.trial.isExpired && (
                    <div className="mt-4">
                      <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${((7 - subscription.trial.daysRemaining) / 7) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        Extensiones usadas: {subscription.trial.extensions}/{subscription.trial.maxExtensions}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Accompaniment Card */}
            {subscription.accompaniment?.active && (
              <Card className="border-2 border-purple-200 bg-purple-50/50">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Gift className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-purple-900">Oferta de acompañamiento activa</h3>
                      <p className="text-purple-700">
                        Pagás {formatPrice(subscription.accompaniment.currentPrice)}/mes 
                        ({subscription.accompaniment.totalMonths - subscription.accompaniment.monthsUsed} meses restantes con descuento)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Accompaniment Offer (for expired trials) */}
            {subscription.trial?.isExpired && !subscription.accompaniment?.active && (
              <Card className="border-2 border-gradient-to-r from-indigo-200 to-purple-200 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5" />
                <CardContent className="py-8 relative">
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                      ¿El precio es un problema? No te preocupes.
                    </h3>
                    <p className="mb-6" style={{ color: 'var(--color-textSecondary)' }}>
                      Sabemos que estás empezando. Te acompañamos con una oferta especial:
                      <strong className="text-indigo-600"> $10.000/mes los primeros 2 meses</strong>.
                    </p>
                    <Button
                      className="bg-gradient-to-r from-indigo-500 to-purple-600"
                      onClick={handleAccompaniment}
                      loading={accompanimentMutation.isPending}
                    >
                      <Sparkles className="w-4 h-4" />
                      Activar oferta de acompañamiento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  onClick={() => navigate('/billing/pagos')}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors"
                  style={{ backgroundColor: 'var(--color-background)' }}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5" style={{ color: 'var(--color-textSecondary)' }} />
                    <span style={{ color: 'var(--color-text)' }}>Ver historial de pagos</span>
                  </div>
                  <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-textSecondary)' }} />
                </button>

                <button
                  onClick={() => navigate('/billing/planes')}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors"
                  style={{ backgroundColor: 'var(--color-background)' }}
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5" style={{ color: 'var(--color-textSecondary)' }} />
                    <span style={{ color: 'var(--color-text)' }}>Cambiar de plan</span>
                  </div>
                  <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-textSecondary)' }} />
                </button>

                {!subscription.cancelAtPeriodEnd && subscription.status === 'active' && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-red-50 transition-colors text-red-600"
                  >
                    <div className="flex items-center gap-3">
                      <X className="w-5 h-5" />
                      <span>Cancelar suscripción</span>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <CancelModal
            onClose={() => setShowCancelModal(false)}
            onConfirm={handleCancelSubscription}
            loading={cancelMutation.isPending}
            periodEnd={subscription?.currentPeriodEnd}
          />
        )}
      </div>
    </Layout>
  );
};

// Cancel Modal Component
const CancelModal = ({ onClose, onConfirm, loading, periodEnd }) => {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div 
        className="w-full max-w-md rounded-2xl p-6 shadow-xl"
        style={{ backgroundColor: 'var(--color-card)' }}
      >
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
          ¿Seguro que querés cancelar?
        </h3>
        
        <p className="mb-4" style={{ color: 'var(--color-textSecondary)' }}>
          Si cancelás, seguirás teniendo acceso hasta el final de tu período actual 
          ({periodEnd ? new Date(periodEnd).toLocaleDateString('es-AR') : '-'}).
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
            ¿Nos contás por qué? (opcional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tu feedback nos ayuda a mejorar..."
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
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Volver
          </Button>
          <Button 
            variant="danger" 
            className="flex-1"
            onClick={() => onConfirm(reason)}
            loading={loading}
          >
            Cancelar suscripción
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
