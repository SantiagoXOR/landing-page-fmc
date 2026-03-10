# Migración de flujos ManyChat → UChat

Guía para replicar en **UChat** los flujos de automatización que tenías en ManyChat (disparadores por mensaje, por etiqueta, solicitud de crédito, mensajes WhatsApp con variables, condiciones por etiqueta e inicio de otras automatizaciones).

---

## Documentación oficial de UChat

### Flujos y automatizaciones (general)

| Recurso | URL | Uso |
|--------|-----|-----|
| **Flow Builder (visión general)** | https://docs.uchat.com.au/flow-builder/ | Estructura: Flows (11 tipos), Sub Flows, Steps (8 tipos). Borrador vs Publicado. |
| **Conectar canales (WhatsApp, etc.)** | https://docs.uchat.com.au/guide/setup-create.html | Crear bot, conectar WhatsApp, Omnichannel. |
| **Send Message Step** | https://docs.uchat.com.au/flow-builder/send-message.html | Texto, variables `{{Nombre}}`, imágenes, botones, WhatsApp. |
| **Action Step - External Request** | https://docs.uchat.com.au/flow-builder/action-external-request.html | Llamadas HTTP a tu API (ej. formosafmc.com.ar). |
| **Tags (añadir/quitar, condiciones)** | https://docs.uchat.com.au/flow-builder/contents/action-tag.html | Add Tag / Remove Tag en Action step; usar tag en Condition. |
| **Triggers (automatizaciones)** | https://docs.uchat.com.au/flow-builder/automation/triggers.html | Crear trigger por evento (ej. Order Paid), elegir Sub Flow. |
| **Keywords** | https://docs.uchat.com.au/flow-builder/automation/keywords.html | Disparar por palabra clave: "is", "contains", "starts with". |
| **Sequences** | https://docs.uchat.com.au/flow-builder/automation/action-sequence.html | Mensajes con retraso; suscripción/desuscripción. |
| **Workflow (tareas en backend)** | https://docs.uchat.com.au/flow-builder/sub-flows/workflow.html | Automatizar tareas sin bloquear la conversación (tags, API, email). |
| **Inbound Webhooks** | https://docs.uchat.com.au/flow-builder/tools/inbound-webhooks.html | Recibir POST para iniciar un flujo con un usuario (por phone/user_ns/email). |
| **Triggers para desarrolladores (Fire Trigger)** | https://docs.uchat.com.au/for-developers/my-apps/triggers.html | Enviar datos desde tu app al chatbot y disparar flujos. |

### Recursos adicionales (formación / ejemplos)

- **External Request (tips):** https://uchat.au/uchat-training/deepdive-4-2-external-request-tips-and-tricks  
- **Inbound Webhook (lección):** https://uchat.au/tutorial/lesson-14-set-up-inbound-webhook  
- **Añadir tags y automatizaciones:** https://uchat.au/tutorial/lesson-3-adding-tags-adding-to-automations  
- **WhatsApp Flows (UChat Knowledge Base):** https://uchat.atlassian.net/wiki/spaces/UKB/pages/800915458/WhatsApp+Flows  

---

## Mapeo rápido: ManyChat → UChat

| ManyChat | UChat |
|----------|--------|
| **Cuando el usuario envía un mensaje** (contiene X) | **Keywords** (Automation → Keywords): condición "contains", Sub Flow asociado. |
| **Solicitud externa** (webhook/API) | **Action Step → External Request**: URL, método, body, mapear respuesta a custom fields. |
| **Añadir etiqueta** | **Action Step → Flow Actions → Add Tag**. |
| **WhatsApp – Enviar mensaje** (texto + variable Nombre) | **Send Message Step** (WhatsApp): texto + `{{custom_field}}` (ej. nombre). |
| **Cuando… Etiqueta aplicada** (evento de contacto) | No hay trigger nativo "Tag applied". Opciones: **Inbound Webhook** (CRM/sistema llama al webhook al aplicar tag) o **mismo flujo** que añade la etiqueta continúa con el mensaje. |
| **Condición: Etiqueta es solicitud-en-proceso** | **Condition Step**: comprobar tag del usuario y ramificar. |
| **Iniciar otra automatización** | Llamar a otro **Sub Flow** (Goto o conector) o **Trigger Workflow** (desde Action step). |
| Mensaje con imagen + botón CTA | **Send Message Step**: tipo imagen + botón (WhatsApp tiene límites de botón; revisar doc del canal). |

