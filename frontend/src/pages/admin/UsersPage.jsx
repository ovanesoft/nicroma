import { useState, useRef, useEffect } from 'react';
import { Search, Users, MoreVertical, Edit, Trash2, Power, PowerOff, Shield, AlertTriangle, Lock, Unlock } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Badge, Button,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty,
  Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, Input
} from '../../components/ui';
import { useUsers } from '../../hooks/useApi';
import { formatDate, getRoleLabel, getRoleColor, getInitials } from '../../lib/utils';
import api from '../../api/axios';
import toast from 'react-hot-toast';

function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  const [roleModal, setRoleModal] = useState({ open: false, user: null, newRole: '' });
  const menuRef = useRef(null);
  
  const { data, isLoading, refetch } = useUsers({ search, role: roleFilter });
  const users = data?.data?.users || [];

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleActive = async (user) => {
    try {
      await api.patch(`/users/${user.id}/toggle-active`);
      toast.success(user.is_active ? 'Usuario desactivado' : 'Usuario activado');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar estado');
    }
    setActiveMenu(null);
  };

  const handleToggleLock = async (user) => {
    try {
      await api.patch(`/users/${user.id}/toggle-lock`);
      toast.success(user.is_locked ? 'Usuario desbloqueado' : 'Usuario bloqueado');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar bloqueo');
    }
    setActiveMenu(null);
  };

  const handleChangeRole = async () => {
    try {
      await api.patch(`/users/${roleModal.user.id}/role`, { role: roleModal.newRole });
      toast.success('Rol actualizado');
      setRoleModal({ open: false, user: null, newRole: '' });
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar rol');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteModal.user.id}`);
      toast.success('Usuario eliminado');
      setDeleteModal({ open: false, user: null });
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await api.put(`/users/${editModal.user.id}`, {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email')
      });
      toast.success('Usuario actualizado');
      setEditModal({ open: false, user: null });
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al actualizar');
    }
  };

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
          <option value="client">Cliente</option>
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
                  <TableRow key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold ${
                          user.is_active 
                            ? 'bg-gradient-to-br from-primary-400 to-purple-500' 
                            : 'bg-slate-300'
                        }`}>
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 flex items-center gap-2">
                            {user.first_name} {user.last_name}
                            {user.is_locked && (
                              <Lock className="w-3 h-3 text-red-500" title="Bloqueado" />
                            )}
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
                      <div className="flex flex-col gap-1">
                        <Badge variant={user.is_active ? 'success' : 'danger'}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                        {user.is_locked && (
                          <Badge variant="warning">Bloqueado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <div className="relative" ref={activeMenu === user.id ? menuRef : null}>
                        <button 
                          onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        
                        {activeMenu === user.id && (
                          <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                            <button
                              onClick={() => {
                                setEditModal({ open: true, user });
                                setActiveMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Editar datos
                            </button>
                            <button
                              onClick={() => {
                                setRoleModal({ open: true, user, newRole: user.role });
                                setActiveMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Shield className="w-4 h-4" />
                              Cambiar rol
                            </button>
                            <hr className="my-1 border-slate-100" />
                            <button
                              onClick={() => handleToggleActive(user)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              {user.is_active ? (
                                <>
                                  <PowerOff className="w-4 h-4 text-orange-500" />
                                  <span>Desactivar</span>
                                </>
                              ) : (
                                <>
                                  <Power className="w-4 h-4 text-green-500" />
                                  <span>Activar</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleToggleLock(user)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              {user.is_locked ? (
                                <>
                                  <Unlock className="w-4 h-4 text-green-500" />
                                  <span>Desbloquear</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4 text-red-500" />
                                  <span>Bloquear</span>
                                </>
                              )}
                            </button>
                            <hr className="my-1 border-slate-100" />
                            <button
                              onClick={() => {
                                setDeleteModal({ open: true, user });
                                setActiveMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, user: null })}>
        <ModalHeader onClose={() => setEditModal({ open: false, user: null })}>
          <ModalTitle>Editar Usuario</ModalTitle>
        </ModalHeader>
        <form onSubmit={handleUpdateUser}>
          <ModalContent className="space-y-4">
            <Input
              label="Nombre"
              name="firstName"
              defaultValue={editModal.user?.first_name}
              required
            />
            <Input
              label="Apellido"
              name="lastName"
              defaultValue={editModal.user?.last_name}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              defaultValue={editModal.user?.email}
              required
            />
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setEditModal({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button type="submit">
              Guardar Cambios
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Change Role Modal */}
      <Modal open={roleModal.open} onClose={() => setRoleModal({ open: false, user: null, newRole: '' })}>
        <ModalHeader onClose={() => setRoleModal({ open: false, user: null, newRole: '' })}>
          <ModalTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Cambiar Rol
          </ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p className="text-slate-600 mb-4">
            Cambiar el rol de <strong>{roleModal.user?.first_name} {roleModal.user?.last_name}</strong>
          </p>
          <select
            value={roleModal.newRole}
            onChange={(e) => setRoleModal(prev => ({ ...prev, newRole: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="root">Super Admin</option>
            <option value="admin">Administrador</option>
            <option value="manager">Manager</option>
            <option value="user">Usuario</option>
            <option value="client">Cliente</option>
          </select>
        </ModalContent>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => setRoleModal({ open: false, user: null, newRole: '' })}>
            Cancelar
          </Button>
          <Button onClick={handleChangeRole}>
            Cambiar Rol
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, user: null })}>
        <ModalHeader onClose={() => setDeleteModal({ open: false, user: null })}>
          <ModalTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Eliminar Usuario
          </ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p className="text-slate-600">
            ¿Estás seguro de que querés eliminar al usuario <strong>{deleteModal.user?.first_name} {deleteModal.user?.last_name}</strong>?
          </p>
          <p className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            Esta acción no se puede deshacer. Se eliminarán todos los datos asociados al usuario.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => setDeleteModal({ open: false, user: null })}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Eliminar
          </Button>
        </ModalFooter>
      </Modal>
    </Layout>
  );
}

export default UsersPage;
