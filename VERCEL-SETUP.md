# Configuración de Vercel para Landing Page FMC

Este documento describe los pasos para configurar el proyecto en Vercel después de la migración al repositorio `landing-page-fmc`.

## 📋 Pasos de Configuración

### 1. Conectar Repositorio en Vercel

1. Ve a tu dashboard de Vercel: https://vercel.com/xorarg/landing-page-fmc
2. Si no está conectado, click en **"Connect Git Repository"**
3. Selecciona el repositorio: `SantiagoXOR/landing-page-fmc`
4. Vercel detectará automáticamente que es un proyecto Next.js

### 2. Configurar Variables de Entorno

Ve a **Settings → Environment Variables** y agrega las siguientes:

#### Variables de Base de Datos (Supabase)

```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_SERVICE_KEY=[TU-SERVICE-KEY]
```

#### Variables de Autenticación (NextAuth)

```bash
NEXTAUTH_URL=https://www.formosafmc.com.ar
NEXTAUTH_SECRET=[GENERAR-CON: openssl rand -base64 32]

# Google OAuth (NUEVO)
GOOGLE_CLIENT_ID=[TU-GOOGLE-CLIENT-ID]
GOOGLE_CLIENT_SECRET=[TU-GOOGLE-CLIENT-SECRET]
```

#### Variables de Integraciones

```bash
# Manychat
MANYCHAT_API_KEY=[TU-MANYCHAT-API-KEY]

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=[TU-PHONE-NUMBER-ID]
WHATSAPP_ACCESS_TOKEN=[TU-ACCESS-TOKEN]
WHATSAPP_BUSINESS_ACCOUNT_ID=[TU-BUSINESS-ACCOUNT-ID]
WHATSAPP_VERIFY_TOKEN=[TU-VERIFY-TOKEN]

# Meta Pixel
NEXT_PUBLIC_META_PIXEL_ID=[TU-PIXEL-ID]

# Google Analytics
NEXT_PUBLIC_GA_ID=[TU-GA-ID]
```

#### Variables de Redis (Opcional)

```bash
REDIS_URL=[TU-REDIS-URL]
UPSTASH_REDIS_REST_URL=[TU-UPSTASH-URL]
UPSTASH_REDIS_REST_TOKEN=[TU-UPSTASH-TOKEN]
```

### 3. Configurar Google OAuth

Para obtener las credenciales de Google:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services → Credentials**
4. Click en **Create Credentials → OAuth Client ID**
5. Selecciona **Web Application**
6. Configura las URLs autorizadas:
   - **Authorized JavaScript origins**: 
     - `https://www.formosafmc.com.ar`
     - `https://landing-page-fmc.vercel.app`
   - **Authorized redirect URIs**:
     - `https://www.formosafmc.com.ar/api/auth/callback/google`
     - `https://landing-page-fmc.vercel.app/api/auth/callback/google`
7. Copia el **Client ID** y **Client Secret**
8. Agrégalos a las variables de entorno en Vercel

### 4. Configurar Dominio Personalizado

1. En Vercel, ve a **Settings → Domains**
2. Click en **Add Domain**
3. Ingresa: `www.formosafmc.com.ar`
4. Click en **Add**
5. Vercel te dará instrucciones para configurar el DNS:

#### Opción A: CNAME Record
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### Opción B: A Record
```
Type: A
Name: www
Value: 76.76.21.21
```

6. También agrega el dominio raíz (opcional):
   - Dominio: `formosafmc.com.ar`
   - Vercel lo redirigirá automáticamente a `www.formosafmc.com.ar`

### 5. Configurar Build Settings

Vercel debería detectar automáticamente:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

El script `postinstall` en `package.json` ejecutará automáticamente `prisma generate`.

### 6. Desplegar

1. Click en **Deploy** o espera el deploy automático
2. Vercel construirá y desplegará el proyecto
3. Verifica que no haya errores en los **Build Logs**

## 🔍 Verificación Post-Deploy

### Verificar que todo funcione:

1. **Landing Page**: https://www.formosafmc.com.ar/
   - ✅ Hero con imágenes
   - ✅ Formulario de crédito
   - ✅ Testimonios
   - ✅ Icono de usuario en header

2. **Autenticación**: https://www.formosafmc.com.ar/auth/signin
   - ✅ Login con credenciales
   - ✅ Login con Google (botón visible)
   - ✅ Redirección correcta después del login

3. **CRM Dashboard**: https://www.formosafmc.com.ar/dashboard
   - ✅ Requiere autenticación
   - ✅ Dashboard con métricas
   - ✅ Sidebar con navegación

4. **APIs**:
   - ✅ `/api/health` - Health check
   - ✅ `/api/leads` - CRUD de leads
   - ✅ `/api/dashboard/metrics` - Métricas
   - ✅ `/api/manychat/health` - Manychat status

## 🚨 Solución de Problemas

### Error: "Dynamic server usage: Route couldn't be rendered statically"

Esto es normal para rutas API. Next.js intentará pre-renderizarlas durante el build pero fallará. Las rutas funcionarán correctamente en runtime.

### Error: "MANYCHAT_API_KEY no configurado"

Agrega la variable de entorno `MANYCHAT_API_KEY` en Vercel. Las integraciones de Manychat no funcionarán sin esta key.

### Error: "Database connection error"

Verifica que:
- `DATABASE_URL` esté configurada correctamente
- `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` estén correctas
- Tu IP de Vercel esté en la whitelist de Supabase (o deshabilita la restricción de IP)

### Error: Google OAuth no funciona

Verifica:
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén correctas
- Las URLs de callback estén configuradas en Google Cloud Console
- `NEXTAUTH_URL` apunte al dominio correcto

## 📊 Monitoreo

Una vez desplegado, monitorea:

- **Build Logs**: Para ver si hay errores de compilación
- **Runtime Logs**: Para ver errores en producción
- **Analytics**: Para ver tráfico y performance
- **Observability**: Para métricas de edge requests

## 🎯 URLs Finales

- **Landing Page**: https://www.formosafmc.com.ar
- **Login**: https://www.formosafmc.com.ar/auth/signin
- **CRM**: https://www.formosafmc.com.ar/dashboard
- **API Health**: https://www.formosafmc.com.ar/api/health

## 📞 Soporte

Si hay problemas con el deploy:

1. Revisa los **Build Logs** en Vercel
2. Verifica las variables de entorno
3. Verifica la conexión a Supabase
4. Revisa los **Runtime Logs** para errores en producción

---

✅ **Proyecto Migrado Exitosamente al Repositorio landing-page-fmc**

