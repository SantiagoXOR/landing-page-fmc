# Configuración de Uchat + CRM Phorencial

Guía para conectar **Uchat** (flujos, bots, WhatsApp) con el **CRM Phorencial**, manteniendo el pipeline y la sincronización de leads.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Configuración en Uchat](#2-configuración-en-uchat)
3. [Configuración en Meta (WhatsApp)](#3-configuración-en-meta-whatsapp)
4. [Variables de entorno del CRM](#4-variables-de-entorno-del-crm)
5. [Webhook Uchat → CRM](#5-webhook-uchat--crm)
6. [Checklist de verificación](#6-checklist-de-verificación)
7. [Referencias y enlaces](#7-referencias-y-enlaces)

---

## 1. Requisitos previos

- [ ] Cuenta en **Uchat** con WhatsApp Cloud conectado.
- [ ] Número de teléfono **registrado y verificado** en Uchat (estado Conectado en Meta).
- [ ] CRM desplegado con URL pública (ej. `https://tu-dominio.vercel.app`).
- [ ] (Opcional) Cuenta en **Meta for Developers** si se usa webhook directo a CRM además de Uchat.

---

## 2. Configuración en Uchat

### 2.1 Cuenta y número

1. Accede al panel de Uchat.
2. En **WhatsApp Cloud** / **Números**, verifica que el número aparezca como **Conectado** (o Active/ONBOARDED).
3. Completa el **Phone Profile** (nombre, categoría, descripción) si aún no está hecho.
4. Si Uchat usa **360dialog** u otro BSP, configura el webhook según la doc de Uchat/Confluence (ej. [Setting Your 360dialog Webhook URL](https://uchat.atlassian.net/wiki/spaces/UKB/pages/789053441/Setting+Your+360dialog+Webhook+URL)).

### 2.2 Webhook de Meta hacia Uchat

Para que los mensajes de WhatsApp lleguen a Uchat y ejecuten flujos:

- En **Meta for Developers** (o en el panel que Uchat indique), la **URL de callback** del producto WhatsApp debe apuntar a **Uchat**, no al CRM.
- Uchat te indicará la URL exacta (ej. `https://uchat.com.au/botman/whatsapp-360/[Workspace ID]-[Phone Number]` para 360dialog).
- El **token de verificación** lo define Uchat/Meta en ese mismo flujo.

Si el número está conectado solo vía Uchat (sin app propia en Meta Dev), Uchat ya recibe los mensajes; no hace falta cambiar nada en Meta.

### 2.3 Obtener credenciales para el CRM

Para que el CRM envíe mensajes y (si aplica) reciba eventos:

- **Phone Number ID** y **Access Token**: desde el panel de Uchat (o desde Meta si la app es tuya). Anótalos para las variables de entorno.
- **Webhook URL del CRM**: la URL que Uchat usará para notificar eventos al CRM (ver [Webhook Uchat → CRM](#5-webhook-uchat--crm)).

---

## 3. Configuración en Meta (WhatsApp)

Solo aplica si **tú** configuras una app en [developers.facebook.com](https://developers.facebook.com) (p. ej. para recibir webhook directo en el CRM o para enviar por API).

| Paso | Dónde | Acción |
|------|--------|--------|
| 1 | Meta for Developers → Tu app → WhatsApp | Añadir producto WhatsApp si no está. |
| 2 | WhatsApp → Configuración | Anotar **Phone Number ID** y generar **Access Token** (permanente). |
| 3 | WhatsApp → Webhook | Si el webhook va al **CRM**: URL = `https://tu-dominio.com/api/whatsapp/webhook`, Verify Token = valor de `WHATSAPP_VERIFY_TOKEN`. |
| 4 | Suscripciones | Suscribir a `messages` (y si aplica `message_echoes`, `message_template_status_update`). |

Si **todo** pasa por Uchat (recomendado para flujos/bots), el webhook de Meta puede apuntar solo a Uchat; el CRM no necesita webhook directo de Meta y se alimenta por [Webhook Uchat → CRM](#5-webhook-uchat--crm).

### 3.1 Webhook en Vercel (CRM recibe los mensajes)

Cuando el webhook de **Meta** apunta al CRM (modelo que usamos con Lead nuevo y Solicitud de Crédito), la URL debe ser la de tu app desplegada en Vercel:

1. **Ruta en el código (ya existe):** `src/app/api/whatsapp/webhook/route.ts` → en producción responde en:
   ```
   https://[TU-APP].vercel.app/api/whatsapp/webhook
   ```
   (Reemplaza `[TU-APP]` por el nombre de tu proyecto en Vercel o tu dominio propio.)

2. **En Vercel → Project → Settings → Environment Variables**, asegúrate de tener:
   - `WHATSAPP_VERIFY_TOKEN` = el mismo valor que pondrás en Meta como "Verify token".
   - `UCHAT_INBOUND_WEBHOOK_LEAD_NUEVO_URL` = URL del Inbound Webhook "Lead nuevo" de UChat.
   - `UCHAT_INBOUND_WEBHOOK_SOLICITUD_CREDITO_URL` = URL del Inbound Webhook "Solicitud de Crédito" de UChat.
   - `UCHAT_INBOUND_WEBHOOK_CONSULTAS_CARLA_URL` = URL del Inbound Webhook "Consultas - Carla" de UChat (para que el AI Agent Carla responda consultas).
   - `UCHAT_INBOUND_WEBHOOK_PREAPROBADO_URL` / `UCHAT_INBOUND_WEBHOOK_RECHAZADO_URL` = al mover tarjetas en el pipeline de ventas (ver **[UCHAT-PIPELINE-PREAPROBADO-RECHAZADO.md](./UCHAT-PIPELINE-PREAPROBADO-RECHAZADO.md)**).
   - Resto de variables WhatsApp/Supabase según [Variables de entorno del CRM](#4-variables-de-entorno-del-crm).

3. **En Meta for Developers** → Tu app → **WhatsApp** → **Configuración** → **Webhook**:
   - **Callback URL:** `https://[TU-APP].vercel.app/api/whatsapp/webhook`
   - **Verify token:** el valor de `WHATSAPP_VERIFY_TOKEN` (ej. una cadena alfanumérica que definas).
   - Pulsar **Verify and Save**. Luego en **Webhook fields** suscribir al menos a **messages** (y si quieres ver mensajes enviados por el negocio en el CRM, también **message_echoes**).

Si no configuras la Callback URL en Meta, los mensajes de WhatsApp no llegarán al CRM y no se dispararán los flujos Lead nuevo ni Solicitud de Crédito.

---

## 4. Variables de entorno del CRM

En `.env.local` o en Vercel (Settings → Environment Variables) configura:

### 4.1 Modelo híbrido (Uchat recibe mensajes; CRM envía/recibe eventos)

```bash
# ----- WhatsApp / Uchat (uso con flujos Uchat) -----
# Si Uchat te da estas credenciales (o las obtienes de Meta para la misma app/número)
WHATSAPP_PHONE_NUMBER_ID=996413386894760
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_VERIFY_TOKEN=tu-token-de-verificacion-personalizado
WHATSAPP_APP_SECRET=tu-app-secret

# Token para que Uchat (o Meta) verifique el webhook del CRM (mismo valor que en el panel)
# WEBHOOK_TOKEN o ALLOWED_WEBHOOK_TOKEN se usan para /api/leads/webhook y webhooks externos
WEBHOOK_TOKEN=tu-webhook-token-seguro
# O:
ALLOWED_WEBHOOK_TOKEN=tu-webhook-token-seguro
```

### 4.2 Compatibilidad con Manychat (durante migración)

Mientras exista lógica que aún use Manychat:

```bash
MANYCHAT_API_KEY=tu-manychat-api-key
MANYCHAT_WEBHOOK_SECRET=opcional
```

Cuando la migración a Uchat esté completa, puedes dejar de usar estas variables (ver [UCHAT-MIGRACION-MANYCHAT.md](./UCHAT-MIGRACION-MANYCHAT.md)).

### 4.3 Generar tokens seguros

```bash
# Verify token (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Webhook token
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

---

## 5. Webhook Uchat → CRM

Para que el CRM cree/actualice leads y conversaciones cuando Uchat recibe mensajes o cambia tags/campos:

1. **URL del CRM que recibirá eventos**
   - Ejemplo: `https://tu-dominio.com/api/webhooks/uchat` (endpoint a implementar o reutilizar uno existente).
   - Debe ser POST, HTTPS, accesible desde internet.

2. **Configuración en Uchat**
   - En el panel de Uchat (Partner API, Webhooks o la sección que corresponda), configura:
     - **URL:** la URL del paso anterior.
     - **Token / Secret:** un valor compartido para verificar que los POST vienen de Uchat (guardar en env como `UCHAT_WEBHOOK_SECRET` o similar).

3. **Formato esperado**
   - Documentar en el código el payload que Uchat envía (eventos: nuevo usuario, mensaje recibido, tag añadido, custom field cambiado) y mapearlo al mismo flujo que hoy usa Manychat (crear/actualizar lead, conversación, mensajes). Ver [UCHAT-MIGRACION-MANYCHAT.md](./UCHAT-MIGRACION-MANYCHAT.md).

4. **Variables de entorno adicionales (ejemplo)**

```bash
UCHAT_WEBHOOK_SECRET=tu-secret-para-firmar-o-verificar
# Si Uchat usa un header de verificación:
UCHAT_WEBHOOK_VERIFY_HEADER=X-Uchat-Signature
```

---

## 6. Checklist de verificación

### En Uchat

- [ ] Número de WhatsApp **Conectado** (estado verde en Uchat/Meta).
- [ ] Phone Profile completado (nombre, categoría, descripción).
- [ ] Flujos de bienvenida / menú creados y publicados.
- [ ] (Si aplica) Webhook de 360dialog/Meta apuntando a la URL de Uchat.
- [ ] Webhook hacia el CRM configurado (URL + token) y probado con un evento de prueba.

### En Meta (si usas app propia)

- [ ] App con producto WhatsApp configurado.
- [ ] Phone Number ID y Access Token anotados y en `.env`.
- [ ] Si el webhook va al CRM: URL y Verify Token configurados y verificación OK.
- [ ] Suscripción a eventos necesarios (p. ej. `messages`).

### En el CRM

- [ ] Variables `WHATSAPP_*` y `WEBHOOK_TOKEN` / `ALLOWED_WEBHOOK_TOKEN` configuradas.
- [ ] Endpoint `/api/whatsapp/webhook` responde 200 al GET con `hub.verify_token` correcto.
- [ ] Endpoint de webhook Uchat → CRM implementado y respondiendo 200 a POST válidos.
- [ ] Prueba de envío: enviar un mensaje al número desde otro WhatsApp y comprobar que:
  - Uchat ejecuta el flujo (si aplica).
  - El CRM recibe el evento (si Uchat reenvía al CRM) y crea/actualiza lead y conversación.

### Sincronización Pipeline ↔ Uchat

- [ ] Tags en Uchat alineados con etapas del pipeline (ver [PIPELINE-MANYCHAT-SYNC.md](./PIPELINE-MANYCHAT-SYNC.md); reemplazar Manychat por Uchat cuando la API lo permita).
- [ ] Al mover un lead de etapa en el CRM, se actualiza el tag correspondiente en Uchat (vía API de Uchat cuando esté disponible).

---

## 7. Referencias y enlaces

| Recurso | URL |
|--------|-----|
| Casos de uso Uchat vs CRM | [UCHAT-VS-CRM-CASOS-DE-USO.md](./UCHAT-VS-CRM-CASOS-DE-USO.md) |
| Migración Manychat → Uchat | [UCHAT-MIGRACION-MANYCHAT.md](./UCHAT-MIGRACION-MANYCHAT.md) |
| Arquitectura Uchat + CRM | [ARQUITECTURA-UCHAT-CRM.md](./ARQUITECTURA-UCHAT-CRM.md) |
| WhatsApp Business API (Meta) | [WHATSAPP-BUSINESS-API-OFICIAL.md](./WHATSAPP-BUSINESS-API-OFICIAL.md) |
| Sincronización Pipeline ↔ Tags | [PIPELINE-MANYCHAT-SYNC.md](./PIPELINE-MANYCHAT-SYNC.md) |
| Uchat Knowledge Base (Confluence) | [uchat.atlassian.net/wiki](https://uchat.atlassian.net/wiki) (login requerido) |
| Uchat – Set up Webhook URL (Partner) | [uchat.au/uchat-training/partner-funnel-3-2-set-up-webhook-url](https://uchat.au/uchat-training/partner-funnel-3-2-set-up-webhook-url) |
| Uchat – Inbound Webhooks | [docs.uchat.com.au/flow-builder/tools/inbound-webhooks.html](https://docs.uchat.com.au/flow-builder/tools/inbound-webhooks.html) |

---

**Última actualización:** Marzo 2025