---

## Flujo 0: Lead nuevo (primer mensaje por WhatsApp)

**Objetivo:** Cuando alguien escribe por primera vez al WhatsApp, etiquetarlo como `lead-nuevo`, (opcional) hacer solicitud externa a formosafmc.com.ar, enviar mensaje de bienvenida con CTA "Pedí tu crédito" y, si hace clic en el CTA, etiquetar como `solicitando-documentos` y establecer origen WhatsApp.

**Disparador:** El CRM recibe todos los mensajes por el webhook de Meta. Si el lead **no tiene** la etiqueta `lead-nuevo`, el CRM llama al **Inbound Webhook** de UChat "Lead nuevo". UChat no tiene un trigger nativo "cualquier mensaje entrante" cuando el webhook apunta al CRM; por eso usamos Inbound Webhook llamado por el CRM.

### En UChat: pasos del flujo "Lead nuevo"

1. **Crear el Inbound Webhook**
   - **Tools** → **Inbound Webhooks** → **New Inbound Webhook**.
   - Nombre: `Lead nuevo (desde CRM)`.
   - **Values to Identify a User:** identificar por **phone** (ej. campo `phone` en el JSON).
   - **Mapping:** mapear `first_name` al custom field de nombre si lo usas en el mensaje.
   - Asociar este webhook al **Sub Flow "Lead nuevo"** (cuando reciba datos, ir a ese subflujo).
   - Guardar, activar y copiar la **URL del webhook**.

2. **Sub Flow "Lead nuevo"** (mismo estilo que el diagrama):
   - **Acciones (Action Step):**
     - (Opcional) **External Request** a `https://www.formosafmc.com.ar` si necesitas notificar al backend.
     - **Add Tag** → `lead-nuevo`.
   - **Send Message Step** (WhatsApp):
     - Imagen + texto de bienvenida, ej.: *"¡Hola {{First Name}}! 🚚💨 Somos Prendarios del Banco Formosa. ¿Cómo podemos ayudarte hoy?"*
     - **Botón CTA "Pedí tu Crédito":** la URL del botón debe ser la **landing page del formulario** (ej. `https://www.formosafmc.com.ar` o la ruta del formulario de crédito). Así el usuario interesado abre la página, completa el formulario y lo envía por WhatsApp; ese envío dispara el flujo **Solicitud de Crédito**.
   - Desde el **clic en el botón** (o respuesta del usuario), siguiente bloque:
   - **Acciones #2 (Action Step):**
     - **Add Tag** → `solicitando-documentos`.
     - **Establecer campo de usuario** (custom field que necesites).
     - **Establecer origen** para WhatsApp si UChat lo tiene.
   - (Opcional) **Iniciar Automatización** → subflujo "INFORMACION | WhatsApp" u otro.

3. **Etiquetas y custom fields**
   - En **Contents → Tags** crear: `lead-nuevo`, `solicitando-documentos`.
   - Custom field de nombre (ej. `nombre` o `Nombre`) para `{{nombre}}` en mensajes.

4. **Publicar** el flujo.

### En el CRM

En `.env.local` o Vercel:

```bash
UCHAT_INBOUND_WEBHOOK_LEAD_NUEVO_URL=https://...  # URL del Inbound Webhook "Lead nuevo"
```

Cuando llega **cualquier** mensaje de WhatsApp y el lead **no tiene** la etiqueta `lead-nuevo`, el CRM hace **POST** a esa URL con:

```json
{ "phone": "549...", "first_name": "Nombre" }
```

El CRM también asigna la etiqueta `lead-nuevo` al lead en la base de datos para no volver a llamar al webhook en mensajes siguientes.

**Cierre del ciclo:** El flujo "Lead nuevo" redirige al usuario (CTA) a la landing del formulario. Cuando el usuario completa el formulario y lo envía por WhatsApp, ese mensaje (con "Solicitud de Crédito") dispara el flujo **Solicitud de Crédito** en el CRM y en UChat.

---

