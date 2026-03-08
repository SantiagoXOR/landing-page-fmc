# Webhook WhatsApp (Meta) – Casos de uso del CRM

Cómo los eventos del webhook de WhatsApp Cloud API se traducen en casos de uso del CRM Phorencial y qué se puede contemplar a futuro.

---

## Qué hace hoy el webhook

| Campo / dato | Implementado | Uso en el CRM |
|--------------|---------------|----------------|
| **messages** (entrantes) | ✅ | Crear/actualizar lead, nombre desde `contacts[].profile.name`, crear conversación por teléfono, guardar mensaje, pipeline. |
| **value.statuses** (dentro de `messages`) | ✅ | Actualizar estado del mensaje (ej. marcar como leído con `status === 'read'`). |
| **message_echoes** | ✅ | Guardar mensajes enviados por el negocio en el historial (cuando la suscripción está disponible). |

---

## Casos de uso del CRM y relación con el webhook

### 1. Llegada del contacto (primer mensaje)

- **Webhook:** `change.field === 'messages'`, `value.messages[]`, `value.contacts[]`.
- **Uso:** Crear lead si no existe, extraer nombre de `contacts[].profile.name`, crear conversación, guardar primer mensaje, origen `whatsapp`.
- **Estado:** Cubierto.

### 2. Mostrar nombre real en vez de "Usuario"

- **Webhook:** Mismo payload; nombre en `value.contacts[].profile.name`.
- **Uso:** `getContactNameFromWebhook()` → al crear lead y al actualizar si el nombre actual está vacío o es genérico.
- **Estado:** Cubierto.

### 3. Historial de conversación (entrante y saliente)

- **Webhook:** `messages` para entrantes; `message_echoes` para ecos de enviados (si está suscrito); `value.statuses` para enviado/entregado/leído.
- **Uso:** Mensajes en tabla `messages`, conversación por teléfono, marcar leído cuando `status === 'read'`.
- **Estado:** Entrantes y estados cubiertos; ecos cubiertos en código (suscripción a `message_echoes` a veces no disponible en Meta).

### 4. Pipeline y auto-move (ej. CUIL completo → Listo para Análisis)

- **Webhook:** No viene del webhook de WhatsApp; el CRM mueve por reglas propias (datos del lead, formularios).
- **Uso:** `PipelineAutoMoveService` y sincronización con tags (Uchat/Manychat). El webhook solo aporta mensajes/datos que pueden disparar reglas (ej. si en el mensaje se detecta CUIL y se guarda en el lead).
- **Estado:** Lógica en CRM; el webhook alimenta datos (mensajes, nombre, etc.) que el CRM usa.

### 5. Envío fallido / errores de mensaje

- **Webhook:** Meta puede enviar `value.errors[]` en el mismo payload de `messages` (mensaje fallido, rechazado, etc.).
- **Uso:** Mostrar en el chat “mensaje no entregado”, reintentar o notificar al agente.
- **Estado:** No implementado; caso de uso a contemplar.

### 6. Templates (aprobación, rechazo, calidad)

- **Webhook:** Suscripción a `message_template_status_update` y `message_template_quality_update`.
- **Uso:** Saber si un template fue aprobado/rechazado o bajó de calidad; avisar en el CRM o deshabilitar envío de ese template.
- **Estado:** Suscripciones opcionales; no hay handler en el CRM aún.

### 7. Broadcasts / envíos masivos

- **Webhook:** No define quién recibe; el CRM define el segmento y llama a la API para enviar. Los estados de entrega llegan por `value.statuses` (en `messages`).
- **Uso:** Ver “entregado”/“leído” por mensaje; eventualmente métricas de campaña.
- **Estado:** Estados por mensaje ya se procesan; métricas de campaña serían una extensión.

### 8. Formularios / “Solicitud de Crédito” por chat

