import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, X, Sparkles, ArrowRight, Ship, Users, FileText, BarChart3, 
  Headphones, Zap, Star, Quote, ChevronDown, Globe, Shield, Clock,
  TrendingUp, Award, Play, CheckCircle, ArrowDown, Menu, X as XIcon
} from 'lucide-react';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useBillingPlans } from '../../hooks/useApi';

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [mobileMenu, setMobileMenu] = useState(false);
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

  const isPopular = (slug) => slug === 'profesional';

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Ship className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Nicroma
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-indigo-600 transition-colors">Características</a>
              <a href="#testimonials" className="text-slate-600 hover:text-indigo-600 transition-colors">Testimonios</a>
              <a href="#pricing" className="text-slate-600 hover:text-indigo-600 transition-colors">Precios</a>
              <a href="#faq" className="text-slate-600 hover:text-indigo-600 transition-colors">FAQ</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <Button onClick={() => navigate('/dashboard')}>
                  Ir al Dashboard
                </Button>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/login')}
                    className="text-slate-600 hover:text-indigo-600 transition-colors font-medium"
                  >
                    Iniciar Sesión
                  </button>
                  <Button onClick={() => navigate('/register')} className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
                    Empezar Gratis
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>

            <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <XIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-slate-200 py-4 px-4 space-y-4">
            <a href="#features" className="block text-slate-600">Características</a>
            <a href="#testimonials" className="block text-slate-600">Testimonios</a>
            <a href="#pricing" className="block text-slate-600">Precios</a>
            <Button onClick={() => navigate('/register')} className="w-full">Empezar Gratis</Button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-indigo-700">
              +2,847 empresas ya confían en nosotros
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 animate-fade-in-up">
            El software de{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                comercio exterior
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path d="M2 10C50 4 100 2 150 6C200 10 250 8 298 4" stroke="url(#gradient)" strokeWidth="4" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4F46E5"/>
                    <stop offset="100%" stopColor="#9333EA"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <br />
            que tu empresa necesita
          </h1>

          <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
            Gestioná carpetas, facturá a AFIP, hacé tracking de contenedores y brindá a tus clientes 
            un portal profesional. <strong>Todo en un solo lugar.</strong>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up animation-delay-400">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 transition-all px-8 py-4 text-lg"
            >
              Empezar prueba gratis de 7 días
              <ArrowRight className="w-5 h-5" />
            </Button>
            <button className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center group-hover:shadow-xl transition-shadow">
                <Play className="w-5 h-5 text-indigo-600 ml-0.5" />
              </div>
              <span className="font-medium">Ver demo de 2 min</span>
            </button>
          </div>

          {/* Stats Counter */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto animate-fade-in-up animation-delay-600">
            <AnimatedCounter end={2847} suffix="+" label="Empresas activas" />
            <AnimatedCounter end={156000} suffix="+" label="Carpetas gestionadas" />
            <AnimatedCounter end={99.9} suffix="%" label="Uptime garantizado" decimals={1} />
            <AnimatedCounter end={4.9} suffix="/5" label="Calificación Google" decimals={1} />
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-16 border-y border-slate-200 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-slate-500 mb-10 text-sm font-medium uppercase tracking-wider">
            Empresas que confían en Nicroma
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
            <CompanyLogo name="Maersk" />
            <CompanyLogo name="DHL" />
            <CompanyLogo name="FedEx" />
            <CompanyLogo name="MSC" />
            <CompanyLogo name="Hapag-Lloyd" />
            <CompanyLogo name="CMA CGM" />
            <CompanyLogo name="Evergreen" />
            <CompanyLogo name="COSCO" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Funcionalidades
            </span>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Todo lo que necesitás para operar
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Dejá de usar 10 herramientas diferentes. Nicroma integra todo en una plataforma moderna y fácil de usar.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={FileText}
              title="Gestión de Carpetas"
              description="Organizá todas tus operaciones de importación y exportación. Documentos, costos y seguimiento en un solo lugar."
              color="indigo"
            />
            <FeatureCard
              icon={Ship}
              title="Tracking de Navieras"
              description="Seguí tus contenedores en tiempo real. Integración con Maersk, MSC, Hapag-Lloyd, CMA CGM y más."
              color="purple"
            />
            <FeatureCard
              icon={Users}
              title="Portal de Clientes"
              description="Brindá a tus clientes acceso 24/7 a sus operaciones. Profesionalizá tu imagen sin esfuerzo."
              color="pink"
              badge="Único en el mercado"
            />
            <FeatureCard
              icon={BarChart3}
              title="Facturación AFIP"
              description="Emití facturas electrónicas directamente. Integración completa con los servicios de AFIP."
              color="blue"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Reportes Avanzados"
              description="Tomá decisiones basadas en datos. Dashboards personalizables y exportación a Excel."
              color="green"
            />
            <FeatureCard
              icon={Shield}
              title="Seguridad Empresarial"
              description="Encriptación de datos, backups automáticos y cumplimiento con normativas de seguridad."
              color="orange"
            />
          </div>
        </div>
      </section>

      {/* Portal Demo Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="max-w-6xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-6">
                <Award className="w-4 h-4" />
                Característica exclusiva
              </span>
              <h2 className="text-4xl font-bold text-white mb-6">
                Tu propio portal de clientes.
                <br />
                <span className="text-indigo-300">Nadie más lo tiene.</span>
              </h2>
              <p className="text-xl text-indigo-200 mb-8">
                Que tus clientes consulten sus embarques, facturas y documentos cuando quieran. 
                Sin llamadas, sin mails, sin WhatsApp a las 11 de la noche.
              </p>
              
              <div className="space-y-4">
                <PortalFeature text="Acceso 24/7 desde cualquier dispositivo" />
                <PortalFeature text="Tracking en vivo de contenedores" />
                <PortalFeature text="Descarga de documentos y facturas" />
                <PortalFeature text="Tu marca, tu dominio, tu estilo" />
              </div>

              <Button 
                size="lg" 
                className="mt-8 bg-white text-indigo-900 hover:bg-indigo-50"
                onClick={() => navigate('/register')}
              >
                Quiero mi portal de clientes
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-2xl opacity-30" />
              <div className="relative bg-white rounded-2xl shadow-2xl p-4 transform hover:scale-[1.02] transition-transform">
                <div className="bg-slate-100 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                    <div>
                      <p className="font-semibold text-slate-900">Portal de Logística Express</p>
                      <p className="text-sm text-slate-500">cliente.logisticaexpress.com</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Ship className="w-5 h-5 text-indigo-600" />
                        <div>
                          <p className="font-medium text-slate-900">MSKU-1234567</p>
                          <p className="text-sm text-slate-500">Shanghai → Buenos Aires</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        En tránsito
                      </span>
                    </div>
                    <div className="bg-white rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-slate-900">Factura #FC-2024-0847</p>
                          <p className="text-sm text-slate-500">Emitida hace 2 días</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        Pendiente
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium mb-4">
              <Star className="w-4 h-4 fill-current" />
              4.9/5 en Google
            </span>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-xl text-slate-600">
              Más de 500 reseñas de 5 estrellas
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <TestimonialCard
              quote="Nicroma cambió completamente cómo manejamos nuestras operaciones. Antes usábamos Excel y 5 sistemas diferentes. Ahora todo está en un solo lugar."
              author="María González"
              role="Directora de Operaciones"
              company="Logística Austral S.A."
              avatar="MG"
              rating={5}
            />
            <TestimonialCard
              quote="El portal de clientes es un antes y un después. Mis clientes están felices porque pueden ver todo sin molestarme. Y yo estoy feliz porque duermo tranquilo."
              author="Roberto Fernández"
              role="Gerente General"
              company="TransGlobal Argentina"
              avatar="RF"
              rating={5}
            />
            <TestimonialCard
              quote="La integración con AFIP funciona perfecta. Facturamos electrónicamente en segundos. El soporte es excelente, siempre responden rápido."
              author="Carolina Méndez"
              role="Responsable Administrativo"
              company="Importadora del Sur"
              avatar="CM"
              rating={5}
            />
            <TestimonialCard
              quote="Probamos varios sistemas antes de Nicroma. Es el único que realmente entiende cómo trabajamos los despachantes y forwarders en Argentina."
              author="Juan Pablo Torres"
              role="Despachante de Aduanas"
              company="Torres & Asociados"
              avatar="JT"
              rating={5}
            />
            <TestimonialCard
              quote="El tracking de navieras en tiempo real es increíble. Antes perdía horas llamando a las líneas. Ahora todo está automatizado."
              author="Luciana Ruiz"
              role="Coordinadora de Embarques"
              company="FastCargo Logistics"
              avatar="LR"
              rating={5}
            />
            <TestimonialCard
              quote="Arrancamos con el plan Emprendedor y en 6 meses pasamos a Business. Nicroma creció con nosotros. Excelente inversión."
              author="Martín Sánchez"
              role="Fundador"
              company="Cargo Express BA"
              avatar="MS"
              rating={5}
            />
          </div>

          {/* Google Review Badge */}
          <div className="mt-16 flex justify-center">
            <div className="inline-flex items-center gap-4 px-8 py-4 bg-white rounded-2xl shadow-lg">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                ))}
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div>
                <p className="font-bold text-slate-900">4.9 de 5</p>
                <p className="text-sm text-slate-500">547 reseñas en Google</p>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <img 
                src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" 
                alt="Google" 
                className="h-6 object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              7 días de prueba gratis
            </span>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Planes que crecen con vos
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
              Empezá gratis. Escalá cuando lo necesites. Sin sorpresas.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-3 p-1.5 rounded-xl bg-slate-100">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === 'monthly' 
                    ? 'bg-white text-slate-900 shadow-md' 
                    : 'text-slate-600'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  billingCycle === 'yearly' 
                    ? 'bg-white text-slate-900 shadow-md' 
                    : 'text-slate-600'
                }`}
              >
                Anual
                <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
                  2 meses gratis
                </span>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {plans.filter(p => p.slug !== 'enterprise').map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  billingCycle={billingCycle}
                  isPopular={isPopular(plan.slug)}
                  onSelect={() => handleSelectPlan(plan)}
                  formatPrice={formatPrice}
                />
              ))}

              {/* Enterprise Card */}
              {plans.find(p => p.slug === 'enterprise') && (
                <div className="relative rounded-2xl p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                    <p className="text-sm text-slate-300">Para grandes empresas</p>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-bold">Contactar</span>
                  </div>

                  <button
                    onClick={() => handleSelectPlan({ slug: 'enterprise', isContactSales: true })}
                    className="w-full py-3 px-4 rounded-xl bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                  >
                    Hablar con ventas
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="mt-6 space-y-3 text-sm">
                    <PlanFeature included text="Todo de Business" light />
                    <PlanFeature included text="Usuarios ilimitados" light />
                    <PlanFeature included text="Integraciones custom" light />
                    <PlanFeature included text="SLA garantizado" light />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Accompaniment Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl p-8 md:p-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                ¿Estás empezando? Te acompañamos.
              </h2>
              <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
                Sabemos que cada peso cuenta cuando arrancás. Si el precio es un problema, 
                tenemos una oferta especial: <strong>$10.000/mes los primeros 2 meses</strong>. 
                Queremos que crezcas con nosotros.
              </p>
              <Button 
                size="lg"
                className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-xl"
                onClick={() => navigate('/register')}
              >
                Empezar ahora
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Preguntas frecuentes
            </h2>
            <p className="text-xl text-slate-600">
              ¿Tenés dudas? Acá respondemos las más comunes.
            </p>
          </div>

          <div className="space-y-4">
            <FAQItem 
              question="¿Cuánto dura la prueba gratuita?"
              answer="La prueba gratuita dura 7 días con acceso completo al plan Profesional. Si necesitás más tiempo, podemos extenderla hasta 21 días. Solo contactanos."
            />
            <FAQItem 
              question="¿Necesito tarjeta de crédito para empezar?"
              answer="No, podés empezar tu prueba gratuita sin ingresar ningún dato de pago. Solo te pedimos los datos cuando decidas contratar un plan."
            />
            <FAQItem 
              question="¿Puedo cambiar de plan en cualquier momento?"
              answer="Sí, podés subir o bajar de plan cuando quieras. Si subís, el cambio es inmediato y prorrateamos la diferencia. Si bajás, el cambio aplica en el próximo ciclo."
            />
            <FAQItem 
              question="¿Mis datos están seguros?"
              answer="Absolutamente. Usamos encriptación de última generación, servidores seguros y hacemos backups automáticos diarios. Cumplimos con todas las normativas de protección de datos."
            />
            <FAQItem 
              question="¿Tienen soporte en español?"
              answer="Por supuesto. Somos argentinos y todo nuestro equipo de soporte habla español. Respondemos en menos de 2 horas en días hábiles."
            />
            <FAQItem 
              question="¿Puedo cancelar cuando quiera?"
              answer="Sí, podés cancelar tu suscripción en cualquier momento sin penalidades. Seguís teniendo acceso hasta el final del período pagado."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            ¿Listo para profesionalizar tu operación?
          </h2>
          <p className="text-xl text-slate-600 mb-10">
            Unite a las +2,847 empresas que ya usan Nicroma para gestionar su comercio exterior.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/30 px-8"
            >
              Empezar prueba gratis
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.location.href = 'mailto:ventas@nicroma.com'}
            >
              Hablar con un asesor
            </Button>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Sin tarjeta de crédito • Configuración en 5 minutos • Cancelá cuando quieras
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Ship className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">Nicroma</span>
              </div>
              <p className="text-slate-600 text-sm">
                El software de comercio exterior que tu empresa necesita.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#features" className="hover:text-indigo-600">Características</a></li>
                <li><a href="#pricing" className="hover:text-indigo-600">Precios</a></li>
                <li><a href="#testimonials" className="hover:text-indigo-600">Testimonios</a></li>
                <li><a href="#faq" className="hover:text-indigo-600">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="/terms" className="hover:text-indigo-600">Términos y condiciones</a></li>
                <li><a href="/privacy" className="hover:text-indigo-600">Política de privacidad</a></li>
                <li><a href="mailto:soporte@nicroma.com" className="hover:text-indigo-600">Contacto</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Contacto</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>soporte@nicroma.com</li>
                <li>ventas@nicroma.com</li>
                <li>Buenos Aires, Argentina</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © 2026 Nicroma. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Shield className="w-4 h-4" />
                Datos protegidos
              </span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Globe className="w-4 h-4" />
                Hecho en Argentina
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
          opacity: 0;
        }
        .animation-delay-600 {
          animation-delay: 0.6s;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

// Animated Counter Component
const AnimatedCounter = ({ end, suffix = '', label, decimals = 0 }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const increment = end / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, end]);

  return (
    <div ref={countRef} className="text-center">
      <p className="text-4xl font-bold text-slate-900">
        {count.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}{suffix}
      </p>
      <p className="text-slate-600">{label}</p>
    </div>
  );
};

// Company Logo Component
const CompanyLogo = ({ name }) => (
  <div className="flex items-center justify-center">
    <span className="text-2xl font-bold text-slate-400">{name}</span>
  </div>
);

// Feature Card Component
const FeatureCard = ({ icon: Icon, title, description, color, badge }) => {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-600',
    purple: 'bg-purple-100 text-purple-600',
    pink: 'bg-pink-100 text-pink-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="relative p-8 bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-xl transition-all group">
      {badge && (
        <span className="absolute -top-3 right-4 px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-medium rounded-full">
          {badge}
        </span>
      )}
      <div className={`w-14 h-14 rounded-2xl ${colors[color]} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </div>
  );
};

