import { NavLink, useLocation } from 'react-router-dom';
import { X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { getNavigation } from '../../lib/constants';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../context/AuthContext';

function MobileSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const { sidebarMobileOpen, closeMobileSidebar } = useUIStore();
  const [expandedItems, setExpandedItems] = useState({});
  
  const navigation = getNavigation(user?.role);

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

  const NavItem = ({ item, depth = 0 }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.name] || isActiveParent(item);
    const isActive = location.pathname === item.href;
    
    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleExpanded(item.name)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-colors"
            style={{
              color: isActiveParent(item) ? 'var(--color-sidebarActive)' : 'var(--color-sidebarText)',
              backgroundColor: isActiveParent(item) ? 'var(--color-primary)20' : 'transparent'
            }}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 font-medium">{item.name}</span>
            <ChevronDown 
              className={cn(
                'w-4 h-4 transition-transform',
                isExpanded && 'rotate-180'
              )} 
            />
          </button>
          
          {isExpanded && (
            <div 
              className="mt-1 ml-4 pl-4 space-y-1"
              style={{ borderLeft: '1px solid var(--color-border)' }}
            >
              {item.children.map((child) => (
                <NavItem key={child.name} item={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        to={item.href}
        onClick={closeMobileSidebar}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors',
          depth > 0 && 'py-2'
        )}
        style={{
          color: isActive ? 'var(--color-sidebarActive)' : 'var(--color-sidebarText)',
          backgroundColor: isActive ? 'var(--color-primary)20' : 'transparent',
          fontWeight: isActive ? '500' : 'normal'
        }}
      >
        <item.icon className={cn('flex-shrink-0', depth > 0 ? 'w-4 h-4' : 'w-5 h-5')} />
        <span className={depth > 0 ? 'text-sm' : ''}>{item.name}</span>
      </NavLink>
    );
  };

  return (
    <div className={cn(
      'fixed inset-0 z-50 lg:hidden',
      sidebarMobileOpen ? '' : 'pointer-events-none'
    )}>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity',
          sidebarMobileOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={closeMobileSidebar}
      />

      {/* Sidebar */}
      <div 
        className={cn(
          'fixed inset-y-0 left-0 w-72 shadow-xl transform transition-transform',
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ backgroundColor: 'var(--color-sidebar)' }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NicRoma" className="w-10 h-10 object-contain" />
            <span 
              className="text-xl font-semibold"
              style={{ color: 'var(--color-sidebarText)' }}
            >
              NicRoma
            </span>
          </div>
          <button
            onClick={closeMobileSidebar}
            className="p-2 rounded-lg"
            style={{ color: 'var(--color-sidebarText)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>
      </div>
    </div>
  );
}

export default MobileSidebar;
