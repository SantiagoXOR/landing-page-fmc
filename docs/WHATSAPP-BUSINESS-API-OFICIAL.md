# 📱 Documentación Oficial - WhatsApp Business API (Meta)

Esta guía contiene la documentación oficial y mejores prácticas para implementar la API de WhatsApp Business de Meta en el CRM Phorencial.

## 📚 Enlaces Oficiales

- **Documentación Principal**: [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Guía de Inicio Rápido**: [developers.facebook.com/docs/whatsapp/cloud-api/get-started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- **API Reference**: [developers.facebook.com/docs/whatsapp/cloud-api/reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)
- **Meta Business Manager**: [business.facebook.com](https://business.facebook.com/)

---

## 🎯 Requisitos Previos

### 1. Cuenta de Meta Business Manager

1. **Crear cuenta en Meta Business Manager**
   - Ve a [business.facebook.com](https://business.facebook.com/)
   - Crea una cuenta empresarial
   - Completa toda la información requerida:
     - Nombre legal de la empresa
     - Dirección física
     - Sitio web
     - Información de contacto

2. **Verificación de la Empresa**
   - Ve al **Centro de Seguridad** en Business Manager
   - Inicia el proceso de verificación empresarial
   - Proporciona documentación requerida:
     - Certificados de registro empresarial
     - Comprobantes de cuenta bancaria
     - Documentos legales de la empresa
   - ⚠️ **Importante**: Este proceso puede tardar varios días

### 2. Número de Teléfono

**Requisitos del número:**
- ✅ Debe ser un número de teléfono válido
- ✅ **NO** puede estar vinculado a una cuenta de WhatsApp personal existente
- ✅ Debe poder recibir llamadas o SMS para verificación
- ✅ Se recomienda un número dedicado para el negocio
- ✅ Si ya tienes un número en WhatsApp Business App, deberás migrarlo (proceso irreversible)

**Proceso de verificación:**
1. Meta enviará un código de verificación por SMS o llamada
2. Ingresa el código en el portal de Meta
3. Una vez verificado, el número estará disponible para la API

---

## 🔑 Configuración de Credenciales

### 1. Crear Aplicación en Meta for Developers

1. Ve a [developers.facebook.com](https://developers.facebook.com/)
2. Haz clic en **"Mis Aplicaciones"** → **"Crear Aplicación"**
3. Selecciona **"Negocio"** como tipo de aplicación
4. Completa la información de la aplicación:
   - Nombre de la aplicación
   - Email de contacto
   - Propósito de la aplicación

### 2. Agregar Producto WhatsApp

1. En el dashboard de tu aplicación, busca **"WhatsApp"**
2. Haz clic en **"Configurar"** o **"Set Up"**
3. Sigue el asistente de configuración

### 3. Obtener Credenciales

Una vez configurado WhatsApp, necesitarás:

#### **Phone Number ID**
- Ve a **WhatsApp** → **Configuración** → **Números de teléfono**
- Copia el **ID del número de teléfono** (formato: `123456789012345`)

#### **Access Token**
- Ve a **WhatsApp** → **Configuración** → **Tokens de acceso**
- Genera un **Token de acceso permanente**
- ⚠️ **IMPORTANTE**: Guarda este token de forma segura, solo se muestra una vez
- Formato: `EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### **Business Account ID** (Opcional)
- Ve a **WhatsApp** → **Configuración** → **Cuenta comercial**
- Copia el **ID de la cuenta comercial**
- Formato: `123456789012345`

#### **App Secret** (Para verificación de webhooks)
- Ve a **Configuración** → **Básico**
- Copia el **Secreto de la aplicación**
- ⚠️ **IMPORTANTE**: Mantén este secreto seguro

### 4. Configurar Variables de Entorno

Agrega estas variables a tu `.env.local`:

```bash
# WhatsApp Business API (Meta)
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345  # Opcional
WHATSAPP_VERIFY_TOKEN=tu-token-de-verificacion-personalizado
WHATSAPP_APP_SECRET=tu-app-secret  # Para verificación de webhooks
WHATSAPP_API_VERSION=v18.0  # Opcional, por defecto v18.0
```

**Generar Verify Token:**
```bash
# En Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔗 Configuración de Webhooks

### 1. Exponer tu Servidor (Desarrollo)

Para desarrollo local, usa un túnel como **ngrok**:

```bash
# Instalar ngrok
npm install -g ngrok

# Exponer puerto local
ngrok http 3000
```

Copia la URL HTTPS generada (ej: `https://abc123.ngrok.io`)

### 2. Configurar Webhook en Meta

1. Ve a tu aplicación en [developers.facebook.com](https://developers.facebook.com/)
2. Selecciona **WhatsApp** → **Configuración**
3. En la sección **Webhook**, haz clic en **"Configurar webhooks"**
4. Completa los campos:
   - **URL de devolución de llamada**: `https://tu-dominio.com/api/whatsapp/webhook`
   - **Token de verificación**: El valor de `WHATSAPP_VERIFY_TOKEN` de tu `.env.local`
5. Haz clic en **"Verificar y guardar"**

### 3. Suscribirse a Eventos

Selecciona los eventos a los que quieres suscribirte:

- ✅ **messages**: Mensajes entrantes y salientes
- ✅ **message_status**: Estados de entrega (enviado, entregado, leído, fallido)
- ✅ **message_template_status_update**: Actualizaciones de estado de templates

### 4. Implementar Verificación de Webhook

El webhook debe responder al desafío de verificación de Meta:

```typescript
// src/app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Verificar que el token coincida
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verificado')
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}
```

---

## 📨 Envío de Mensajes

### 1. Mensajes de Texto (Ventana de 24 horas)

Puedes enviar mensajes libres dentro de las **24 horas** posteriores al último mensaje del usuario:

```typescript
import { WhatsAppBusinessAPI } from '@/lib/integrations/whatsapp-business-api'

const whatsapp = WhatsAppBusinessAPI.fromEnv()

// Enviar mensaje de texto
const response = await whatsapp.sendTextMessage({
  to: '+5493704285453',
  text: 'Hola! Este es un mensaje de prueba.',
  previewUrl: true  // Opcional: previsualizar URLs
})
```

### 2. Mensajes con Media

```typescript
// Imagen
await whatsapp.sendMediaMessage({
  to: '+5493704285453',
  type: 'image',
  url: 'https://ejemplo.com/imagen.jpg',
  caption: 'Descripción de la imagen'  // Opcional
})

// Video
await whatsapp.sendMediaMessage({
  to: '+5493704285453',
  type: 'video',
  url: 'https://ejemplo.com/video.mp4',
  caption: 'Descripción del video'  // Opcional
})

// Audio
await whatsapp.sendMediaMessage({
  to: '+5493704285453',
  type: 'audio',
  url: 'https://ejemplo.com/audio.mp3'
})

// Documento
await whatsapp.sendMediaMessage({
  to: '+5493704285453',
  type: 'document',
  url: 'https://ejemplo.com/documento.pdf',
  filename: 'documento.pdf'  // Opcional
})
```

### 3. Mensajes con Templates (Fuera de 24 horas)

Para enviar mensajes fuera de la ventana de 24 horas, debes usar **templates aprobados**:

```typescript
// Enviar template simple
await whatsapp.sendTemplateMessage({
  to: '+5493704285453',
  templateName: 'bienvenida_lead',
  languageCode: 'es',
  components: []  // Sin parámetros
})

// Enviar template con parámetros
await whatsapp.sendTemplateMessage({
  to: '+5493704285453',
  templateName: 'seguimiento_lead',
  languageCode: 'es',
  components: [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: 'Juan' },
        { type: 'text', text: 'Formosa' }
      ]
    }
  ]
})
```

---

## 📋 Creación de Templates

### 1. Requisitos de Templates

- ✅ Deben ser aprobados por Meta antes de usarse
- ✅ Solo pueden contener texto, imágenes, videos o documentos
- ✅ Deben seguir las políticas de contenido de Meta
- ✅ No pueden contener enlaces dinámicos (excepto en botones)

### 2. Crear Template en Meta

1. Ve a **Meta Business Manager** → **WhatsApp Manager**
2. Selecciona **"Plantillas de mensajes"** → **"Crear plantilla"**
3. Completa el formulario:
   - **Nombre**: Nombre interno (ej: `bienvenida_lead`)
   - **Categoría**: Selecciona una categoría apropiada
     - `MARKETING`: Promociones y marketing
     - `UTILITY`: Transacciones y utilidades
     - `AUTHENTICATION`: Códigos de verificación
   - **Idioma**: Selecciona el idioma (ej: `es` para español)
   - **Contenido**: Escribe el mensaje
   - **Variables**: Agrega variables dinámicas con `{{1}}`, `{{2}}`, etc.

4. **Ejemplo de Template**:

```
Hola {{1}}, 

Gracias por contactarnos desde {{2}}.

Estamos aquí para ayudarte con tu consulta sobre créditos para motos.

¿En qué podemos ayudarte?
```

5. **Revisar y enviar para aprobación**
   - Meta revisará el template (puede tardar 24-48 horas)
   - Una vez aprobado, estará disponible para usar

### 3. Templates Recomendados para Formosa

#### **Template de Bienvenida**
```
Nombre: bienvenida_lead
Categoría: UTILITY

Hola {{1}},

Bienvenido a Formosa Moto Crédito.

Estamos aquí para ayudarte a conseguir el crédito que necesitas para tu moto.

¿Tienes alguna pregunta?
```

#### **Template de Seguimiento**
```
Nombre: seguimiento_lead
Categoría: UTILITY

Hola {{1}},

Queríamos hacer seguimiento de tu consulta desde {{2}}.

¿Hay algo más en lo que podamos ayudarte?
```

#### **Template de Documentación**
```
Nombre: documentacion_requerida
Categoría: UTILITY

Hola {{1}},

Para continuar con tu solicitud de crédito, necesitamos los siguientes documentos:

{{2}}

Por favor, envíalos cuando estén listos.
```

---

## 🔐 Verificación de Firma de Webhook

Meta envía una firma en el header `X-Hub-Signature-256` para verificar la autenticidad de los webhooks:

```typescript
import crypto from 'crypto'

function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  
  const receivedSignature = signature.replace('sha256=', '')
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature)
  )
}

// Uso en el webhook handler
export async function POST(request: NextRequest) {
  const signature = request.headers.get('X-Hub-Signature-256')
  const body = await request.text()
  
  if (!verifyWebhookSignature(body, signature || '', process.env.WHATSAPP_APP_SECRET!)) {
    return new NextResponse('Invalid signature', { status: 403 })
  }
  
  // Procesar webhook...
}
```

---

## 📊 Procesamiento de Mensajes Entrantes

### Estructura del Webhook

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "1234567890",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Juan Pérez"
                },
                "wa_id": "5493704285453"
              }
            ],
            "messages": [
              {
                "from": "5493704285453",
                "id": "wamid.xxx",
                "timestamp": "1234567890",
                "text": {
                  "body": "Hola, quiero información"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### Procesar Mensaje Entrante

```typescript
export async function POST(request: NextRequest) {
  // Verificar firma
  const signature = request.headers.get('X-Hub-Signature-256')
  const body = await request.text()
  
  if (!verifyWebhookSignature(body, signature || '', process.env.WHATSAPP_APP_SECRET!)) {
    return new NextResponse('Invalid signature', { status: 403 })
  }
  
  const data = JSON.parse(body)
  
  // Procesar cada entrada
  for (const entry of data.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'messages') {
        const message = change.value.messages?.[0]
        const contact = change.value.contacts?.[0]
        
        if (message && contact) {
          // Buscar o crear lead
          let lead = await findLeadByPhone(contact.wa_id)
          
          if (!lead) {
            lead = await createLead({
              nombre: contact.profile?.name || 'Contacto WhatsApp',
              telefono: contact.wa_id,
              origen: 'whatsapp',
              estado: 'NUEVO'
            })
          }
          
          // Guardar mensaje
          await saveMessage({
            leadId: lead.id,
            from: message.from,
            messageId: message.id,
            content: message.text?.body || '',
            type: message.type,
            direction: 'inbound',
            timestamp: new Date(parseInt(message.timestamp) * 1000)
          })
        }
      }
    }
  }
  
  return new NextResponse('OK', { status: 200 })
}
```

---

## ⚠️ Límites y Restricciones

### Rate Limits

- **Mensajes de texto**: 1,000 mensajes por segundo (por número)
- **Mensajes con media**: 100 mensajes por segundo (por número)
- **Templates**: Sin límite específico, pero deben estar aprobados

### Ventana de 24 Horas

- ✅ Puedes enviar mensajes libres dentro de 24 horas después del último mensaje del usuario
- ❌ Fuera de 24 horas, solo puedes usar templates aprobados
- ⚠️ La ventana se reinicia cada vez que el usuario envía un mensaje

### Políticas de Contenido

- ❌ No spam
- ❌ No contenido ofensivo o ilegal
- ❌ No envío masivo no solicitado
- ✅ Solo contactar usuarios que hayan iniciado conversación o dado consentimiento

---

## 🛠️ Manejo de Errores

### Códigos de Error Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| `100` | Número de teléfono inválido | Verificar formato del número |
| `131026` | Template no encontrado | Verificar que el template esté aprobado |
| `131047` | Fuera de ventana de 24 horas | Usar template aprobado |
| `80007` | Rate limit excedido | Esperar y reintentar con backoff exponencial |
| `132000` | Template no existe | Verificar nombre del template |

### Implementación de Retry

El cliente ya incluye retry automático con exponential backoff:

```typescript
// Ya implementado en whatsapp-business-api.ts
private maxRetries: number = 3
private retryDelay: number = 1000 // 1 segundo

// Retry automático en errores de red o rate limit
```

---

## 📝 Checklist de Implementación

### Fase 1: Configuración Inicial
- [ ] Crear cuenta en Meta Business Manager
- [ ] Verificar empresa en Meta
- [ ] Preparar número de teléfono dedicado
- [ ] Crear aplicación en Meta for Developers
- [ ] Agregar producto WhatsApp
- [ ] Obtener Phone Number ID
- [ ] Obtener Access Token
- [ ] Configurar variables de entorno

### Fase 2: Webhooks
- [ ] Exponer servidor (ngrok para desarrollo)
- [ ] Configurar webhook en Meta
- [ ] Implementar verificación de webhook (GET)
- [ ] Implementar procesamiento de mensajes (POST)
- [ ] Implementar verificación de firma
- [ ] Suscribirse a eventos necesarios
- [ ] Probar recepción de mensajes

### Fase 3: Envío de Mensajes
- [ ] Probar envío de mensajes de texto
- [ ] Probar envío de mensajes con media
- [ ] Crear templates en Meta
- [ ] Enviar templates para aprobación
- [ ] Probar envío de templates aprobados

### Fase 4: Integración con CRM
- [ ] Auto-crear leads desde mensajes entrantes
- [ ] Vincular mensajes con leads existentes
- [ ] Guardar historial de conversaciones
- [ ] Implementar panel de conversaciones
- [ ] Sincronizar estados de mensajes

---

## 🔗 Referencias Adicionales

- **Documentación de Graph API**: [developers.facebook.com/docs/graph-api](https://developers.facebook.com/docs/graph-api)
- **Guía de Templates**: [developers.facebook.com/docs/whatsapp/message-templates](https://developers.facebook.com/docs/whatsapp/message-templates)
- **Políticas de WhatsApp Business**: [developers.facebook.com/docs/whatsapp/policy-enforcement](https://developers.facebook.com/docs/whatsapp/policy-enforcement)
- **Mejores Prácticas**: [developers.facebook.com/docs/whatsapp/best-practices](https://developers.facebook.com/docs/whatsapp/best-practices)

---

## 📞 Soporte

Si tienes problemas con la implementación:

1. **Revisa los logs** del servidor para ver errores específicos
2. **Verifica las credenciales** en Meta Business Manager
3. **Consulta la documentación oficial** de Meta
4. **Revisa el código existente** en `src/lib/integrations/whatsapp-business-api.ts`

---

**Última actualización**: Enero 2025  
**Versión de API**: v18.0

