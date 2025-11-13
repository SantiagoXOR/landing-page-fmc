# Guía de Configuración de Manychat

Esta guía te ayudará a configurar la integración híbrida de Manychat con el CRM, permitiendo aprovechar los flujos automáticos y chatbots de Manychat mientras los agentes pueden ver y responder conversaciones desde el CRM.

## Índice

1. [Crear Cuenta en Manychat](#1-crear-cuenta-en-manychat)
2. [Conectar WhatsApp Business](#2-conectar-whatsapp-business)
3. [Obtener API Key](#3-obtener-api-key)
4. [Configurar Variables de Entorno](#4-configurar-variables-de-entorno)
5. [Configurar Webhooks](#5-configurar-webhooks)
6. [Configurar Custom Fields](#6-configurar-custom-fields)
7. [Configurar Tags](#7-configurar-tags)
8. [Crear Flujos Básicos](#8-crear-flujos-básicos-recomendados)
9. [Probar la Integración](#9-probar-la-integración)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Crear Cuenta en Manychat

1. Ve a [https://manychat.com](https://manychat.com)
2. Haz clic en **"Sign Up"** o **"Empezar Gratis"**
3. Selecciona el plan adecuado:
   - **Free**: Hasta 1,000 contactos
   - **Pro**: Ilimitado (recomendado para producción)
4. Completa el registro con tu correo electrónico
5. Verifica tu correo electrónico

---

## 2. Conectar WhatsApp Business

### Opción A: Número Nuevo

1. En el dashboard de Manychat, ve a **Settings** → **Channels**
2. Selecciona **WhatsApp**
3. Haz clic en **"Connect WhatsApp"**
4. Sigue el asistente de Meta para:
   - Crear o vincular una cuenta de Facebook Business
   - Configurar WhatsApp Business API
   - Verificar tu número de teléfono

### Opción B: Número Existente (Migración)

⚠️ **Importante**: Si ya tienes un número en WhatsApp Business App, deberás migrarlo a WhatsApp Business API. Este proceso es irreversible.

1. Asegúrate de tener una cuenta de Facebook Business Manager
2. Sigue las instrucciones de Meta para migración
3. Una vez migrado, conéctalo en Manychat

### Requisitos del Número

- Debe ser un número de teléfono válido
- No puede estar registrado en WhatsApp personal
- Debe tener capacidad para recibir SMS o llamadas para verificación
- Se recomienda un número dedicado para el negocio

---

## 3. Obtener API Key

1. En Manychat, ve a **Settings** (⚙️)
2. Selecciona la pestaña **API**
3. Haz clic en **"Generate your API Key"**
4. **¡IMPORTANTE!** Copia y guarda esta key de forma segura
   - Esta key solo se muestra una vez
   - Si la pierdes, deberás generar una nueva
   - Si generas una nueva, la anterior se desactivará

### Formato de la API Key

```
MCAPIKey-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 4. Configurar Variables de Entorno

Crea o edita tu archivo `.env.local` en la raíz del proyecto:

```bash
# Manychat Configuration
MANYCHAT_API_KEY=MCAPIKey-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MANYCHAT_BASE_URL=https://api.manychat.com
MANYCHAT_WEBHOOK_SECRET=tu-secreto-webhook-seguro

# Opcional: Mantener credenciales de Meta como fallback
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
```

### Generar Webhook Secret

Puedes generar un secreto aleatorio seguro con:

```bash
# En Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Configurar Webhooks

### 5.1 Exponer tu Servidor (Desarrollo)

Para desarrollo local, usa **ngrok** o **localtunnel**:

```bash
# Con ngrok
ngrok http 3000

# Con localtunnel
npx localtunnel --port 3000
```

Obtendrás una URL como: `https://abc123.ngrok.io`

### 5.2 Configurar Webhook en Manychat

1. En Manychat, ve a **Settings** → **API** → **Webhooks**
2. Haz clic en **"Add Webhook"**
3. Configura:
   - **Webhook URL**: `https://tu-dominio.com/api/whatsapp/webhook`
   - **Verify Token**: El valor de `MANYCHAT_WEBHOOK_SECRET`
4. Selecciona los eventos a suscribir:
   - ✅ `new_subscriber`
   - ✅ `message_received`
   - ✅ `tag_added`
   - ✅ `tag_removed`
   - ✅ `custom_field_changed`
5. Haz clic en **"Verify"**
6. Si la verificación es exitosa, haz clic en **"Save"**

### 5.3 Verificar Webhook

Prueba que el webhook funciona:

```bash
curl -X POST https://tu-dominio.com/api/manychat/health
```

Deberías recibir:

```json
{
  "status": "healthy",
  "message": "Manychat API está funcionando correctamente"
}
```

---

## 6. Configurar Custom Fields

Los Custom Fields permiten almacenar datos personalizados de cada contacto.

### 6.1 Crear Custom Fields en Manychat

1. Ve a **Settings** → **Custom Fields**
2. Haz clic en **"+ New Field"**
3. Crea los siguientes campos (para sincronizar con el CRM):

| Nombre       | Tipo     | Descripción                    |
|--------------|----------|--------------------------------|
| `dni`        | Text     | Documento de identidad         |
| `ingresos`   | Number   | Ingresos mensuales             |
| `zona`       | Text     | Zona geográfica                |
| `producto`   | Text     | Producto de interés            |
| `monto`      | Number   | Monto solicitado               |
| `origen`     | Text     | Canal de origen                |
| `estado`     | Text     | Estado del lead en CRM         |
| `agencia`    | Text     | Agencia asignada               |

### 6.2 Obtener IDs de Custom Fields

Ejecuta en tu proyecto:

```bash
curl -H "Authorization: Bearer $MANYCHAT_API_KEY" \
  https://api.manychat.com/fb/page/getCustomFields
```

---

## 7. Configurar Tags

Los tags permiten segmentar y organizar contactos.

### 7.1 Crear Tags Recomendados

1. Ve a **Settings** → **Tags**
2. Crea los siguientes tags:

**Tags de Estado del Lead:**
- `lead-nuevo`
- `lead-calificado`
- `lead-contactado`
- `lead-interesado`
- `lead-no-interesado`

**Tags de Origen:**
- `origen-facebook`
- `origen-instagram`
- `origen-whatsapp`
- `origen-web`

**Tags de Producto:**
- `producto-prestamo-personal`
- `producto-prestamo-vehicular`
- `producto-tarjeta-credito`
- `producto-cuenta-ahorro`

**Tags de Engagement:**
- `bot-activo` (contacto atendido por bot)
- `agente-requerido` (requiere atención humana)
- `conversacion-cerrada`

### 7.2 Automatización con Tags

En tus flujos de Manychat, usa **Actions** → **Add Tag** para aplicar tags automáticamente según el comportamiento del usuario.

---

## 8. Crear Flujos Básicos Recomendados

### Flow 1: Bienvenida y Calificación Inicial

```
Trigger: New Subscriber
↓
Mensaje: "¡Hola! 👋 Bienvenido a [Nombre Empresa]"
↓
Pregunta: "¿En qué podemos ayudarte hoy?"
  - Botón: "Solicitar Préstamo" → Flow Préstamo
  - Botón: "Información" → Flow Info
  - Botón: "Hablar con Agente" → Transferir a CRM
```

### Flow 2: Calificación de Lead

```
Inicio
↓
Pregunta: "¿Cuál es tu nombre completo?"
→ Guardar en Custom Field: nombre
↓
Pregunta: "¿Cuál es tu DNI?"
→ Guardar en Custom Field: dni
↓
Pregunta: "¿Cuáles son tus ingresos mensuales aproximados?"
→ Guardar en Custom Field: ingresos
↓
Condición: ingresos >= monto_minimo
  SI → Add Tag: "lead-calificado"
  NO → Add Tag: "lead-no-calificado"
↓
Mensaje: "Gracias, un agente te contactará pronto"
↓
Agregar Tag: "agente-requerido"
```

### Flow 3: Transferencia a Agente

```
Trigger: Tag "agente-requerido" agregado
↓
Webhook: Notificar al CRM
↓
Mensaje: "Te estamos conectando con un agente..."
↓
(El agente responde desde el CRM)
```

### Configurar Flows en Manychat

1. Ve a **Automation** → **Flows**
2. Haz clic en **"+ New Flow"**
3. Usa el editor visual para crear el flujo
4. Prueba el flujo antes de publicar

---

## 9. Probar la Integración

### 9.1 Test de Conexión

```bash
# Verificar salud de la API
curl http://localhost:3000/api/manychat/health
```

### 9.2 Test de Webhook

Envía un mensaje de prueba desde tu WhatsApp al número conectado en Manychat.

Verifica en el CRM:
1. ¿Se creó el lead automáticamente?
2. ¿Se registró la conversación?
3. ¿Se guardó el mensaje?

### 9.3 Test de Envío desde CRM

1. Ve al CRM y abre una conversación
2. Envía un mensaje de prueba
3. Verifica que el mensaje llegue a WhatsApp

### 9.4 Test de Sincronización

```bash
# Sincronizar un lead específico
curl -X POST http://localhost:3000/api/manychat/sync-lead \
  -H "Content-Type: application/json" \
  -d '{"leadId": "lead-id-aqui", "fullSync": true}'
```

---

## 10. Troubleshooting

### Problema: Webhook no se verifica

**Soluciones:**
- Verifica que `MANYCHAT_WEBHOOK_SECRET` esté configurado correctamente
- Asegúrate de que tu servidor sea accesible públicamente
- Revisa los logs del servidor para ver errores
- Usa ngrok para desarrollo local

### Problema: No se reciben mensajes

**Soluciones:**
- Verifica que el webhook esté activo en Manychat
- Revisa que hayas suscrito a los eventos correctos
- Verifica los logs del webhook en Manychat Settings → API → Webhooks → View Logs
- Asegúrate de que el número de WhatsApp esté aprobado

### Problema: No se pueden enviar mensajes

**Soluciones:**
- Verifica que `MANYCHAT_API_KEY` sea válida
- Confirma que el subscriber existe en Manychat
- Revisa que el número de teléfono esté en formato E.164 (ej: +51987654321)
- Verifica que el subscriber tenga opt-in activo

### Problema: Rate Limit Exceeded

**Soluciones:**
- El servicio implementa rate limiting automático
- Si persiste, reduce la frecuencia de requests
- Considera usar batch operations cuando sea posible

### Problema: Tags no se sincronizan

**Soluciones:**
- Verifica que los tags existan en Manychat (case-sensitive)
- Revisa los logs de sincronización en la tabla `ManychatSync`
- Asegúrate de que el subscriber tenga `manychatId` en el CRM

---

## Mejores Prácticas

### 1. Segmentación Inteligente

- Usa tags para segmentar leads por estado, origen, producto
- Crea audiencias específicas para broadcasts dirigidos
- Mantén los tags organizados y con naming consistente

### 2. Flows Eficientes

- Mantén los flujos cortos (máximo 5-7 pasos)
- Siempre da opción de hablar con un agente
- Usa botones en lugar de texto libre cuando sea posible
- Implementa validación de datos (ej: formato de DNI, email)

### 3. Sincronización

- Sincroniza leads importantes en tiempo real
- Usa batch sync para datos históricos (off-peak hours)
- Monitorea los logs de sincronización regularmente
- Limpia logs antiguos periódicamente

### 4. Compliance

- ⚠️ Asegúrate de tener opt-in explícito antes de enviar broadcasts
- Cumple con políticas de WhatsApp Business
- No envíes mensajes promocionales sin template aprobado
- Respeta las ventanas de tiempo de 24 horas

### 5. Monitoreo

- Revisa el health check regularmente
- Monitorea tasa de entrega de mensajes
- Rastrea conversiones desde Manychat al CRM
- Analiza qué flows generan más leads calificados

---

## Recursos Adicionales

- [Documentación Oficial de Manychat API](https://api.manychat.com/)
- [Políticas de WhatsApp Business](https://www.whatsapp.com/legal/business-policy)
- [Comunidad Manychat](https://community.manychat.com/)
- [Templates de Mensajes WhatsApp](https://business.facebook.com/wa/manage/message-templates/)

---

## Soporte

Si encuentras problemas no cubiertos en esta guía:

1. Revisa los logs del servidor
2. Consulta la tabla `ManychatSync` para ver errores de sincronización
3. Verifica los logs de webhook en Manychat
4. Contacta al equipo de desarrollo del CRM

