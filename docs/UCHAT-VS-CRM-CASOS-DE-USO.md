# Uchat vs CRM Phorencial – Casos de uso y reparto de servicios

Documento para decidir **qué hace Uchat** (flujos, bots, automatizaciones) y **qué hace el CRM** (pipeline, leads, historial, reportes) cuando se usan juntos.

---

## Resumen rápido

| Servicio | Rol principal |
|----------|----------------|
| **Uchat** | Conversación automática: flujos, bots, respuestas por palabras clave, recolección de datos por chat, recordatorios, envío por tags/segmentos. |
| **CRM Phorencial** | Fuente de verdad de leads y ventas: pipeline, etapas, CUIL/documentación, historial unificado, envío desde el CRM (por etapa/tag), reportes. |
| **Meta for Developers** | Conexión técnica con WhatsApp (número, token, webhook). El webhook puede apuntar a Uchat **o** al CRM según el modelo elegido. |

---

## Casos de uso y dónde encaja cada uno

### 1. Llegada del contacto por WhatsApp (primer mensaje)

- **Uchat:** Recibe el mensaje (si el webhook de Meta apunta a Uchat). Ejecuta el flujo de bienvenida, menú (“¿Qué necesitás?”), preguntas iniciales, recolección de nombre/teléfono si hace falta.
- **CRM:** No recibe el mensaje en tiempo real a menos que Uchat reenvíe eventos (webhook de Uchat → CRM). El lead se crea/actualiza cuando Uchat notifica “nuevo usuario” o “mensaje recibido” al CRM.

**Encaje:** Uchat = primera respuesta y flujo; CRM = crear/actualizar lead cuando Uchat le avise (o cuando el agente abra el chat en el CRM si el webhook va al CRM).

---

### 2. Respuestas automáticas por palabra clave (“crédito”, “precio”, “documentos”)

- **Uchat:** Ideal. Flujos del tipo “si dice X → enviar mensaje Y / enviar formulario / agregar tag”. Todo el armado visual de flujos y condiciones va en Uchat.
- **CRM:** No hace lógica de “si dice X entonces Y” en la conversación; eso es del bot. El CRM solo muestra el historial y puede enviar mensajes manuales o por reglas de negocio (ej. “al mover a etapa X, enviar template”).

**Encaje:** Uchat = toda la lógica de bots y respuestas automáticas por contenido del mensaje.

---

### 3. Recolección de datos por chat (nombre, DNI, CUIL, zona, etc.)

- **Uchat:** Puede hacer las preguntas paso a paso (flujo conversacional) y guardar en custom fields / campos de usuario. Opcional: enviar esos datos al CRM vía webhook o API cuando complete un paso o formulario.
- **CRM:** Almacena los datos en el lead (customFields, CUIL, etc.). Si Uchat envía un webhook “usuario completó datos”, el CRM actualiza el lead y puede mover etapa (ej. a “Listo para Análisis”).

**Encaje:** Uchat = preguntas y captura en conversación; CRM = verdad única del lead y movimiento de pipeline según datos recibidos.

---

### 4. Pipeline de ventas (etapas: Nuevo → Consultando → Documentación → Listo para Análisis → Preaprobado → Aprobado → Cerrado)

- **Uchat:** No maneja pipeline. Puede tener tags o segmentos que **reflejen** la etapa (ej. tag `solicitud-en-proceso` = “Listo para Análisis”) para que sus flujos reaccionen (ej. “si tiene tag X, enviar mensaje Y”).
- **CRM:** Dueño del pipeline. Drag & drop, reglas automáticas (ej. “si tiene CUIL completo → mover a Listo para Análisis”), reportes por etapa. Cuando el lead cambia de etapa, el CRM actualiza Uchat (tags o equivalente) para que los flujos de Uchat sigan alineados.

**Encaje:** CRM = pipeline y reglas de negocio; Uchat = reaccionar a tags/segmentos que el CRM le indica.

---

### 5. Agente responde desde el CRM (chat unificado)

- **Uchat:** Puede seguir recibiendo el mensaje del agente si el envío se hace por API de Uchat (igual que hoy con Manychat). Así el historial queda en Uchat y en CRM si el CRM envía vía Uchat.
- **CRM:** Muestra la conversación y envía el mensaje (por API de Uchat o por Meta). El agente trabaja desde el CRM; el backend decide si envía por Uchat o por Meta.

**Encaje:** CRM = interfaz del agente; Uchat o Meta = canal de envío según arquitectura.

---

### 6. Broadcasts / envíos masivos por etapa o por tag

- **Uchat:** Si tiene campañas por segmento/tag, puede ejecutar el envío. El CRM puede decir “estos leads (por etapa o filtro)” y pasar IDs o tags a Uchat, o el CRM envía directo por API de mensajes (Meta o Uchat).
- **CRM:** Define el segmento (etapa del pipeline, tag, filtro). Puede tener la pantalla de “enviar broadcast” y llamar a la API de Uchat (o Meta) para enviar.

**Encaje:** CRM = quién recibe (segmentación); Uchat (o Meta) = envío real del mensaje.

---

### 7. Recordatorios y seguimiento automático (“no respondió en 24 h”)

