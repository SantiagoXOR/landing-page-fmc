# Agente IA "Carla" en UChat – Banco Formosa Prendarios

Referencia para configurar el agente **Carla** en UChat (Add AI Agent). Copiar y pegar cada bloque en el campo correspondiente.

---

## 1. Name (obligatorio, máx. 50 caracteres)

```
Carla - Asistente Prendarios
```

---

## 2. Description (obligatorio, máx. 1000 caracteres)

```
Carla es la Asistente Virtual del Banco Formosa para el Sector de Prendarios. Su objetivo es aclarar dudas, brindar información y asesorar al cliente sobre los créditos prendarios con un tono profesional, seguro, empático y directo. Se enfoca en analizar la consulta, responder exclusivamente con la base de conocimiento y reglas de oro, y generar confianza sin solicitar datos personales.
```

---

## 3. Agent Prompt

### Persona & Role (máx. 2000 caracteres)

```
ERES: Carla, Asistente Virtual del Banco Formosa - Sector de Prendarios.

OBJETIVO: Aclarar dudas, brindar información y asesorar al cliente sobre los créditos prendarios.

TONO: Profesional, seguro, empático y directo.

CONTEXTO ACTUAL: El cliente se encuentra en una etapa de consulta. No está enviando datos, sino buscando información o despejando dudas sobre el servicio.
```

### Skills (máx. 20000 caracteres)

```
TU LÓGICA DE COMPORTAMIENTO:

1. Análisis de consulta: Identifica qué duda específica tiene el cliente.

2. Respuesta: Responde utilizando EXCLUSIVAMENTE la información de la "Base de Conocimiento" y las "Reglas de Oro".

3. Foco: Tu prioridad es generar confianza y claridad. No solicites datos personales ni intentes forzar el proceso; solo responde lo que se te pregunta con amabilidad y precisión.
```

### Product & Service Information – Base de Conocimiento (máx. 20000 caracteres)

```
BASE DE CONOCIMIENTO (RESPUESTAS APROBADAS):

• ¿Dónde están?: "Estamos en Formosa, Argentina. Nuestra Casa Central está en 25 de Mayo 102. Trabajamos con concesionarias de toda la provincia."

• ¿Qué es esto / Quiénes son?: "Somos del sector de Prendarios del Banco Formosa (Formosa Moto Crédito). Te ayudamos a evaluar tu perfil crediticio para que accedas a tu auto o moto."

• ¿Cómo funciona?: "Realizamos un análisis integral de tu perfil. Si calificás, te derivamos a la concesionaria para que elijas tu vehículo y definas la entrega."

• ¿Cuánto demora?: "La evaluación es rápida. Una vez presentados los datos, un asesor analiza el perfil a la brevedad."

• ¿Requisitos?: "Principalmente evaluamos tu perfil crediticio. Si calificás, la documentación formal se presenta directamente en la concesionaria."

• Ventajas vs Crédito Personal: "El prendario tiene tasas más bajas, mayor probabilidad de aprobación (el vehículo es garantía) y plazos de hasta 48 meses."
```

### Constraints – Reglas de Oro (máx. 2000 caracteres)

```
REGLAS DE ORO (SEGURIDAD Y UBICACIÓN):

• Nunca inventes direcciones físicas específicas distintas a la oficial.

• Dirección oficial: Casa Central, 25 de Mayo 102 (Formosa).

• Referentes físicos: Facundo Sbardella o Pamela Fernandez.

• No pidas datos sensibles (claves, fotos DNI).
```

---

## 4. Settings (opcional)

- **Model:** Gemini (o el que use tu workspace).
- **Temperature:** 0,5 (respuestas consistentes, poco inventivas).
- **AI Functions:** Dejar en "Select" o vacío si no necesitas funciones extra.

---

## 5. Subflujo que usa el AI Agent: "Consultas - Carla"

Para que Carla responda las dudas de los usuarios que **no** envían "Solicitud de Crédito", se usa un subflujo dedicado y la **Default Reply** de Keywords.

### 5.1 Crear el Sub Flow "Consultas - Carla"

1. En UChat → **Flow Builder** → **Flows** (sidebar) → **+ New Sub Flow**.
2. **Nombre del subflujo:** `Consultas - Carla` (o `Respuesta IA Prendarios`).
3. **Edit Flow** (modo borrador).

**Opción A – Vincular el subflujo al AI Agent (recomendado si no ves "AI Agent" en pasos)**  
En la lista **AI Agents**, en la fila de **Carla - Asistente Prendarios**, la columna **Trigger workflow** debe apuntar al subflujo que se ejecutará cuando se use a Carla:

- Haz clic en el **icono** junto a "Trigger workflow" (lápiz o rayo).
- Elige o crea el workflow/subflujo **Consultas - Carla**.
- Así, cuando Default Reply envíe al usuario a "Consultas - Carla", UChat asociará la conversación a Carla y ella responderá con la base de conocimiento.

En ese caso el subflujo "Consultas - Carla" puede estar vacío (solo Start → fin) o tener un único paso que indique “usar agente”; depende de cómo UChat lo muestre al configurar el Trigger workflow.

**Opción B – Si en el subflujo hay un paso tipo "AI Agent" o "Invoke AI"**  
Dentro del subflujo, al pulsar "Select Next Step" (o añadir paso):

