# 📊 Resumen de Configuración Actual - Manychat

## ✅ Completado Exitosamente

### 1. Schema de Base de Datos
- ✅ El schema de Prisma incluye todos los campos necesarios:
  - `Lead.manychatId` (ID del subscriber)
  - `Lead.tags` (tags de Manychat en JSON)
  - `Lead.customFields` (campos personalizados en JSON)
  - Tabla `ManychatSync` (logs de sincronización)
  - `Conversation.manychatData` (metadatos de flujos)

### 2. Archivos de Configuración Creados
- ✅ `MANYCHAT-ENV-VARIABLES.txt` - Variables a agregar en .env.local
- ✅ `INSTRUCCIONES-CONFIGURACION-MANYCHAT.md` - Guía completa paso a paso
- ✅ `configure-manychat.ps1` / `configure-manychat.sh` - Scripts de configuración
- ✅ `test-manychat-simple.js` - Test simplificado sin base de datos

### 3. Código de Integración
- ✅ Servicios backend completos ([`src/server/services/manychat-service.ts`](src/server/services/manychat-service.ts))
- ✅ Endpoints API listos
- ✅ Componentes UI implementados
- ✅ Webhooks preparados

## ⚠️ Problemas Detectados

### Problema 1: API Key de Manychat Inválida
**Estado:** 🔴 CRÍTICO

**Error:**
```
✗ Error de API: Wrong token
Status: 401
→ API Key inválida o expirada
```

**API Key proporcionada:** `3724482:1bf0d7525e7c87d854d087f44afae137`

**Posibles causas:**
1. La API key fue regenerada después de proporcionarla
2. El formato de la key no es el correcto para la API de Manychat
3. La key corresponde a otro servicio (WhatsApp directo, Facebook, etc.)

**Solución:**
1. Ve a Manychat → Settings → API
2. Si ves una key diferente, cópiala
3. Si no ves ninguna key, haz click en "Regenerate API Key"
4. Actualiza el valor en `.env.local`:
   ```env
   MANYCHAT_API_KEY=la-nueva-key-aqui
   ```
5. Ejecuta de nuevo: `node test-manychat-simple.js`

### Problema 2: Credenciales de Supabase
**Estado:** 🔴 CRÍTICO

**Error:**
```
Error: Schema engine error:
FATAL: Tenant or user not found
```

**Causa:**
Las credenciales de Supabase en `.env.local` no son válidas o no están configuradas.

**Solución:**
Revisa y actualiza estas variables en `.env.local`:
```env
DATABASE_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
```

Consulta: [SUPABASE-SETUP.md](SUPABASE-SETUP.md)

## 📋 Checklist de Configuración

### Paso 1: Variables de Entorno
- [x] Archivo `.env.local` existe
- [x] Variables de Manychat agregadas
- [ ] **API Key de Manychat válida** ← PENDIENTE
- [ ] **Credenciales de Supabase válidas** ← PENDIENTE

### Paso 2: Base de Datos
- [x] Schema de Prisma actualizado
- [ ] Migración aplicada (`npm run db:push`) ← BLOQUEADO por Supabase

### Paso 3: Configuración en Manychat (Manual)
- [ ] Webhook configurado
- [ ] Custom fields creados
- [ ] Tags creados
- [ ] Flujo básico creado

### Paso 4: Testing
- [x] Test simplificado ejecutado
- [ ] Test completo (`npm run manychat:test`) ← BLOQUEADO por DB
- [ ] Servidor iniciado y funcionando

## 🎯 Próximos Pasos Inmediatos

### 1. Obtener API Key Válida de Manychat (URGENTE)
```bash
# En Manychat:
Settings → API → Generate/Regenerate API Key

# Copiar la key que empieza con: MCAPIKey-...
# O el formato que te muestre Manychat

# Actualizar en .env.local:
MANYCHAT_API_KEY=la-key-correcta-aqui
```

### 2. Verificar API Key
```bash
node test-manychat-simple.js
```

**Resultado esperado:**
```
✓ Conexión exitosa a Manychat API
📊 Información de tu cuenta:
  Page ID: ...
  Page Name: Formosa Moto Crédito
```

### 3. Configurar Supabase (Paralelo)
Ver: [SUPABASE-SETUP.md](SUPABASE-SETUP.md)

### 4. Ejecutar Migración
Una vez resueltos los pasos 1-3:
```bash
npm run db:push
```

### 5. Configurar Manychat (Manual)
Ver: [INSTRUCCIONES-CONFIGURACION-MANYCHAT.md](INSTRUCCIONES-CONFIGURACION-MANYCHAT.md)
- Pasos 5-7: Webhook, Custom Fields, Tags, Flujos

### 6. Test Completo
```bash
npm run manychat:test
```

### 7. Iniciar Servidor
```bash
npm run dev
```

## 📖 Documentación Disponible

| Documento | Propósito |
|-----------|-----------|
| `MANYCHAT-ENV-VARIABLES.txt` | Variables exactas para copiar |
| `INSTRUCCIONES-CONFIGURACION-MANYCHAT.md` | Guía paso a paso completa |
| `RESUMEN-CONFIGURACION-ACTUAL.md` | Este documento (estado actual) |
| `MANYCHAT-QUICKSTART.md` | Guía rápida de uso |
| `docs/MANYCHAT-SETUP.md` | Setup detallado |
| `docs/MANYCHAT-INTEGRATION.md` | Documentación técnica |
| `SUPABASE-SETUP.md` | Configuración de Supabase |

## 🔍 Diagnóstico Actual

### Variables de Entorno
```
✓ MANYCHAT_API_KEY: Configurada (pero inválida)
✓ MANYCHAT_BASE_URL: Configurada
✓ MANYCHAT_WEBHOOK_SECRET: Configurada
✗ WHATSAPP_PHONE_NUMBER: No configurada (opcional)
```

### Conexión API
```
✗ Manychat API: 401 Wrong token
```

### Base de Datos
```
✗ Supabase: Credenciales inválidas
✓ Schema: Actualizado con campos Manychat
```

## 💬 Información de Contacto/Cuenta

**Número WhatsApp:** +5493704069592  
**Empresa:** Formosa Moto Crédito  
**Cuenta Manychat:** FMC PRO

## 🆘 Si Necesitas Ayuda

1. **API Key no funciona:**
   - Regenera la key en Manychat
   - Verifica que copies la key completa
   - Asegúrate de no incluir espacios al inicio/final

2. **Supabase no conecta:**
   - Verifica las credenciales en Supabase Dashboard
   - Resetea la contraseña de la base de datos si es necesario
   - Consulta [SUPABASE-SETUP.md](SUPABASE-SETUP.md)

3. **Webhooks no funcionan:**
   - Primero resuelve API Key y base de datos
   - Luego configura webhook con ngrok
   - Ver paso 4 en [INSTRUCCIONES-CONFIGURACION-MANYCHAT.md](INSTRUCCIONES-CONFIGURACION-MANYCHAT.md)

## ✅ Una Vez Todo Funcione

Cuando la API Key sea válida y Supabase conecte:

1. ✓ Ejecutar `npm run db:push`
2. ✓ Ejecutar `node test-manychat-simple.js` (debe pasar)
3. ✓ Ejecutar `npm run manychat:test` (test completo)
4. ✓ Configurar webhook en Manychat
5. ✓ Crear custom fields y tags
6. ✓ Crear flujo de bienvenida
7. ✓ Iniciar servidor: `npm run dev`
8. ✓ Probar sincronización en el CRM

---

**Última actualización:** 12 de Noviembre, 2025  
**Estado:** Configuración parcial - Pendiente API Key válida y Supabase

