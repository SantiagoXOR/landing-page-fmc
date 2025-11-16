# Configuración de Webhooks de Manychat

Esta guía explica cómo configurar los webhooks de Manychat para recibir mensajes, eventos de tags, custom fields y nuevos subscribers en tiempo real.

## 📋 Requisitos Previos

- Manychat API Key configurada en variables de entorno (`MANYCHAT_API_KEY`)
- Base de datos configurada con las tablas `Lead`, `Conversation` y `Message`
- URL pública de tu aplicación (para desarrollo local, usar ngrok o similar)

## 🔧 Configuración en Manychat

### 1. Acceder a la Configuración de Webhooks

1. Inicia sesión en tu cuenta de Manychat
2. Ve a **Settings** → **Webhooks**
3. Haz clic en **Add Webhook** o **New Webhook**

### 2. Configurar el Endpoint del Webhook

**URL del Webhook:**
```
https://tu-dominio.com/api/webhooks/manychat
```

Para desarrollo local:
```
https://tu-ngrok-url.ngrok.io/api/webhooks/manychat
```

### 3. Seleccionar Eventos a Activar

Activa los siguientes eventos:

- ✅ **new_subscriber** - Nuevo subscriber/contacto
- ✅ **subscriber_updated** - Subscriber actualizado
- ✅ **message_received** - Mensaje entrante del usuario
- ✅ **message_sent** - Mensaje saliente enviado por Manychat
- ✅ **tag_added** - Tag agregado a un subscriber
- ✅ **tag_removed** - Tag removido de un subscriber
- ✅ **custom_field_changed** - Custom field modificado

### 4. Configurar Autenticación (Opcional)

Si Manychat requiere un token de verificación:

1. Configura la variable de entorno `MANYCHAT_WEBHOOK_VERIFY_TOKEN` en tu `.env`:
```env
MANYCHAT_WEBHOOK_VERIFY_TOKEN=tu_token_secreto_aqui
```

2. Ingresa el mismo token en la configuración del webhook en Manychat

### 5. Guardar la Configuración

Guarda el webhook en Manychat. Manychat enviará un evento de prueba para verificar que el endpoint funciona.

## 🗄️ Configuración de Base de Datos

Ejecuta la migración SQL para asegurar que todos los índices necesarios estén creados:

```bash
# Ejecutar en el SQL Editor de Supabase
psql -f scripts/migrate-manychat-webhooks.sql
```

O copia y pega el contenido de `scripts/migrate-manychat-webhooks.sql` en el SQL Editor de Supabase.

## 🔄 Flujo de Funcionamiento

### Procesamiento de Eventos

1. **Manychat envía webhook** → `POST /api/webhooks/manychat`
2. **Endpoint recibe evento** → Normaliza y valida
3. **Servicio procesa evento** → Extrae subscriber y datos relevantes
4. **Buscar/Crear Lead**:
   - Busca por `manychatId` (subscriber_id) primero
   - Si no existe, busca por teléfono
   - Si no existe, crea nuevo lead automáticamente
5. **Buscar/Crear Conversación**:
   - Busca conversación existente por plataforma + platformId
   - Si no existe, crea nueva conversación
6. **Guardar Mensaje** (si aplica):
   - Verifica que no sea duplicado (por `platform_msg_id`)
   - Guarda en tabla `Message`
   - Actualiza última actividad de conversación
7. **Sincronizar Tags/Custom Fields** (si aplica):
   - Sincroniza datos desde Manychat al lead en el CRM

### Tipos de Eventos Procesados

#### Mensajes (`message_received`, `message_sent`)
- Crea o actualiza conversación
- Guarda mensaje con dirección (inbound/outbound)
- Actualiza última actividad del lead
- Asocia mensaje con lead por subscriber_id o teléfono

#### Nuevos Subscribers (`new_subscriber`)
- Crea lead automáticamente si no existe
- Sincroniza datos del subscriber al lead
- Crea conversación asociada

#### Tags (`tag_added`, `tag_removed`)
- Sincroniza tags desde Manychat al lead
- Actualiza campo `tags` en el lead (JSON array)

