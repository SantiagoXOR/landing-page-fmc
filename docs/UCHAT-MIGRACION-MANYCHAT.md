# Migración de Manychat a Uchat

Guía técnica para reemplazar la integración con **Manychat** por **Uchat** en el CRM Phorencial, manteniendo pipeline, conversaciones y sincronización de tags.

---

## Índice

1. [Resumen del alcance](#1-resumen-del-alcance)
2. [Mapeo de conceptos y APIs](#2-mapeo-de-conceptos-y-apis)
3. [Archivos a modificar o crear](#3-archivos-a-modificar-o-crear)
4. [Orden recomendado de implementación](#4-orden-recomendado-de-implementación)
5. [Nuevos endpoints y servicios](#5-nuevos-endpoints-y-servicios)
6. [Variables de entorno y feature flags](#6-variables-de-entorno-y-feature-flags)
7. [Rollback](#7-rollback)
8. [Checklist de migración](#8-checklist-de-migración)

---

## 1. Resumen del alcance

| Área | Manychat (actual) | Uchat (objetivo) |
|------|-------------------|-------------------|
| Recepción de mensajes | Webhook Manychat → `/api/webhooks/manychat` y/o `/api/whatsapp/webhook` | Webhook Meta → Uchat; Uchat → CRM (nuevo endpoint o mismo con detección) |
| Envío de mensajes | `ManychatService` + `MessagingService` | Cliente API Uchat o WhatsApp Cloud API (Meta) |
| Tags / segmentos | Manychat tags ↔ pipeline stages | Uchat tags (o equivalente) ↔ pipeline stages |
| Custom fields | Manychat custom fields → lead `customFields` | Uchat campos de usuario → lead `customFields` |
| Crear contacto | `ManychatService.createWhatsAppSubscriber` (webhook leads) | API Uchat para crear usuario o recibir vía webhook |
| Broadcasts | `/api/manychat/broadcast` | Endpoint que llame a API Uchat o Meta |
| Flujos activos | Manychat flows (solo indicador en UI) | Uchat flows (indicador en UI cuando exista API) |

---

## 2. Mapeo de conceptos y APIs

### 2.1 Eventos de webhook

| Evento Manychat | Uso actual en CRM | Equivalente Uchat (a confirmar con doc/API) |
|-----------------|-------------------|---------------------------------------------|
| `new_subscriber` | Crear/actualizar lead, conversación | Nuevo usuario / usuario conectado → mismo flujo en CRM |
| `message_received` | Guardar mensaje, enriquecer lead si es formulario | Mensaje entrante → mismo flujo; parsear payload Uchat |
| `tag_added` | Actualizar `lead.tags`, posible auto-move pipeline | Tag añadido → actualizar lead, sync pipeline |
| `tag_removed` | Actualizar `lead.tags` | Tag removido → actualizar lead |
| `custom_field_changed` | Actualizar `lead.customFields`, posible auto-move (CUIL → Listo para Análisis) | Campo cambiado → actualizar lead, reglas de pipeline |

**Acción:** Definir contrato del webhook Uchat → CRM (JSON de ejemplo) y documentarlo en el código. Si Uchat no envía todos estos eventos, decidir qué se obtiene por polling o por webhook de Meta en paralelo.

### 2.2 API de envío de mensajes

| Manychat | Uchat / Meta |
|----------|--------------|
| `ManychatService.sendContent()` / API de mensajes | Uchat Partner API o WhatsApp Cloud API (POST a Graph API) |
| Identificador: `subscriber_id`, `whatsapp_phone` | Identificador: número de teléfono (formato E.164) o `user_ns` si Uchat lo expone |

### 2.3 Tags y pipeline

- Mantener mapeo etapa CRM ↔ tag (ver `pipeline_stage_tags` y [PIPELINE-MANYCHAT-SYNC.md](./PIPELINE-MANYCHAT-SYNC.md)).
- Reemplazar llamadas a Manychat (añadir/quitar tag) por llamadas a API de Uchat cuando exista; si no, documentar como pendiente y usar solo pipeline en CRM.

### 2.4 Identificadores de lead

- **Manychat:** `manychatId` (subscriber id) en `Lead`.
- **Uchat:** Añadir campo `uchatUserId` o equivalente si Uchat expone un ID de usuario; si no, seguir identificando por `telefono` / `whatsapp_phone`.

---

## 3. Archivos a modificar o crear

### 3.1 Webhooks entrantes

| Archivo | Cambio |
|---------|--------|
| `src/app/api/webhooks/manychat/route.ts` | Mantener mientras exista Manychat; opcional: redirigir a un handler común “chat platform” si el payload se normaliza. |
| **Nuevo:** `src/app/api/webhooks/uchat/route.ts` | Recibir POST de Uchat, verificar firma/token, parsear evento y llamar a un `UchatWebhookService` (crear). |
| `src/app/api/whatsapp/webhook/route.ts` | Sigue soportando Meta directo; si Uchat reenvía en formato Meta, ya funciona. Si Uchat envía otro formato, añadir rama `handleUchatWebhook(body)`. |

### 3.2 Servicios (backend)

| Archivo | Cambio |
|---------|--------|
| `src/server/services/manychat-webhook-service.ts` | Referencia para lógica (crear lead, mensaje, tags, custom fields). Extraer lógica reutilizable a un “GenericChatWebhookService” o reutilizar desde UchatWebhookService. |
| **Nuevo:** `src/server/services/uchat-webhook-service.ts` | Implementar procesamiento de eventos Uchat → crear/actualizar lead, conversación, mensajes, tags, custom fields. |
| **Nuevo:** `src/lib/uchat-client.ts` o `src/server/services/uchat-service.ts` | Cliente para API Uchat: enviar mensaje, listar/añadir/quitar tags, custom fields (según doc Uchat). |
| `src/server/services/messaging-service.ts` | Añadir canal “uchat” o detectar por config; si `UCHAT_ENABLED` o no hay Manychat, usar UchatService/WhatsApp Cloud para enviar. |
| `src/server/services/manychat-sync-service.ts` | Mantener para Manychat; crear `uchat-sync-service.ts` o extender sync para “provider” (manychat | uchat) y sincronizar tags/etapas con Uchat. |
| `src/server/services/pipeline-auto-move-service.ts` | Sigue igual; puede llamar a Uchat (tags) en lugar de Manychat al actualizar etapa. |

### 3.3 API routes (llamadas desde frontend)

| Archivo | Cambio |
|---------|--------|
| `src/app/api/manychat/broadcast/route.ts` | Añadir opción de enviar vía Uchat (o nuevo `/api/uchat/broadcast`) cuando Uchat tenga API de broadcasts. |
| `src/app/api/manychat/tags/route.ts` | Mientras se use Manychat, mantener; cuando solo Uchat, reemplazar por llamadas a Uchat o endpoint unificado “tags” que use provider config. |
| `src/app/api/manychat/sync-lead/route.ts` | Equivalente para Uchat: sincronizar un lead con Uchat (crear usuario, actualizar campos/tags). |
| `src/app/api/leads/webhook/route.ts` | Hoy crea subscriber en Manychat si `origen === 'whatsapp'`; añadir rama: si Uchat está configurado, crear/actualizar usuario en Uchat en lugar de Manychat. |
| `src/app/api/pipeline/leads/[leadId]/move/route.ts` | Al mover etapa, actualizar tag en Uchat (igual que hoy con Manychat). |
| `src/app/api/conversations/[id]/messages/route.ts` | Envío de mensaje: si destino es WhatsApp y provider es Uchat, usar UchatService/WhatsApp API. |

### 3.4 Tipos y configuración

| Archivo | Cambio |
|---------|--------|
| **Nuevo:** `src/types/uchat.ts` | Tipos para eventos webhook Uchat, usuario, mensaje, tag (según documentación Uchat). |
| `src/lib/manychat-sync.ts` | Mapeo etapa → tag; reutilizar para Uchat si los nombres de tag son los mismos; si no, mapeo en config. |
| `env.example` | Añadir variables Uchat (ver [UCHAT-SETUP.md](./UCHAT-SETUP.md)). |

### 3.5 UI (opcional en fase 1)

| Archivo | Cambio |
|---------|--------|
| `src/components/manychat/*` | A largo plazo: componentes “Uchat” o genéricos “ChatProvider” (conexión, tags, sync). Mientras tanto, se puede mantener UI Manychat y añadir badge “Uchat” cuando el lead venga de Uchat. |
| `src/app/(dashboard)/settings/manychat/page.tsx` | Añadir pestaña o página “Uchat” para config (API key, webhook URL, test de conexión). |
| Sidebar / navegación | Enlace a configuración Uchat si se añade página. |

### 3.6 Tests

| Archivo | Cambio |
|---------|--------|
| `src/server/services/__tests__/manychat-service.test.ts` | Mantener; añadir `uchat-service.test.ts` o tests de `uchat-webhook-service.ts`. |
| Mocks | Añadir mocks de respuestas API Uchat y payloads de webhook Uchat. |

---

## 4. Orden recomendado de implementación

1. **Documentar y config**
   - Variables de entorno Uchat en `env.example` y [UCHAT-SETUP.md](./UCHAT-SETUP.md).
   - Contrato del webhook Uchat (ejemplo JSON) y tipos en `src/types/uchat.ts`.

2. **Recibir eventos Uchat**
   - Crear `src/app/api/webhooks/uchat/route.ts` y `UchatWebhookService`; crear/actualizar lead, conversación, mensajes; opcionalmente tags y custom fields si el payload lo trae.

3. **Envío de mensajes**
   - Implementar `UchatService` o uso directo de WhatsApp Cloud API; en `MessagingService` (o en la ruta de conversaciones) añadir rama “Uchat” o “WhatsApp Cloud” cuando el canal sea WhatsApp y el provider configurado sea Uchat.

4. **Sincronización pipeline → Uchat**
   - Al mover etapa en el pipeline, llamar a API Uchat para actualizar tag (o equivalente); reutilizar lógica de `manychat-sync` con cliente Uchat.

5. **Leads desde formulario web**
   - En `src/app/api/leads/webhook/route.ts`: si origen WhatsApp y Uchat configurado, crear/actualizar usuario en Uchat en lugar de Manychat.

6. **Broadcasts y flujos**
   - Cuando la API de Uchat lo permita: endpoint de broadcast y/o indicador de flujos; mientras tanto dejar Manychat o documentar como “pendiente Uchat”.

7. **UI y settings**
   - Página o pestaña de configuración Uchat; indicadores en lead/conversación de “proveedor: Uchat”.

8. **Desactivar Manychat**
   - Feature flag o env `USE_UCHAT=true`; cuando estable, quitar código y env de Manychat (o mantener en paralelo si se necesita soporte dual).

---

## 5. Nuevos endpoints y servicios

### 5.1 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/webhooks/uchat` | Webhook que Uchat llama ante eventos (nuevo usuario, mensaje, tag, custom field). Verificar firma/token; responder 200 rápido y procesar en background si es pesado. |
| GET  | (opcional) `/api/webhooks/uchat` | Si Uchat requiere verificación tipo Meta (hub.mode, hub.verify_token, hub.challenge), implementar GET que devuelva el challenge. |

### 5.2 Servicios nuevos

| Servicio | Responsabilidad |
|----------|------------------|
| `UchatWebhookService` | Parsear payload Uchat, crear/actualizar lead, conversación, mensajes; aplicar reglas de tags y custom fields (incl. auto-move a Listo para Análisis si aplica). |
| `UchatService` (o `uchat-client`) | Llamadas a API Uchat: enviar mensaje, obtener/añadir/quitar tags, actualizar custom fields; autenticación con token de Uchat. |

---

## 6. Variables de entorno y feature flags

```bash
# Habilitar Uchat como proveedor de WhatsApp (cuando esté implementado)
USE_UCHAT=true

# Credenciales Uchat (ver UCHAT-SETUP.md)
UCHAT_API_KEY=...
UCHAT_WEBHOOK_SECRET=...
UCHAT_WORKSPACE_ID=...   # Si aplica

# WhatsApp (Meta) – usadas si el CRM envía/recibe directo o si Uchat comparte mismo token
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=...
```

- Si `USE_UCHAT=true` y las variables Uchat están presentes, el CRM usa Uchat para envío y/o webhook.
- Si `MANYCHAT_API_KEY` está presente y `USE_UCHAT` no (o false), se mantiene comportamiento Manychat actual.

---

## 7. Rollback

- Mantener código Manychat hasta que Uchat esté estable en producción.
- No eliminar `manychat-webhook-service`, `manychat-service` ni rutas Manychat hasta tener rollback probado.
- En Vercel/entorno: cambiar `USE_UCHAT=false` y (si el webhook de Meta volviera a Manychat) reconfigurar webhook en Manychat para volver a recibir eventos.
- Base de datos: el campo `manychatId` puede coexistir con `uchatUserId`; no es necesario migrar datos antiguos de Manychat para rollback.

---

## 8. Checklist de migración

- [ ] Documentación Uchat (setup, casos de uso, arquitectura) revisada.
- [ ] Variables de entorno Uchat definidas en `env.example` y en el entorno de despliegue.
- [ ] Contrato webhook Uchat documentado y tipos TypeScript creados.
- [ ] Endpoint `POST /api/webhooks/uchat` implementado y verificación de firma/token.
- [ ] `UchatWebhookService` implementado (lead, conversación, mensajes, tags, custom fields).
- [ ] Cliente API Uchat (enviar mensaje, tags) implementado.
- [ ] `MessagingService` o ruta de conversaciones usa Uchat cuando `USE_UCHAT=true`.
- [ ] Al mover etapa en pipeline, se actualiza tag en Uchat.
- [ ] Webhook de leads (formulario) crea/actualiza usuario en Uchat cuando corresponda.
- [ ] Tests unitarios/integración para webhook Uchat y envío.
- [ ] Configuración Uchat en panel (opcional) y documentación de uso.
- [ ] Pruebas E2E: mensaje entrante → Uchat → CRM; respuesta desde CRM → Uchat/Meta.
- [ ] Plan de rollback documentado y probado (desactivar Uchat, reconfigurar webhook).

---

**Última actualización:** Marzo 2025
