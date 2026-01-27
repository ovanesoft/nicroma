import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Building2, MoreVertical, Edit, Trash2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty,
  Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter
} from '../../components/ui';
import { useTenants, useCreateTenant } from '../../hooks/useApi';
import { formatDate } from '../../lib/utils';

const tenantSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  slug: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  domain: z.string().optional()
});

function TenantsPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  
  const { data, isLoading, refetch } = useTenants({ search });
  const createTenant = useCreateTenant();

  const tenants = data?.data?.tenants || [];

  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(tenantSchema)
  });

  const onSubmit = async (formData) => {
    try {
      await createTenant.mutateAsync(formData);
      setModalOpen(false);
      reset();
      refetch();
    } catch (error) {
      console.error('Error creating tenant:', error);
    }
  };

  const openModal = () => {
    reset();
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
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
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
                      <Badge variant={tenant.plan === 'enterprise' ? 'purple' : 'default'}>
                        {tenant.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.is_active ? 'success' : 'danger'}>
                        {tenant.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDate(tenant.created_at)}
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

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalHeader onClose={() => setModalOpen(false)}>
          <ModalTitle>Nueva Organización</ModalTitle>
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
              {...register('slug')}
            />
            <Input
              label="Dominio (opcional)"
              placeholder="miempresa.com"
              error={errors.domain?.message}
              {...register('domain')}
            />
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
              Crear Organización
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </Layout>
  );
}

export default TenantsPage;
