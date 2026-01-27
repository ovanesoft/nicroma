import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, Search, Building, MoreVertical, Eye, Edit, Trash2, Users, Package,
  UserCheck, UserPlus, UserX, Mail, ExternalLink, CheckCircle, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Button, Badge, Input,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty,
  Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter
} from '../../components/ui';
import { useClientes, useCreateCliente, useUpdateCliente } from '../../hooks/useApi';
import api from '../../api/axios';
import { formatDate, cn } from '../../lib/utils';

const clienteSchema = z.object({
  razonSocial: z.string().min(2, 'Mínimo 2 caracteres'),
  nombreFantasia: z.string().optional().nullable().transform(v => v || undefined),
  tipoDocumento: z.enum(['CUIT', 'CUIL', 'DNI', 'Pasaporte']),
  numeroDocumento: z.string().min(8, 'Documento inválido'),
  condicionFiscal: z.string().optional().nullable().transform(v => v || undefined),
  email: z.string().optional().nullable().transform(v => v || undefined),
  telefono: z.string().optional().nullable().transform(v => v || undefined),
  direccion: z.string().optional().nullable().transform(v => v || undefined),
  ciudad: z.string().optional().nullable().transform(v => v || undefined),
  provincia: z.string().optional().nullable().transform(v => v || undefined),
  pais: z.string().optional().nullable().transform(v => v || 'Argentina'),
  codigoPostal: z.string().optional().nullable().transform(v => v || undefined),
  esCliente: z.boolean().optional().default(true),
  esProveedor: z.boolean().optional().default(false),
  esConsignee: z.boolean().optional().default(false),
  esShipper: z.boolean().optional().default(false)
});

