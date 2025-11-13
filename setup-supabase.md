# Configuración de Supabase para Phorencial CRM

## Paso 1: Obtener credenciales de Supabase

### Opción A: Crear nuevo proyecto
1. Ve a https://supabase.com/dashboard
2. Crea un nuevo proyecto llamado "Phorencial CRM BOT WPP"
3. Selecciona región: South America (São Paulo) - sa-east-1
4. Crea una contraseña segura para la base de datos

### Opción B: Usar proyecto existente
Podemos usar el proyecto "mascolor" (ID: hffupqoqbjhehedtemvl) que ya tienes.

## Paso 2: Obtener las API Keys

1. Ve a tu proyecto en Supabase Dashboard
2. Ve a Settings > API
3. Copia las siguientes claves:
   - **Project URL**: `https://[PROJECT_ID].supabase.co`
   - **anon public key**: `eyJ...` (clave pública)
   - **service_role key**: `eyJ...` (clave privada - ¡NO la compartas!)

## Paso 3: Obtener la contraseña de la base de datos

1. Ve a Settings > Database
2. Copia la **Database Password** que configuraste al crear el proyecto
3. O resetea la contraseña si no la recuerdas

## Paso 4: Configurar variables de entorno

Actualiza el archivo `.env.local` con:

```env
# Database - Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE_ROLE_KEY]"
```

Reemplaza:
- `[PROJECT_ID]` con el ID de tu proyecto
- `[DB_PASSWORD]` con la contraseña de la base de datos
- `[ANON_KEY]` con la clave anon
- `[SERVICE_ROLE_KEY]` con la clave service_role

## Paso 5: Ejecutar migraciones

Una vez configuradas las variables:

```bash
# Regenerar Prisma Client para PostgreSQL
npx prisma generate

# Crear las tablas en Supabase
npx prisma db push

# Ejecutar el seed con datos de ejemplo
npx prisma db seed
```

## Paso 6: Configurar Row Level Security (RLS)

En el SQL Editor de Supabase, ejecuta:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rule" ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acceso completo (para desarrollo)
-- En producción, estas políticas deberían ser más restrictivas

CREATE POLICY "Allow all operations on Lead" ON "Lead"
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on Event" ON "Event"
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on User" ON "User"
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on Rule" ON "Rule"
FOR ALL USING (true) WITH CHECK (true);
```

## Paso 7: Verificar la conexión

Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

Si todo está configurado correctamente, deberías poder:
- Hacer login con los usuarios demo
- Ver los leads en el dashboard
- Usar el sistema de scoring
- Generar reportes

## Troubleshooting

### Error de conexión a la base de datos
- Verifica que la contraseña sea correcta
- Asegúrate de que el PROJECT_ID sea correcto
- Verifica que las variables de entorno estén bien configuradas

### Error de autenticación
- Verifica que las API keys sean correctas
- Asegúrate de que el NEXT_PUBLIC_SUPABASE_URL sea correcto

### Tablas no encontradas
- Ejecuta `npx prisma db push` para crear las tablas
- Ejecuta `npx prisma db seed` para cargar datos de ejemplo
