# 🔄 Configurar Flow para Capturar Mensajes en Tiempo Real

## 📋 Problema

Actualmente, cuando ManyChat envía el "Full Contact Data" al finalizar una automatización, solo incluye el `last_input_text` (último mensaje). Esto significa que **solo se captura el último mensaje** de la conversación, perdiendo todo el historial de mensajes intermedios.

## ✅ Solución

Crear un **Flow en ManyChat** con el trigger **"Message Received"** que se dispare **cada vez que llega un mensaje** y envíe ese mensaje individual al webhook en tiempo real, en lugar de esperar al final de la automatización.

---

## 🚀 Paso a Paso: Configurar Flow para Mensajes en Tiempo Real

### Paso 1: Crear Nuevo Flow

1. En ManyChat, ve a **Automatizaciones** (Automation) en el menú principal
2. Haz clic en **"Nuevo Flow"** o **"Create Flow"**
3. Dale un nombre descriptivo: `"Webhook CRM - Mensajes en Tiempo Real"` o `"Capturar Mensajes Individuales"`

### Paso 2: Configurar Trigger "Message Received"

1. Haz clic en **"Agregar Trigger"** o **"Add Trigger"**
2. Busca y selecciona **"Message Received"** o **"Mensaje Recibido"**
3. Configura el trigger:
   - **Canal**: Selecciona **WhatsApp** (o el canal que uses)
   - **Tipo de mensaje**: Puedes seleccionar:
     - **Todos los mensajes** (recomendado para capturar todo)
     - **Solo texto** (si solo quieres mensajes de texto)
     - **Solo multimedia** (si solo quieres imágenes/videos)

### Paso 3: Agregar Acción HTTP Request

1. Haz clic en **"Agregar Acción"** o **"Add Action"**
2. Busca y selecciona **"HTTP Request"** o **"Webhook"**
3. Configura la acción:

#### URL del Webhook:
```
https://www.formosafmc.com.ar/api/webhooks/manychat
```

#### Método HTTP:
```
POST
```

#### Headers:
Agrega el siguiente header:
```
Content-Type: application/json
```

#### Body (JSON):
```json
{
  "event_type": "message_received",
  "subscriber_id": {{subscriber.id}},
  "subscriber": {
    "id": {{subscriber.id}},
    "key": "{{subscriber.key}}",
    "first_name": "{{subscriber.first_name}}",
    "last_name": "{{subscriber.last_name}}",
    "name": "{{subscriber.name}}",
    "phone": "{{subscriber.phone}}",
    "whatsapp_phone": "{{subscriber.whatsapp_phone}}",
    "email": "{{subscriber.email}}",
    "custom_fields": {{subscriber.custom_fields}},
    "tags": {{subscriber.tags}},
    "subscribed": "{{subscriber.subscribed}}",
    "last_interaction": "{{subscriber.last_interaction}}"
  },
  "message": {
    "id": "{{message.id}}",
    "type": "{{message.type}}",
    "text": "{{message.text}}",
    "timestamp": {{message.timestamp}},
    "direction": "inbound",
    "platform_msg_id": "{{message.id}}"
  },
  "timestamp": {{current_timestamp}}
}
```

**Nota importante**: En ManyChat, las variables se escriben con dobles llaves `{{variable}}`. Asegúrate de que ManyChat las reconozca como variables y no como texto literal.

### Paso 4: Guardar y Activar

1. Haz clic en **"Guardar"** o **"Save"**
2. **Activa el flow** haciendo clic en el interruptor (debe estar en verde/ON)
3. Verifica que el flow esté activo en la lista de automatizaciones

---

## 🔍 Variables Disponibles en ManyChat

### Variables del Mensaje

- `{{message.id}}` - ID único del mensaje (importante para evitar duplicados)
- `{{message.text}}` - Texto del mensaje (si es mensaje de texto)
- `{{message.type}}` - Tipo de mensaje: `text`, `image`, `video`, `audio`, `file`, etc.
- `{{message.timestamp}}` - Timestamp del mensaje (en segundos)
- `{{message.url}}` - URL del archivo multimedia (si aplica)
- `{{message.caption}}` - Caption de imagen/video (si aplica)

### Variables del Subscriber

- `{{subscriber.id}}` - ID del subscriber (manychatId)
- `{{subscriber.first_name}}` - Nombre
- `{{subscriber.last_name}}` - Apellido
- `{{subscriber.phone}}` - Teléfono
- `{{subscriber.whatsapp_phone}}` - Teléfono de WhatsApp
- `{{subscriber.email}}` - Email
- `{{subscriber.custom_fields}}` - Custom fields (JSON)
- `{{subscriber.tags}}` - Tags (JSON array)
- `{{subscriber.subscribed}}` - Fecha de suscripción
- `{{subscriber.last_interaction}}` - Última interacción

### Variables del Sistema

- `{{current_timestamp}}` - Timestamp actual (en segundos)

---

## ⚙️ Configuración Alternativa: Usar "Add Full Contact Data"

Si ManyChat tiene la opción **"+ Añadir Full Contact Data"** o **"Add Full Contact Data"** en la acción HTTP Request:

1. Haz clic en **"+ Añadir Full Contact Data"** o **"Add Full Contact Data"**
2. Esto agregará automáticamente todos los datos del contacto
3. Luego, agrega manualmente el objeto `message` con las variables del mensaje:

```json
{
  "message": {
    "id": "{{message.id}}",
    "type": "{{message.type}}",
    "text": "{{message.text}}",
    "timestamp": {{message.timestamp}},
    "direction": "inbound",
    "platform_msg_id": "{{message.id}}"
  },
  "event_type": "message_received"
}
```

