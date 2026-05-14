// Script de SOLO LECTURA para diagnosticar si la carpeta 2026-MAI-000002
// tiene posibilidad de recuperación. NO MODIFICA NADA.
//
// USO:
//   1. Copiar el DATABASE_URL desde el dashboard de Render → Database → "External Database URL"
//   2. Ejecutar: DATABASE_URL="postgresql://..." node scripts/diagnose-carpeta-perdida.js [NUMERO_CARPETA]
//
//   Default: 2026-MAI-000002

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['warn', 'error'] });

const NUMERO_BUSCADO = process.argv[2] || '2026-MAI-000002';

(async () => {
  console.log(`\n🔍 Diagnóstico de recuperación para carpeta: ${NUMERO_BUSCADO}\n`);
  console.log('═'.repeat(70));

  // Intentar variantes (mayúsculas, minúsculas)
  const variantes = [
    NUMERO_BUSCADO,
    NUMERO_BUSCADO.toUpperCase(),
    NUMERO_BUSCADO.toLowerCase(),
  ];

  const carpeta = await prisma.carpeta.findFirst({
    where: { numero: { in: variantes } },
    include: {
      cliente: { select: { id: true, razonSocial: true, numeroDocumento: true } },
      shipper: { select: { id: true, razonSocial: true } },
      consignee: { select: { id: true, razonSocial: true } },
      mercancias: true,
      contenedores: true,
      gastos: true,
      presupuesto: {
        include: {
          items: true,
          mercancias: true,
          contenedores: true,
        }
      }
    }
  });

  if (!carpeta) {
    console.log('❌ No se encontró ninguna carpeta con ese número.');
    console.log('   Variantes probadas:', variantes.join(', '));

    // Buscar similares
    const similares = await prisma.carpeta.findMany({
      where: { numero: { contains: 'MAI', mode: 'insensitive' } },
      select: { numero: true, fechaEmision: true, estado: true },
      orderBy: { numero: 'asc' },
      take: 20,
    });
    if (similares.length > 0) {
      console.log('\n📋 Carpetas similares encontradas:');
      similares.forEach(c => console.log(`   - ${c.numero} (${c.estado}, ${c.fechaEmision?.toISOString().slice(0,10)})`));
    }
    process.exit(0);
  }

  console.log(`✅ Carpeta encontrada: ${carpeta.numero}`);
  console.log(`   ID: ${carpeta.id}`);
  console.log(`   Estado: ${carpeta.estado}`);
  console.log(`   Cliente: ${carpeta.cliente?.razonSocial || '(sin cliente)'}`);
  console.log(`   Área/Sector: ${carpeta.area} / ${carpeta.sector}`);
  console.log(`   Fecha emisión: ${carpeta.fechaEmision?.toISOString().slice(0,10)}`);
  console.log(`   Booking: ${carpeta.booking || '-'}`);
  console.log(`   HBL: ${carpeta.houseBL || '-'}  MBL: ${carpeta.masterBL || '-'}`);
  console.log('');

  console.log('📦 Datos actuales de la carpeta (lo que sobrevive):');
  console.log(`   Mercancías: ${carpeta.mercancias.length}`);
  console.log(`   Contenedores: ${carpeta.contenedores.length}`);
  console.log(`   Gastos: ${carpeta.gastos.length}`);
  console.log('');

  // OPCIÓN 1: Presupuesto asociado
  console.log('═'.repeat(70));
  console.log('OPCIÓN 1: Reconstrucción desde presupuesto asociado');
  console.log('═'.repeat(70));
  if (carpeta.presupuestoId && carpeta.presupuesto) {
    const p = carpeta.presupuesto;
    console.log(`✅ La carpeta tiene presupuesto asociado: ${p.numero} (ID: ${p.id})`);
    console.log(`   Items (gastos/conceptos): ${p.items.length}`);
    console.log(`   Mercancías: ${p.mercancias.length}`);
    console.log(`   Contenedores: ${p.contenedores.length}`);

    if (p.items.length > 0 || p.mercancias.length > 0 || p.contenedores.length > 0) {
      console.log('\n🎯 RECUPERACIÓN POSIBLE → estos datos pueden copiarse de vuelta a la carpeta.');

      if (p.items.length > 0) {
        console.log('\n   Detalle de items del presupuesto (preview):');
        p.items.slice(0, 5).forEach((i, idx) => {
          console.log(`     ${idx+1}. ${i.concepto} — ${i.divisa} ${i.totalVenta?.toFixed(2)} (${i.prepaidCollect})`);
        });
        if (p.items.length > 5) console.log(`     ... y ${p.items.length - 5} más`);
      }
      if (p.mercancias.length > 0) {
        console.log('\n   Detalle de mercancías del presupuesto (preview):');
        p.mercancias.slice(0, 5).forEach((m, idx) => {
          console.log(`     ${idx+1}. ${m.descripcion} — ${m.bultos || 0} bultos, ${m.volumen || 0} m³, ${m.peso || 0} kg`);
        });
      }
      if (p.contenedores.length > 0) {
        console.log('\n   Contenedores del presupuesto:');
        p.contenedores.forEach((c, idx) => {
          console.log(`     ${idx+1}. ${c.tipo} × ${c.cantidad} ${c.numero ? `(${c.numero})` : ''}`);
        });
      }
    } else {
      console.log('⚠️  El presupuesto asociado también está vacío. Esta vía no sirve.');
    }
  } else if (carpeta.presupuestoId) {
    console.log(`⚠️  La carpeta tiene presupuestoId=${carpeta.presupuestoId} pero el presupuesto no se cargó.`);
  } else {
    console.log('❌ La carpeta NO tiene presupuesto asociado. Esta vía no aplica.');
  }

  // OPCIÓN 2: Logs de auditoría
  console.log('\n' + '═'.repeat(70));
  console.log('OPCIÓN 2: Logs de auditoría (audit_logs)');
  console.log('═'.repeat(70));
  try {
    const auditLogs = await prisma.$queryRaw`
      SELECT id, action, entity_type, entity_id, old_data, new_data, created_at, user_id
      FROM audit_logs
      WHERE entity_id::text = ${carpeta.id}
         OR new_data::text LIKE ${'%' + carpeta.numero + '%'}
      ORDER BY created_at DESC
      LIMIT 20
    `;
    if (auditLogs.length > 0) {
      console.log(`✅ Encontrados ${auditLogs.length} registros de auditoría:`);
      auditLogs.forEach(l => {
        const fecha = new Date(l.created_at).toISOString().slice(0, 19).replace('T', ' ');
        const hasOldData = l.old_data && Object.keys(l.old_data).length > 0;
        console.log(`   ${fecha} | ${l.action} | ${l.entity_type} | old_data: ${hasOldData ? 'SÍ ✓' : 'no'}`);
      });
      console.log('\n   Si hay registros con old_data, podemos extraer la info anterior.');
    } else {
      console.log('❌ No hay registros de auditoría para esta carpeta.');
    }
  } catch (e) {
    console.log('⚠️  No se pudo consultar audit_logs:', e.message);
  }

  // OPCIÓN 3: Búsqueda de gastos huérfanos
  console.log('\n' + '═'.repeat(70));
  console.log('OPCIÓN 3: Buscar registros huérfanos (referencias rotas)');
  console.log('═'.repeat(70));
  try {
    const gastosOrphan = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM gastos
      WHERE carpeta_id = ${carpeta.id}::uuid
    `;
    const mercanciasOrphan = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM mercancias
      WHERE carpeta_id = ${carpeta.id}::uuid
    `;
    console.log(`   Gastos en DB para esta carpeta: ${gastosOrphan[0].count}`);
    console.log(`   Mercancías en DB para esta carpeta: ${mercanciasOrphan[0].count}`);
    console.log('   (Si está en 0 y Prisma también dice 0, los datos fueron borrados físicamente.)');
  } catch (e) {
    console.log('⚠️  Error al buscar huérfanos:', e.message);
  }

  // OPCIÓN 4: Otras carpetas relacionadas por presupuesto
  if (carpeta.presupuestoId) {
    const otrasCarpetas = await prisma.carpeta.findMany({
      where: {
        presupuestoId: carpeta.presupuestoId,
        id: { not: carpeta.id }
      },
      select: { numero: true, estado: true, _count: { select: { mercancias: true, gastos: true, contenedores: true } } }
    });
    if (otrasCarpetas.length > 0) {
      console.log('\n' + '═'.repeat(70));
      console.log('OPCIÓN 4: Otras carpetas del mismo presupuesto');
      console.log('═'.repeat(70));
      otrasCarpetas.forEach(c => {
        console.log(`   ${c.numero} (${c.estado}): ${c._count.mercancias}m / ${c._count.contenedores}c / ${c._count.gastos}g`);
      });
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('Diagnóstico completado.');
  console.log('═'.repeat(70));
})()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
