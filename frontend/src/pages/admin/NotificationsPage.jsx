import { useState } from 'react';
import { 
  Bell, Plus, Send, Megaphone, AlertTriangle, Gift, Clock,
  CreditCard, Users, Building2, Trash2, Eye, EyeOff
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input, Badge,
  Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty
} from '../../components/ui';
import { 
  useAllNotifications, useCreateNotification, useDeactivateNotification,
  useTenants
} from '../../hooks/useApi';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

const NOTIFICATION_TYPES = [
  { value: 'ANNOUNCEMENT', label: 'Anuncio General', icon: Megaphone, color: 'text-blue-500' },
  { value: 'MAINTENANCE', label: 'Mantenimiento', icon: AlertTriangle, color: 'text-orange-500' },
  { value: 'NEW_FEATURE', label: 'Nueva Funcionalidad', icon: Gift, color: 'text-purple-500' },
  { value: 'SYSTEM_ALERT', label: 'Alerta del Sistema', icon: AlertTriangle, color: 'text-red-500' }
];

const PRIORITIES = [
  { value: 'LOW', label: 'Baja', color: 'bg-slate-100 text-slate-700' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  { value: 'HIGH', label: 'Alta', color: 'bg-amber-100 text-amber-700' },
  { value: 'URGENT', label: 'Urgente', color: 'bg-red-100 text-red-700' }
];

function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'ANNOUNCEMENT',
    priority: 'NORMAL',
    title: '',
    message: '',
    actionUrl: '',
    actionLabel: '',
    targetType: 'all', // all, tenant, roles
    tenantId: '',
    targetRoles: []
  });

  const { data, isLoading, refetch } = useAllNotifications(page);
  const { data: tenantsData } = useTenants();
  const createNotification = useCreateNotification();
  const deactivateNotification = useDeactivateNotification();

  const notifications = data?.data?.notifications || [];
  const pagination = data?.data?.pagination || {};
  const tenants = tenantsData?.data?.tenants || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      toast.error('Título y mensaje son requeridos');
      return;
    }

    try {
      const payload = {
        type: formData.type,
        priority: formData.priority,
        title: formData.title,
        message: formData.message,
        actionUrl: formData.actionUrl || null,
        actionLabel: formData.actionLabel || null,
        tenantId: formData.targetType === 'tenant' ? formData.tenantId : null,
        targetRoles: formData.targetType === 'roles' ? formData.targetRoles : []
      };

      await createNotification.mutateAsync(payload);
      toast.success('Notificación enviada');
      setModalOpen(false);
      setFormData({
        type: 'ANNOUNCEMENT',
        priority: 'NORMAL',
        title: '',
        message: '',
        actionUrl: '',
        actionLabel: '',
        targetType: 'all',
        tenantId: '',
        targetRoles: []
      });
      refetch();
    } catch (error) {
      toast.error('Error al crear notificación');
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('¿Desactivar esta notificación?')) return;
    try {
      await deactivateNotification.mutateAsync(id);
      toast.success('Notificación desactivada');
      refetch();
    } catch (error) {
      toast.error('Error al desactivar');
    }
  };

  const getTypeInfo = (type) => {
    return NOTIFICATION_TYPES.find(t => t.value === type) || NOTIFICATION_TYPES[0];
  };

  const getPriorityInfo = (priority) => {
    return PRIORITIES.find(p => p.value === priority) || PRIORITIES[1];
  };

  return (
    <Layout 
      title="Notificaciones del Sistema" 
      subtitle="Envía comunicaciones a los usuarios de la plataforma"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {pagination.total || 0}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  Total enviadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {notifications.filter(n => n.isActive).length}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  Activas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {notifications.reduce((acc, n) => acc + (n._count?.reads || 0), 0)}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  Total lecturas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-center">
            <Button onClick={() => setModalOpen(true)} className="w-full">
              <Plus className="w-4 h-4" />
              Nueva Notificación
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Historial de Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Lecturas</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <div className="h-12 rounded animate-pulse" style={{ backgroundColor: 'var(--color-border)' }} />
                    </TableCell>
                  </TableRow>
                ))
              ) : notifications.length === 0 ? (
                <TableEmpty colSpan={8} message="No hay notificaciones" />
              ) : (
                notifications.map((notif) => {
                  const typeInfo = getTypeInfo(notif.type);
                  const priorityInfo = getPriorityInfo(notif.priority);
                  const TypeIcon = typeInfo.icon;
                  
                  return (
                    <TableRow key={notif.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                          <span className="text-sm">{typeInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                          {notif.title}
                        </p>
                        <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--color-textSecondary)' }}>
                          {notif.message}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {notif.tenantId ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Building2 className="w-3 h-3" />
                            Tenant
                          </span>
                        ) : notif.targetRoles?.length > 0 ? (
                          <span className="text-sm">{notif.targetRoles.join(', ')}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm">
                            <Users className="w-3 h-3" />
                            Todos
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{notif._count?.reads || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                          {formatDate(notif.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={notif.isActive ? 'success' : 'secondary'}>
                          {notif.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {notif.isActive && (
                          <button
                            onClick={() => handleDeactivate(notif.id)}
                            className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                            title="Desactivar"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        )}
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
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Anterior
          </Button>
          <span className="px-4 py-2 text-sm" style={{ color: 'var(--color-text)' }}>
            Página {page} de {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === pagination.pages}
            onClick={() => setPage(p => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Modal crear notificación */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalHeader onClose={() => setModalOpen(false)}>
          <ModalTitle>Nueva Notificación</ModalTitle>
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalContent className="space-y-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Tipo de notificación
              </label>
              <div className="grid grid-cols-2 gap-2">
                {NOTIFICATION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${
                        formData.type === type.value 
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' 
                          : 'border-[var(--color-border)]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${type.color}`} />
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Prioridad
              </label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.value })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.priority === p.value ? p.color : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Título y mensaje */}
            <Input
              label="Título"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Mantenimiento programado"
              required
            />
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                Mensaje
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Detalle de la notificación..."
                rows={3}
                required
                className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
            </div>

            {/* Acción opcional */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="URL de acción (opcional)"
                value={formData.actionUrl}
                onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                placeholder="/billing/plans"
              />
              <Input
                label="Texto del botón"
                value={formData.actionLabel}
                onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
                placeholder="Ver planes"
              />
            </div>

            {/* Destino */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Enviar a
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    value="all"
                    checked={formData.targetType === 'all'}
                    onChange={() => setFormData({ ...formData, targetType: 'all' })}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                    Todos los usuarios
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    value="tenant"
                    checked={formData.targetType === 'tenant'}
                    onChange={() => setFormData({ ...formData, targetType: 'tenant' })}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                    Tenant específico
                  </span>
                </label>
                {formData.targetType === 'tenant' && (
                  <select
                    value={formData.tenantId}
                    onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border mt-2"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="">Seleccionar tenant...</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    value="roles"
                    checked={formData.targetType === 'roles'}
                    onChange={() => setFormData({ ...formData, targetType: 'roles' })}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                    Roles específicos
                  </span>
                </label>
                {formData.targetType === 'roles' && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {['admin', 'manager', 'user', 'client'].map((role) => (
                      <label key={role} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.targetRoles.includes(role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, targetRoles: [...formData.targetRoles, role] });
                            } else {
                              setFormData({ ...formData, targetRoles: formData.targetRoles.filter(r => r !== role) });
                            }
                          }}
                        />
                        <span className="text-sm capitalize" style={{ color: 'var(--color-text)' }}>{role}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createNotification.isPending}>
              <Send className="w-4 h-4" />
              Enviar Notificación
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </Layout>
  );
}

export default NotificationsPage;
