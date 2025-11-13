# Configuración de Variables de Entorno

Esta guía te muestra exactamente qué variables necesitas en `.env.local` (desarrollo) y en Vercel (producción).

## 📁 Archivo `.env.local` (Desarrollo Local)

Crea un archivo `.env.local` en la raíz del proyecto con estas variables:

```bash
# ==================================
# BASE DE DATOS (SUPABASE) - OBLIGATORIO
# ==================================
DATABASE_URL=postgresql://postgres:[TU-PASSWORD]@db.[TU-PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[TU-PROJECT].supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==================================
# AUTENTICACIÓN (NEXTAUTH) - OBLIGATORIO
# ==================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=desarrollo-local-secret-cambiar-en-produccion

# ==================================
# GOOGLE OAUTH - OBLIGATORIO
# ==================================
GOOGLE_CLIENT_ID=123456789-abc...xyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu-client-secret-aqui

# ==================================
# MANYCHAT - OPCIONAL
# ==================================
MANYCHAT_API_KEY=tu-manychat-api-key

# ==================================
# WHATSAPP - OPCIONAL
# ==================================
WHATSAPP_PHONE_NUMBER_ID=tu-phone-number-id
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxx...
WHATSAPP_BUSINESS_ACCOUNT_ID=tu-business-account-id
WHATSAPP_VERIFY_TOKEN=tu-token-verificacion

# ==================================
# REDIS - OPCIONAL
# ==================================
REDIS_URL=redis://default:[PASSWORD]@[HOST]:6379
UPSTASH_REDIS_REST_URL=https://[PROJECT].upstash.io
UPSTASH_REDIS_REST_TOKEN=tu-token

# ==================================
# ANALYTICS - OPCIONAL
# ==================================
NEXT_PUBLIC_META_PIXEL_ID=1234567890123456
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## ☁️ Variables en Vercel (Producción)

En Vercel → Settings → Environment Variables, agrega **EXACTAMENTE LAS MISMAS** variables pero con estos cambios:

### ✅ Cambios Críticos para Producción:

1. **NEXTAUTH_URL**:
```bash
# Desarrollo (.env.local):
NEXTAUTH_URL=http://localhost:3000

# Producción (Vercel):
NEXTAUTH_URL=https://www.formosafmc.com.ar
```

2. **NEXTAUTH_SECRET**:
```bash
# Genera un secret nuevo para producción con:
openssl rand -base64 32

# O en PowerShell:
-join ((33..126) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

3. **Callback URLs de Google**:
   - En Google Cloud Console, asegúrate de tener ambos:
     - `http://localhost:3000/api/auth/callback/google` (desarrollo)
     - `https://www.formosafmc.com.ar/api/auth/callback/google` (producción)

## 🎯 Variables Mínimas para que Funcione

Si quieres empezar rápido, **estas son las mínimas obligatorias**:

```bash
# Base de datos
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...

# Auth
NEXTAUTH_URL=http://localhost:3000 (o https://www.formosafmc.com.ar en Vercel)
NEXTAUTH_SECRET=tu-secret-aqui

# Google OAuth
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

Con solo estas 6 variables:
- ✅ El CRM funcionará
- ✅ Login con credenciales funcionará
- ✅ Login con Google funcionará
- ✅ Dashboard y leads funcionarán

**Sin estas NO funcionarán**:
- ❌ Manychat (necesita `MANYCHAT_API_KEY`)
- ❌ WhatsApp (necesita `WHATSAPP_*`)
- ❌ Redis caché (necesita `REDIS_URL`)
- ❌ Analytics (necesita `NEXT_PUBLIC_META_PIXEL_ID`)

## 📋 Cómo Configurar en Vercel (Paso a Paso)

1. Ve a https://vercel.com/xorarg/landing-page-fmc
2. Click en **"Settings"**
3. Click en **"Environment Variables"** en el menú izquierdo
4. Para cada variable:
   - **Key**: Nombre de la variable (ej: `DATABASE_URL`)
   - **Value**: El valor real
   - **Environments**: Selecciona **Production**, **Preview**, y **Development**
   - Click en **"Save"**

## 🔍 Verificar Variables en Vercel

Después de agregar las variables:

1. Ve a **Deployments**
2. Click en **"Redeploy"** en el último deployment
3. Espera a que termine el build
4. Si ves errores como:
   - `GOOGLE_CLIENT_ID is not defined` → Falta agregar esa variable
   - `Database connection error` → `DATABASE_URL` incorrecta
   - `Invalid client credentials` → `GOOGLE_CLIENT_SECRET` incorrecta

## 🚨 Errores Comunes

### Error: "Configuration error - Check the server logs"
**Causa**: Faltan `GOOGLE_CLIENT_ID` o `GOOGLE_CLIENT_SECRET`
**Solución**: Agrégalas en Vercel y redeploy

### Error: "redirect_uri_mismatch"
**Causa**: La URL de callback no está autorizada en Google Cloud Console
**Solución**: Agrega `https://www.formosafmc.com.ar/api/auth/callback/google` en Google Cloud Console → Credentials

### Error: "Database connection error"
**Causa**: `DATABASE_URL` incorrecta o IP de Vercel bloqueada en Supabase
**Solución**:
1. Verifica el connection string en Supabase
2. Ve a Supabase → Settings → Database → Connection pooling
3. Usa el **Pooler connection string** en lugar del direct connection

## 📞 Orden de Prioridad

Si no tienes todo configurado, hazlo en este orden:

1. **Base de datos** (DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY)
2. **Auth básica** (NEXTAUTH_URL, NEXTAUTH_SECRET)
3. **Google OAuth** (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
4. **Manychat** (MANYCHAT_API_KEY)
5. **WhatsApp** (WHATSAPP_*)
6. **Redis** (REDIS_URL)
7. **Analytics** (NEXT_PUBLIC_*)

---

✅ **Build Corregido - Error de TypeScript Resuelto**

El error del build ya está arreglado en el último commit. Ahora solo necesitas:
1. Configurar las variables de entorno en Vercel
2. El próximo deploy debería ser exitoso

