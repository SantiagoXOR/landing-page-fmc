# 🚀 Configuración de Supabase para Phorencial CRM

## 📋 Resumen

Este documento te guía para migrar el CRM de SQLite local a Supabase PostgreSQL en la nube.

## 🎯 Opción Rápida: Script Automático

### Windows PowerShell:
```powershell
.\configure-supabase.ps1
```

### Node.js:
```bash
npm run supabase:setup
```

## 🔧 Configuración Manual

### Paso 1: Obtener Credenciales de Supabase

1. **Ve a [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Crea un nuevo proyecto** o usa uno existente
   - Nombre: "Phorencial CRM BOT WPP"
   - Región: South America (São Paulo)
   - Contraseña: Crea una contraseña segura

3. **Obtén las credenciales:**
   - Ve a **Settings > API**
   - Copia el **Project URL**
   - Copia el **anon public key**
   - Copia el **service_role key** (¡mantén esto seguro!)

4. **Obtén la contraseña de la base de datos:**
   - Ve a **Settings > Database**
   - Copia o resetea la **Database Password**

### Paso 2: Configurar Variables de Entorno

Crea o actualiza `.env.local`:

```env
# Database - Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# NextAuth (mantener)
NEXTAUTH_SECRET="desarrollo-local-secret-key-muy-segura-2024"
NEXTAUTH_URL="http://localhost:3001"
JWT_SECRET="jwt-secret-para-desarrollo-local-2024"
ALLOWED_WEBHOOK_TOKEN="super-seguro"
APP_ENV="development"
```

**Reemplaza:**
- `[PROJECT_ID]` → Tu Project ID de Supabase
- `[DB_PASSWORD]` → Tu contraseña de base de datos
- `eyJ...` → Tus claves reales de Supabase

### Paso 3: Configurar Base de Datos

```bash
# 1. Regenerar Prisma Client para PostgreSQL
npx prisma generate

# 2. Crear tablas en Supabase
npx prisma db push

# 3. Cargar datos de ejemplo
npm run db:seed
```

### Paso 4: Configurar Row Level Security (RLS)

En **Supabase Dashboard > SQL Editor**, ejecuta:

```sql
-- Habilitar RLS
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rule" ENABLE ROW LEVEL SECURITY;

-- Políticas de desarrollo (acceso completo)
CREATE POLICY "Allow all operations on Lead" ON "Lead"
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on Event" ON "Event"
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on User" ON "User"
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on Rule" ON "Rule"
FOR ALL USING (true) WITH CHECK (true);
```

## 🧪 Verificar Configuración

```bash
# Probar conexión
npm run supabase:test

# Si todo está bien, iniciar servidor
npm run dev
```

## 📊 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run supabase:test` | Probar conexión a Supabase |
| `npm run supabase:setup` | Configuración completa automática |
| `npm run supabase:migrate` | Migrar datos de SQLite a Supabase |
| `npm run db:reset` | Resetear y recargar base de datos |

## 🔍 Troubleshooting

### ❌ Error de autenticación
```
password authentication failed for user "postgres"
```
**Solución:** Verifica la contraseña en `DATABASE_URL`

### ❌ Proyecto no encontrado
```
could not translate host name to address
```
**Solución:** Verifica el `PROJECT_ID` en las URLs

### ❌ Tablas no existen
```
relation "Lead" does not exist
```
**Solución:** Ejecuta `npx prisma db push`

### ❌ Error de permisos
```
permission denied for table "Lead"
```
**Solución:** Configura las políticas RLS (Paso 4)

## 🔄 Migración desde SQLite

Si ya tienes datos en SQLite local:

```bash
# Migración automática
npm run supabase:migrate
```

Esto:
1. ✅ Hace backup de datos SQLite
2. ✅ Configura tablas en Supabase  
3. ✅ Migra todos los datos
4. ✅ Configura RLS básico

## 🎯 Verificación Final

1. **Ejecuta:** `npm run dev`
2. **Ve a:** http://localhost:3001
3. **Login:** admin@phorencial.com / admin123
4. **Verifica:**
   - ✅ Dashboard de leads carga
   - ✅ Sistema de scoring funciona
   - ✅ Reportes se generan
   - ✅ Configuración es accesible

## 🔒 Seguridad en Producción

Para producción, actualiza las políticas RLS:

```sql
-- Ejemplo: Solo usuarios autenticados
CREATE POLICY "Authenticated users only" ON "Lead"
FOR ALL USING (auth.role() = 'authenticated');
```

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs de la consola
2. Ejecuta `npm run supabase:test`
3. Verifica las variables de entorno
4. Consulta la documentación de Supabase

¡Listo! Tu CRM ahora está en la nube con Supabase 🎉
