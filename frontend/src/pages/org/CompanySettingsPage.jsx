import { useState, useEffect, useRef } from 'react';
import { 
  Building2, Upload, Trash2, Save, Globe, Mail, Phone, MapPin, 
  Link2, Copy, Check, ExternalLink, Palette, Image, Settings,
  CreditCard, Landmark, Wallet, FileText, DollarSign, Plus, Star
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
import { CONDICIONES_FISCALES } from '../../lib/constants';
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
    // Datos fiscales de la empresa
    companyCuit: '',
    companyIngresosBrutos: '',
    companyInicioActividad: '',
    companyCondicionFiscal: '',
    portalEnabled: false,
    portalSlug: '',
    portalWelcomeMessage: '',
    portalPrimaryColor: '#3b82f6',
    // Medios de pago (legacy - mantener para compatibilidad)
    paymentBankName: '',
    paymentBankAccount: '',
    paymentBankCbu: '',
    paymentBankAlias: '',
    paymentBankCuit: '',
    paymentBankHolder: '',
    paymentMercadoPago: '',
    paymentPaypal: '',
    paymentChequeOrder: '',
    paymentOtherMethods: '',
    paymentNotes: '',
    // Numeración configurable
    numeracionPresupuestoFormato: 'PRES-{YEAR}-{NNNNN}',
    numeracionPresupuestoSiguiente: '',
    numeracionCarpetaFormato: '{YEAR}-{AREA}{SECTOR1}-{NNNNNN}',
    numeracionCarpetaSiguiente: '',
  });
  
  // Múltiples cuentas bancarias
  const [cuentasBancarias, setCuentasBancarias] = useState([]);
  
  const MONEDAS = ['ARS', 'USD', 'EUR'];

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
        companyCuit: config.company?.cuit || '',
        companyIngresosBrutos: config.company?.ingresosBrutos || '',
        companyInicioActividad: config.company?.inicioActividad ? String(config.company.inicioActividad).slice(0, 10) : '',
        companyCondicionFiscal: config.company?.condicionFiscal || '',
        portalEnabled: config.portal?.enabled || false,
        portalSlug: config.portal?.slug || '',
        portalWelcomeMessage: config.portal?.welcomeMessage || '',
        portalPrimaryColor: config.portal?.primaryColor || '#3b82f6',
        // Medios de pago (legacy)
        paymentBankName: config.paymentMethods?.bankName || '',
        paymentBankAccount: config.paymentMethods?.bankAccount || '',
        paymentBankCbu: config.paymentMethods?.bankCbu || '',
        paymentBankAlias: config.paymentMethods?.bankAlias || '',
        paymentBankCuit: config.paymentMethods?.bankCuit || '',
        paymentBankHolder: config.paymentMethods?.bankHolder || '',
        paymentMercadoPago: config.paymentMethods?.mercadoPago || '',
        paymentPaypal: config.paymentMethods?.paypal || '',
        paymentChequeOrder: config.paymentMethods?.chequeOrder || '',
        paymentOtherMethods: config.paymentMethods?.otherMethods || '',
        paymentNotes: config.paymentMethods?.notes || '',
        numeracionPresupuestoFormato: config.numeracion?.presupuestoFormato || 'PRES-{YEAR}-{NNNNN}',
        numeracionPresupuestoSiguiente: config.numeracion?.presupuestoSiguiente ?? '',
        numeracionCarpetaFormato: config.numeracion?.carpetaFormato || '{YEAR}-{AREA}{SECTOR1}-{NNNNNN}',
        numeracionCarpetaSiguiente: config.numeracion?.carpetaSiguiente ?? '',
      });
      // Cargar cuentas bancarias
      setCuentasBancarias(config.cuentasBancarias || []);
    }
  }, [config]);

  // Genera un preview del próximo número según el template (cliente-only para UX)
  const previewNumeracion = (template, area = 'Marítimo', sector = 'Importación', seq = 1) => {
    if (!template) return '';
    const fecha = new Date();
    const year = fecha.getFullYear();
    const yy = String(year).slice(-2);
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const areaStr = (area || '').toUpperCase().replace(/[^A-Z]/g, '');
    const sectorStr = (sector || '').toUpperCase().replace(/[^A-Z]/g, '');
    const sector1 = (sectorStr.startsWith('EXP')) ? 'E' : 'I';
    return template
      .replace(/\{YEAR\}/g, String(year))
      .replace(/\{YY\}/g, yy)
      .replace(/\{MONTH\}/g, month)
      .replace(/\{AREA\}/g, areaStr.substring(0, 2))
      .replace(/\{AREA1\}/g, areaStr.substring(0, 1))
      .replace(/\{SECTOR\}/g, sectorStr.substring(0, 3))
      .replace(/\{SECTOR1\}/g, sector1)
      .replace(/\{(N+)\}/g, (_, ns) => String(seq).padStart(ns.length, '0'));
  };

  // Valida CUIT: formato XX-XXXXXXXX-X y dígito verificador (módulo 11, estándar AFIP)
  const validarCuit = (cuitRaw) => {
    const soloNum = (cuitRaw || '').replace(/[^0-9]/g, '');
    if (soloNum.length !== 11) return false;
    const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const suma = mult.reduce((acc, m, i) => acc + m * parseInt(soloNum[i], 10), 0);
    let verificador = 11 - (suma % 11);
    if (verificador === 11) verificador = 0;
    if (verificador === 10) verificador = 9;
    return verificador === parseInt(soloNum[10], 10);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre de la empresa es requerido');
      return;
    }

    // Validación CUIT (opcional pero si se carga debe ser válido)
    if (form.companyCuit && form.companyCuit.trim()) {
      if (!validarCuit(form.companyCuit)) {
        toast.error('El CUIT no es válido. Formato XX-XXXXXXXX-X con dígito verificador correcto');
        return;
      }
    }

    // Validación Inicio de Actividad: fecha válida y no futura
    if (form.companyInicioActividad) {
      const fecha = new Date(form.companyInicioActividad + 'T00:00:00');
      if (isNaN(fecha.getTime())) {
        toast.error('La fecha de Inicio de Actividad no es válida');
        return;
      }
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      if (fecha > hoy) {
        toast.error('El Inicio de Actividad no puede ser una fecha futura');
        return;
      }
    }

    try {
      const payload = {
        ...form,
        cuentasBancarias
      };
      console.log('Guardando configuración:', payload);
      const result = await updateConfig.mutateAsync(payload);
      console.log('Resultado:', result);
      toast.success('Configuración guardada');
      // Forzar refetch para asegurar que los datos se actualicen
      await refetch();
    } catch (error) {
      console.error('Error guardando:', error);
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };
  
  // Funciones para manejar cuentas bancarias
  const addCuentaBancaria = () => {
    setCuentasBancarias([
      ...cuentasBancarias,
      {
        id: Date.now().toString(),
        banco: '',
        cuenta: '',
        cbu: '',
        alias: '',
        titular: '',
        cuit: '',
        moneda: 'ARS',
        esPrincipal: cuentasBancarias.length === 0
      }
    ]);
  };
  
  const updateCuentaBancaria = (id, field, value) => {
    setCuentasBancarias(cuentasBancarias.map(cuenta => 
      cuenta.id === id ? { ...cuenta, [field]: value } : cuenta
    ));
  };
  
  const removeCuentaBancaria = (id) => {
    const updated = cuentasBancarias.filter(c => c.id !== id);
    // Si eliminamos la principal, hacer la primera como principal
    if (updated.length > 0 && !updated.some(c => c.esPrincipal)) {
      updated[0].esPrincipal = true;
    }
    setCuentasBancarias(updated);
  };
  
  const setAsMainAccount = (id) => {
    setCuentasBancarias(cuentasBancarias.map(cuenta => ({
      ...cuenta,
      esPrincipal: cuenta.id === id
    })));
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

            {/* Datos fiscales (se imprimen en facturas, notas y recibos) */}
            <div className="pt-4 mt-2 border-t border-slate-200">
              <p className="text-sm font-semibold text-slate-700 mb-1">Datos Fiscales</p>
              <p className="text-xs text-slate-500 mb-3">
                Estos datos se imprimen automáticamente en Facturas, Notas de Crédito, Notas de Débito y Recibos.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>CUIT</Label>
                  <Input
                    value={form.companyCuit}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                      let formatted = digits;
                      if (digits.length > 2) formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`;
                      if (digits.length > 10) formatted = `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
                      setForm(prev => ({ ...prev, companyCuit: formatted }));
                    }}
                    placeholder="30-71929845-8"
                  />
                </div>
                <div>
                  <Label>Condición Fiscal</Label>
                  <select
                    value={form.companyCondicionFiscal}
                    onChange={(e) => setForm(prev => ({ ...prev, companyCondicionFiscal: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {CONDICIONES_FISCALES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Ingresos Brutos</Label>
                  <Input
                    value={form.companyIngresosBrutos}
                    onChange={(e) => setForm(prev => ({ ...prev, companyIngresosBrutos: e.target.value }))}
                    placeholder="Ej: 901-123456-7 o Convenio Multilateral / Exento"
                  />
                </div>
                <div>
                  <Label>Inicio de Actividad</Label>
                  <Input
                    type="date"
                    value={form.companyInicioActividad}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setForm(prev => ({ ...prev, companyInicioActividad: e.target.value }))}
                  />
                </div>
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

        {/* Medios de Pago */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Medios de Pago para Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-slate-600">
              Configurá los medios de pago que tus clientes verán en su dashboard. 
              Esta información les ayudará a saber cómo pueden abonarte.
            </p>

            {/* Cuentas Bancarias */}
            <div className="border rounded-xl p-4 space-y-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Landmark className="w-4 h-4 text-blue-500" />
                  Cuentas Bancarias
                </h4>
                <Button type="button" variant="outline" size="sm" onClick={addCuentaBancaria}>
                  <Plus className="w-4 h-4" /> Agregar Cuenta
                </Button>
              </div>
              
              {cuentasBancarias.length === 0 ? (
                <div className="text-center py-8 border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
                  <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No hay cuentas bancarias configuradas</p>
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addCuentaBancaria}>
                    <Plus className="w-4 h-4" /> Agregar primera cuenta
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cuentasBancarias.map((cuenta) => (
                    <div 
                      key={cuenta.id} 
                      className={cn(
                        'border rounded-lg p-4 relative',
                        cuenta.esPrincipal ? 'border-primary-300 bg-primary-50/30' : ''
                      )}
                      style={{ borderColor: cuenta.esPrincipal ? undefined : 'var(--color-border)' }}
                    >
                      {/* Badge principal */}
                      {cuenta.esPrincipal && (
                        <div className="absolute -top-2 left-3 px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" /> Principal
                        </div>
                      )}
                      
                      {/* Botones de acción */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {!cuenta.esPrincipal && (
                          <button
                            type="button"
                            onClick={() => setAsMainAccount(cuenta.id)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-500"
                            title="Marcar como principal"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeCuentaBancaria(cuenta.id)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500"
                          title="Eliminar cuenta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                        <div>
                          <Label className="text-xs">Banco</Label>
                          <Input
                            value={cuenta.banco}
                            onChange={(e) => updateCuentaBancaria(cuenta.id, 'banco', e.target.value)}
                            placeholder="Nombre del banco"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Moneda</Label>
                          <select
                            value={cuenta.moneda}
                            onChange={(e) => updateCuentaBancaria(cuenta.id, 'moneda', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          >
                            {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">Número de Cuenta</Label>
                          <Input
                            value={cuenta.cuenta}
                            onChange={(e) => updateCuentaBancaria(cuenta.id, 'cuenta', e.target.value)}
                            placeholder="123-456789/0"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">CBU / IBAN</Label>
                          <Input
                            value={cuenta.cbu}
                            onChange={(e) => updateCuentaBancaria(cuenta.id, 'cbu', e.target.value)}
                            placeholder="CBU o IBAN"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Alias</Label>
                          <Input
                            value={cuenta.alias}
                            onChange={(e) => updateCuentaBancaria(cuenta.id, 'alias', e.target.value)}
                            placeholder="MI.EMPRESA.PAGOS"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Titular</Label>
                          <Input
                            value={cuenta.titular}
                            onChange={(e) => updateCuentaBancaria(cuenta.id, 'titular', e.target.value)}
                            placeholder="Nombre del titular"
                            className="text-sm"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-xs">CUIT</Label>
                          <Input
                            value={cuenta.cuit}
                            onChange={(e) => updateCuentaBancaria(cuenta.id, 'cuit', e.target.value)}
                            placeholder="20-12345678-9"
                            className="text-sm max-w-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagos Digitales */}
            <div className="border rounded-xl p-4 space-y-4" style={{ borderColor: 'var(--color-border)' }}>
              <h4 className="font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Wallet className="w-4 h-4 text-green-500" />
                Pagos Digitales
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>MercadoPago (CVU o Link)</Label>
                  <Input
                    value={form.paymentMercadoPago}
                    onChange={(e) => setForm(prev => ({ ...prev, paymentMercadoPago: e.target.value }))}
                    placeholder="CVU o link de pago"
                  />
                </div>
                <div>
                  <Label>PayPal (email)</Label>
                  <Input
                    value={form.paymentPaypal}
                    onChange={(e) => setForm(prev => ({ ...prev, paymentPaypal: e.target.value }))}
                    placeholder="email@paypal.com"
                  />
                </div>
              </div>
            </div>

            {/* Otros medios */}
            <div className="border rounded-xl p-4 space-y-4" style={{ borderColor: 'var(--color-border)' }}>
              <h4 className="font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <FileText className="w-4 h-4 text-purple-500" />
                Otros Medios
              </h4>
              <div>
                <Label>Cheque a la orden de</Label>
                <Input
                  value={form.paymentChequeOrder}
                  onChange={(e) => setForm(prev => ({ ...prev, paymentChequeOrder: e.target.value }))}
                  placeholder="Nombre para cheques"
                />
              </div>
              <div>
                <Label>Otros medios de pago</Label>
                <textarea
                  value={form.paymentOtherMethods}
                  onChange={(e) => setForm(prev => ({ ...prev, paymentOtherMethods: e.target.value }))}
                  placeholder="Ej: Efectivo en oficina, Western Union, etc."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <Label>Notas adicionales para clientes</Label>
              <textarea
                value={form.paymentNotes}
                onChange={(e) => setForm(prev => ({ ...prev, paymentNotes: e.target.value }))}
                placeholder="Ej: Los pagos se acreditan en 48hs hábiles. Para montos mayores a $100.000 consultar descuentos."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-700">
                <strong>Tip:</strong> Esta información se mostrará a tus clientes en su dashboard 
                cuando tengan facturas pendientes de pago.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ============== Numeración configurable ============== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              Numeración de Cotizaciones y Carpetas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-medium mb-1">Cómo funciona</p>
              <p>Definí un <strong>formato</strong> con los siguientes placeholders:</p>
              <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
                <li><code>{'{YEAR}'}</code> → año completo (2026)</li>
                <li><code>{'{YY}'}</code> → año en 2 dígitos (26)</li>
                <li><code>{'{MONTH}'}</code> → mes (01-12)</li>
                <li><code>{'{AREA}'}</code> → área en 2 letras (MA / AE)</li>
                <li><code>{'{AREA1}'}</code> → área en 1 letra (M / A)</li>
                <li><code>{'{SECTOR}'}</code> → sector en 3 letras (IMP / EXP)</li>
                <li><code>{'{SECTOR1}'}</code> → sector en 1 letra (I / E)</li>
                <li><code>{'{N}'}, {'{NN}'}, {'{NNNNNN}'}</code> → secuencia (la cantidad de N define el padding)</li>
              </ul>
              <p className="mt-2">El campo <strong>Próximo número</strong> es opcional. Si lo seteás, se usará una sola vez y luego se reanuda la secuencia automática.</p>
            </div>

            {/* Presupuestos */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-slate-800">Cotizaciones / Presupuestos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Formato</Label>
                  <Input
                    value={form.numeracionPresupuestoFormato}
                    onChange={(e) => setForm({ ...form, numeracionPresupuestoFormato: e.target.value })}
                    placeholder="PRES-{YEAR}-{NNNNN}"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Vista previa: <span className="font-mono text-primary-700">{previewNumeracion(form.numeracionPresupuestoFormato, 'Marítimo', 'Importación', 1)}</span>
                  </p>
                </div>
                <div>
                  <Label>Próximo número (opcional)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.numeracionPresupuestoSiguiente}
                    onChange={(e) => setForm({ ...form, numeracionPresupuestoSiguiente: e.target.value })}
                    placeholder="Auto"
                  />
                  <p className="text-xs text-slate-500 mt-1">Forzar el siguiente correlativo (se aplica una vez).</p>
                </div>
              </div>
            </div>

            {/* Carpetas */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-slate-800">Carpetas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Formato</Label>
                  <Input
                    value={form.numeracionCarpetaFormato}
                    onChange={(e) => setForm({ ...form, numeracionCarpetaFormato: e.target.value })}
                    placeholder="{YEAR}-{AREA}{SECTOR1}-{NNNNNN}"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Marítimo/Import: <span className="font-mono text-primary-700">{previewNumeracion(form.numeracionCarpetaFormato, 'Marítimo', 'Importación', 1)}</span>{' · '}
                    Aéreo/Export: <span className="font-mono text-primary-700">{previewNumeracion(form.numeracionCarpetaFormato, 'Aéreo', 'Exportación', 1)}</span>
                  </p>
                </div>
                <div>
                  <Label>Próximo número (opcional)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.numeracionCarpetaSiguiente}
                    onChange={(e) => setForm({ ...form, numeracionCarpetaSiguiente: e.target.value })}
                    placeholder="Auto"
                  />
                  <p className="text-xs text-slate-500 mt-1">Forzar el siguiente correlativo (se aplica una vez).</p>
                </div>
              </div>
            </div>
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
