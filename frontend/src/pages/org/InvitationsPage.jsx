import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Plus, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Badge, Button, Input,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty,
  Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter
} from '../../components/ui';
import { useInvitations, useInviteUser, useCancelInvitation } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime, getRoleLabel } from '../../lib/utils';

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'manager', 'user'])
});

function InvitationsPage() {
  const { user: currentUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  
  const { data, isLoading, refetch } = useInvitations(currentUser?.tenantId);
  const inviteUser = useInviteUser(currentUser?.tenantId);
  const cancelInvitation = useCancelInvitation();

  const invitations = data?.data?.invitations || [];

  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'user'
    }
  });

  const onSubmit = async (formData) => {
    try {
      await inviteUser.mutateAsync(formData);
      setModalOpen(false);
      reset();
      refetch();
    } catch (error) {
      console.error('Error sending invitation:', error);
    }
  };

  const handleCancel = async (invitationId) => {
    if (!confirm('¿Cancelar esta invitación?')) return;
    try {
      await cancelInvitation.mutateAsync(invitationId);
      refetch();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
    }
  };

  const getStatusBadge = (status, expiresAt) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'accepted') {
      return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Aceptada</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="danger"><XCircle className="w-3 h-3 mr-1" />Cancelada</Badge>;
    }
    if (isExpired || status === 'expired') {
      return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />Expirada</Badge>;
    }
    return <Badge variant="blue"><Mail className="w-3 h-3 mr-1" />Pendiente</Badge>;
  };

  return (
    <Layout 
      title="Invitaciones" 
      subtitle="Invita usuarios a tu organización"
    >
      {/* Actions */}
      <div className="flex justify-end mb-6">
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Nueva Invitación
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Invitado por</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Expira</TableHead>
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
              ) : invitations.length === 0 ? (
                <TableEmpty 
                  colSpan={6} 
                  message="No hay invitaciones" 
                />
              ) : (
                invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                          <Mail className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-slate-800">{invitation.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {getRoleLabel(invitation.role)}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {invitation.invited_by_first_name} {invitation.invited_by_last_name}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invitation.status, invitation.expires_at)}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDateTime(invitation.expires_at)}
                    </TableCell>
                    <TableCell>
                      {invitation.status === 'pending' && (
                        <button 
                          onClick={() => handleCancel(invitation.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                          title="Cancelar invitación"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Invite Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalHeader onClose={() => setModalOpen(false)}>
          <ModalTitle>Invitar Usuario</ModalTitle>
        </ModalHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalContent className="space-y-4">
            <p className="text-sm text-slate-500 mb-4">
              Se enviará un email de invitación. El usuario tendrá 7 días para aceptarla.
            </p>
            <Input
              label="Email"
              type="email"
              placeholder="usuario@ejemplo.com"
              error={errors.email?.message}
              {...register('email')}
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
                {currentUser?.role === 'admin' && (
                  <option value="admin">Administrador</option>
                )}
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
              <Mail className="w-4 h-4" />
              Enviar Invitación
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </Layout>
  );
}

export default InvitationsPage;
