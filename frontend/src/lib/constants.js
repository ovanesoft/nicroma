import {
  LayoutDashboard,
  Building2,
  Users,
  Mail,
  Settings,
  Ship,
  FileText,
  BarChart3,
  Package,
  Wallet,
  ClipboardList,
  Plug,
  MapPin,
  Calendar,
  Receipt,
  CreditCard,
  User,
  Activity,
  Calculator,
  MessageSquare,
  Sparkles,
  Bell,
  Megaphone,
  FileCheck
} from 'lucide-react';

// Navegación según rol
export const getNavigation = (role) => {
  const common = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }
  ];

  const rootNav = [
    ...common,
    { name: 'Mensajes', href: '/messages', icon: MessageSquare },
    { 
      name: 'Administración',
      icon: Building2,
      children: [
        { name: 'Organizaciones', href: '/admin/tenants', icon: Building2 },
        { name: 'Usuarios', href: '/admin/users', icon: Users },
        { name: 'Notificaciones', href: '/admin/notifications', icon: Megaphone },
        { name: 'Logs del Sistema', href: '/admin/logs', icon: Activity },
      ]
    },
    {
      name: 'Billing',
      icon: CreditCard,
      children: [
        { name: 'Dashboard', href: '/admin/billing', icon: Wallet },
        { name: 'Suscripciones', href: '/admin/billing/suscripciones', icon: Users },
        { name: 'Promociones', href: '/admin/billing/promociones', icon: Sparkles },
      ]
    },
    { name: 'Configuración', href: '/settings', icon: Settings }
  ];

  const adminNav = [
    ...common,
    { name: 'Mensajes', href: '/messages', icon: MessageSquare },
    { 
      name: 'Mi Organización',
      icon: Building2,
      children: [
        { name: 'Usuarios', href: '/org/users', icon: Users },
        { name: 'Invitaciones', href: '/org/invitations', icon: Mail },
        { name: 'Configuración', href: '/org/settings', icon: Settings },
      ]
    },
    // Módulos de logística
    { 
      name: 'Comercial',
      icon: Ship,
      children: [
        { name: 'Presupuestos', href: '/presupuestos', icon: Calculator },
        { name: 'Predespacho', href: '/predespachos', icon: FileCheck },
        { name: 'Carpetas', href: '/carpetas', icon: FileText },
        { name: 'Clientes', href: '/clientes', icon: Users },
        { name: 'Proveedores', href: '/proveedores', icon: Package },
      ]
    },
    { 
      name: 'Facturación',
      icon: Wallet,
      children: [
        { name: 'Prefacturas', href: '/prefacturas', icon: ClipboardList },
        { name: 'Facturas', href: '/facturas', icon: FileText },
        { name: 'AFIP (Electrónica)', href: '/fiscal/config', icon: Receipt },
      ]
    },
    { 
      name: 'Integraciones',
      icon: Plug,
      children: [
        { name: 'Navieras', href: '/integraciones', icon: Ship },
        { name: 'Tracking', href: '/tracking', icon: MapPin },
        { name: 'Schedules', href: '/schedules', icon: Calendar },
      ]
    },
    { name: 'Estadísticas', href: '/estadisticas', icon: BarChart3 },
    {
      name: 'Suscripción',
      icon: Sparkles,
      children: [
        { name: 'Mi Plan', href: '/billing/suscripcion', icon: CreditCard },
        { name: 'Cambiar Plan', href: '/billing/planes', icon: Sparkles },
        { name: 'Pagos', href: '/billing/pagos', icon: Receipt },
      ]
    },
  ];

  const managerNav = [
    ...common,
    { 
      name: 'Comercial',
      icon: Ship,
      children: [
        { name: 'Presupuestos', href: '/presupuestos', icon: Calculator },
        { name: 'Predespacho', href: '/predespachos', icon: FileCheck },
        { name: 'Carpetas', href: '/carpetas', icon: FileText },
        { name: 'Clientes', href: '/clientes', icon: Users },
        { name: 'Proveedores', href: '/proveedores', icon: Package },
      ]
    },
    { 
      name: 'Herramientas',
      icon: Plug,
      children: [
        { name: 'Tracking', href: '/tracking', icon: MapPin },
        { name: 'Schedules', href: '/schedules', icon: Calendar },
      ]
    },
    { name: 'Estadísticas', href: '/estadisticas', icon: BarChart3 },
  ];

  const userNav = [
    ...common,
    { name: 'Mis Carpetas', href: '/mis-carpetas', icon: FileText },
  ];

  // Navegación para clientes del portal
  const clientNav = [
    ...common,
    { name: 'Mensajes', href: '/messages', icon: MessageSquare },
    { name: 'Solicitar Presupuesto', href: '/solicitar-presupuesto', icon: Calculator },
    { name: 'Mis Presupuestos', href: '/mis-presupuestos', icon: Mail },
    { name: 'Solicitar Predespacho', href: '/solicitar-predespacho', icon: FileCheck },
    { name: 'Mis Predespachos', href: '/mis-predespachos', icon: FileCheck },
    { name: 'Mis Envíos', href: '/mis-envios', icon: Ship },
    { name: 'Mis Facturas', href: '/mis-facturas', icon: FileText },
    { name: 'Tracking', href: '/tracking', icon: MapPin },
    { name: 'Pagos', href: '/pagos', icon: CreditCard },
    { name: 'Mi Perfil', href: '/profile', icon: User },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ];

  const navByRole = {
    root: rootNav,
    admin: adminNav,
    manager: managerNav,
    user: userNav,
    client: clientNav
  };

  return navByRole[role] || userNav;
};

