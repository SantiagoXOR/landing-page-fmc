# Variables de Entorno Requeridas

Este documento lista TODAS las variables de entorno necesarias para el funcionamiento completo del CRM.

## 📋 Variables Obligatorias

### Base de Datos (Supabase)

```bash
# URL de conexión a PostgreSQL
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# URL del proyecto Supabase
SUPABASE_URL=https://[PROJECT].supabase.co

# Service Role Key (backend)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anon Key (frontend) - Opcional si usas Service Key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Autenticación (NextAuth)

```bash
# URL del sitio (cambia según ambiente)
NEXTAUTH_URL=https://www.formosafmc.com.ar

# Secret para encriptar tokens (genera con: openssl rand -base64 32)
NEXTAUTH_SECRET=tu-secret-super-seguro-de-32-caracteres-minimo
```

### Google OAuth (NUEVO)

```bash
# Client ID de Google Cloud Console
GOOGLE_CLIENT_ID=123456789-abc...xyz.apps.googleusercontent.com

# Client Secret de Google Cloud Console
GOOGLE_CLIENT_SECRET=GOCSPX-tu-client-secret-aqui
```

## 📦 Variables Opcionales (Pero Recomendadas)

### Manychat Integration

```bash
# API Key de Manychat
MANYCHAT_API_KEY=tu-manychat-api-key

# Webhook Secret (para verificar webhooks)
MANYCHAT_WEBHOOK_SECRET=tu-webhook-secret
```

### WhatsApp Business API

```bash
# Meta Business Account ID
WHATSAPP_BUSINESS_ACCOUNT_ID=tu-business-account-id

# Phone Number ID
WHATSAPP_PHONE_NUMBER_ID=tu-phone-number-id

# Access Token permanente
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxx...

# Token para verificar webhooks
WHATSAPP_VERIFY_TOKEN=tu-token-de-verificacion-personalizado
```

### Redis (Caché)

```bash
# URL de Redis (si usas Upstash)
REDIS_URL=redis://default:[PASSWORD]@[HOST]:6379

# O Upstash REST API
UPSTASH_REDIS_REST_URL=https://[PROJECT].upstash.io
UPSTASH_REDIS_REST_TOKEN=tu-token-de-upstash
```

### Analytics & Monitoreo

```bash
# Meta Pixel ID
NEXT_PUBLIC_META_PIXEL_ID=1234567890123456

# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Sentry (monitoreo de errores)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=tu-sentry-auth-token
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

## 🔧 Configuración por Ambiente

### Desarrollo Local (.env.local)

```bash
# Base de datos
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=desarrollo-local-secret-no-usar-en-produccion

# Google OAuth
GOOGLE_CLIENT_ID=[TU-CLIENT-ID]
GOOGLE_CLIENT_SECRET=[TU-CLIENT-SECRET]

# Manychat (opcional)
MANYCHAT_API_KEY=[TU-KEY]

# WhatsApp (opcional)
WHATSAPP_PHONE_NUMBER_ID=[TU-ID]
WHATSAPP_ACCESS_TOKEN=[TU-TOKEN]
```

### Producción (Vercel)

Agrega las mismas variables pero con valores de producción en:
**Vercel Dashboard → Settings → Environment Variables**

**IMPORTANTE**: 
- `NEXTAUTH_URL` debe ser `https://www.formosafmc.com.ar`
- Las callback URLs de Google deben coincidir con este dominio

## 🎯 Cómo Obtener Cada Variable

### DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. **Settings → Database**:
   - Copia la **Connection String** (PostgreSQL)
3. **Settings → API**:
   - Copia **Project URL** → `SUPABASE_URL`
   - Copia **service_role** key → `SUPABASE_SERVICE_KEY`

### NEXTAUTH_SECRET

Genera un secret seguro:

```bash
# En terminal (Linux/Mac)
openssl rand -base64 32

# En PowerShell (Windows)
-join ((33..126) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET

Ver archivo `GOOGLE-OAUTH-SETUP.md` para instrucciones detalladas.

### MANYCHAT_API_KEY

1. Ve a [Manychat](https://manychat.com)
2. **Settings → API**
3. Copia tu API Key

### WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Selecciona tu app de WhatsApp Business
3. **WhatsApp → API Setup**:
   - **Phone Number ID**: Copia el ID
   - **Access Token**: Genera un token permanente

### UPSTASH_REDIS_REST_URL y TOKEN

1. Crea cuenta en [Upstash](https://upstash.com/)
2. Crea una base de datos Redis
3. Copia **REST URL** y **REST TOKEN**

### NEXT_PUBLIC_META_PIXEL_ID

1. Ve a [Meta Business Suite](https://business.facebook.com/)
2. **Events Manager**
3. Copia tu Pixel ID (solo números)

### NEXT_PUBLIC_GA_ID

1. Ve a [Google Analytics](https://analytics.google.com/)
2. **Admin → Property Settings**
3. Copia tu **Measurement ID** (formato: G-XXXXXXXXXX)

## ⚠️ Notas Importantes

### Variables Públicas (NEXT_PUBLIC_*)

Las variables que comienzan con `NEXT_PUBLIC_` se exponen al navegador:
- Solo usa para información pública (IDs de tracking, etc.)
- NUNCA pongas secrets con este prefijo

### Secrets Sensibles

Estas variables NUNCA deben exponerse:
- `DATABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `MANYCHAT_API_KEY`
- `WHATSAPP_ACCESS_TOKEN`

### Rotación de Secrets

Se recomienda rotar periódicamente:
- `NEXTAUTH_SECRET`: Cada 6 meses
- `WHATSAPP_ACCESS_TOKEN`: Cada año
- `MANYCHAT_API_KEY`: Solo si se compromete

## 🧪 Verificación

Para verificar que las variables están configuradas correctamente:

```bash
# Desarrollo local
npm run dev

# Verifica en la terminal que NO veas errores como:
# ❌ "GOOGLE_CLIENT_ID is not defined"
# ❌ "Database connection error"
# ❌ "NEXTAUTH_SECRET is not configured"
```

En producción, verifica los **Runtime Logs** en Vercel.

## 📞 Troubleshooting

### "Invalid client credentials"
- Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` sean correctos
- Verifica que estén configurados en el ambiente correcto (Production/Preview)

### "Database connection failed"
- Verifica el formato de `DATABASE_URL`
- Verifica que la IP de Vercel esté permitida en Supabase
- Verifica que el password sea correcto

### "Session token is invalid"
- Regenera `NEXTAUTH_SECRET`
- Limpia cookies del navegador
- Re-despliega en Vercel

---

✅ **Todas las Variables Documentadas**

**Siguiente paso**: Configurar estas variables en Vercel y hacer un redeploy.

