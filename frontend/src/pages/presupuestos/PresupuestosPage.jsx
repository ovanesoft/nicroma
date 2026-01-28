import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, FileText, Clock, CheckCircle, 
  XCircle, ArrowRight, MessageSquare, DollarSign, Calendar,
  MoreVertical, Send, FolderOpen
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Button, Input, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '../../components/ui';
import { usePresupuestos, useCambiarEstadoPresupuesto, useConvertirPresupuesto } from '../../hooks/useApi';
import { formatDate, formatCurrency, cn } from '../../lib/utils';
import toast from 'react-hot-toast';

const ESTADOS = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800', icon: Clock },
  EN_PROCESO: { label: 'En Proceso', color: 'bg-blue-100 text-blue-800', icon: FileText },
  ENVIADO: { label: 'Enviado', color: 'bg-purple-100 text-purple-800', icon: Send },
  APROBADO: { label: 'Aprobado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  RECHAZADO: { label: 'Rechazado', color: 'bg-red-100 text-red-800', icon: XCircle },
  CONVERTIDO: { label: 'Convertido', color: 'bg-emerald-100 text-emerald-800', icon: FolderOpen },
  VENCIDO: { label: 'Vencido', color: 'bg-slate-100 text-slate-800', icon: Clock }
};

function PresupuestosPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    estado: '',
    page: 1,
    limit: 20
  });
  const [activeMenu, setActiveMenu] = useState(null);

  const { data, isLoading, refetch } = usePresupuestos(filters);
  const cambiarEstado = useCambiarEstadoPresupuesto();
  const convertir = useConvertirPresupuesto();

  const presupuestos = data?.data?.presupuestos || [];
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
      toast.success(`Presupuesto ${ESTADOS[nuevoEstado].label.toLowerCase()}`);
      setActiveMenu(null);
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  const handleConvertir = async (id) => {
    if (!confirm('¿Convertir este presupuesto aprobado en una carpeta de operación?')) return;
    try {
      const result = await convertir.mutateAsync(id);
      toast.success('Presupuesto convertido a carpeta');
      navigate(`/carpetas/${result.data.carpeta.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al convertir');
    }
  };

  // Contadores por estado
  const contadores = presupuestos.reduce((acc, p) => {
    acc[p.estado] = (acc[p.estado] || 0) + 1;
    return acc;
  }, {});

  return (
    <Layout 
      title="Presupuestos" 
      subtitle="Gestiona cotizaciones y solicitudes de tus clientes"
    >
      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {Object.entries(ESTADOS).map(([key, { label, color, icon: Icon }]) => (
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
            <Icon className={cn('w-5 h-5 mb-1', color.replace('bg-', 'text-').replace('-100', '-600'))} />
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
            placeholder="Buscar por número, cliente o descripción..."
            value={filters.search}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>
        <Button onClick={() => navigate('/presupuestos/nuevo')}>
          <Plus className="w-4 h-4" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : presupuestos.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No hay presupuestos</h3>
              <p className="text-slate-500 mb-4">
                {filters.search || filters.estado
                  ? 'No se encontraron presupuestos con los filtros aplicados'
                  : 'Crea tu primer presupuesto o espera solicitudes de clientes'}
              </p>
              <Button onClick={() => navigate('/presupuestos/nuevo')}>
                <Plus className="w-4 h-4" />
                Crear Presupuesto
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-center">Chat</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presupuestos.map((pres) => {
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
                        <div>
                          <p className="font-medium text-slate-800">
                            {pres.cliente?.razonSocial || pres.solicitanteNombre || 'Sin asignar'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {pres.solicitanteEmail || pres.cliente?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-600 truncate max-w-[200px]">
                          {pres.descripcionPedido || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', estado.color)}>
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
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenu(activeMenu === pres.id ? null : pres.id)}
                            className="p-2 hover:bg-slate-100 rounded-lg"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-400" />
                          </button>
                          
                          {activeMenu === pres.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                                <button
                                  onClick={() => navigate(`/presupuestos/${pres.id}`)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <FileText className="w-4 h-4" />
                                  Ver detalle
                                </button>
                                
                                {pres.estado === 'PENDIENTE' && (
                                  <button
                                    onClick={() => handleCambiarEstado(pres.id, 'EN_PROCESO')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                    Tomar pedido
                                  </button>
                                )}
                                
                                {pres.estado === 'EN_PROCESO' && (
                                  <button
                                    onClick={() => handleCambiarEstado(pres.id, 'ENVIADO')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-purple-600"
                                  >
                                    <Send className="w-4 h-4" />
                                    Enviar al cliente
                                  </button>
                                )}
                                
                                {pres.estado === 'APROBADO' && !pres.carpetaId && (
                                  <button
                                    onClick={() => handleConvertir(pres.id)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-emerald-600"
                                  >
                                    <FolderOpen className="w-4 h-4" />
                                    Convertir a carpeta
                                  </button>
                                )}
                                
                                {['PENDIENTE', 'EN_PROCESO', 'ENVIADO'].includes(pres.estado) && (
                                  <button
                                    onClick={() => {
                                      const motivo = prompt('Motivo del rechazo:');
                                      if (motivo) handleCambiarEstado(pres.id, 'RECHAZADO');
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Rechazar
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
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4 text-sm text-slate-600">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Siguiente
          </Button>
        </div>
      )}
    </Layout>
  );
}

export default PresupuestosPage;
