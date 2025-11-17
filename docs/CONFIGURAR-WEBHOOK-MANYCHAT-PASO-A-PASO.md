# 🔧 Configurar Webhook en Manychat - Guía Paso a Paso

## ⚠️ Situación Actual

Manychat **NO tiene webhooks salientes configurables directamente** en su interfaz para la mayoría de planes. En su lugar, debemos usar **Flows (Automatizaciones)** con acciones **HTTP Request** para enviar eventos a nuestro endpoint.

## ✅ Solución: Usar Flows con HTTP Request

Vamos a crear flows en Manychat que envíen HTTP requests a nuestro webhook cuando ocurran eventos.

---

## 📋 Paso 1: Crear Flow para Mensajes Recibidos

### 1.1. Crear Nuevo Flow

1. En Manychat, ve a **Automatizaciones** (Automation) en el menú principal
2. Haz clic en **"Nuevo Flow"** o **"Create Flow"**
3. Dale un nombre: `"Enviar mensajes al CRM"` o `"Webhook CRM - Mensajes"`

### 1.2. Configurar Trigger

1. Haz clic en **"Agregar Trigger"** o **"Add Trigger"**
2. Selecciona **"Message Received"** o **"Mensaje Recibido"**
3. Configura:
   - **Canal**: WhatsApp (o el canal que uses)
   - **Tipo**: Todos los mensajes o solo texto (según necesites)

### 1.3. Agregar Acción HTTP Request

1. Haz clic en **"Agregar Acción"** o **"Add Action"**
2. Busca y selecciona **"HTTP Request"** o **"Webhook"**
3. Configura la acción:

**URL:**
```
https://www.formosafmc.com.ar/api/webhooks/manychat
```

**Método:**
```
POST
```

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body (JSON):**
```json
{
  "event_type": "message_received",
  "subscriber_id": "{{subscriber.id}}",
  "subscriber": {
    "id": "{{subscriber.id}}",
    "first_name": "{{subscriber.first_name}}",
    "last_name": "{{subscriber.last_name}}",
    "phone": "{{subscriber.phone}}",
    "whatsapp_phone": "{{subscriber.whatsapp_phone}}",
    "custom_fields": {{subscriber.custom_fields}},
    "tags": {{subscriber.tags}}
  },
  "message": {
    "id": "{{message.id}}",
    "type": "text",
    "text": "{{message.text}}",
    "timestamp": "{{message.timestamp}}",
    "direction": "inbound",
    "platform_msg_id": "{{message.id}}"
  },
  "timestamp": "{{current_timestamp}}"
}
```

### 1.4. Guardar y Activar

1. Haz clic en **"Guardar"** o **"Save"**
2. Activa el flow haciendo clic en el interruptor
3. Prueba enviando un mensaje de prueba

---

## 📋 Paso 2: Crear Flow para Mensajes Enviados

### 2.1. Crear Nuevo Flow

1. Ve a **Automatizaciones** → **Nuevo Flow**
2. Nombre: `"Webhook CRM - Mensajes Enviados"`

### 2.2. Configurar Trigger

1. Trigger: **"Message Sent"** o **"Mensaje Enviado"**
2. Configura según tus necesidades

### 2.3. Agregar Acción HTTP Request

**URL:** `https://www.formosafmc.com.ar/api/webhooks/manychat`

**Método:** `POST`

**Body:**
```json
{
  "event_type": "message_sent",
  "subscriber_id": "{{subscriber.id}}",
  "subscriber": {
    "id": "{{subscriber.id}}",
    "first_name": "{{subscriber.first_name}}",
    "last_name": "{{subscriber.last_name}}",
    "phone": "{{subscriber.phone}}"
  },
  "message": {
    "id": "{{message.id}}",
    "type": "text",
    "text": "{{message.text}}",
    "timestamp": "{{message.timestamp}}",
    "direction": "outbound",
    "platform_msg_id": "{{message.id}}"
  },
  "timestamp": "{{current_timestamp}}"
}
```

---

## 📋 Paso 3: Crear Flow para Nuevos Subscribers

### 3.1. Crear Nuevo Flow

1. Nombre: `"Webhook CRM - Nuevo Subscriber"`

### 3.2. Configurar Trigger

1. Trigger: **"New Subscriber"** o **"Nuevo Subscriber"**

### 3.3. Agregar Acción HTTP Request

**URL:** `https://www.formosafmc.com.ar/api/webhooks/manychat`

**Método:** `POST`

**Body:**
```json
{
  "event_type": "new_subscriber",
  "subscriber_id": "{{subscriber.id}}",
  "subscriber": {
    "id": "{{subscriber.id}}",
    "first_name": "{{subscriber.first_name}}",
    "last_name": "{{subscriber.last_name}}",
    "phone": "{{subscriber.phone}}",
    "whatsapp_phone": "{{subscriber.whatsapp_phone}}",
    "email": "{{subscriber.email}}",
    "custom_fields": {{subscriber.custom_fields}},
    "tags": {{subscriber.tags}}
  },
  "timestamp": "{{current_timestamp}}"
}
```

