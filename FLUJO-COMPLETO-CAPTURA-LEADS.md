# 🔄 Flujo Completo de Captura de Leads

## Descripción General

Tu CRM ahora captura leads desde **múltiples canales** y los procesa de forma unificada:

1. **Landing Page de FMC** (con Pixel de Facebook/Google)
2. **WhatsApp vía Manychat** (flujos automáticos)
3. **Formulario Manual** (agentes)
4. **Otras fuentes** (Instagram, Facebook, Comentarios)

---

## 🎯 Flujo de Entrada por Canal

### Canal 1: Landing Page de FMC con Pixel

```
Usuario visita landing page
        ↓
Pixel de tracking captura datos
(Facebook Pixel / Google Analytics)
        ↓
Usuario completa formulario
        ↓
POST /api/leads
{
  nombre: "Juan Pérez",
  telefono: "+543704123456",
  email: "juan@email.com",
  producto: "Préstamo Personal",
  origen: "web",
  utmSource: "facebook_ads_campaign_123"
}
        ↓
Lead creado en CRM
        ↓
[AUTOMÁTICO] Pipeline creado
        ↓
[AUTOMÁTICO] Sincronización a Manychat
        ↓
[MANYCHAT] Flujo automático "Lead desde Web"
        ↓
Usuario recibe WhatsApp de bienvenida
```

**Datos capturados del Pixel:**
- `utmSource` - Campaña de marketing
- `origen` - Siempre "web"
- Información de tracking para analytics

**Procesamiento en CRM:**
1. Lead creado con estado `NUEVO`
2. Pipeline automático creado
3. Si tiene teléfono → Sincroniza con Manychat
4. Manychat envía mensaje de bienvenida
5. Tag "origen-web" aplicado automáticamente

---

### Canal 2: WhatsApp con Manychat

```
Usuario envía mensaje a WhatsApp Business
        ↓
Manychat recibe mensaje
        ↓
[MANYCHAT] Flujo "Bienvenida" se activa
        ↓
Bot pregunta: nombre, teléfono, producto, etc.
        ↓
Bot califica lead (ingresos, zona, etc.)
        ↓
Webhook a CRM: new_subscriber
POST /api/whatsapp/webhook
{
  type: "new_subscriber",
  data: {
    subscriber: {
      id: 12345,
      phone: "+543704123456",
      first_name: "Juan",
      last_name: "Pérez",
      custom_fields: {
        producto: "Préstamo Personal",
        ingresos: 50000,
        zona: "Formosa Capital"
      },
      tags: ["lead-nuevo", "interesado-prestamo"]
    }
  }
}
        ↓
CRM crea Lead automáticamente
        ↓
Lead con estado NUEVO + tags de Manychat
        ↓
Pipeline creado automáticamente
        ↓
Conversación creada en /chats
```

**Procesamiento en CRM:**
1. Webhook recibido
2. Lead creado/actualizado desde subscriber
3. Tags sincronizados
4. Custom fields sincronizados
5. Conversación visible en /chats
6. Si bot califica → Tag "lead-calificado"
7. Si requiere agente → Tag "agente-requerido"

---

### Canal 3: Entrada Manual (Agentes)

```
Agente en /leads/new
        ↓
Completa formulario
        ↓
POST /api/leads
        ↓
Lead creado en CRM
        ↓
Pipeline creado
        ↓
[OPCIONAL] Sincronizar a Manychat
        ↓
Agente puede enviar WhatsApp inmediatamente
```

---