- **Uchat:** Muy adecuado. Flujos con esperas (delay), condiciones “sin respuesta en X horas” y mensajes de recordatorio. Todo sin código en el CRM.
- **CRM:** Puede tener tareas (“contactar en 24 h”) creadas por automatizaciones; el mensaje de recordatorio puede enviarse desde Uchat (flujo) o desde el CRM si hay integración.

**Encaje:** Uchat = lógica de “cuándo” y “qué mensaje”; CRM = tareas y recordatorios internos si se desea.

---

### 8. Formularios / “Solicitud de Crédito” por chat

- **Uchat:** Muestra el formulario en chat, usuario completa, Uchat guarda datos y puede enviar un webhook al CRM con el payload.
- **CRM:** Recibe el webhook, crea/actualiza lead, parsea campos (nombre, DNI, CUIL, etc.) y puede mover a “Listo para Análisis” o “Solicitando Documentación”.

**Encaje:** Uchat = presentación y captura; CRM = persistencia y siguiente paso en el pipeline.

---

### 9. Templates aprobados (fuera de ventana 24 h)

- **Uchat:** Puede tener plantillas configuradas y enviarlas desde flujos (ej. “recordatorio de documentación”, “crédito preaprobado”).
- **CRM:** Puede solicitar el envío de un template por API (Uchat o Meta) cuando el agente hace una acción (ej. “enviar template de preaprobado” al mover a esa etapa).

**Encaje:** Uchat = flujos que envían templates; CRM = disparar templates por acción de agente o por regla (si la API lo permite).

---

### 10. Reportes y dashboard (conversiones, etapas, tiempos)

- **Uchat:** Métricas de conversación (mensajes, flujos completados). No reemplaza el pipeline.
- **CRM:** Dashboard por etapas, tasas de conversión, tiempo en etapa, origen del lead. Fuente de verdad para ventas.

**Encaje:** CRM = reportes de ventas y pipeline; Uchat = métricas de uso del bot si se necesitan.

---

## Arquitectura recomendada (híbrida Uchat + CRM)

```
[WhatsApp] ←→ [Meta] ←→ webhook → [Uchat]
                                    │
                                    │ flujos, bots, tags, respuestas automáticas
                                    │ eventos (nuevo usuario, mensaje, tag) → webhook
                                    ▼
                              [CRM Phorencial]
                                    │
                                    │ leads, pipeline, historial, broadcasts (segmento),
                                    │ envía mensajes por API (Uchat o Meta)
                                    ▼
                              [Agentes / Reportes]
```

- **Meta:** Número conectado; webhook apuntando a **Uchat** para que Uchat reciba todos los mensajes y ejecute flujos.
- **Uchat:** Recibe mensajes, corre flujos, aplica tags, opcionalmente notifica al CRM (webhook o Partner API) para crear/actualizar lead y conversación.
- **CRM:** Recibe eventos de Uchat (o, si se implementa, también webhook de Meta en paralelo). Mantiene lead y pipeline; al cambiar etapa, actualiza tags en Uchat; envía mensajes vía API de Uchat (o Meta) cuando el agente escribe o cuando se hace un broadcast.

---

## Tabla resumen: quién hace qué

| Caso de uso | Uchat | CRM Phorencial | Meta Dev |
|-------------|--------|-----------------|----------|
| Primer mensaje / bienvenida | ✅ Flujo de bienvenida | Crear lead cuando Uchat avise | Conexión y webhook |
| Respuestas por palabra clave | ✅ Flujos y condiciones | — | — |
| Recolectar datos por chat | ✅ Preguntas y custom fields | ✅ Guardar en lead, mover etapa | — |
| Pipeline (etapas, drag & drop) | Tags para segmentar | ✅ Dueño del pipeline | — |
| Chat del agente (inbox) | Opcional envío por API | ✅ Interfaz y historial | Envío si se usa API Meta |
| Broadcasts por etapa/tag | ✅ Envío (si tiene API) | ✅ Definir segmento, disparar | Envío si se usa API Meta |
| Recordatorios / “no respondió” | ✅ Delays y flujos | Tareas opcionales | — |
| Formulario “Solicitud de Crédito” | ✅ Mostrar y capturar | ✅ Recibir webhook, lead, pipeline | — |
| Templates fuera de 24 h | ✅ Desde flujos | Disparar por acción/regla | Envío si se usa API Meta |
| Reportes y dashboard | Métricas de bot | ✅ Ventas y pipeline | — |

---

## Siguientes pasos técnicos

1. **Webhook de Meta** → Uchat (para que los flujos y bots funcionen).
2. **Webhook o API de Uchat** → CRM (eventos: nuevo usuario, mensaje, tag/custom field) para crear/actualizar lead y conversación.
3. **API de Uchat** (o Meta) desde el CRM para: enviar mensaje del agente, actualizar tags al cambiar etapa, enviar broadcasts.
4. **Adaptar el código** que hoy usa Manychat (webhooks, sync de tags, envío de mensajes) a los endpoints y formato de Uchat.

Si querés, el siguiente paso puede ser un diagrama de secuencia “mensaje entrante → Uchat → CRM” y una lista de endpoints de Uchat a usar (webhook entrante, API de envío, API de tags).