---

## 📋 Paso 4: Crear Flow para Tags Agregados

### 4.1. Crear Nuevo Flow

1. Nombre: `"Webhook CRM - Tag Agregado"`

### 4.2. Configurar Trigger

1. Trigger: **"Tag Added"** o **"Tag Agregado"**
2. Selecciona qué tags activan este flow (o todos)

### 4.3. Agregar Acción HTTP Request

**URL:** `https://www.formosafmc.com.ar/api/webhooks/manychat`

**Método:** `POST`

**Body:**
```json
{
  "event_type": "tag_added",
  "subscriber_id": "{{subscriber.id}}",
  "subscriber": {
    "id": "{{subscriber.id}}",
    "phone": "{{subscriber.phone}}"
  },
  "tag": {
    "id": "{{tag.id}}",
    "name": "{{tag.name}}"
  },
  "timestamp": "{{current_timestamp}}"
}
```

---

## 📋 Paso 5: Crear Flow para Tags Removidos

Similar al anterior pero con trigger **"Tag Removed"** y `event_type: "tag_removed"`.

---

## 📋 Paso 6: Crear Flow para Custom Fields Cambiados

### 6.1. Crear Nuevo Flow

1. Nombre: `"Webhook CRM - Custom Field Cambiado"`

### 6.2. Configurar Trigger

1. Trigger: **"Custom Field Changed"** o **"Custom Field Cambiado"**

### 6.3. Agregar Acción HTTP Request

**URL:** `https://www.formosafmc.com.ar/api/webhooks/manychat`

**Método:** `POST`

**Body:**
```json
{
  "event_type": "custom_field_changed",
  "subscriber_id": "{{subscriber.id}}",
  "subscriber": {
    "id": "{{subscriber.id}}",
    "phone": "{{subscriber.phone}}"
  },
  "custom_field": {
    "id": "{{custom_field.id}}",
    "name": "{{custom_field.name}}",
    "value": "{{custom_field.value}}"
  },
  "timestamp": "{{current_timestamp}}"
}
```

---

## 🧪 Probar los Flows

### 1. Activar Todos los Flows

Asegúrate de que todos los flows estén **activados** (el interruptor debe estar en verde/ON).

### 2. Enviar Mensaje de Prueba

1. Envía un mensaje de prueba desde WhatsApp a tu número de Manychat
2. Verifica en `/api/webhooks/manychat/debug` que se recibió el evento
3. Verifica en la base de datos que se guardaron los datos

### 3. Verificar Logs

Si algo no funciona, revisa:
- Los logs de Manychat (en cada flow hay un historial de ejecuciones)
- Los logs de tu aplicación en Vercel
- El endpoint de debug: `/api/webhooks/manychat/debug`

---

## 🔍 Variables Disponibles en Manychat

Cuando configures el Body del HTTP Request, puedes usar estas variables:

### Variables del Subscriber
- `{{subscriber.id}}` - ID del subscriber
- `{{subscriber.first_name}}` - Nombre
- `{{subscriber.last_name}}` - Apellido
- `{{subscriber.phone}}` - Teléfono
- `{{subscriber.whatsapp_phone}}` - Teléfono de WhatsApp
- `{{subscriber.email}}` - Email
- `{{subscriber.custom_fields}}` - Custom fields (JSON)
- `{{subscriber.tags}}` - Tags (JSON array)

### Variables del Mensaje
- `{{message.id}}` - ID del mensaje
- `{{message.text}}` - Texto del mensaje
- `{{message.type}}` - Tipo de mensaje
- `{{message.timestamp}}` - Timestamp

### Variables del Tag
- `{{tag.id}}` - ID del tag
- `{{tag.name}}` - Nombre del tag

### Variables del Custom Field
- `{{custom_field.id}}` - ID del custom field
- `{{custom_field.name}}` - Nombre del campo
- `{{custom_field.value}}` - Valor del campo

---

## ⚠️ Limitaciones y Consideraciones

1. **No hay webhooks nativos**: Manychat no tiene webhooks salientes configurables directamente
2. **Requiere crear flows**: Debes crear un flow para cada tipo de evento
3. **Depende de triggers**: Los flows solo se activan cuando ocurre el trigger configurado
4. **Rate limiting**: Manychat puede tener límites en la cantidad de HTTP requests

---

## 🚀 Alternativa: Usar Manychat API para Polling

Si los flows no funcionan bien, puedes usar polling (consultar la API periódicamente):

```typescript
// Consultar mensajes recientes cada 5 minutos
setInterval(async () => {
  const subscribers = await ManychatService.getSubscribers({ limit: 100 })
  // Procesar cada subscriber y sus mensajes
}, 5 * 60 * 1000)
```

Pero esto es menos eficiente que los webhooks/flows.

---

## 📞 Soporte

Si tienes problemas:
1. Verifica que los flows estén activados
2. Revisa los logs de ejecución de cada flow en Manychat
3. Verifica que la URL del webhook sea accesible públicamente
4. Usa el endpoint de debug para ver qué eventos se están recibiendo