## 🔀 Diagrama de Flujo Unificado

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUENTES DE ENTRADA                            │
└─────────────────────────────────────────────────────────────────┘
         │              │              │
    Landing Page    WhatsApp      Formulario Manual
    (con Pixel)    (Manychat)       (Agentes)
         │              │              │
         ↓              ↓              ↓
    ┌────────────────────────────────────────┐
    │        POST /api/leads                  │
    │           (crear lead)                  │
    └────────────────────────────────────────┘
                     ↓
         ┌──────────────────────┐
         │   Lead en CRM        │
         │   Estado: NUEVO      │
         └──────────────────────┘
                     ↓
         ┌──────────────────────┐
         │ Pipeline automático   │
         │    (tracking)         │
         └──────────────────────┘
                     ↓
    ┌────────────────────────────────────────┐
    │  ¿Tiene teléfono?                      │
    └────────────────────────────────────────┘
              Sí  │           │ No
                  ↓           ↓
       ┌──────────────┐   Solo en CRM
       │ Sincronizar  │   (hasta agregar
       │  a Manychat  │    teléfono)
       └──────────────┘
              ↓
    ┌──────────────────────┐
    │ Subscriber creado     │
    │ en Manychat           │
    └──────────────────────┘
              ↓
    ┌──────────────────────┐
    │ Flujo automático      │
    │ "Lead CRM" activado   │
    └──────────────────────┘
              ↓
    Mensaje de WhatsApp enviado
              ↓
    Usuario responde
              ↓
    Webhook: message_received
              ↓
    ┌──────────────────────┐
    │ Conversación en CRM   │
    │ visible en /chats     │
    └──────────────────────┘
              ↓
    Agente puede ver y responder
```

---

## 📋 Flujo Detallado por Escenario

### Escenario A: Lead desde Landing Page + WhatsApp

```
1. Usuario ve anuncio en Facebook
   → Click → Landing de FMC
   
2. Pixel captura visita
   → utmSource = "facebook_ads_campaign_oct_2025"
   
3. Usuario completa formulario:
   - Nombre: María González
   - Teléfono: +543704987654
   - Email: maria@email.com
   - Producto: Préstamo Personal
   - Monto: $50,000
   
4. Submit → POST /api/leads
   
5. CRM crea Lead:
   {
     nombre: "María González",
     telefono: "+543704987654",
     email: "maria@email.com",
     producto: "Préstamo Personal",
     monto: 50000,
     origen: "web",
     utmSource: "facebook_ads_campaign_oct_2025",
     estado: "NUEVO"
   }
   
6. Pipeline automático creado (tracking)
   
7. Sincronización automática a Manychat:
   → Subscriber creado en Manychat
   → manychatId: "67890"
   → Tags aplicados: ["origen-web", "lead-nuevo"]
   
8. Manychat activa flujo "Lead desde Web":
   → WhatsApp: "¡Hola María! 👋 Recibimos tu solicitud..."
   → Pregunta: "¿Confirmas que tus ingresos son de $50,000/mes?"
   → Usuario responde: "Sí, correcto"
   → Bot: "Perfecto, ¿en qué zona vives?"
   → Usuario: "Formosa Capital"
   → Bot guarda en custom_field: zona = "Formosa Capital"
   → Webhook actualiza CRM
   
9. CRM actualizado automáticamente:
   → zona: "Formosa Capital" (vía webhook)
   → Tags actualizados en tiempo real
   
10. Bot califica lead:
    → Si cumple criterios → Tag "lead-calificado"
    → Si NO cumple → Tag "lead-no-calificado"
    
11. Bot transfiere a agente:
    → "Te conectamos con un asesor..."
    → Tag "agente-requerido" aplicado
    
12. Webhook: tag_added (agente-requerido)
    → CRM actualiza tags
    → Conversación visible en /chats
    → Notificación a agentes disponibles
    
13. Agente ve en CRM:
    → Lead completo con toda la info
    → Conversación activa
    → Tags: "origen-web", "lead-calificado", "agente-requerido"
    → Custom fields: zona, ingresos, producto
    → Historial completo del bot
    
14. Agente responde desde CRM:
    → Escribe: "Hola María, soy Carlos..."
    → Click "Enviar"
    → WhatsAppService detecta Manychat configurado
    → Mensaje enviado vía API de Manychat
    → María lo recibe en WhatsApp
    → Conversación continúa...
```

---

### Escenario B: Lead desde WhatsApp Directo

```
1. Usuario guarda número de FMC
   → Envía: "Hola, info de préstamos"
   
