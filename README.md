# 🔷 Nicroma

Sistema multi-tenant empresarial con autenticación segura, gestión de usuarios y organizaciones.

## 🚀 Características

- ✅ **Autenticación múltiple**: Email/contraseña, Google OAuth, Facebook OAuth
- ✅ **Multi-tenant**: Soporte para múltiples organizaciones/empresas
- ✅ **Sistema de roles**: Root, Admin, Manager, User
- ✅ **Invitaciones por email**: Invita usuarios a tu organización
- ✅ **Seguridad robusta**:
  - Validación de contraseña fuerte (8+ chars, mayúscula, minúscula, número)
  - Rate limiting para prevenir ataques de fuerza bruta
  - Protección contra SQL Injection, XSS, CSRF
  - Tokens JWT con refresh tokens
  - Bloqueo de cuenta por intentos fallidos
  - Headers de seguridad (Helmet)
- ✅ **UI moderna y responsive**

## 📁 Estructura del Proyecto

```
nicroma/
├── backend/                    # API Node.js + Express
│   ├── src/
│   │   ├── config/            # Configuración (DB, Passport)
│   │   ├── controllers/       # Controladores de la API
│   │   ├── middleware/        # Middlewares (auth, security, validation)
│   │   ├── routes/            # Rutas de la API
│   │   ├── utils/             # Utilidades (JWT, email)
│   │   ├── database/          # Schema SQL
│   │   └── app.js             # Aplicación principal
│   └── package.json
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── api/               # Configuración de Axios
│   │   ├── context/           # Context de autenticación
│   │   ├── pages/             # Páginas (Login, Register, Dashboard)
│   │   └── App.jsx            # Aplicación principal
│   └── package.json
└── README.md
```

## 🛠️ Instalación

### Prerequisitos

- Node.js >= 18
- PostgreSQL >= 14
- Cuenta de Google Cloud (para OAuth)
- Cuenta de Facebook Developers (para OAuth)

### 1. Clonar e instalar dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configurar base de datos PostgreSQL

```bash
# Crear base de datos
createdb nicroma

# O usando psql
psql -U postgres -c "CREATE DATABASE nicroma;"
```

### 3. Configurar variables de entorno

Copia `backend/env.example.txt` a `backend/.env` y configura:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nicroma
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT (genera claves seguras)
JWT_SECRET=tu_clave_secreta_jwt_32_caracteres_minimo
JWT_REFRESH_SECRET=otra_clave_secreta_para_refresh
SESSION_SECRET=clave_para_sesiones

# OAuth (obtener de Google Cloud Console)
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# OAuth Facebook (obtener de Facebook Developers)
FACEBOOK_APP_ID=tu_facebook_app_id
FACEBOOK_APP_SECRET=tu_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/auth/facebook/callback

# Email (para envío de correos)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_app_password
EMAIL_FROM=noreply@nicroma.com

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 4. Inicializar base de datos

```bash
cd backend
npm run db:init
```

Esto creará:
- Todas las tablas necesarias
- Un usuario root: `root@nicroma.com` / `Root@12345`

⚠️ **IMPORTANTE**: Cambia la contraseña del usuario root inmediatamente después de la instalación.

### 5. Iniciar aplicación

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## 🔐 Configurar OAuth

### Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a "APIs & Services" > "Credentials"
4. Crea "OAuth 2.0 Client IDs"
5. Agrega los orígenes autorizados:
   - `http://localhost:3000`
   - `http://localhost:5173`
6. Agrega las URIs de redirección:
   - `http://localhost:3000/api/auth/google/callback`

### Facebook OAuth

1. Ve a [Facebook Developers](https://developers.facebook.com)
2. Crea una nueva aplicación
3. Configura Facebook Login
4. Agrega los dominios permitidos
5. Configura la URI de redirección:
   - `http://localhost:3000/api/auth/facebook/callback`

## 📚 API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
| POST | `/api/auth/refresh` | Refrescar token |
| GET | `/api/auth/me` | Obtener usuario actual |
| GET | `/api/auth/verify-email/:token` | Verificar email |
| POST | `/api/auth/forgot-password` | Solicitar reset de contraseña |
| POST | `/api/auth/reset-password` | Resetear contraseña |
| POST | `/api/auth/change-password` | Cambiar contraseña |
| GET | `/api/auth/google` | Login con Google |
| GET | `/api/auth/facebook` | Login con Facebook |

### Tenants (Organizaciones)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/tenants` | Crear tenant (root) |
| GET | `/api/tenants` | Listar tenants (root) |
| GET | `/api/tenants/:id` | Obtener tenant |
| PUT | `/api/tenants/:id` | Actualizar tenant |
| GET | `/api/tenants/:id/users` | Listar usuarios del tenant |
| POST | `/api/tenants/:id/invite` | Invitar usuario |
| GET | `/api/tenants/:id/invitations` | Listar invitaciones |

### Usuarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| PUT | `/api/users/profile` | Actualizar perfil propio |
| GET | `/api/users` | Listar usuarios (root) |
| POST | `/api/users` | Crear usuario (admin) |
| GET | `/api/users/:id` | Obtener usuario |
| PUT | `/api/users/:id` | Actualizar usuario |
| DELETE | `/api/users/:id` | Desactivar usuario |

### Invitaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/invitations/verify/:token` | Verificar invitación |
| POST | `/api/invitations/accept` | Aceptar invitación |

## 🔒 Medidas de Seguridad Implementadas

1. **Contraseñas**:
   - Hash con bcrypt (cost factor 12)
   - Validación: 8+ caracteres, mayúscula, minúscula, número
   - Detección de contraseñas comunes

2. **Rate Limiting**:
   - General: 100 requests / 15 min
   - Login: 5 intentos / 15 min
   - Registro: 5 / hora
   - Reset password: 3 / hora

3. **Protección de Ataques**:
   - SQL Injection: Queries parametrizadas
   - XSS: Sanitización de inputs, CSP headers
   - CSRF: Tokens, SameSite cookies
   - Clickjacking: X-Frame-Options

4. **Tokens**:
   - Access token: 15 min
   - Refresh token: 30 días
   - Rotación automática de refresh tokens

5. **Cuenta**:
   - Bloqueo tras 5 intentos fallidos (30 min)
   - Verificación de email obligatoria

## 🧑‍💻 Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **root** | Acceso total, crear tenants, ver todos los usuarios |
| **admin** | Administrar tenant, invitar usuarios, gestionar usuarios del tenant |
| **manager** | Ver usuarios del tenant, crear usuarios básicos |
| **user** | Acceso básico, editar perfil propio |

## 🗄️ Esquema de Base de Datos

- `tenants`: Organizaciones/Empresas
- `users`: Usuarios del sistema
- `user_invitations`: Invitaciones pendientes
- `refresh_tokens`: Tokens de refresco
- `audit_logs`: Logs de auditoría
- `sessions`: Sesiones activas

## 📝 Licencia

MIT

---

Desarrollado con ❤️ para Nicroma.com

