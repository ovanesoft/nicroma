import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// Temas disponibles
export const themes = {
  default: {
    id: 'default',
    name: 'Clásico',
    description: 'Tema por defecto con tonos púrpura',
    colors: {
      primary: '#6366f1',
      primaryDark: '#4f46e5',
      primaryLight: '#818cf8',
      accent: '#a855f7',
      background: '#f8fafc',
      sidebar: '#ffffff',
      sidebarText: '#334155',
      sidebarActive: '#6366f1',
      card: '#ffffff',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
    },
    isDark: false,
  },
  dark: {
    id: 'dark',
    name: 'Oscuro',
    description: 'Tema oscuro elegante',
    colors: {
      primary: '#6366f1',
      primaryDark: '#4f46e5',
      primaryLight: '#818cf8',
      accent: '#a855f7',
      background: '#0f172a',
      sidebar: '#1e293b',
      sidebarText: '#cbd5e1',
      sidebarActive: '#6366f1',
      card: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
    },
    isDark: true,
  },
  midnight: {
    id: 'midnight',
    name: 'Medianoche',
    description: 'Negro con acentos rojos',
    colors: {
      primary: '#ef4444',
      primaryDark: '#dc2626',
      primaryLight: '#f87171',
      accent: '#f97316',
      background: '#0a0a0a',
      sidebar: '#171717',
      sidebarText: '#d4d4d4',
      sidebarActive: '#ef4444',
      card: '#171717',
      text: '#fafafa',
      textSecondary: '#a3a3a3',
      border: '#262626',
    },
    isDark: true,
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix',
    description: 'Negro con verde tecnológico',
    colors: {
      primary: '#22c55e',
      primaryDark: '#16a34a',
      primaryLight: '#4ade80',
      accent: '#10b981',
      background: '#030712',
      sidebar: '#0a0a0a',
      sidebarText: '#86efac',
      sidebarActive: '#22c55e',
      card: '#0a0a0a',
      text: '#dcfce7',
      textSecondary: '#86efac',
      border: '#14532d',
    },
    isDark: true,
  },
  ocean: {
    id: 'ocean',
    name: 'Océano',
    description: 'Tonos azules profundos',
    colors: {
      primary: '#0ea5e9',
      primaryDark: '#0284c7',
      primaryLight: '#38bdf8',
      accent: '#06b6d4',
      background: '#0c4a6e',
      sidebar: '#082f49',
      sidebarText: '#bae6fd',
      sidebarActive: '#0ea5e9',
      card: '#0c4a6e',
      text: '#f0f9ff',
      textSecondary: '#7dd3fc',
      border: '#0369a1',
    },
    isDark: true,
  },
  sunset: {
    id: 'sunset',
    name: 'Atardecer',
    description: 'Naranja y tonos cálidos',
    colors: {
      primary: '#f97316',
      primaryDark: '#ea580c',
      primaryLight: '#fb923c',
      accent: '#fbbf24',
      background: '#fffbeb',
      sidebar: '#ffffff',
      sidebarText: '#78350f',
      sidebarActive: '#f97316',
      card: '#ffffff',
      text: '#451a03',
      textSecondary: '#92400e',
      border: '#fde68a',
    },
    isDark: false,
  },
  rose: {
    id: 'rose',
    name: 'Rosa',
    description: 'Tonos rosa elegantes',
    colors: {
      primary: '#ec4899',
      primaryDark: '#db2777',
      primaryLight: '#f472b6',
      accent: '#a855f7',
      background: '#fdf2f8',
      sidebar: '#ffffff',
      sidebarText: '#831843',
      sidebarActive: '#ec4899',
      card: '#ffffff',
      text: '#500724',
      textSecondary: '#9d174d',
      border: '#fbcfe8',
    },
    isDark: false,
  },
  emerald: {
    id: 'emerald',
    name: 'Esmeralda',
    description: 'Verde natural',
    colors: {
      primary: '#10b981',
      primaryDark: '#059669',
      primaryLight: '#34d399',
      accent: '#14b8a6',
      background: '#ecfdf5',
      sidebar: '#ffffff',
      sidebarText: '#064e3b',
      sidebarActive: '#10b981',
      card: '#ffffff',
      text: '#022c22',
      textSecondary: '#047857',
      border: '#a7f3d0',
    },
    isDark: false,
  },
};

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('nicroma-theme');
    return saved && themes[saved] ? saved : 'default';
  });

  useEffect(() => {
    const theme = themes[currentTheme];
    const root = document.documentElement;
    
    // Aplicar variables CSS
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Clase para dark mode
    if (theme.isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }

    // Guardar en localStorage
    localStorage.setItem('nicroma-theme', currentTheme);
  }, [currentTheme]);

  const changeTheme = (themeId) => {
    if (themes[themeId]) {
      setCurrentTheme(themeId);
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      theme: themes[currentTheme], 
      themes, 
      changeTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
}
