import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, Search, Truck, MoreVertical, Eye, Edit, Trash2, 
  Ship, Plane, Building2, Package, Shield, Warehouse, Phone, Mail, Globe,
  Star, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Button, Badge, Input,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty,
  Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter
} from '../../components/ui';
import { useProveedores, useCreateProveedor, useUpdateProveedor, useDeleteProveedor, useTiposProveedor } from '../../hooks/useApi';
import { formatDate, cn } from '../../lib/utils';

const TIPOS_PROVEEDOR = [
  { value: 'Naviera', label: 'Naviera', icon: Ship, color: 'bg-blue-100 text-blue-800' },
  { value: 'Aerolínea', label: 'Aerolínea', icon: Plane, color: 'bg-sky-100 text-sky-800' },
  { value: 'Transportista', label: 'Transportista', icon: Truck, color: 'bg-amber-100 text-amber-800' },
  { value: 'Agente', label: 'Agente', icon: Building2, color: 'bg-purple-100 text-purple-800' },
  { value: 'Despachante', label: 'Despachante', icon: Package, color: 'bg-green-100 text-green-800' },
  { value: 'Terminal', label: 'Terminal', icon: Warehouse, color: 'bg-slate-100 text-slate-800' },
  { value: 'Depósito', label: 'Depósito', icon: Warehouse, color: 'bg-orange-100 text-orange-800' },
  { value: 'Aseguradora', label: 'Aseguradora', icon: Shield, color: 'bg-emerald-100 text-emerald-800' },
  { value: 'Freight Forwarder', label: 'Freight Forwarder', icon: Ship, color: 'bg-indigo-100 text-indigo-800' },
  { value: 'Otros', label: 'Otros', icon: Building2, color: 'bg-gray-100 text-gray-800' }
];

const MONEDAS = ['ARS', 'USD', 'EUR'];

const proveedorSchema = z.object({
  razonSocial: z.string().min(2, 'Mínimo 2 caracteres'),
  nombreFantasia: z.string().optional().nullable().transform(v => v || undefined),
  tipoDocumento: z.enum(['CUIT', 'CUIL', 'DNI', 'Pasaporte', 'ID Extranjero']),
  numeroDocumento: z.string().min(5, 'Documento inválido'),
  condicionFiscal: z.string().optional().nullable().transform(v => v || undefined),
  tipoProveedor: z.string().min(1, 'Selecciona un tipo'),
  email: z.string().optional().nullable().transform(v => v || undefined),
  telefono: z.string().optional().nullable().transform(v => v || undefined),
  whatsapp: z.string().optional().nullable().transform(v => v || undefined),
  website: z.string().optional().nullable().transform(v => v || undefined),
  direccion: z.string().optional().nullable().transform(v => v || undefined),
  ciudad: z.string().optional().nullable().transform(v => v || undefined),
  provincia: z.string().optional().nullable().transform(v => v || undefined),
  pais: z.string().optional().nullable().transform(v => v || 'Argentina'),
  codigoPostal: z.string().optional().nullable().transform(v => v || undefined),
  contactoNombre: z.string().optional().nullable().transform(v => v || undefined),
  contactoEmail: z.string().optional().nullable().transform(v => v || undefined),
  contactoTelefono: z.string().optional().nullable().transform(v => v || undefined),
  contactoCargo: z.string().optional().nullable().transform(v => v || undefined),
  servicios: z.string().optional().nullable().transform(v => v || undefined),
  notas: z.string().optional().nullable().transform(v => v || undefined)
});

