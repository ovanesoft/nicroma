/**
 * Migración de Schema
 * Agrega columnas que prisma db push podría no haber aplicado
 * Se ejecuta de forma segura (IF NOT EXISTS)
 */

require('dotenv').config();
const { Pool } = require('pg');

let pool = null;
const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 1
    });
  }
  return pool;
};

const migrations = [
  // Proveedor en presupuestos (Actores del Proceso)
  `ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS proveedor_id UUID REFERENCES proveedores(id)`,

  // Dimensiones en mercancías de presupuesto
  `ALTER TABLE mercancias_presupuesto ADD COLUMN IF NOT EXISTS largo DOUBLE PRECISION`,
  `ALTER TABLE mercancias_presupuesto ADD COLUMN IF NOT EXISTS ancho DOUBLE PRECISION`,
  `ALTER TABLE mercancias_presupuesto ADD COLUMN IF NOT EXISTS alto DOUBLE PRECISION`,

  // Dimensiones en mercancías de carpeta
  `ALTER TABLE mercancias ADD COLUMN IF NOT EXISTS largo DOUBLE PRECISION`,
  `ALTER TABLE mercancias ADD COLUMN IF NOT EXISTS ancho DOUBLE PRECISION`,
  `ALTER TABLE mercancias ADD COLUMN IF NOT EXISTS alto DOUBLE PRECISION`,
];

async function runMigrations() {
  const db = getPool();
  let successCount = 0;
  let skipCount = 0;

  for (const sql of migrations) {
    try {
      await db.query(sql);
      successCount++;
    } catch (error) {
      if (error.code === '42701') {
        skipCount++;
      } else {
        console.warn(`  Schema migration warning: ${error.message}`);
      }
    }
  }

  console.log(`Schema migrations: ${successCount} applied, ${skipCount} skipped (already exist)`);
  await db.end();
  pool = null;
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Schema migration failed:', err);
    process.exit(1);
  });
