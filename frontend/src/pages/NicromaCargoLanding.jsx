import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ship, Package, FileText, MapPin, CreditCard, BarChart3, 
  ArrowRight, Mail, Lock, User, Building2, CheckCircle,
  Globe, Shield, Clock, TrendingUp, Award, Play, Menu, X, Zap, Star,
  ChevronRight, Laptop, Headphones
} from 'lucide-react';
import { Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const NicromaCargoLanding = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Servicios', href: '#services' },
    { name: 'Tecnología', href: '#tech' },
    { name: 'Nosotros', href: '#about' },
    { name: 'Contacto', href: '#contact' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        scrolled 
          ? "bg-slate-950/95 backdrop-blur-md border-slate-800 py-3 shadow-lg" 
          : "bg-slate-950 border-slate-800 py-5"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
                <img 
                  src="/images/nicroma-cargo-final-logo.png" 
                  alt="Nicroma Cargo Logo" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                Nicroma Cargo
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <div className="h-6 w-px bg-slate-800" />
              {isAuthenticated ? (
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                >
                  Ir al Dashboard
                </Button>
              ) : (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => navigate('/login')}
                    className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                  <Button 
                    onClick={() => navigate('/register')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 px-6"
                  >
                    Empezar Ahora
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={cn(
          "md:hidden absolute top-full left-0 right-0 bg-slate-900 border-b border-slate-800 p-4 space-y-4 shadow-xl transition-all duration-300 origin-top",
          isMenuOpen ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0 pointer-events-none"
        )}>
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              className="block py-2 text-base font-medium text-slate-300 hover:text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.name}
            </a>
          ))}
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            <Button 
              variant="outline" 
              className="w-full justify-center border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => navigate('/login')}
            >
              Iniciar Sesión
            </Button>
            <Button 
              className="w-full justify-center bg-indigo-600 text-white"
              onClick={() => navigate('/register')}
            >
              Empezar Ahora
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-white">
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-100/60 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-100/60 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex flex-col items-center space-y-8">
            {/* Logo Central y Destacado */}
            <div className="w-full max-w-5xl">
              <div className="relative w-full">
                <div className="absolute -inset-20 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
                <img 
                  src="/images/nicroma-cargo-logo-white.png" 
                  alt="Nicroma Cargo" 
                  className="w-full h-auto"
                  style={{ display: 'block' }}
                />
              </div>
            </div>

            <div className="max-w-4xl space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-bold uppercase tracking-wider">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
                  </span>
                  Nueva Era en Logística Digital
                </div>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
                  Coordinación de <br />
                  <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 bg-clip-text text-transparent">
                    cargas inteligente
                  </span>
                </h1>
              </div>
              
              <p className="text-xl sm:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Potenciamos tu negocio de comercio exterior con tecnología de vanguardia. 
                Gestioná, trackeá y facturá en una plataforma diseñada para la eficiencia global.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xl px-10 py-8 rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all hover:-translate-y-1"
                  onClick={() => navigate('/register')}
                >
                  Empezar Ahora Gratis
                  <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
                <button className="w-full sm:w-auto flex items-center justify-center gap-4 px-8 py-5 text-slate-700 font-bold hover:text-indigo-600 transition-colors group bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current text-indigo-600 ml-0.5" />
                  </div>
                  Ver Demo
                </button>
              </div>

              <div className="flex items-center justify-center gap-8 pt-8">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-12 h-12 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                      <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                    </div>
                  ))}
                  <div className="w-12 h-12 rounded-full border-2 border-white bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    +2k
                  </div>
                </div>
                <div className="text-left">
                  <span className="font-bold text-slate-900 block text-lg">Confianza Global</span>
                  <span className="text-slate-500">Más de 2,000 empresas operando</span>
                </div>
              </div>
            </div>

            {/* Hero Image Destacada */}
            <div className="relative w-full max-w-5xl mx-auto mt-20 group">
              <div className="absolute -inset-10 bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 rounded-[3rem] blur-3xl -z-10 group-hover:opacity-100 transition-opacity" />
              <div className="relative rounded-[3rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.15)] border border-white/20">
                <img 
                  src="/images/hero-cargo.png" 
                  alt="Nicroma Cargo Hero" 
                  className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none" />
                
                {/* Floating Cards Centered Context */}
                <div className="absolute top-12 left-12 bg-white/90 backdrop-blur-md p-5 rounded-3xl shadow-2xl border border-white/50 hidden lg:block hover:-translate-y-2 transition-transform">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Eficiencia</p>
                      <p className="text-lg font-bold text-slate-800">+45% Productividad</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-12 right-12 bg-white/90 backdrop-blur-md p-5 rounded-3xl shadow-2xl border border-white/50 hidden lg:block hover:-translate-y-2 transition-transform">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                      <Ship className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tracking</p>
                      <p className="text-lg font-bold text-slate-800">En tiempo real</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-slate-50 text-slate-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-indigo-600 font-bold uppercase tracking-widest text-sm">Nuestras Soluciones</h2>
            <h3 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Todo lo que tu logística necesita, <br />
              <span className="text-slate-400">en un solo ecosistema.</span>
            </h3>
            <p className="text-lg text-slate-600">
              Diseñamos herramientas específicas para cada etapa de la cadena de suministro, 
              eliminando la fricción y centralizando la información.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ServiceCard 
              icon={FileText}
              title="Facturación Digital"
              desc="Emisión de facturas electrónicas AFIP, gestión de prefacturas y control de gastos en múltiples divisas."
              color="emerald"
              image="/images/digital-docs.png"
            />
            <ServiceCard 
              icon={Building2}
              title="Operaciones de Almacén"
              desc="Control total sobre el ingreso, egreso y stock de mercaderías en depósitos fiscales y propios."
              color="orange"
              image="/images/warehouse-tech.png"
            />
            <ServiceCard 
              icon={Ship}
              title="Logística Oceánica"
              desc="Gestión integral de fletes marítimos FCL/LCL con las principales alianzas navieras del mundo."
              color="blue"
              image="/images/ocean-cargo.png"
            />
            <ServiceCard 
              icon={User}
              title="Portal de Clientes"
              desc="Brindá a tus clientes un acceso exclusivo para consultar el estado de sus cargas y descargar documentos 24/7."
              color="purple"
              image="/images/customer-portal.png"
            />
            <ServiceCard 
              icon={BarChart3}
              title="Business Intelligence"
              desc="Reportes avanzados y tableros de control para tomar decisiones basadas en datos reales de tu operación."
              color="indigo"
              image="/images/bi-dashboard.png"
            />
            <ServiceCard 
              icon={Shield}
              title="Seguridad & Compliance"
              desc="Protección de datos de grado bancario y cumplimiento total con normativas aduaneras vigentes."
              color="rose"
              image="/images/security-tech.png"
            />
          </div>
        </div>
      </section>

      {/* Tech Section */}
      <section id="tech" className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-indigo-400 font-bold uppercase tracking-widest text-sm">Tecnología de Punta</h2>
                <h3 className="text-4xl sm:text-5xl font-bold leading-tight">
                  Conectividad total <br />
                  <span className="text-slate-500">sin fronteras.</span>
                </h3>
                <p className="text-lg text-slate-400">
                  Nuestra plataforma se integra con los principales actores del comercio exterior, 
                  permitiéndote una visibilidad completa de principio a fin.
                </p>
              </div>

              <div className="space-y-6">
                <TechItem 
                  icon={Zap} 
                  title="Velocidad Increíble" 
                  desc="Carga de datos y generación de documentos en milisegundos." 
                />
                <TechItem 
                  icon={Globe} 
                  title="Multi-divisa & Multi-idioma" 
                  desc="Operá en cualquier mercado con soporte para todas las monedas." 
                />
                <TechItem 
                  icon={Laptop} 
                  title="Cloud Native" 
                  desc="Accedé a toda tu información desde cualquier dispositivo, en cualquier lugar." 
                />
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-10 bg-indigo-500/20 rounded-full blur-[100px]" />
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-slate-700 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
                      <Ship className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-xl">Monitor de Carga</p>
                      <p className="text-slate-400 text-sm">Actualizado hace 2 min</p>
                    </div>
                  </div>
                  
                  {[
                    { label: 'Contenedor MSKU-882', status: 'En Puerto', color: 'text-green-400' },
                    { label: 'Vuelo AA-902', status: 'Despegado', color: 'text-blue-400' },
                    { label: 'Camión Interno', status: 'En Tránsito', color: 'text-yellow-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50 group-hover:translate-x-2 transition-transform duration-300">
                      <span className="font-medium">{item.label}</span>
                      <span className={cn("text-sm font-bold px-3 py-1 rounded-full bg-slate-800", item.color)}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operational Excellence Section */}
      <section className="py-24 bg-white overflow-hidden text-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 pt-12">
                  <div className="rounded-3xl overflow-hidden shadow-2xl">
                    <img src="/images/port-sunset.png" alt="Puerto" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-3xl overflow-hidden shadow-2xl">
                    <img src="/images/management-feature.png" alt="Gestión" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl overflow-hidden shadow-2xl">
                    <img src="/images/control-room.png" alt="Centro de Control" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-3xl overflow-hidden shadow-2xl">
                    <img src="/images/tracking-feature.png" alt="Tracking" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-8 order-1 lg:order-2">
              <div className="space-y-4">
                <h2 className="text-indigo-600 font-bold uppercase tracking-widest text-sm">Excelencia Operativa</h2>
                <h3 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
                  Infraestructura global <br />
                  <span className="text-slate-400">a tu servicio.</span>
                </h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  No solo somos software. Somos el puente entre tu mercadería y el mundo, 
                  respaldados por una red logística de primer nivel y centros de monitoreo 24/7.
                </p>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { label: 'Presencia Global', value: '+50 Países' },
                  { label: 'Cargas Mensuales', value: '+10k TEUs' },
                  { label: 'Soporte Activo', value: '24/7/365' },
                  { label: 'Eficiencia', value: '99.9%' },
                ].map((stat, i) => (
                  <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-sm text-slate-500 font-medium mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-indigo-500/40">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full -ml-32 -mb-32 blur-3xl" />
            
            <div className="relative space-y-8">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight">
                ¿Listo para transformar <br /> tu logística?
              </h2>
              <p className="text-xl text-indigo-100 max-w-2xl mx-auto font-medium">
                Unite a las empresas líderes que ya están optimizando sus costos y tiempos con Nicroma Cargo.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-indigo-50 text-xl px-10 py-8 rounded-2xl font-bold shadow-xl transition-all hover:-translate-y-1"
                  onClick={() => navigate('/register')}
                >
                  Empezar Ahora
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 text-xl px-10 py-8 rounded-2xl font-bold"
                  onClick={() => window.location.href = 'mailto:info@nicroma.com'}
                >
                  Hablar con un Asesor
                </Button>
              </div>
              <p className="text-indigo-200 text-sm font-medium">
                Sin tarjeta de crédito • Instalación inmediata • Soporte 24/7
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 pt-20 pb-10 border-t border-slate-900 text-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6 col-span-1 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                  <img 
                    src="/images/nicroma-cargo-final-logo.png" 
                    alt="Nicroma Cargo Logo" 
                    className="w-full h-full object-contain" 
                  />
                </div>
                <span className="text-xl font-black tracking-tight text-white">
                  Nicroma Cargo
                </span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Revolucionando la gestión de carga y comercio exterior con tecnología inteligente y humana.
              </p>
              <div className="flex gap-4">
                {[Globe, Laptop, Headphones].map((Icon, i) => (
                  <button key={i} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-600 transition-all shadow-sm">
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Producto</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tracking</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Facturación</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Portal Cliente</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Compañía</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre Nosotros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Términos & Condiciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Newsletter</h4>
              <p className="text-sm text-slate-400 mb-4">Recibí las últimas novedades del sector.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="tu@email.com" 
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white"
                />
                <button className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-slate-500">
              © 2026 Nicroma Cargo. Todos los derechos reservados. Hecho con ❤️ en Argentina.
            </p>
            <div className="flex items-center gap-8 text-slate-500">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-medium">SSL Seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span className="text-xs font-medium">Calidad Certificada</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const ServiceCard = ({ icon: Icon, title, desc, color, image }) => {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-600',
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    rose: 'bg-rose-100 text-rose-600',
  };

  return (
    <div className="group bg-white rounded-[2.5rem] border border-slate-200 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden flex flex-col h-full">
      {image && (
        <div className="w-full h-56 overflow-hidden relative">
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
      <div className="p-8 flex flex-col flex-grow">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm", colors[color])}>
          <Icon className="w-7 h-7" />
        </div>
        <h4 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors">{title}</h4>
        <p className="text-slate-600 leading-relaxed mb-6 flex-grow">{desc}</p>
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
          Saber más <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};

const TechItem = ({ icon: Icon, title, desc }) => (
  <div className="flex gap-6 group">
    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
      <Icon className="w-6 h-6" />
    </div>
    <div className="space-y-1">
      <h4 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">{title}</h4>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default NicromaCargoLanding;
