# ✅ Configuración de Manychat - EXITOSA

## 🎉 Estado: CONECTADO

La API de Manychat está funcionando correctamente.

### Información de tu Cuenta

- **Page ID:** 603220616215927
- **Page Name:** new WhatsApp account
- **Timezone:** America/Buenos_Aires
- **API Key:** `3724482:3979953d3482a4cce1d1c1aceb69556c` ✅

## 📋 Siguientes Pasos

### 1. Configurar Supabase (URGENTE)

Tu base de datos Supabase necesita credenciales válidas. 

Actualiza en `.env.local`:

```env
# Database - Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
```

Ver: [SUPABASE-SETUP.md](SUPABASE-SETUP.md)

### 2. Aplicar Migración de Base de Datos

Una vez Supabase esté configurado:

```bash
npm run db:push
```

Esto creará las tablas necesarias para Manychat:
- `ManychatSync`
- Campos en `Lead` (manychatId, tags, customFields)
- Campo en `Conversation` (manychatData)

### 3. Configurar Webhook en Manychat

Para que los mensajes de WhatsApp lleguen al CRM:

#### a) Exponer tu servidor (desarrollo local)

```bash
# Opción 1: ngrok
ngrok http 3000

# Opción 2: localtunnel
npx localtunnel --port 3000
```

Obtendrás una URL como: `https://abc123.ngrok.io`

#### b) Configurar en Manychat

1. Ve a **Manychat → Settings → API → Webhooks**
2. Click **"Add Webhook"**
3. Configura:
   - **Webhook URL:** `https://tu-url-ngrok.ngrok.io/api/whatsapp/webhook`
   - **Verify Token:** `manychat-webhook-secret-temporal-2024-formosa-moto-credito`
4. Seleccionar eventos:
   - ✅ `new_subscriber`
   - ✅ `message_received`
   - ✅ `tag_added`
   - ✅ `tag_removed`
   - ✅ `custom_field_changed`
5. Click **"Verify"** y **"Save"**

### 4. Crear Custom Fields en Manychat

**En Manychat: Settings → Custom Fields → + New Field**

Crea estos 8 campos:

| Nombre | Tipo | Descripción |
|--------|------|-------------|
| `dni` | Text | Documento de identidad |
| `ingresos` | Number | Ingresos mensuales |
| `zona` | Text | Zona geográfica |
| `producto` | Text | Producto de interés |
| `monto` | Number | Monto solicitado |
| `origen` | Text | Canal de origen |
| `estado` | Text | Estado del lead |
| `agencia` | Text | Agencia asignada |

**¿Por qué?** Estos campos permiten sincronizar datos entre el CRM y Manychat.

### 5. Crear Tags en Manychat

**En Manychat: Settings → Tags → + New Tag**

#### Tags de Estado:
- `lead-nuevo`
- `lead-calificado`
- `lead-contactado`
- `lead-interesado`
- `lead-no-interesado`

#### Tags de Origen:
- `origen-facebook`
- `origen-instagram`
- `origen-whatsapp`
- `origen-web`

#### Tags de Producto:
- `producto-prestamo-personal`
- `producto-prestamo-vehicular`

#### Tags de Engagement:
- `bot-activo`
- `agente-requerido`
- `conversacion-cerrada`

**¿Por qué?** Los tags permiten segmentar leads y crear broadcasts dirigidos.

### 6. Crear Flujo Básico de Bienvenida

**En Manychat: Automation → Flows → + New Flow**

**Nombre:** "Bienvenida CRM"  
**Trigger:** New Subscriber

**Estructura del Flujo:**

```
1. Mensaje: "¡Hola! 👋 Bienvenido a Formosa Moto Crédito"

2. Pregunta: "¿En qué podemos ayudarte hoy?"
   Botones:
   - "Solicitar Préstamo" → Add Tag: "interesado-prestamo"
   - "Solo Información" → Add Tag: "solo-info"  
   - "Hablar con Agente" → Add Tag: "agente-requerido"

3. Action: Add Tag "lead-nuevo"

4. Webhook: Notificar al CRM (cuando lo configures)
```

### 7. Iniciar el Servidor del CRM

```bash
npm run dev
```

Accede a: `http://localhost:3000`

### 8. Verificar en el CRM

1. Ve a **Settings → Manychat**
2. Deberías ver estado "Conectado" (verde)
3. Prueba sincronizar un lead desde el CRM
4. Envía un mensaje de WhatsApp al número: **+5493704069592**
5. Verifica que aparezca en el CRM

## 🧪 Testing

### Test Completo (requiere Supabase configurado)

```bash
npm run manychat:test
```

### Test Simplificado (solo API, sin DB)

```bash
node test-manychat-simple.js
```

## 📊 Checklist de Configuración

- [x] API Key de Manychat obtenida
- [x] Variables de entorno configuradas
- [x] Conexión a Manychat API verificada
- [ ] Credenciales de Supabase configuradas
- [ ] Migración de base de datos ejecutada
- [ ] Webhook configurado
- [ ] Custom fields creados (0/8)
- [ ] Tags creados (0/15)
- [ ] Flujo de bienvenida creado
- [ ] Servidor iniciado y funcionando

## 🎯 Prioridad Inmediata

**1. Configurar Supabase** ← BLOQUEANTE

Sin Supabase, no puedes:
- Ejecutar `npm run db:push`
- Guardar leads en la base de datos
- Hacer que el webhook funcione
- Usar el CRM completamente

**2. Crear Custom Fields y Tags**

Estos se pueden hacer en paralelo mientras resuelves Supabase.

## 📚 Documentación

- **Configuración completa:** [INSTRUCCIONES-CONFIGURACION-MANYCHAT.md](INSTRUCCIONES-CONFIGURACION-MANYCHAT.md)
- **Guía rápida:** [MANYCHAT-QUICKSTART.md](MANYCHAT-QUICKSTART.md)
- **Documentación técnica:** [docs/MANYCHAT-INTEGRATION.md](docs/MANYCHAT-INTEGRATION.md)
- **Setup de Supabase:** [SUPABASE-SETUP.md](SUPABASE-SETUP.md)

## 🆘 Si Necesitas Ayuda

### Manychat está funcionando ✅
- La API está conectada
- Puedes crear custom fields, tags y flujos

### Supabase necesita configuración ⚠️
- Obtén credenciales de Supabase Dashboard
- Actualiza `.env.local`
- Ejecuta `npm run db:push`

---

**Fecha:** 12 de Noviembre, 2025  
**Estado:** Manychat API ✅ | Supabase ⚠️ | Webhook ⏳ | Custom Fields ⏳ | Tags ⏳

