/**
 * Migración de Billing
 * Agrega las columnas necesarias para el sistema de suscripciones
 * Se ejecuta de forma segura (IF NOT EXISTS)
 */

require('dotenv').config();
const { Pool } = require('pg');

// Pool singleton para evitar múltiples conexiones
let pool = null;
const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 1 // Solo necesitamos una conexión para migraciones
    });
  }
  return pool;
};

const migrations = [
  // Campos para subscription_plans
  `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 2`,
  `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_carpetas_per_month INTEGER`,
  `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_clientes INTEGER`,
  `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS has_portal_clientes BOOLEAN DEFAULT true`,
  `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS has_tracking_navieras BOOLEAN DEFAULT false`,
  `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS tracking_navieras_limit INTEGER`,
  `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS has_facturacion_afip BOOLEAN DEFAULT false`,
  `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS has_reportes_avanzados BOOLEAN DEFAULT false`,
  `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS support_level VARCHAR(50) DEFAULT 'email'`,
  `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_contact_sales BOOLEAN DEFAULT false`,

  // Campos para tenant_subscriptions
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS trial_extensions INTEGER DEFAULT 0`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS trial_plan_id UUID`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS has_accompaniment_offer BOOLEAN DEFAULT false`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS accompaniment_months_used INTEGER DEFAULT 0`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS accompaniment_price DECIMAL(10,2)`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS mp_subscription_id VARCHAR(255)`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS mp_payer_id VARCHAR(255)`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS mp_preapproval_id VARCHAR(255)`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS pending_plan_id UUID`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS pending_plan_change_at TIMESTAMPTZ`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS applied_promotion_id UUID`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS cancel_reason TEXT`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS suspension_reason TEXT`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS internal_notes TEXT`,

  // Campos para promotions
  `ALTER TABLE promotions ADD COLUMN IF NOT EXISTS duration_months INTEGER`,

  // ============ SCHEMA: Presupuestos - Actores del Proceso ============
  `ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS proveedor_id UUID`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'presupuestos_proveedor_id_fkey') THEN
       ALTER TABLE presupuestos ADD CONSTRAINT presupuestos_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id);
     END IF;
   END $$`,

  // ============ SCHEMA: Dimensiones de mercancías (CBM) ============
  `ALTER TABLE mercancias_presupuesto ADD COLUMN IF NOT EXISTS largo DOUBLE PRECISION`,
  `ALTER TABLE mercancias_presupuesto ADD COLUMN IF NOT EXISTS ancho DOUBLE PRECISION`,
  `ALTER TABLE mercancias_presupuesto ADD COLUMN IF NOT EXISTS alto DOUBLE PRECISION`,
  `ALTER TABLE mercancias ADD COLUMN IF NOT EXISTS largo DOUBLE PRECISION`,
  `ALTER TABLE mercancias ADD COLUMN IF NOT EXISTS ancho DOUBLE PRECISION`,
  `ALTER TABLE mercancias ADD COLUMN IF NOT EXISTS alto DOUBLE PRECISION`,

  // ============ SCHEMA: Items presupuesto - categoría IVA y rangos ============
  `ALTER TABLE items_presupuesto ADD COLUMN IF NOT EXISTS categoria_iva VARCHAR(20) DEFAULT 'GRAVADO'`,
  `ALTER TABLE items_presupuesto ADD COLUMN IF NOT EXISTS importe_minimo DOUBLE PRECISION`,
  `ALTER TABLE items_presupuesto ADD COLUMN IF NOT EXISTS importe_maximo DOUBLE PRECISION`,

  // ============ SCHEMA: Catálogo de conceptos de gasto (Tarifario) ============
  `CREATE TABLE IF NOT EXISTS conceptos_gasto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    categoria_iva VARCHAR(20) DEFAULT 'GRAVADO',
    porcentaje_iva DOUBLE PRECISION DEFAULT 21,
    divisa VARCHAR(10) DEFAULT 'USD',
    base VARCHAR(50),
    prepaid_collect VARCHAR(10) DEFAULT 'P',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, nombre)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_conceptos_gasto_tenant ON conceptos_gasto(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_conceptos_gasto_nombre ON conceptos_gasto(nombre)`,
];

async function runMigrations() {
  console.log('🔄 Ejecutando migraciones de billing...');
  
  const currentPool = getPool();
  const client = await currentPool.connect();
  
  try {
    for (const sql of migrations) {
      try {
        await client.query(sql);
        // Extraer nombre de columna del SQL para el log
        const match = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
        if (match) {
          console.log(`  ✅ ${match[1]}`);
        }
      } catch (error) {
        // Si la columna ya existe o hay otro error no crítico, continuar
        if (!error.message.includes('already exists')) {
          console.log(`  ⚠️ ${error.message}`);
        }
      }
    }
    
    console.log('✨ Migraciones de billing completadas!');
  } finally {
    client.release();
    // Solo cerrar el pool si se ejecuta directamente
    if (require.main === module) {
      await currentPool.end();
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error en migraciones:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
