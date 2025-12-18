# 🔧 Solución: Mensajes que se Reemplazan en lugar de Agregarse

## ❌ Problema

Cuando un usuario enviaba múltiples mensajes (ej: "Hola" y luego "Dónde esto?"), solo se guardaba el último mensaje en el CRM. El primer mensaje aparecía inicialmente pero luego se reemplazaba por el segundo.

## 🔍 Causa del Problema

El sistema detectaba los mensajes como "duplicados" cuando:
1. ManyChat enviaba el mismo `message.id` para diferentes mensajes
2. Los mensajes llegaban muy rápido y el timestamp era similar
3. El `platform_msg_id` se generaba solo con subscriber_id + timestamp, sin incluir el contenido

## ✅ Solución Implementada

### 1. Generación de IDs Únicos Basados en Contenido

Ahora el `platform_msg_id` se genera incluyendo:
- **ID del mensaje** (si existe)
- **Timestamp en milisegundos** (mayor precisión)
- **Hash del contenido** (primeros 30 caracteres del mensaje)
- **Número aleatorio** (para mayor unicidad)

**Ejemplo:**
- Mensaje "Hola": `manychat_123_1732801440000_hola_abc123`
- Mensaje "Dónde esto?": `manychat_123_1732801450000_donde_esto_xyz789`

### 2. Verificación Inteligente de Duplicados

El sistema ahora verifica duplicados de dos formas:
1. **Por `platform_msg_id`**: Si el ID es igual
2. **Por contenido**: Si el contenido es diferente, genera un nuevo ID único

Esto evita que mensajes diferentes con el mismo ID se detecten como duplicados.

### 3. Mejoras en el Logging

Se agregó logging detallado para:
- Detectar cuando se generan nuevos IDs para mensajes diferentes
- Identificar duplicados reales vs mensajes diferentes
- Facilitar el debugging

## 📝 Cambios Realizados

### Archivo: `src/app/api/webhooks/manychat/route.ts`

1. **Función `normalizeMessage()`**:
   - Ahora genera `platform_msg_id` único basado en contenido + timestamp + random
   - Si el mensaje ya tiene ID, lo mejora agregando hash del contenido

2. **Transformación de "Full Contact Data"**:
   - Genera IDs únicos que incluyen el contenido del mensaje

3. **Validación de mensajes**:
   - Mejora los IDs existentes agregando información del contenido

### Archivo: `src/server/services/manychat-webhook-service.ts`

1. **Función `saveMessage()`**:
   - Verifica duplicados comparando tanto ID como contenido
   - Si encuentra mismo ID pero contenido diferente, genera nuevo ID único
   - Logging mejorado para debugging

## 🧪 Cómo Verificar que Funciona

1. **Envía dos mensajes diferentes** desde WhatsApp:
   - Primer mensaje: "Hola"
   - Segundo mensaje: "Dónde esto?"

2. **Verifica en el CRM**:
   - Ambos mensajes deben aparecer en la conversación
   - No deben reemplazarse entre sí
   - Deben tener timestamps diferentes

3. **Revisa los logs**:
   - Busca: `✅ Mensaje guardado exitosamente`
   - No debería aparecer: `🔄 Mensaje duplicado detectado` para mensajes diferentes
   - Si aparece: `⚠️ Mensaje con mismo platform_msg_id pero contenido diferente`, verifica que se generó un nuevo ID

## 🔄 Flujo de Funcionamiento

```
1. Usuario envía "Hola"
   ↓
2. ManyChat envía webhook con message.id = "msg_123"
   ↓
3. Sistema genera platform_msg_id = "msg_123_1732801440000_hola_abc123"
   ↓
4. Verifica duplicados → No existe → Guarda mensaje
   ↓
5. Usuario envía "Dónde esto?"
   ↓
6. ManyChat envía webhook con message.id = "msg_123" (mismo ID)
   ↓
7. Sistema genera platform_msg_id = "msg_123_1732801450000_donde_esto_xyz789"
   ↓
8. Verifica duplicados → ID diferente → Guarda como nuevo mensaje
   ↓
9. Ambos mensajes aparecen en la conversación ✅
```

## ⚠️ Consideraciones

- **IDs largos**: Los `platform_msg_id` ahora son más largos porque incluyen el contenido
- **Performance**: La verificación de duplicados es ligeramente más costosa pero necesaria
- **Compatibility**: Compatible con mensajes existentes en la base de datos

## 📊 Ejemplo de Logs

### Mensaje 1: "Hola"
```
✅ Mensaje guardado exitosamente en base de datos {
  messageId: "msg_abc123",
  platformMsgId: "msg_123_1732801440000_hola_abc123",
  content: "Hola",
  direction: "inbound"
}
```

### Mensaje 2: "Dónde esto?"
```
⚠️ Mensaje con mismo platform_msg_id pero contenido diferente, generando nuevo ID {
  existingPlatformMsgId: "msg_123",
  existingContent: "Hola",
  newContent: "Dónde esto?",
  conversationId: "conv_xyz789"
}

✅ Nuevo platform_msg_id generado para mensaje diferente {
  newPlatformMsgId: "msg_123_1732801450000_donde_esto_xyz789"
}

✅ Mensaje guardado exitosamente en base de datos {
  messageId: "msg_def456",
  platformMsgId: "msg_123_1732801450000_donde_esto_xyz789",
  content: "Dónde esto?",
  direction: "inbound"
}
```

## 🐛 Troubleshooting

### Si aún se reemplazan mensajes:

1. **Verifica los logs** para ver si se están detectando como duplicados
2. **Revisa el `platform_msg_id`** generado para cada mensaje
3. **Confirma que ManyChat está enviando diferentes mensajes** con contenido diferente
4. **Verifica que la base de datos tenga la restricción UNIQUE en `platform_msg_id`**

### Si aparecen muchos "duplicados diferentes":

- Esto es normal cuando ManyChat envía el mismo `message.id` para diferentes mensajes
- El sistema automáticamente generará nuevos IDs únicos
- Los mensajes se guardarán correctamente

## 📚 Referencias

- [Configurar Flow para Mensajes en Tiempo Real](CONFIGURAR-FLOW-MENSAJES-TIEMPO-REAL.md)
- [Configurar Webhook en ManyChat](CONFIGURAR-WEBHOOK-MANYCHAT-PASO-A-PASO.md)
























