import { Building2, Users, Shield, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { useTenants, useUsers } from '../../hooks/useApi';

function StatCard({ title, value, icon: Icon, color, loading }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            {loading ? (
              <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-slate-800">{value}</p>
            )}
            <p className="text-sm text-slate-500">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RootDashboard() {
  const { data: tenantsData, isLoading: loadingTenants } = useTenants({ limit: 5 });
  const { data: usersData, isLoading: loadingUsers } = useUsers({ limit: 5 });

  const tenants = tenantsData?.data?.tenants || [];
  const totalTenants = tenantsData?.data?.pagination?.total || 0;
  const users = usersData?.data?.users || [];
  const totalUsers = usersData?.data?.pagination?.total || 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-2">Panel de Super Administrador</h2>
        <p className="text-white/80">
          Gestiona todas las organizaciones y usuarios del sistema desde aquí.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Organizaciones"
          value={totalTenants}
          icon={Building2}
          color="bg-blue-500"
          loading={loadingTenants}
        />
        <StatCard
          title="Usuarios totales"
          value={totalUsers}
          icon={Users}
          color="bg-green-500"
          loading={loadingUsers}
        />
        <StatCard
          title="Activos hoy"
          value="—"
          icon={Activity}
          color="bg-orange-500"
        />
        <StatCard
          title="Seguridad"
          value="OK"
          icon={Shield}
          color="bg-purple-500"
        />
      </div>

      {/* Recent data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Últimas Organizaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingTenants ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : tenants.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                No hay organizaciones creadas
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tenants.map(tenant => (
                  <div key={tenant.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-800">{tenant.name}</p>
                      <p className="text-sm text-slate-500">{tenant.slug}</p>
                    </div>
                    <span className="text-sm text-slate-500">
                      {tenant.user_count || 0} usuarios
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Últimos Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingUsers ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                No hay usuarios registrados
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map(user => (
                  <div key={user.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-800">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                      {user.tenant_name || 'Sistema'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default RootDashboard;
