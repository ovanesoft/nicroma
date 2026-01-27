import { useParams, Link } from 'react-router-dom';
import { 
  Ship, Package, MapPin, Calendar, ArrowLeft, Anchor,
  Box, Scale, FileText, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, Button, Badge } from '../../components/ui';
import { usePortalEnvio } from '../../hooks/useApi';
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

export default function EnvioDetalle() {
  const { id } = useParams();
  const { data, isLoading, error } = usePortalEnvio(id);
  const envio = data?.data;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !envio) {
    return (
      <Layout>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Envío no encontrado</h2>
          <Link to="/mis-envios">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Mis Envíos
            </Button>
          </Link>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/mis-envios">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Envío {envio.numero}
              </h1>
              <span className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                estadoColors[envio.estado] || 'bg-gray-100 text-gray-700'
              )}>
                {estadoLabels[envio.estado] || envio.estado}
              </span>
            </div>
            <p className="text-gray-500 mt-1">
              {envio.tipo} • {envio.area} {envio.sector && `/ ${envio.sector}`}
            </p>
          </div>
        </div>

        {/* Info general */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ruta */}
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Ruta
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">ORIGEN</p>
                <p className="text-lg font-medium text-gray-900">{envio.origen || '-'}</p>
              </div>
              <div className="flex justify-center">
                <Ship className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">DESTINO</p>
                <p className="text-lg font-medium text-gray-900">{envio.destino || '-'}</p>
              </div>
            </div>
          </Card>

          {/* Fechas */}
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fechas
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">ETD</p>
                <p className="font-medium">{envio.etd ? formatDate(envio.etd) : '-'}</p>
                {envio.atd && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3" />
                    Real: {formatDate(envio.atd)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">ETA</p>
                <p className="font-medium">{envio.eta ? formatDate(envio.eta) : '-'}</p>
                {envio.ata && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3" />
                    Real: {formatDate(envio.ata)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Transporte */}
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
              <Anchor className="w-4 h-4" />
              Transporte
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">BUQUE / VIAJE</p>
                <p className="font-medium">
                  {envio.buque || '-'} {envio.viaje && `/ ${envio.viaje}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">NAVIERA</p>
                <p className="font-medium">{envio.naviera || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">INCOTERM</p>
                <p className="font-medium">{envio.incoterm || '-'}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* BL y Referencia */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documentación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-500">BL (MASTER)</p>
              <p className="font-mono font-medium text-lg">{envio.bl || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">HBL (HOUSE)</p>
              <p className="font-mono font-medium text-lg">{envio.hbl || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">REFERENCIA CLIENTE</p>
              <p className="font-medium">{envio.referencia || '-'}</p>
            </div>
          </div>
        </Card>

        {/* Contenedores */}
        {envio.contenedores?.length > 0 && (
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
              <Box className="w-4 h-4" />
              Contenedores ({envio.contenedores.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500">
                    <th className="pb-3 font-medium">NÚMERO</th>
                    <th className="pb-3 font-medium">TIPO</th>
                    <th className="pb-3 font-medium">ESTADO</th>
                    <th className="pb-3 font-medium">SELLO</th>
                    <th className="pb-3 font-medium text-right">PESO</th>
                    <th className="pb-3 font-medium text-right">TARA</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {envio.contenedores.map((c, i) => (
                    <tr key={i} className="text-sm">
                      <td className="py-3 font-mono font-medium">{c.numero}</td>
                      <td className="py-3">{c.tipo}</td>
                      <td className="py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {c.estado || 'Pendiente'}
                        </span>
                      </td>
                      <td className="py-3">{c.sello || '-'}</td>
                      <td className="py-3 text-right">{c.pesoKg ? `${c.pesoKg.toLocaleString()} kg` : '-'}</td>
                      <td className="py-3 text-right">{c.tara ? `${c.tara.toLocaleString()} kg` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Mercancías */}
        {envio.mercancias?.length > 0 && (
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Mercancías
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500">
                    <th className="pb-3 font-medium">DESCRIPCIÓN</th>
                    <th className="pb-3 font-medium text-right">BULTOS</th>
                    <th className="pb-3 font-medium text-right">PESO</th>
                    <th className="pb-3 font-medium text-right">VOLUMEN</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {envio.mercancias.map((m, i) => (
                    <tr key={i} className="text-sm">
                      <td className="py-3">{m.descripcion}</td>
                      <td className="py-3 text-right">{m.bultos || '-'}</td>
                      <td className="py-3 text-right">{m.peso ? `${m.peso.toLocaleString()} kg` : '-'}</td>
                      <td className="py-3 text-right">{m.volumen ? `${m.volumen} m³` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Observaciones */}
        {envio.observaciones && (
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Observaciones</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{envio.observaciones}</p>
          </Card>
        )}

        {/* Timestamps */}
        <div className="text-center text-xs text-gray-400">
          <p>
            Creado: {formatDate(envio.createdAt)} • 
            Actualizado: {formatDate(envio.updatedAt)}
          </p>
        </div>
      </div>
    </Layout>
  );
}
