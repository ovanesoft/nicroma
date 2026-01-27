import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Building2, MoreVertical, Edit, Trash2, Power, PowerOff, AlertTriangle } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty,
  Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter
} from '../../components/ui';
import { useTenants, useCreateTenant } from '../../hooks/useApi';
import { formatDate } from '../../lib/utils';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const tenantSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  slug: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  domain: z.string().optional(),
  plan: z.string().optional()
});

function TenantsPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, tenant: null });
  const [activeMenu, setActiveMenu] = useState(null);
  const menuRef = useRef(null);
  
  const { data, isLoading, refetch } = useTenants({ search });
  const createTenant = useCreateTenant();

  const tenants = data?.data?.tenants || [];

  const { 
    register, 
    handleSubmit, 
    reset,
    setValue,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(tenantSchema)
  });

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

  const onSubmit = async (formData) => {
    try {
      if (editingTenant) {
        await api.put(`/tenants/${editingTenant.id}`, formData);
        toast.success('Organización actualizada');
      } else {
        await createTenant.mutateAsync(formData);
        toast.success('Organización creada');
      }
      setModalOpen(false);
      setEditingTenant(null);
      reset();
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setValue('name', tenant.name);
    setValue('slug', tenant.slug);
    setValue('domain', tenant.domain || '');
    setValue('plan', tenant.plan || 'free');
    setModalOpen(true);
    setActiveMenu(null);
  };

  const handleToggleActive = async (tenant) => {
    try {
      await api.patch(`/tenants/${tenant.id}/toggle-active`);
      toast.success(tenant.is_active ? 'Organización pausada' : 'Organización activada');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar estado');
    }
    setActiveMenu(null);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/tenants/${deleteModal.tenant.id}`);
      toast.success('Organización eliminada');
      setDeleteModal({ open: false, tenant: null });
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const openModal = () => {
    setEditingTenant(null);
    reset({ name: '', slug: '', domain: '', plan: 'free' });
    setModalOpen(true);
  };

  return (
    <Layout title="Organizaciones" subtitle="Gestiona todas las organizaciones del sistema">
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar organizaciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors"
          />
        </div>
        <Button onClick={openModal}>
          <Plus className="w-4 h-4" />
          Nueva Organización
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organización</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-10 bg-slate-100 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : tenants.length === 0 ? (
                <TableEmpty 
                  colSpan={7} 
                  message="No se encontraron organizaciones" 
                />
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant.id} className={!tenant.is_active ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          tenant.is_active ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{tenant.name}</p>
                          {tenant.domain && (
                            <p className="text-sm text-slate-500">{tenant.domain}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="px-2 py-1 bg-slate-100 rounded text-sm">
                        {tenant.slug}
                      </code>
                    </TableCell>
                    <TableCell>{tenant.user_count || 0}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.plan === 'enterprise' ? 'purple' : tenant.plan === 'pro' ? 'blue' : 'default'}>
                        {tenant.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.is_active ? 'success' : 'warning'}>
                        {tenant.is_active ? 'Activo' : 'Pausado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDate(tenant.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="relative" ref={activeMenu === tenant.id ? menuRef : null}>
                        <button 
                          onClick={() => setActiveMenu(activeMenu === tenant.id ? null : tenant.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        
                        {activeMenu === tenant.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                            <button
                              onClick={() => handleEdit(tenant)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleToggleActive(tenant)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              {tenant.is_active ? (
                                <>
                                  <PowerOff className="w-4 h-4 text-orange-500" />
                                  <span>Pausar</span>
                                </>
                              ) : (
                                <>
                                  <Power className="w-4 h-4 text-green-500" />
                                  <span>Activar</span>
                                </>
                              )}
                            </button>
                            <hr className="my-1 border-slate-100" />
                            <button
                              onClick={() => {
                                setDeleteModal({ open: true, tenant });
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

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingTenant(null); }}>
        <ModalHeader onClose={() => { setModalOpen(false); setEditingTenant(null); }}>
          <ModalTitle>{editingTenant ? 'Editar Organización' : 'Nueva Organización'}</ModalTitle>
        </ModalHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalContent className="space-y-4">
            <Input
              label="Nombre"
              placeholder="Mi Empresa S.A."
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Slug (URL)"
              placeholder="mi-empresa"
              error={errors.slug?.message}
              disabled={!!editingTenant}
              {...register('slug')}
            />
            <Input
              label="Dominio (opcional)"
              placeholder="miempresa.com"
              error={errors.domain?.message}
              {...register('domain')}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
              <select
                {...register('plan')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => { setModalOpen(false); setEditingTenant(null); }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingTenant ? 'Guardar Cambios' : 'Crear Organización'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, tenant: null })}>
        <ModalHeader onClose={() => setDeleteModal({ open: false, tenant: null })}>
          <ModalTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Eliminar Organización
          </ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p className="text-slate-600">
            ¿Estás seguro de que querés eliminar la organización <strong>{deleteModal.tenant?.name}</strong>?
          </p>
          <p className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            Esta acción eliminará todos los usuarios, datos y configuraciones asociados. No se puede deshacer.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => setDeleteModal({ open: false, tenant: null })}
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            variant="danger"
            onClick={handleDelete}
          >
            Eliminar
          </Button>
        </ModalFooter>
      </Modal>
    </Layout>
  );
}

export default TenantsPage;
