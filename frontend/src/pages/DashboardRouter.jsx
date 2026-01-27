import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import RootDashboard from './dashboard/RootDashboard';
import AdminDashboard from './dashboard/AdminDashboard';
import UserDashboard from './dashboard/UserDashboard';
import ClientDashboard from './dashboard/ClientDashboard';

function DashboardRouter() {
  const { user } = useAuth();

  const getDashboard = () => {
    switch (user?.role) {
      case 'root':
        return <RootDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'manager':
        return <AdminDashboard />; // Managers ven dashboard similar a admin
      case 'client':
        return <ClientDashboard />;
      default:
        return <UserDashboard />;
    }
  };

  const getSubtitle = () => {
    switch (user?.role) {
      case 'root':
        return 'Panel de Super Administrador';
      case 'admin':
        return `Administrador de ${user?.tenantName || 'Organización'}`;
      case 'manager':
        return `Manager de ${user?.tenantName || 'Organización'}`;
      case 'client':
        return `Portal de Cliente`;
      default:
        return `Bienvenido, ${user?.firstName}`;
    }
  };

  return (
    <Layout title="Dashboard" subtitle={getSubtitle()}>
      {getDashboard()}
    </Layout>
  );
}

export default DashboardRouter;
