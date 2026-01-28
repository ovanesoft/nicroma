import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Ship, MoreVertical, Eye, Edit, Copy, Trash2,
  Filter, Download, Calendar
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Button, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty
} from '../../components/ui';
import { useCarpetas, useDeleteCarpeta, useDuplicarCarpeta } from '../../hooks/useApi';
import { formatDate, cn } from '../../lib/utils';
import { CARPETA_ESTADOS, AREAS, SECTORES, TIPOS_OPERACION } from '../../lib/constants';

function CarpetasPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    estado: '',
    area: '',
    sector: '',
    page: 1,
    limit: 20
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  const { data, isLoading, refetch } = useCarpetas(filters);
  const deleteCarpeta = useDeleteCarpeta();
  const duplicarCarpeta = useDuplicarCarpeta();

  const carpetas = data?.data?.carpetas || [];
  const pagination = data?.data?.pagination || {};

  const handleSearch = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      estado: '',
      area: '',
      sector: '',
      page: 1,
      limit: 20
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Cancelar esta carpeta?')) return;
    try {
      await deleteCarpeta.mutateAsync(id);
      refetch();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const result = await duplicarCarpeta.mutateAsync(id);
      navigate(`/carpetas/${result.data.carpeta.id}`);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getEstadoBadge = (estado) => {
    const config = CARPETA_ESTADOS[estado] || { label: estado, color: 'bg-slate-100 text-slate-700' };
    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', config.color)}>
        {config.label}
      </span>
    );
  };

  return (
    <Layout title="Carpetas" subtitle="Gestión de carpetas de embarque">
      {/* Actions Bar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número, booking, BL..."
              value={filters.search}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
            <Button onClick={() => navigate('/carpetas/nueva')}>
              <Plus className="w-4 h-4" />
              Nueva Carpeta
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="animate-fade-in">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <select
                    value={filters.estado}
                    onChange={(e) => handleFilterChange('estado', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
                  >
                    <option value="">Todos</option>
                    {Object.entries(CARPETA_ESTADOS).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Área</label>
                  <select
                    value={filters.area}
                    onChange={(e) => handleFilterChange('area', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
                  >
                    <option value="">Todas</option>
                    {AREAS.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sector</label>
                  <select
                    value={filters.sector}
                    onChange={(e) => handleFilterChange('sector', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
                  >
                    <option value="">Todos</option>
                    {SECTORES.map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" onClick={clearFilters} className="w-full">
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-visible">
        <CardContent className="p-0 overflow-visible">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carpeta</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>ETD / ETA</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
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
              ) : carpetas.length === 0 ? (
                <TableEmpty 
                  colSpan={7} 
                  message={filters.search || filters.estado ? 'No se encontraron carpetas' : 'No hay carpetas creadas'} 
                />
              ) : (
                carpetas.map((carpeta) => (
                  <TableRow 
                    key={carpeta.id} 
                    className="cursor-pointer"
                    onClick={() => navigate(`/carpetas/${carpeta.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
                          <Ship className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{carpeta.numero}</p>
                          <p className="text-xs text-slate-500">
                            {carpeta.booking && `Booking: ${carpeta.booking}`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-700">
                        {carpeta.cliente?.razonSocial || '—'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {carpeta.cliente?.numeroDocumento}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="text-slate-700">{carpeta.area}</p>
                        <p className="text-xs text-slate-500">{carpeta.sector} · {carpeta.tipoOperacion}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="text-slate-700">{carpeta.puertoOrigen || '—'}</p>
                        <p className="text-xs text-slate-500">→ {carpeta.puertoDestino || '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="text-slate-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {carpeta.fechaSalidaEstimada ? formatDate(carpeta.fechaSalidaEstimada) : '—'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {carpeta.fechaLlegadaEstimada ? formatDate(carpeta.fechaLlegadaEstimada) : '—'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getEstadoBadge(carpeta.estado)}
                    </TableCell>
                    <TableCell className="overflow-visible" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button 
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          onClick={() => setActiveMenu(activeMenu === carpeta.id ? null : carpeta.id)}
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        {activeMenu === carpeta.id && (
                          <>
                            {/* Overlay para cerrar el menú al hacer clic fuera */}
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  navigate(`/carpetas/${carpeta.id}`);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Eye className="w-4 h-4" />
                                Ver detalle
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  navigate(`/carpetas/${carpeta.id}/editar`);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Edit className="w-4 h-4" />
                                Editar
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  handleDuplicate(carpeta.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Copy className="w-4 h-4" />
                                Duplicar
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  handleDelete(carpeta.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Cancelar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </Layout>
  );
}

export default CarpetasPage;
