# Guía de Webhooks ManyChat para Sincronización Automática

Esta guía te ayuda a configurar webhooks en ManyChat para mantener tu CRM sincronizado automáticamente sin necesidad de ejecutar scripts manualmente.

---

## 📋 Tabla de Contenidos

1. [¿Qué son los Webhooks?](#qué-son-los-webhooks)
2. [Prerequisitos](#prerequisitos)
3. [Configuración en ManyChat](#configuración-en-manychat)
4. [Endpoints del CRM](#endpoints-del-crm)
5. [Tipos de Eventos](#tipos-de-eventos)
6. [Implementación](#implementación)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 ¿Qué son los Webhooks?

Los webhooks permiten que **ManyChat notifique automáticamente a tu CRM** cuando ocurre un evento (nuevo contacto, tag agregada, mensaje recibido, etc.), manteniendo ambos sistemas sincronizados en tiempo real.

### Ventajas

- ✅ **Sincronización en tiempo real** (no esperar a ejecutar scripts)
- ✅ **Reduce carga de trabajo manual** (automatización completa)
- ✅ **Menor uso de API** (solo sincroniza cuando hay cambios)
- ✅ **Datos siempre actualizados** (sin delays)

---

## ✅ Prerequisitos

Antes de configurar webhooks, asegúrate de tener:

- ✅ Cuenta de ManyChat Pro (webhooks no disponibles en plan gratuito)
- ✅ Dominio público con HTTPS (ej: `https://tudominio.com`)
- ✅ Endpoints de API implementados en tu CRM
- ✅ Certificado SSL válido (requerido por ManyChat)

---

## 🔧 Configuración en ManyChat

### Paso 1: Acceder a Settings

1. Inicia sesión en [ManyChat](https://app.manychat.com)
2. Ve a **Settings** (⚙️ en la esquina superior derecha)
3. Selecciona **Webhooks** en el menú lateral

### Paso 2: Crear Webhook para Nuevos Contactos

```
Nombre: Sincronizar nuevo contacto al CRM
URL: https://tudominio.com/api/manychat/webhook/subscriber
Método: POST
Eventos:
  ✓ New Subscriber
  ✓ Subscriber Updated
```

**Payload que recibirás:**

```json
{
  "event": "new_subscriber",
  "subscriber_id": "2501234567890123",
  "page_id": "123456789",
  "first_name": "Juan",
  "last_name": "Pérez",
  "profile_pic": "https://...",
  "locale": "es_ES",
  "timezone": "America/Argentina/Buenos_Aires",
  "gender": "male",
  "phone": "+5491123456789",
  "email": "juan@example.com",
  "tags": ["lead-consultando"],
  "custom_fields": {
    "dni": "12345678",
    "zona": "Capital Federal"
  }
}
```

### Paso 3: Crear Webhook para Tags

```
Nombre: Sincronizar cambios de tags
URL: https://tudominio.com/api/manychat/webhook/tags
Método: POST
Eventos:
  ✓ Tag Added
  ✓ Tag Removed
```

**Payload que recibirás:**

```json
{
  "event": "tag_added",
  "subscriber_id": "2501234567890123",
  "tag_id": 12345,
  "tag_name": "solicitud-en-proceso",
  "timestamp": "2025-12-03T15:30:00Z"
}
```

### Paso 4: Crear Webhook para Custom Fields

```
Nombre: Sincronizar custom fields actualizados
URL: https://tudominio.com/api/manychat/webhook/fields
Método: POST
Eventos:
  ✓ Custom Field Updated
```

---

## 🛠️ Endpoints del CRM

Necesitas crear estos endpoints en tu aplicación Next.js:

### 1. Webhook de Subscriber

**Archivo**: `src/app/api/manychat/webhook/subscriber/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Verificar firma de ManyChat (seguridad)
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return hash === signature
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-manychat-signature')
    
    // Verificar firma (recomendado para producción)
    if (process.env.MANYCHAT_WEBHOOK_SECRET && signature) {
      if (!verifyWebhookSignature(
        body,
        signature,
        process.env.MANYCHAT_WEBHOOK_SECRET
      )) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    const data = JSON.parse(body)
    
    // Buscar lead existente
    const { data: existingLead } = await supabase
      .from('Lead')
      .select('id')
      .eq('manychatId', data.subscriber_id)
      .single()

    if (existingLead) {
      // Actualizar lead existente
      await supabase
        .from('Lead')
        .update({
          nombre: `${data.first_name} ${data.last_name}`.trim(),
          telefono: data.phone,
          email: data.email,
          tags: data.tags || [],
          customFields: data.custom_fields || {},
          updatedAt: new Date().toISOString(),
        })
        .eq('id', existingLead.id)
      
      console.log(`Lead actualizado: ${existingLead.id}`)
    } else {
      // Crear nuevo lead
      const { data: newLead } = await supabase
        .from('Lead')
        .insert({
          nombre: `${data.first_name} ${data.last_name}`.trim(),
          telefono: data.phone,
          email: data.email,
          manychatId: data.subscriber_id,
          origen: 'whatsapp',
          estado: 'nuevo',
          tags: data.tags || [],
          customFields: data.custom_fields || {},
        })
        .select()
        .single()
      
      console.log(`Lead creado: ${newLead?.id}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en webhook subscriber:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 2. Webhook de Tags

**Archivo**: `src/app/api/manychat/webhook/tags/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Buscar lead por manychatId
    const { data: lead } = await supabase
      .from('Lead')
      .select('id, tags')
      .eq('manychatId', data.subscriber_id)
      .single()

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Actualizar tags según el evento
    let newTags = lead.tags || []
    
    if (data.event === 'tag_added') {
      if (!newTags.includes(data.tag_name)) {
        newTags.push(data.tag_name)
      }
    } else if (data.event === 'tag_removed') {
      newTags = newTags.filter((tag: string) => tag !== data.tag_name)
    }

    // Actualizar lead
    await supabase
      .from('Lead')
      .update({
        tags: newTags,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', lead.id)

    console.log(`Tags actualizados para lead ${lead.id}: ${newTags.join(', ')}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en webhook tags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 3. Webhook de Custom Fields

**Archivo**: `src/app/api/manychat/webhook/fields/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Buscar lead
    const { data: lead } = await supabase
      .from('Lead')
      .select('id, customFields')
      .eq('manychatId', data.subscriber_id)
      .single()

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Actualizar custom field específico
    const customFields = lead.customFields || {}
    customFields[data.field_name] = data.field_value

    await supabase
      .from('Lead')
      .update({
        customFields,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', lead.id)

    console.log(`Custom field actualizado para lead ${lead.id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en webhook fields:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 📝 Tipos de Eventos Disponibles

ManyChat ofrece varios tipos de eventos para webhooks:

| Evento | Descripción | Cuándo usarlo |
|--------|-------------|---------------|
| `new_subscriber` | Nuevo contacto creado | Crear lead en CRM |
| `subscriber_updated` | Información del contacto actualizada | Actualizar lead |
| `tag_added` | Tag agregada a contacto | Actualizar segmentación |
| `tag_removed` | Tag removida de contacto | Actualizar segmentación |
| `custom_field_updated` | Custom field actualizado | Sincronizar datos custom |
| `conversation_started` | Nueva conversación iniciada | Crear conversación en CRM |
| `message_received` | Mensaje recibido del contacto | Registrar mensaje |

---

## 🧪 Testing

### 1. Testing Local con ngrok

Para probar localmente antes de desplegar:

```bash
# Instalar ngrok
npm install -g ngrok

# Iniciar tu aplicación Next.js
npm run dev

# En otra terminal, crear túnel
ngrok http 3000

# Usar la URL de ngrok en ManyChat
# Ejemplo: https://abc123.ngrok.io/api/manychat/webhook/subscriber
```

### 2. Testing Manual con cURL

```bash
curl -X POST https://tudominio.com/api/manychat/webhook/subscriber \
  -H "Content-Type: application/json" \
  -d '{
    "event": "new_subscriber",
    "subscriber_id": "test123",
    "first_name": "Test",
    "last_name": "User",
    "phone": "+5491123456789",
    "tags": ["lead-consultando"]
  }'
```

### 3. Verificar en ManyChat

1. Ve a **Settings > Webhooks**
2. Selecciona tu webhook
3. Click en **Test** para enviar un evento de prueba
4. Verifica que tu endpoint responda con `200 OK`

---

## 🔍 Monitoring y Logs

### Variables de Entorno

```env
# .env.local
MANYCHAT_WEBHOOK_SECRET=tu-secret-para-verificar-firma
NEXT_PUBLIC_SUPABASE_URL=tu-url
SUPABASE_SERVICE_KEY=tu-service-key
```

### Logging

Implementa logging para monitorear webhooks:

```typescript
// lib/webhook-logger.ts
import { createClient } from '@supabase/supabase-js'

export async function logWebhookEvent(
  event: string,
  payload: any,
  status: 'success' | 'error',
  error?: string
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  await supabase.from('WebhookLog').insert({
    event,
    payload,
    status,
    error,
    timestamp: new Date().toISOString(),
  })
}
```

---

## 🐛 Troubleshooting

### Problema 1: Webhook no responde

**Síntomas**: ManyChat marca el webhook como "failed"

**Soluciones**:
1. Verifica que tu servidor esté accesible públicamente
2. Asegúrate de tener certificado SSL válido
3. Revisa que el endpoint responda en menos de 5 segundos
4. Confirma que devuelvas status `200` o `201`

### Problema 2: Firma inválida

**Síntomas**: Error "Invalid signature"

**Soluciones**:
1. Verifica que `MANYCHAT_WEBHOOK_SECRET` sea correcto
2. Usa el payload RAW (sin parsear) para verificar firma
3. Compara el hash generado con el recibido

### Problema 3: Lead duplicado

**Síntomas**: Se crean múltiples leads para el mismo contacto

**Soluciones**:
1. Usa `manychatId` como unique constraint en la base de datos
2. Implementa lógica de "upsert" (insert or update)
3. Verifica antes de insertar si ya existe

### Problema 4: Rate limiting

**Síntomas**: Muchas requests simultáneas

**Soluciones**:
1. Implementa cola de procesamiento (Redis, BullMQ)
2. Procesa webhooks de forma asíncrona
3. Usa batching para operaciones de base de datos

---

## 📊 Monitoreo de Webhooks

### Dashboard en ManyChat

ManyChat proporciona métricas en **Settings > Webhooks > Analytics**:

- Total de eventos enviados
- Tasa de éxito/fallo
- Tiempo de respuesta promedio
- Últimos errores

### Alertas Recomendadas

Configura alertas para:
- ✉️ Tasa de error > 5%
- ⏱️ Tiempo de respuesta > 3 segundos
- 🚨 Webhook deshabilitado automáticamente

---

## 🎓 Mejores Prácticas

### 1. Seguridad

- ✅ Siempre verifica la firma del webhook
- ✅ Usa HTTPS (requerido por ManyChat)
- ✅ Valida el payload antes de procesar
- ✅ Implementa rate limiting
- ✅ No expongas información sensible en logs

### 2. Performance

- ✅ Responde rápido (< 5 segundos)
- ✅ Procesa de forma asíncrona si es posible
- ✅ Usa colas para procesamiento pesado
- ✅ Implementa retry logic
- ✅ Cachea datos frecuentes

### 3. Reliability

- ✅ Maneja errores gracefully
- ✅ Implementa idempotencia (mismo evento procesado múltiples veces no causa problemas)
- ✅ Registra todos los eventos
- ✅ Tiene estrategia de fallback si webhook falla

---

## 🔄 Migración de Scripts a Webhooks

Si actualmente usas scripts manuales, migra gradualmente:

### Fase 1: Webhooks + Scripts (híbrido)
- Configura webhooks para nuevos contactos
- Mantén scripts para sincronización completa semanal

### Fase 2: Monitoreo
- Verifica que webhooks funcionen correctamente durante 2 semanas
- Compara datos con sincronizaciones manuales

### Fase 3: Solo Webhooks
- Desactiva scripts automáticos
- Usa scripts solo para migraciones/arreglos manuales

---

## 📚 Recursos Adicionales

- [Documentación Oficial de Webhooks ManyChat](https://manychat.com/blog/webhooks/)
- [API Reference de ManyChat](https://api.manychat.com/docs)
- [Verificación de Webhooks](https://developers.facebook.com/docs/messenger-platform/webhooks)

---

## ✅ Checklist de Implementación

- [ ] Cuenta ManyChat Pro activa
- [ ] Dominio con HTTPS configurado
- [ ] Endpoints implementados en Next.js
- [ ] Variables de entorno configuradas
- [ ] Webhooks configurados en ManyChat
- [ ] Testing local con ngrok completado
- [ ] Testing en producción exitoso
- [ ] Logging implementado
- [ ] Alertas configuradas
- [ ] Documentación interna actualizada

---

**¡Listo!** Con webhooks configurados, tu CRM se mantendrá sincronizado automáticamente con ManyChat en tiempo real. 🎉

