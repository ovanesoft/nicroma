# Sistema de Suscripciones y Billing - Nicroma

> Especificación completa del sistema de cobros a tenants.  
> Fecha: Enero 2026

---

## 1. PLANES Y PRECIOS

### Tabla de Planes

| Plan | Precio Mensual | Precio Anual (2 meses gratis) | Target |
|------|----------------|-------------------------------|--------|
| **Emprendedor** | $25.000 | $250.000 | Despachante que arranca |
| **Starter** | $45.000 | $450.000 | Operación chica estable |
| **Profesional** | $89.000 | $890.000 | Freight forwarder mediano |
| **Business** | $179.000 | $1.790.000 | Operaciones grandes |
| **Enterprise** | Contactar | Contactar | Corporativos |

### Límites por Plan

| Característica | Emprendedor | Starter | Profesional | Business | Enterprise |
|----------------|-------------|---------|-------------|----------|------------|
| **Usuarios** | 2 | 2 | 5 | 15 | Ilimitados |
| **Carpetas/mes** | 5 | 30 | 150 | Ilimitadas | Ilimitadas |
| **Clientes** | 10 | 20 | 100 | Ilimitados | Ilimitados |

### Features por Plan

| Feature | Emprendedor | Starter | Profesional | Business | Enterprise |
|---------|-------------|---------|-------------|----------|------------|
| Portal de clientes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tracking navieras | 🔒 Upgrade | 🔒 Upgrade | ✅ 5 navieras | ✅ 5 navieras | ✅ + Custom |
| Facturación AFIP | 🔒 Upgrade | ✅ | ✅ | ✅ | ✅ |
| Reportes avanzados | 🔒 Upgrade | 🔒 Upgrade | ✅ | ✅ | ✅ + Custom |
| Soporte | Email (baja prioridad) | Email | Email + Chat | Prioritario | Dedicado + SLA |
| Extras | - | - | - | - | API, Onboarding VIP, Capacitación |

### Regla de UX para Límites

**NUNCA bloqueo cancelatorio. SIEMPRE 🔒 Upgrade con mensaje amigable.**

Cuando el usuario intenta usar una feature que no tiene:
- Mostrar qué hace la feature
- Mostrar botón "Desbloquear con [Plan X]"
- Tono: invitación, no restricción

---

## 2. TRIAL Y ESTRATEGIA DE CONVERSIÓN

### Flujo del Trial

```
REGISTRO
    ↓
Trial 7 días (Plan Profesional completo)
    ↓
Día 6: Email "¿Necesitás más tiempo?"
    ├─→ SÍ → +7 días gratis (total 14)
    └─→ NO → Elegí tu plan
            ↓
Día 13: Email "¿Necesitás más tiempo?"
    ├─→ SÍ → +7 días gratis (total 21)
    └─→ NO → Elegí tu plan
            ↓
Día 21: Trial terminado
    ├─→ Elige plan → ✅ Suscripción activa
    └─→ No puede pagar → OFERTA ACOMPAÑAMIENTO
```

### Oferta de Acompañamiento

Para quienes no pueden pagar el precio completo:

| Período | Precio | Plan |
|---------|--------|------|
| Mes 1 y 2 | $10.000/mes | Emprendedor |
| Mes 3 en adelante | $25.000/mes | Emprendedor (precio normal) |

### Tono de Comunicación

**PRINCIPIO: Empático, nunca comercial agresivo.**

#### Al terminar el trial:
> "¿Cómo te fue estas semanas? Esperamos que hayas podido probar todo.  
> Cuando estés listo, elegí el plan que mejor se ajuste a tu momento."

#### Si no elige plan después de unos días:
> "Hola, vimos que todavía no elegiste un plan.  
> **No te preocupes.**  
> Sabemos que arrancar no es fácil.  
> Si el precio es un problema ahora, queremos acompañarte igual.  
> Podés empezar con $10.000/mes los primeros dos meses.  
> Lo importante es que tengas las herramientas para crecer."

#### Mensaje de la oferta de acompañamiento:
> **"No te preocupes, te acompañamos."**
>
> Entendemos que estás empezando y cada peso cuenta.  
> Por eso, los primeros 2 meses pagás solo **$10.000/mes**.  
> Después seguís con el plan Emprendedor normal ($25.000/mes).  
>
> Creemos en vos. Queremos que crezcas con nosotros.  
> El portal de clientes que te damos es tu mejor herramienta para conseguir más clientes y profesionalizar tu imagen.  
>
> **Estamos acá para ayudarte.**

---

## 3. EMAILS AUTOMATIZADOS