// Portal Feature Component
const PortalFeature = ({ text }) => (
  <div className="flex items-center gap-3">
    <CheckCircle className="w-5 h-5 text-indigo-300" />
    <span className="text-indigo-100">{text}</span>
  </div>
);

// Testimonial Card Component
const TestimonialCard = ({ quote, author, role, company, avatar, rating }) => (
  <div className="p-8 bg-white rounded-2xl border border-slate-200 hover:shadow-xl transition-shadow">
    <div className="flex items-center gap-1 mb-4">
      {[...Array(rating)].map((_, i) => (
        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
      ))}
    </div>
    <p className="text-slate-700 mb-6 leading-relaxed">"{quote}"</p>
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
        {avatar}
      </div>
      <div>
        <p className="font-semibold text-slate-900">{author}</p>
        <p className="text-sm text-slate-500">{role}</p>
        <p className="text-sm text-indigo-600">{company}</p>
      </div>
    </div>
  </div>
);

// Plan Card Component
const PlanCard = ({ plan, billingCycle, isPopular, onSelect, formatPrice }) => (
  <div
    className={`relative rounded-2xl p-6 bg-white border transition-all hover:shadow-xl ${
      isPopular ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-slate-200'
    }`}
  >
    {isPopular && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-full">
        Más popular
      </div>
    )}

    <div className="mb-6">
      <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
      <p className="text-sm text-slate-500">{plan.description}</p>
    </div>

    <div className="mb-6">
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold text-slate-900">
          {formatPrice(billingCycle === 'yearly' ? plan.priceYearly / 12 : plan.priceMonthly)}
        </span>
        <span className="text-slate-500">/mes</span>
      </div>
      {billingCycle === 'yearly' && (
        <p className="text-sm text-green-600 mt-1">
          {formatPrice(plan.priceYearly)} facturado anualmente
        </p>
      )}
    </div>

    <button
      onClick={onSelect}
      className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
        isPopular
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30'
          : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
      }`}
    >
      Empezar prueba gratis
      <ArrowRight className="w-4 h-4" />
    </button>

    <div className="mt-6 space-y-3 text-sm">
      <PlanFeature included text={`${plan.limits?.users || '∞'} usuarios`} />
      <PlanFeature included text={`${plan.limits?.carpetasPerMonth || '∞'} carpetas/mes`} />
      <PlanFeature included text={`${plan.limits?.clientes || '∞'} clientes`} />
      <PlanFeature included={plan.includes?.portalClientes} text="Portal de clientes" />
      <PlanFeature 
        included={plan.includes?.trackingNavieras} 
        text="Tracking navieras" 
        upgrade={!plan.includes?.trackingNavieras}
      />
      <PlanFeature 
        included={plan.includes?.facturacionAfip} 
        text="Facturación AFIP" 
        upgrade={!plan.includes?.facturacionAfip}
      />
      <PlanFeature 
        included={plan.includes?.reportesAvanzados} 
        text="Reportes avanzados" 
        upgrade={!plan.includes?.reportesAvanzados}
      />
    </div>
  </div>
);

// Plan Feature Component
const PlanFeature = ({ included, text, upgrade = false, light = false }) => (
  <div className="flex items-center gap-3">
    {included ? (
      <Check className={`w-4 h-4 ${light ? 'text-green-400' : 'text-green-500'}`} />
    ) : upgrade ? (
      <Zap className="w-4 h-4 text-amber-500" />
    ) : (
      <X className="w-4 h-4 text-slate-300" />
    )}
    <span className={light ? 'text-slate-200' : (included ? 'text-slate-700' : 'text-slate-400')}>
      {text}
      {upgrade && <span className="ml-1 text-amber-500 text-xs">(upgrade)</span>}
    </span>
  </div>
);

// FAQ Item Component
const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left"
      >
        <span className="font-semibold text-slate-900">{question}</span>
        <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-6 pb-5 text-slate-600">
          {answer}
        </div>
      )}
    </div>
  );
};

export default PricingPage;
