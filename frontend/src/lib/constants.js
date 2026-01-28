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
  Megaphone
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
        { name: 'Carpetas', href: '/carpetas', icon: FileText },
        { name: 'Clientes', href: '/clientes', icon: Users },
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
