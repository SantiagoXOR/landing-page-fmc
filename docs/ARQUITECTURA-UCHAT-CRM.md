# Arquitectura Uchat + CRM Phorencial

Diagramas y flujos de la integración entre **Uchat** (flujos, bots, WhatsApp) y el **CRM Phorencial** (leads, pipeline, conversaciones).

---

## 1. Visión general

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    WhatsApp (usuario)                      │
                    └───────────────────────────┬───────────────────────────────┘
                                                │
                                                ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │              Meta (WhatsApp Business API)               │
                    │         Webhook configurado → Uchat (o CRM)              │
                    └───────────────────────────┬───────────────────────────────┘
                                                │
              ┌─────────────────────────────────┼─────────────────────────────────┐
              │                                 │                                 │
              ▼                                 ▼                                 ▼
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│       Uchat             │     │   CRM Phorencial        │     │  Meta for Developers    │
│  • Flujos / bots        │────▶│   • Leads               │◀────│  (si webhook directo)   │
│  • Respuestas auto      │     │   • Pipeline            │     │  • Phone Number ID      │
│  • Tags / segmentos     │     │   • Conversaciones      │     │  • Access Token         │
│  • Reenvío eventos      │     │   • Envío desde CRM     │     └─────────────────────────┘
└─────────────────────────┘     └─────────────────────────┘
              │                                 ▲
              │  Webhook / API                   │  API (enviar mensaje,
              │  (eventos → CRM)                 │   actualizar tags)
              └─────────────────────────────────┘
```

- **Meta** entrega los mensajes de WhatsApp al destino configurado en el webhook (Uchat o, en modelo alternativo, el CRM).
- **Uchat** ejecuta flujos y bots; opcionalmente envía eventos al CRM (nuevo usuario, mensaje, tag, custom field).
- **CRM** es la fuente de verdad de leads y pipeline; envía mensajes y actualiza tags vía API (Uchat o Meta).

---

## 2. Modelo híbrido recomendado (webhook Meta → Uchat)

Flujo cuando **todos** los mensajes de WhatsApp pasan primero por Uchat.

```
  Usuario          Meta              Uchat                    CRM
     │               │                  │                       │
     │  mensaje      │                  │                       │
     │──────────────▶│                  │                       │
     │               │  POST webhook    │                       │
     │               │────────────────▶│                       │
     │               │                  │  flujos, respuestas   │
     │               │                  │  automáticas          │
     │               │                  │  (bot)                │
     │               │                  │                       │
     │               │                  │  POST webhook (evento)│
     │               │                  │──────────────────────▶│
     │               │                  │                       │  crear/actualizar
     │               │                  │                       │  lead, conversación,
     │               │                  │                       │  mensajes, tags
     │               │                  │                       │
     │  respuesta    │                  │                       │
     │◀──────────────│◀─────────────────│  (bot o agente)       │
     │               │                  │                       │
     │               │                  │  Agente escribe en CRM│
     │               │                  │◀──────────────────────│
     │               │                  │  API: enviar mensaje   │
     │  mensaje      │                  │  API: actualizar tag  │
     │◀──────────────│◀─────────────────│                       │
```

### 2.1 Detalle de eventos Uchat → CRM

Cuando Uchat envía un evento al CRM (webhook configurado en Uchat):

| Evento (ejemplo) | Acción en CRM |
|------------------|----------------|
| Nuevo usuario / primer mensaje | Crear lead (si no existe), crear conversación, guardar mensaje. |
| Mensaje entrante | Guardar en conversación; si es formulario “Solicitud de Crédito”, parsear y actualizar lead (customFields, CUIL, etc.). |
| Tag añadido | Actualizar `lead.tags`; opcional: mover etapa de pipeline si el tag mapea a una etapa. |
| Tag removido | Actualizar `lead.tags`. |
| Custom field cambiado | Actualizar `lead.customFields`; si CUIL completo (o criterio “listo para análisis”), ejecutar auto-move a Listo para Análisis. |

---

## 3. Modelo alternativo: webhook Meta → CRM directo

Si el webhook de Meta apunta **directamente** al CRM (sin Uchat en el medio):

```
  Usuario          Meta                    CRM
     │               │                       │
     │  mensaje      │                       │
     │──────────────▶│                       │
     │               │  POST /api/whatsapp/webhook
     │               │─────────────────────▶│
     │               │                       │  crear/actualizar lead,
     │               │                       │  guardar mensaje
     │               │                       │  (no hay flujos Uchat)
     │  respuesta    │  (CRM envía por API   │
     │◀──────────────│   Meta/Uchat)         │