2. Manychat recibe mensaje
   → Usuario no existe → new_subscriber
   
3. Webhook a CRM: new_subscriber
   
4. CRM crea Lead automáticamente:
   {
     nombre: "Usuario WhatsApp" (temporal),
     telefono: "+543704555666",
     origen: "whatsapp",
     estado: "NUEVO",
     manychatId: "11111"
   }
   
5. Manychat flujo "Bienvenida":
   → "¡Hola! 👋 ¿Cuál es tu nombre?"
   → Usuario: "Pedro Gómez"
   → Webhook actualiza nombre en CRM
   → Bot pregunta más datos...
   
6. Datos capturados por bot:
   → nombre → CRM actualizado
   → ingresos → Custom field → Webhook → CRM
   → zona → Custom field → Webhook → CRM
   → Tags aplicados → Webhook → CRM
   
7. Todo visible en CRM en tiempo real
   
8. Agente puede tomar control cuando necesite
```

---

### Escenario C: Múltiples Touchpoints

```
DÍA 1:
Usuario ve anuncio Facebook
→ Click → Landing
→ Completa formulario básico (nombre, teléfono)
→ Lead creado en CRM (origen: "web")
→ Sincronizado a Manychat
→ WhatsApp de bienvenida enviado

DÍA 2:
Usuario responde WhatsApp
→ Bot califica (pregunta ingresos, zona)
→ Custom fields actualizados en CRM vía webhook
→ Tag "lead-calificado" aplicado
→ Visible en CRM inmediatamente

DÍA 3:
Agente revisa leads calificados
→ Ve lead completo con:
  - Datos del formulario web
  - Datos capturados por bot
  - UTM source (campaña original)
  - Tags de Manychat
  - Historial de conversación
→ Agente llama o escribe desde CRM
→ Continúa proceso de venta
```

---

## 🔍 ¿Cómo Funciona en el CRM?

### Vista para Agentes

#### En `/leads` (Lista de Leads)

```
┌─────────────────────────────────────────────────┐
│ Lead                  Tags          Origen      │
├─────────────────────────────────────────────────┤
│ María González        [lead-calificado]  web    │
│ +543704987654         [agente-requerido]   ✓MC  │
│ Formosa Capital       [origen-web]              │
│ Préstamo Personal     Hace 2 horas              │
├─────────────────────────────────────────────────┤
│ Pedro Gómez           [lead-nuevo]     whatsapp │
│ +543704555666         [bot-activo] 🤖     ✓MC   │
│ (Bot calificando...)  Hace 30 min               │
└─────────────────────────────────────────────────┘
```

**Información visible:**
- ✓MC = Sincronizado con Manychat
- Tags de Manychat (máx 3 visibles)
- Origen del lead
- Estado del flujo de bot

#### En `/leads/[id]` (Detalle de Lead)

```
┌─────────────────────────────────────────────────┐
│ María González         [NUEVO] [✓ Sincronizado] │
│ [origen-web] [lead-calificado] [agente-requerido]
├─────────────────────────────────────────────────┤
│ Tabs: [Datos] [Enviar] [Tags] [Historial]      │
├─────────────────────────────────────────────────┤
│ Información Personal:                           │
│ - Teléfono: +543704987654                       │
│ - Email: maria@email.com                        │
│ - Zona: Formosa Capital (capturado por bot)     │
│ - Ingresos: $50,000 (capturado por bot)         │
│                                                  │
│ Información Comercial:                          │
│ - Producto: Préstamo Personal (desde web)       │
│ - Monto: $50,000                                │
│ - Origen: web                                   │
│ - UTM: facebook_ads_campaign_oct_2025           │
│                                                  │
│ [Panel de Sincronización]                       │
│ ✓ Sincronizado con Manychat                     │
│ Manychat ID: 67890                              │
│ Última sync: hace 2 horas                       │
│ [Sincronizar ahora]                             │
└─────────────────────────────────────────────────┘

