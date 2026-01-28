import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Zap, Building2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getNavigation } from '../../lib/constants';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../context/AuthContext';
import { useCompanyConfig, useNotificaciones } from '../../hooks/useApi';

function Sidebar() {
  const { user } = useAuth();
  const { data: companyData } = useCompanyConfig();
  const { data: notificacionesData } = useNotificaciones();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [expandedItems, setExpandedItems] = useState({});
  const [hoveredItem, setHoveredItem] = useState(null);
  const hoverTimeoutRef = useRef(null);
  
  const navigation = getNavigation(user?.role);
  const notificaciones = notificacionesData?.data?.notificaciones || {};
  
  // Mapear notificaciones a rutas
  const getBadgeCount = (href, itemName) => {
    // Para usuarios del tenant
    if (href === '/presupuestos' || itemName === 'Presupuestos') {
      return notificaciones.presupuestosPendientes || 0;
    }
    // Para clientes del portal
    if (href === '/mis-presupuestos' || itemName === 'Mis Presupuestos') {
      const total = (notificaciones.presupuestosParaRevisar || 0) + (notificaciones.mensajesNoLeidos || 0);
      return total;
    }
    return 0;
  };

  const toggleExpanded = (name) => {
    setExpandedItems(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const isActiveParent = (item) => {
    if (!item.children) return false;
    return item.children.some(child => location.pathname === child.href);
  };

  const handleMouseEnter = (itemName) => {
    if (sidebarCollapsed) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setHoveredItem(itemName);
    }
  };

  const handleMouseLeave = () => {
    if (sidebarCollapsed) {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredItem(null);
      }, 300);
    }
  };

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Cerrar popover cuando se expande el sidebar
  useEffect(() => {
    if (!sidebarCollapsed) {
      setHoveredItem(null);
    }
  }, [sidebarCollapsed]);

  // Componente Badge de notificación
  const NotificationBadge = ({ count, small = false }) => {
    if (!count || count === 0) return null;
    return (
      <span className={cn(
        'bg-red-500 text-white font-bold rounded-full flex items-center justify-center animate-pulse',
        small 
          ? 'min-w-[16px] h-4 text-[10px] px-1' 
          : 'min-w-[20px] h-5 text-xs px-1.5'
      )}>
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  const NavItem = ({ item, depth = 0 }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.name] || isActiveParent(item);
    const isActive = location.pathname === item.href;
    const isHovered = hoveredItem === item.name;
    const badgeCount = getBadgeCount(item.href, item.name);
    
    // Calcular badge total para items con hijos
    const childrenBadgeTotal = hasChildren 
      ? item.children.reduce((total, child) => total + getBadgeCount(child.href, child.name), 0)
      : 0;
    
    if (hasChildren) {
      return (
        <div 
          className="relative"
          onMouseEnter={() => handleMouseEnter(item.name)}
          onMouseLeave={handleMouseLeave}
        >
          <button
            onClick={() => !sidebarCollapsed && toggleExpanded(item.name)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-colors',
              isActiveParent(item)
                ? 'text-primary-700 bg-primary-50'
                : 'text-slate-600 hover:bg-slate-100',
              sidebarCollapsed && 'justify-center px-2'
            )}
            title={sidebarCollapsed ? item.name : undefined}
          >
            <div className="relative">
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {/* Badge cuando sidebar está colapsado */}
              {sidebarCollapsed && childrenBadgeTotal > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold min-w-[14px] h-3.5 rounded-full flex items-center justify-center px-1">
                  {childrenBadgeTotal > 99 ? '99+' : childrenBadgeTotal}
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 font-medium">{item.name}</span>
                {childrenBadgeTotal > 0 && <NotificationBadge count={childrenBadgeTotal} />}
                <ChevronDown 
                  className={cn(
                    'w-4 h-4 transition-transform',
                    isExpanded && 'rotate-180'
                  )} 
                />
              </>
            )}
          </button>
          
          {/* Submenú expandido (sidebar abierto) */}
          {!sidebarCollapsed && isExpanded && (
            <div className="mt-1 ml-4 pl-4 border-l border-slate-200 space-y-1">
              {item.children.map((child) => (
                <NavItem key={child.name} item={child} depth={depth + 1} />
              ))}
            </div>
          )}

          {/* Popover flotante (sidebar colapsado) */}
          {sidebarCollapsed && isHovered && (
            <div 
              className="absolute left-full top-0 z-50 pl-1"
              onMouseEnter={() => handleMouseEnter(item.name)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Puente invisible para mantener el hover */}
              <div className="absolute left-0 top-0 w-3 h-full -translate-x-full" />
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[200px]">
                <div className="px-4 py-2 border-b border-slate-100">
                  <span className="font-semibold text-slate-800">{item.name}</span>
                </div>
                <div className="py-1">
                  {item.children.map((child) => {
                    const childBadge = getBadgeCount(child.href, child.name);
                    return (
                      <NavLink
                        key={child.name}
                        to={child.href}
                        onClick={() => setHoveredItem(null)}
                        className={({ isActive }) => cn(
                          'flex items-center gap-3 px-4 py-2 transition-colors',
                          isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        <child.icon className="w-4 h-4" />
                        <span className="text-sm flex-1">{child.name}</span>
                        {childBadge > 0 && <NotificationBadge count={childBadge} small />}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        to={item.href}
        className={({ isActive }) => cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors',
          isActive
            ? 'bg-primary-50 text-primary-700 font-medium'
            : 'text-slate-600 hover:bg-slate-100',
          sidebarCollapsed && 'justify-center px-2',
          depth > 0 && 'py-2'
        )}
        title={sidebarCollapsed ? item.name : undefined}
      >
        <div className="relative">
          <item.icon className={cn('flex-shrink-0', depth > 0 ? 'w-4 h-4' : 'w-5 h-5')} />
          {/* Badge cuando sidebar está colapsado */}
          {sidebarCollapsed && badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold min-w-[14px] h-3.5 rounded-full flex items-center justify-center px-1">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </div>
        {!sidebarCollapsed && (
          <>
            <span className={cn('flex-1', depth > 0 ? 'text-sm' : '')}>{item.name}</span>
            {badgeCount > 0 && <NotificationBadge count={badgeCount} small={depth > 0} />}
          </>
        )}
      </NavLink>
    );
  };

  const companyLogo = companyData?.data?.company?.logoUrl;
  const companyName = companyData?.data?.company?.name;

  return (
    <aside
      className={cn(
        'hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300',
        sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'
      )}
      style={{ 
        backgroundColor: 'var(--color-sidebar)', 
        borderRight: '1px solid var(--color-border)' 
      }}
    >
      {/* Header - Logo del Tenant */}
      <div className={cn(
        'flex items-center border-b border-slate-100',
        sidebarCollapsed ? 'justify-center px-2 h-16' : 'gap-3 px-6 h-16'
      )}>
        {companyLogo ? (
          <>
            <img 
              src={companyLogo} 
              alt={companyName || 'Logo'} 
              className={cn(
                'object-contain',
                sidebarCollapsed ? 'w-10 h-10' : 'w-10 h-10'
              )} 
            />
            {!sidebarCollapsed && (
              <span className="text-lg text-slate-800 font-semibold truncate">
                {companyName}
              </span>
            )}
          </>
        ) : (
          <>
            {user?.role !== 'root' && user?.tenantName ? (
              <>
                <div className={cn(
                  'bg-gradient-to-br from-primary-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold',
                  sidebarCollapsed ? 'w-10 h-10 text-sm' : 'w-10 h-10 text-sm'
                )}>
                  {user.tenantName.substring(0, 2).toUpperCase()}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-lg text-slate-800 font-semibold truncate">
                    {user.tenantName}
                  </span>
                )}
              </>
            ) : (
              <>
                <img src="/logo.png" alt="NicRoma" className="w-10 h-10 object-contain" />
                {!sidebarCollapsed && (
                  <span className="text-xl text-slate-800 font-semibold">NicRoma</span>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
      </nav>

      {/* Toggle Button */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={toggleSidebar}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          <ChevronLeft className={cn(
            'w-5 h-5 transition-transform',
            sidebarCollapsed && 'rotate-180'
          )} />
          {!sidebarCollapsed && <span className="text-sm">Colapsar</span>}
        </button>
      </div>

      {/* Powered by NicRoma (solo si el tenant tiene logo propio) */}
      {companyLogo && (
        <div className={cn(
          'border-t border-slate-100 flex items-center',
          sidebarCollapsed ? 'justify-center p-3' : 'gap-2 px-4 py-3'
        )}>
          <img src="/logo.png" alt="NicRoma" className="w-6 h-6 object-contain opacity-60" />
          {!sidebarCollapsed && (
            <span className="text-xs text-slate-400">Powered by NicRoma</span>
          )}
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
