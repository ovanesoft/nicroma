import { useState, useEffect, useRef } from 'react';
import { 
  Building2, Upload, Trash2, Save, Globe, Mail, Phone, MapPin, 
  Link2, Copy, Check, ExternalLink, Palette, Image, Settings
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { 
  Card, CardContent, CardHeader, CardTitle, 
  Button, Input, Label, Badge 
} from '../../components/ui';
import { 
  useCompanyConfig, useUpdateCompanyConfig, useUploadCompanyLogo, 
  useDeleteCompanyLogo, useEnablePortal 
} from '../../hooks/useApi';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#0ea5e9', // sky
];

function CompanySettingsPage() {
  const { data: configData, isLoading, refetch } = useCompanyConfig();
  const updateConfig = useUpdateCompanyConfig();
  const uploadLogo = useUploadCompanyLogo();
  const deleteLogo = useDeleteCompanyLogo();
  const enablePortal = useEnablePortal();

  const fileInputRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // Estado del formulario
  const [form, setForm] = useState({
    name: '',
    domain: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    companyCity: '',
    companyCountry: '',
    companyWebsite: '',
    portalEnabled: false,
    portalSlug: '',
    portalWelcomeMessage: '',
    portalPrimaryColor: '#3b82f6'
  });

  const config = configData?.data;

  // Cargar datos cuando llegan
  useEffect(() => {
    if (config) {
      setForm({
        name: config.company?.name || '',
        domain: config.company?.domain || '',
        companyEmail: config.company?.email || '',
        companyPhone: config.company?.phone || '',
        companyAddress: config.company?.address || '',
        companyCity: config.company?.city || '',
        companyCountry: config.company?.country || '',
        companyWebsite: config.company?.website || '',
        portalEnabled: config.portal?.enabled || false,
        portalSlug: config.portal?.slug || '',
        portalWelcomeMessage: config.portal?.welcomeMessage || '',
        portalPrimaryColor: config.portal?.primaryColor || '#3b82f6'
      });
    }
  }, [config]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre de la empresa es requerido');
      return;
    }

    try {
      console.log('Guardando configuración:', form);
      const result = await updateConfig.mutateAsync(form);
      console.log('Resultado:', result);
      toast.success('Configuración guardada');
      // Forzar refetch para asegurar que los datos se actualicen
      await refetch();
    } catch (error) {
      console.error('Error guardando:', error);
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato no soportado. Usá PNG, JPG, GIF, WebP o SVG.');
      return;
    }

    // Validar tamaño (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await uploadLogo.mutateAsync(event.target.result);
        toast.success('Logo actualizado');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error al subir logo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteLogo = async () => {
    if (!confirm('¿Eliminar el logo de la empresa?')) return;
    
    try {
      await deleteLogo.mutateAsync();
      toast.success('Logo eliminado');
    } catch (error) {
      toast.error('Error al eliminar logo');
    }
  };

  const handleEnablePortal = async () => {
    try {
      const result = await enablePortal.mutateAsync();
      toast.success('Portal habilitado');
      setForm(prev => ({
        ...prev,
        portalEnabled: true,
        portalSlug: result.data.portalSlug
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al habilitar portal');
    }
  };

  const copyPortalLink = async () => {
    if (!config?.portal?.url) return;
    
    try {
      await navigator.clipboard.writeText(config.portal.url);
      setCopied(true);
      toast.success('Link copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Error al copiar');
    }
  };

  if (isLoading) {
    return (
      <Layout title="Configuración de Empresa">
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-slate-100 rounded-lg" />
          <div className="h-64 bg-slate-100 rounded-lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Configuración de Empresa" subtitle="Personalizá tu organización">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Logo y nombre */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Logo de la Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {/* Preview del logo */}
              <div className="flex-shrink-0">
                {config?.company?.logoUrl ? (
                  <div className="relative group">
                    <img 
                      src={config.company.logoUrl} 
                      alt="Logo" 
                      className="w-32 h-32 object-contain border rounded-xl bg-white p-2"
                    />
                    <button
                      onClick={handleDeleteLogo}
                      disabled={deleteLogo.isPending}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-slate-300" />
                  </div>
                )}
              </div>

              {/* Upload */}
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-3">
                  Subí el logo de tu empresa. Este logo aparecerá en el sidebar y en el portal de clientes.
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Formatos: PNG, JPG, GIF, WebP, SVG. Máximo 2MB. Recomendado: 200x200px o mayor.
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLogo.isPending}
                >
                  <Upload className="w-4 h-4" />
                  {uploadLogo.isPending ? 'Subiendo...' : 'Subir Logo'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de la empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Información de la Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label required>Nombre de la Empresa</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Mi Empresa S.A."
                />
              </div>
              <div>
                <Label>Dominio</Label>
                <Input
                  value={form.domain}
                  onChange={(e) => setForm(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="miempresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email de contacto</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={form.companyEmail}
                    onChange={(e) => setForm(prev => ({ ...prev, companyEmail: e.target.value }))}
                    placeholder="info@miempresa.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={form.companyPhone}
                    onChange={(e) => setForm(prev => ({ ...prev, companyPhone: e.target.value }))}
                    placeholder="+54 11 1234-5678"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Dirección</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  value={form.companyAddress}
                  onChange={(e) => setForm(prev => ({ ...prev, companyAddress: e.target.value }))}
                  placeholder="Av. Ejemplo 1234, Piso 5"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Ciudad</Label>
                <Input
                  value={form.companyCity}
                  onChange={(e) => setForm(prev => ({ ...prev, companyCity: e.target.value }))}
                  placeholder="Buenos Aires"
                />
              </div>
              <div>
                <Label>País</Label>
                <Input
                  value={form.companyCountry}
                  onChange={(e) => setForm(prev => ({ ...prev, companyCountry: e.target.value }))}
                  placeholder="Argentina"
                />
              </div>
            </div>

            <div>
              <Label>Sitio Web</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={form.companyWebsite}
                  onChange={(e) => setForm(prev => ({ ...prev, companyWebsite: e.target.value }))}
                  placeholder="https://www.miempresa.com"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portal de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Portal de Clientes
              {config?.portal?.enabled && (
                <Badge variant="success" className="ml-2">Activo</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Habilitá un portal web personalizado donde tus clientes podrán registrarse, 
              hacer seguimiento de sus envíos, ver facturas, y más. Copiá el link y 
              agregalo a tu página web o envialo directamente a tus clientes.
            </p>

            {!config?.portal?.enabled ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <Link2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 mb-4">
                  El portal de clientes no está habilitado aún.
                </p>
                <Button onClick={handleEnablePortal} disabled={enablePortal.isPending}>
                  {enablePortal.isPending ? 'Habilitando...' : 'Habilitar Portal'}
                </Button>
              </div>
            ) : (
              <>
                {/* Link del portal */}
                <div>
                  <Label>Link del Portal</Label>
                  <div className="flex gap-2">
                    <Input
                      value={config.portal.url || ''}
                      readOnly
                      className="bg-slate-50 font-mono text-sm"
                    />
                    <Button variant="outline" onClick={copyPortalLink}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    {config.portal.url && (
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(config.portal.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mensaje de bienvenida */}
                <div>
                  <Label>Mensaje de Bienvenida</Label>
                  <textarea
                    value={form.portalWelcomeMessage}
                    onChange={(e) => setForm(prev => ({ ...prev, portalWelcomeMessage: e.target.value }))}
                    placeholder="Bienvenido al portal de clientes de nuestra empresa. Aquí podrás hacer seguimiento de tus envíos, ver tus facturas y mucho más."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Color primario */}
                <div>
                  <Label>Color Principal del Portal</Label>
                  <div className="flex items-center gap-3 mt-2">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setForm(prev => ({ ...prev, portalPrimaryColor: color }))}
                        className={cn(
                          'w-8 h-8 rounded-full transition-transform hover:scale-110',
                          form.portalPrimaryColor === color && 'ring-2 ring-offset-2 ring-slate-400'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <div className="flex items-center gap-2 ml-4">
                      <Palette className="w-4 h-4 text-slate-400" />
                      <input
                        type="color"
                        value={form.portalPrimaryColor}
                        onChange={(e) => setForm(prev => ({ ...prev, portalPrimaryColor: e.target.value }))}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Funcionalidades del portal */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                  <p className="font-medium text-blue-800 mb-2">
                    ¿Qué pueden hacer tus clientes en el portal?
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Registrarse con el branding de tu empresa</li>
                    <li>• Ver el estado de sus envíos en tiempo real</li>
                    <li>• Acceder a sus facturas y prefacturas</li>
                    <li>• Ver reportes de sus operaciones</li>
                    <li>• Tracking de contenedores con navieras</li>
                    <li>• Realizar pagos online (próximamente)</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Botón guardar */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={updateConfig.isPending}
            size="lg"
          >
            {updateConfig.isPending ? (
              'Guardando...'
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default CompanySettingsPage;