| Momento | Asunto sugerido | Contenido |
|---------|-----------------|-----------|
| Día 1 | Bienvenido a Nicroma | Tips para arrancar, qué hacer primero |
| Día 4 | ¿Cómo viene todo? | Oferta de ayuda, link a soporte |
| Día 6 | Te queda 1 día de prueba | ¿Necesitás más tiempo? Botón para extender |
| Día 7 (sin extensión) | Tu prueba terminó | Elegí tu plan, link a precios |
| Día 7 (con extensión) | ¡Listo! 7 días más | Seguí probando, tips avanzados |
| Día 13 | Última extensión disponible | ¿Necesitás más tiempo? |
| Día 21 | Es hora de decidir | Elegí tu plan + oferta acompañamiento |
| Post-pago | ¡Bienvenido a Nicroma! | Confirmación + próximos pasos |
| Pago fallido | Hubo un problema con tu pago | Link para actualizar método de pago |

---

## 4. CONFIGURACIÓN DE PAGOS

### Pasarela de Pago

- **Proveedor:** MercadoPago
- **Región:** Argentina
- **Moneda:** ARS (Pesos Argentinos)
- **Plazo acreditación recomendado:** 35 días (comisión 1.49%)

### Manejo de Pagos Fallidos

```
Pago falla
    ↓
MercadoPago reintenta automáticamente (hasta 3 veces)
    ↓
Si sigue fallando:
    ↓
Sistema marca: "Pago pendiente"
    ↓
❌ NO suspende automáticamente
    ↓
✅ Notifica al tenant: "Hubo un problema con tu pago"
    ↓
✅ Alerta en dashboard root
    ↓
Root revisa y decide acción (contactar, dar tiempo, etc.)
```

### Cambios de Plan

| Tipo | Comportamiento |
|------|----------------|
| **Upgrade** | Inmediato. Se cobra la diferencia prorrateada. Acceso instantáneo a nuevas features. |
| **Downgrade** | Al próximo ciclo. Sigue con el plan actual hasta renovación. |

### Facturación a Clientes

- **Modo:** Manual
- Nicroma genera las facturas AFIP por separado cuando las necesita
- MercadoPago emite su comprobante de pago

---

## 5. CÓDIGOS DE DESCUENTO / PROMOCIONES

### Campos de una Promoción

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `code` | Código que ingresa el usuario | "BIENVENIDO20" |
| `discount_type` | Tipo de descuento | "percentage" o "fixed" |
| `discount_value` | Valor del descuento | 20 (%) o 10000 ($) |
| `applicable_plans` | Planes donde aplica | ["starter", "profesional"] o null (todos) |
| `valid_from` | Fecha inicio vigencia | 2026-01-01 |
| `valid_until` | Fecha fin vigencia | 2026-03-31 |
| `max_uses` | Usos totales permitidos | 100 |
| `max_uses_per_tenant` | Usos por cliente | 1 |
| `duration_months` | Duración del descuento | 1 (primer mes), 3, o null (siempre) |

### Tracking de ROI

Guardar con cada suscripción:
- Código usado
- Fecha de uso
- Plan elegido
- Si convirtió a pago

Reporte: "Cuántos clientes por código, revenue generado"

---

## 6. PANEL ROOT - GESTIÓN DE BILLING

### Funcionalidades Requeridas

| Sección | Funciones |
|---------|-----------|
| **Suscripciones** | Ver todas, filtrar por estado/plan, buscar por tenant |
| **Alertas** | Pagos fallidos, trials por vencer, suscripciones por renovar |
| **Historial de pagos** | Por tenant, filtrable por fecha/estado |
| **Acciones manuales** | Suspender, reactivar, cambiar plan, dar extensión de trial |
| **Créditos/Descuentos** | Aplicar descuento manual a un tenant específico |
| **Promociones** | CRUD de códigos de descuento |
| **Notas internas** | Registrar conversaciones/acuerdos con clientes |
| **Reportes** | Revenue mensual, conversión de trials, churn |

---

## 7. PÁGINAS FRONTEND

### Públicas (sin login)

| Página | Ruta sugerida | Contenido |
|--------|---------------|-----------|
| Landing de precios | `/precios` | Tabla de planes, features, CTA a registro |

### Dentro del Sistema (logueado)

| Página | Ruta sugerida | Usuario | Contenido |
|--------|---------------|---------|-----------|
| Planes | `/billing/planes` | Tenant admin | Ver planes, comparar, elegir |
| Checkout | `/billing/checkout` | Tenant admin | Integración MercadoPago |
| Mi suscripción | `/billing/suscripcion` | Tenant admin | Estado actual, próximo cobro, cambiar plan, cancelar |
| Historial de pagos | `/billing/pagos` | Tenant admin | Lista de pagos realizados |

### Panel Root

| Página | Ruta sugerida | Contenido |
|--------|---------------|-----------|
| Dashboard billing | `/admin/billing` | Métricas generales, alertas |
| Suscripciones | `/admin/billing/suscripciones` | Lista de todas las suscripciones |
| Detalle tenant | `/admin/billing/tenant/:id` | Detalle completo de un tenant |
| Promociones | `/admin/billing/promociones` | CRUD de códigos |
| Reportes | `/admin/billing/reportes` | Revenue, conversión, churn |

