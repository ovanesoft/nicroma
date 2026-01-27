# 🚀 Guía para reutilizar este template

Este proyecto es un boilerplate completo de autenticación con:
- ✅ Login/Registro con email y contraseña
- ✅ OAuth con Google y Facebook
- ✅ Sistema multi-tenant
- ✅ Verificación de email
- ✅ Recuperación de contraseña
- ✅ Seguridad robusta (rate limiting, XSS, SQL injection protection)
- ✅ Frontend React + Vite + Tailwind
- ✅ Backend Node.js + Express + PostgreSQL
- ✅ Deploy listo para Render

---

## 📋 Checklist: Qué cambiar para un nuevo proyecto

### 1. Nombres y branding

| Archivo | Qué cambiar |
|---------|-------------|
| `frontend/public/logo.png` | Tu nuevo logo |
| `frontend/index.html` | Título y meta tags |
| `frontend/src/pages/*.jsx` | Textos "NicRoma" por tu marca |
| `backend/package.json` | `name` del proyecto |
| `frontend/package.json` | `name` del proyecto |
| `render.yaml` | Nombres de servicios |

### 2. Configuración de servicios externos

#### Google OAuth
1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear nuevo proyecto
3. Habilitar Google+ API
4. Crear credenciales OAuth 2.0
5. Configurar callback URL: `https://api.TUDOMINIO.com/api/auth/google/callback`
6. Guardar Client ID y Client Secret

#### Facebook OAuth
1. Ir a [Facebook Developers](https://developers.facebook.com)
2. Crear nueva app
3. Agregar producto "Facebook Login"
4. Configurar callback URL: `https://api.TUDOMINIO.com/api/auth/facebook/callback`
5. Configurar dominios, política de privacidad, etc.
6. Guardar App ID y App Secret

#### Resend (Email)
1. Ir a [Resend](https://resend.com)
2. Crear cuenta y verificar dominio
3. Obtener API Key

### 3. Variables de entorno (Render)

```env
# Base de datos (automático en Render)
DATABASE_URL=

# JWT (generar con: openssl rand -hex 32)
JWT_SECRET=
JWT_REFRESH_SECRET=
SESSION_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://api.TUDOMINIO.com/api/auth/google/callback

# Facebook OAuth
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_CALLBACK_URL=https://api.TUDOMINIO.com/api/auth/facebook/callback

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=NombreApp <noreply@TUDOMINIO.com>

# Frontend
FRONTEND_URL=https://TUDOMINIO.com
```

### 4. DNS (en tu registrador de dominios)

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | @ | 216.24.57.1 |
| CNAME | www | tu-frontend.onrender.com |
| CNAME | api | tu-backend.onrender.com |

### 5. Render

1. Crear cuenta en [Render](https://render.com)
2. Conectar repositorio de GitHub
3. Usar Blueprint (render.yaml) o crear servicios manualmente
4. Configurar variables de entorno
5. Agregar dominios personalizados

---

## 🔧 Comandos útiles

### Desarrollo local

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configurar variables
npm run dev

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

### Base de datos

```bash
# Crear base de datos local
createdb nombre_proyecto

# Ejecutar schema
psql -d nombre_proyecto -f backend/src/database/schema.sql
```

### Generar secretos

```bash
# JWT secrets
openssl rand -hex 32
```

---

## 📁 Estructura del proyecto

```
proyecto/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, Passport
│   │   ├── controllers/     # Lógica de negocio
│   │   ├── database/        # Schema SQL
│   │   ├── middleware/      # Auth, Security
│   │   ├── routes/          # API endpoints
│   │   └── utils/           # Email, helpers
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/              # Logo, assets
│   ├── src/
│   │   ├── api/             # Axios config
│   │   ├── context/         # Auth context
│   │   └── pages/           # Componentes
│   ├── package.json
│   └── index.html
├── render.yaml              # Deploy config
├── bitacora.md              # Credenciales (gitignored)
└── TEMPLATE_SETUP.md        # Esta guía
```

---

## ⏱️ Tiempo estimado de setup

| Tarea | Tiempo |
|-------|--------|
| Clonar y renombrar | 5 min |
| Crear proyecto Google OAuth | 15 min |
| Crear app Facebook | 20 min |
| Configurar Resend | 10 min |
| Deploy en Render | 15 min |
| Configurar DNS | 10 min |
| **Total** | **~1 hora** |

vs las 8+ horas que tomó crearlo desde cero 😅

---

## 🔒 No olvidar

- [ ] Cambiar contraseña del usuario root
- [ ] Crear nueva bitacora.md (no commitear)
- [ ] Verificar que .gitignore incluye archivos sensibles
- [ ] Probar todos los flujos de auth antes de producción

