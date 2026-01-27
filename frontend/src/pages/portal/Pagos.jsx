import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CreditCard, DollarSign, FileText, Clock, CheckCircle, 
  AlertCircle, Building, Copy, ExternalLink, Info
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, Button, Badge } from '../../components/ui';
import { usePortalFacturas, usePortalMiCuenta } from '../../hooks/useApi';
import { formatDate, formatCurrency, cn } from '../../lib/utils';
import toast from 'react-hot-toast';

const MEDIOS_PAGO = [
  {
    id: 'transferencia',
    nombre: 'Transferencia Bancaria',
    icon: Building,
    descripcion: 'Transferí a nuestra cuenta bancaria',
    datos: [
      { label: 'Banco', value: 'Banco de la Nación Argentina' },
      { label: 'Tipo de cuenta', value: 'Cuenta Corriente' },
      { label: 'Número de cuenta', value: '123456789/0' },
      { label: 'CBU', value: '0110000000012345678901' },
      { label: 'Alias', value: 'EMPRESA.LOGISTICA.ARS' },
      { label: 'CUIT', value: '30-12345678-9' },
    ]
  },
  {
    id: 'cheque',
    nombre: 'Cheque',
    icon: FileText,
    descripcion: 'Envianos un cheque a nuestra oficina',
    datos: [
      { label: 'A nombre de', value: 'Empresa Logística S.A.' },
      { label: 'Dirección', value: 'Av. Leandro N. Alem 123, CABA' },
    ]
  },
  {
    id: 'efectivo',
    nombre: 'Efectivo',
    icon: DollarSign,
    descripcion: 'Pagá en efectivo en nuestra oficina',
    datos: [
      { label: 'Dirección', value: 'Av. Leandro N. Alem 123, CABA' },
      { label: 'Horario', value: 'Lunes a Viernes 9:00 a 18:00' },
    ]
  }
];

function CopyButton({ text }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado al portapapeles');
    } catch (err) {
      toast.error('Error al copiar');
    }
  };

  return (
    <button 
      onClick={handleCopy}
      className="p-1 hover:bg-gray-100 rounded transition-colors"
      title="Copiar"
    >
      <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
    </button>
  );
}

export default function Pagos() {
  const [selectedMedio, setSelectedMedio] = useState(null);
  
  const { data: facturasData, isLoading: loadingFacturas } = usePortalFacturas({ estado: 'PENDIENTE' });
  const { data: cuentaData } = usePortalMiCuenta();

  const facturasPendientes = facturasData?.data?.facturas?.filter(
    f => ['PENDIENTE', 'PAGADA_PARCIAL', 'VENCIDA'].includes(f.estado)
  ) || [];

  const totalPendiente = facturasPendientes.reduce(
    (sum, f) => sum + Number(f.total) - Number(f.totalCobrado || 0), 
    0
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-gray-500 mt-1">Consultá tus facturas pendientes y medios de pago</p>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Saldo Pendiente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(totalPendiente)}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Facturas Pendientes</p>
                <p className="text-2xl font-bold text-blue-600">
                  {facturasPendientes.length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <p className="text-lg font-bold text-green-600">
                  {totalPendiente === 0 ? 'Al día' : 'Con saldo'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Facturas pendientes */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Facturas Pendientes
            </h2>
            
            {loadingFacturas ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : facturasPendientes.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <p className="text-green-600 font-medium">No tenés facturas pendientes</p>
                <p className="text-gray-500 text-sm mt-1">Estás al día con tus pagos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {facturasPendientes.map(factura => {
                  const saldo = Number(factura.total) - Number(factura.totalCobrado || 0);
                  return (
                    <Link key={factura.id} to={`/mis-facturas/${factura.id}`}>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <div>
                          <p className="font-mono font-medium">{factura.numero}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(factura.fecha, 'short')}
                            {factura.fechaVencimiento && (
                              <span className={cn(
                                "ml-2",
                                new Date(factura.fechaVencimiento) < new Date() ? 'text-red-500' : ''
                              )}>
                                • Vence: {formatDate(factura.fechaVencimiento, 'short')}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {formatCurrency(saldo, factura.moneda)}
                          </p>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded",
                            factura.estado === 'VENCIDA' ? 'bg-red-100 text-red-700' :
                            factura.estado === 'PAGADA_PARCIAL' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          )}>
                            {factura.estado === 'VENCIDA' ? 'Vencida' :
                             factura.estado === 'PAGADA_PARCIAL' ? 'Pago parcial' :
                             'Pendiente'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Medios de pago */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Medios de Pago
            </h2>
            
            <div className="space-y-3">
              {MEDIOS_PAGO.map(medio => {
                const Icon = medio.icon;
                const isSelected = selectedMedio === medio.id;
                
                return (
                  <div key={medio.id}>
                    <button
                      onClick={() => setSelectedMedio(isSelected ? null : medio.id)}
                      className={cn(
                        "w-full p-4 rounded-lg border-2 text-left transition-all",
                        isSelected 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isSelected ? "bg-blue-100" : "bg-gray-100"
                        )}>
                          <Icon className={cn(
                            "w-5 h-5",
                            isSelected ? "text-blue-600" : "text-gray-600"
                          )} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{medio.nombre}</p>
                          <p className="text-sm text-gray-500">{medio.descripcion}</p>
                        </div>
                      </div>
                    </button>
                    
                    {isSelected && (
                      <div className="mt-2 p-4 bg-white border rounded-lg space-y-3">
                        {medio.datos.map((dato, i) => (
                          <div key={i} className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">{dato.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{dato.value}</span>
                              <CopyButton text={dato.value} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Nota importante */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Importante</p>
                  <p className="text-blue-700 mt-1">
                    Luego de realizar el pago, enviá el comprobante a tu contacto comercial 
                    o al email de administración para acreditar tu pago.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Historial de pagos */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Historial de Pagos
          </h2>
          <p className="text-gray-500 text-center py-8">
            El historial de pagos se mostrará aquí próximamente
          </p>
        </Card>
      </div>
    </Layout>
  );
}