#### Custom Fields (`custom_field_changed`)
- Sincroniza custom fields desde Manychat al lead
- Actualiza campo `customFields` en el lead (JSON object)

## 📝 Variables de Entorno

Agrega estas variables a tu `.env`:

```env
# Manychat API
MANYCHAT_API_KEY=tu_api_key_aqui
MANYCHAT_BASE_URL=https://api.manychat.com

# Webhook (opcional)
MANYCHAT_WEBHOOK_VERIFY_TOKEN=tu_token_secreto_aqui
```

## 🧪 Pruebas

### 1. Verificar Endpoint

```bash
curl -X GET https://tu-dominio.com/api/webhooks/manychat
```

### 2. Enviar Evento de Prueba

Manychat enviará un evento de prueba al guardar el webhook. Verifica los logs:

```bash
# Ver logs del servidor
tail -f logs/app.log
```

### 3. Verificar en la Base de Datos

```sql
-- Ver mensajes recibidos recientemente
SELECT m.*, c.platform, c.platform_id, l.nombre as lead_nombre
FROM "Message" m
JOIN conversations c ON m.conversation_id = c.id
LEFT JOIN "Lead" l ON c.lead_id = l.id
ORDER BY m.sent_at DESC
LIMIT 10;

-- Ver conversaciones con mensajes recientes
SELECT c.*, l.nombre, l.telefono, COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN "Lead" l ON c.lead_id = l.id
LEFT JOIN "Message" m ON m.conversation_id = c.id
GROUP BY c.id, l.id
ORDER BY c.last_message_at DESC
LIMIT 10;
```

## 🐛 Troubleshooting

### Webhook no recibe eventos

1. **Verificar URL pública**: Asegúrate de que la URL sea accesible públicamente
2. **Verificar logs**: Revisa los logs del servidor para ver errores
3. **Verificar configuración en Manychat**: Confirma que el webhook esté activo
4. **Verificar firewall**: Asegúrate de que Manychat pueda acceder a tu servidor

### Mensajes duplicados

El sistema previene duplicados usando `platform_msg_id`. Si ves duplicados:

1. Verifica que el campo `platform_msg_id` esté configurado como UNIQUE
2. Verifica que Manychat esté enviando `message.id` o `platform_msg_id` en cada evento

### Leads no se crean automáticamente

1. Verifica que el subscriber tenga teléfono o `subscriber_id`
2. Verifica logs para ver errores específicos
3. Verifica permisos de base de datos (INSERT en tabla `Lead`)

### Sincronización no funciona

1. Verifica que `MANYCHAT_API_KEY` esté configurada correctamente
2. Verifica que el lead tenga `manychatId` asociado
3. Revisa logs para errores de API de Manychat

## 📊 Monitoreo

### Métricas a Monitorear

- Número de webhooks recibidos por minuto
- Número de mensajes guardados
- Número de leads creados automáticamente
- Tasa de errores en procesamiento de webhooks

### Logs

Todos los eventos se registran en los logs con:
- Tipo de evento
- Subscriber ID
- Lead ID (si existe)
- Errores (si los hay)

Ejemplo de log:
```
[INFO] Procesando webhook de Manychat { event_type: 'message_received', subscriber_id: 12345 }
[INFO] Webhook procesado exitosamente { leadId: 'abc123', conversationId: 'def456', messageId: 'msg789' }
```

## 🔐 Seguridad

- **Validación de origen**: Considera validar que los webhooks vengan realmente de Manychat
- **Rate limiting**: Implementa rate limiting si recibes muchos eventos
- **Autenticación**: Usa `MANYCHAT_WEBHOOK_VERIFY_TOKEN` si Manychat lo soporta
- **HTTPS**: Siempre usa HTTPS en producción

## 📚 Referencias

- [Manychat API Documentation](https://api.manychat.com/)
- [Webhooks Documentation](https://manychat.com/dynamic_block_docs/webhook_notification.html)
- Documentación del CRM: Ver `docs/MANYCHAT-INTEGRATION.md`