Sidebar:
┌─────────────────────────┐
│ [Tab: Enviar]           │
│ Enviar WhatsApp         │
│ Tipo: [Texto ▼]         │
│ Mensaje: [________]     │
│ [Enviar vía Manychat]   │
├─────────────────────────┤
│ [Tab: Tags]             │
│ Tags actuales:          │
│ [origen-web]            │
│ [lead-calificado]       │
│ [agente-requerido]      │
│ + Agregar tag           │
└─────────────────────────┘
```

#### En `/chats` (Conversaciones)

```
┌──────────────────────────────────────────────────────────┐
│ Lista          │ Chat             │ Sidebar Info          │
├──────────────────────────────────────────────────────────┤
│ [🟢] María G.  │ María González   │ 📱 Manychat          │
│ hace 5 min     │ +543704987654    │ ✓ Sincronizado       │
│ WhatsApp       │ [origen-web]     │ ID: 67890            │
│                │ [lead-calificado]│                       │
│ [🟡] Pedro G.  │                  │ 🤖 Flujo activo:     │
│ hace 30 min    │ ──────────────── │ "Bienvenida CRM"     │
│ WhatsApp       │                  │ [Tomar control]      │
│ 🤖 Bot activo  │ [BOT 10:30]      │                       │
│                │ ¿Confirmas tus   │ 🏷️ Tags:             │
│                │ ingresos?        │ [origen-web]         │
│                │                  │ [lead-calificado]    │
│                │ [AGENTE 10:32]   │ [agente-requerido]   │
│                │ Hola María...    │                       │
│                │                  │ [Sincronizar] [Ver]  │
│                │ [USUARIO 10:33]  │                       │
│                │ Gracias...       │ ────────────────     │
│                │                  │ Información:         │
│                │ [____________]   │ Teléfono: +543...    │
│                │ [Enviar 📤]      │ Email: maria@...     │
└──────────────────────────────────────────────────────────┘
```

**Diferenciación visual:**
- Mensajes de BOT: Fondo azul claro + badge "🤖 Mensaje de bot"
- Mensajes de AGENTE: Fondo morado + sin badge
- Mensajes de USUARIO: Fondo gris

---

## 🎯 Procesamiento Interno en el CRM

### Cuando entra un Lead (cualquier canal)

```javascript
// 1. Crear Lead
const lead = await createLead({
  nombre, telefono, email,
  origen, // 'web', 'whatsapp', 'manual', etc.
  utmSource, // si viene de landing
  estado: 'NUEVO'
})

// 2. Crear Pipeline automáticamente
await pipelineService.createLeadPipeline(lead.id, userId)

// 3. Si tiene teléfono → Sincronizar a Manychat
if (lead.telefono && isManychatConfigured) {
  await ManychatSyncService.syncLeadToManychat(lead.id)
  // Esto crea subscriber en Manychat
  // Aplica tags automáticos según origen
}

// 4. Si es desde WhatsApp → Ya viene con manychatId
if (origen === 'whatsapp') {
  // Lead ya tiene manychatId del webhook
  // Tags ya aplicados por el bot
  // Custom fields ya sincronizados
}

// 5. Lead visible inmediatamente en:
// - /leads (lista)
// - /leads/[id] (detalle)
// - /chats (si hay conversación)
// - /pipeline (en etapa correspondiente)
```

### Sincronización Continua

```
┌────────────────────┐      ┌─────────────────────┐
│       CRM          │ ←──→ │     Manychat        │
└────────────────────┘      └─────────────────────┘
         ↓                            ↓
    Agente actualiza              Bot actualiza
    campo en CRM                  custom field
         ↓                            ↓
    Sincroniza →                 Webhook →
         ↓                            ↓
    Manychat                        CRM
    actualizado                  actualizado
