import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, MoreVertical, UserPlus } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Badge, Button, Input,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty,
  Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter
} from '../../components/ui';
import { useTenantUsers, useCreateUser } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getRoleLabel, getRoleColor, getInitials } from '../../lib/utils';

const userSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  firstName: z.string().min(2, 'Mínimo 2 caracteres'),
  lastName: z.string().min(2, 'Mínimo 2 caracteres'),
  role: z.enum(['manager', 'user'])
});

function OrgUsersPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  
  const { data, isLoading, refetch } = useTenantUsers(currentUser?.tenantId);
  const createUser = useCreateUser();

  const users = data?.data?.users || [];
  const filteredUsers = search 
    ? users.filter(u => 
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'user'
    }
  });

  const onSubmit = async (formData) => {
    try {
      await createUser.mutateAsync(formData);
      setModalOpen(false);
      reset();
      refetch();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  return (
    <Layout 
      title="Usuarios" 
      subtitle={`Gestiona los usuarios de ${currentUser?.tenantName || 'tu organización'}`}
    >
      {/* Actions */}
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
        <Button onClick={() => setModalOpen(true)}>
          <UserPlus className="w-4 h-4" />
          Crear Usuario
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-12 bg-slate-100 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableEmpty 
                  colSpan={6} 
                  message={search ? 'No se encontraron usuarios' : 'No hay usuarios en tu organización'} 
                />
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {user.first_name} {user.last_name}
                            {user.id === currentUser?.id && (
                              <span className="ml-2 text-xs text-primary-600">(Tú)</span>
                            )}
                          </p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded capitalize">
                        {user.auth_provider}
                      </span>
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
                      {user.id !== currentUser?.id && (
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalHeader onClose={() => setModalOpen(false)}>
          <ModalTitle>Crear Usuario</ModalTitle>
        </ModalHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre"
                placeholder="Juan"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label="Apellido"
                placeholder="Pérez"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>
            <Input
              label="Email"
              type="email"
              placeholder="juan@ejemplo.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Rol
              </label>
              <select
                {...register('role')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors bg-white"
              >
                <option value="user">Usuario</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Crear Usuario
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </Layout>
  );
}

export default OrgUsersPage;
