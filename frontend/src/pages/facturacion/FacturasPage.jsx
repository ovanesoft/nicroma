import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Receipt, MoreVertical, Eye, XCircle, DollarSign, Calendar
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, Button, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty,
  Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, Input
} from '../../components/ui';
import { useFacturas, useAnularFactura, useRegistrarCobranza } from '../../hooks/useApi';
import { formatDate, cn } from '../../lib/utils';

const ESTADOS = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  PAGADA_PARCIAL: { label: 'Pago Parcial', color: 'bg-blue-100 text-blue-700' },
  PAGADA: { label: 'Pagada', color: 'bg-green-100 text-green-700' },
  VENCIDA: { label: 'Vencida', color: 'bg-red-100 text-red-700' },
  ANULADA: { label: 'Anulada', color: 'bg-slate-100 text-slate-700' }
};

function FacturasPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    estado: '',
    page: 1,
    limit: 20
  });
  const [cobranzaModal, setCobranzaModal] = useState({ open: false, factura: null });
  const [cobranzaForm, setCobranzaForm] = useState({ monto: '', medioPago: 'Transferencia', referencia: '' });
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

  const { data, isLoading, refetch } = useFacturas(filters);
  const anular = useAnularFactura();
  const registrarCobranza = useRegistrarCobranza();

  const facturas = data?.data?.facturas || [];
  const pagination = data?.data?.pagination || {};

  const handleAnular = async (id) => {
    if (!confirm('¿Anular esta factura?')) return;
    try {
      await anular.mutateAsync(id);
      refetch();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al anular');
    }
  };

  const openCobranzaModal = (factura) => {
    setCobranzaForm({ monto: factura.total.toString(), medioPago: 'Transferencia', referencia: '' });
    setCobranzaModal({ open: true, factura });
  };

  const handleCobranza = async () => {
    try {
      await registrarCobranza.mutateAsync({
        facturaId: cobranzaModal.factura.id,
        ...cobranzaForm
      });
      setCobranzaModal({ open: false, factura: null });
      refetch();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al registrar cobranza');
    }
  };

  return (
    <Layout title="Facturas" subtitle="Gestión de facturas">
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
              ) : facturas.length === 0 ? (
                <TableEmpty colSpan={7} message="No hay facturas" />
              ) : (
                facturas.map((fac) => (
                  <TableRow key={fac.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-medium text-slate-800">{fac.tipoComprobante} {fac.numeroCompleto}</span>
                          <p className="text-xs text-slate-500">PV {fac.puntoVenta}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-slate-700">{fac.cliente?.razonSocial || '—'}</p>
                      <p className="text-xs text-slate-500">{fac.cliente?.numeroDocumento}</p>
                    </TableCell>
                    <TableCell>
                      {fac.carpeta ? (
                        <span className="text-sm text-primary-600">{fac.carpeta.numero}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Calendar className="w-3 h-3" />
                        {formatDate(fac.fecha)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-medium text-slate-800">
                        {fac.moneda} {fac.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        ESTADOS[fac.estado]?.color || 'bg-slate-100'
                      )}>
                        {ESTADOS[fac.estado]?.label || fac.estado}
                      </span>
                    </TableCell>
                    <TableCell className="overflow-visible">
                      <div className="relative" ref={openMenu === fac.id ? menuRef : null}>
                        <button 
                          onClick={() => setOpenMenu(openMenu === fac.id ? null : fac.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        {openMenu === fac.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                            <button
                              onClick={() => { setOpenMenu(null); navigate(`/facturas/${fac.id}`); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              <Eye className="w-4 h-4" />
                              Ver detalle
                            </button>
                            {(fac.estado === 'PENDIENTE' || fac.estado === 'PAGADA_PARCIAL') && (
                              <button
                                onClick={() => { setOpenMenu(null); openCobranzaModal(fac); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                              >
                                <DollarSign className="w-4 h-4" />
                                Registrar Cobranza
                              </button>
                            )}
                            {fac.estado === 'PENDIENTE' && (
                              <>
                                <hr className="my-1" />
                                <button
                                  onClick={() => { setOpenMenu(null); handleAnular(fac.id); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Anular
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

      {/* Modal Cobranza */}
      <Modal open={cobranzaModal.open} onClose={() => setCobranzaModal({ open: false, factura: null })}>
        <ModalHeader onClose={() => setCobranzaModal({ open: false, factura: null })}>
          <ModalTitle>Registrar Cobranza</ModalTitle>
        </ModalHeader>
        <ModalContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Factura: <strong>{cobranzaModal.factura?.tipoComprobante} {cobranzaModal.factura?.numeroCompleto}</strong>
          </p>
          <p className="text-sm text-slate-600">
            Total a cobrar: <strong>{cobranzaModal.factura?.moneda} {cobranzaModal.factura?.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
          </p>
          <Input
            label="Monto"
            type="number"
            step="0.01"
            value={cobranzaForm.monto}
            onChange={(e) => setCobranzaForm(prev => ({ ...prev, monto: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Medio de Pago</label>
            <select
              value={cobranzaForm.medioPago}
              onChange={(e) => setCobranzaForm(prev => ({ ...prev, medioPago: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
            >
              <option value="Transferencia">Transferencia</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Cheque">Cheque</option>
              <option value="Tarjeta">Tarjeta</option>
            </select>
          </div>
          <Input
            label="Referencia"
            placeholder="Nro. de transferencia, cheque, etc."
            value={cobranzaForm.referencia}
            onChange={(e) => setCobranzaForm(prev => ({ ...prev, referencia: e.target.value }))}
          />
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setCobranzaModal({ open: false, factura: null })}>
            Cancelar
          </Button>
          <Button onClick={handleCobranza} loading={registrarCobranza.isPending}>
            Registrar Cobranza
          </Button>
        </ModalFooter>
      </Modal>
    </Layout>
  );
}

export default FacturasPage;