function ClientesPage() {
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 20,
    conPortal: '' // '', 'true', 'false'
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [invitingId, setInvitingId] = useState(null);

  const { data, isLoading, refetch } = useClientes(filters);
  const createCliente = useCreateCliente();
  const updateCliente = useUpdateCliente(editingCliente?.id);

  const clientes = data?.data?.clientes || [];
  const pagination = data?.data?.pagination || {};

  const { 
    register, 
    handleSubmit, 
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      tipoDocumento: 'CUIT',
      pais: 'Argentina',
      esCliente: true,
      esProveedor: false,
      esConsignee: false,
      esShipper: false
    }
  });

  const onSubmit = async (formData) => {
    try {
      if (editingCliente) {
        await updateCliente.mutateAsync(formData);
      } else {
        await createCliente.mutateAsync(formData);
      }
      setModalOpen(false);
      setEditingCliente(null);
      reset();
      refetch();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openCreate = () => {
    setEditingCliente(null);
    reset({
      tipoDocumento: 'CUIT',
      pais: 'Argentina',
      esCliente: true,
      esProveedor: false,
      esConsignee: false,
      esShipper: false
    });
    setModalOpen(true);
  };

  const openEdit = (cliente) => {
    setEditingCliente(cliente);
    reset({
      ...cliente,
      email: cliente.email || ''
    });
    setModalOpen(true);
  };

  const handleInviteToPortal = async (cliente) => {
    if (!cliente.email) {
      toast.error('El cliente debe tener un email para invitarlo al portal');
      return;
    }

    setInvitingId(cliente.id);
    try {
      const response = await api.post(`/clientes/${cliente.id}/invitar-portal`);
      if (response.data.success) {
        toast.success(response.data.message);
        refetch();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al enviar invitación');
    } finally {
      setInvitingId(null);
    }
  };

  const handleUnlinkUser = async (cliente) => {
    if (!confirm('¿Deseas desvincular la cuenta del portal de este cliente?')) return;
    
    try {
      const response = await api.delete(`/clientes/${cliente.id}/desvincular-usuario`);
      if (response.data.success) {
        toast.success('Usuario desvinculado');
        refetch();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al desvincular usuario');
    }
  };

  const getTiposBadges = (cliente) => {
    const tipos = [];
    if (cliente.esCliente) tipos.push({ label: 'Cliente', color: 'bg-blue-100 text-blue-700' });
    if (cliente.esProveedor) tipos.push({ label: 'Proveedor', color: 'bg-green-100 text-green-700' });
    if (cliente.esConsignee) tipos.push({ label: 'Consignee', color: 'bg-purple-100 text-purple-700' });
    if (cliente.esShipper) tipos.push({ label: 'Shipper', color: 'bg-orange-100 text-orange-700' });
    return tipos;
  };

  const getPortalStatus = (cliente) => {
    if (!cliente.portalUser) {
      return { status: 'none', label: 'Sin cuenta', color: 'text-gray-400' };
    }
    if (!cliente.portalUser.emailVerified) {
      return { status: 'pending', label: 'Pendiente', color: 'text-yellow-600' };
    }
    if (!cliente.portalUser.isActive) {
      return { status: 'inactive', label: 'Inactivo', color: 'text-red-600' };
    }
    return { status: 'active', label: 'Activo', color: 'text-green-600' };
  };

  return (
    <Layout title="Clientes" subtitle="Gestión de clientes y proveedores">
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por razón social, CUIT, email..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors"
          />
        </div>
        
        {/* Filtro por portal */}
        <select
          value={filters.conPortal}
          onChange={(e) => setFilters(prev => ({ ...prev, conPortal: e.target.value, page: 1 }))}
          className="px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
        >
          <option value="">Todos</option>
          <option value="true">Con portal</option>
          <option value="false">Sin portal</option>
        </select>
        
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Portal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-14 bg-slate-100 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : clientes.length === 0 ? (
                <TableEmpty 
                  colSpan={7} 
                  message={filters.search ? 'No se encontraron clientes' : 'No hay clientes creados'} 
                />
              ) : (
                clientes.map((cliente) => {
                  const portalStatus = getPortalStatus(cliente);
                  
                  return (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                            <Building className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{cliente.razonSocial}</p>
                            {cliente.nombreFantasia && (
                              <p className="text-xs text-slate-500">{cliente.nombreFantasia}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-slate-700">{cliente.tipoDocumento}</p>
                        <p className="text-sm text-slate-500">{cliente.numeroDocumento}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-slate-700">{cliente.email || '—'}</p>
                        <p className="text-sm text-slate-500">{cliente.telefono || '—'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getTiposBadges(cliente).map((tipo, i) => (
                            <span 
                              key={i}
                              className={cn('px-2 py-0.5 rounded text-xs font-medium', tipo.color)}
                            >
                              {tipo.label}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {portalStatus.status === 'active' ? (
                            <CheckCircle className={cn("w-4 h-4", portalStatus.color)} />
                          ) : portalStatus.status === 'pending' ? (
                            <Clock className={cn("w-4 h-4", portalStatus.color)} />
                          ) : (
                            <UserX className={cn("w-4 h-4", portalStatus.color)} />
                          )}
                          <div>
                            <span className={cn("text-sm font-medium", portalStatus.color)}>
                              {portalStatus.label}
                            </span>
                            {cliente.portalUser && (
                              <p className="text-xs text-gray-400">
                                {cliente.portalUser.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cliente.activo ? 'success' : 'danger'}>
                          {cliente.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => openEdit(cliente)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-slate-400" />
                          </button>
                          
                          {!cliente.portalUser ? (
                            <button 
                              onClick={() => handleInviteToPortal(cliente)}
                              disabled={invitingId === cliente.id || !cliente.email}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                cliente.email 
                                  ? "hover:bg-blue-100 text-blue-500" 
                                  : "text-gray-300 cursor-not-allowed"
                              )}
                              title={cliente.email ? "Invitar al portal" : "El cliente necesita email"}
                            >
                              {invitingId === cliente.id ? (
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <UserPlus className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleUnlinkUser(cliente)}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-400"
                              title="Desvincular cuenta del portal"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === 1}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Anterior
          </Button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Página {filters.page} de {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === pagination.totalPages}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <ModalHeader onClose={() => setModalOpen(false)}>
          <ModalTitle>
            {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
          </ModalTitle>
        </ModalHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalContent className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Datos básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Razón Social *"
                placeholder="Empresa S.A."
                error={errors.razonSocial?.message}
                {...register('razonSocial')}
              />
              <Input
                label="Nombre Fantasía"
                placeholder="Mi Empresa"
                {...register('nombreFantasia')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tipo Documento *
                </label>
                <select
                  {...register('tipoDocumento')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
                >
                  <option value="CUIT">CUIT</option>
                  <option value="CUIL">CUIL</option>
                  <option value="DNI">DNI</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              <Input
                label="Número Documento *"
                placeholder="30-12345678-9"
                error={errors.numeroDocumento?.message}
                {...register('numeroDocumento')}
              />
              <Input
                label="Condición Fiscal"
                placeholder="Responsable Inscripto"
                {...register('condicionFiscal')}
              />
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="contacto@empresa.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Teléfono"
                placeholder="+54 11 1234-5678"
                {...register('telefono')}
              />
            </div>

            {/* Dirección */}
            <Input
              label="Dirección"
              placeholder="Av. Corrientes 1234"
              {...register('direccion')}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                label="Ciudad"
                placeholder="Buenos Aires"
                {...register('ciudad')}
              />
              <Input
                label="Provincia"
                placeholder="CABA"
                {...register('provincia')}
              />
              <Input
                label="País"
                placeholder="Argentina"
                {...register('pais')}
              />
              <Input
                label="Código Postal"
                placeholder="C1043"
                {...register('codigoPostal')}
              />
            </div>

            {/* Clasificación */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Clasificación
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('esCliente')}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700">Cliente</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('esProveedor')}
                    className="w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500"
                  />
                  <span className="text-sm text-slate-700">Proveedor</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('esConsignee')}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <span className="text-sm text-slate-700">Consignee</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('esShipper')}
                    className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                  />
                  <span className="text-sm text-slate-700">Shipper</span>
                </label>
              </div>
            </div>

            {/* Nota sobre portal */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <UserPlus className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Portal de Clientes</p>
                  <p className="text-blue-700 mt-1">
                    Si el cliente tiene email, podrás invitarlo al portal para que vea sus envíos y facturas 
                    desde la columna de acciones en la lista.
                  </p>
                </div>
              </div>
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
              {editingCliente ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </Layout>
  );
}

export default ClientesPage;
