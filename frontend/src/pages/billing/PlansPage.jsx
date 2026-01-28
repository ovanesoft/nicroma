import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, Zap, ArrowRight, Crown, Loader2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui';
import { 
  useBillingPlans, 
  useSubscription, 
  useCreateCheckout,
  useUpgradePlan,
  useDowngradePlan,
  useValidatePromotion
} from '../../hooks/useApi';

const PlansPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [billingCycle, setBillingCycle] = useState(searchParams.get('cycle') || 'monthly');
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const { data: plansData, isLoading: loadingPlans } = useBillingPlans();
  const { data: subscriptionData } = useSubscription();
  const checkoutMutation = useCreateCheckout();
  const upgradeMutation = useUpgradePlan();
  const downgradeMutation = useDowngradePlan();
  const validatePromoMutation = useValidatePromotion();

  const plans = plansData?.data?.plans || [];
  const subscription = subscriptionData?.data;
  const currentPlanSlug = subscription?.plan?.slug;

  const formatPrice = (price) => {
    if (!price || price === 0) return null;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleValidatePromo = async () => {
    if (!promoCode || !selectedPlan) return;
    
    try {
      const result = await validatePromoMutation.mutateAsync({
        code: promoCode,
        planSlug: selectedPlan,
      });
      setPromoResult(result.data);
    } catch (error) {
      setPromoResult({ error: error.response?.data?.message || 'Código inválido' });
    }
  };

  const handleSelectPlan = async (plan) => {
    if (plan.isContactSales) {
      window.location.href = 'mailto:ventas@nicroma.com?subject=Consulta Plan Enterprise';
      return;
    }

    // Si no tiene suscripción o está en trial, ir a checkout
    if (!subscription?.hasSubscription || subscription?.status === 'trialing') {
      try {
        const result = await checkoutMutation.mutateAsync({
          planSlug: plan.slug,
          billingCycle,
          promotionCode: promoResult?.discountAmount ? promoCode : null,
        });
        
        if (result.data?.checkoutUrl) {
          window.location.href = result.data.checkoutUrl;
        }
      } catch (error) {
        console.error('Error en checkout:', error);
      }
      return;
    }

    // Si ya tiene suscripción, determinar si es upgrade o downgrade
    const currentPlan = plans.find(p => p.slug === currentPlanSlug);
    const isUpgrade = plan.priceMonthly > (currentPlan?.priceMonthly || 0);

    if (isUpgrade) {
      try {
        await upgradeMutation.mutateAsync({ planSlug: plan.slug });
        navigate('/billing/suscripcion?upgraded=true');
      } catch (error) {
        console.error('Error en upgrade:', error);
      }
    } else {
      try {
        await downgradeMutation.mutateAsync({ planSlug: plan.slug });
        navigate('/billing/suscripcion?downgraded=true');
      } catch (error) {
        console.error('Error en downgrade:', error);
      }
    }
  };

  const getPlanAction = (plan) => {
    if (!currentPlanSlug || subscription?.status === 'trialing') {
      return { text: 'Elegir plan', variant: 'primary' };
    }
    
    if (plan.slug === currentPlanSlug) {
      return { text: 'Plan actual', variant: 'secondary', disabled: true };
    }

    const currentPlan = plans.find(p => p.slug === currentPlanSlug);
    const isUpgrade = plan.priceMonthly > (currentPlan?.priceMonthly || 0);
    
    return isUpgrade 
      ? { text: 'Mejorar plan', variant: 'primary' }
      : { text: 'Cambiar plan', variant: 'outline' };
  };

  const isPopular = (slug) => slug === 'profesional';

  if (loadingPlans) {
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
            Elegí el plan perfecto para vos
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--color-textSecondary)' }}>
            {subscription?.status === 'trialing' 
              ? 'Tu período de prueba está activo. Elegí un plan para continuar cuando termine.'
              : 'Todos los planes incluyen 7 días de prueba gratis. Sin compromiso.'
            }
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 p-1.5 rounded-xl" 
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'monthly' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                  : ''
              }`}
              style={billingCycle !== 'monthly' ? { color: 'var(--color-textSecondary)' } : {}}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                  : ''
              }`}
              style={billingCycle !== 'yearly' ? { color: 'var(--color-textSecondary)' } : {}}
            >
              Anual
              <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
                Ahorrá 2 meses
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-10">
          {plans.filter(p => p.slug !== 'enterprise').map((plan) => {
            const action = getPlanAction(plan);
            const isCurrent = plan.slug === currentPlanSlug && subscription?.status !== 'trialing';
            
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-5 transition-all duration-300 ${
                  isPopular(plan.slug) ? 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/20' : ''
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
                style={{ 
                  backgroundColor: 'var(--color-card)', 
                  border: (isPopular(plan.slug) || isCurrent) ? 'none' : '1px solid var(--color-border)' 
                }}
              >
                {isPopular(plan.slug) && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-medium rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Más popular
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Tu plan actual
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {plan.name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
                      {formatPrice(billingCycle === 'yearly' ? plan.priceYearly / 12 : plan.priceMonthly)}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>/mes</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-xs mt-1 text-green-500">
                      {formatPrice(plan.priceYearly)}/año
                    </p>
                  )}
                </div>

                <Button
                  className="w-full mb-4"
                  size="sm"
                  variant={isCurrent ? 'secondary' : (isPopular(plan.slug) ? 'primary' : 'outline')}
                  disabled={action.disabled || checkoutMutation.isPending || upgradeMutation.isPending}
                  onClick={() => !action.disabled && handleSelectPlan(plan)}
                >
                  {(checkoutMutation.isPending || upgradeMutation.isPending || downgradeMutation.isPending) && selectedPlan === plan.slug ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {action.text}
                      {!action.disabled && <ArrowRight className="w-4 h-4" />}
                    </>
                  )}
                </Button>

                {/* Features */}
                <div className="space-y-2 text-sm">
                  <FeatureItem included text={`${plan.limits.users || '∞'} usuarios`} />
                  <FeatureItem included text={`${plan.limits.carpetasPerMonth || '∞'} carpetas/mes`} />
                  <FeatureItem included text={`${plan.limits.clientes || '∞'} clientes`} />
                  <FeatureItem included={plan.includes.portalClientes} text="Portal clientes" />
                  <FeatureItem 
                    included={plan.includes.trackingNavieras} 
                    text="Tracking navieras" 
                    upgrade={!plan.includes.trackingNavieras}
                  />
                  <FeatureItem 
                    included={plan.includes.facturacionAfip} 
                    text="Facturación AFIP" 
                    upgrade={!plan.includes.facturacionAfip}
                  />
                  <FeatureItem 
                    included={plan.includes.reportesAvanzados} 
                    text="Reportes avanzados" 
                    upgrade={!plan.includes.reportesAvanzados}
                  />
                </div>
              </div>
            );
          })}

          {/* Enterprise */}
          {plans.find(p => p.slug === 'enterprise') && (
            <div className="relative rounded-2xl p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-1">Enterprise</h3>
                <p className="text-xs text-slate-300">Para grandes empresas</p>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold">Contactar</span>
              </div>

              <Button
                className="w-full mb-4 bg-white text-slate-900 hover:bg-slate-100"
                size="sm"
                onClick={() => handleSelectPlan({ slug: 'enterprise', isContactSales: true })}
              >
                Hablar con ventas
                <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="space-y-2 text-sm text-slate-200">
                <FeatureItem included text="Todo de Business" light />
                <FeatureItem included text="Usuarios ilimitados" light />
                <FeatureItem included text="Integraciones custom" light />
                <FeatureItem included text="SLA garantizado" light />
              </div>
            </div>
          )}
        </div>

        {/* Promo Code Section */}
        <Card className="max-w-md mx-auto">
          <CardContent className="py-6">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
              ¿Tenés un código promocional?
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoResult(null);
                }}
                onFocus={() => setSelectedPlan(plans.find(p => isPopular(p.slug))?.slug)}
                placeholder="Ingresá tu código"
                className="flex-1 px-4 py-2 rounded-lg"
                style={{ 
                  backgroundColor: 'var(--color-background)', 
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
              <Button
                variant="outline"
                onClick={handleValidatePromo}
                disabled={!promoCode || validatePromoMutation.isPending}
                loading={validatePromoMutation.isPending}
              >
                Aplicar
              </Button>
            </div>
            {promoResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                promoResult.error 
                  ? 'bg-red-50 text-red-600' 
                  : 'bg-green-50 text-green-600'
              }`}>
                {promoResult.error || (
                  <>
                    ¡Código válido! Descuento de {promoResult.discountType === 'percentage' 
                      ? `${promoResult.discountValue}%` 
                      : formatPrice(promoResult.discountValue)
                    }
                    {promoResult.durationMonths && ` por ${promoResult.durationMonths} mes(es)`}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

// Feature Item Component
const FeatureItem = ({ included, text, upgrade = false, light = false }) => (
  <div className="flex items-center gap-2">
    {included ? (
      <Check className={`w-4 h-4 ${light ? 'text-green-400' : 'text-green-500'}`} />
    ) : upgrade ? (
      <Zap className="w-4 h-4 text-amber-500" />
    ) : (
      <X className="w-4 h-4 text-slate-400" />
    )}
    <span className={light ? 'text-slate-200' : ''} style={!light ? { color: included ? 'var(--color-text)' : 'var(--color-textSecondary)' } : {}}>
      {text}
    </span>
  </div>
);

export default PlansPage;
