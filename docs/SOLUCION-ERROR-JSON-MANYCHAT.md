# 🔧 Solución: Error "JSON no válido" en ManyChat

## ❌ Problema

Al configurar el body del webhook en ManyChat, aparece el error:
```
JSON no válido
Unexpected token 'M', "Moto" is not valid JSON
```

Esto ocurre cuando agregas "Última entrada de texto" directamente al body, lo cual genera un string en lugar de un objeto JSON válido.

## ✅ Solución: Configurar Body como Objeto JSON

### Opción 1: Usar "Full Contact Data" + Agregar Message Manualmente (Recomendado)

1. **Elimina "Última entrada de texto"** del body:
   - Haz clic en el ícono de basura (🗑️) junto a "1 Última entrada de texto"

2. **Agrega "Full Contact Data"**:
   - Haz clic en **"+ Añadir Full Contact Data"**
   - Esto agregará automáticamente todos los datos del contacto en formato JSON

3. **Agrega el objeto `message` manualmente**:
   - Haz clic en **"{+} Añadir un Campo"**
   - En el campo **Key**, escribe: `message`
   - En el campo **Value**, pega este JSON (reemplaza las variables con las de ManyChat):
   ```json
   {
     "id": "{{message.id}}",
     "type": "{{message.type}}",
     "text": "{{message.text}}",
     "timestamp": {{message.timestamp}},
     "direction": "inbound",
     "platform_msg_id": "{{message.id}}"
   }
   ```
   - **⚠️ Importante**: En ManyChat, cuando agregas un campo de tipo objeto, debes usar el botón `{}` (curly braces) para indicar que es JSON

4. **Agrega el campo `event_type`**:
   - Haz clic en **"{+} Añadir un Campo"**
   - **Key**: `event_type`
   - **Value**: `message_received`

### Opción 2: Construir el JSON Manualmente (Más Control)

Si prefieres tener control total sobre la estructura:

1. **Elimina todo** del body (incluyendo "Última entrada de texto")

2. **Agrega cada campo uno por uno** usando **"{+} Añadir un Campo"**:

   **Campo 1:**
   - **Key**: `event_type`
   - **Value**: `message_received`

   **Campo 2:**
   - **Key**: `subscriber_id`
   - **Value**: `{{subscriber.id}}`

   **Campo 3:**
   - **Key**: `subscriber`
   - **Value**: (Usa el botón `{}` y pega):
   ```json
   {
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
   }
   ```

   **Campo 4:**
   - **Key**: `message`
   - **Value**: (Usa el botón `{}` y pega):
   ```json
   {
     "id": "{{message.id}}",
     "type": "{{message.type}}",
     "text": "{{message.text}}",
     "timestamp": {{message.timestamp}},
     "direction": "inbound",
     "platform_msg_id": "{{message.id}}"
   }
   ```

   **Campo 5:**
   - **Key**: `timestamp`
   - **Value**: `{{current_timestamp}}`

## 📋 Estructura JSON Final Esperada

El body debe verse así en la vista previa (con las variables expandidas):

```json
{
  "event_type": "message_received",
  "subscriber_id": 123456789,
  "subscriber": {
    "id": 123456789,
    "key": "user:123456789",
    "first_name": "Lucas",
    "last_name": "Martinez",
    "phone": "+5491123456789",
    "whatsapp_phone": "+5491123456789",
    "email": null,
    "custom_fields": {
      "producto": "Moto",
      "zona": "Fsa, capital"
    },
    "tags": [],
    "subscribed": "2025-11-28T10:00:00Z",
    "last_interaction": "2025-11-28T16:24:00Z"
  },
  "message": {
    "id": "msg_abc123",
    "type": "text",
    "text": "Moto",
    "timestamp": 1732801440,
    "direction": "inbound",
    "platform_msg_id": "msg_abc123"
  },
  "timestamp": 1732801440
}
```

## ⚠️ Puntos Importantes

1. **No uses "Última entrada de texto" directamente**: Esto genera un string, no un objeto JSON
2. **Usa el botón `{}` para objetos JSON**: Cuando agregues campos que son objetos (como `subscriber` o `message`), usa el botón de curly braces
3. **Las variables deben estar entre dobles llaves**: `{{variable}}`, no `{variable}` ni `variable`
4. **Verifica la vista previa**: El JSON debe ser válido antes de guardar

## 🧪 Verificar que Funciona

1. **Revisa la vista previa**: Debe mostrar un JSON válido sin errores
2. **Guarda el flow**
3. **Envía un mensaje de prueba** desde WhatsApp
4. **Verifica en los logs del CRM** que el mensaje se recibió correctamente

## 🐛 Si el Error Persiste

1. **Verifica que no haya comillas extra**: Las variables de ManyChat no deben tener comillas alrededor, excepto cuando son strings
2. **Revisa que los objetos JSON estén bien formados**: Cada `{` debe tener su `}` correspondiente
3. **Usa la opción "Full Contact Data"**: Es más fácil y menos propenso a errores
4. **Contacta soporte**: Si el problema persiste, puede ser un bug de ManyChat

## 📚 Referencias

- [Guía Completa: Configurar Flow para Mensajes en Tiempo Real](CONFIGURAR-FLOW-MENSAJES-TIEMPO-REAL.md)
- [Configurar Webhook en ManyChat - Guía Paso a Paso](CONFIGURAR-WEBHOOK-MANYCHAT-PASO-A-PASO.md)














