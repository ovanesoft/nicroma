import { cn } from '../../lib/utils';
import { useUIStore } from '../../stores/uiStore';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
import Header from './Header';

function Layout({ children, title, subtitle }) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div 
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Sidebar - Mobile */}
      <MobileSidebar />

      {/* Main content */}
      <div className={cn(
        'transition-all duration-300',
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
      )}>
        {/* Header */}
        <Header title={title} subtitle={subtitle} />

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
