import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-sm text-slate-500">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-2">
          ¡Hola, {user?.firstName}!
        </h2>
        <p className="text-white/80">
          Bienvenido a tu panel. Aquí puedes ver el estado de tus operaciones.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Mis Carpetas"
          value="0"
          icon={FileText}
          color="bg-blue-500"
        />
        <StatCard
          title="En Tránsito"
          value="0"
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="Completadas"
          value="0"
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          title="Requieren Atención"
          value="0"
          icon={AlertCircle}
          color="bg-red-500"
        />
      </div>

      {/* My Folders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Mis Carpetas Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">No tienes carpetas asignadas</p>
            <p className="text-sm">Cuando tengas operaciones activas, aparecerán aquí</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UserDashboard;
