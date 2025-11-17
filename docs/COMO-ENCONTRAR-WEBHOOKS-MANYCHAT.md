# 🔍 Cómo Encontrar los Webhooks en Manychat

## Ubicaciones Posibles de Webhooks en Manychat

Manychat ha cambiado su interfaz varias veces. Los webhooks pueden estar en diferentes lugares según tu versión:

### Opción 1: Settings → API → Webhooks (Versión Clásica)

1. Ve a **Settings** (Configuración) - icono de engranaje ⚙️ en el sidebar izquierdo
2. Busca la sección **"API"** o **"Integraciones"**
3. Dentro de API, busca **"Webhooks"** o **"Outgoing Webhooks"**
4. Si existe, verás un botón **"Add Webhook"** o **"New Webhook"**

### Opción 2: Automatizaciones → Acciones de Webhook (Versión Actual)

Si no encuentras webhooks en Settings → API, Manychat puede estar usando un enfoque diferente:

1. Ve a **Automatizaciones** (Automation) en el menú principal
2. Crea un nuevo flujo o edita uno existente
3. Agrega una acción **"Webhook"** o **"HTTP Request"**
4. Configura la URL del webhook aquí

**⚠️ Nota**: Este método requiere crear un flujo para cada evento, lo cual no es ideal para recibir todos los eventos automáticamente.

### Opción 3: Integraciones Externas

1. Ve a **Settings** → **Integraciones** o **Connections**
2. Busca opciones como:
   - **"Zapier"**
   - **"Make (Integromat)"**
   - **"Webhooks"**
   - **"API Integrations"**

### Opción 4: Usar Manychat API Directamente

Si Manychat no tiene una interfaz de webhooks visible, puedes usar su API para configurar webhooks programáticamente:

```bash
# Verificar si Manychat tiene endpoint de webhooks en su API
curl -X GET https://api.manychat.com/v1/webhooks \
  -H "Authorization: Bearer TU_API_KEY"
```

## 🔄 Alternativa: Usar Manychat API para Eventos

Si Manychat no soporta webhooks salientes (outgoing webhooks), puedes usar su API para:

### 1. Polling de Mensajes

En lugar de recibir webhooks, puedes consultar la API periódicamente:

```typescript
// Consultar mensajes recientes cada X minutos
const response = await fetch('https://api.manychat.com/v1/subscribers/{subscriber_id}/messages', {
  headers: {
    'Authorization': `Bearer ${MANYCHAT_API_KEY}`
  }
})
```

### 2. Usar Manychat Flows con Webhook Action

Crea un flujo en Manychat que se active en cada evento y envíe un webhook:

1. Ve a **Automatizaciones** → **Nuevo Flujo**
2. Configura el trigger (ej: "Nuevo mensaje recibido")
3. Agrega acción **"Webhook"** o **"HTTP Request"**
4. Configura:
   - **URL**: `https://www.formosafmc.com.ar/api/webhooks/manychat`
   - **Método**: POST
   - **Body**: Envía el evento completo en JSON

## 📋 Pasos Recomendados

### Paso 1: Verificar Versión de Manychat

1. Ve a **Settings** → **Account** o **Información de la cuenta**
2. Verifica qué versión de Manychat estás usando (Free, Pro, Business)

### Paso 2: Buscar en Todas las Ubicaciones

Revisa estas secciones en orden:

1. ✅ **Settings** → **API** → **Webhooks**
2. ✅ **Settings** → **Integraciones** → **Webhooks**
3. ✅ **Automatizaciones** → Buscar opción de webhook
4. ✅ **Settings** → **Advanced** → **Webhooks**

### Paso 3: Contactar Soporte de Manychat

Si no encuentras webhooks en ninguna ubicación:

1. Ve a **Help** → **Contact Support**
2. Pregunta: "¿Dónde puedo configurar webhooks salientes (outgoing webhooks) para recibir eventos en tiempo real?"
3. Menciona que necesitas recibir eventos de:
   - Nuevos mensajes
   - Nuevos subscribers
   - Tags agregados/removidos
   - Custom fields cambiados

### Paso 4: Usar Alternativa con Flows

Si Manychat no tiene webhooks salientes configurable, crea flows que envíen webhooks:

**Ejemplo de Flow para Mensajes Recibidos:**

1. **Trigger**: "Message Received"
2. **Action**: "Send HTTP Request"
   - URL: `https://www.formosafmc.com.ar/api/webhooks/manychat`
   - Method: POST
   - Headers:
     ```json
     {
       "Content-Type": "application/json"
     }
     ```
   - Body:
     ```json
     {
       "event_type": "message_received",
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
         "direction": "inbound"
       }
     }
     ```

## 🔗 Enlaces Útiles

- [Manychat API Documentation](https://api.manychat.com/)
- [Manychat Help Center](https://help.manychat.com/)
- [Manychat Dynamic Blocks - Webhook](https://manychat.com/dynamic_block_docs/webhook_notification.html)

## 💡 Nota Importante

Si Manychat no tiene webhooks salientes configurable en su interfaz, es posible que:
- Solo esté disponible en planes Business/Enterprise
- Requiera configuración mediante API
- Use un sistema diferente (como flows con HTTP requests)

En ese caso, la mejor opción es crear flows en Manychat que envíen HTTP requests a tu endpoint cuando ocurran los eventos que necesitas.