**⚠️ Importante**: Aunque uses "Full Contact Data", debes agregar el objeto `message` manualmente porque "Full Contact Data" no incluye el mensaje actual, solo los datos del contacto.

---

## 🧪 Probar el Flow

### 1. Verificar que el Flow esté Activo

- El interruptor debe estar en verde/ON
- El flow debe aparecer en la lista de automatizaciones activas

### 2. Enviar Mensaje de Prueba

1. Envía un mensaje desde WhatsApp al número de ManyChat
2. Verifica que el flow se ejecute (puedes ver el historial de ejecución en ManyChat)
3. Revisa los logs del CRM para confirmar que el mensaje se recibió

### 3. Verificar en el CRM

1. Ve al CRM y busca el lead por teléfono
2. Abre la conversación del lead
3. Verifica que el mensaje aparezca en el historial
4. Confirma que el mensaje tenga el contenido correcto

### 4. Verificar Logs

Busca en los logs del servidor:
- `📨 Evento de mensaje detectado` - Confirma que se recibió el evento
- `✅ Mensaje guardado exitosamente` - Confirma que se guardó en la base de datos
- `🔄 Mensaje duplicado detectado y ignorado` - Si el mensaje ya existía (esto es normal si ManyChat envía el mismo mensaje dos veces)

---

## 🔄 Diferencia entre "Full Contact Data" y "Message Received"

### "Full Contact Data" (Actual - Solo último mensaje)

- Se envía **al finalizar** la automatización
- Solo incluye `last_input_text` (último mensaje)
- **Problema**: Solo captura el último mensaje, perdiendo el historial

### "Message Received" Trigger (Nuevo - Todos los mensajes)

- Se dispara **cada vez que llega un mensaje**
- Incluye el mensaje completo con su ID único
- **Ventaja**: Captura todos los mensajes en tiempo real

---

## ⚠️ Consideraciones Importantes

### 1. Duplicados

El sistema previene duplicados usando `platform_msg_id`. Si ManyChat envía el mismo mensaje dos veces, solo se guardará una vez.

### 2. Orden de Mensajes

Los mensajes se guardarán según lleguen al webhook, no necesariamente en orden cronológico si hay delays en la red. El sistema usa el `timestamp` del mensaje para ordenarlos correctamente.

### 3. Performance

Cada mensaje generará una llamada HTTP al webhook. Esto es necesario para capturar todos los mensajes, pero puede generar más tráfico que usar solo "Full Contact Data".

### 4. Compatibilidad

El endpoint sigue funcionando con "Full Contact Data" para otros flujos. Puedes tener ambos configurados:
- **Flow con "Message Received"**: Para capturar todos los mensajes en tiempo real
- **Flow con "Full Contact Data"**: Para actualizar datos del contacto al finalizar automatizaciones

---

## 🐛 Troubleshooting

### El mensaje no aparece en el CRM

1. **Verifica que el flow esté activo** en ManyChat
2. **Revisa el historial de ejecución** del flow en ManyChat para ver si hubo errores
3. **Verifica los logs del servidor** para ver si el webhook se recibió
4. **Confirma que el formato JSON sea correcto** (verifica que las variables se expandan correctamente)

### Mensajes duplicados

Si ves mensajes duplicados en el CRM:
1. Verifica que el `platform_msg_id` esté presente en el body del webhook
2. Revisa los logs para ver si se detectan duplicados: `🔄 Mensaje duplicado detectado y ignorado`
3. Si el problema persiste, verifica que el campo `platform_msg_id` en la tabla `messages` tenga una restricción UNIQUE

### El webhook no se dispara

1. **Verifica que el trigger esté configurado correctamente**:
   - Debe ser "Message Received" (no "Message Sent")
   - El canal debe coincidir con el que estás usando (WhatsApp, Instagram, etc.)
2. **Verifica que el flow esté activo** (interruptor en verde)
3. **Prueba enviando un mensaje** desde el canal configurado
4. **Revisa el historial de ejecución** del flow en ManyChat

### Error 400 o 500 en el webhook

1. **Verifica el formato JSON** del body
2. **Confirma que todas las variables estén correctamente escritas** con dobles llaves `{{variable}}`
3. **Revisa los logs del servidor** para ver el error específico
4. **Verifica que la URL del webhook sea correcta** y accesible públicamente

---

## 📚 Referencias

- [Documentación de ManyChat API](https://api.manychat.com/)
- [Guía de Configuración de Webhooks](docs/CONFIGURAR-WEBHOOK-MANYCHAT-PASO-A-PASO.md)
- [Documentación de Webhooks de ManyChat](docs/MANYCHAT-WEBHOOKS-SETUP.md)

---

## ✅ Checklist de Configuración

- [ ] Flow creado con nombre descriptivo
- [ ] Trigger "Message Received" configurado
- [ ] Canal correcto seleccionado (WhatsApp, Instagram, etc.)
- [ ] Acción HTTP Request agregada
- [ ] URL del webhook correcta: `https://www.formosafmc.com.ar/api/webhooks/manychat`
- [ ] Método HTTP: `POST`
- [ ] Header `Content-Type: application/json` agregado
- [ ] Body JSON configurado con `event_type: "message_received"`
- [ ] Variables del mensaje incluidas: `{{message.id}}`, `{{message.text}}`, etc.
- [ ] Variables del subscriber incluidas: `{{subscriber.id}}`, `{{subscriber.phone}}`, etc.
- [ ] Flow guardado y activado (interruptor en verde)
- [ ] Mensaje de prueba enviado
- [ ] Mensaje verificado en el CRM
- [ ] Logs revisados para confirmar recepción





