```

**Eventos sincronizados:**

**CRM → Manychat:**
- Cambio en nombre, email, teléfono
- Actualización de custom fields
- Estado del lead actualizado
- Tags aplicados manualmente

**Manychat → CRM:**
- new_subscriber (nuevo contacto)
- message_received (nuevo mensaje)
- tag_added (tag aplicado por bot/flujo)
- tag_removed (tag removido)
- custom_field_changed (campo actualizado por bot)

---

## 🎬 Flujos Recomendados en Manychat

### Flujo 1: "Lead desde Web"
**Trigger:** Tag "origen-web" aplicado

```
Usuario llega desde landing
        ↓
Tag "origen-web" aplicado por CRM
        ↓
Manychat detecta tag
        ↓
Flujo activado automáticamente
        ↓
WhatsApp: "¡Hola! Recibimos tu solicitud desde nuestra web"
        ↓
WhatsApp: "Veo que te interesa [producto]. Te confirmo algunos datos..."
        ↓
Validar datos capturados
        ↓
Agregar tag "datos-validados"
        ↓
Agregar tag "agente-requerido"
        ↓
"Un asesor te contactará pronto"
```

### Flujo 2: "Lead desde WhatsApp Directo"
**Trigger:** new_subscriber (sin tags previos)

```
Usuario envía primer mensaje
        ↓
"¡Hola! 👋 Bienvenido a FMC"
        ↓
"¿Cuál es tu nombre completo?"
→ Guardar en first_name, last_name
        ↓
"¿Qué producto te interesa?"
  [Préstamo Personal]
  [Préstamo Vehicular]
  [Tarjeta de Crédito]
→ Guardar en custom_field: producto
        ↓
"¿Cuáles son tus ingresos mensuales?"
→ Guardar en custom_field: ingresos
→ Validar monto mínimo
        ↓
Si ingresos >= mínimo:
  → Tag "lead-calificado"
  → "Perfecto, cumples los requisitos"
Si ingresos < mínimo:
  → Tag "lead-no-calificado"
  → "Lamentablemente no cumples..."
        ↓
"¿En qué zona vives?"
→ Guardar en custom_field: zona
        ↓
Webhook crea/actualiza lead en CRM
        ↓
Tag "agente-requerido"
        ↓
"Te conectamos con un agente..."
```

### Flujo 3: "Recordatorio Documentación"
**Trigger:** Tag "doc-pendiente" + 24 horas

```
Lead con estado DOC_PENDIENTE
        ↓
24 horas después
        ↓
Flujo activado automáticamente
        ↓
WhatsApp: "Hola [nombre], recordamos que..."
        ↓
"¿Ya tienes tu documentación lista?"
  [Sí, tengo todo]
  [Necesito más tiempo]
  [Tengo dudas]
        ↓
Si "Sí, tengo todo":
  → Tag "documentacion-lista"
  → Webhook actualiza CRM
  → Agente notificado
