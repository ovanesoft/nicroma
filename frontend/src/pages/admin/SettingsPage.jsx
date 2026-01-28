import { useState, useEffect } from 'react';
import { 
  Settings, 
  Palette, 
  Bell, 
  Shield, 
  Database, 
  Mail,
  Globe,
  Check,
  Moon,
  Sun,
  Zap,
  Leaf,
  Waves,
  Sunset,
  Heart,
  Sparkles
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../../components/ui';
import { useTheme, themes } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import api from '../../api/axios';

// Iconos para cada tema
const themeIcons = {
  default: Sparkles,
  dark: Moon,
  midnight: Zap,
  matrix: Zap,
  ocean: Waves,
  sunset: Sunset,
  rose: Heart,
  emerald: Leaf,
};

function SettingsPage() {
  const { currentTheme, theme, changeTheme } = useTheme();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    securityAlerts: true,
    weeklyReport: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    requireEmailVerification: true,
  });
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    // Cargar info del sistema
    const loadSystemInfo = async () => {
      try {
        const response = await api.get('/stats');
        if (response.data.success) {
          setSystemInfo(response.data.data);
        }
      } catch (error) {
        console.error('Error cargando info del sistema:', error);
      }
    };
    loadSystemInfo();
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast.success('Configuración guardada');
  };

  return (
    <Layout title="Configuración" subtitle="Personaliza tu experiencia y configura el sistema">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Temas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Tema de la Interfaz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--color-textSecondary)] mb-4">
                Selecciona el tema que prefieras para la interfaz
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.values(themes).map((t) => {
                  const Icon = themeIcons[t.id] || Palette;
                  const isSelected = currentTheme === t.id;
                  
                  return (
                    <button
                      key={t.id}
                      onClick={() => changeTheme(t.id)}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' 
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                      }`}
                      style={{ background: t.colors.card }}
                    >
                      {isSelected && (
                        <div 
                          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: t.colors.primary }}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center mb-2 mx-auto"
                        style={{ background: t.colors.primary }}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm font-medium text-center" style={{ color: t.colors.text }}>
                        {t.name}
                      </p>
                      <p className="text-xs text-center mt-1" style={{ color: t.colors.textSecondary }}>
                        {t.isDark ? 'Oscuro' : 'Claro'}
                      </p>
                      
                      {/* Preview colors */}
                      <div className="flex justify-center gap-1 mt-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ background: t.colors.primary }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ background: t.colors.accent }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ background: t.colors.background }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <div className="mt-4 p-4 rounded-lg" style={{ background: theme.colors.sidebar }}>
                <p className="text-sm" style={{ color: theme.colors.sidebarText }}>
                  <strong>Tema actual:</strong> {theme.name} - {theme.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-[var(--color-text)]">Notificaciones por email</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Recibir alertas importantes por correo</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                <div>
                  <p className="font-medium text-[var(--color-text)]">Alertas de seguridad</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Notificar intentos de acceso sospechosos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.securityAlerts}
                    onChange={(e) => handleSettingChange('securityAlerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                <div>
                  <p className="font-medium text-[var(--color-text)]">Reporte semanal</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Resumen de actividad cada lunes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.weeklyReport}
                    onChange={(e) => handleSettingChange('weeklyReport', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Seguridad */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-[var(--color-text)]">Tiempo de sesión (minutos)</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Inactividad antes de cerrar sesión</p>
                </div>
                <select
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)]"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={120}>2 horas</option>
                  <option value={480}>8 horas</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                <div>
                  <p className="font-medium text-[var(--color-text)]">Intentos de login máximos</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Antes de bloquear la cuenta</p>
                </div>
                <select
                  value={settings.maxLoginAttempts}
                  onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)]"
                >
                  <option value={3}>3 intentos</option>
                  <option value={5}>5 intentos</option>
                  <option value={10}>10 intentos</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                <div>
                  <p className="font-medium text-[var(--color-text)]">Verificación de email obligatoria</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Los usuarios deben verificar su email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireEmailVerification}
                    onChange={(e) => handleSettingChange('requireEmailVerification', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-textSecondary)]">Versión</span>
                <Badge>v1.0.0</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-textSecondary)]">Ambiente</span>
                <Badge variant="success">Producción</Badge>
              </div>
              {systemInfo && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--color-textSecondary)]">Organizaciones</span>
                    <span className="font-medium text-[var(--color-text)]">{systemInfo.tenants || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--color-textSecondary)]">Usuarios</span>
                    <span className="font-medium text-[var(--color-text)]">{systemInfo.users || 0}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Email Config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--color-textSecondary)]">Proveedor</span>
                <Badge variant="purple">Resend</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--color-textSecondary)]">Estado</span>
                <Badge variant="success">Activo</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--color-textSecondary)]">Dominio</span>
                <span className="font-medium text-[var(--color-text)] text-sm">nicroma.com</span>
              </div>
            </CardContent>
          </Card>

          {/* Domain Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Dominios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-[var(--color-background)]">
                <p className="text-xs text-[var(--color-textSecondary)]">Frontend</p>
                <p className="font-mono text-sm text-[var(--color-text)]">nicroma.com</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--color-background)]">
                <p className="text-xs text-[var(--color-textSecondary)]">API</p>
                <p className="font-mono text-sm text-[var(--color-text)]">api.nicroma.com</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="secondary" 
                className="w-full justify-start"
                onClick={() => {
                  localStorage.clear();
                  toast.success('Caché limpiado');
                }}
              >
                Limpiar caché local
              </Button>
              <Button 
                variant="secondary" 
                className="w-full justify-start"
                onClick={() => window.location.reload()}
              >
                Recargar aplicación
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

export default SettingsPage;
