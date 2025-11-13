# Configuración de Google OAuth para el CRM

Esta guía te ayudará a configurar Google OAuth en el proyecto para permitir que los usuarios inicien sesión con sus cuentas de Google.

## 📋 Requisitos Previos

- Cuenta de Google
- Acceso a [Google Cloud Console](https://console.cloud.google.com/)
- Acceso al panel de Vercel

## 🔧 Paso 1: Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Click en el selector de proyectos en la parte superior
3. Click en **"New Project"**
4. Nombre del proyecto: `Formosa Moto Credito CRM` (o el que prefieras)
5. Click en **"Create"**
6. Espera a que se cree el proyecto y selecciónalo

## 🔑 Paso 2: Configurar Pantalla de Consentimiento OAuth

1. En el menú lateral, ve a **APIs & Services → OAuth consent screen**
2. Selecciona **"External"** (para permitir cualquier cuenta de Google)
3. Click en **"Create"**
4. Completa la información:
   - **App name**: Formosa Moto Crédito CRM
   - **User support email**: Tu email
   - **App logo**: (Opcional) Sube el logo de FMC
   - **App domain**:
     - Homepage: `https://www.formosafmc.com.ar`
     - Privacy Policy: `https://www.formosafmc.com.ar/privacy` (si tienes)
     - Terms of Service: `https://www.formosafmc.com.ar/terms` (si tienes)
   - **Authorized domains**: `formosafmc.com.ar`
   - **Developer contact**: Tu email
5. Click en **"Save and Continue"**
6. En **"Scopes"**, agrega:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
7. Click en **"Save and Continue"**
8. En **"Test users"** (opcional), agrega emails de prueba
9. Click en **"Save and Continue"**
10. Revisa y click en **"Back to Dashboard"**

## 🎫 Paso 3: Crear Credenciales OAuth

1. En el menú lateral, ve a **APIs & Services → Credentials**
2. Click en **"+ CREATE CREDENTIALS"**
3. Selecciona **"OAuth client ID"**
4. Selecciona **"Web application"**
5. Configura:
   - **Name**: FMC CRM Web Client
   - **Authorized JavaScript origins**:
     ```
     https://www.formosafmc.com.ar
     https://landing-page-fmc.vercel.app
     http://localhost:3000 (para desarrollo)
     ```
   - **Authorized redirect URIs**:
     ```
     https://www.formosafmc.com.ar/api/auth/callback/google
     https://landing-page-fmc.vercel.app/api/auth/callback/google
     http://localhost:3000/api/auth/callback/google (para desarrollo)
     ```
6. Click en **"Create"**
7. Se mostrarán tus credenciales:
   - **Client ID**: Algo como `123456789-abc...xyz.apps.googleusercontent.com`
   - **Client Secret**: Algo como `GOCSPX-...`
8. **¡IMPORTANTE!** Copia estas credenciales inmediatamente

## 🔐 Paso 4: Agregar Credenciales a Vercel

1. Ve al proyecto en Vercel: https://vercel.com/xorarg/landing-page-fmc
2. Ve a **Settings → Environment Variables**
3. Agrega las siguientes variables:

```bash
GOOGLE_CLIENT_ID=tu-client-id-completo.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu-client-secret
```

4. Selecciona los ambientes: **Production**, **Preview**, y **Development**
5. Click en **"Save"**

## 💻 Paso 5: Configurar Variables Locales (Desarrollo)

Para desarrollo local, agrega las mismas variables a tu archivo `.env.local`:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=tu-client-id-completo.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu-client-secret
```

## 🚀 Paso 6: Re-desplegar en Vercel

1. Después de agregar las variables de entorno, Vercel puede hacer un **Redeploy automático**
2. Si no, ve a **Deployments** y click en **"Redeploy"** en el último deployment
3. Espera a que el build termine

## ✅ Paso 7: Verificar Funcionamiento

### Prueba en Desarrollo Local:

```bash
npm run dev
```

1. Ve a http://localhost:3000
2. Click en el icono de usuario o "Iniciar Sesión"
3. Verifica que veas el botón "Iniciar sesión con Google"
4. Click en el botón de Google
5. Deberías ser redirigido a la pantalla de consentimiento de Google
6. Después de autorizar, deberías volver al CRM autenticado

### Prueba en Producción:

1. Ve a https://www.formosafmc.com.ar
2. Click en el icono de usuario en el header
3. Click en "Iniciar sesión con Google"
4. Autoriza la aplicación
5. Deberías ser redirigido al dashboard del CRM

## 🔍 Funcionalidades Implementadas

### Header de Landing Page

- ✅ Icono de usuario `<UserCircle>` visible en desktop y móvil
- ✅ Redirección a `/auth/signin`
- ✅ Diseño responsive
- ✅ Animaciones y hover effects

### Página de Login

- ✅ Formulario de credenciales (existente)
- ✅ Botón "Iniciar sesión con Google" (nuevo)
- ✅ Divider visual entre opciones
- ✅ Logo de Google oficial

### Backend (NextAuth)

- ✅ `GoogleProvider` configurado
- ✅ Callback `signIn` que crea usuarios automáticamente
- ✅ Nuevos usuarios de Google obtienen rol `VIEWER` por defecto
- ✅ Usuarios existentes mantienen sus roles
- ✅ Compatible con login por credenciales

## 🎨 Comportamiento de Usuarios Google

Cuando un usuario inicia sesión con Google por primera vez:

1. Se crea automáticamente en la base de datos
2. Se le asigna el rol `VIEWER` (permisos de solo lectura)
3. Se extrae su nombre y email de Google
4. Estado: `ACTIVE`
5. No tiene contraseña (hash vacío)

**Nota**: Un administrador puede cambiar manualmente el rol del usuario después en `/dashboard/admin/users`

## 🔒 Seguridad

- ✅ Secrets nunca se exponen en el frontend
- ✅ Callback URLs validadas por Google
- ✅ State parameter para prevenir CSRF
- ✅ Tokens manejados server-side por NextAuth
- ✅ Sesiones JWT encriptadas

## 🚨 Solución de Problemas

### Error: "Configuration error - Check the server logs"

**Causa**: Variables de entorno no configuradas

**Solución**: 
- Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén en Vercel
- Redeploya después de agregar las variables

### Error: "redirect_uri_mismatch"

**Causa**: La URL de callback no está autorizada en Google Cloud Console

**Solución**:
- Ve a Google Cloud Console → Credentials
- Edita tu OAuth Client ID
- Agrega la URL exacta a "Authorized redirect URIs":
  - `https://www.formosafmc.com.ar/api/auth/callback/google`

### Error: "Access blocked: This app's request is invalid"

**Causa**: Scopes no configurados en pantalla de consentimiento

**Solución**:
- Ve a OAuth consent screen
- Agrega los scopes necesarios: `email` y `profile`

### No aparece el botón de Google

**Causa**: Variables de entorno vacías o provider mal configurado

**Solución**:
- Verifica en `src/lib/auth.ts` que GoogleProvider esté en la lista
- Verifica las variables en `.env.local` (local) o Vercel (producción)
- Limpia caché del navegador

## 📚 Referencias

- [NextAuth Google Provider](https://next-auth.js.org/providers/google)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

## ✨ Usuarios de Prueba (Credenciales)

Los siguientes usuarios pueden iniciar sesión con credenciales:

- **ADMIN**: admin@phorencial.com / admin123
- **ANALISTA**: analista@phorencial.com / analista123
- **VENDEDOR**: vendedor@phorencial.com / vendedor123

---

✅ **Google OAuth Configurado y Listo para Usar**

