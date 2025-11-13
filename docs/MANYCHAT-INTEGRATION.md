# Integración Híbrida Manychat-CRM

## Descripción General

Esta integración permite combinar las capacidades de automatización de Manychat con las funcionalidades de gestión de leads del CRM, creando un sistema híbrido donde:

- ✅ Los flujos automáticos y chatbots se manejan en Manychat
- ✅ Los agentes pueden ver las conversaciones en el CRM
- ✅ Los agentes pueden responder manualmente cuando sea necesario
- ✅ Sincronización bidireccional de datos de leads, mensajes y tags
- ✅ Cuando un agente responde desde el CRM, se usa la API de Manychat

## Arquitectura

```
┌─────────────────┐
│   WhatsApp      │
│   (Usuario)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Manychat      │  ← Flujos automáticos, chatbots
│   - Automation  │
│   - Broadcasts  │
│   - Tags        │
└────────┬────────┘
         │
         ↓ (Webhook & API)
┌─────────────────┐
│   CRM           │  ← Agentes humanos
│   - Leads       │
│   - Conversations│
│   - Manual Reply│
└─────────────────┘
```

## Flujo de Trabajo

### Mensaje Entrante

1. Usuario envía mensaje por WhatsApp
2. Manychat procesa el mensaje con sus flujos automáticos
3. Manychat envía webhook al CRM
4. CRM sincroniza subscriber a lead
5. CRM registra mensaje en conversación
6. Agente puede ver mensaje en tiempo real

### Mensaje Saliente (desde CRM)

1. Agente escribe respuesta en CRM
2. CRM busca subscriber en Manychat por teléfono
3. CRM envía mensaje vía API de Manychat
4. Manychat entrega mensaje a WhatsApp
5. CRM registra mensaje como enviado

### Sincronización de Datos

**Lead → Manychat:**
- Nombre, teléfono, email
- Custom fields (DNI, ingresos, zona, etc.)
- Tags

**Manychat → Lead:**
- Datos de subscriber
- Tags agregados/removidos
- Custom fields actualizados
- Estado de opt-in

## Componentes Principales

### 1. Servicios

#### `ManychatService`
- Cliente HTTP para API de Manychat
- CRUD de subscribers
- Gestión de tags
- Envío de mensajes y broadcasts
- Rate limiting automático

**Ubicación:** `src/server/services/manychat-service.ts`

**Métodos principales:**
```typescript
ManychatService.getSubscriberByPhone(phone)
ManychatService.sendTextMessage(subscriberId, text)
ManychatService.addTagToSubscriber(subscriberId, tagName)
ManychatService.getTags()
```

#### `ManychatSyncService`
- Sincronización bidireccional CRM ↔ Manychat
- Manejo de conflictos
- Logging de sincronizaciones
- Retry automático de fallos

**Ubicación:** `src/server/services/manychat-sync-service.ts`

**Métodos principales:**
```typescript
ManychatSyncService.syncLeadToManychat(leadId)
ManychatSyncService.syncManychatToLead(subscriber)
ManychatSyncService.fullSyncLeadToManychat(leadId)
ManychatSyncService.syncTagsToManychat(leadId, tags)
```

#### `WhatsAppService` (Actualizado)
- Detecta si Manychat está configurado
- Usa Manychat API si está disponible
- Fallback a Meta API si Manychat no está configurado
- Envío de mensajes híbrido

**Ubicación:** `src/server/services/whatsapp-service.ts`

### 2. API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/whatsapp/webhook` | GET/POST | Recibe webhooks de Manychat y Meta |
| `/api/manychat/sync-lead` | POST | Sincroniza lead específico a Manychat |
| `/api/manychat/tags` | GET/POST | Gestiona tags (listar, agregar, remover) |
| `/api/manychat/broadcast` | POST | Envía broadcast masivo |
| `/api/manychat/flows` | GET | Lista flujos disponibles |
| `/api/manychat/custom-fields` | GET/POST | Gestiona custom fields |
| `/api/manychat/health` | GET | Verifica estado de la API |

### 3. Modelos de Base de Datos

#### `Lead` (Actualizado)
```typescript
{
  // ... campos existentes ...
  manychatId?: string    // ID del subscriber en Manychat
  tags?: string          // JSON array de tags
  customFields?: string  // JSON object de custom fields
}
```

#### `Conversation` (Actualizado)
```typescript
{
  // ... campos existentes ...
  manychatData?: string  // JSON con metadatos de Manychat
}
```

#### `ManychatSync` (Nuevo)
```typescript
{
  id: string
  leadId: string
  syncType: 'lead_to_manychat' | 'manychat_to_lead' | 'tags' | 'custom_fields'
  status: 'pending' | 'success' | 'failed'
  direction: 'to_manychat' | 'from_manychat'
  data?: string     // JSON con datos sincronizados
  error?: string    // Mensaje de error si falla
  retryCount: number
  createdAt: Date
  completedAt?: Date
}
```

## Eventos de Webhook

### `new_subscriber`
Se dispara cuando un nuevo contacto interactúa con el chatbot.

**Acción en CRM:**
- Crear nuevo lead si no existe
- Vincular manychatId
- Sincronizar datos básicos

