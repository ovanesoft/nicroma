import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Ship, Package, MapPin, Calendar, ChevronRight, 
  Search, Filter, Anchor, ArrowRight, Eye, RefreshCw
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, Button, Input, Badge } from '../../components/ui';
import { usePortalEnvios } from '../../hooks/useApi';
import { formatDate, cn } from '../../lib/utils';

const estadoColors = {
  'BORRADOR': 'bg-gray-100 text-gray-700',
  'CONFIRMADA': 'bg-blue-100 text-blue-700',
  'EN_TRANSITO': 'bg-yellow-100 text-yellow-700',
  'EN_PUERTO': 'bg-purple-100 text-purple-700',
  'DESPACHADA': 'bg-green-100 text-green-700',
  'ENTREGADA': 'bg-green-100 text-green-700',
  'CERRADA': 'bg-gray-100 text-gray-700',
  'CANCELADA': 'bg-red-100 text-red-700'
};

const estadoLabels = {
  'BORRADOR': 'Borrador',
  'CONFIRMADA': 'Confirmada',
  'EN_TRANSITO': 'En Tránsito',
  'EN_PUERTO': 'En Puerto',
  'DESPACHADA': 'Despachada',
  'ENTREGADA': 'Entregada',
  'CERRADA': 'Cerrada',
  'CANCELADA': 'Cancelada'
};

export default function MisEnvios() {
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, refetch } = usePortalEnvios({ page, limit: 10, estado: estado || undefined });

  const envios = data?.data?.envios || [];
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 };

  const filteredEnvios = envios.filter(e => 
    !searchTerm || 
    e.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.bl?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.buque?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Envíos</h1>
            <p className="text-gray-500 mt-1">Seguí el estado de todos tus embarques</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, BL, buque..."
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
              <option value="EN_TRANSITO">En Tránsito</option>
              <option value="EN_PUERTO">En Puerto</option>
              <option value="DESPACHADA">Despachada</option>
              <option value="ENTREGADA">Entregada</option>
              <option value="CERRADA">Cerrada</option>
            </select>
          </div>
        </Card>

        {/* Lista de envíos */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredEnvios.length === 0 ? (
          <Card className="p-12 text-center">
            <Ship className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay envíos</h3>
            <p className="text-gray-500">
              {searchTerm || estado 
                ? 'No se encontraron envíos con los filtros seleccionados'
                : 'Aún no tenés envíos registrados'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEnvios.map((envio) => (
              <Card key={envio.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Info principal */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono font-bold text-lg text-blue-600">
                        {envio.numero}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        estadoColors[envio.estado] || 'bg-gray-100 text-gray-700'
                      )}>
                        {estadoLabels[envio.estado] || envio.estado}
                      </span>
                    </div>

                    {/* Ruta */}
                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                      <MapPin className="w-4 h-4" />
                      <span>{envio.origen || 'Origen'}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span>{envio.destino || 'Destino'}</span>
                    </div>

                    {/* Detalles */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {envio.buque && (
                        <span className="flex items-center gap-1">
                          <Anchor className="w-4 h-4" />
                          {envio.buque} {envio.viaje && `/ ${envio.viaje}`}
                        </span>
                      )}
                      {envio.bl && (
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          BL: {envio.bl}
                        </span>
                      )}
                      {envio.contenedores?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Ship className="w-4 h-4" />
                          {envio.contenedores.length} contenedor{envio.contenedores.length > 1 ? 'es' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fechas */}
                  <div className="flex items-center gap-6 lg:border-l lg:pl-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">ETD</p>
                      <p className="font-medium text-gray-900">
                        {envio.etd ? formatDate(envio.etd, 'short') : '-'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">ETA</p>
                      <p className="font-medium text-gray-900">
                        {envio.eta ? formatDate(envio.eta, 'short') : '-'}
                      </p>
                    </div>
                    <Link to={`/mis-envios/${envio.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Ver detalle
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Contenedores */}
                {envio.contenedores?.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500 mb-2">Contenedores:</p>
                    <div className="flex flex-wrap gap-2">
                      {envio.contenedores.slice(0, 5).map((c, i) => (
                        <span 
                          key={i} 
                          className="px-2 py-1 bg-gray-100 rounded text-xs font-mono"
                        >
                          {c.numero}
                        </span>
                      ))}
                      {envio.contenedores.length > 5 && (
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          +{envio.contenedores.length - 5} más
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
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
