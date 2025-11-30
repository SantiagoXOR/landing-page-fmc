# 📤 Enviar Mensajes desde CRM usando ManyChat API (Multi-Canal)

## Introducción

Esta guía explica cómo enviar mensajes desde el CRM usando la API de ManyChat, soportando múltiples canales de comunicación: **WhatsApp**, **Instagram** y **Facebook Messenger**.

ManyChat proporciona una API unificada que permite enviar mensajes a través de diferentes plataformas de mensajería desde una sola interfaz. El canal se determina automáticamente según la información del subscriber (contacto) en ManyChat.

---

## 🎯 Endpoint Principal: `/fb/sending/sendContent`

ManyChat utiliza un único endpoint para enviar mensajes a través de todos los canales soportados. El canal se determina automáticamente según la información del subscriber.

### Estructura del Request

```typescript
POST https://api.manychat.com/fb/sending/sendContent
Authorization: Bearer {MANYCHAT_API_KEY}
Content-Type: application/json

{
  "subscriber_id": 123456789,
  "data": {
    "version": "v2",
    "messages": [
      {
        "type": "text",
        "text": "Hola, ¿cómo puedo ayudarte?"
      }
    ],
    "tag": "opcional_tag_name"
  }
}
```

### Parámetros

- **`subscriber_id`** (requerido): ID único del subscriber en ManyChat
- **`data.version`** (requerido): Versión de la API, usar `"v2"`
- **`data.messages`** (requerido): Array de mensajes a enviar
- **`data.tag`** (opcional): Tag para etiquetar el mensaje en ManyChat

---

## 🔍 Cómo ManyChat Determina el Canal

ManyChat determina automáticamente el canal a usar basándose en la información del subscriber:

### WhatsApp
- El subscriber tiene un número de teléfono (`phone` o `whatsapp_phone`)
- ManyChat está conectado a WhatsApp Business
- El subscriber está activo en WhatsApp

### Instagram
- El subscriber tiene un `instagram_id`
- ManyChat está conectado a una cuenta de Instagram Business
- El subscriber ha interactuado por Instagram

### Facebook Messenger
- El subscriber está asociado a una página de Facebook
- El subscriber tiene un ID de Facebook
- Es el canal por defecto si WhatsApp/Instagram no están disponibles

### Detección Automática

Muchas veces, un subscriber puede estar disponible en múltiples canales. ManyChat enviará el mensaje por el canal que tenga la prioridad más alta según la configuración de tu cuenta.

---

## 🔎 Identificar Subscriber

Para enviar un mensaje, primero necesitas obtener el `subscriber_id` del contacto. ManyChat ofrece varios métodos:

### 1. Por Teléfono (WhatsApp)

```typescript
GET https://api.manychat.com/fb/subscriber/findBySystemField?phone=+5491155556789
Authorization: Bearer {MANYCHAT_API_KEY}
```

**Respuesta exitosa:**
```json
{
  "status": "success",
  "data": {
    "id": 123456789,
    "key": "subscriber_key",
    "phone": "+5491155556789",
    "whatsapp_phone": "+5491155556789",
    "first_name": "Juan",
    "last_name": "Pérez",
    "status": "active"
  }
}
```

### 2. Por Email (Instagram/Facebook)

```typescript
GET https://api.manychat.com/fb/subscriber/findBySystemField?email=usuario@example.com
Authorization: Bearer {MANYCHAT_API_KEY}
```

**Respuesta exitosa:**
```json
{
  "status": "success",
  "data": {
    "id": 987654321,
    "key": "subscriber_key",
    "email": "usuario@example.com",
    "instagram_id": "instagram_user_id",
    "first_name": "María",
    "status": "active"
  }
}
```

### 3. Por Subscriber ID (Si ya lo conoces)

```typescript
GET https://api.manychat.com/fb/subscriber/getInfo?subscriber_id=123456789
Authorization: Bearer {MANYCHAT_API_KEY}
```

---

## 📝 Ejemplos de Código

### Envío de Mensaje de Texto Simple

```typescript
import { ManychatService } from '@/server/services/manychat-service'

// Buscar subscriber por teléfono
const subscriber = await ManychatService.getSubscriberByPhone('+5491155556789')

if (!subscriber) {
  throw new Error('Subscriber no encontrado')
}

// Enviar mensaje de texto
const result = await ManychatService.sendTextMessage(
  subscriber.id,
  'Hola, ¿cómo puedo ayudarte?'
)

if (result) {
  console.log('Mensaje enviado exitosamente')
}
```

### Envío de Mensaje con Imagen

```typescript
const result = await ManychatService.sendImageMessage(
  subscriber.id,
  'https://ejemplo.com/imagen.jpg',
  'Esta es una imagen de ejemplo'
)
```

### Envío de Mensaje con Archivo

```typescript
const result = await ManychatService.sendFileMessage(
  subscriber.id,
  'https://ejemplo.com/documento.pdf',
  'documento.pdf'
)
```

