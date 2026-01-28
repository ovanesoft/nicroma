import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Sparkles, ArrowRight, Ship, Users, FileText, BarChart3, Headphones, Zap } from 'lucide-react';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useBillingPlans } from '../../hooks/useApi';

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { data: plansData, isLoading } = useBillingPlans();

  const plans = plansData?.data?.plans || [];

  const handleSelectPlan = (plan) => {
    if (plan.isContactSales) {
      window.location.href = 'mailto:ventas@nicroma.com?subject=Consulta Plan Enterprise';
      return;
    }
    
    if (isAuthenticated) {
      navigate(`/billing/checkout?plan=${plan.slug}&cycle=${billingCycle}`);
    } else {
      navigate(`/register?plan=${plan.slug}&cycle=${billingCycle}`);
    }
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return null;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getFeatureIcon = (feature) => {
    if (feature.includes('usuario')) return Users;
    if (feature.includes('carpeta')) return FileText;
    if (feature.includes('cliente')) return Users;
    if (feature.includes('tracking') || feature.includes('naviera')) return Ship;
    if (feature.includes('reporte')) return BarChart3;
    if (feature.includes('soporte')) return Headphones;
    return Check;
  };

  // Destacar el plan profesional
  const isPopular = (slug) => slug === 'profesional';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Ship className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Nicroma</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button onClick={() => navigate('/dashboard')}>
                Ir al Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Iniciar Sesión
                </Button>
                <Button onClick={() => navigate('/register')}>
                  Empezar Gratis
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" 
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">7 días de prueba gratis</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>
            Planes que se adaptan a{' '}
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              tu crecimiento
            </span>
          </h1>
          
          <p className="text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'var(--color-textSecondary)' }}>
            Profesionalizá tu operación de comercio exterior con el software más completo. 
            Empezá gratis y escalá cuando lo necesites.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
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
                2 meses gratis
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {plans.filter(p => p.slug !== 'enterprise').map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] ${
                  isPopular(plan.slug) ? 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/20' : ''
                }`}
                style={{ 
                  backgroundColor: 'var(--color-card)', 
                  border: isPopular(plan.slug) ? 'none' : '1px solid var(--color-border)' 
                }}
              >
                {isPopular(plan.slug) && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-full">
                    Más popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                    {plan.name}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
                      {formatPrice(billingCycle === 'yearly' ? plan.priceYearly / 12 : plan.priceMonthly)}
                    </span>
                    <span style={{ color: 'var(--color-textSecondary)' }}>/mes</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm mt-1 text-green-500">
                      {formatPrice(plan.priceYearly)} facturado anualmente
                    </p>
                  )}
                </div>

                <Button
                  className="w-full mb-6"
                  variant={isPopular(plan.slug) ? 'primary' : 'outline'}
                  onClick={() => handleSelectPlan(plan)}
                >
                  Empezar prueba gratis
                  <ArrowRight className="w-4 h-4" />
                </Button>

                {/* Límites */}
                <div className="space-y-3 mb-6 pb-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                      {plan.limits.users || 'Ilimitados'} usuarios
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                      {plan.limits.carpetasPerMonth || 'Ilimitadas'} carpetas/mes
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                      {plan.limits.clientes || 'Ilimitados'} clientes
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <FeatureRow included={plan.includes.portalClientes} text="Portal de clientes" />
                  <FeatureRow 
                    included={plan.includes.trackingNavieras} 
                    text={plan.includes.trackingNavieras ? `Tracking (${plan.includes.trackingNavierasLimit || 'todas'} navieras)` : 'Tracking navieras'} 
                    upgrade={!plan.includes.trackingNavieras}
                  />
                  <FeatureRow 
                    included={plan.includes.facturacionAfip} 
                    text="Facturación AFIP" 
                    upgrade={!plan.includes.facturacionAfip}
                  />
                  <FeatureRow 
                    included={plan.includes.reportesAvanzados} 
                    text="Reportes avanzados" 
                    upgrade={!plan.includes.reportesAvanzados}
                  />
                </div>
              </div>
            ))}

            {/* Enterprise Card */}
            {plans.find(p => p.slug === 'enterprise') && (
              <div
                className="relative rounded-2xl p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white"
              >
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                  <p className="text-sm text-slate-300">
                    Solución personalizada para grandes empresas
                  </p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">Contactar</span>
                </div>

                <Button
                  className="w-full mb-6 bg-white text-slate-900 hover:bg-slate-100"
                  onClick={() => handleSelectPlan({ slug: 'enterprise', isContactSales: true })}
                >
                  Hablar con ventas
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <div className="space-y-3">
                  <FeatureRow included text="Todo lo de Business" light />
                  <FeatureRow included text="Usuarios ilimitados" light />
                  <FeatureRow included text="Integraciones custom" light />
                  <FeatureRow included text="Onboarding VIP" light />
                  <FeatureRow included text="SLA garantizado" light />
                  <FeatureRow included text="Soporte dedicado" light />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Highlight */}
      <section className="py-20 px-4" style={{ backgroundColor: 'var(--color-card)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Tu propio portal de clientes
          </h2>
          <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: 'var(--color-textSecondary)' }}>
            Profesionalizá tu imagen. Que tus clientes vean sus embarques, facturas y documentos 
            cuando quieran. <strong>Esto no lo tiene nadie más a este precio.</strong>
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <HighlightCard
              icon={Zap}
              title="Acceso 24/7"
              description="Tus clientes consultan sus operaciones sin llamarte"
            />
            <HighlightCard
              icon={Ship}
              title="Tracking en vivo"
              description="Seguimiento de contenedores en tiempo real"
            />
            <HighlightCard
              icon={FileText}
              title="Documentos online"
              description="Facturas, BL y documentos siempre disponibles"
            />
          </div>
        </div>
      </section>

      {/* Accompaniment Banner */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl p-8 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">
              ¿Estás empezando? Te acompañamos.
            </h2>
            <p className="text-lg mb-6 opacity-90">
              Sabemos que cada peso cuenta. Si el precio es un problema, tenemos una oferta especial 
              para vos: <strong>$10.000/mes los primeros 2 meses</strong>. 
              Queremos que crezcas con nosotros.
            </p>
            <Button 
              className="bg-white text-indigo-600 hover:bg-slate-100"
              onClick={() => isAuthenticated ? navigate('/billing/planes') : navigate('/register')}
            >
              Empezar ahora
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
            © 2026 Nicroma. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <a href="/terms" className="text-sm hover:underline" style={{ color: 'var(--color-textSecondary)' }}>
              Términos
            </a>
            <a href="/privacy" className="text-sm hover:underline" style={{ color: 'var(--color-textSecondary)' }}>
              Privacidad
            </a>
            <a href="mailto:soporte@nicroma.com" className="text-sm hover:underline" style={{ color: 'var(--color-textSecondary)' }}>
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Feature Row Component
const FeatureRow = ({ included, text, upgrade = false, light = false }) => (
  <div className="flex items-center gap-3">
    {included ? (
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${light ? 'bg-white/20' : 'bg-green-500/10'}`}>
        <Check className={`w-3 h-3 ${light ? 'text-white' : 'text-green-500'}`} />
      </div>
    ) : upgrade ? (
      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-amber-500/10">
        <Zap className="w-3 h-3 text-amber-500" />
      </div>
    ) : (
      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-500/10">
        <X className="w-3 h-3 text-slate-400" />
      </div>
    )}
    <span className={`text-sm ${light ? 'text-slate-200' : ''}`} style={!light ? { color: included ? 'var(--color-text)' : 'var(--color-textSecondary)' } : {}}>
      {text}
      {upgrade && <span className="ml-1 text-amber-500">(upgrade)</span>}
    </span>
  </div>
);

// Highlight Card Component
const HighlightCard = ({ icon: Icon, title, description }) => (
  <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-background)' }}>
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 mx-auto">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{title}</h3>
    <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>{description}</p>
  </div>
);

export default PricingPage;