---

## 8. PROPUESTA DE VALOR

### Diferenciador Principal

**PORTAL DE CLIENTES PROPIO**

> "Tu propio portal de clientes. Profesionalizá tu imagen.  
> Que tus clientes vean sus embarques, facturas y documentos cuando quieran.  
> Esto no lo tiene nadie más a este precio."

### Comunicación de Marca

| NO decimos | SÍ decimos |
|------------|------------|
| "Comprá nuestro software" | "Hacé crecer tu negocio" |
| "Funcionalidad bloqueada" | "Desbloqueá más herramientas" |
| "Tu trial terminó, pagá" | "Cuando estés listo, elegí tu plan" |
| "No podés hacer eso" | "Con el plan X podés hacer eso y más" |

### Valores de Marca

1. **Acompañamiento** - "Queremos que crezcas con nosotros"
2. **Transparencia** - Precios públicos, sin letra chica
3. **Flexibilidad** - Extensiones, oferta de acompañamiento
4. **Profesionalismo** - Portal de clientes, imagen moderna

---

## 9. MÉTRICAS A TRACKEAR

### Conversión

- Registros totales
- Trial iniciados
- Extensiones pedidas (1ra y 2da)
- Conversión trial → pago
- Conversión por plan elegido
- Uso de oferta acompañamiento

### Revenue

- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- ARPU (Average Revenue Per User)
- Revenue por plan

### Retención

- Churn mensual
- Churn por plan
- Upgrades vs downgrades
- Tiempo promedio de vida del cliente

### Promociones

- Usos por código
- Conversión por código
- Revenue por código (ROI de publicidad)

---

## 10. MODELO DE DATOS (Prisma)

### Modelos existentes a usar/modificar:

- `SubscriptionPlan` - Planes disponibles
- `tenant_subscriptions` - Suscripción activa por tenant
- `payments` - Historial de pagos
- `promotions` - Códigos de descuento
- `promotion_uses` - Uso de promociones

### Campos adicionales sugeridos para `tenant_subscriptions`:

```prisma
model tenant_subscriptions {
  // ... campos existentes ...
  
  // Trial
  trial_started_at     DateTime?
  trial_ends_at        DateTime?
  trial_extensions     Int       @default(0)  // 0, 1, o 2
  
  // Oferta acompañamiento
  accompaniment_offer  Boolean   @default(false)
  accompaniment_months_remaining Int?
  
  // MercadoPago
  mp_subscription_id   String?   // ID de suscripción en MP
  mp_payer_id          String?   // ID del pagador en MP
  
  // Cambios de plan pendientes
  pending_plan_change  String?   // Plan al que cambiará en próximo ciclo
  
  // Notas internas (para root)
  internal_notes       String?
}
```

---

## 11. INTEGRACIONES

### MercadoPago

- **SDK:** `mercadopago` (npm)
- **Endpoints necesarios:**
  - Crear preferencia de pago
  - Crear suscripción
  - Cancelar suscripción
  - Webhook para notificaciones

### Webhooks de MercadoPago

Eventos a escuchar:
- `payment.created` - Pago creado
- `payment.approved` - Pago aprobado
- `payment.rejected` - Pago rechazado
- `subscription.authorized` - Suscripción autorizada
- `subscription.paused` - Suscripción pausada
- `subscription.cancelled` - Suscripción cancelada

---

## 12. CHECKLIST DE IMPLEMENTACIÓN

### Backend

- [ ] Actualizar schema Prisma con campos adicionales
- [ ] Crear servicio `services/billing/mercadopago.js`
- [ ] Crear servicio `services/billing/subscriptions.js`
- [ ] Crear controlador `controllers/billingController.js`
- [ ] Crear rutas `routes/billing.js`
- [ ] Crear endpoint de webhooks
- [ ] Crear middleware de verificación de suscripción
- [ ] Crear middleware de verificación de límites de plan

### Frontend

- [ ] Página pública de precios `/precios`
- [ ] Página de planes (logueado)
- [ ] Componente de checkout
- [ ] Página "Mi suscripción"
- [ ] Historial de pagos
- [ ] Panel root: dashboard billing
- [ ] Panel root: lista de suscripciones
- [ ] Panel root: gestión de promociones
- [ ] Componente de "Upgrade" para features bloqueadas
- [ ] Emails automatizados (integrar con servicio de email)

### Testing

- [ ] Probar flujo completo en sandbox de MercadoPago
- [ ] Probar webhooks con ngrok
- [ ] Probar cambios de plan
- [ ] Probar extensiones de trial
- [ ] Probar oferta de acompañamiento

---

*Documento generado para referencia en futuras conversaciones.*
