import { useState } from 'react';
import { 
  Palette, Bell, Monitor, Check, Sun, Moon, 
  Volume2, VolumeX, Eye, Languages, Clock
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Label } from '../components/ui';
import { useTheme, themes } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function UserSettingsPage() {
  const { user } = useAuth();
  const { currentTheme, changeTheme } = useTheme();
  
  // Configuraciones de notificaciones (local storage)
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('nicroma-notifications');
    return saved ? JSON.parse(saved) : {
      email: true,
      push: true,
      sound: true,
      desktop: false
    };
  });

  // Configuraciones de visualización
  const [display, setDisplay] = useState(() => {
    const saved = localStorage.getItem('nicroma-display');
    return saved ? JSON.parse(saved) : {
      compactMode: false,
      animations: true,
      showAvatars: true
    };
  });

  const handleNotificationChange = (key) => {
    const newNotifications = { ...notifications, [key]: !notifications[key] };
    setNotifications(newNotifications);
    localStorage.setItem('nicroma-notifications', JSON.stringify(newNotifications));
    toast.success('Preferencia guardada');
  };

  const handleDisplayChange = (key) => {
    const newDisplay = { ...display, [key]: !display[key] };
    setDisplay(newDisplay);
    localStorage.setItem('nicroma-display', JSON.stringify(newDisplay));
    toast.success('Preferencia guardada');
  };

  const themesList = Object.values(themes);

  return (
    <Layout title="Configuración" subtitle="Personaliza tu experiencia en la plataforma">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Tema de la Interfaz */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Tema de la Interfaz
            </CardTitle>
            <p className="text-sm text-[var(--color-textSecondary)] mt-1">
              Elegí el tema que más te guste. Tu elección es personal y no afecta a otros usuarios.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {themesList.map((t) => {
                const isSelected = currentTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      changeTheme(t.id);
                      toast.success(`Tema "${t.name}" aplicado`);
                    }}
                    className={`relative p-4 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                      isSelected
                        ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                    }`}
                    style={{ background: t.colors.card }}
                  >
                    {/* Preview de colores */}
                    <div className="flex gap-1 mb-3 justify-center">
                      <div
                        className="w-5 h-5 rounded-full border border-white/20"
                        style={{ background: t.colors.primary }}
                      />
                      <div
                        className="w-5 h-5 rounded-full border border-white/20"
                        style={{ background: t.colors.accent }}
                      />
                      <div
                        className="w-5 h-5 rounded-full border border-white/20"
                        style={{ background: t.colors.background }}
                      />
                    </div>

                    {/* Nombre */}
                    <p
                      className="text-sm font-medium text-center"
                      style={{ color: t.colors.text }}
                    >
                      {t.name}
                    </p>
                    <p
                      className="text-xs text-center mt-0.5"
                      style={{ color: t.colors.textSecondary }}
                    >
                      {t.isDark ? 'Oscuro' : 'Claro'}
                    </p>

                    {/* Check de seleccionado */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Vista previa */}
            <div className="mt-6 p-4 rounded-xl border border-[var(--color-border)]" style={{ background: 'var(--color-background)' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Vista previa del tema actual
              </p>
              <div className="flex gap-3">
                <div className="flex-1 p-3 rounded-lg" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', borderWidth: '1px' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--color-primary)' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Título</p>
                      <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>Subtítulo</p>
                    </div>
                  </div>
                  <button className="w-full py-2 px-3 rounded-lg text-sm text-white" style={{ background: 'var(--color-primary)' }}>
                    Botón primario
                  </button>
                </div>
                <div className="w-20 rounded-lg p-2" style={{ background: 'var(--color-sidebar)' }}>
                  <div className="space-y-1">
                    <div className="h-2 rounded" style={{ background: 'var(--color-sidebarActive)', opacity: 0.8 }} />
                    <div className="h-2 rounded" style={{ background: 'var(--color-sidebarText)', opacity: 0.3 }} />
                    <div className="h-2 rounded" style={{ background: 'var(--color-sidebarText)', opacity: 0.3 }} />
                  </div>
                </div>
              </div>
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
            <p className="text-sm text-[var(--color-textSecondary)] mt-1">
              Configura cómo querés recibir las notificaciones
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text)]">Notificaciones por email</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Recibir actualizaciones en tu correo</p>
                </div>
              </div>
              <button
                onClick={() => handleNotificationChange('email')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications.email ? 'bg-[var(--color-primary)]' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  notifications.email ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text)]">Notificaciones push</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Alertas en tiempo real en el navegador</p>
                </div>
              </div>
              <button
                onClick={() => handleNotificationChange('push')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications.push ? 'bg-[var(--color-primary)]' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  notifications.push ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  {notifications.sound ? (
                    <Volume2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text)]">Sonidos</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Reproducir sonido con las notificaciones</p>
                </div>
              </div>
              <button
                onClick={() => handleNotificationChange('sound')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications.sound ? 'bg-[var(--color-primary)]' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  notifications.sound ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Visualización */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Visualización
            </CardTitle>
            <p className="text-sm text-[var(--color-textSecondary)] mt-1">
              Ajusta cómo se muestra la información
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text)]">Modo compacto</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Reduce el espaciado para ver más contenido</p>
                </div>
              </div>
              <button
                onClick={() => handleDisplayChange('compactMode')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  display.compactMode ? 'bg-[var(--color-primary)]' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  display.compactMode ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Sun className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text)]">Animaciones</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Transiciones y efectos visuales</p>
                </div>
              </div>
              <button
                onClick={() => handleDisplayChange('animations')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  display.animations ? 'bg-[var(--color-primary)]' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  display.animations ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text)]">Mostrar avatares</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Mostrar fotos de perfil en las listas</p>
                </div>
              </div>
              <button
                onClick={() => handleDisplayChange('showAvatars')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  display.showAvatars ? 'bg-[var(--color-primary)]' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  display.showAvatars ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Info del usuario */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-textSecondary)]">
                Configuración guardada para: <strong className="text-[var(--color-text)]">{user?.email}</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('nicroma-theme');
                  localStorage.removeItem('nicroma-notifications');
                  localStorage.removeItem('nicroma-display');
                  window.location.reload();
                }}
              >
                Restablecer todo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default UserSettingsPage;
