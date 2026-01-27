import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle,
  User,
  Building2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Globe,
  Monitor
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import api from '../../api/axios';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Colores por tipo de acción
const getActionColor = (action) => {
  if (action?.includes('LOGIN') || action?.includes('REGISTER')) return 'bg-green-100 text-green-700';
  if (action?.includes('CREATE') || action?.includes('INSERT')) return 'bg-blue-100 text-blue-700';
  if (action?.includes('UPDATE') || action?.includes('EDIT')) return 'bg-yellow-100 text-yellow-700';
  if (action?.includes('DELETE') || action?.includes('REMOVE')) return 'bg-red-100 text-red-700';
  if (action?.includes('ERROR') || action?.includes('FAIL')) return 'bg-red-100 text-red-700';
  if (action?.includes('LOGOUT')) return 'bg-slate-100 text-slate-700';
  return 'bg-purple-100 text-purple-700';
};

// Icono por tipo de acción
const getActionIcon = (action) => {
  if (action?.includes('LOGIN') || action?.includes('REGISTER')) return '🔐';
  if (action?.includes('CREATE')) return '➕';
  if (action?.includes('UPDATE') || action?.includes('EDIT')) return '✏️';
  if (action?.includes('DELETE')) return '🗑️';
  if (action?.includes('ERROR') || action?.includes('FAIL')) return '⚠️';
  if (action?.includes('LOGOUT')) return '🚪';
  if (action?.includes('INVITE')) return '📧';
  if (action?.includes('VERIFY')) return '✅';
  return '📋';
};

function SystemLogsPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Cargar logs
  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.action && { action: filters.action }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await api.get(`/logs?${params}`);
      if (response.data.success) {
        setLogs(response.data.data.logs);
        setPagination(prev => ({ ...prev, ...response.data.data.pagination }));
      }
    } catch (error) {
      console.error('Error cargando logs:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  // Cargar stats y acciones
  const fetchMeta = async () => {
    try {
      const [statsRes, actionsRes] = await Promise.all([
        api.get('/logs/stats'),
        api.get('/logs/actions')
      ]);
      
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (actionsRes.data.success) setActions(actionsRes.data.data);
    } catch (error) {
      console.error('Error cargando metadata:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchMeta();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatDate = (date) => {
    try {
      return format(new Date(date), "dd/MM/yyyy HH:mm:ss", { locale: es });
    } catch {
      return date;
    }
  };

  const formatRelative = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
    } catch {
      return '';
    }
  };

  return (
    <Layout title="Logs del Sistema" subtitle="Monitoreo de actividad en tiempo real">
      <div className="space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalLogs.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Total eventos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.todayLogs}</p>
                    <p className="text-xs text-slate-500">Hoy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Filter className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{actions.length}</p>
                    <p className="text-xs text-slate-500">Tipos de acción</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    stats.recentErrors > 0 ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${
                      stats.recentErrors > 0 ? 'text-red-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.recentErrors}</p>
                    <p className="text-xs text-slate-500">Errores (24h)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Toolbar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por usuario, acción, tenant..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </form>

              {/* Action filter */}
              <select
                value={filters.action}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, action: e.target.value }));
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todas las acciones</option>
                {actions.map(a => (
                  <option key={a.action} value={a.action}>
                    {a.action} ({a.count})
                  </option>
                ))}
              </select>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                    showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                </button>
                
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                    autoRefresh ? 'bg-green-50 border-green-200 text-green-700' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                  {autoRefresh ? 'Live' : 'Auto'}
                </button>

                <button
                  onClick={fetchLogs}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Extended Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Desde</label>
                  <input
                    type="datetime-local"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hasta</label>
                  <input
                    type="datetime-local"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilters({ search: '', action: '', startDate: '', endDate: '' });
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Registro de Actividad
              </span>
              <span className="text-sm font-normal text-slate-500">
                {pagination.total.toLocaleString()} eventos
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                <p className="mt-2 text-slate-500">Cargando logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>No hay logs que mostrar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-y border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Acción</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tenant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">IP</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-800">{formatDate(log.created_at)}</div>
                          <div className="text-xs text-slate-500">{formatRelative(log.created_at)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            <span>{getActionIcon(log.action)}</span>
                            {log.action}
                          </span>
                          {log.entity_type && (
                            <div className="text-xs text-slate-500 mt-1">{log.entity_type}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {log.user_email ? (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <div>
                                <div className="text-sm text-slate-800">
                                  {log.user_first_name} {log.user_last_name}
                                </div>
                                <div className="text-xs text-slate-500">{log.user_email}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Sistema</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {log.tenant_name ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <div>
                                <div className="text-sm text-slate-800">{log.tenant_name}</div>
                                <div className="text-xs text-slate-500">{log.tenant_slug}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {log.ip_address ? (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <Globe className="w-3 h-3" />
                              {log.ip_address}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1 hover:bg-slate-100 rounded"
                          >
                            <Eye className="w-4 h-4 text-slate-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Página {pagination.page} de {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Detalle del Evento</h3>
                <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-slate-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 uppercase">Acción</label>
                    <p className={`mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${getActionColor(selectedLog.action)}`}>
                      {getActionIcon(selectedLog.action)} {selectedLog.action}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase">Fecha</label>
                    <p className="mt-1 text-sm text-slate-800">{formatDate(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase">Usuario</label>
                    <p className="mt-1 text-sm text-slate-800">
                      {selectedLog.user_email || 'Sistema'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase">Tenant</label>
                    <p className="mt-1 text-sm text-slate-800">
                      {selectedLog.tenant_name || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase">Entidad</label>
                    <p className="mt-1 text-sm text-slate-800">
                      {selectedLog.entity_type || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase">Entity ID</label>
                    <p className="mt-1 text-sm text-slate-800 font-mono text-xs">
                      {selectedLog.entity_id || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase">IP Address</label>
                    <p className="mt-1 text-sm text-slate-800">{selectedLog.ip_address || '-'}</p>
                  </div>
                </div>

                {selectedLog.user_agent && (
                  <div>
                    <label className="text-xs text-slate-500 uppercase">User Agent</label>
                    <p className="mt-1 text-xs text-slate-600 bg-slate-50 p-2 rounded break-all">
                      {selectedLog.user_agent}
                    </p>
                  </div>
                )}

                {selectedLog.old_values && (
                  <div>
                    <label className="text-xs text-slate-500 uppercase">Valores Anteriores</label>
                    <pre className="mt-1 text-xs bg-red-50 p-3 rounded overflow-x-auto text-red-800">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_values && (
                  <div>
                    <label className="text-xs text-slate-500 uppercase">Valores Nuevos</label>
                    <pre className="mt-1 text-xs bg-green-50 p-3 rounded overflow-x-auto text-green-800">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default SystemLogsPage;
