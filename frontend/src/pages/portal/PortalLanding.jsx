import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Ship, Package, FileText, MapPin, CreditCard, BarChart3, 
  ArrowRight, Mail, Lock, User, Eye, EyeOff, Building2, CheckCircle
} from 'lucide-react';
import { usePortalInfo } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Label } from '../../components/ui';
import { cn } from '../../lib/utils';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const FEATURES = [
  { icon: Ship, title: 'Seguimiento en tiempo real', description: 'Monitorea tus envíos con actualizaciones en vivo' },
  { icon: FileText, title: 'Facturas digitales', description: 'Accede a todas tus facturas y documentos' },
  { icon: MapPin, title: 'Tracking de contenedores', description: 'Ubicación exacta de tu mercadería' },
  { icon: Package, title: 'Historial de operaciones', description: 'Consulta todas tus operaciones pasadas' },
  { icon: CreditCard, title: 'Pagos online', description: 'Paga de forma segura desde el portal' },
  { icon: BarChart3, title: 'Reportes', description: 'Estadísticas de tus operaciones' },
];

function PortalLanding() {
  const { portalSlug } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { data: portalData, isLoading, error } = usePortalInfo(portalSlug);

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: ''
  });

  const portal = portalData?.data;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'register') {
        if (form.password !== form.confirmPassword) {
          toast.error('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }
        if (form.password.length < 8) {
          toast.error('La contraseña debe tener al menos 8 caracteres');
          setLoading(false);
          return;
        }

        // Registrar como cliente del tenant
        const response = await api.post('/auth/register-portal', {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          tenantId: portal.id
        });

        if (response.data.success) {
          toast.success('Cuenta creada. Revisa tu email para verificar.');
          setMode('login');
          setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
        }
      } else {
        // Login usando el contexto de autenticación
        const result = await login(form.email, form.password);

        if (result.success) {
          toast.success('Bienvenido!');
          navigate('/dashboard');
        } else {
          toast.error(result.message || 'Error al iniciar sesión');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !portal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Portal no encontrado</h1>
          <p className="text-slate-500 mb-6">El portal que buscas no existe o no está disponible.</p>
          <Link to="/login" className="text-primary-600 hover:underline">
            Ir al inicio de sesión principal
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = portal.primaryColor || '#3b82f6';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {portal.logoUrl ? (
              <img src={portal.logoUrl} alt={portal.name} className="h-10 object-contain" />
            ) : (
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {portal.name?.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xl font-semibold text-slate-800">{portal.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              to="/login"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Acceso empresas
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Info */}
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              Portal de Clientes
            </h1>
            {portal.welcomeMessage ? (
              <p className="text-lg text-slate-600 mb-8">
                {portal.welcomeMessage}
              </p>
            ) : (
              <p className="text-lg text-slate-600 mb-8">
                Bienvenido al portal de clientes de {portal.name}. 
                Accede a toda la información de tus envíos, facturas y más.
              </p>
            )}

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <feature.icon className="w-5 h-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800 text-sm">{feature.title}</h3>
                    <p className="text-xs text-slate-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact */}
            {(portal.phone || portal.email) && (
              <div className="mt-8 p-4 bg-white rounded-xl border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">¿Necesitas ayuda?</p>
                {portal.email && (
                  <p className="text-sm text-slate-500">{portal.email}</p>
                )}
                {portal.phone && (
                  <p className="text-sm text-slate-500">{portal.phone}</p>
                )}
              </div>
            )}
          </div>

          {/* Right - Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Tabs */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => setMode('login')}
                className={cn(
                  'flex-1 py-3 rounded-xl font-medium transition-colors',
                  mode === 'login'
                    ? 'text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
                style={mode === 'login' ? { backgroundColor: primaryColor } : {}}
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => setMode('register')}
                className={cn(
                  'flex-1 py-3 rounded-xl font-medium transition-colors',
                  mode === 'register'
                    ? 'text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
                style={mode === 'register' ? { backgroundColor: primaryColor } : {}}
              >
                Registrarse
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={form.firstName}
                        onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Juan"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Apellido</Label>
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Pérez"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="tu@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <Label>Confirmar Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? 'Procesando...' : (
                  <>
                    {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              {mode === 'login' && (
                <Link 
                  to="/forgot-password" 
                  className="block text-center text-sm text-slate-500 hover:text-slate-700"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
          <img src="/logo.png" alt="NicRoma" className="w-5 h-5 opacity-50" />
          <span>Powered by NicRoma</span>
        </div>
      </footer>
    </div>
  );
}

export default PortalLanding;
