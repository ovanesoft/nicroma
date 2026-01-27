import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      
      setSidebarCollapsed: (collapsed) => set({ 
        sidebarCollapsed: collapsed 
      }),
      
      toggleMobileSidebar: () => set((state) => ({ 
        sidebarMobileOpen: !state.sidebarMobileOpen 
      })),
      
      closeMobileSidebar: () => set({ 
        sidebarMobileOpen: false 
      }),
    }),
    {
      name: 'nicroma-ui',
      partialize: (state) => ({ 
        sidebarCollapsed: state.sidebarCollapsed 
      })
    }
  )
);