## Flujo 1: Solicitud de crédito (mensaje → etiqueta → mensaje)

**En ManyChat:**  
Cuando el usuario envía un mensaje que contiene "✨ *Solicitud de Crédito*" → Solicitud externa a `https://www.formosafmc.com.ar` → Añadir etiqueta "solicitud-en-proceso" → Enviar WhatsApp: "¡Hola Nombre! 👋 Estamos revisando tu solicitud…"

### ¿Hace falta la "solicitud externa" (webhook) en UChat?

**No, si Meta ya envía los mensajes al CRM.** En ManyChat la "solicitud externa" a formosafmc.com.ar servía para avisar/registrar la solicitud en un backend. Si ahora **Meta entrega el mensaje al CRM** (webhook de WhatsApp configurado al CRM), el CRM ya recibe el texto "Solicitud de Crédito" y puede:

- Crear o actualizar el lead
- Mover etapa del pipeline
- Registrar la intención de crédito

En ese caso, en **UChat el flujo se simplifica**: no hace falta el paso de External Request. Solo necesitas que UChat **etiquete al usuario** y **envíe el mensaje de confirmación**. El CRM ya está enterado por Meta.

**Recomendación:** Flujo en UChat con **2 pasos**: Add Tag → Send Message.  
Solo incluir **External Request** si formosafmc.com.ar es un sistema distinto al CRM que siga necesitando una llamada explícita (por ejemplo una API legacy).

**En UChat:**

### Checklist Flujo 1 (simplificado)

- [ ] **0. Crear el bot** (pantalla "Final Step")
- [ ] **1. Conectar canal WhatsApp** al bot
- [ ] **2. Crear el Sub Flow** "Solicitud de Crédito" con **2 pasos** (Add Tag + Send Message)
- [ ] **3. Configurar la Keyword** que dispara el flujo
- [ ] **4. Crear la etiqueta** "solicitud-en-proceso" (y custom field "nombre" si no existe)
- [ ] **5. Publicar** el flujo

---

### Paso 0: Crear el bot (Final Step)

En la pantalla **"Create New Bot based on Blank Template"** → **Final Step**:

| Campo | Valor sugerido |
|-------|----------------|
| **Bot Name** | `Formosa Moto Crédito` (o el nombre que uses para este bot) |
| **Description** | `Bot WhatsApp: solicitud de crédito, preaprobado, historial. Migrado desde ManyChat.` |