function ProveedoresPage() {
  const [filters, setFilters] = useState({
    search: '',
    tipoProveedor: '',
    page: 1,
    limit: 20
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [viewingProveedor, setViewingProveedor] = useState(null);
  const [activeTab, setActiveTab] = useState('datos');
  const [menuOpen, setMenuOpen] = useState(null);
  const [cuentasBancarias, setCuentasBancarias] = useState([]);

  const { data, isLoading, refetch } = useProveedores(filters);
  const createProveedor = useCreateProveedor();
  const updateProveedor = useUpdateProveedor(editingProveedor?.id);
  const deleteProveedor = useDeleteProveedor();

  const proveedores = data?.data?.proveedores || [];
  const pagination = data?.data?.pagination || {};

  const { 
    register, 
    handleSubmit, 
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(proveedorSchema),
    defaultValues: {
      tipoDocumento: 'CUIT',
      pais: 'Argentina',
      tipoProveedor: ''
    }
  });

  const onSubmit = async (formData) => {
    try {
      const payload = {
        ...formData,
        cuentasBancarias
      };
      
      if (editingProveedor) {
        await updateProveedor.mutateAsync(payload);
        toast.success('Proveedor actualizado');
      } else {
        await createProveedor.mutateAsync(payload);
        toast.success('Proveedor creado');
      }
      closeModal();
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const openModal = (proveedor = null) => {
    setEditingProveedor(proveedor);
    setActiveTab('datos');
    if (proveedor) {
      Object.keys(proveedor).forEach(key => {
        if (key !== 'cuentasBancarias') {
          setValue(key, proveedor[key]);
        }
      });
      setCuentasBancarias(proveedor.cuentasBancarias || []);
    } else {
      reset({
        tipoDocumento: 'CUIT',
        pais: 'Argentina',
        tipoProveedor: ''
      });
      setCuentasBancarias([]);
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProveedor(null);
    setCuentasBancarias([]);
    reset();
  };

  // Funciones para manejar cuentas bancarias
  const addCuentaBancaria = () => {
    setCuentasBancarias([
      ...cuentasBancarias,
      {
        id: Date.now().toString(),
        banco: '',
        cuenta: '',
        cbu: '',
        alias: '',
        titular: '',
        moneda: 'ARS',
        esPrincipal: cuentasBancarias.length === 0 // Primera cuenta es principal por defecto
      }
    ]);
  };

  const updateCuentaBancaria = (id, field, value) => {
    setCuentasBancarias(cuentasBancarias.map(cuenta => 
      cuenta.id === id ? { ...cuenta, [field]: value } : cuenta
    ));
  };

  const removeCuentaBancaria = (id) => {
    const updated = cuentasBancarias.filter(c => c.id !== id);
    // Si eliminamos la principal, hacer la primera como principal
    if (updated.length > 0 && !updated.some(c => c.esPrincipal)) {
      updated[0].esPrincipal = true;
    }
    setCuentasBancarias(updated);
  };

  const setAsMainAccount = (id) => {
    setCuentasBancarias(cuentasBancarias.map(cuenta => ({
      ...cuenta,
      esPrincipal: cuenta.id === id
    })));
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este proveedor?')) return;
    try {
      await deleteProveedor.mutateAsync(id);
      toast.success('Proveedor eliminado');
      refetch();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const getTipoInfo = (tipo) => {
    return TIPOS_PROVEEDOR.find(t => t.value === tipo) || TIPOS_PROVEEDOR[TIPOS_PROVEEDOR.length - 1];
  };

  return (
    <Layout title="Proveedores" subtitle="Gestiona tus proveedores y contactos comerciales">
      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar proveedor..."
                  className="pl-9"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                />
              </div>
              <select
                className="px-3 py-2 border rounded-lg text-sm bg-white"
                value={filters.tipoProveedor}
                onChange={(e) => setFilters({ ...filters, tipoProveedor: e.target.value, page: 1 })}
              >
                <option value="">Todos los tipos</option>
                {TIPOS_PROVEEDOR.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>
            <Button onClick={() => openModal()}>
              <Plus className="w-4 h-4" />
              Nuevo Proveedor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>País</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : proveedores.length === 0 ? (
                <TableEmpty 
                  colSpan={6} 
                  message="No hay proveedores" 
                  description="Agrega tu primer proveedor para comenzar"
                />
              ) : (
                proveedores.map((proveedor) => {
                  const tipoInfo = getTipoInfo(proveedor.tipoProveedor);
                  const TipoIcon = tipoInfo.icon;
                  return (
                    <TableRow key={proveedor.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                            {proveedor.razonSocial}
                          </p>
                          {proveedor.nombreFantasia && (
                            <p className="text-xs text-slate-500">{proveedor.nombreFantasia}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('flex items-center gap-1 w-fit', tipoInfo.color)}>
                          <TipoIcon className="w-3 h-3" />
                          {tipoInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {proveedor.tipoDocumento}: {proveedor.numeroDocumento}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {proveedor.email && (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Mail className="w-3 h-3" />
                              {proveedor.email}
                            </div>
                          )}
                          {proveedor.telefono && (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Phone className="w-3 h-3" />
                              {proveedor.telefono}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{proveedor.pais}</span>
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <button 
                            onClick={() => setMenuOpen(menuOpen === proveedor.id ? null : proveedor.id)}
                            className="p-1 rounded hover:bg-slate-100"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {menuOpen === proveedor.id && (
                            <div 
                              className="absolute right-0 top-8 z-50 w-40 rounded-lg shadow-lg border py-1"
                              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                            >
                              <button
                                onClick={() => { setViewingProveedor(proveedor); setMenuOpen(null); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" /> Ver detalle
                              </button>
                              <button
                                onClick={() => { openModal(proveedor); setMenuOpen(null); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" /> Editar
                              </button>
                              <button
                                onClick={() => { handleDelete(proveedor.id); setMenuOpen(null); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" /> Eliminar
                              </button>
                            </div>
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

      {/* Paginación */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            Anterior
          </Button>
          <span className="px-4 py-2 text-sm">
            Página {filters.page} de {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page >= pagination.pages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Modal Crear/Editar */}
      <Modal open={modalOpen} onClose={closeModal} size="lg">
        <ModalHeader>
          <ModalTitle>{editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</ModalTitle>
        </ModalHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalContent>
            {/* Tabs */}
            <div className="flex border-b mb-4" style={{ borderColor: 'var(--color-border)' }}>
              {['datos', 'contacto', 'banco', 'notas'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize',
                    activeTab === tab
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab === 'datos' ? 'Datos Básicos' : tab === 'contacto' ? 'Contacto' : tab === 'banco' ? 'Datos Bancarios' : 'Notas'}
                </button>
              ))}
            </div>

            {/* Tab Datos Básicos */}
            {activeTab === 'datos' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Razón Social *</label>
                  <Input {...register('razonSocial')} placeholder="Razón social" />
                  {errors.razonSocial && <span className="text-xs text-red-500">{errors.razonSocial.message}</span>}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Nombre Fantasía</label>
                  <Input {...register('nombreFantasia')} placeholder="Nombre comercial" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo Documento *</label>
                  <select {...register('tipoDocumento')} className="w-full px-3 py-2 border rounded-lg">
                    <option value="CUIT">CUIT</option>
                    <option value="CUIL">CUIL</option>
                    <option value="DNI">DNI</option>
                    <option value="Pasaporte">Pasaporte</option>
                    <option value="ID Extranjero">ID Extranjero</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Número *</label>
                  <Input {...register('numeroDocumento')} placeholder="20-12345678-9" />
                  {errors.numeroDocumento && <span className="text-xs text-red-500">{errors.numeroDocumento.message}</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Proveedor *</label>
                  <select {...register('tipoProveedor')} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Seleccionar...</option>
                    {TIPOS_PROVEEDOR.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                  </select>
                  {errors.tipoProveedor && <span className="text-xs text-red-500">{errors.tipoProveedor.message}</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Condición Fiscal</label>
                  <select {...register('condicionFiscal')} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Seleccionar...</option>
                    <option value="Responsable Inscripto">Responsable Inscripto</option>
                    <option value="Monotributista">Monotributista</option>
                    <option value="Exento">Exento</option>
                    <option value="No Responsable">No Responsable</option>
                    <option value="Consumidor Final">Consumidor Final</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Servicios que ofrece</label>
                  <textarea
                    {...register('servicios')}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Ej: Transporte terrestre, almacenamiento..."
                  />
                </div>
              </div>
            )}

            {/* Tab Contacto */}
            {activeTab === 'contacto' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input {...register('email')} type="email" placeholder="email@empresa.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Teléfono</label>
                  <Input {...register('telefono')} placeholder="+54 11 1234-5678" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp</label>
                  <Input {...register('whatsapp')} placeholder="+54 9 11 1234-5678" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sitio Web</label>
                  <Input {...register('website')} placeholder="https://..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Dirección</label>
                  <Input {...register('direccion')} placeholder="Calle 123" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ciudad</label>
                  <Input {...register('ciudad')} placeholder="Ciudad" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Provincia</label>
                  <Input {...register('provincia')} placeholder="Provincia" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">País</label>
                  <Input {...register('pais')} placeholder="Argentina" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Código Postal</label>
                  <Input {...register('codigoPostal')} placeholder="1234" />
                </div>
                
                <div className="col-span-2 border-t pt-4 mt-2" style={{ borderColor: 'var(--color-border)' }}>
                  <h4 className="font-medium mb-3">Contacto Principal</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nombre</label>
                      <Input {...register('contactoNombre')} placeholder="Nombre del contacto" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Cargo</label>
                      <Input {...register('contactoCargo')} placeholder="Ej: Gerente Comercial" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <Input {...register('contactoEmail')} type="email" placeholder="contacto@empresa.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Teléfono</label>
                      <Input {...register('contactoTelefono')} placeholder="+54 11 1234-5678" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Datos Bancarios */}
            {activeTab === 'banco' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Cuentas Bancarias</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addCuentaBancaria}>
                    <Plus className="w-4 h-4" /> Agregar Cuenta
                  </Button>
                </div>
                
                {cuentasBancarias.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
                    <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No hay cuentas bancarias</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addCuentaBancaria}>
                      <Plus className="w-4 h-4" /> Agregar primera cuenta
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cuentasBancarias.map((cuenta, index) => (
                      <div 
                        key={cuenta.id} 
                        className={cn(
                          'border rounded-lg p-4 relative',
                          cuenta.esPrincipal ? 'border-primary-300 bg-primary-50/30' : ''
                        )}
                        style={{ borderColor: cuenta.esPrincipal ? undefined : 'var(--color-border)' }}
                      >
                        {/* Badge principal */}
                        {cuenta.esPrincipal && (
                          <div className="absolute -top-2 left-3 px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3" /> Principal
                          </div>
                        )}
                        
                        {/* Botones de acción */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          {!cuenta.esPrincipal && (
                            <button
                              type="button"
                              onClick={() => setAsMainAccount(cuenta.id)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-500"
                              title="Marcar como principal"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeCuentaBancaria(cuenta.id)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500"
                            title="Eliminar cuenta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-medium mb-1 text-slate-500">Banco</label>
                            <Input
                              value={cuenta.banco}
                              onChange={(e) => updateCuentaBancaria(cuenta.id, 'banco', e.target.value)}
                              placeholder="Nombre del banco"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-slate-500">Moneda</label>
                            <select
                              value={cuenta.moneda}
                              onChange={(e) => updateCuentaBancaria(cuenta.id, 'moneda', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                            >
                              {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-slate-500">Número de Cuenta</label>
                            <Input
                              value={cuenta.cuenta}
                              onChange={(e) => updateCuentaBancaria(cuenta.id, 'cuenta', e.target.value)}
                              placeholder="Número de cuenta"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-slate-500">CBU / IBAN</label>
                            <Input
                              value={cuenta.cbu}
                              onChange={(e) => updateCuentaBancaria(cuenta.id, 'cbu', e.target.value)}
                              placeholder="CBU o IBAN"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-slate-500">Alias</label>
                            <Input
                              value={cuenta.alias}
                              onChange={(e) => updateCuentaBancaria(cuenta.id, 'alias', e.target.value)}
                              placeholder="Alias de transferencia"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-slate-500">Titular</label>
                            <Input
                              value={cuenta.titular}
                              onChange={(e) => updateCuentaBancaria(cuenta.id, 'titular', e.target.value)}
                              placeholder="Nombre del titular"
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab Notas */}
            {activeTab === 'notas' && (
              <div>
                <label className="block text-sm font-medium mb-1">Notas Internas</label>
                <textarea
                  {...register('notas')}
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Notas sobre este proveedor (solo visible internamente)..."
                />
              </div>
            )}
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingProveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal Ver Detalle */}
      <Modal open={!!viewingProveedor} onClose={() => setViewingProveedor(null)} size="lg">
        {viewingProveedor && (
          <>
            <ModalHeader>
              <ModalTitle className="flex items-center gap-2">
                {(() => {
                  const tipoInfo = getTipoInfo(viewingProveedor.tipoProveedor);
                  const TipoIcon = tipoInfo.icon;
                  return (
                    <>
                      <TipoIcon className="w-5 h-5" />
                      {viewingProveedor.razonSocial}
                    </>
                  );
                })()}
              </ModalTitle>
            </ModalHeader>
            <ModalContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 text-sm text-slate-500 uppercase">Datos Básicos</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-500">Nombre Fantasía:</span> {viewingProveedor.nombreFantasia || '-'}</p>
                    <p><span className="text-slate-500">Documento:</span> {viewingProveedor.tipoDocumento} {viewingProveedor.numeroDocumento}</p>
                    <p><span className="text-slate-500">Condición Fiscal:</span> {viewingProveedor.condicionFiscal || '-'}</p>
                    <p><span className="text-slate-500">Tipo:</span> {viewingProveedor.tipoProveedor}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-sm text-slate-500 uppercase">Contacto</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-500">Email:</span> {viewingProveedor.email || '-'}</p>
                    <p><span className="text-slate-500">Teléfono:</span> {viewingProveedor.telefono || '-'}</p>
                    <p><span className="text-slate-500">WhatsApp:</span> {viewingProveedor.whatsapp || '-'}</p>
                    <p><span className="text-slate-500">Website:</span> {viewingProveedor.website || '-'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-sm text-slate-500 uppercase">Dirección</h4>
                  <div className="space-y-2 text-sm">
                    <p>{viewingProveedor.direccion || '-'}</p>
                    <p>{viewingProveedor.ciudad}, {viewingProveedor.provincia}</p>
                    <p>{viewingProveedor.pais} {viewingProveedor.codigoPostal && `(${viewingProveedor.codigoPostal})`}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-sm text-slate-500 uppercase">Contacto Principal</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-500">Nombre:</span> {viewingProveedor.contactoNombre || '-'}</p>
                    <p><span className="text-slate-500">Cargo:</span> {viewingProveedor.contactoCargo || '-'}</p>
                    <p><span className="text-slate-500">Email:</span> {viewingProveedor.contactoEmail || '-'}</p>
                    <p><span className="text-slate-500">Teléfono:</span> {viewingProveedor.contactoTelefono || '-'}</p>
                  </div>
                </div>
                {viewingProveedor.cuentasBancarias?.length > 0 && (
                  <div className="col-span-2">
                    <h4 className="font-medium mb-3 text-sm text-slate-500 uppercase">Cuentas Bancarias</h4>
                    <div className="space-y-3">
                      {viewingProveedor.cuentasBancarias.map((cuenta, idx) => (
                        <div 
                          key={cuenta.id || idx} 
                          className={cn(
                            'p-3 rounded-lg border text-sm',
                            cuenta.esPrincipal ? 'border-primary-300 bg-primary-50/30' : 'bg-slate-50'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{cuenta.banco || 'Sin nombre'}</span>
                            {cuenta.esPrincipal && (
                              <Badge className="bg-primary-100 text-primary-700 text-xs">
                                <Star className="w-3 h-3 mr-1" /> Principal
                              </Badge>
                            )}
                            <Badge className="text-xs">{cuenta.moneda}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-slate-600">
                            {cuenta.cuenta && <p><span className="text-slate-400">Cuenta:</span> {cuenta.cuenta}</p>}
                            {cuenta.cbu && <p><span className="text-slate-400">CBU:</span> {cuenta.cbu}</p>}
                            {cuenta.alias && <p><span className="text-slate-400">Alias:</span> {cuenta.alias}</p>}
                            {cuenta.titular && <p><span className="text-slate-400">Titular:</span> {cuenta.titular}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {viewingProveedor.servicios && (
                  <div className="col-span-2">
                    <h4 className="font-medium mb-3 text-sm text-slate-500 uppercase">Servicios</h4>
                    <p className="text-sm">{viewingProveedor.servicios}</p>
                  </div>
                )}
                {viewingProveedor.notas && (
                  <div className="col-span-2">
                    <h4 className="font-medium mb-3 text-sm text-slate-500 uppercase">Notas</h4>
                    <p className="text-sm bg-slate-50 p-3 rounded">{viewingProveedor.notas}</p>
                  </div>
                )}
              </div>
            </ModalContent>
            <ModalFooter>
              <Button variant="outline" onClick={() => setViewingProveedor(null)}>Cerrar</Button>
              <Button onClick={() => { openModal(viewingProveedor); setViewingProveedor(null); }}>
                <Edit className="w-4 h-4" /> Editar
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </Layout>
  );
}

export default ProveedoresPage;
