/**
 * Seed de Planes de Suscripción
 * Ejecutar con: node src/database/seedPlans.js
 */

require('dotenv').config();
const prisma = require('../services/prisma');

const plans = [
  {
    name: 'Emprendedor',
    slug: 'emprendedor',
    description: 'Ideal para despachantes que están comenzando',
    priceMonthly: 25000,
    priceYearly: 250000,
    currency: 'ARS',
    maxUsers: 2,
    maxCarpetasPerMonth: 5,
    maxClientes: 10,
    hasPortalClientes: true,
    hasTrackingNavieras: false,
    trackingNavierasLimit: 0,
    hasFacturacionAfip: false,
    hasReportesAvanzados: false,
    supportLevel: 'email_low',
    isContactSales: false,
    isActive: true,
    sortOrder: 1,
    features: [
      'Gestión de carpetas básica',
      'Portal de clientes',
      'Hasta 2 usuarios',
      'Hasta 5 carpetas/mes',
      'Hasta 10 clientes',
      'Soporte por email',
    ],
  },
  {
    name: 'Starter',
    slug: 'starter',
    description: 'Para operaciones chicas y estables',
    priceMonthly: 45000,
    priceYearly: 450000,
    currency: 'ARS',
    maxUsers: 2,
    maxCarpetasPerMonth: 30,
    maxClientes: 20,
    hasPortalClientes: true,
    hasTrackingNavieras: false,
    trackingNavierasLimit: 0,
    hasFacturacionAfip: true,
    hasReportesAvanzados: false,
    supportLevel: 'email',
    isContactSales: false,
    isActive: true,
    sortOrder: 2,
    features: [
      'Todo lo del plan Emprendedor',
      'Facturación electrónica AFIP',
      'Hasta 30 carpetas/mes',
      'Hasta 20 clientes',
      'Soporte por email',
    ],
  },
  {
    name: 'Profesional',
    slug: 'profesional',
    description: 'Para freight forwarders en crecimiento',
    priceMonthly: 89000,
    priceYearly: 890000,
    currency: 'ARS',
    maxUsers: 5,
    maxCarpetasPerMonth: 150,
    maxClientes: 100,
    hasPortalClientes: true,
    hasTrackingNavieras: true,
    trackingNavierasLimit: 5, // 5 navieras
    hasFacturacionAfip: true,
    hasReportesAvanzados: true,
    supportLevel: 'email_chat',
    isContactSales: false,
    isActive: true,
    sortOrder: 3,
    features: [
      'Todo lo del plan Starter',
      'Tracking de 5 navieras',
      'Reportes avanzados',
      'Hasta 5 usuarios',
      'Hasta 150 carpetas/mes',
      'Hasta 100 clientes',
      'Soporte por email y chat',
    ],
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'Para operaciones de gran volumen',
    priceMonthly: 179000,
    priceYearly: 1790000,
    currency: 'ARS',
    maxUsers: 15,
    maxCarpetasPerMonth: null, // Ilimitadas
    maxClientes: null, // Ilimitados
    hasPortalClientes: true,
    hasTrackingNavieras: true,
    trackingNavierasLimit: 5, // 5 navieras
    hasFacturacionAfip: true,
    hasReportesAvanzados: true,
    supportLevel: 'priority',
    isContactSales: false,
    isActive: true,
    sortOrder: 4,
    features: [
      'Todo lo del plan Profesional',
      'Hasta 15 usuarios',
      'Carpetas ilimitadas',
      'Clientes ilimitados',
      'Soporte prioritario',
    ],
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Solución personalizada para grandes empresas',
    priceMonthly: 0, // Contactar
    priceYearly: 0,
    currency: 'ARS',
    maxUsers: null, // Ilimitados
    maxCarpetasPerMonth: null,
    maxClientes: null,
    hasPortalClientes: true,
    hasTrackingNavieras: true,
    trackingNavierasLimit: null, // Todas + custom
    hasFacturacionAfip: true,
    hasReportesAvanzados: true,
    supportLevel: 'dedicated',
    isContactSales: true, // Requiere contactar a ventas
    isActive: true,
    sortOrder: 5,
    features: [
      'Todo lo del plan Business',
      'Usuarios ilimitados',
      'Integraciones personalizadas',
      'Reportes a medida',
      'Onboarding VIP',
      'Capacitación incluida',
      'SLA garantizado',
      'Soporte dedicado',
    ],
  },
];

async function seedPlans() {
  console.log('🌱 Iniciando seed de planes...\n');

  for (const plan of plans) {
    try {
      const existing = await prisma.subscriptionPlan.findUnique({
        where: { slug: plan.slug },
      });

      if (existing) {
        // Actualizar plan existente
        await prisma.subscriptionPlan.update({
          where: { slug: plan.slug },
          data: plan,
        });
        console.log(`✅ Plan actualizado: ${plan.name}`);
      } else {
        // Crear nuevo plan
        await prisma.subscriptionPlan.create({
          data: plan,
        });
        console.log(`✅ Plan creado: ${plan.name}`);
      }
    } catch (error) {
      console.error(`❌ Error con plan ${plan.name}:`, error.message);
    }
  }

  console.log('\n✨ Seed de planes completado!\n');
  
  // Mostrar resumen
  const allPlans = await prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      name: true,
      slug: true,
      priceMonthly: true,
      isActive: true,
    },
  });

  console.log('📋 Planes disponibles:');
  console.log('─'.repeat(50));
  allPlans.forEach(p => {
    const price = p.priceMonthly > 0 ? `$${p.priceMonthly.toLocaleString()}` : 'Contactar';
    const status = p.isActive ? '🟢' : '🔴';
    console.log(`${status} ${p.name.padEnd(15)} ${p.slug.padEnd(15)} ${price}`);
  });
  console.log('─'.repeat(50));
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  seedPlans()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error en seed:', error);
      process.exit(1);
    });
}

module.exports = { seedPlans, plans };
