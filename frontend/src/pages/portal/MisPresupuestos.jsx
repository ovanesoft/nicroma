import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, Plus, Clock, CheckCircle, XCircle, Send, 
  MessageSquare, FileText, FolderOpen, Eye
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Button, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '../../components/ui';
import { usePresupuestosCliente, useCambiarEstadoPresupuesto, useMarcarPresupuestoVisto } from '../../hooks/useApi';
import { formatDate, formatCurrency, cn } from '../../lib/utils';
import toast from 'react-hot-toast';

const ESTADOS = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800', icon: Clock },
  EN_PROCESO: { label: 'En Proceso', color: 'bg-blue-100 text-blue-800', icon: FileText },
  ENVIADO: { label: 'Para Revisar', color: 'bg-purple-100 text-purple-800', icon: Eye },
  APROBADO: { label: 'Aprobado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  RECHAZADO: { label: 'Rechazado', color: 'bg-red-100 text-red-800', icon: XCircle },
  CONVERTIDO: { label: 'En Operación', color: 'bg-emerald-100 text-emerald-800', icon: FolderOpen }
};

function MisPresupuestos() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = usePresupuestosCliente();
  const cambiarEstado = useCambiarEstadoPresupuesto();
  const marcarVisto = useMarcarPresupuestoVisto();

  const presupuestos = data?.data?.presupuestos || [];
  const marcadosRef = useRef(new Set());
  const hasMarcado = useRef(false);

  // Marcar como vistos los presupuestos enviados al cargar la página (solo una vez)
  useEffect(() => {
    if (!presupuestos.length || hasMarcado.current) return;
    
    // Encontrar presupuestos enviados que no hayan sido vistos
    const noVistos = presupuestos.filter(p => 
      p.estado === 'ENVIADO' && 
      !p.vistoPorCliente && 
      !marcadosRef.current.has(p.id)
    );
    
    if (noVistos.length === 0) return;
    
    // Marcar que ya procesamos
    hasMarcado.current = true;
    
    // Marcar cada uno como visto
    noVistos.forEach(p => {
      marcadosRef.current.add(p.id);
      marcarVisto.mutate(p.id);
    });
  }, [presupuestos]);

  const handleAprobar = async (id) => {
    if (!confirm('¿Confirmar aprobación de este presupuesto?')) return;
    try {
      await cambiarEstado.mutateAsync({ id, estado: 'APROBADO' });
      toast.success('Presupuesto aprobado');
      refetch();
    } catch (error) {
      toast.error('Error al aprobar presupuesto');
    }
  };

  const handleRechazar = async (id) => {
    const motivo = prompt('¿Por qué rechazás este presupuesto? (opcional)');
    try {
      await cambiarEstado.mutateAsync({ id, estado: 'RECHAZADO', motivoRechazo: motivo });
      toast.success('Presupuesto rechazado');
      refetch();
    } catch (error) {
      toast.error('Error al rechazar presupuesto');
    }
  };

  // Separar presupuestos pendientes de revisión
  const pendientesRevision = presupuestos.filter(p => p.estado === 'ENVIADO');
  const otros = presupuestos.filter(p => p.estado !== 'ENVIADO');

  return (
    <Layout 
      title="Mis Presupuestos" 
      subtitle="Seguí el estado de tus solicitudes de cotización"
    >
      {/* Botón nuevo */}
      <div className="flex justify-end mb-6">
        <Button onClick={() => navigate('/solicitar-presupuesto')}>
          <Plus className="w-4 h-4" />
          Nueva Solicitud
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : presupuestos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Calculator className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">No tenés presupuestos</h3>
            <p className="text-slate-500 mb-6">
              Solicitá tu primera cotización y te responderemos a la brevedad
            </p>
            <Button onClick={() => navigate('/solicitar-presupuesto')}>
              <Plus className="w-4 h-4" />
              Solicitar Presupuesto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Presupuestos pendientes de revisión */}
          {pendientesRevision.length > 0 && (
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-4">
                <h3 className="font-medium text-purple-800 flex items-center gap-2 mb-4">
                  <Eye className="w-5 h-5" />
                  Presupuestos para revisar ({pendientesRevision.length})
                </h3>
                <div className="space-y-3">
                  {pendientesRevision.map((pres) => (
                    <div key={pres.id} className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono font-medium text-primary-600">{pres.numero}</span>
                            <Badge className="bg-purple-100 text-purple-800">
                              <Eye className="w-3 h-3 mr-1" />
                              Para revisar
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">
                            {pres.descripcionPedido?.substring(0, 100)}...
                          </p>
                          {pres.totalVenta && (
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(pres.totalVenta, pres.moneda)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/presupuestos/${pres.id}`)}
                          >
                            Ver detalle
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleRechazar(pres.id)}
                          >
                            <XCircle className="w-4 h-4" />
                            Rechazar
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleAprobar(pres.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Aprobar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Otros presupuestos */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-center">Chat</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otros.map((pres) => {
                    const estado = ESTADOS[pres.estado] || ESTADOS.PENDIENTE;
                    const EstadoIcon = estado.icon;
                    return (
                      <TableRow 
                        key={pres.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate(`/presupuestos/${pres.id}`)}
                      >
                        <TableCell>
                          <span className="font-mono font-medium text-primary-600">
                            {pres.numero}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-slate-600 truncate max-w-[200px]">
                            {pres.descripcionPedido || '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                            estado.color
                          )}>
                            <EstadoIcon className="w-3.5 h-3.5" />
                            {estado.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {pres.totalVenta ? (
                            <span className="font-medium text-green-600">
                              {formatCurrency(pres.totalVenta, pres.moneda)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">
                            {formatDate(pres.fechaSolicitud)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {pres._count?.mensajes > 0 && (
                            <span className="inline-flex items-center gap-1 text-primary-600">
                              <MessageSquare className="w-4 h-4" />
                              <span className="text-xs font-medium">{pres._count.mensajes}</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => navigate(`/presupuestos/${pres.id}`)}
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
}

export default MisPresupuestos;
