import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileCheck, Plus, Clock, CheckCircle, XCircle, Send, 
  Eye, Download, MessageSquare
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Button, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '../../components/ui';
import { usePredespachosCliente, useCambiarEstadoPredespacho, useMarcarPredespachosVistosCliente } from '../../hooks/useApi';
import { formatDate, cn } from '../../lib/utils';
import { PREDESPACHO_ESTADOS } from '../../lib/constants';
import toast from 'react-hot-toast';
import api from '../../api/axios';

function MisPredespachos() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = usePredespachosCliente();
  const cambiarEstado = useCambiarEstadoPredespacho();
  const marcarVistos = useMarcarPredespachosVistosCliente();

  const predespachos = data?.data?.predespachos || [];
  const hasMarcado = useRef(false);

  // Al entrar, marcar todo como visto y mensajes como leídos → quita badges al instante
  useEffect(() => {
    if (!hasMarcado.current && data?.data?.predespachos !== undefined) {
      hasMarcado.current = true;
      marcarVistos.mutate();
    }
  }, [data]);

  const handleAprobar = async (id) => {
    if (!confirm('¿Confirmar aprobación de este predespacho?')) return;
    try {
      await cambiarEstado.mutateAsync({ id, estado: 'APROBADO' });
      toast.success('Predespacho aprobado');
      refetch();
    } catch (error) {
      toast.error('Error al aprobar');
    }
  };

  const handleRechazar = async (id) => {
    const motivo = prompt('¿Motivo del rechazo? (opcional)');
    try {
      await cambiarEstado.mutateAsync({ id, estado: 'RECHAZADO', motivoRechazo: motivo });
      toast.success('Predespacho rechazado');
      refetch();
    } catch (error) {
      toast.error('Error al rechazar');
    }
  };

  const handleDescargarPdf = async (id, numero) => {
    try {
      const response = await api.get(`/predespachos/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Predespacho-${numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Error al descargar PDF');
    }
  };

  const pendientesRevision = predespachos.filter(p => p.estado === 'ENVIADO');
  const otros = predespachos.filter(p => p.estado !== 'ENVIADO');

  return (
    <Layout 
      title="Mis Predespachos" 
      subtitle="Pedidos de fondos y presupuestos de operaciones"
    >
      <div className="flex justify-end mb-6">
        <Button onClick={() => navigate('/solicitar-predespacho')}>
          <Plus className="w-4 h-4" /> Nuevo Pedido
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : predespachos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <FileCheck className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">No tenés predespachos</h3>
            <p className="text-slate-500 mb-6">Solicitá tu primer pedido de fondos</p>
            <Button onClick={() => navigate('/solicitar-predespacho')}>
              <Plus className="w-4 h-4" /> Solicitar Predespacho
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pendientes de revisión */}
          {pendientesRevision.length > 0 && (
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-4">
                <h3 className="font-medium text-purple-800 flex items-center gap-2 mb-4">
                  <Eye className="w-5 h-5" />
                  Para revisar ({pendientesRevision.length})
                </h3>
                <div className="space-y-3">
                  {pendientesRevision.map(pd => (
                    <div key={pd.id} className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono font-medium text-primary-600">{pd.numero}</span>
                            <Badge className="bg-purple-100 text-purple-800">
                              <Eye className="w-3 h-3 mr-1" /> Para revisar
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">
                            {pd.mercaderia || pd.descripcionPedido || '-'}
                          </p>
                          <p className="text-xs text-slate-500">{pd.via} • {pd.destinacion?.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button size="sm" variant="outline" onClick={() => handleDescargarPdf(pd.id, pd.numero)}>
                            <Download className="w-4 h-4" /> PDF
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/predespachos/${pd.id}`)}>
                            Ver detalle
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleRechazar(pd.id)}>
                            <XCircle className="w-4 h-4" /> Rechazar
                          </Button>
                          <Button size="sm" onClick={() => handleAprobar(pd.id)}>
                            <CheckCircle className="w-4 h-4" /> Aprobar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Otros */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Mercadería</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vía</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otros.map(pd => {
                    const estado = PREDESPACHO_ESTADOS[pd.estado] || PREDESPACHO_ESTADOS.BORRADOR;
                    return (
                      <TableRow key={pd.id} className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate(`/predespachos/${pd.id}`)}>
                        <TableCell>
                          <span className="font-mono font-medium text-primary-600">{pd.numero}</span>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-slate-600 truncate max-w-[200px]">
                            {pd.mercaderia || pd.descripcionPedido || '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', estado.color)}>
                            {estado.label}
                          </span>
                        </TableCell>
                        <TableCell><span className="text-sm text-slate-600">{pd.via || '-'}</span></TableCell>
                        <TableCell><span className="text-sm text-slate-500">{formatDate(pd.fecha)}</span></TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button onClick={() => handleDescargarPdf(pd.id, pd.numero)}
                              className="p-2 hover:bg-slate-100 rounded-lg" title="PDF">
                              <Download className="w-4 h-4 text-slate-400" />
                            </button>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/predespachos/${pd.id}`)}>
                              Ver
                            </Button>
                          </div>
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

export default MisPredespachos;
