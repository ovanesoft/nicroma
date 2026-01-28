import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, Bell, ChevronDown, User, Settings, LogOut, Building2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getRoleLabel, getRoleColor, getInitials } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useUIStore } from '../../stores/uiStore';

function Header({ title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toggleMobileSidebar, sidebarCollapsed } = useUIStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
          <button 
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text)' }}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
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
