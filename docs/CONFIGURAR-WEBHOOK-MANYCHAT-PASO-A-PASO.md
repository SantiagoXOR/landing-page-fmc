# 🔧 Configurar Webhook en Manychat - Guía Paso a Paso

## ⚠️ Situación Actual

Manychat **NO tiene webhooks salientes configurables directamente** en su interfaz para la mayoría de planes. En su lugar, debemos usar **Flows (Automatizaciones)** con acciones **HTTP Request** para enviar eventos a nuestro endpoint.

## ✅ Solución: Usar Flows con HTTP Request

Vamos a crear flows en Manychat que envíen HTTP requests a nuestro webhook cuando ocurran eventos.

---

## 🎯 Captura de Mensajes: Full Contact Data vs Message Received

### ⚠️ Problema con "Full Contact Data"

Cuando ManyChat envía el **"Full Contact Data"** al finalizar una automatización, **solo incluye el último mensaje** (`last_input_text`). Esto significa que:
- ❌ Solo se captura el **último mensaje** de la conversación
- ❌ Se **pierde todo el historial** de mensajes intermedios
- ❌ No se pueden ver las respuestas anteriores del usuario

### ✅ Solución: Trigger "Message Received"

Para capturar **todos los mensajes en tiempo real**, debes crear un Flow con el trigger **"Message Received"** que se dispare **cada vez que llega un mensaje**.

**Ventajas:**
- ✅ Captura **todos los mensajes** individualmente
- ✅ Se guardan en tiempo real, no solo al final
- ✅ Permite ver el historial completo de la conversación
- ✅ Cada mensaje tiene su ID único para evitar duplicados

### 📚 Guía Detallada

Para configurar la captura de mensajes en tiempo real, consulta la guía completa:
- **[Configurar Flow para Mensajes en Tiempo Real](CONFIGURAR-FLOW-MENSAJES-TIEMPO-REAL.md)**

### 🔄 Compatibilidad

Puedes tener **ambos configurados**:
- **Flow con "Message Received"**: Para capturar todos los mensajes en tiempo real
- **Flow con "Full Contact Data"**: Para actualizar datos del contacto al finalizar automatizaciones

---

## 📋 Paso 1: Crear Flow para Mensajes Recibidos (Tiempo Real)

---

## 📋 Paso 1: Crear Flow para Mensajes Recibidos (Tiempo Real)

