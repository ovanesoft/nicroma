import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages - Auth
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import DataDeletion from './pages/DataDeletion';

// Pages - Dashboard
import DashboardRouter from './pages/DashboardRouter';

// Pages - Admin (Root only)
import TenantsPage from './pages/admin/TenantsPage';
import UsersPage from './pages/admin/UsersPage';
import SystemLogsPage from './pages/admin/SystemLogsPage';
import SettingsPage from './pages/admin/SettingsPage';

// Pages - User Settings
import UserSettingsPage from './pages/UserSettingsPage';

// Pages - Organization (Admin/Manager)
import OrgUsersPage from './pages/org/OrgUsersPage';
import InvitationsPage from './pages/org/InvitationsPage';
import CompanySettingsPage from './pages/org/CompanySettingsPage';

// Pages - Logística
import CarpetasPage from './pages/carpetas/CarpetasPage';
import CarpetaForm from './pages/carpetas/CarpetaForm';
import ClientesPage from './pages/clientes/ClientesPage';

// Pages - Presupuestos
import PresupuestosPage from './pages/presupuestos/PresupuestosPage';
import PresupuestoForm from './pages/presupuestos/PresupuestoForm';

// Pages - Facturación
import PrefacturasPage from './pages/facturacion/PrefacturasPage';
import PrefacturaDetalle from './pages/facturacion/PrefacturaDetalle';
import FacturasPage from './pages/facturacion/FacturasPage';
import FacturaDetalle from './pages/facturacion/FacturaDetalle';

// Pages - Estadísticas
import EstadisticasPage from './pages/estadisticas/EstadisticasPage';

// Pages - Integraciones
import IntegracionesPage from './pages/integraciones/IntegracionesPage';
import TrackingPage from './pages/integraciones/TrackingPage';
import SchedulesPage from './pages/integraciones/SchedulesPage';

// Pages - Fiscal
import FiscalConfigPage from './pages/fiscal/FiscalConfigPage';

// Pages - Perfil
import Profile from './pages/Profile';

// Pages - Portal (público)
import PortalLanding from './pages/portal/PortalLanding';

// Pages - Portal Cliente (autenticado)
import MisEnvios from './pages/portal/MisEnvios';
import EnvioDetalle from './pages/portal/EnvioDetalle';
import MisFacturas from './pages/portal/MisFacturas';
import FacturaClienteDetalle from './pages/portal/FacturaDetalle';
import Pagos from './pages/portal/Pagos';
import SolicitarPresupuesto from './pages/portal/SolicitarPresupuesto';
import MisPresupuestos from './pages/portal/MisPresupuestos';

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
      <p className="text-slate-500">Cargando...</p>
    </div>
  </div>
);

// Settings Router - muestra diferente página según rol
const SettingsRouter = () => {
  const { user } = useAuth();
  
  if (user?.role === 'root') {
    return <SettingsPage />;
  }
  
  return <UserSettingsPage />;
};

