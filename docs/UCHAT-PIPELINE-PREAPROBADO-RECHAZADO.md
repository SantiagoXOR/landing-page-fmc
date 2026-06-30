# Pipeline → Uchat + WhatsApp (Preaprobado / Rechazado)

Cuando movés una tarjeta a **Preaprobado** o **Rechazado** en el pipeline de ventas:

1. El CRM **ya actualiza** `Lead.tags` (como antes).
2. Se envía **WhatsApp por Meta** con el texto oficial (preaprobado o rechazo), salvo que configures `PIPELINE_NOTIFY_SKIP_META=true`.
3. Si configurás los webhooks de Uchat, se hace **POST** a Uchat para que el flujo **aplique la etiqueta al suscriptor** y, si querés, ejecute más pasos.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `UCHAT_INBOUND_WEBHOOK_PREAPROBADO_URL` | URL del Inbound Webhook en Uchat al mover a **Preaprobado**. |
| `UCHAT_INBOUND_WEBHOOK_RECHAZADO_URL` | URL del Inbound Webhook al mover a **Rechazado** (incl. columnas perdido/rechazado). |
| `PIPELINE_NOTIFY_SKIP_META` | Si es `true`, **no** envía WhatsApp desde el CRM; solo webhook Uchat (el flujo debe enviar el mensaje usando el campo `message` del JSON). |
| `PIPELINE_PREAPROBADO_WHATSAPP_MESSAGE` | (Opcional) Sobrescribe el texto de preaprobado. |
| `PIPELINE_PREAPROBADO_TEMPLATE_BODY` | (Opcional) Texto corto solo para plantilla `mensaje_pipeline` (sin URL; el botón CONCESIONARIAS ya está en Meta). |
| `PIPELINE_RECHAZADO_WHATSAPP_MESSAGE` | (Opcional) Sobrescribe el texto de rechazo por defecto. |
| **`WHATSAPP_TEMPLATE_PIPELINE_NOTIFY`** | Nombre de plantilla **aprobada en Meta** (una sola variable en el cuerpo: `{{1}}`). Se usa para preaprobado y rechazado si no definís las específicas. **Necesaria para enviar pasadas las 24 h.** |
| `WHATSAPP_TEMPLATE_PREAPROBADO` | (Opcional) Plantilla solo para preaprobado (mismo formato `{{1}}`). |
| `WHATSAPP_TEMPLATE_RECHAZADO` | (Opcional) Plantilla solo para rechazado (`{{1}}`). |
| `WHATSAPP_TEMPLATE_PIPELINE_LANG` | Código de idioma de la plantilla (ej. `es`, `es_AR`). Por defecto `es`. |
| `WHATSAPP_TEMPLATE_BODY_PARAMETER_NAME` | Nombre de la variable del cuerpo sin `{{}}` (ej. `mensaje_pipeline`) cuando Meta no usa `{{1}}`. |
| `WHATSAPP_TEMPLATE_HEADER_MEDIA_URL` | URL HTTPS pública de imagen para plantillas con **header de imagen variable** (ej. `notif_pipeline_crm`). Si no se define, el CRM usa `https://www.formosafmc.com.ar/landing/seo/og-image-1.png`. |

### Después de 24 horas (Meta)

WhatsApp solo permite **mensajes de sesión** si el cliente escribió en las últimas **24 horas**. Fuera de esa ventana, Meta exige **plantillas** preaprobadas.

El CRM:

1. Mira el **último mensaje entrante** del lead en conversaciones WhatsApp guardadas en el CRM.
2. Si pasaron ≥ 24 h (o no hay ningún inbound registrado), envía la **plantilla** con el texto completo en `{{1}}`.
3. Si todavía hay ventana abierta, envía **texto libre** (como antes).
4. Si el texto libre falla por ventana cerrada, **reintenta con plantilla** (por si el reloj no coincidía con el CRM).

**Pasos en Meta Business Manager**

1. Ir a **WhatsApp → Plantillas de mensajes**.
2. Crear plantilla categoría **UTILITY** (o la que aplique), idioma **español**.
3. **Cuerpo:** en muchas cuentas (ej. Spanish ARG) Meta ya **no** permite `{{1}}` en encabezado/cuerpo. Usá una variable con **nombre en minúsculas y guiones bajos**, solo en el **cuerpo**, por ejemplo: `{{mensaje_pipeline}}` (dejá el **encabezado vacío**). En el CRM configurá `WHATSAPP_TEMPLATE_BODY_PARAMETER_NAME=mensaje_pipeline` (sin `{{}}`).
4. **Sin saltos de línea** en el texto que va en `mensaje_pipeline`: Meta rechaza `#132018` si hay `\n`, `\t` o más de 4 espacios seguidos. El CRM sanitiza automáticamente al enviar plantilla; en `PIPELINE_PREAPROBADO_WHATSAPP_MESSAGE` evitá párrafos en blanco si editás el mensaje.
5. Plantillas antiguas con solo `{{1}}` en el cuerpo: no hace falta `WHATSAPP_TEMPLATE_BODY_PARAMETER_NAME`.
6. Enviar a revisión y esperar **APROBADA**.
7. Copiar el **nombre** exacto de la plantilla (ej. `notif_pipeline_crm`) en `WHATSAPP_TEMPLATE_PIPELINE_NOTIFY` o en las variables por tipo.

