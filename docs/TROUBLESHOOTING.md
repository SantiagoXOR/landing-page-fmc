# 🔧 Troubleshooting - CRM Phorencial

> **Guía de Solución de Problemas**  
> **Última actualización:** Octubre 2025

---

## 📋 Índice

1. [Problemas de Setup](#-problemas-de-setup)
2. [Errores de Base de Datos](#-errores-de-base-de-datos)
3. [Problemas de Autenticación](#-problemas-de-autenticación)
4. [Errores del Pipeline](#-errores-del-pipeline)
5. [Problemas de Tests](#-problemas-de-tests)
6. [Errores de Deployment](#-errores-de-deployment)
7. [Performance Issues](#-performance-issues)

---

## 🚨 Problemas Críticos

### Pipeline No Crea Automáticamente ⚠️

**Síntoma:**
```
Error: "No se pudo crear el pipeline"
Console: Failed to create pipeline for lead
```

**Causa:**
Tabla `lead_pipeline` no existe o RLS está bloqueando la operación.

**Solución:**

**Paso 1: Verificar que la tabla existe**
```bash
# Conectar a Supabase y ejecutar:
SELECT * FROM information_schema.tables 
WHERE table_name = 'lead_pipeline';
```

**Paso 2: Ejecutar SQL de creación**
```sql
-- Ir a Supabase → SQL Editor
-- Copiar y ejecutar todo el contenido de:
-- SOLUCION-PIPELINE.md

-- O ejecutar este SQL completo:

CREATE TABLE IF NOT EXISTS lead_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
    current_stage TEXT NOT NULL DEFAULT 'LEAD_NUEVO',
    probability_percent INTEGER DEFAULT 10,
    total_value DECIMAL(15,2) DEFAULT 50000,
    expected_close_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to UUID,
    stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lead_id)
);

ALTER TABLE lead_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated" ON lead_pipeline
    FOR ALL USING (true);

CREATE OR REPLACE FUNCTION create_pipeline_for_new_lead()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO lead_pipeline (lead_id, current_stage)
    VALUES (NEW.id, 'LEAD_NUEVO')
    ON CONFLICT (lead_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_pipeline
    AFTER INSERT ON "Lead"
    FOR EACH ROW
    EXECUTE FUNCTION create_pipeline_for_new_lead();
```

**Paso 3: Verificar**
```bash
npm run dev
# Ir a http://localhost:3000/leads
# Crear un nuevo lead
# No debería haber error
```

**Paso 4: Crear pipelines para leads existentes**
```sql
INSERT INTO lead_pipeline (lead_id, current_stage)
SELECT id, 'LEAD_NUEVO'
FROM "Lead" l
WHERE NOT EXISTS (
    SELECT 1 FROM lead_pipeline lp WHERE lp.lead_id = l.id
);
```

---

## 💻 Problemas de Setup

### Error: `npm install` Falla

**Síntoma:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solución 1: Limpiar y reinstalar**
```bash
# Eliminar node_modules y package-lock.json
rm -rf node_modules package-lock.json

# Limpiar caché de npm
npm cache clean --force

# Reinstalar con flag legacy
npm install --legacy-peer-deps
```

**Solución 2: Usar versión específica de Node**
```bash
# Ver versión actual
node --version

# Debería ser v20.x o superior
# Si no, instalar nvm y cambiar versión

# Windows
nvm install 20
nvm use 20

# Mac/Linux
nvm install 20
nvm alias default 20
```

---

### Error: Variables de Entorno No Se Cargan

**Síntoma:**
```
Error: Invalid Supabase URL or Key
process.env.NEXT_PUBLIC_SUPABASE_URL is undefined
```

**Solución:**

1. **Verificar que `.env.local` existe**
```bash
ls -la | grep .env
# Debe mostrar: .env.local
```

2. **Verificar formato del archivo**
```bash
# .env.local debe tener este formato:
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIs..."

# ❌ INCORRECTO (con espacios):
NEXT_PUBLIC_SUPABASE_URL = "https://xxx.supabase.co"

# ❌ INCORRECTO (sin comillas):
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
```

3. **Reiniciar el servidor**
```bash
# IMPORTANTE: Las variables de entorno solo se cargan al iniciar
# Presiona Ctrl+C y luego:
npm run dev
```

4. **Verificar en código**
```bash
node -e "
require('dotenv').config({ path: '.env.local' });
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configured' : 'Missing');
"
```

---

### Puerto 3000 Ya en Uso

**Síntoma:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solución 1: Matar el proceso**

**Windows:**
```cmd
netstat -ano | findstr :3000
taskkill /PID XXXX /F
```

**Mac/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Solución 2: Usar otro puerto**
```bash
PORT=3001 npm run dev
```

---

## 🗄️ Errores de Base de Datos

### Error de Conexión a Supabase

**Síntoma:**
```
Error: Invalid Supabase URL or Key
Failed to fetch from Supabase
```

**Diagnóstico:**
```bash
# Test rápido de conexión
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

supabase.from('Lead').select('count').then(result => {
  if (result.error) {
    console.error('❌ Error:', result.error.message);
  } else {
    console.log('✅ Conexión exitosa');
  }
});
"
```

**Soluciones:**

1. **Verificar credenciales**
```bash
# Ir a Supabase Dashboard → Settings → API
# Copiar nuevamente:
# - Project URL
# - anon public key
# - service_role key (si usas operaciones admin)
```

2. **Verificar proyecto activo**
- Ve a https://supabase.com/dashboard
- Verifica que el proyecto esté "Active" (no pausado)

3. **Verificar región**
- Si tu región cambió, actualiza la URL

---

### RLS Bloquea Operaciones

**Síntoma:**
```
Error: new row violates row-level security policy
Permission denied for table Lead
```

**Diagnóstico:**
```sql
-- En Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'Lead';
```

**Solución Temporal (Desarrollo):**
```sql
-- SOLO PARA DESARROLLO
-- Deshabilitar RLS temporalmente
ALTER TABLE "Lead" DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_pipeline DISABLE ROW LEVEL SECURITY;

-- Crear política permisiva
CREATE POLICY "Enable all for authenticated" ON "Lead"
    FOR ALL USING (true);
```

**Solución Permanente (Producción):**
```sql
-- Crear políticas granulares por rol
CREATE POLICY "Admins can do everything" ON "Lead"
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Analistas can view and update" ON "Lead"
    FOR SELECT
    USING (auth.jwt() ->> 'role' IN ('ADMIN', 'MANAGER', 'ANALISTA'));

CREATE POLICY "Vendedores can view assigned leads" ON "Lead"
    FOR SELECT
    USING (
        auth.jwt() ->> 'role' IN ('ADMIN', 'MANAGER', 'ANALISTA', 'VENDEDOR')
        OR assigned_to = auth.uid()
    );
```

---

### Trigger No Se Ejecuta

**Síntoma:**
```
Lead creado pero pipeline no se crea automáticamente
```

**Diagnóstico:**
```sql
-- Verificar que el trigger existe
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_pipeline';

-- Verificar que la función existe
SELECT * FROM information_schema.routines 
WHERE routine_name = 'create_pipeline_for_new_lead';
```

**Solución:**
```sql
-- Recrear la función
CREATE OR REPLACE FUNCTION create_pipeline_for_new_lead()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO lead_pipeline (lead_id, current_stage)
    VALUES (NEW.id, 'LEAD_NUEVO')
    ON CONFLICT (lead_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
DROP TRIGGER IF EXISTS trigger_create_pipeline ON "Lead";
CREATE TRIGGER trigger_create_pipeline
    AFTER INSERT ON "Lead"
    FOR EACH ROW
    EXECUTE FUNCTION create_pipeline_for_new_lead();

-- Test manual
INSERT INTO "Lead" (nombre, telefono) 
VALUES ('Test Trigger', '+543704999999')
RETURNING id;

-- Verificar que se creó el pipeline
SELECT * FROM lead_pipeline WHERE lead_id = 'ID_DEL_LEAD';
```

---

## 🔐 Problemas de Autenticación

### NextAuth Error: OAUTH_CALLBACK_ERROR

**Síntoma:**
```
[next-auth][error][OAUTH_CALLBACK_ERROR]
Error: Cannot read properties of undefined
```

**Solución:**

1. **Verificar NEXTAUTH_SECRET**
```bash
# Debe estar en .env.local
NEXTAUTH_SECRET="tu-secret-de-al-menos-32-caracteres"

# Generar uno nuevo si no existe
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. **Verificar NEXTAUTH_URL**
```bash
# Para desarrollo
NEXTAUTH_URL="http://localhost:3000"

# Para producción
NEXTAUTH_URL="https://tu-app.vercel.app"
```

3. **Reiniciar servidor**
```bash
# Ctrl+C y luego
npm run dev
```

---

### Usuario No Puede Hacer Login

**Síntoma:**
```
CredentialsSignin: Sign in failed
Invalid credentials
```

**Diagnóstico:**

1. **Verificar que el usuario existe**
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

supabase.from('User')
  .select('*')
  .eq('email', 'admin@phorencial.com')
  .then(result => console.log(result.data));
"
```

2. **Verificar contraseña hasheada**
```bash
# La contraseña debe estar hasheada con bcrypt
# Si no lo está, crear usuario correcto:
node scripts/setup-test-users.js
```

**Solución:**
```bash
# Recrear usuarios de prueba
node scripts/setup-test-users.js

# O crear manualmente
node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin123', 10);
console.log('Hash:', hash);
// Usar este hash en la base de datos
"
```

---

## 🧪 Problemas de Tests

### Playwright: Executable Doesn't Exist

**Síntoma:**
```
Error: browserType.launch: Executable doesn't exist at /path/to/chrome
```

**Solución:**
```bash
# Instalar navegadores de Playwright
npx playwright install

# O solo Chromium (más rápido)
npx playwright install chromium

# Con dependencias del sistema
npx playwright install --with-deps
```

---

### Tests Fallan: Timeout

**Síntoma:**
```
Test timeout of 30000ms exceeded
```

**Solución:**

1. **Aumentar timeout en playwright.config.ts**
```typescript
export default defineConfig({
  use: {
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  timeout: 60000, // 60 segundos por test
});
```

2. **Esperar elementos correctamente**
```typescript
// ❌ INCORRECTO
await page.click('button');

// ✅ CORRECTO
await page.waitForSelector('button');
await page.click('button');
```

---

### Tests No Encuentran Elementos

**Síntoma:**
```
Error: Timed out 30000ms waiting for selector "button[type='submit']"
```

**Diagnóstico:**
```typescript
// Agregar screenshot antes del error
test('mi test', async ({ page }) => {
  await page.goto('/page');
  
  // Tomar screenshot para debug
  await page.screenshot({ path: 'debug-screenshot.png' });
  
  // Imprimir HTML
  const html = await page.content();
  console.log(html);
  
  await page.click('button');
});
```

**Solución:**

1. **Usar selectores más flexibles**
```typescript
// ❌ Puede fallar si cambia el botón
await page.click('button.submit-btn');

// ✅ Más robusto con data-testid
await page.click('[data-testid="submit-button"]');

// ✅ Por texto (en español)
await page.click('text=Guardar');
```

2. **Esperar carga completa**
```typescript
await page.goto('/page', { waitUntil: 'networkidle' });
```

---

## 🚀 Errores de Deployment

### Vercel Build Falla

**Síntoma:**
```
Error: Type error: Property 'X' does not exist on type 'Y'
```

**Solución:**

1. **Verificar localmente**
```bash
# Build local
npm run build

# Si falla local, corregir errores
npm run type-check
```

2. **Verificar variables de entorno en Vercel**
```bash
# En Vercel Dashboard → Settings → Environment Variables
# Agregar TODAS las variables de .env.local
```

3. **Verificar versión de Node**
```json
// package.json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

---

### Environment Variables No Disponibles

**Síntoma:**
```
Error: NEXT_PUBLIC_SUPABASE_URL is undefined in production
```

**Solución:**

1. **Ir a Vercel Dashboard**
2. **Settings → Environment Variables**
3. **Agregar cada variable:**
```
NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbG...
SUPABASE_SERVICE_ROLE_KEY = eyJhbG...
NEXTAUTH_SECRET = generated-secret
NEXTAUTH_URL = https://tu-app.vercel.app
```
4. **Redeploy:**
```bash
vercel --prod
```

---

## ⚡ Performance Issues

### Dashboard Carga Lento

**Síntoma:**
```
Dashboard tarda >5 segundos en cargar
```

**Diagnóstico:**
```bash
# En DevTools → Network
# Ver qué requests tardan más
```

**Soluciones:**

1. **Optimizar query de métricas**
```typescript
// ❌ Queries separadas (lento)
const leads = await supabase.from('Lead').select('*');
const pipelines = await supabase.from('lead_pipeline').select('*');

// ✅ Query combinada (rápido)
const { data } = await supabase
  .from('Lead')
  .select(`
    *,
    lead_pipeline (*)
  `);
```

2. **Agregar índices en BD**
```sql
-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_lead_estado ON "Lead"(estado);
CREATE INDEX IF NOT EXISTS idx_lead_created ON "Lead"(createdAt);
CREATE INDEX IF NOT EXISTS idx_lead_origen ON "Lead"(origen);
```

3. **Implementar caché**
```typescript
// Usar React Query
const { data: metrics } = useQuery({
  queryKey: ['metrics'],
  queryFn: fetchMetrics,
  staleTime: 60000, // 1 minuto
  cacheTime: 300000, // 5 minutos
});
```

---

## 🆘 Cuando Nada Funciona

### Reset Completo

```bash
# 1. Limpiar todo
rm -rf node_modules package-lock.json .next

# 2. Reinstalar
npm install

# 3. Verificar variables de entorno
cat .env.local

# 4. Test de conexión
node test-supabase-connection.js

# 5. Iniciar limpio
npm run dev
```

---

## 📞 Obtener Ayuda

### Recursos

1. **Documentación:**
   - [Setup](./SETUP-DESARROLLO.md)
   - [Arquitectura](./ARQUITECTURA.md)
   - [Estado Actual](./ESTADO-ACTUAL.md)

2. **Logs Útiles:**
```bash
# Ver logs del servidor
npm run dev 2>&1 | tee server.log

# Ver logs de Supabase
# Ir a Dashboard → Logs
```

3. **Issues de GitHub:**
   - Buscar issues similares
   - Crear issue con plantilla

4. **Contacto:**
   - Email del desarrollador
   - Slack/Discord del equipo

---

**Última actualización:** Octubre 2025

