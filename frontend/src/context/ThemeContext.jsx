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
      primary: '#818cf8',
      primaryDark: '#6366f1',
      primaryLight: '#a5b4fc',
      accent: '#c084fc',
      background: '#0f172a',
      sidebar: '#1e293b',
      sidebarText: '#e2e8f0',
      sidebarActive: '#a5b4fc',
      card: '#1e293b',
      text: '#ffffff',
      textSecondary: '#c4b5fd',
      border: '#475569',
    },
    isDark: true,
  },
  midnight: {
    id: 'midnight',
    name: 'Medianoche',
    description: 'Negro con acentos rojos',
    colors: {
      primary: '#ff6b6b',
      primaryDark: '#f43f5e',
      primaryLight: '#fca5a5',
      accent: '#fb923c',
      background: '#0a0a0a',
      sidebar: '#171717',
      sidebarText: '#fecaca',
      sidebarActive: '#ff6b6b',
      card: '#171717',
      text: '#ffffff',
      textSecondary: '#fda4af',
      border: '#3f3f46',
    },
    isDark: true,
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix',
    description: 'Negro con verde tecnológico',
    colors: {
      primary: '#4ade80',
      primaryDark: '#22c55e',
      primaryLight: '#86efac',
      accent: '#2dd4bf',
      background: '#030712',
      sidebar: '#0a0a0a',
      sidebarText: '#bbf7d0',
      sidebarActive: '#4ade80',
      card: '#0a0a0a',
      text: '#ecfdf5',
      textSecondary: '#6ee7b7',
      border: '#166534',
    },
    isDark: true,
  },
  ocean: {
    id: 'ocean',
    name: 'Océano',
    description: 'Tonos azules profundos',
    colors: {
      primary: '#38bdf8',
      primaryDark: '#0ea5e9',
      primaryLight: '#7dd3fc',
      accent: '#22d3ee',
      background: '#0c4a6e',
      sidebar: '#082f49',
      sidebarText: '#e0f2fe',
      sidebarActive: '#38bdf8',
      card: '#0c4a6e',
      text: '#ffffff',
      textSecondary: '#67e8f9',
      border: '#0284c7',
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
