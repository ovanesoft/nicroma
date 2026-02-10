import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Send, Ship, ArrowLeft, Package, MapPin } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSolicitarPredespacho } from '../../hooks/useApi';
import { DESTINACIONES, VIAS } from '../../lib/constants';
import toast from 'react-hot-toast';

function SolicitarPredespacho() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const solicitar = useSolicitarPredespacho();

  const [formData, setFormData] = useState({
    nombre: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    email: user?.email || '',
    telefono: '',
    empresa: '',
    descripcion: '',
    mercaderia: '',
    destinacion: '',
    via: 'MARITIMO',
    origenDestino: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.descripcion.trim() && !formData.mercaderia.trim()) {
      toast.error('Por favor completá al menos la mercadería o descripción');
      return;
    }

    try {
      const portalSlug = user?.tenantSlug || localStorage.getItem('portalSlug');
      if (!portalSlug) {
        toast.error('No se pudo identificar tu empresa');
        return;
      }

      await solicitar.mutateAsync({ portalSlug, data: formData });
      toast.success('Solicitud de predespacho enviada');
      navigate('/mis-predespachos');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al enviar solicitud');
    }
  };

  return (
    <Layout 
      title="Solicitar Predespacho" 
      subtitle="Pedí un nuevo pedido de fondos o presupuesto de operación"
    >
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5" /> Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nombre completo" value={formData.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)} placeholder="Tu nombre" required />
                <Input label="Empresa" value={formData.empresa}
                  onChange={(e) => handleChange('empresa', e.target.value)} placeholder="Nombre de tu empresa" />
                <Input label="Email" type="email" value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)} placeholder="email@ejemplo.com" required />
                <Input label="Teléfono" value={formData.telefono}
                  onChange={(e) => handleChange('telefono', e.target.value)} placeholder="+54 11 1234-5678" />
              </CardContent>
            </Card>

            {/* Mercadería */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" /> Mercadería
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input label="Descripción de la mercadería" value={formData.mercaderia}
                  onChange={(e) => handleChange('mercaderia', e.target.value)}
                  placeholder="Ej: Smart Watch, Textiles, Repuestos..." />
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  placeholder="Detallá lo que necesitás: tipo de mercadería, cantidad, facturas proforma, datos del proveedor, o cualquier información adicional..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
                />
              </CardContent>
            </Card>

            {/* Detalles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ship className="w-5 h-5" /> Detalles de la Operación (opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vía</label>
                  <select value={formData.via} onChange={(e) => handleChange('via', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                    {VIAS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Destinación</label>
                  <select value={formData.destinacion} onChange={(e) => handleChange('destinacion', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                    <option value="">Seleccionar...</option>
                    {DESTINACIONES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-9 w-4 h-4 text-slate-400" />
                  <Input label="Origen / Destino" value={formData.origenDestino}
                    onChange={(e) => handleChange('origenDestino', e.target.value)}
                    placeholder="País o ciudad" className="pl-10" />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" size="lg" loading={solicitar.isPending}>
                <Send className="w-4 h-4" /> Enviar Solicitud
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default SolicitarPredespacho;
