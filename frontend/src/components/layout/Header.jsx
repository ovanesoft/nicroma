import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, Bell, ChevronDown, User, Settings, LogOut, Building2,
  Megaphone, CreditCard, AlertTriangle, Clock, Gift, CheckCircle,
  MessageSquare, X, Check
} from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';
import { getRoleLabel, getRoleColor, getInitials } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useUIStore } from '../../stores/uiStore';
import { useMyNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useUnreadConversationsCount } from '../../hooks/useApi';

// Iconos y colores por tipo de notificación
const NOTIFICATION_STYLES = {
  ANNOUNCEMENT: { icon: Megaphone, color: 'text-blue-500', bg: 'bg-blue-100' },
  MAINTENANCE: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100' },
  NEW_FEATURE: { icon: Gift, color: 'text-purple-500', bg: 'bg-purple-100' },
  PAYMENT_FAILED: { icon: CreditCard, color: 'text-red-500', bg: 'bg-red-100' },
  PAYMENT_SUCCESS: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
  SUBSCRIPTION_EXPIRING: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100' },
  TRIAL_EXPIRING: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100' },
  PLAN_LIMIT_WARNING: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100' },
  QUOTE_RECEIVED: { icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  QUOTE_RESPONSE: { icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  MESSAGE_RECEIVED: { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-100' },
  WELCOME: { icon: Gift, color: 'text-green-500', bg: 'bg-green-100' },
  SYSTEM_ALERT: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100' }
};

function Header({ title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toggleMobileSidebar, sidebarCollapsed } = useUIStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Notificaciones del sistema
  const { data: notifData, isLoading: notifLoading } = useMyNotifications({ limit: 10 });
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();
  
  // Mensajes no leídos
  const { data: unreadConvData } = useUnreadConversationsCount();

  const notifications = notifData?.data?.notifications || [];
  const systemUnreadCount = notifData?.data?.unreadCount || 0;
  const messagesUnreadCount = unreadConvData?.data?.unreadCount || 0;
  const unreadCount = systemUnreadCount + messagesUnreadCount;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header 
      className="sticky top-0 z-40 backdrop-blur-md transition-colors duration-300"
      style={{ 
        backgroundColor: 'color-mix(in srgb, var(--color-card) 80%, transparent)',
        borderBottom: '1px solid var(--color-border)'
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 lg:px-8">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={toggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg"
            style={{ color: 'var(--color-text)' }}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title */}
          <div>
            <h1 
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p 
                className="text-sm"
                style={{ color: 'var(--color-textSecondary)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setDropdownOpen(false);
              }}
              className="relative p-2 rounded-lg transition-colors hover:bg-[var(--color-background)]"
              style={{ color: 'var(--color-text)' }}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div 
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl shadow-xl z-50 overflow-hidden"
                  style={{ 
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  {/* Header */}
                  <div 
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                      Notificaciones
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead.mutate()}
                        className="text-xs font-medium hover:underline"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>

                  {/* Lista de notificaciones */}
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifLoading ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text)' }} />
                        <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                          No tenés notificaciones
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const style = NOTIFICATION_STYLES[notif.type] || NOTIFICATION_STYLES.SYSTEM_ALERT;
                        const Icon = style.icon;
                        
                        return (
                          <div
                            key={notif.id}
                            className={cn(
                              'flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--color-background)]',
                              !notif.isRead && 'bg-[var(--color-primary)]/5'
                            )}
                            onClick={() => {
                              if (!notif.isRead) {
                                markAsRead.mutate(notif.id);
                              }
                              if (notif.actionUrl) {
                                navigate(notif.actionUrl);
                                setNotificationsOpen(false);
                              }
                            }}
                          >
                            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', style.bg)}>
                              <Icon className={cn('w-5 h-5', style.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p 
                                  className={cn('text-sm', !notif.isRead && 'font-semibold')}
                                  style={{ color: 'var(--color-text)' }}
                                >
                                  {notif.title}
                                </p>
                                {!notif.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0 mt-1.5" />
                                )}
                              </div>
                              <p 
                                className="text-xs mt-0.5 line-clamp-2"
                                style={{ color: 'var(--color-textSecondary)' }}
                              >
                                {notif.message}
                              </p>
                              <p 
                                className="text-xs mt-1"
                                style={{ color: 'var(--color-textSecondary)' }}
                              >
                                {formatDate(notif.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Mensajes no leídos */}
                  {messagesUnreadCount > 0 && (
                    <div 
                      className="px-4 py-3"
                      style={{ borderTop: '1px solid var(--color-border)' }}
                    >
                      <button
                        onClick={() => {
                          navigate('/messages');
                          setNotificationsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-[var(--color-background)] bg-blue-50"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                            {messagesUnreadCount} {messagesUnreadCount === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                            Ir a Mensajes
                          </p>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      </button>
                    </div>
                  )}

                  {/* Footer */}
                  {(notifications.length > 0 || messagesUnreadCount > 0) && (
                    <div 
                      className="px-4 py-3 text-center"
                      style={{ borderTop: '1px solid var(--color-border)' }}
                    >
                      <button
                        onClick={() => {
                          navigate('/notifications');
                          setNotificationsOpen(false);
                        }}
                        className="text-sm font-medium hover:underline"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        Ver todas las notificaciones
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-xl transition-colors"
              style={{ color: 'var(--color-text)' }}
            >
              <div 
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {getInitials(user?.firstName, user?.lastName)}
              </div>
              <div className="hidden md:block text-left">
                <p 
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  {user?.firstName} {user?.lastName}
                </p>
                <p 
                  className="text-xs"
                  style={{ color: 'var(--color-textSecondary)' }}
                >
                  {user?.tenantName || 'Sistema'}
                </p>
              </div>
              <ChevronDown 
                className="w-4 h-4 hidden md:block"
                style={{ color: 'var(--color-text)' }}
              />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div 
                  className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl py-2 z-50 animate-fade-in"
                  style={{ 
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  {/* User info */}
                  <div 
                    className="px-4 py-3"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <p 
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p 
                      className="text-xs"
                      style={{ color: 'var(--color-textSecondary)' }}
                    >
                      {user?.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                        getRoleColor(user?.role)
                      )}>
                        {getRoleLabel(user?.role)}
                      </span>
                      {user?.tenantName && (
                        <span 
                          className="text-xs flex items-center gap-1"
                          style={{ color: 'var(--color-textSecondary)' }}
                        >
                          <Building2 className="w-3 h-3" />
                          {user?.tenantName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/profile');
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm w-full text-left transition-colors"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <User className="w-4 h-4" />
                      Mi perfil
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/settings');
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm w-full text-left transition-colors"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <Settings className="w-4 h-4" />
                      Configuración
                    </button>
                  </div>

                  {/* Logout */}
                  <div style={{ borderTop: '1px solid var(--color-border)' }} className="py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 w-full text-left transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
