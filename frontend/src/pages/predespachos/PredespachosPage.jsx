import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, FileText, Clock, CheckCircle, XCircle, 
  Send, MoreVertical, FileCheck, Download, Eye
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Button, Input, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '../../components/ui';
import { usePredespachos, useCambiarEstadoPredespacho } from '../../hooks/useApi';
import { formatDate, formatCurrency, cn } from '../../lib/utils';
import { PREDESPACHO_ESTADOS } from '../../lib/constants';
import toast from 'react-hot-toast';
import api from '../../api/axios';

function PredespachosPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    estado: '',
    page: 1,
    limit: 20
  });
  const [activeMenu, setActiveMenu] = useState(null);

  const { data, isLoading } = usePredespachos(filters);
  const cambiarEstado = useCambiarEstadoPredespacho();

  const predespachos = data?.data?.predespachos || [];
  const pagination = data?.data?.pagination || {};

  const handleSearch = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleEstadoFilter = (estado) => {
    setFilters(prev => ({ ...prev, estado: prev.estado === estado ? '' : estado, page: 1 }));
  };

  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      await cambiarEstado.mutateAsync({ id, estado: nuevoEstado });
      toast.success(`Estado cambiado a ${PREDESPACHO_ESTADOS[nuevoEstado]?.label}`);
      setActiveMenu(null);
    } catch (error) {
      toast.error('Error al cambiar estado');
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
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Error al descargar PDF');
    }
  };

  // Contadores por estado
  const contadores = predespachos.reduce((acc, p) => {
    acc[p.estado] = (acc[p.estado] || 0) + 1;
    return acc;
  }, {});

  return (
    <Layout 
      title="Predespacho" 
      subtitle="Pedidos de fondos y presupuestos de operaciones"
    >
      {/* Resumen por estado */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Object.entries(PREDESPACHO_ESTADOS).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => handleEstadoFilter(key)}
            className={cn(
              'p-3 rounded-xl border transition-all text-left',
              filters.estado === key
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                : 'border-slate-200 hover:border-primary-300'
            )}
          >
            <p className="text-lg font-bold text-slate-800">{contadores[key] || 0}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </button>
        ))}
      </div>

      {/* Barra de acciones */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar por número, mercadería o cliente..."
            value={filters.search}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>
        <Button onClick={() => navigate('/predespachos/nuevo')}>
          <Plus className="w-4 h-4" />
          Nuevo Predespacho
        </Button>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : predespachos.length === 0 ? (
            <div className="text-center py-16">
              <FileCheck className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No hay predespachos</h3>
              <p className="text-slate-500 mb-4">
                {filters.search || filters.estado
                  ? 'No se encontraron predespachos con los filtros aplicados'
                  : 'Creá tu primer pedido de fondos o predespacho'}
              </p>
              <Button onClick={() => navigate('/predespachos/nuevo')}>
                <Plus className="w-4 h-4" />
                Crear Predespacho
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Mercadería</TableHead>
                  <TableHead>Vía</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {predespachos.map((pd) => {
                  const estado = PREDESPACHO_ESTADOS[pd.estado] || PREDESPACHO_ESTADOS.BORRADOR;
                  return (
                    <TableRow 
                      key={pd.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => navigate(`/predespachos/${pd.id}`)}
                    >
                      <TableCell>
                        <span className="font-mono font-medium text-primary-600">{pd.numero}</span>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-800">
                          {pd.cliente?.razonSocial || pd.solicitanteNombre || 'Sin asignar'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-600 truncate max-w-[180px]">
                          {pd.mercaderia || pd.descripcionPedido || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{pd.via || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', estado.color)}>
                          {estado.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">{formatDate(pd.fecha)}</span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="relative flex items-center gap-1">
                          <button
                            onClick={() => handleDescargarPdf(pd.id, pd.numero)}
                            className="p-2 hover:bg-slate-100 rounded-lg"
                            title="Descargar PDF"
                          >
                            <Download className="w-4 h-4 text-slate-400" />
                          </button>
                          <button
                            onClick={() => setActiveMenu(activeMenu === pd.id ? null : pd.id)}
                            className="p-2 hover:bg-slate-100 rounded-lg"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-400" />
                          </button>
                          
                          {activeMenu === pd.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                                <button
                                  onClick={() => { navigate(`/predespachos/${pd.id}`); setActiveMenu(null); }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" /> Ver detalle
                                </button>
                                {pd.estado === 'BORRADOR' && (
                                  <button
                                    onClick={() => handleCambiarEstado(pd.id, 'ENVIADO')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-purple-600"
                                  >
                                    <Send className="w-4 h-4" /> Enviar al cliente
                                  </button>
                                )}
                                {pd.estado === 'APROBADO' && (
                                  <button
                                    onClick={() => handleCambiarEstado(pd.id, 'EN_PROCESO')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-blue-600"
                                  >
                                    <Clock className="w-4 h-4" /> Pasar a En Proceso
                                  </button>
                                )}
                                {pd.estado === 'EN_PROCESO' && (
                                  <button
                                    onClick={() => handleCambiarEstado(pd.id, 'FINALIZADO')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-emerald-600"
                                  >
                                    <CheckCircle className="w-4 h-4" /> Finalizar
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={pagination.page <= 1}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}>
            Anterior
          </Button>
          <span className="flex items-center px-4 text-sm text-slate-600">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}>
            Siguiente
          </Button>
        </div>
      )}
    </Layout>
  );
}

export default PredespachosPage;