```

---

## 📊 Vista Unificada en el CRM

### Dashboard Principal (`/dashboard`)

```
┌──────────────────────────────────────────────┐
│ Métricas Generales                           │
├──────────────────────────────────────────────┤
│ [150] Total Leads    [45] Desde Web          │
│ [80] Preaprobados    [72] Desde WhatsApp     │
│ [25] En Revisión     [33] Otros canales      │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Conversiones por Canal                       │
├──────────────────────────────────────────────┤
│ Web (Landing + Pixel):    30% → Aprobados    │
│ WhatsApp (Manychat):      45% → Aprobados    │
│ Instagram:                20% → Aprobados    │
│ Manual:                   50% → Aprobados    │
└──────────────────────────────────────────────┘
```

### Dashboard de Manychat (`/manychat/dashboard`)

```
┌──────────────────────────────────────────────┐
│ 🤖 Métricas de Manychat                      │
├──────────────────────────────────────────────┤
│ [120] Subscribers    [280] Mensajes Bot      │
│ [95] Sincronizados   [145] Mensajes Agente   │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Top Flujos Activos                           │
├──────────────────────────────────────────────┤
│ 1. Bienvenida CRM          45 leads          │
│ 2. Lead desde Web          32 leads          │
│ 3. Recordatorio Docs       18 leads          │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Top Tags                                     │
├──────────────────────────────────────────────┤
│ [lead-calificado]          67 leads          │
│ [origen-web]               45 leads          │
│ [agente-requerido]         38 leads          │
│ [producto-prestamo]        52 leads          │
└──────────────────────────────────────────────┘
```

---

## 🔐 Ventajas del Sistema Unificado

### 1. Trazabilidad Completa
- ✅ Sabes de dónde vino cada lead (utmSource)
- ✅ Sabes qué campaña funcionó mejor
- ✅ Historial completo de interacciones
- ✅ Timeline unificada

### 2. Calificación Automática
- ✅ Bot califica 24/7
- ✅ Solo leads calificados llegan a agentes
- ✅ Agentes se enfocan en cerrar ventas
- ✅ Proceso más eficiente

### 3. Datos Enriquecidos
- ✅ Formulario web: datos básicos
- ✅ Bot de Manychat: datos adicionales
- ✅ Agente: notas y seguimiento
- ✅ Todo en un solo lugar

### 4. Multi-Canal Unificado
- ✅ Un solo CRM para todo
- ✅ Vista 360° del cliente
- ✅ No se pierden leads
- ✅ Sincronización automática

---

## 🎓 Ejemplo Real Paso a Paso

### Campaña: "Préstamos Octubre 2025"

**Configuración:**
1. **Facebook Ads** → Landing de FMC
2. **Pixel instalado** en landing
3. **UTM configurado**: `utm_source=facebook_ads_oct_2025`
4. **Manychat** conectado al número de WhatsApp
5. **Flujos configurados** en Manychat
6. **Tags preparados** en Manychat

**Día del lanzamiento:**

**10:00 AM** - Usuario ve anuncio en Facebook
- Click → Landing page
- Pixel captura: visita, fuente, campaña

**10:02 AM** - Usuario completa formulario
- Nombre: Ana Martínez
- Teléfono: +543704111222
- Email: ana@email.com
- Producto: Préstamo Personal
- Submit

**10:02:05 AM** - Backend procesa
```javascript
POST /api/leads
{
  nombre: "Ana Martínez",
  telefono: "+543704111222",
  email: "ana@email.com",
  producto: "Préstamo Personal",
  origen: "web",
  utmSource: "facebook_ads_oct_2025"
}
→ Lead creado: ID = abc123
→ Pipeline creado
→ Sincronización a Manychat iniciada
```

**10:02:10 AM** - Manychat procesa
```javascript
// Subscriber creado en Manychat
subscriber_id: 99888
phone: "+543704111222"
custom_fields: {
  producto: "Préstamo Personal",
  origen: "web",
  utm: "facebook_ads_oct_2025"
}
tags: ["origen-web", "lead-nuevo"]

→ Flujo "Lead desde Web" activado
```

**10:02:15 AM** - Ana recibe WhatsApp
```
FMC: ¡Hola Ana! 👋 Recibimos tu solicitud de Préstamo Personal

FMC: Para ayudarte mejor, confirmemos algunos datos. ¿Cuáles son tus ingresos mensuales aproximados?
```

**10:05 AM** - Ana responde
```
Ana: $60,000 por mes

→ Manychat guarda en custom_field: ingresos = 60000
→ Webhook a CRM
→ CRM actualiza lead.ingresos = 60000
```

**10:05:05 AM** - Bot califica
```
Manychat: Perfecto Ana, cumples los requisitos ✓

→ Tag "lead-calificado" aplicado
→ Webhook a CRM
→ CRM ve tag "lead-calificado"

Manychat: ¿En qué zona de Formosa vives?
```

**10:07 AM** - Ana responde
```
Ana: Formosa Capital

→ custom_field: zona = "Formosa Capital"
→ Webhook a CRM
→ CRM actualiza lead.zona

Manychat: Excelente. Te conectamos con un asesor experto en tu zona.

→ Tag "agente-requerido" aplicado
→ Webhook a CRM
```

**10:07:10 AM** - En el CRM

**Vista del Agente Carlos:**
```
🔔 Nueva conversación requiere atención