Si no configurás plantilla y el lead está fuera de ventana, el envío fallará y en logs verás la sugerencia de configurarlas.

## Body JSON que recibe Uchat (Inbound Webhook)

Ejemplo **preaprobado**:

```json
{
  "phone": "+549XXXXXXXXXX",
  "first_name": "Juan",
  "lead_id": "uuid-del-lead",
  "event": "pipeline_preaprobado",
  "tag_to_apply": "credito-preaprobado",
  "message": "Felicitaciones, usted tiene un crédito prendario pre-aprobado...",
  "uchat_subscriber_id": "12345678"
}
```

Ejemplo **rechazado**:

```json
{
  "phone": "+549XXXXXXXXXX",
  "first_name": "Juan",
  "lead_id": "uuid-del-lead",
  "event": "pipeline_rechazado",
  "tag_to_apply": "credito-rechazado",
  "message": "Buenas tardes, lamentablemente no podremos asistirlo...",
  "uchat_subscriber_id": "12345678"
}
```

`uchat_subscriber_id` solo viene si el lead tiene `manychatId` tipo `uchat_<id>`.

Si al mover a rechazado el usuario eligió un **mensaje de rechazo** en el CRM, ese texto reemplaza el cuerpo de `message` para WhatsApp y para el webhook.

## Configuración recomendada en Uchat

1. Crear **Inbound Webhook** “Pipeline preaprobado” y otro “Pipeline rechazado”.
2. En el flujo disparado por cada webhook:
   - **Add tag** usando el nombre en `tag_to_apply` (o fijo `credito-preaprobado` / `credito-rechazado`).
   - **No** enviar mensaje de texto en Uchat si dejás `PIPELINE_NOTIFY_SKIP_META` en false: el CRM ya envía el mismo contenido por Meta (evitás duplicar).
   - Si ponés `PIPELINE_NOTIFY_SKIP_META=true`, entonces en Uchat **Sí** enviá WhatsApp con el texto = variable `message` del webhook.

## Ventana de conversación (Meta)

Con plantillas configuradas, el CRM envía **plantilla** fuera de las 24 h. Sin plantilla, solo funcionará dentro de la ventana de sesión.

## Etapa Remarketing (Kanban)

Al mover una tarjeta a la columna **Remarketing** (`remarketing`):

1. Se aplica el tag `remarketing` al lead.
2. El CRM muestra un **modal para elegir plantilla WhatsApp** (arrastre o menú de etapas).
3. Se envía **siempre** WhatsApp por Meta con la plantilla elegida.

Preaprobado y rechazado siguen usando plantilla solo **fuera** de la ventana de 24 h; dentro de ventana, texto libre.

### Plantillas disponibles

Definidas en `src/lib/remarketing-templates.ts` (agregar nuevas entradas al crear plantillas en Meta):

| ID (UI/API) | Uso | Variable que envía el CRM |
|---|---|---|
| `seguimiento_credito` | Plantilla actual (`notif_pipeline_crm`) | Texto completo en `mensaje_pipeline` / `{{1}}` |
| `credito_autos_referidos` | Campaña 4 ruedas / referidos | Solo el **nombre** en `nombre_contacto` (copy fijo en Meta) |

Al mover desde el pipeline, enviar en el body del POST:

```json
{
  "fromStageId": "...",
  "toStageId": "remarketing",
  "remarketingTemplateId": "credito_autos_referidos"
}
```

| Variable | Descripción |
|----------|-------------|
| `PIPELINE_REMARKETING_WHATSAPP_MESSAGE` | Texto por defecto para plantilla `seguimiento_credito` (modo mensaje completo). |
| `WHATSAPP_TEMPLATE_REMARKETING` | Nombre Meta para `seguimiento_credito`; si vacía, usa `WHATSAPP_TEMPLATE_PIPELINE_NOTIFY`. |
| `WHATSAPP_TEMPLATE_REMARKETING_AUTOS` | Nombre Meta para `credito_autos_referidos` (default: `credito_autos_referidos`). |
| `WHATSAPP_TEMPLATE_REMARKETING_AUTOS_HEADER_URL` | (Opcional) Sobrescribe el banner. Por defecto: `https://www.formosafmc.com.ar/landing/whatsapp/credito_autos_referidos.jpeg` |
| `WHATSAPP_TEMPLATE_BODY_PARAMETER_NAME` | Variable del cuerpo para seguimiento (ej. `mensaje_pipeline`). |
| `UCHAT_INBOUND_WEBHOOK_REMARKETING_URL` | Webhook Uchat al entrar en Remarketing. |

Mensaje por defecto seguimiento: *"Hola {nombre}, seguimos disponibles para ayudarte con tu crédito prendario. ¿Querés que retomemos tu consulta?"*

**Nueva plantilla autos en Meta:** categoría Marketing, header imagen fija, cuerpo con `{{nombre_contacto}}` al inicio y copy fijo, botón a formosafmc.com.ar. Luego configurar `WHATSAPP_TEMPLATE_REMARKETING_AUTOS=credito_autos_referidos` (o el nombre exacto aprobado).

Migración BD: `scripts/migrations/003_add_remarketing_pipeline_stage.sql` + `004_add_remarketing_stage_tag.sql`.
