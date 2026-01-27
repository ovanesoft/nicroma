import { useState } from 'react';
import { Search, Users, MoreVertical, Mail, Shield } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty
} from '../../components/ui';
import { useUsers } from '../../hooks/useApi';
import { formatDate, getRoleLabel, getRoleColor, getInitials } from '../../lib/utils';

function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  const { data, isLoading } = useUsers({ search, role: roleFilter });
  const users = data?.data?.users || [];

  return (
    <Layout title="Usuarios" subtitle="Gestiona todos los usuarios del sistema">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors bg-white"
        >
          <option value="">Todos los roles</option>
          <option value="root">Super Admin</option>
          <option value="admin">Administrador</option>
          <option value="manager">Manager</option>
          <option value="user">Usuario</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Organización</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-12 bg-slate-100 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableEmpty 
                  colSpan={7} 
                  message="No se encontraron usuarios" 
                />
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.tenant_name ? (
                        <span className="text-slate-700">{user.tenant_name}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.auth_provider === 'google' && (
                          <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded">Google</span>
                        )}
                        {user.auth_provider === 'facebook' && (
                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">Facebook</span>
                        )}
                        {user.auth_provider === 'local' && (
                          <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">Email</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'success' : 'danger'}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
}

export default UsersPage;
