import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, MoreVertical, UserPlus, Edit, UserX, UserCheck, Shield, Trash2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Badge, Button, Input,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty,
  Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter
} from '../../components/ui';
import { useTenantUsers, useCreateUser } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getRoleLabel, getRoleColor, getInitials } from '../../lib/utils';
import toast from 'react-hot-toast';
import api from '../../api/axios';

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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  const { data, isLoading, refetch } = useTenantUsers(currentUser?.tenantId);
  const createUser = useCreateUser();
  const [actionLoading, setActionLoading] = useState(null);

  const users = data?.data?.users || [];
  const filteredUsers = search 
    ? users.filter(u => 
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    if (!openMenuId) return;
    
    function handleClickOutside(event) {
      // Verificar si el click fue dentro del menú o el botón
      const isMenuClick = event.target.closest('[data-menu-container]');
      if (!isMenuClick) {
        setOpenMenuId(null);
      }
    }
    
    // Usar setTimeout para que el click que abrió el menú no lo cierre
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  const toggleMenu = (userId, e) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === userId ? null : userId);
  };

  // Acciones del menú
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setOpenMenuId(null);
    setEditModalOpen(true);
  };

  const handleToggleStatus = async (user) => {
    setOpenMenuId(null);
    setActionLoading(user.id);
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.is_active });
      toast.success(user.is_active ? 'Usuario desactivado' : 'Usuario activado');
      refetch();
    } catch (error) {
      toast.error('Error al cambiar estado del usuario');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (user, newRole) => {
    setOpenMenuId(null);
    setActionLoading(user.id);
    try {
      await api.put(`/users/${user.id}`, { role: newRole });
      toast.success(`Rol cambiado a ${getRoleLabel(newRole)}`);
      refetch();
    } catch (error) {
      toast.error('Error al cambiar rol del usuario');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (user) => {
    setOpenMenuId(null);
    if (window.confirm(`¿Estás seguro de eliminar a ${user.first_name} ${user.last_name}?`)) {
      setActionLoading(user.id);
      try {
        await api.delete(`/users/${user.id}`);
        toast.success('Usuario eliminado');
        refetch();
      } catch (error) {
        toast.error('Error al eliminar usuario');
      } finally {
        setActionLoading(null);
      }
    }
  };

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
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
            style={{ color: 'var(--color-text)' }}
          />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none transition-colors"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
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
                      <div 
                        className="h-12 rounded animate-pulse" 
                        style={{ backgroundColor: 'var(--color-border)' }}
                      />
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
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                            {user.first_name} {user.last_name}
                            {user.id === currentUser?.id && (
                              <span className="ml-2 text-xs" style={{ color: 'var(--color-primary)' }}>(Tú)</span>
                            )}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span 
                        className="text-xs px-2 py-1 rounded capitalize"
                        style={{ 
                          backgroundColor: 'var(--color-background)', 
                          color: 'var(--color-text)' 
                        }}
                      >
                        {user.auth_provider}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'success' : 'danger'}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                        {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.id !== currentUser?.id && (
                        <div className="relative" data-menu-container>
                          <button 
                            className="p-2 rounded-lg transition-colors hover:bg-[var(--color-background)]"
                            style={{ color: 'var(--color-text)' }}
                            onClick={(e) => toggleMenu(user.id, e)}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {openMenuId === user.id && (
                            <div 
                              className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border z-50 py-1"
                              style={{ 
                                backgroundColor: 'var(--color-card)',
                                borderColor: 'var(--color-border)'
                              }}
                            >
                              <button
                                onClick={() => handleEditUser(user)}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--color-background)] transition-colors"
                                style={{ color: 'var(--color-text)' }}
                              >
                                <Edit className="w-4 h-4" />
                                Editar usuario
                              </button>
                              
                              {/* Cambiar rol */}
                              {user.role !== 'manager' && (
                                <button
                                  onClick={() => handleChangeRole(user, 'manager')}
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--color-background)] transition-colors"
                                  style={{ color: 'var(--color-text)' }}
                                >
                                  <Shield className="w-4 h-4" />
                                  Hacer Manager
                                </button>
                              )}
                              {user.role !== 'user' && (
                                <button
                                  onClick={() => handleChangeRole(user, 'user')}
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--color-background)] transition-colors"
                                  style={{ color: 'var(--color-text)' }}
                                >
                                  <Shield className="w-4 h-4" />
                                  Hacer Usuario
                                </button>
                              )}
                              
                              <div 
                                className="my-1 border-t" 
                                style={{ borderColor: 'var(--color-border)' }} 
                              />
                              
                              {/* Activar/Desactivar */}
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--color-background)] transition-colors"
                                style={{ color: user.is_active ? 'var(--color-danger)' : 'var(--color-success)' }}
                              >
                                {user.is_active ? (
                                  <>
                                    <UserX className="w-4 h-4" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4" />
                                    Activar
                                  </>
                                )}
                              </button>
                              
                              {/* Eliminar */}
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--color-background)] transition-colors"
                                style={{ color: 'var(--color-danger)' }}
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
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
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Rol
              </label>
              <select
                {...register('role')}
                className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
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

      {/* Edit Modal */}
      <EditUserModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
          refetch();
        }}
      />
    </Layout>
  );
}

// Componente separado para el modal de edición
function EditUserModal({ open, onClose, user, onSuccess }) {
  const [saving, setSaving] = useState(false);
  
  const editSchema = z.object({
    firstName: z.string().min(2, 'Mínimo 2 caracteres'),
    lastName: z.string().min(2, 'Mínimo 2 caracteres'),
    phone: z.string().optional(),
    role: z.enum(['manager', 'user'])
  });

  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      role: 'user'
    }
  });

  // Actualizar valores cuando cambia el usuario
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        phone: user.phone || '',
        role: user.role || 'user'
      });
    }
  }, [user, reset]);

  const onSubmit = async (formData) => {
    setSaving(true);
    try {
      await api.put(`/users/${user.id}`, formData);
      toast.success('Usuario actualizado');
      onSuccess();
    } catch (error) {
      toast.error('Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <ModalTitle>Editar Usuario</ModalTitle>
      </ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalContent className="space-y-4">
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-background)' }}>
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-semibold"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {getInitials(user.first_name, user.last_name)}
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                {user.first_name} {user.last_name}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>{user.email}</p>
            </div>
          </div>
          
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
            label="Teléfono"
            placeholder="+54 11 1234-5678"
            {...register('phone')}
          />
          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text)' }}
            >
              Rol
            </label>
            <select
              {...register('role')}
              className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
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
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar Cambios
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default OrgUsersPage;