```

- Los flujos y bots de Uchat **no** se ejecutan para ese número, a menos que el CRM reenvíe el mensaje a Uchat (por ejemplo vía Inbound Webhook de Uchat). No es el modelo recomendado si se quieren usar flujos Uchat.

---

## 4. Sincronización Pipeline ↔ Uchat

Cuando un agente mueve un lead de etapa en el CRM:

```
  CRM (Pipeline)                    Uchat
       │                               │
       │  Lead movido a                │
       │  "Listo para Análisis"        │
       │                               │
       │  API: añadir tag              │
       │  "solicitud-en-proceso"       │
       │  (quitar tag etapa anterior)  │
       │──────────────────────────────▶│
       │                               │  Flujos pueden reaccionar
       │                               │  al tag (ej. enviar mensaje)
```

- El mapeo etapa ↔ tag se mantiene (igual que con Manychat); ver [PIPELINE-MANYCHAT-SYNC.md](./PIPELINE-MANYCHAT-SYNC.md). Al migrar a Uchat, las llamadas de actualización de tags se hacen a la API de Uchat.

---

## 5. Envío de mensaje desde el CRM

Cuando un agente escribe en el chat del CRM:

```
  Agente (CRM)         Backend CRM              Uchat / Meta
       │                     │                         │
       │  Enviar mensaje     │                         │
       │────────────────────▶│                         │
       │                     │  API: enviar mensaje   │
       │                     │  (teléfono, texto)     │
       │                     │───────────────────────▶│
       │                     │                         │  Entrega por WhatsApp
       │                     │  200 OK                 │
       │                     │◀───────────────────────│
       │   Mensaje guardado  │                         │
       │◀────────────────────│                         │
```

- El backend puede usar **Uchat API** (si Uchat expone envío de mensajes) o **WhatsApp Cloud API** (Meta) con el mismo número; en ambos casos el CRM guarda el mensaje en su propia tabla de conversaciones.

---

## 6. Componentes del CRM involucrados

| Componente | Función |
|------------|--------|
| `/api/whatsapp/webhook` | Recibe webhook de Meta (GET verificación, POST mensajes). Puede recibir también si Uchat reenvía en formato Meta. |
| `/api/webhooks/uchat` (a implementar) | Recibe webhook de Uchat (eventos: usuario, mensaje, tag, custom field). |
| `UchatWebhookService` (a implementar) | Procesa eventos Uchat → lead, conversación, mensajes, tags, custom fields. |
| `UchatService` / cliente API (a implementar) | Envío de mensajes y actualización de tags en Uchat. |
| `MessagingService` | Despacha envío según proveedor (Manychat hoy; Uchat o Meta mañana). |
| `PipelineAutoMoveService` | Reglas de negocio (ej. CUIL completo → Listo para Análisis); independiente del proveedor. |
| Sync pipeline → tags | Actualiza tags en el proveedor (Manychat hoy; Uchat mañana) al cambiar etapa. |

---

## 7. Referencias

- [UCHAT-VS-CRM-CASOS-DE-USO.md](./UCHAT-VS-CRM-CASOS-DE-USO.md) – Reparto de responsabilidades entre Uchat y CRM.
- [UCHAT-SETUP.md](./UCHAT-SETUP.md) – Configuración y variables de entorno.
- [UCHAT-MIGRACION-MANYCHAT.md](./UCHAT-MIGRACION-MANYCHAT.md) – Cambios de código y migración.
- [ARQUITECTURA.md](./ARQUITECTURA.md) – Arquitectura general del CRM.

---

**Última actualización:** Marzo 2025