### `message_received`
Se dispara cuando se recibe un mensaje del usuario.

**Acción en CRM:**
- Crear/actualizar conversación
- Registrar mensaje
- Actualizar última actividad

### `tag_added`
Se dispara cuando se agrega un tag a un subscriber.

**Acción en CRM:**
- Agregar tag al lead
- Actualizar campo `tags`

### `tag_removed`
Se dispara cuando se remueve un tag de un subscriber.

**Acción en CRM:**
- Remover tag del lead
- Actualizar campo `tags`

### `custom_field_changed`
Se dispara cuando se actualiza un custom field.

**Acción en CRM:**
- Actualizar campo correspondiente en lead
- Actualizar campo `customFields`

## Uso en Código

### Sincronizar Lead Manualmente

```typescript
import { ManychatSyncService } from '@/server/services/manychat-sync-service'

// Sincronización completa
await ManychatSyncService.fullSyncLeadToManychat(leadId)

// Solo sincronizar datos básicos
await ManychatSyncService.syncLeadToManychat(leadId)

// Solo sincronizar tags
await ManychatSyncService.syncTagsToManychat(leadId, ['cliente-vip', 'interesado'])
```

### Enviar Mensaje desde CRM

```typescript
import { WhatsAppService } from '@/server/services/whatsapp-service'

await WhatsAppService.sendMessage({
  to: '+51987654321',
  message: 'Hola, ¿cómo podemos ayudarte?',
  messageType: 'text'
})
```

### Obtener Tags Disponibles

```typescript
import { ManychatService } from '@/server/services/manychat-service'

const tags = await ManychatService.getTags()
console.log(tags)
// [{ id: 123, name: 'cliente-vip' }, ...]
```

### Agregar Tag a Subscriber

```typescript
const success = await ManychatService.addTagToSubscriber(
  subscriberId,
  'interesado-prestamo'
)
```

### Enviar Broadcast

```typescript
const response = await ManychatService.sendBroadcast(
  'Promoción Especial',
  [{ type: 'text', text: 'Oferta exclusiva por tiempo limitado!' }],
  {
    tagIds: [123, 456], // Solo a subscribers con estos tags
  }
)
```

## Rate Limiting

Manychat API tiene límites de requests:

- `/fb/page/getInfo`: 100 req/s
- Otros endpoints: varían

El servicio implementa rate limiting automático:

```typescript
// Se procesa automáticamente con delay
await ManychatService.getSubscriberById(123)
await ManychatService.getSubscriberById(456) // Espera 10ms
await ManychatService.getSubscriberById(789) // Espera 10ms
```

## Monitoreo y Logs

### Ver Logs de Sincronización

```typescript
const logs = await ManychatSyncService.getSyncLogs(leadId)

logs.forEach(log => {
  console.log(`${log.syncType} - ${log.status}`)
  if (log.error) {
    console.error(log.error)
  }
})
```

### Reintentar Sincronizaciones Fallidas

```typescript
const successCount = await ManychatSyncService.retryFailedSyncs(3) // max 3 retries
console.log(`${successCount} sincronizaciones exitosas`)
```

### Limpiar Logs Antiguos

```typescript
const deleted = await ManychatSyncService.cleanupOldSyncLogs(30) // 30 días
console.log(`${deleted} logs eliminados`)
```

## Mejores Prácticas

### 1. Sincronización Inteligente

```typescript
// ❌ No sincronizar en cada actualización menor
await prisma.lead.update({ where: { id }, data: { notas: 'nueva nota' } })
await ManychatSyncService.syncLeadToManychat(id) // Innecesario

// ✅ Sincronizar solo cuando cambian datos relevantes
if (cambioEnDatosImportantes) {
  await ManychatSyncService.syncLeadToManychat(id)
}
```

### 2. Manejo de Errores

```typescript
try {
  await ManychatService.sendTextMessage(subscriberId, message)
} catch (error) {
  // Fallback a Meta API o notificar error
  console.error('Error enviando mensaje por Manychat:', error)
  // Implementar retry o fallback
}
```

### 3. Tags Case-Sensitive

```typescript
// ❌ Puede causar duplicados
await ManychatService.addTagToSubscriber(id, 'Cliente-VIP')
await ManychatService.addTagToSubscriber(id, 'cliente-vip')

// ✅ Usar naming consistente
const tagName = 'cliente-vip'.toLowerCase()
await ManychatService.addTagToSubscriber(id, tagName)
```

### 4. Validar antes de Sincronizar

```typescript
// ✅ Validar datos antes de sincronizar
if (!lead.telefono || !lead.nombre) {
  throw new Error('Lead debe tener teléfono y nombre')
}

await ManychatSyncService.syncLeadToManychat(lead.id)
```

## Troubleshooting

Ver [docs/MANYCHAT-SETUP.md](./MANYCHAT-SETUP.md) sección Troubleshooting.

## Referencias

- [Documentación de API Manychat](https://api.manychat.com/)
- [Guía de Setup](./MANYCHAT-SETUP.md)
- [Políticas de WhatsApp](https://www.whatsapp.com/legal/business-policy)

