import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar si hay un usuario autenticado al cargar
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          // Verificar que el token sigue siendo válido
          const response = await api.get('/auth/me');
          setUser(response.data.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
        } catch (err) {
          // Token inválido, limpiar
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      }

      setLoading(false);
    };

    // Check for OAuth callback token in URL
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');
    
    if (oauthToken) {
      localStorage.setItem('accessToken', oauthToken);
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkAuth();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken } = response.data.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Error al iniciar sesión';
      setError(message);
      return { success: false, message };
    }
  };

  const register = async (data) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', data);
      return { success: true, message: response.data.message };
    } catch (err) {
      const message = err.response?.data?.message || 'Error al registrar';
      const errors = err.response?.data?.errors;
      setError(message);
      return { success: false, message, errors };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignorar errores de logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const googleLogin = () => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${baseUrl}/api/auth/google`;
  };

  const facebookLogin = () => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${baseUrl}/api/auth/facebook`;
  };

  const value = {
    user,
    loading,
    error,
    setError,
    login,
    register,
    logout,
    googleLogin,
    facebookLogin,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

