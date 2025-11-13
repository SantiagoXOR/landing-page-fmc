# 🚀 Guía de Setup para Desarrollo - CRM Phorencial

> **Tiempo estimado:** 30-45 minutos  
> **Dificultad:** ⭐⭐ Intermedio  
> **Sistema:** Windows, macOS, Linux

---

## 📋 Índice

1. [Requisitos del Sistema](#-requisitos-del-sistema)
2. [Instalación Paso a Paso](#-instalación-paso-a-paso)
3. [Configuración de Variables de Entorno](#-configuración-de-variables-de-entorno)
4. [Setup de Supabase](#-setup-de-supabase)
5. [Comandos Útiles](#-comandos-útiles)
6. [Verificación de Setup](#-verificación-de-setup)
7. [Solución de Problemas](#-solución-de-problemas)

---

## 💻 Requisitos del Sistema

### Software Requerido

| Software | Versión Mínima | Versión Recomendada | Instalación |
|----------|----------------|---------------------|-------------|
| **Node.js** | 18.0.0 | 20.x LTS | [nodejs.org](https://nodejs.org) |
| **npm** | 9.0.0 | 10.x | Incluido con Node.js |
| **Git** | 2.30.0 | Última | [git-scm.com](https://git-scm.com) |
| **VS Code** | - | Última | [code.visualstudio.com](https://code.visualstudio.com) |

### Cuentas Necesarias

- ✅ **GitHub** - Para clonar el repositorio
- ✅ **Supabase** - Para la base de datos (gratis)
- ⚪ **Vercel** - Para deployment (opcional)

### Extensiones de VS Code Recomendadas

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "Prisma.prisma",
    "ms-playwright.playwright"
  ]
}
```

---

## 📦 Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
# Clonar el proyecto
git clone https://github.com/SantiagoXOR/phorencial-bot-crm.git

# Entrar al directorio
cd phorencial-bot-crm

# Verificar que estás en la rama correcta
git branch
# Deberías ver: * main
```

### 2. Instalar Dependencias

```bash
# Instalar todas las dependencias
npm install

# Esto instalará:
# - 47 dependencias de producción
# - 18 dependencias de desarrollo
# - Total: ~500MB
```

**⏱️ Tiempo estimado:** 2-5 minutos dependiendo de tu conexión

### 3. Verificar Instalación

```bash
# Verificar versión de Node.js
node --version
# Debería mostrar: v20.x.x o superior

# Verificar versión de npm
npm --version
# Debería mostrar: v10.x.x o superior

# Listar scripts disponibles
npm run
```

---

## 🔐 Configuración de Variables de Entorno

### 1. Crear Archivo de Variables

```bash
# Copiar el archivo de ejemplo (si existe)
# Si no existe, crear uno nuevo
touch .env.local
```

### 2. Configurar Variables de Entorno

Edita `.env.local` y agrega las siguientes variables:

```env
# ============================================
# BASE DE DATOS (Supabase)
# ============================================
# URL de conexión PostgreSQL directa
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"

# URL pública de Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"

# Clave anónima (pública)
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Clave de servicio (secreta - NO COMPARTIR)
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# ============================================
# AUTENTICACIÓN (NextAuth)
# ============================================
# URL de la aplicación
NEXTAUTH_URL="http://localhost:3000"

# Secreto para NextAuth (generar nuevo)
NEXTAUTH_SECRET="tu-secret-key-super-segura-de-32-caracteres-minimo"

# Secreto para JWT
JWT_SECRET="otro-secret-diferente-tambien-de-32-caracteres"

# ============================================
# SEGURIDAD
# ============================================
# Token para webhooks
ALLOWED_WEBHOOK_TOKEN="super-seguro-webhook-token-123"

# ============================================
# ENTORNO
# ============================================
# Entorno de la aplicación
APP_ENV="development"
NODE_ENV="development"

# ============================================
# OPCIONAL: Para producción
# ============================================
# NEXT_PUBLIC_VERCEL_URL="tu-app.vercel.app"
# SENTRY_DSN="https://..."
```

### 3. Generar Secretos

```bash
# En Node.js, puedes generar secretos seguros:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# O usar OpenSSL:
openssl rand -hex 32
```

### 4. Obtener Credenciales de Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto (gratis)
3. Ve a **Settings** → **API**
4. Copia:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY`
5. Ve a **Settings** → **Database** → **Connection string**
6. Copia la URI de conexión → `DATABASE_URL`

---

## 🗄️ Setup de Supabase

### 1. Crear Proyecto en Supabase

```bash
# 1. Ve a https://supabase.com/dashboard
# 2. Click en "New Project"
# 3. Completa:
#    - Name: phorencial-crm
#    - Database Password: [guarda esta contraseña]
#    - Region: South America (más cercano)
# 4. Click "Create new project"
# 5. Espera 2-3 minutos mientras se crea
```

### 2. Ejecutar SQL para Crear Tablas

1. Ve a **SQL Editor** en el panel de Supabase
2. Copia y pega el contenido de `SOLUCION-PIPELINE.md`
3. Click en **Run**

**O ejecuta este script:**

```sql
-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLA: Lead (Tabla principal de leads)
CREATE TABLE IF NOT EXISTS "Lead" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    dni TEXT UNIQUE,
    telefono TEXT NOT NULL,
    email TEXT,
    ingresos INTEGER,
    zona TEXT,
    producto TEXT,
    monto INTEGER,
    origen TEXT,
    "utmSource" TEXT,
    estado TEXT DEFAULT 'NUEVO',
    agencia TEXT,
    notas TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: User (Usuarios del sistema)
CREATE TABLE IF NOT EXISTS "User" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    role TEXT DEFAULT 'VENDEDOR',
    "lastLogin" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: Event (Eventos y auditoría)
CREATE TABLE IF NOT EXISTS "Event" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "leadId" UUID REFERENCES "Lead"(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    payload TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: Rule (Reglas de negocio)
CREATE TABLE IF NOT EXISTS "Rule" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ver script completo en SOLUCION-PIPELINE.md para más tablas
```

### 3. Importar Datos Iniciales

```bash
# Opción 1: Usando script de Node.js
node scripts/setup-test-users.js

# Opción 2: SQL directo
# Ejecuta el SQL en Supabase SQL Editor
```

### 4. Verificar Tablas Creadas

```bash
# Ejecutar script de verificación
node scripts/check-supabase-tables.js

# Deberías ver:
# ✅ Tabla "Lead" existe
# ✅ Tabla "User" existe
# ✅ Tabla "Event" existe
# ... etc
```

---

## ⚙️ Comandos Útiles

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev
# App disponible en: http://localhost:3000

# Iniciar con limpieza de caché
npm run dev:clean

# Iniciar con WebSocket server
npm run dev:full
```

### Base de Datos

```bash
# Generar cliente Prisma (si usas Prisma)
npm run db:generate

# Push del schema a la BD
npm run db:push

# Poblar BD con datos demo
npm run db:seed

# Abrir Prisma Studio (GUI)
npm run db:studio

# Reset completo de BD
npm run db:reset

# Test de conexión Supabase
npm run supabase:test
```

### Testing

```bash
# Tests E2E completos
npm run test:e2e

# Tests E2E con UI
npm run test:e2e:ui

# Tests E2E específicos
npm run test:e2e:auth
npm run test:e2e:dashboard
npm run test:e2e:leads

# Tests unitarios
npm run test:jest

# Tests con watch
npm run test:jest:watch

# Cobertura de tests
npm run test:jest:coverage
```

### Calidad de Código

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Build para producción
npm run build

# Ejecutar build de producción
npm run start
```

---

## ✅ Verificación de Setup

### Checklist de Verificación

```bash
# 1. Verificar que el servidor inicia
npm run dev
# ✅ Debería mostrar: ready - started server on 0.0.0.0:3000

# 2. Abrir en navegador
# http://localhost:3000
# ✅ Debería mostrar la página de login

# 3. Intentar login
# Usuario: admin@phorencial.com
# Contraseña: admin123
# ✅ Debería redirigir al dashboard

# 4. Verificar conexión a BD
node test-supabase-connection.js
# ✅ Debería mostrar: Conexión exitosa

# 5. Ejecutar un test
npm run test:e2e:auth
# ✅ Tests deberían pasar
```

### Script de Verificación Automática

Crea un archivo `verify-setup.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verify() {
    console.log('🔍 Verificando setup...\n');
    
    // 1. Verificar variables de entorno
    const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXTAUTH_SECRET',
        'JWT_SECRET'
    ];
    
    let allPresent = true;
    requiredEnvVars.forEach(varName => {
        if (process.env[varName]) {
            console.log(`✅ ${varName}`);
        } else {
            console.log(`❌ ${varName} - FALTANTE`);
            allPresent = false;
        }
    });
    
    if (!allPresent) {
        console.log('\n⚠️  Algunas variables faltan. Revisa tu .env.local');
        return;
    }
    
    // 2. Verificar conexión a Supabase
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        
        const { data, error } = await supabase.from('Lead').select('count');
        
        if (error) throw error;
        console.log('\n✅ Conexión a Supabase exitosa');
    } catch (error) {
        console.log('\n❌ Error de conexión a Supabase:', error.message);
    }
    
    console.log('\n🎉 Setup verificado correctamente!');
}

verify();
```

Ejecuta:
```bash
node verify-setup.js
```

---

## 🔧 Solución de Problemas

### Problema: `npm install` falla

**Síntomas:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solución:**
```bash
# Limpiar caché de npm
npm cache clean --force

# Borrar node_modules y package-lock.json
rm -rf node_modules package-lock.json

# Reinstalar
npm install --legacy-peer-deps
```

---

### Problema: Error de conexión a Supabase

**Síntomas:**
```
Error: Invalid Supabase URL or Key
```

**Solución:**
1. Verifica que las variables estén en `.env.local`
2. Verifica que no haya espacios extra
3. Asegúrate de reiniciar el servidor después de cambiar `.env.local`
4. Verifica que el proyecto de Supabase esté activo

```bash
# Test rápido de conexión
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
supabase.from('Lead').select('count').then(console.log);
"
```

---

### Problema: NextAuth no funciona

**Síntomas:**
```
[next-auth][error][OAUTH_CALLBACK_ERROR]
```

**Solución:**
1. Verifica `NEXTAUTH_SECRET` en `.env.local`
2. Asegúrate de que `NEXTAUTH_URL` sea correcto
3. Genera un nuevo secreto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Problema: Tests de Playwright fallan

**Síntomas:**
```
Error: browserType.launch: Executable doesn't exist
```

**Solución:**
```bash
# Instalar navegadores de Playwright
npx playwright install

# O instalar solo Chromium
npx playwright install chromium
```

---

### Problema: Puerto 3000 en uso

**Síntomas:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solución:**
```bash
# En Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# En macOS/Linux
lsof -ti:3000 | xargs kill -9

# O usar otro puerto
PORT=3001 npm run dev
```

---

### Problema: Build falla en producción

**Síntomas:**
```
Error: Type error: ...
```

**Solución:**
```bash
# Verificar tipos
npm run type-check

# Si hay errores, corrígelos y luego:
npm run build
```

---

## 📚 Recursos Adicionales

### Documentación Relacionada
- [Arquitectura del Sistema](./ARQUITECTURA.md)
- [Estado Actual del Proyecto](./ESTADO-ACTUAL.md)
- [Guía de Migración Supabase](./MIGRACION-SUPABASE.md)
- [Troubleshooting Completo](./TROUBLESHOOTING.md)

### Enlaces Externos
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Playwright Docs](https://playwright.dev/docs/intro)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

## 🎯 Próximos Pasos

Una vez completado el setup:

1. ✅ Lee [ESTADO-ACTUAL.md](./ESTADO-ACTUAL.md) para entender el proyecto
2. ✅ Revisa [ARQUITECTURA.md](./ARQUITECTURA.md) para la arquitectura
3. ✅ Consulta [PROXIMOS-PASOS.md](./PROXIMOS-PASOS.md) para saber qué trabajar
4. ✅ Ejecuta los tests para verificar que todo funciona
5. ✅ ¡Comienza a desarrollar!

---

**💡 Consejo:** Guarda este documento como referencia. Si encuentras un problema no documentado aquí, agrégalo para ayudar a futuros desarrolladores.

