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
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title */}
          <div>
            <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
            {subtitle && (
              <p className="text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                {getInitials(user?.firstName, user?.lastName)}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-700">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500">{user?.tenantName || 'Sistema'}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-800">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                        getRoleColor(user?.role)
                      )}>
                        {getRoleLabel(user?.role)}
                      </span>
                      {user?.tenantName && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
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
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                    >
                      <User className="w-4 h-4" />
                      Mi perfil
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/settings');
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                    >
                      <Settings className="w-4 h-4" />
                      Configuración
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
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
