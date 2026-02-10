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
    description: 'Negro con acentos rojos neón',
    colors: {
      primary: '#ff4757',
      primaryDark: '#ff3838',
      primaryLight: '#ff6b81',
      accent: '#ff9f43',
      background: '#0a0a0a',
      sidebar: '#171717',
      sidebarText: '#ff6b81',
      sidebarActive: '#ff4757',
      card: '#171717',
      text: '#ffffff',
      textSecondary: '#ffb8c0',
      border: '#3d0000',
    },
    isDark: true,
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix',
    description: 'Negro con verde neón',
    colors: {
      primary: '#00ff41',
      primaryDark: '#00cc33',
      primaryLight: '#39ff14',
      accent: '#00ff9f',
      background: '#030712',
      sidebar: '#0a0a0a',
      sidebarText: '#39ff14',
      sidebarActive: '#00ff41',
      card: '#0a0a0a',
      text: '#b8ffc9',
      textSecondary: '#00ff9f',
      border: '#003d00',
    },
    isDark: true,
  },
  ocean: {
    id: 'ocean',
    name: 'Océano',
    description: 'Tonos cian neón',
    colors: {
      primary: '#00d4ff',
      primaryDark: '#00b8e6',
      primaryLight: '#5ce1ff',
      accent: '#00fff2',
      background: '#0a1628',
      sidebar: '#0d1f36',
      sidebarText: '#5ce1ff',
      sidebarActive: '#00d4ff',
      card: '#0d1f36',
      text: '#e0f7ff',
      textSecondary: '#7fefff',
      border: '#1a4a6e',
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