- **Webhook:** Mismo evento `messages`; el contenido puede ser texto con datos estructurados o respuestas a un flujo.
- **Uso:** Parsear el cuerpo del mensaje (ej. “Solicitud de Crédito” con campos), rellenar `customFields`/CUIL del lead y disparar auto-move a “Listo para Análisis” (como con Manychat).
- **Estado:** Parseo de formulario en webhook Manychat; en webhook Meta se puede replicar si el contenido viene en texto o en estructura de flujo.

### 9. Tareas y recordatorios (ej. “contactar en 24 h”)

- **Webhook:** No envía tareas; el CRM o Uchat las generan. El webhook aporta “llegó un mensaje” → se puede cerrar o posponer tareas de seguimiento.
- **Uso:** Al guardar mensaje entrante, notificar o actualizar tareas abiertas del lead (opcional).
- **Estado:** No implementado; caso de uso a contemplar.

### 10. Calidad del número y alertas de negocio

- **Webhook:** Suscripciones como `phone_number_quality_update`, `account_alerts`, `business_capability_update`.
- **Uso:** Alertas en el CRM si el número baja de calidad o hay restricciones; mostrar aviso a admins.
- **Estado:** No implementado; caso de uso a contemplar.

---

## Resumen: qué contemplar usando el webhook

| Caso de uso | Campo / evento | Acción en el CRM |
|-------------|----------------|-------------------|
| Mensajes entrantes y nombre | `messages` + `contacts` | ✅ Crear/actualizar lead, conversación, mensaje, nombre. |
| Estados de mensaje (enviado/entregado/leído) | `value.statuses` | ✅ Marcar leído; se puede extender a guardar `sent`/`delivered` en DB. |
| Ecos de mensajes enviados | `message_echoes` | ✅ Guardar en historial (si la suscripción está disponible). |
| Mensajes fallidos / errores | `value.errors` | 🔲 Mostrar “no entregado” en chat, reintento o notificación. |
| Estado de templates | `message_template_status_update` | 🔲 Actualizar estado del template en CRM; ocultar/deshabilitar si rechazado. |
| Calidad de templates | `message_template_quality_update` | 🔲 Avisos o límites de envío según calidad. |
| Calidad del número | `phone_number_quality_update` | 🔲 Alertas para admins. |
| Alertas de cuenta | `account_alerts` | 🔲 Notificaciones o panel de estado. |
| Formularios en mensaje (texto o flujo) | Dentro de `messages` | 🔲 Parser de “Solicitud de Crédito” o respuestas de flujo → actualizar lead y pipeline. |
| Tareas/recordatorios | Indirecto (mensaje entrante) | 🔲 Al recibir mensaje, actualizar/cerrar tareas de seguimiento del lead. |

Leyenda: ✅ implementado o cubierto; 🔲 por implementar o a contemplar.

---

## Próximos pasos sugeridos

1. **Errores de mensaje (`value.errors`):** En el mismo loop de `change.field === 'messages'`, leer `value.errors`; guardar en DB o marcar mensaje como fallido y opcionalmente notificar.
2. **Estados enviado/entregado:** Persistir en la tabla de mensajes `sent_at` / `delivered_at` según `status.status` (`sent`, `delivered`, `read`).
3. **Handlers para templates:** Si usan muchos templates, suscribirse a `message_template_status_update` (y opcionalmente `message_template_quality_update`) y guardar estado en configuración o en una tabla de plantillas.
4. **Formulario en mensaje:** Reutilizar lógica tipo Manychat (parser de “Solicitud de Crédito”) cuando el cuerpo del mensaje sea texto con campos; actualizar lead y disparar auto-move.
5. **Alertas de número/cuenta:** Suscribirse a `phone_number_quality_update` o `account_alerts` y mostrar avisos en dashboard o en configuración de WhatsApp.

Referencias: [UCHAT-VS-CRM-CASOS-DE-USO.md](./UCHAT-VS-CRM-CASOS-DE-USO.md), [WHATSAPP-BUSINESS-API-OFICIAL.md](./WHATSAPP-BUSINESS-API-OFICIAL.md).