// Protected Route - requires authentication
const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role if specified
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route - redirects to dashboard if authenticated
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* ==================== PUBLIC ROUTES ==================== */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/portal/:portalSlug" element={<PortalLanding />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/data-deletion" element={<DataDeletion />} />

      {/* ==================== PROTECTED ROUTES ==================== */}
      
      {/* Dashboard - All authenticated users */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardRouter />
        </ProtectedRoute>
      } />

      {/* ==================== ADMIN ROUTES (Root only) ==================== */}
      <Route path="/admin/tenants" element={
        <ProtectedRoute allowedRoles={['root']}>
          <TenantsPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['root']}>
          <UsersPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/logs" element={
        <ProtectedRoute allowedRoles={['root']}>
          <SystemLogsPage />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <SettingsRouter />
        </ProtectedRoute>
      } />

      {/* ==================== ORGANIZATION ROUTES (Admin/Manager) ==================== */}
      <Route path="/org/users" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <OrgUsersPage />
        </ProtectedRoute>
      } />
      <Route path="/org/invitations" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <InvitationsPage />
        </ProtectedRoute>
      } />
      <Route path="/org/settings" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <CompanySettingsPage />
        </ProtectedRoute>
      } />

      {/* ==================== PRESUPUESTOS ROUTES ==================== */}
      <Route path="/presupuestos" element={
        <ProtectedRoute allowedRoles={['admin', 'manager', 'user']}>
          <PresupuestosPage />
        </ProtectedRoute>
      } />
      <Route path="/presupuestos/nuevo" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <PresupuestoForm />
        </ProtectedRoute>
      } />
      <Route path="/presupuestos/:id" element={
        <ProtectedRoute allowedRoles={['admin', 'manager', 'user', 'client']}>
          <PresupuestoForm />
        </ProtectedRoute>
      } />

      {/* ==================== LOGÍSTICA ROUTES (Admin/Manager) ==================== */}
      <Route path="/carpetas" element={
        <ProtectedRoute allowedRoles={['admin', 'manager', 'user']}>
          <CarpetasPage />
        </ProtectedRoute>
      } />
      <Route path="/carpetas/nueva" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <CarpetaForm />
        </ProtectedRoute>
      } />
      <Route path="/carpetas/:id" element={
        <ProtectedRoute allowedRoles={['admin', 'manager', 'user']}>
          <CarpetaForm />
        </ProtectedRoute>
      } />
      <Route path="/carpetas/:id/editar" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <CarpetaForm />
        </ProtectedRoute>
      } />
      <Route path="/clientes" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <ClientesPage />
        </ProtectedRoute>
      } />

      {/* ==================== FACTURACIÓN ROUTES ==================== */}
      <Route path="/prefacturas" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <PrefacturasPage />
        </ProtectedRoute>
      } />
      <Route path="/prefacturas/:id" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <PrefacturaDetalle />
        </ProtectedRoute>
      } />
      <Route path="/facturas" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <FacturasPage />
        </ProtectedRoute>
      } />
      <Route path="/facturas/:id" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <FacturaDetalle />
        </ProtectedRoute>
      } />

      {/* ==================== ESTADÍSTICAS ==================== */}
      <Route path="/estadisticas" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <EstadisticasPage />
        </ProtectedRoute>
      } />

      {/* ==================== INTEGRACIONES ==================== */}
      <Route path="/integraciones" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <IntegracionesPage />
        </ProtectedRoute>
      } />
      <Route path="/tracking" element={
        <ProtectedRoute allowedRoles={['admin', 'manager', 'user', 'client']}>
          <TrackingPage />
        </ProtectedRoute>
      } />
      <Route path="/schedules" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <SchedulesPage />
        </ProtectedRoute>
      } />

      {/* ==================== FACTURACIÓN ELECTRÓNICA ==================== */}
      <Route path="/fiscal/config" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <FiscalConfigPage />
        </ProtectedRoute>
      } />

      {/* ==================== PERFIL ==================== */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />

      {/* ==================== PORTAL DE CLIENTE ==================== */}
      <Route path="/mis-envios" element={
        <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'user']}>
          <MisEnvios />
        </ProtectedRoute>
      } />
      <Route path="/mis-envios/:id" element={
        <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'user']}>
          <EnvioDetalle />
        </ProtectedRoute>
      } />
      <Route path="/mis-facturas" element={
        <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'user']}>
          <MisFacturas />
        </ProtectedRoute>
      } />
      <Route path="/mis-facturas/:id" element={
        <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'user']}>
          <FacturaClienteDetalle />
        </ProtectedRoute>
      } />
      <Route path="/pagos" element={
        <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'user']}>
          <Pagos />
        </ProtectedRoute>
      } />
      <Route path="/solicitar-presupuesto" element={
        <ProtectedRoute allowedRoles={['client']}>
          <SolicitarPresupuesto />
        </ProtectedRoute>
      } />
      <Route path="/mis-presupuestos" element={
        <ProtectedRoute allowedRoles={['client']}>
          <MisPresupuestos />
        </ProtectedRoute>
      } />

      {/* ==================== REDIRECTS ==================== */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
