# 🔍 Debugging de Webhooks de Manychat

## Estado Actual

### ✅ Verificaciones Completadas

1. **Base de Datos**: Estructura correcta con todos los índices necesarios
   - ✅ Tabla `messages` existe con índices únicos en `platform_msg_id`
   - ✅ Tabla `conversations` existe con índices en `platform` y `platform_id`
   - ✅ Tabla `Lead` existe con índice único en `manychatId`
   - ⚠️ **Problema**: Base de datos está completamente vacía (0 leads, 0 conversaciones, 0 mensajes)

2. **Código**: Implementación completa
   - ✅ Endpoint `/api/webhooks/manychat` creado y configurado
   - ✅ Servicio `ManychatWebhookService` implementado
   - ✅ Tipos de Manychat actualizados
   - ✅ Logging detallado agregado
   - ✅ Endpoint de debug `/api/webhooks/manychat/debug` creado

3. **Logs**: No hay errores en los logs de Supabase
   - ✅ Todas las consultas devuelven 200 OK
   - ⚠️ No hay evidencia de webhooks recibidos

## 🔧 Pasos para Debugging

### 1. Verificar Configuración de Manychat

**URL del Webhook en Producción:**
```
https://phorencial-bot-8ztgzbllz-xorarg.vercel.app/api/webhooks/manychat
```

**Eventos que deben estar activados en Manychat:**
- ✅ `message_received` - Mensajes entrantes
- ✅ `message_sent` - Mensajes salientes  
- ✅ `new_subscriber` - Nuevos subscribers
- ✅ `subscriber_updated` - Subscribers actualizados
- ✅ `tag_added` - Tags agregados
- ✅ `tag_removed` - Tags removidos
- ✅ `custom_field_changed` - Custom fields cambiados

### 2. Probar Webhook Localmente

**Usar el script de prueba:**
```bash
# Configurar variables de entorno
export WEBHOOK_URL="http://localhost:3000/api/webhooks/manychat"
export MANYCHAT_API_KEY="tu-api-key" # Opcional

# Ejecutar script de prueba
npx tsx scripts/test-manychat-webhook.ts
```

**O probar manualmente con curl:**
```bash
curl -X POST http://localhost:3000/api/webhooks/manychat \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "message_received",
    "subscriber_id": 123456789,
    "subscriber": {
      "id": 123456789,
      "first_name": "Juan",
      "last_name": "Pérez",
      "phone": "+543701234567"
    },
    "message": {
      "id": "msg_123456",
      "type": "text",
      "text": "Hola, quiero información",
      "timestamp": 1234567890,
      "direction": "inbound",
      "platform_msg_id": "whatsapp_msg_123456"
    }
  }'
```

### 3. Verificar Endpoint de Debug

**Acceder al endpoint de debug:**
```
http://localhost:3000/api/webhooks/manychat/debug
```

**O en producción:**
```
https://phorencial-bot-8ztgzbllz-xorarg.vercel.app/api/webhooks/manychat/debug
```

Este endpoint muestra:
- Estado de configuración de Manychat
- Leads con manychatId
- Conversaciones existentes
- Mensajes recientes
- Conversaciones sin mensajes
- Test de conexión a Manychat API
- Recomendaciones automáticas

### 4. Verificar Logs en Producción

**Logs de Vercel:**
1. Ir a [Vercel Dashboard](https://vercel.com)
2. Seleccionar el proyecto `phorencial-bot-crm`
3. Ir a la pestaña "Logs"
4. Buscar requests a `/api/webhooks/manychat`

**Logs de Supabase:**
```sql
-- Verificar mensajes recientes
SELECT * FROM messages 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar conversaciones recientes
SELECT * FROM conversations 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar leads con manychatId
SELECT id, nombre, telefono, "manychatId", "createdAt" 
FROM "Lead" 
WHERE "manychatId" IS NOT NULL 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### 5. Verificar Configuración en Manychat

**Pasos en Manychat:**
1. Iniciar sesión en [Manychat Dashboard](https://manychat.com)
2. Ir a **Settings > Integrations > Webhooks**
3. Verificar que el webhook esté configurado con la URL correcta
4. Verificar que los eventos estén activados
5. Probar el webhook desde Manychat (si hay opción de "Test Webhook")

## 🐛 Problemas Comunes

### Problema: No se reciben webhooks

**Posibles causas:**
1. ❌ Webhook no configurado en Manychat
2. ❌ URL incorrecta en Manychat
3. ❌ Eventos no activados en Manychat
4. ❌ Firewall bloqueando requests de Manychat
5. ❌ Endpoint devolviendo error (Manychat deja de enviar después de varios errores)

**Solución:**
- Verificar logs de Vercel para ver si hay requests entrantes
- Verificar que el endpoint devuelva 200 OK siempre (incluso con errores internos)
- Probar el webhook manualmente con curl o Postman

### Problema: Webhooks recibidos pero no se guardan datos

**Posibles causas:**
1. ❌ Error en el procesamiento del webhook
2. ❌ Problema con la conexión a Supabase
3. ❌ Error en la validación de datos
4. ❌ Problema con RLS (Row Level Security) en Supabase

**Solución:**
- Verificar logs del endpoint `/api/webhooks/manychat`
- Verificar logs de Supabase para errores de inserción
- Probar insertar datos manualmente en Supabase
- Verificar políticas RLS en Supabase

### Problema: Conversaciones creadas pero sin mensajes

**Posibles causas:**
1. ❌ El webhook de mensajes no está activado
2. ❌ Los mensajes no se están guardando correctamente
3. ❌ El `platform_msg_id` está duplicado y se rechaza

**Solución:**
- Verificar que el evento `message_received` esté activado
- Verificar logs de inserción de mensajes
- Verificar que no haya duplicados en `platform_msg_id`

## 📊 Verificación Post-Webhook

Después de recibir un webhook, verificar:

```sql
-- 1. Verificar que se creó el lead
SELECT id, nombre, telefono, "manychatId", "createdAt"
FROM "Lead"
WHERE "manychatId" = '123456789' -- Reemplazar con el subscriber_id del webhook
ORDER BY "createdAt" DESC;

-- 2. Verificar que se creó la conversación
SELECT id, platform, platform_id, lead_id, "created_at"
FROM conversations
WHERE platform_id = '123456789' -- Reemplazar con el subscriber_id
ORDER BY created_at DESC;

-- 3. Verificar que se guardó el mensaje
SELECT id, conversation_id, direction, content, platform_msg_id, sent_at
FROM messages
WHERE platform_msg_id = 'whatsapp_msg_123456' -- Reemplazar con el platform_msg_id del webhook
ORDER BY sent_at DESC;
```

## 🚀 Próximos Pasos

1. **Configurar webhook en Manychat** con la URL de producción
2. **Activar todos los eventos** necesarios
3. **Probar enviando un mensaje** desde Manychat
4. **Verificar en el endpoint de debug** que los datos se están guardando
5. **Verificar en la UI** que las conversaciones aparecen en `/chats`

## 📝 Notas Importantes

- ⚠️ Manychat solo envía webhooks para eventos **futuros**, no históricos
- ⚠️ Si Manychat no recibe 200 OK, dejará de enviar webhooks después de varios intentos
- ⚠️ Los webhooks pueden tener un delay de algunos segundos
- ⚠️ Verificar que la URL del webhook sea HTTPS en producción (Manychat requiere HTTPS)

