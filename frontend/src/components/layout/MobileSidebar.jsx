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
    
    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-colors',
              isActiveParent(item)
                ? 'text-primary-700 bg-primary-50'
                : 'text-slate-600 hover:bg-slate-100'
            )}
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
            <div className="mt-1 ml-4 pl-4 border-l border-slate-200 space-y-1">
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
        className={({ isActive }) => cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors',
          isActive
            ? 'bg-primary-50 text-primary-700 font-medium'
            : 'text-slate-600 hover:bg-slate-100',
          depth > 0 && 'py-2'
        )}
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
          'fixed inset-0 bg-slate-900/50 transition-opacity',
          sidebarMobileOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={closeMobileSidebar}
      />

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 w-72 bg-white shadow-xl transform transition-transform',
        sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NicRoma" className="w-10 h-10 object-contain" />
            <span className="text-xl text-slate-800 font-semibold">NicRoma</span>
          </div>
          <button
            onClick={closeMobileSidebar}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
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
