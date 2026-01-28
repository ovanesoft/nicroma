import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Send, Ship, MapPin, Package, ArrowLeft } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSolicitarPresupuesto } from '../../hooks/useApi';
import { AREAS, SECTORES, TIPOS_OPERACION } from '../../lib/constants';
import toast from 'react-hot-toast';

function SolicitarPresupuesto() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const solicitar = useSolicitarPresupuesto();

  const [formData, setFormData] = useState({
    nombre: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    email: user?.email || '',
    telefono: '',
    empresa: '',
    descripcion: '',
    area: 'Marítimo',
    sector: 'Importación',
    tipoOperacion: '',
    puertoOrigen: '',
    puertoDestino: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.descripcion.trim()) {
      toast.error('Por favor describe tu pedido');
      return;
    }

    try {
      // Obtener el portalSlug del tenant del usuario
      const portalSlug = user?.tenantSlug || localStorage.getItem('portalSlug');
      
      if (!portalSlug) {
        toast.error('No se pudo identificar tu empresa');
        return;
      }

      await solicitar.mutateAsync({
        portalSlug,
        data: formData
      });

      toast.success('Solicitud enviada correctamente');
      navigate('/mis-presupuestos');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al enviar solicitud');
    }
  };

  return (
    <Layout 
      title="Solicitar Presupuesto" 
      subtitle="Contanos qué necesitás y te enviamos una cotización"
    >
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Información de contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre completo"
                  value={formData.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
                <Input
                  label="Empresa"
                  value={formData.empresa}
                  onChange={(e) => handleChange('empresa', e.target.value)}
                  placeholder="Nombre de tu empresa"
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@ejemplo.com"
                  required
                />
                <Input
                  label="Teléfono"
                  value={formData.telefono}
                  onChange={(e) => handleChange('telefono', e.target.value)}
                  placeholder="+54 11 1234-5678"
                />
              </CardContent>
            </Card>

            {/* Descripción del pedido */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  ¿Qué necesitás?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  placeholder="Contanos sobre tu carga: qué tipo de mercadería es, cantidad aproximada, de dónde viene, a dónde va, fechas estimadas, y cualquier otro detalle que nos ayude a cotizarte mejor..."
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
                  required
                />
              </CardContent>
            </Card>

            {/* Detalles opcionales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ship className="w-5 h-5" />
                  Detalles de la Operación (opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tipo de transporte
                  </label>
                  <select
                    value={formData.area}
                    onChange={(e) => handleChange('area', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Operación
                  </label>
                  <select
                    value={formData.sector}
                    onChange={(e) => handleChange('sector', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tipo de carga
                  </label>
                  <select
                    value={formData.tipoOperacion}
                    onChange={(e) => handleChange('tipoOperacion', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">No sé / A definir</option>
                    {TIPOS_OPERACION.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-9 w-4 h-4 text-slate-400" />
                    <Input
                      label="Origen"
                      value={formData.puertoOrigen}
                      onChange={(e) => handleChange('puertoOrigen', e.target.value)}
                      placeholder="Ciudad o puerto de origen"
                      className="pl-10"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-9 w-4 h-4 text-slate-400" />
                    <Input
                      label="Destino"
                      value={formData.puertoDestino}
                      onChange={(e) => handleChange('puertoDestino', e.target.value)}
                      placeholder="Ciudad o puerto de destino"
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end">
              <Button type="submit" size="lg" loading={solicitar.isPending}>
                <Send className="w-4 h-4" />
                Enviar Solicitud
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default SolicitarPresupuesto;