### Envío de Mensaje con Múltiples Elementos

```typescript
import { ManychatMessage } from '@/types/manychat'

const messages: ManychatMessage[] = [
  {
    type: 'text',
    text: 'Bienvenido a nuestro servicio'
  },
  {
    type: 'image',
    url: 'https://ejemplo.com/imagen.jpg',
    caption: 'Nuestra oferta'
  }
]

const result = await ManychatService.sendMessage(subscriber.id, messages)
```

---

## 🌐 Diferencias entre Canales

### WhatsApp

**Capacidades:**
- ✅ Mensajes de texto
- ✅ Imágenes, videos, audio
- ✅ Documentos (PDF, DOC, etc.)
- ✅ Ubicación
- ✅ Contactos
- ✅ Listas interactivas (dentro de ventana de 24h)
- ✅ Botones de respuesta rápida
- ✅ Templates (fuera de ventana de 24h)

**Limitaciones:**
- ⚠️ **Ventana de 24 horas**: Solo puedes enviar mensajes libres dentro de las 24 horas posteriores al último mensaje del usuario
- ⚠️ **Fuera de ventana**: Debes usar templates aprobados por Meta
- ⚠️ **No soporta**: Mensajes con elementos visuales complejos como carruseles

**Requisitos:**
- Número de teléfono en formato E.164 (ej: `+5491155556789`)
- ManyChat conectado a WhatsApp Business API

### Instagram

**Capacidades:**
- ✅ Mensajes de texto
- ✅ Imágenes, videos
- ✅ Stickers
- ✅ Botones de respuesta rápida (limitados)

**Limitaciones:**
- ⚠️ Similar a WhatsApp: ventana de 24 horas para mensajes libres
- ⚠️ Menos tipos de mensajes interactivos que Facebook Messenger
- ⚠️ No soporta archivos grandes

**Requisitos:**
- Instagram Business account conectada a ManyChat
- `instagram_id` del subscriber

### Facebook Messenger

**Capacidades:**
- ✅ Mensajes de texto
- ✅ Imágenes, videos, audio
- ✅ Archivos
- ✅ Ubicación
- ✅ Botones interactivos
- ✅ Carruseles de productos
- ✅ Mensajes persistentes (fuera de ventana de 24h)

**Limitaciones:**
- ⚠️ Menos restricciones que WhatsApp/Instagram
- ⚠️ Puede requerir interacción previa del usuario

**Requisitos:**
- Página de Facebook conectada a ManyChat
- ID de Facebook del subscriber

---

## ⚠️ Manejo de Errores

### Errores Comunes

#### 1. Subscriber No Encontrado

```json
{
  "status": "error",
  "error": "Subscriber not found",
  "error_code": "SUBSCRIBER_NOT_FOUND"
}
```

**Solución:**
- Verificar que el teléfono/email esté correctamente formateado
- Asegurarse de que el subscriber existe en ManyChat
- Considerar crear el subscriber primero o sincronizar desde el CRM

#### 2. Canal No Disponible

```json
{
  "status": "error",
  "error": "Channel not available",
  "error_code": "CHANNEL_UNAVAILABLE"
}
```

**Solución:**
- Verificar que ManyChat esté conectado al canal correspondiente
- Verificar que el subscriber tenga acceso al canal
- Intentar con otro canal disponible

#### 3. Mensaje Fuera de Ventana (WhatsApp/Instagram)

```json
{
  "status": "error",
  "error": "Message outside 24h window",
  "error_code": "OUTSIDE_WINDOW"
}
```

**Solución:**
- Usar un template aprobado para WhatsApp/Instagram
- O esperar a que el usuario envíe un mensaje primero

#### 4. Rate Limit Excedido

```json
{
  "status": "error",
  "error": "Rate limit exceeded",
  "error_code": "RATE_LIMIT"
}
```

**Solución:**
- Implementar retry con backoff exponencial
- Respetar los límites de rate limiting (100 req/s para ManyChat)
- Esperar antes de reintentar

### Código de Ejemplo con Manejo de Errores

```typescript
import { ManychatService } from '@/server/services/manychat-service'
import { logger } from '@/lib/logger'

async function enviarMensajeSeguro(phone: string, mensaje: string) {
  try {
    // Buscar subscriber
    const subscriber = await ManychatService.getSubscriberByPhone(phone)
    
    if (!subscriber) {
      logger.warn('Subscriber no encontrado', { phone })
      throw new Error('Contacto no encontrado en ManyChat')
    }

    // Detectar canal
    const channel = ManychatService.detectChannel(subscriber)
    logger.info('Canal detectado', { subscriberId: subscriber.id, channel })

    // Enviar mensaje
    const result = await ManychatService.sendTextMessage(subscriber.id, mensaje)
    
    if (!result) {
      throw new Error('Error al enviar mensaje')
    }

    logger.info('Mensaje enviado exitosamente', {
      subscriberId: subscriber.id,
      channel,
      message: mensaje.substring(0, 50)
    })

    return { success: true, channel, subscriberId: subscriber.id }
    
  } catch (error: any) {
    logger.error('Error enviando mensaje', {
      phone,
      error: error.message,
      errorCode: error.error_code
    })
    
    throw error
  }
}
```

