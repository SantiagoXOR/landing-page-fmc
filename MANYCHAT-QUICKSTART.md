# 🚀 Guía Rápida de Uso - Integración Manychat

## ✅ ¿Qué se ha Implementado?

Se ha completado la **integración híbrida completa** entre tu CRM y Manychat, incluyendo:

- 🔧 **Backend**: API completa, servicios, webhooks
- 🎨 **Frontend**: 12 componentes UI, 4 páginas, 3 hooks
- 📚 **Documentación**: 3 guías completas
- 🧪 **Testing**: Scripts de validación

---

## 🎯 Próximos Pasos para Usar Manychat

### 1️⃣ Configurar Manychat (Primera vez)

#### a) Crear cuenta en Manychat
1. Ve a [https://manychat.com](https://manychat.com)
2. Crea tu cuenta
3. Conecta tu número de WhatsApp Business

#### b) Obtener API Key
1. En Manychat, ve a **Settings** → **API**
2. Click en **"Generate your API Key"**
3. Copia la key (empieza con `MCAPIKey-`)

#### c) Configurar en el CRM
Edita tu archivo `.env.local`:

```env
MANYCHAT_API_KEY=MCAPIKey-tu-key-aqui
MANYCHAT_BASE_URL=https://api.manychat.com
MANYCHAT_WEBHOOK_SECRET=genera-un-secreto-seguro
```

Para generar el webhook secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### d) Aplicar migración de base de datos
```bash
npm run db:push
```

#### e) Configurar webhook en Manychat
1. En Manychat: **Settings** → **API** → **Webhooks**
2. Click **"Add Webhook"**
3. **Webhook URL**: `https://tu-dominio.com/api/whatsapp/webhook`
4. **Verify Token**: Tu `MANYCHAT_WEBHOOK_SECRET`
5. Seleccionar eventos:
   - ✅ new_subscriber
   - ✅ message_received
   - ✅ tag_added
   - ✅ tag_removed
   - ✅ custom_field_changed
6. Click **"Verify"** y **"Save"**

#### f) Verificar instalación
```bash
npm run manychat:test
```

**Documentación completa:** [docs/MANYCHAT-SETUP.md](docs/MANYCHAT-SETUP.md)

---

### 2️⃣ Crear Custom Fields en Manychat

Para que la sincronización funcione completamente, crea estos custom fields en Manychat:

**En Manychat: Settings → Custom Fields → + New Field**

| Nombre | Tipo | Descripción |
|--------|------|-------------|
| `dni` | Text | Documento de identidad |
| `ingresos` | Number | Ingresos mensuales |
| `zona` | Text | Zona geográfica |
| `producto` | Text | Producto de interés |
| `monto` | Number | Monto solicitado |
| `origen` | Text | Canal de origen |
| `estado` | Text | Estado del lead |
| `agencia` | Text | Agencia asignada |

---

### 3️⃣ Crear Tags Recomendados en Manychat

**En Manychat: Settings → Tags → + New Tag**

**Tags de Estado:**
- `lead-nuevo`
- `lead-calificado`
- `lead-contactado`
- `lead-interesado`
- `lead-no-interesado`

**Tags de Origen:**
- `origen-facebook`
- `origen-instagram`
- `origen-whatsapp`
- `origen-web`

**Tags de Producto:**
- `producto-prestamo-personal`
- `producto-prestamo-vehicular`
- `producto-tarjeta-credito`

**Tags de Engagement:**
- `bot-activo`
- `agente-requerido`
- `conversacion-cerrada`

---

### 4️⃣ Crear Flujo Básico en Manychat

**Flujo de Bienvenida Recomendado:**

1. En Manychat: **Automation** → **Flows** → **+ New Flow**
2. Nombra el flujo: "Bienvenida CRM"
3. **Trigger**: New Subscriber
4. **Acciones**:
   ```
   → Mensaje: "¡Hola! 👋 Bienvenido a [Tu Empresa]"
   → Pregunta: "¿En qué podemos ayudarte?"
      Botón 1: "Solicitar Préstamo" → Tag: "interesado-prestamo"
      Botón 2: "Solo Información" → Tag: "solo-info"
      Botón 3: "Hablar con Agente" → Tag: "agente-requerido"
   → Action: Add Tag "lead-nuevo"
   → Webhook: Notificar al CRM
   ```

---

## 🎨 Cómo Usar la UI

### Sincronizar un Lead con Manychat

**Opción 1: Desde Detalle de Lead**
1. Ve a **Leads** → Click en un lead
2. En el header verás el botón **"Sincronizar con Manychat"**
3. Click para sincronizar
4. Verás el badge verde **"Sincronizado con Manychat"**

**Opción 2: Desde Sidebar**
1. En el detalle del lead, en el sidebar derecho
2. Busca el card **"Sincronización Manychat"**
3. Click en **"Sincronizar ahora"**

### Gestionar Tags de un Lead

1. Ve al detalle de un lead
2. Click en el tab **"Tags"**
3. Click en **"Agregar tag"**
4. Busca y selecciona el tag
5. Para remover, click en la ✕ del tag

### Enviar Mensaje

1. Ve al detalle de un lead
2. Click en el tab **"Enviar"**
3. Selecciona tipo de mensaje (Texto, Imagen, Video, Archivo)
4. Escribe tu mensaje
5. Click **"Enviar mensaje"**
6. El mensaje se enviará vía Manychat automáticamente

### Ver Conversaciones

1. Ve a **Chats** en el sidebar
2. Selecciona una conversación
3. En el header verás:
   - Tags del contacto
   - Flujo activo (si el bot está respondiendo)
   - Botón "Tomar control" para pausar el bot
4. En el sidebar derecho verás:
   - Sección de Manychat con estado de sync
   - Manychat ID
   - Tags
   - Botón para sincronizar

### Crear un Broadcast

1. Ve a **Manychat** → **Broadcasts** en el sidebar
2. Click **"Nuevo Broadcast"**
3. Completa:
   - Nombre del broadcast
   - Mensaje
   - Destinatarios (por tags o leads específicos)
4. Click **"Preview"** para ver cómo se verá
5. Click **"Enviar Broadcast"**

### Ver Métricas

1. Ve a **Manychat** → **Dashboard**
2. Verás:
   - Total de subscribers
   - Leads sincronizados
   - Mensajes bot vs agente
   - Top flujos activos
   - Top tags utilizados

### Verificar Configuración

1. Ve a **Settings** → **Manychat** en el sidebar
2. Verás el estado de conexión
3. Tabs disponibles:
   - **General**: Estado de API Key
   - **Webhook**: Configuración de webhook
   - **Mapeo**: Campos CRM ↔ Manychat
   - **Docs**: Links a documentación

---

## 💡 Tips y Trucos

### Sincronización Inteligente
- ✅ Al enviar un mensaje, si el lead no está sincronizado, se sincroniza automáticamente
- ✅ Los webhooks mantienen la sincronización en tiempo real
- ✅ Puedes forzar sincronización manual cuando quieras

### Tags Estratégicos
- 🏷️ Usa tags para segmentar tus broadcasts
- 🏷️ Aplica tags automáticamente en flujos de Manychat
- 🏷️ Los tags se sincronizan bidireccional mente (CRM ↔ Manychat)

### Mensajes
- 💬 Los mensajes del bot se ven en fondo azul
- 👤 Los mensajes del agente se ven en fondo gris/morado
- 🤖 Badge "Mensaje de bot" aparece en mensajes automáticos

### Flujos
- 🔄 Cuando un contacto está en un flujo, verás "Bot activo" en el chat
- ⏸️ Puedes "Tomar control" para que el bot deje de responder
- 📊 Monitorea qué flujos generan más leads en /manychat/dashboard

---

## 🔍 Verificar que Todo Funciona

### Test 1: Sincronización
1. Ve a un lead que tenga teléfono
2. Click "Sincronizar ahora"
3. Debería aparecer el badge verde y el Manychat ID

### Test 2: Tags
1. En el mismo lead, ve al tab "Tags"
2. Agrega un tag
3. Ve a Manychat y verifica que el subscriber tenga ese tag

### Test 3: Mensaje
1. En el tab "Enviar"
2. Escribe un mensaje de prueba
3. Envía
4. Verifica en WhatsApp que llegó el mensaje

### Test 4: Webhook
1. Desde WhatsApp, envía un mensaje al número
2. Ve a **Chats** en el CRM
3. Deberías ver el mensaje registrado
4. El lead debería haberse creado/actualizado automáticamente

### Test 5: Health Check
1. Ve a **Settings** → **Manychat**
2. Verifica que el estado sea "Conectado" (verde)
3. Si no, revisa las variables de entorno

---

## 📚 Recursos

### Documentación del Proyecto
- [MANYCHAT-SETUP.md](docs/MANYCHAT-SETUP.md) - Setup completo
- [MANYCHAT-INTEGRATION.md](docs/MANYCHAT-INTEGRATION.md) - Documentación técnica
- [MANYCHAT-UI-FINAL-SUMMARY.md](MANYCHAT-UI-FINAL-SUMMARY.md) - Resumen UI
- [MANYCHAT-IMPLEMENTATION-SUMMARY.md](MANYCHAT-IMPLEMENTATION-SUMMARY.md) - Resumen backend

### Documentación Externa
- [Manychat API](https://api.manychat.com/)
- [Manychat Help Center](https://help.manychat.com/)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)

---

## 🆘 Soporte

### Si algo no funciona:

1. **Verifica variables de entorno** en `.env.local`
2. **Ejecuta el test**: `npm run manychat:test`
3. **Revisa logs** en la consola del navegador y del servidor
4. **Consulta Troubleshooting** en [MANYCHAT-SETUP.md](docs/MANYCHAT-SETUP.md)
5. **Verifica webhook** en Manychat Settings → API → Webhooks → View Logs

---

## 🎉 ¡Listo!

Tu CRM ahora tiene **integración completa con Manychat**. Puedes:

- ✅ Automatizar respuestas con flujos de Manychat
- ✅ Ver todas las conversaciones en el CRM
- ✅ Responder manualmente desde el CRM
- ✅ Gestionar tags visualmente
- ✅ Enviar broadcasts masivos
- ✅ Sincronizar datos automáticamente
- ✅ Monitorear métricas y estadísticas

**¡Disfruta de la integración híbrida más poderosa!** 🚀

