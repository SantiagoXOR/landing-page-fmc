# Guía de Deployment - CRM + Landing Page para Phronencial

## Resumen del Proyecto

Este proyecto integra:
- **Landing Page FMC**: Página principal con formulario de solicitud de crédito
- **CRM**: Sistema de gestión de leads con autenticación
- **ManyChat Integration**: Bot de WhatsApp para captura de leads
- **Supabase**: Base de datos para almacenamiento de datos

## Arquitectura

- **Ruta principal (`/`)**: Landing page pública
- **Rutas protegidas (`/auth/*`, `/dashboard/*`)**: CRM con autenticación
- **API Routes (`/api/*`)**: Webhooks y endpoints para integraciones

## Pasos de Deployment en Vercel

### 1. Preparación del Repositorio

1. **Crear nuevo repositorio en GitHub**:
   - Nombre: `phronencial-crm-landing`
   - Propietario: Cuenta de Phronencial
   - Visibilidad: Privado (recomendado)

2. **Subir código**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: CRM + Landing Page integration"
   git branch -M main
   git remote add origin https://github.com/phronencial/phronencial-crm-landing.git
   git push -u origin main
   ```

### 2. Configuración en Vercel

1. **Acceder a Vercel**:
   - URL: https://vercel.com
   - Login con cuenta: phronencialredes@gmail.com

2. **Importar proyecto**:
   - Click en "New Project"
   - Conectar con GitHub
   - Seleccionar repositorio `phronencial-crm-landing`
   - Framework: Next.js (auto-detectado)
   - Root Directory: `.` (raíz del proyecto)

3. **Configuración del proyecto**:
   - **Project Name**: `phronencial-crm-landing`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### 3. Variables de Entorno

Agregar las siguientes variables en **Settings > Environment Variables**:

#### Autenticación
```
NEXTAUTH_URL = https://phronencial-crm-landing.vercel.app
NEXTAUTH_SECRET = [generar nuevo secret de 32 caracteres]
```

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL = [URL de tu proyecto Supabase]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [Anon key de Supabase]
SUPABASE_SERVICE_ROLE_KEY = [Service role key de Supabase]
```

#### WhatsApp/ManyChat
```
WHATSAPP_TOKEN = [Token de WhatsApp Business API]
ALLOWED_WEBHOOK_TOKEN = [Token para validar webhooks]
MANYCHAT_API_KEY = [API key de ManyChat]
```

#### Sentry (Opcional)
```
SENTRY_ORG = [Nombre de tu organización en Sentry]
SENTRY_PROJECT = [Nombre del proyecto en Sentry]
SENTRY_AUTH_TOKEN = [Token de autenticación de Sentry]
```

**Importante**: Marcar como sensibles todas las variables que contengan secrets o tokens.

### 4. Dominio Personalizado (Opcional)

Si tienes un dominio personalizado:

1. **En Vercel**:
   - Ir a Settings > Domains
   - Agregar dominio personalizado
   - Seguir instrucciones de configuración DNS

2. **Actualizar variables**:
   - Cambiar `NEXTAUTH_URL` al nuevo dominio
   - Actualizar URLs en ManyChat si es necesario

### 5. Configuración de Webhooks

#### ManyChat
1. **Acceder a ManyChat**:
   - URL: https://manychat.com
   - Login con cuenta de Phronencial

2. **Configurar webhook**:
   - URL: `https://phronencial-crm-landing.vercel.app/api/webhooks/whatsapp`
   - Método: POST
   - Headers: `Authorization: Bearer [ALLOWED_WEBHOOK_TOKEN]`

#### WhatsApp Business API (si se usa directamente)
1. **En Meta for Developers**:
   - Ir a tu app de WhatsApp Business
   - Configurar webhook URL
   - URL: `https://phronencial-crm-landing.vercel.app/api/webhooks/whatsapp`
   - Verify token: usar el mismo `ALLOWED_WEBHOOK_TOKEN`

## Verificación Post-Deployment

### 1. Landing Page
- [ ] La página principal carga correctamente
- [ ] El formulario de solicitud de crédito funciona
- [ ] Las imágenes y fuentes cargan correctamente
- [ ] Los enlaces de navegación funcionan
- [ ] El botón "CRM" redirige a `/auth/signin`

### 2. CRM
- [ ] Login funciona en `/auth/signin`
- [ ] Dashboard carga después del login
- [ ] CRUD de leads funciona
- [ ] Pipeline de ventas funciona
- [ ] ManyChat dashboard es accesible

### 3. Webhooks
- [ ] Webhook responde correctamente a verificación GET
- [ ] Mensajes de WhatsApp crean/actualizan leads
- [ ] Los eventos se registran en Supabase

### 4. Integraciones
- [ ] ManyChat envía datos correctamente
- [ ] Los leads aparecen en el CRM
- [ ] Las notificaciones funcionan

## Estructura de Archivos

```
phorencial-bot-crm/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page principal
│   │   ├── auth/                    # Rutas de autenticación
│   │   ├── dashboard/               # CRM (protegido)
│   │   └── api/                     # API routes
│   ├── components/
│   │   ├── landing/                 # Componentes de landing page
│   │   └── ui/                      # Componentes UI compartidos
│   └── lib/
│       ├── landing-utils.ts         # Utilidades para landing
│       └── landing-images.ts        # Helper de imágenes
├── public/
│   ├── fonts/acto/                  # Fuentes Acto
│   └── landing/                     # Assets de landing page
└── docs/                           # Documentación
```

## Troubleshooting

### Problemas Comunes

1. **Error de build en Vercel**:
   - Verificar que todas las dependencias estén en `package.json`
   - Revisar logs de build en Vercel dashboard

2. **Imágenes no cargan**:
   - Verificar rutas en `public/landing/`
   - Asegurar que las imágenes estén en el repositorio

3. **Webhooks no funcionan**:
   - Verificar URLs en ManyChat
   - Revisar logs de API en Vercel
   - Confirmar que `ALLOWED_WEBHOOK_TOKEN` sea correcto

4. **Autenticación falla**:
   - Verificar `NEXTAUTH_URL` y `NEXTAUTH_SECRET`
   - Confirmar configuración de Supabase

### Logs y Debugging

1. **Vercel Logs**:
   - Ir a Functions tab en Vercel dashboard
   - Revisar logs de API routes

2. **Supabase Logs**:
   - Ir a Logs en Supabase dashboard
   - Revisar queries y errores

3. **ManyChat Logs**:
   - Revisar webhook delivery en ManyChat
   - Verificar respuestas del servidor

## Mantenimiento

### Actualizaciones
- Hacer cambios en branch `develop`
- Probar localmente antes de merge
- Deploy automático a producción desde `main`

### Backup
- Supabase tiene backup automático
- Exportar datos regularmente
- Mantener backup de configuración de Vercel

### Monitoreo
- Usar Sentry para errores
- Monitorear métricas de Vercel
- Revisar logs de webhooks regularmente

## Contacto

Para soporte técnico:
- Email: phronencialredes@gmail.com
- Documentación: Ver archivos en `/docs/`
- Issues: Crear en GitHub repository