---

## ✅ Mejores Prácticas

### 1. Validación de Datos

Siempre valida los datos antes de enviar:

```typescript
// Validar teléfono
function isValidPhone(phone: string): boolean {
  // Formato E.164: +[código país][número]
  const phoneRegex = /^\+[1-9]\d{1,14}$/
  return phoneRegex.test(phone)
}

// Validar email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
```

### 2. Rate Limiting

Respeta los límites de rate limiting de ManyChat:

```typescript
// El servicio ya implementa rate limiting automático
// Pero puedes agregar delays adicionales si es necesario
await new Promise(resolve => setTimeout(resolve, 100))
```

### 3. Logging Detallado

Registra todas las operaciones importantes:

```typescript
logger.info('Iniciando envío de mensaje', {
  subscriberId,
  channel: detectedChannel,
  messageType: 'text',
  timestamp: new Date().toISOString()
})
```

### 4. Manejo de Reintentos

Implementa retry logic para errores transitorios:

```typescript
async function enviarConReintentos(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      if (i === maxRetries - 1) throw error
      
      // Esperar antes de reintentar (backoff exponencial)
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      )
    }
  }
}
```

### 5. Detección de Canal

Siempre detecta el canal antes de enviar para optimizar el mensaje:

```typescript
const channel = ManychatService.detectChannel(subscriber)

// Adaptar mensaje según canal
if (channel === 'whatsapp') {
  // WhatsApp soporta más tipos de mensaje
  await ManychatService.sendImageMessage(subscriber.id, imageUrl, caption)
} else if (channel === 'instagram') {
  // Instagram tiene limitaciones, usar solo texto
  await ManychatService.sendTextMessage(subscriber.id, caption)
}
```

---

## 🔧 Integración en el CRM

### Uso del Servicio Unificado

El CRM proporciona un servicio unificado que maneja todos los canales:

```typescript
import { MessagingService } from '@/server/services/messaging-service'

// Envío con detección automática de canal
const result = await MessagingService.sendMessage({
  to: {
    phone: '+5491155556789'  // o email: 'usuario@example.com'
  },
  message: 'Hola desde el CRM',
  messageType: 'text',
  channel: 'auto'  // Detecta automáticamente el canal
})

console.log(`Mensaje enviado por ${result.channel}`)
```

### Endpoint de API

El CRM expone un endpoint unificado:

```typescript
POST /api/messaging/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "leadId": "clh1234567890",
  "to": {
    "phone": "+5491155556789"
  },
  "message": "Mensaje desde el CRM",
  "messageType": "text",
  "channel": "auto"
}
```

---

## 📚 Recursos Adicionales

- [Documentación Oficial de ManyChat API](https://manychat.com/dynamic_block_docs/)
- [ManyChat API Reference](https://api.manychat.com/)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Instagram Messaging API](https://developers.facebook.com/docs/instagram-api/guides/messaging)

---

## 🐛 Troubleshooting

### Problema: Mensajes no se envían

**Posibles causas:**
1. ManyChat API Key no configurada
2. Subscriber no existe en ManyChat
3. Canal no conectado en ManyChat
4. Fuera de ventana de 24h (WhatsApp/Instagram)

**Solución:**
1. Verificar variables de entorno: `MANYCHAT_API_KEY`
2. Verificar que el subscriber exista antes de enviar
3. Verificar conexiones de canal en ManyChat dashboard
4. Usar templates para mensajes fuera de ventana

### Problema: Mensaje se envía pero no llega

**Posibles causas:**
1. Número bloqueado
2. Número no tiene WhatsApp/Instagram
3. Mensaje marcado como spam

**Solución:**
1. Verificar que el número esté activo en la plataforma
2. Contactar al usuario por otro canal
3. Verificar contenido del mensaje (evitar palabras spam)

---

## 📝 Notas Importantes

1. **Ventana de 24 horas**: WhatsApp e Instagram solo permiten mensajes libres dentro de las 24 horas posteriores al último mensaje del usuario. Fuera de esta ventana, debes usar templates.

2. **Sincronización**: Si el subscriber no existe en ManyChat, considera sincronizar el lead desde el CRM primero usando `ManychatSyncService.syncLeadToManychat()`.

3. **Rate Limiting**: Respeta los límites de rate limiting de ManyChat para evitar errores.

4. **Logging**: Siempre registra las operaciones importantes para debugging y auditoría.

5. **Validaciones**: Valida todos los datos de entrada antes de enviar para evitar errores.