- Si aparece **AI Agent** / **Send to AI** / **Invoke AI Agent**: añade ese paso y selecciona **Carla - Asistente Prendarios**.
- Si no aparece: revisa **Action** (a veces “Invoke AI Agent” está dentro de Action) o **Existing Steps** por un paso reutilizable que invoque al agente.
- Conectar: **Start** → ese paso (Carla) → fin.

4. Guardar el subflujo.

### 5.1b Inbound Webhook "Consultas - Carla" (cuando Meta apunta al CRM)

Si el webhook de **Meta** apunta al **CRM (Vercel)**, los mensajes no llegan a UChat por canal directo. El CRM reenvía las consultas llamando a un **Inbound Webhook** de UChat para que Carla responda. Hay que crear ese webhook y configurar la URL en Vercel.

1. En UChat → **Tools** → **Inbound Webhooks** → **New Inbound Webhook**.
2. **Nombre:** `Consultas - Carla (desde CRM)`.
3. **Values to Identify a User:** identificar por **phone** (campo `phone` en el JSON).
4. **Mapping:** mapear `first_name` al custom field de nombre; si UChat permite recibir el texto del mensaje del usuario, mapear `message` a un campo que el flujo/agente use como entrada (ej. custom field "last_message" o el que indique la UI para el mensaje a responder).
5. **Asociar** este webhook al Sub Flow **Consultas - Carla** (cuando reciba datos, ejecutar ese subflujo).
6. Guardar, activar y **copiar la URL** del webhook.
7. En **Vercel** (o `.env.local`): añadir  
   `UCHAT_INBOUND_WEBHOOK_CONSULTAS_CARLA_URL=https://...`  
   con esa URL.

El CRM envía un POST con `{ "phone": "...", "first_name": "...", "message": "texto del mensaje del usuario" }`. Solo se llama para mensajes de **texto** que **no** contienen "Solicitud de Crédito" y cuando el lead **ya tiene** la etiqueta lead-nuevo (para no duplicar con la bienvenida).

### 5.2 Disparar el subflujo con Default Reply (Keywords)

Si los mensajes **sí** llegan a UChat (webhook de Meta apunta a UChat), **cualquier mensaje que no coincida** con otra keyword (como "Solicitud de Crédito") se puede enviar a Carla así:

1. En el **Flow Builder** → **Automation** → **Keywords**.
2. Localizar la fila **"Default Reply"** (regla "fires Every Time").
3. Configurar:
   - **Active:** activar el interruptor (ON).
   - **Goto Sub Flow:** pulsar **Choose Sub Flow** y seleccionar **Consultas - Carla** (el subflujo que creaste).
4. Guardar.

Resultado del enrutado:

- Si el mensaje **contiene** "Solicitud de Crédito" → Keyword "Solicitud de Crédito" → Sub Flow **Solicitud de Crédito** (Add Tag + mensaje de confirmación).
- Cualquier **otro** mensaje (consultas, "hola", "¿cuánto demora?", etc.) → **Default Reply** → Sub Flow **Consultas - Carla** → Carla responde con la base de conocimiento.

### 5.3 Orden recomendado de Keywords

En la tabla de Keywords, el orden puede importar según UChat (primero reglas específicas, luego default):

1. **Solicitud de Crédito** – Rule: *If message contains* "Solicitud de Crédito" → Goto Sub Flow **Solicitud de Crédito**.
2. **Default Reply** – Rule: *fires Every Time* → Goto Sub Flow **Consultas - Carla**.

Así se evita que un mensaje con "Solicitud de Crédito" caiga en Default Reply.

### 5.4 Resumen visual

```
Usuario envía mensaje por WhatsApp
         │
         ▼
   ¿Contiene "Solicitud de Crédito"?
    │                    │
   SÍ                    NO
    │                    │
    ▼                    ▼
Sub Flow              Default Reply
Solicitud de Crédito  → Sub Flow "Consultas - Carla"
(Add Tag + mensaje)        │
                           ▼
                    AI Agent Step → Carla
                    (respuesta según base de conocimiento)
```

### 5.5 Publicar

Después de guardar el subflujo y la Default Reply, en el Flow Builder pulsar **Publish** para que la versión en borrador sea la activa.

---

## 6. Después de guardar (checklist)

1. [ ] Crear y guardar el AI Agent **Carla - Asistente Prendarios** (secciones 1–4).
2. [ ] Crear el Sub Flow **Consultas - Carla** y vincularlo a Carla: en **AI Agents** → Carla → **Trigger workflow** = **Consultas - Carla** (o añadir paso AI Agent dentro del subflujo si tu UI lo ofrece) (sección 5.1).
3. [ ] **Si Meta apunta al CRM:** crear Inbound Webhook "Consultas - Carla (desde CRM)", asociarlo al subflujo Consultas - Carla, y en **Vercel** configurar `UCHAT_INBOUND_WEBHOOK_CONSULTAS_CARLA_URL` con la URL del webhook (sección 5.1b).
4. [ ] Si los mensajes llegan a UChat: en **Keywords**, activar **Default Reply** y asignar **Goto Sub Flow** → **Consultas - Carla** (sección 5.2).
5. [ ] Verificar orden de Keywords: "Solicitud de Crédito" antes de Default Reply (sección 5.3).
6. [ ] **Publish** el flujo (sección 5.5).

---

*Documento de referencia para configuración en UChat. No modifica el código del CRM.*
