import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, FileText, MoreVertical, Eye, CheckCircle, XCircle, 
  Receipt, Calendar
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Button, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty
} from '../../components/ui';
import { 
  usePrefacturas, useConfirmarPrefactura, useCancelarPrefactura,
  useCreateFacturaDesdePrefactura 
} from '../../hooks/useApi';
import { formatDate, cn } from '../../lib/utils';

const ESTADOS = {
  BORRADOR: { label: 'Borrador', color: 'bg-slate-100 text-slate-700' },
  CONFIRMADA: { label: 'Confirmada', color: 'bg-blue-100 text-blue-700' },
  FACTURADA: { label: 'Facturada', color: 'bg-green-100 text-green-700' },
  CANCELADA: { label: 'Cancelada', color: 'bg-red-100 text-red-700' }
};

function PrefacturasPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    estado: '',
    page: 1,
    limit: 20
  });
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data, isLoading, refetch } = usePrefacturas(filters);
  const confirmar = useConfirmarPrefactura();
  const cancelar = useCancelarPrefactura();
  const facturar = useCreateFacturaDesdePrefactura();

  const prefacturas = data?.data?.prefacturas || [];
  const pagination = data?.data?.pagination || {};

  const handleConfirmar = async (id) => {
    if (!confirm('¿Confirmar esta prefactura?')) return;
    try {
      await confirmar.mutateAsync(id);
      refetch();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al confirmar');
    }
  };

  const handleCancelar = async (id) => {
    if (!confirm('¿Cancelar esta prefactura?')) return;
    try {
      await cancelar.mutateAsync(id);
      refetch();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al cancelar');
    }
  };

  const handleFacturar = async (id) => {
    if (!confirm('¿Generar factura desde esta prefactura?')) return;
    try {
      const result = await facturar.mutateAsync({ prefacturaId: id });
      navigate(`/facturas/${result.data.factura.id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Error al facturar');
    }
  };

  return (
    <Layout title="Prefacturas" subtitle="Gestión de prefacturas">
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número o cliente..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
          />
        </div>
        <select
          value={filters.estado}
          onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value, page: 1 }))}
          className="px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-visible">
        <CardContent className="p-0 overflow-visible">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Carpeta</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total</TableHead>
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
              ) : prefacturas.length === 0 ? (
                <TableEmpty colSpan={7} message="No hay prefacturas" />
              ) : (
                prefacturas.map((pre) => (
                  <TableRow key={pre.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-slate-800">{pre.numero}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-slate-700">{pre.cliente?.razonSocial || '—'}</p>
                      <p className="text-xs text-slate-500">{pre.cliente?.numeroDocumento}</p>
                    </TableCell>
                    <TableCell>
                      {pre.carpeta ? (
                        <span className="text-sm text-primary-600">{pre.carpeta.numero}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Calendar className="w-3 h-3" />
                        {formatDate(pre.fecha)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-medium text-slate-800">
                        {pre.moneda} {pre.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        ESTADOS[pre.estado]?.color || 'bg-slate-100'
                      )}>
                        {ESTADOS[pre.estado]?.label || pre.estado}
                      </span>
                    </TableCell>
                    <TableCell className="overflow-visible">
                      <div className="relative" ref={openMenu === pre.id ? menuRef : null}>
                        <button 
                          onClick={() => setOpenMenu(openMenu === pre.id ? null : pre.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        {openMenu === pre.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                            <button
                              onClick={() => { setOpenMenu(null); navigate(`/prefacturas/${pre.id}`); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              <Eye className="w-4 h-4" />
                              Ver detalle
                            </button>
                            {pre.estado === 'BORRADOR' && (
                              <button
                                onClick={() => { setOpenMenu(null); handleConfirmar(pre.id); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Confirmar
                              </button>
                            )}
                            {pre.estado === 'CONFIRMADA' && (
                              <button
                                onClick={() => { setOpenMenu(null); handleFacturar(pre.id); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                              >
                                <Receipt className="w-4 h-4" />
                                Generar Factura
                              </button>
                            )}
                            {(pre.estado === 'BORRADOR' || pre.estado === 'CONFIRMADA') && (
                              <>
                                <hr className="my-1" />
                                <button
                                  onClick={() => { setOpenMenu(null); handleCancelar(pre.id); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Cancelar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

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

export default PrefacturasPage;