> **💡 Nota**: Este flow captura **cada mensaje individual** en tiempo real. Si solo necesitas actualizar datos al finalizar una automatización, ve al [Paso 3](#-paso-3-crear-flow-para-nuevos-subscribers).

### 1.1. Crear Nuevo Flow

1. En Manychat, ve a **Automatizaciones** (Automation) en el menú principal
2. Haz clic en **"Nuevo Flow"** o **"Create Flow"**
3. Dale un nombre: `"Webhook CRM - Mensajes en Tiempo Real"` o `"Capturar Mensajes Individuales"`

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
  "subscriber_id": {{subscriber.id}},
  "subscriber": {
    "id": {{subscriber.id}},
    "key": "{{subscriber.key}}",
    "first_name": "{{subscriber.first_name}}",
    "last_name": "{{subscriber.last_name}}",
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

**⚠️ Importante**: 
- Este flow se dispara **cada vez que llega un mensaje**, capturando todos los mensajes en tiempo real
- El `{{message.id}}` es crucial para evitar duplicados
- Si ManyChat tiene la opción "Add Full Contact Data", puedes usarla pero **debes agregar el objeto `message` manualmente** porque "Full Contact Data" no incluye el mensaje actual

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

### ⚠️ IMPORTANTE: Configuración Correcta del Trigger

**Para asegurar que se creen contactos nuevos en el CRM, es CRÍTICO configurar correctamente el trigger.**

### 3.1. Crear Nuevo Flow

1. Nombre: `"Webhook CRM - Nuevo Subscriber"` o `"Webhook CRM - Mensajes Recibidos"`

### 3.2. Configurar Trigger (⚠️ PASO CRÍTICO)

**Debes habilitar AMBOS triggers para capturar contactos nuevos:**

#### Opción A: Trigger "Nuevo Contacto Creado" (RECOMENDADO)

1. Haz clic en **"Agregar Trigger"** o **"Add Trigger"**
2. Selecciona **"Contact Event"** o **"Se produce un evento de contactos"**
3. Selecciona **"New Contact Created"** o **"Nuevo contacto creado"**
4. **⚠️ Asegúrate de que este trigger esté HABILITADO (ON/Verde)**

Este trigger se dispara **inmediatamente** cuando se crea un nuevo contacto en Manychat, antes de que complete cualquier flujo.

#### Opción B: Trigger "Otro Flujo" (Para actualizaciones)

1. Haz clic en **"Agregar Trigger"** o **"Add Trigger"**
2. Selecciona **"Another Flow"** o **"Otro flujo"**
3. Selecciona el flujo que quieres monitorear (ej: "FLOW 01 - Intake Lead Phronencial")
4. Este trigger se dispara cuando se **completa** el flujo seleccionado

**⚠️ PROBLEMA COMÚN**: Si solo usas el trigger "Otro flujo", el webhook se dispara cuando el contacto **ya completó el flujo**, lo que significa que el contacto ya existe. Por eso es importante tener **AMBOS triggers habilitados**:
- **"Nuevo contacto creado"**: Para crear contactos nuevos inmediatamente
- **"Otro flujo"**: Para actualizar contactos cuando completan flujos

### 3.3. Agregar Acción HTTP Request

**URL:** `https://www.formosafmc.com.ar/api/webhooks/manychat`

**Método:** `POST`

**Body (Formato "Full Contact Data" - RECOMENDADO):**

Manychat puede enviar datos en formato "Full Contact Data" que incluye toda la información del contacto. El sistema detecta automáticamente este formato y lo transforma correctamente.

**Opción 1: Usar "Full Contact Data" (Más completo):**
En Manychat, en la acción HTTP Request, selecciona **"Add Full Contact Data"** o **"+ Añadir Full Contact Data"**. Esto enviará todos los datos del contacto automáticamente.

**Opción 2: Formato JSON manual:**
```json
{
  "id": "{{subscriber.id}}",
  "key": "{{subscriber.key}}",
  "first_name": "{{subscriber.first_name}}",
  "last_name": "{{subscriber.last_name}}",
  "phone": "{{subscriber.phone}}",
  "whatsapp_phone": "{{subscriber.whatsapp_phone}}",
  "email": "{{subscriber.email}}",
  "custom_fields": {{subscriber.custom_fields}},
  "tags": {{subscriber.tags}},
  "subscribed": "{{subscriber.subscribed}}",
  "last_interaction": "{{subscriber.last_interaction}}"
}
```

**Nota**: El sistema detecta automáticamente si es un nuevo contacto basándose en:
- Fecha de suscripción reciente (últimas 24 horas)
- Ausencia de interacciones previas
- Comparación entre fecha de suscripción e interacción

### 3.4. Verificar Configuración

**Checklist antes de activar:**

- [ ] Trigger "Nuevo contacto creado" está **HABILITADO** (ON/Verde)
- [ ] Trigger "Otro flujo" está configurado (opcional, para actualizaciones)
- [ ] URL del webhook es correcta: `https://www.formosafmc.com.ar/api/webhooks/manychat`
- [ ] Método HTTP es `POST`
- [ ] Headers incluyen `Content-Type: application/json`
- [ ] Body incluye datos del contacto (Full Contact Data o formato manual)

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

### 2. Verificar Configuración del Trigger "Nuevo Contacto"

**⚠️ PASO CRÍTICO**: Antes de probar, verifica que el trigger "Nuevo contacto creado" esté habilitado:

1. Abre el flow "Webhook CRM - Mensajes Recibidos" o "Webhook CRM - Nuevo Subscriber"
2. Revisa la sección de triggers
3. Verifica que **"Se produce un evento de contactos" → "Nuevo contacto creado"** esté:
   - ✅ **HABILITADO** (toggle en verde/ON)
   - ✅ **NO deshabilitado** (no debe mostrar "Deshabilitado" en gris)

**Si el trigger está deshabilitado:**
- El webhook solo se disparará cuando se complete un flujo
- Los contactos nuevos NO se crearán automáticamente
- Solo se actualizarán contactos existentes

### 3. Probar con Contacto Nuevo

1. **Crear contacto completamente nuevo**:
   - Usa un número de teléfono que NO exista en Manychat
   - Envía un mensaje inicial desde WhatsApp
   - O crea el contacto manualmente en Manychat

2. **Verificar en el CRM**:
   - El contacto debe aparecer como **nuevo lead** en el CRM
   - Debe tener el estado "NUEVO"
   - Debe tener el `manychatId` asociado

3. **Verificar logs**:
   - Busca en los logs: `🆕 Lead CREADO automáticamente desde subscriber (NUEVO)`
   - Verifica que el `event_type` sea `new_subscriber`
   - Verifica que `action: CREATE` aparezca en los logs

### 4. Verificar Logs

Si algo no funciona, revisa:

**En Manychat:**
- Los logs de ejecución del flow (en cada flow hay un historial)
- Verifica que el webhook se haya ejecutado
- Verifica el código de respuesta (debe ser 200)

**En el CRM:**
- Los logs de la aplicación en Vercel
- El endpoint de debug: `/api/webhooks/manychat/debug`
- Busca logs con emojis: `📥 Evento NEW_SUBSCRIBER recibido` o `🆕 Lead CREADO`

**Errores comunes:**
- Si ves `✅ Lead encontrado por teléfono (EXISTENTE)` → El contacto ya existía
- Si ves `action: UPDATE` en lugar de `action: CREATE` → El contacto no es nuevo
- Si no ves ningún log → El webhook no se está disparando (verificar triggers)

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

## 📊 Comparación: Full Contact Data vs Message Received

### Full Contact Data (Al finalizar automatización)

**Cuándo usar:**
- Para actualizar datos del contacto al finalizar una automatización
- Cuando solo necesitas el último mensaje
- Para sincronizar custom fields y tags

**Ventajas:**
- Se envía una sola vez al final
- Incluye todos los datos del contacto
- Menos llamadas HTTP

**Desventajas:**
- ❌ Solo incluye el último mensaje (`last_input_text`)
- ❌ No captura el historial completo de mensajes
- ❌ Se pierden mensajes intermedios

### Message Received Trigger (Tiempo real)

**Cuándo usar:**
- Para capturar todos los mensajes de la conversación
- Cuando necesitas ver el historial completo
- Para análisis de conversaciones

**Ventajas:**
- ✅ Captura todos los mensajes individualmente
- ✅ Se guardan en tiempo real
- ✅ Permite ver el historial completo

**Desventajas:**
- Genera más llamadas HTTP (una por mensaje)
- Requiere configuración adicional del Flow

### Recomendación

**Usa ambos:**
1. **Flow con "Message Received"**: Para capturar todos los mensajes en tiempo real
2. **Flow con "Full Contact Data"**: Para actualizar datos del contacto al finalizar automatizaciones

Para más detalles sobre cómo configurar la captura de mensajes en tiempo real, consulta:
- **[Guía Completa: Configurar Flow para Mensajes en Tiempo Real](CONFIGURAR-FLOW-MENSAJES-TIEMPO-REAL.md)**

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

