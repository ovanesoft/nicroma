import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, DollarSign, Calendar, ChevronRight, 
  Search, Filter, Download, Eye, RefreshCw, CheckCircle,
  Clock, AlertCircle
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, Button, Input, Badge } from '../../components/ui';
import { usePortalFacturas } from '../../hooks/useApi';
import { formatDate, formatCurrency, cn } from '../../lib/utils';

const estadoColors = {
  'PENDIENTE': 'bg-yellow-100 text-yellow-700',
  'PAGADA': 'bg-green-100 text-green-700',
  'PAGADA_PARCIAL': 'bg-blue-100 text-blue-700',
  'VENCIDA': 'bg-red-100 text-red-700',
  'ANULADA': 'bg-gray-100 text-gray-700'
};

const estadoLabels = {
  'PENDIENTE': 'Pendiente',
  'PAGADA': 'Pagada',
  'PAGADA_PARCIAL': 'Pago Parcial',
  'VENCIDA': 'Vencida',
  'ANULADA': 'Anulada'
};

const estadoIcons = {
  'PENDIENTE': Clock,
  'PAGADA': CheckCircle,
  'PAGADA_PARCIAL': DollarSign,
  'VENCIDA': AlertCircle,
  'ANULADA': FileText
};

export default function MisFacturas() {
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, refetch } = usePortalFacturas({ page, limit: 10, estado: estado || undefined });

  const facturas = data?.data?.facturas || [];
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 };

  const filteredFacturas = facturas.filter(f => 
    !searchTerm || 
    f.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.carpeta?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular totales
  const totalPendiente = facturas
    .filter(f => ['PENDIENTE', 'PAGADA_PARCIAL', 'VENCIDA'].includes(f.estado))
    .reduce((sum, f) => sum + Number(f.total) - Number(f.totalCobrado || 0), 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Facturas</h1>
            <p className="text-gray-500 mt-1">Consultá todas tus facturas y comprobantes</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Resumen */}
        {totalPendiente > 0 && (
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-yellow-700">Saldo pendiente</p>
                  <p className="text-xl font-bold text-yellow-800">
                    {formatCurrency(totalPendiente)}
                  </p>
                </div>
              </div>
              <Link to="/pagos">
                <Button variant="outline" size="sm" className="bg-white">
                  Ver pagos
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, carpeta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={estado}
              onChange={(e) => { setEstado(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PAGADA_PARCIAL">Pago Parcial</option>
              <option value="VENCIDA">Vencida</option>
              <option value="PAGADA">Pagada</option>
              <option value="ANULADA">Anulada</option>
            </select>
          </div>
        </Card>

        {/* Lista de facturas */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredFacturas.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay facturas</h3>
            <p className="text-gray-500">
              {searchTerm || estado 
                ? 'No se encontraron facturas con los filtros seleccionados'
                : 'Aún no tenés facturas registradas'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFacturas.map((factura) => {
              const StatusIcon = estadoIcons[factura.estado] || FileText;
              const saldoPendiente = Number(factura.total) - Number(factura.totalCobrado || 0);
              
              return (
                <Card key={factura.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Info principal */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-bold text-lg text-gray-900">
                          {factura.numero}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1",
                          estadoColors[factura.estado] || 'bg-gray-100 text-gray-700'
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {estadoLabels[factura.estado] || factura.estado}
                        </span>
                        {factura.cae && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                            CAE
                          </span>
                        )}
                      </div>

                      {/* Detalles */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(factura.fecha, 'short')}
                        </span>
                        {factura.fechaVencimiento && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Vence: {formatDate(factura.fechaVencimiento, 'short')}
                          </span>
                        )}
                        {factura.carpeta && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            Carpeta: {factura.carpeta}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Montos */}
                    <div className="flex items-center gap-6 lg:border-l lg:pl-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase mb-1">Total</p>
                        <p className="font-bold text-xl text-gray-900">
                          {formatCurrency(factura.total, factura.moneda)}
                        </p>
                      </div>
                      
                      {['PENDIENTE', 'PAGADA_PARCIAL', 'VENCIDA'].includes(factura.estado) && saldoPendiente > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase mb-1">Saldo</p>
                          <p className="font-bold text-lg text-yellow-600">
                            {formatCurrency(saldoPendiente, factura.moneda)}
                          </p>
                        </div>
                      )}
                      
                      <Link to={`/mis-facturas/${factura.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Página {page} de {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