// Estados de carpetas
export const CARPETA_ESTADOS = {
  HOUSE: { label: 'House', color: 'bg-blue-100 text-blue-700' },
  DIRECTA: { label: 'Directa', color: 'bg-green-100 text-green-700' },
  CONSOLIDADA: { label: 'Consolidada', color: 'bg-purple-100 text-purple-700' },
  CERRADA: { label: 'Cerrada', color: 'bg-slate-100 text-slate-700' },
  CANCELADA: { label: 'Cancelada', color: 'bg-red-100 text-red-700' }
};

// Tipos de operación
export const TIPOS_OPERACION = [
  'FCL-FCL',
  'LCL-LCL',
  'FCL-LCL',
  'LCL-FCL',
  'Aéreo',
  'Terrestre'
];

// Tipos de operación aérea (solo para área Aéreo)
export const TIPOS_OPERACION_AEREA = [
  'CAO',
  'NO PALETIZADO',
  'PALETIZADO'
];

// Áreas
export const AREAS = [
  'Marítimo',
  'Aéreo',
  'Terrestre'
];

// Sectores
export const SECTORES = [
  'Importación',
  'Exportación'
];

// Incoterms
export const INCOTERMS = [
  'EXW', 'FCA', 'FAS', 'FOB', 
  'CFR', 'CIF', 'CPT', 'CIP',
  'DAP', 'DPU', 'DDP'
];

// Tipos de contenedor
export const TIPOS_CONTENEDOR = [
  '20DC', '40DC', '40HC',
  '20RF', '40RF', '40RH',
  '20OT', '40OT',
  '20FR', '40FR',
  '20TK', '40TK'
];

// Monedas
export const MONEDAS = [
  { code: 'USD', label: 'Dólar estadounidense', symbol: '$' },
  { code: 'ARS', label: 'Peso argentino', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' }
];

// Condiciones de pago
export const PREPAID_COLLECT = [
  'Prepaid',
  'Collect'
];

// ==========================================
// PREDESPACHO
// ==========================================

export const DESTINACIONES = [
  { value: 'IMPORTACION_A_CONSUMO', label: 'Importación a Consumo' },
  { value: 'EXPORTACION_A_CONSUMO', label: 'Exportación a Consumo' },
  { value: 'OTRO_IMPORTACION', label: 'Otro - Importación' },
  { value: 'OTRO_EXPORTACION', label: 'Otro - Exportación' }
];

export const VIAS = [
  { value: 'AEREO', label: 'Aéreo' },
  { value: 'TERRESTRE', label: 'Terrestre' },
  { value: 'MARITIMO', label: 'Marítimo' },
  { value: 'MULTIMODAL', label: 'Multimodal' }
];

export const ADUANAS = [
  { value: '073 - EZEIZA', label: '073 - Ezeiza' },
  { value: '001 - BUENOS AIRES', label: '001 - Buenos Aires' },
  { value: '000 - OTRO', label: '000 - Otro' }
];

export const CONDICIONES_VENTA = [
  { value: 'EXW - EX WORKS', label: 'EXW - Ex Works' },
  { value: 'FCA - FREE CARRIER', label: 'FCA - Free Carrier' },
  { value: 'FOB - FREE ON BOARD', label: 'FOB - Free on Board' },
  { value: 'CFR - COST & FREIGHT', label: 'CFR - Cost & Freight' },
  { value: 'CIF - COST, INSURANCE & FREIGHT', label: 'CIF - Cost, Insurance & Freight' },
  { value: 'DDP - DDU - FAS', label: 'Otro - DDP / DDU / FAS' }
];

export const TIPOS_DOCUMENTO_PD = [
  { value: 'PEDIDO_DE_FONDOS', label: 'Pedido de Fondos' },
  { value: 'PRESUPUESTO', label: 'Presupuesto' }
];

export const PREDESPACHO_ESTADOS = {
  BORRADOR: { label: 'Borrador', color: 'bg-slate-100 text-slate-800' },
  ENVIADO: { label: 'Enviado', color: 'bg-purple-100 text-purple-800' },
  APROBADO: { label: 'Aprobado', color: 'bg-green-100 text-green-800' },
  RECHAZADO: { label: 'Rechazado', color: 'bg-red-100 text-red-800' },
  EN_PROCESO: { label: 'En Proceso', color: 'bg-blue-100 text-blue-800' },
  FINALIZADO: { label: 'Finalizado', color: 'bg-emerald-100 text-emerald-800' }
};