Pulsa **Create Bot** (o el botón equivalente). Luego conecta el canal **WhatsApp** a este bot si aún no lo has hecho (según [Connect to Channels](https://docs.uchat.com.au/guide/setup-create.html)).

---

### Paso 1: Disparador por palabra clave ("Si el mensaje contiene...")

Para que el bot reaccione cuando el usuario escribe algo que **contiene** "Solicitud de Crédito":

1. Abre el bot y entra al **Flow Builder**.
2. En el **sidebar izquierdo** → **Automation** → **Keywords**.
3. **+ New Keyword** (o "+ Palabra clave"):
   - **Palabra clave / Keyword:** `Solicitud de Crédito` (o, si quieres incluir el emoji como en ManyChat: `✨ Solicitud de Crédito`). En UChat no hace falta el asterisco `*`; "contains" ya hace que coincida si la frase está en cualquier parte del mensaje.
   - **Condición:** **contains** ("contiene").
   - **Sub Flow:** selecciona el subflujo "Solicitud de Crédito".
4. Guarda.

Así, cualquier mensaje que **contenga** esa frase (ej. "Hola, quiero hacer una Solicitud de Crédito") disparará el flujo. Si la plataforma lo indica, las palabras clave suelen ser **no sensibles a mayúsculas** ("Hola" y "hola" se reconocen igual).

Ref: [Keywords](https://docs.uchat.com.au/flow-builder/automation/keywords.html).

---

### Paso 2: Sub Flow "Solicitud de Crédito" (2 pasos recomendados)

Entra al flow del bot → **Flows** (sidebar) → **+ New Sub Flow** → nombre: `Solicitud de Crédito`. Luego **Edit Flow** (modo borrador) y construye en este orden:

| Orden | Tipo de paso | Qué configurar |
|-------|----------------|-----------------|
| **2.1** | **Action Step** | **Flow Actions → Add Tag** → tag: `solicitud-en-proceso`. [Doc Tags](https://docs.uchat.com.au/flow-builder/contents/action-tag.html). |
| **2.2** | **Send Message Step** | Canal WhatsApp. Texto: `¡Hola {{nombre}}! 👋 Estamos revisando tu solicitud y te avisaremos en 24 horas. ¡Gracias por tu paciencia! ✨` (usa el nombre de tu custom field, ej. `{{nombre}}` o `{{Nombre}}`). [Doc Send Message](https://docs.uchat.com.au/flow-builder/send-message.html). |

Conecta: **Start** → 2.1 (Add Tag) → 2.2 (Send Message) → fin.

**Opcional – External Request:** Solo si un sistema externo (distinto del CRM) debe recibir una llamada al detectar la solicitud, añade un **Action Step** antes del Add Tag: **External Request** → URL `https://www.formosafmc.com.ar`, método y body según esa API. [Doc External Request](https://docs.uchat.com.au/flow-builder/action-external-request.html).

---

### Paso 3: Keyword que dispara el flujo

Ya descrito en Paso 1: en **Automation → Keywords** asignas la keyword "Solicitud de Crédito" (contains) al Sub Flow **Solicitud de Crédito**.

---

### Paso 4: Etiqueta y custom field

- **Etiqueta:** En **Contents → Tags** (sidebar), crea la etiqueta `solicitud-en-proceso` si no existe. También puedes crearla al elegir "Add Tag" en el Action step (escribiendo el nombre nuevo).
- **Nombre del usuario:** En **Contents → Custom Fields**, asegúrate de tener un campo para el nombre (ej. `nombre` o `Nombre`). WhatsApp/UChat suelen rellenarlo con el nombre del perfil; si no, lo rellenarás desde tu sistema o en otro paso del flujo.

---

### Paso 5: Publicar

En el Flow Builder, sal del modo edición y pulsa **Publish** para que la versión en borrador pase a ser la versión publicada y el bot use el nuevo flujo.

---

### Resumen visual del flujo (recomendado: sin webhook)

```
Usuario escribe "Solicitud de Crédito" (contains)
    → Keyword dispara Sub Flow "Solicitud de Crédito"
        → Action: Add Tag "solicitud-en-proceso"
        → Send Message: "¡Hola {{nombre}}! 👋 Estamos revisando..."
```

*(El CRM ya recibe el mensaje desde Meta; no hace falta llamar a formosafmc.com.ar desde UChat.)*

---

## Flujo 2: Historial crediticio desfavorable (etiqueta aplicada → mensaje)

**En ManyChat:**  
Cuando se produce un evento de contactos → **Etiqueta aplicada** (una etiqueta concreta) → Enviar WhatsApp: "¡Hola Nombre! Lamentablemente, no podemos asistirle debido a su historial crediticio…"

**En UChat:**  
UChat no tiene un trigger nativo tipo "Cuando se aplica la etiqueta X". Dos formas de replicarlo:

### Opción A: La etiqueta se aplica desde un flujo de UChat

- En el flujo que **añade la etiqueta** (por ejemplo después de una condición o de un External Request que devuelve “rechazado”), el siguiente paso no es solo "Add Tag", sino seguir con un **Send Message Step** con el texto de historial desfavorable.  
- Es decir: mismo subflujo que hace Add Tag "historial-desfavorable" (o el nombre que uses) → inmediatamente después, Send Message con ese texto.

### Opción B: La etiqueta la aplica el CRM u otro sistema

- Cuando el CRM (o tu backend) aplique la etiqueta al contacto, que además llame al **Inbound Webhook** de UChat con el identificador del usuario (teléfono o `user_ns`).  
- Ese webhook inicia un **Sub Flow** que solo tiene el **Send Message Step** con el mensaje de historial desfavorable.  
- Ref: [Inbound Webhooks](https://docs.uchat.com.au/flow-builder/tools/inbound-webhooks.html).  
- En el CRM Phorencial: al actualizar el lead (etapa/tag equivalente a “historial desfavorable”), llamar al webhook de UChat pasando el teléfono del lead para que UChat envíe el mensaje.

---

## Flujo 3: Crédito preaprobado (etiqueta aplicada → mensaje con imagen y CTA)

**En ManyChat:**  
Evento de contacto → **Etiqueta aplicada** → WhatsApp: "¡Hola! 👋 Tu crédito ya está preaprobado. ¡Visítanos en la concesionaria más cercana! 🚗💨" + botón "CONCESIONAR" + imagen (FMC Formosa Moto Crédito).

**En UChat:**

- Misma lógica que Flujo 2:  
  - **Opción A:** En el flujo que añade la etiqueta de “preaprobado”, el siguiente paso es un **Send Message Step** con:  
    - Texto del mensaje (y variable de nombre si la usas).  
    - **Imagen:** subir desde ordenador o URL (revisar límites de tamaño en [Send Message](https://docs.uchat.com.au/flow-builder/send-message.html)).  
    - **Botón:** en WhatsApp el botón tiene restricciones (por ejemplo, un solo uso); configurar el botón en el paso según las opciones del canal.  
  - **Opción B:** Si la etiqueta la aplica el CRM, usar **Inbound Webhook** que inicie un subflujo con ese mensaje + imagen + botón.

---

## Flujo 4: Estado de aprobación (otro flujo / condición por etiqueta → mensaje o iniciar automatización)

**En ManyChat:**  
Disparador: "Otro flujo" (RESPUESTA MENSAJE | Whatsapp) o (deshabilitado) usuario envía mensaje "saber el estado de su aprobacion de credito" → Enviar mensaje "¡Hola Nombre! Estamos revisando tu solicitud…" → **Condición:** Etiqueta es "solicitud-en-proceso" → Si SÍ: volver al mensaje (o siguiente paso). Si NO: **Iniciar Automatización** (RESPUESTA MENSAJE | Whatsapp).

**En UChat:**

1. **Entrada al flujo**  
   - Si es “otro flujo”: en UChat se modela llamando a un **Sub Flow** desde el flujo que maneja la respuesta de mensaje (conector o Goto al subflujo de “estado de aprobación”).  
   - Si quieres también disparo por texto: **Keywords** con "contains" y frase tipo "estado de aprobación" / "saber el estado" apuntando a este mismo subflujo.

2. **Dentro del subflujo**  
   - **Send Message Step:** "¡Hola {{nombre}}! Estamos revisando tu solicitud y te avisaremos en 24 horas. ¡Gracias por tu paciencia! ✨"  
   - **Condition Step:**  
     - Condición: tag del usuario **es** "solicitud-en-proceso" (o el nombre exacto del tag en UChat).  
     - Rama “sí”: siguiente paso que prefieras (por ejemplo otro mensaje o volver al inicio del subflujo si quieres repetir).  
     - Rama “no”: **Trigger Workflow** o **Goto** a otro Sub Flow que sea la automatización de “RESPUESTA MENSAJE” (equivalente a “Iniciar Automatización”).  
   - Ref: [Tags – Use Tag in Condition Step](https://docs.uchat.com.au/flow-builder/contents/action-tag.html), [Workflow](https://docs.uchat.com.au/flow-builder/sub-flows/workflow.html).

---

## Resumen de pasos por flujo

| Flujo | Disparador en UChat | Pasos del Sub Flow |
|-------|---------------------|--------------------|
| 0 – Lead nuevo | Inbound Webhook (CRM llama cuando lead sin tag "lead-nuevo") | (Opc.) External Request → Add Tag "lead-nuevo" → Send Message (bienvenida + CTA); al clic CTA: Add Tag "solicitando-documentos", set origen WhatsApp, Iniciar Automatización |
| 1 – Solicitud de crédito | Keywords "contains" frase solicitud | Add Tag "solicitud-en-proceso" → Send Message *(CRM recibe mensaje desde Meta; External Request opcional)* |
| 2 – Historial desfavorable | Mismo flujo que añade tag, o Inbound Webhook (CRM) | Send Message (texto desfavorable) |
| 3 – Crédito preaprobado | Mismo flujo que añade tag, o Inbound Webhook (CRM) | Send Message (texto + imagen + botón) |
| 4 – Estado de aprobación | Llamada desde otro subflujo o Keywords | Send Message → Condition (tag "solicitud-en-proceso") → Sí: siguiente paso; No: Trigger Workflow / Goto otro flujo |

---

## Variables y personalización

- **Nombre del usuario:** En UChat se usan **custom fields**. Asegúrate de tener un campo (ej. "nombre" o "Nombre") y usarlo en el mensaje como `{{nombre}}` (o el nombre del campo en minúsculas según cómo lo exponga UChat).  
- Creación/edición de campos: **Contents → Custom Fields** (sidebar).  
- Ref: [Send Message – Insert Custom Field Value](https://docs.uchat.com.au/flow-builder/send-message.html).

---

## Integración con el CRM Phorencial

- Para **Flujos 2 y 3** disparados por “etiqueta aplicada” cuando quien aplica la etiqueta es el **CRM** (por ejemplo al mover etapa o al marcar resultado de crédito):  
  - El backend del CRM debe llamar al **Inbound Webhook** de UChat con el identificador del usuario (teléfono en formato E.164 o el `user_ns` que use UChat para WhatsApp).  
  - Opcionalmente enviar en el body datos para custom fields (ej. nombre).  
- Documentación de arquitectura ya existente: [ARQUITECTURA-UCHAT-CRM.md](./ARQUITECTURA-UCHAT-CRM.md) y [UCHAT-MIGRACION-MANYCHAT.md](./UCHAT-MIGRACION-MANYCHAT.md).

---

## Ver mensajes del bot y nuevos en Chats (CRM)

Si en la vista de **Chats** no ves mensajes del usuario o del bot, revisa lo siguiente. **Si el webhook de Meta (WhatsApp) apunta al CRM:** los mensajes entrantes ya los recibe el CRM; para ver también las respuestas del bot hay que suscribir **message_echoes** en Meta (ver más abajo).

### Por qué pasa

- Los mensajes se muestran en el CRM cuando llegan por **webhook** (ManyChat o UChat envía cada mensaje al CRM) o por **sincronización** desde la API del chatbot.
- El bot ya está en **UChat**, pero el CRM sigue esperando eventos por webhook. Si **UChat no está configurado para enviar webhooks al CRM**, el CRM no recibe `message_received` ni `message_sent`, por eso no ves ni los mensajes del usuario ni las respuestas del bot.
- El badge **"No sincronizado"** en el sidebar del chat indica que el lead no tiene `manychatId` (en UChat se guarda como `uchat_` + id). Ese ID se asigna cuando llega el primer webhook de UChat para ese contacto; hasta entonces el CRM no puede “sincronizar” con la plataforma del bot.

### Qué hacer para que se vean los mensajes

1. **Configurar en UChat el webhook hacia el CRM**
   - En el panel de UChat (Partner API, Webhooks o la sección que corresponda), configura la **URL de webhook** que recibirá los eventos.
   - **URL del CRM:**  
     `https://www.formosafmc.com.ar/api/webhooks/uchat`  
     (o la URL base de tu CRM + `/api/webhooks/uchat`).
   - Indica a UChat que envíe eventos de **mensaje recibido** y **mensaje enviado** (y, si los usas, nuevo suscriptor, tag, custom field) a esa URL.
   - Referencia: [UCHAT-SETUP.md – Webhook Uchat → CRM](./UCHAT-SETUP.md#5-webhook-uchat--crm) y, si aplica, [Set up Webhook URL (Partner)](https://uchat.au/uchat-training/partner-funnel-3-2-set-up-webhook-url).

2. **Variables de entorno en el CRM**
   - Si UChat envía un token o firma en el webhook, configura en el CRM (por ejemplo en Vercel):
     - `UCHAT_WEBHOOK_SECRET` = el valor que UChat use para verificación.
   - El endpoint `/api/webhooks/uchat` ya está implementado y guarda mensajes en la conversación cuando recibe `message_received` y `message_sent`.

3. **Probar**
   - Envía un mensaje de prueba al número de WhatsApp (por ejemplo “Hola” o “Solicitud de Crédito”).
   - Comprueba que en el CRM, en **Chats**, aparezcan tanto tu mensaje como la respuesta del bot y que el contacto pase a **Sincronizado** cuando corresponda.

**Nota:** El botón **"Sincronizar ahora"** en el chat hoy llama a la sincronización con **ManyChat**. Para UChat no hay aún un “Sincronizar ahora” que traiga historial por API; la fuente de mensajes es el **webhook**. **Si el webhook de Meta apunta al CRM:** Los entrantes ya llegan. Para ver las respuestas del bot, en Meta for Developers → WhatsApp → Webhook suscribe el campo **message_echoes** (mensajes enviados por el negocio); el CRM ya guarda esos eventos en la conversación. No hace falta webhook UChat para ver mensajes en ese caso.

### Mensaje del bot, etiqueta y custom fields cuando el webhook apunta al CRM

Si el webhook de Meta apunta al CRM, UChat no recibe el mensaje y el flujo del bot no se ejecuta. El CRM ahora, al recibir un mensaje que **contiene "Solicitud de Crédito"**, parsea el texto (formato Solicitud de Crédito - Moto), **actualiza los custom fields del lead** y **asigna la etiqueta "solicitud-en-proceso"** en el CRM.

Para que **el bot envíe la respuesta** por WhatsApp hay dos opciones: **A)** webhook de Meta a UChat (y Uchat → CRM); **B)** mantener Meta → CRM y que el CRM **reenvíe** el mensaje a UChat (recomendado si quieres seguir recibiendo todo en el CRM primero).

---

### Opción B: CRM reenvía a UChat (Inbound Webhook)

Con el webhook de Meta apuntando al CRM, el CRM puede llamar al **Inbound Webhook** de UChat cuando el mensaje contiene "Solicitud de Crédito". UChat identifica al usuario por teléfono, ejecuta el subflujo "Solicitud de Crédito" (Add Tag + Send Message) y envía la respuesta al usuario por WhatsApp.

#### 1. Crear el Inbound Webhook en UChat

1. En UChat → **Tools** → **Inbound Webhooks** → **New Inbound Webhook**.
2. Nombre sugerido: `Solicitud de Crédito (desde CRM)`.
3. En **Values to Identify a User**, indica que el usuario se identifica por **phone** (ruta en el JSON, ej. `phone`).
4. En **Mapping**, si quieres enviar el nombre: mapea `first_name` a tu custom field de nombre (opcional).
5. **Asocia el webhook al subflujo "Solicitud de Crédito"**: entra al subflujo que debe ejecutarse (el que tiene Add Tag + Send Message) y configura que este Inbound Webhook lo dispare (según la UI de UChat: "When this webhook receives data, go to this subflow" o similar).
6. Guarda y **activa** el webhook. Copia la **URL del webhook** (POST).

Ref: [Inbound Webhooks](https://docs.uchat.com.au/flow-builder/tools/inbound-webhooks.html).

#### 2. Configurar el CRM

En el CRM (Vercel o `.env.local`), define las URLs de los Inbound Webhooks:

```bash
# Flujo "Solicitud de Crédito" (mensaje contiene "Solicitud de Crédito")
UCHAT_INBOUND_WEBHOOK_SOLICITUD_CREDITO_URL=https://...

# Flujo "Lead nuevo" (primer mensaje de un lead; ver Flujo 0 más arriba)
UCHAT_INBOUND_WEBHOOK_LEAD_NUEVO_URL=https://...
```

Pega la URL completa de cada Inbound Webhook que crees en UChat.

#### 3. Qué envía el CRM

Cuando un mensaje entrante (desde Meta al CRM) **contiene "Solicitud de Crédito"**, el CRM hace un **POST** a esa URL con un JSON como:

```json
{
  "phone": "5493547527070",
  "first_name": "Santiago"
}
```

`phone` es el teléfono en formato E.164 (el mismo que usa el CRM). UChat usa `phone` para encontrar o crear el usuario y luego ejecuta el subflujo "Solicitud de Crédito", que añade la etiqueta y envía el mensaje de confirmación.

#### 4. Probar

Envía por WhatsApp un mensaje que contenga "Solicitud de Crédito" (o el formulario completo). Deberías recibir la respuesta del bot ("¡Hola …! Estamos revisando tu solicitud…"). En el CRM seguirán actualizándose custom fields y la etiqueta porque el webhook de Meta ya hace eso; además, el CRM llama al Inbound Webhook para que UChat envíe la respuesta.

---

**Última actualización:** Marzo 2025