Lead: Ana Martínez
Origen: Web (Facebook Ads Oct 2025)
Producto: Préstamo Personal
Ingresos: $60,000
Zona: Formosa Capital
Tags: [lead-calificado] [agente-requerido] [origen-web]
Estado: NUEVO
```

**10:08 AM** - Agente Carlos responde
```
Carlos en CRM:
Tab "Enviar" → Escribe mensaje
"Hola Ana, soy Carlos de FMC. Vi que te interesa un préstamo personal..."
→ Click "Enviar"
→ WhatsAppService usa Manychat API
→ Mensaje enviado a Ana vía Manychat
```

**10:09 AM** - Ana recibe y responde
```
Ana recibe en WhatsApp: "Hola Ana, soy Carlos..."
Ana: "Sí, quisiera saber las tasas..."

→ Webhook: message_received
→ CRM registra mensaje
→ Carlos ve mensaje en /chats en tiempo real
```

**Conversación continúa...**
- Carlos responde desde CRM
- Ana recibe en WhatsApp
- Todo se registra en CRM
- Historial completo disponible

---

## 📈 Reportes y Analytics

### Por Canal de Origen

```sql
SELECT 
  origen,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN estado = 'PREAPROBADO' THEN 1 END) as aprobados,
  AVG(monto) as monto_promedio
FROM Lead
WHERE createdAt >= '2025-10-01'
GROUP BY origen
```

**Resultado:**
| Origen | Total | Aprobados | Conv % | Monto Avg |
|--------|-------|-----------|--------|-----------|
| web | 45 | 18 | 40% | $52,000 |
| whatsapp | 72 | 35 | 49% | $48,000 |
| instagram | 23 | 8 | 35% | $45,000 |

### Por Campaña (UTM)

```sql
SELECT 
  utmSource,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN tags LIKE '%lead-calificado%' THEN 1 END) as calificados
FROM Lead
WHERE origen = 'web'
GROUP BY utmSource
ORDER BY total_leads DESC
```

**Resultado:**
| Campaña | Leads | Calificados | % |
|---------|-------|-------------|---|
| facebook_ads_oct_2025 | 28 | 22 | 79% |
| google_ads_prestamos | 17 | 10 | 59% |

---

## 🎯 Resumen del Flujo Completo

**Para ti como administrador:**

1. **Landing Page (FMC)** captura leads con datos básicos + UTM
2. **Manychat** enriquece leads con calificación automática
3. **CRM** unifica todo y permite a agentes gestionar
4. **Sincronización bidireccional** mantiene todo actualizado
5. **Reportes** muestran qué canal/campaña funciona mejor

**Para los agentes:**
- Ven todos los leads en un solo lugar
- Tienen contexto completo (origen, UTM, conversaciones)
- Pueden responder desde el CRM
- Ven qué respondió el bot
- Pueden tomar control cuando necesario

**Para los clientes:**
- Respuesta inmediata 24/7 (bot)
- Experiencia unificada
- Transición suave bot → agente
- Todo por WhatsApp (canal preferido)

---

## 📝 Siguiente Paso para Ti

**Para que todo funcione necesitas:**

1. ✅ **Código del CRM** - YA IMPLEMENTADO
2. ⏳ **Configurar Manychat** - Siguiente paso
3. ⏳ **Crear flujos en Manychat** - Usar ejemplos de arriba
4. ⏳ **Configurar pixel en landing** - Si aún no lo tienes
5. ⏳ **Probar el flujo completo** - End-to-end

**¿Quieres que te ayude a:**
- a) Crear un documento con los flujos específicos para Manychat
- b) Configurar el pixel de Facebook en tu landing
- c) Crear un endpoint público para captura de leads desde landing (sin auth)
- d) Todo lo anterior

---

**Fecha:** 22 de Octubre, 2025  
**Estado:** Arquitectura Definida ✅  
**Implementación:** Backend + Frontend Completos ✅  
**Configuración:** Pendiente de usuario ⏳

