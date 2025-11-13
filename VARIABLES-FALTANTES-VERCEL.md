# ⚠️ Variables de Entorno Faltantes en Vercel

## 🔴 Problema Actual

Los logs de Vercel muestran errores porque **faltan variables críticas**:

```
❌ No API key found in request  
❌ Supabase error: 401
❌ Dynamic server usage errors
```

## 📋 Variables Que SÍ Están Configuradas

Según la captura de pantalla, ya tienes:
- ✅ `NEXTAUTH_URL`
- ✅ `NEXTAUTH_SECRET`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `MANYCHAT_API_KEY`
- ✅ `NEXT_PUBLIC_META_PIXEL_ID`
- ✅ `NEXT_PUBLIC_GA_MEASUREMENT_ID`

## 🚨 Variables Que FALTAN (Críticas)

### 1. **DATABASE_URL** - OBLIGATORIA

Esta es la más importante. Sin ella, Prisma no puede conectarse a la base de datos.

```bash
DATABASE_URL=postgresql://postgres:[TU-PASSWORD]@db.[TU-PROJECT].supabase.co:5432/postgres
```

**Cómo obtenerla:**
1. Ve a Supabase → Settings → Database
2. Copia la **Connection String** (sección "Connection String")
3. Reemplaza `[YOUR-PASSWORD]` con tu contraseña real de Supabase

### 2. **SUPABASE_SERVICE_KEY** - FALTA RENOMBRAR

Tienes `SUPABASE_SERVICE_ROLE_KEY` pero el código busca `SUPABASE_SERVICE_KEY`.

**Opción A - Renombrar (Recomendado)**:
1. En Vercel → Environment Variables
2. Copia el valor de `SUPABASE_SERVICE_ROLE_KEY`
3. Crea nueva variable: `SUPABASE_SERVICE_KEY` con el mismo valor
4. Opcional: Elimina `SUPABASE_SERVICE_ROLE_KEY` (si no se usa)

**Opción B - Duplicar**:
- Deja ambas variables con el mismo valor

### 3. **SUPABASE_URL** - FALTA (Tienes NEXT_PUBLIC_SUPABASE_URL)

El código backend necesita `SUPABASE_URL` (sin el prefijo `NEXT_PUBLIC_`).

```bash
SUPABASE_URL=https://[TU-PROJECT].supabase.co
```

**Cómo obtenerla:**
- Es el mismo valor que `NEXT_PUBLIC_SUPABASE_URL` pero sin el prefijo
- Copia el valor de `NEXT_PUBLIC_SUPABASE_URL` y crea una nueva variable `SUPABASE_URL`

### 4. **GOOGLE_CLIENT_ID** y **GOOGLE_CLIENT_SECRET** - FALTAN

Para que funcione el botón "Iniciar sesión con Google".

```bash
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu-secret
```

**Cómo obtenerlas:**
- Sigue la guía en `GOOGLE-OAUTH-SETUP.md`
- O usa las que ya tienes en tu `.env.local`

## 🔧 Resumen de Acciones Necesarias

### En Vercel → Settings → Environment Variables:

1. **AGREGAR** `DATABASE_URL` ← **CRÍTICO**
   - De Supabase → Database → Connection String

2. **AGREGAR** `SUPABASE_SERVICE_KEY` 
   - Mismo valor que `SUPABASE_SERVICE_ROLE_KEY`

3. **AGREGAR** `SUPABASE_URL`
   - Mismo valor que `NEXT_PUBLIC_SUPABASE_URL`

4. **AGREGAR** `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
   - De Google Cloud Console

### Después de Agregar las Variables:

1. Ve a **Deployments**
2. Click en el último deployment
3. Click en **"Redeploy"**
4. Selecciona **"Use existing Build Cache"** para que sea más rápido

## ✅ Cómo Verificar

Después del redeploy, verifica que NO haya estos errores en los logs:
- ❌ `No API key found in request` 
- ❌ `Supabase error: 401`

Si desaparecen, las variables están correctas.

## 📝 Notas Importantes

### Sobre los Errores "Dynamic Server Usage"

```
Dynamic server usage: Route /api/dashboard/metrics couldn't be rendered statically
```

**Estos son NORMALES y NO son un problema**. Next.js intenta pre-renderizar las rutas API durante el build, pero las rutas API son dinámicas por naturaleza. El sistema funciona correctamente en runtime.

### Sobre el Error de Redis

```
Error: Connection is closed
```

Este error es porque no tienes `REDIS_URL` configurada. Redis es **opcional** - el sistema funciona sin ella, solo será más lento sin caché.

## 🎯 Orden de Prioridad

1. 🔴 **DATABASE_URL** (Sin esta, nada funciona)
2. 🟡 **SUPABASE_SERVICE_KEY** (Para operaciones backend)
3. 🟡 **SUPABASE_URL** (Para operaciones backend)
4. 🟢 **GOOGLE_CLIENT_ID/SECRET** (Solo para Google OAuth)
5. ⚪ **REDIS_URL** (Opcional - solo para caché)

---

**Siguiente paso**: Agrega estas 3-4 variables en Vercel y haz un Redeploy.

