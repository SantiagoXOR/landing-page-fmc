# Integración con n8n (Alternativa a Activepieces)

Si prefieres usar n8n en lugar de Activepieces Cloud, esta guía te ayudará a configurar los mismos flujos.

## Configuración de n8n

### Deployment de n8n

Puedes usar n8n en:
- **Railway**: [railway.app](https://railway.app) (free tier disponible)
- **Render**: [render.com](https://render.com) (free tier disponible)
- **Fly.io**: [fly.io](https://fly.io) (free tier disponible)
- **Docker local**: Para desarrollo

### Variables de Entorno en n8n

Configura estas variables en tu instancia de n8n:

```env
CRM_BASE_URL=https://tu-app.vercel.app
WEBHOOK_TOKEN=super-seguro
WHATSAPP_TOKEN=tu-token-de-whatsapp
```

## Workflow 1: Ingreso de Leads desde WhatsApp

### Nodos del Workflow

#### 1. Webhook Trigger
- **Webhook URL**: `https://tu-n8n.railway.app/webhook/whatsapp-leads`
- **HTTP Method**: POST
- **Authentication**: None (usaremos validación manual)

#### 2. Function Node: Validar y Normalizar
```javascript
// Validar token de seguridad (opcional)
const authHeader = $node["Webhook"].json["headers"]["authorization"];
const expectedToken = `Bearer ${$env.WEBHOOK_TOKEN}`;

if (authHeader !== expectedToken) {
  throw new Error('Unauthorized webhook');
}

// Extraer datos del webhook de WhatsApp
const body = $node["Webhook"].json["body"];
const message = body.messages?.[0];
const contact = body.contacts?.[0];

if (!message || !contact) {
  return []; // Skip execution
}

return [{
  json: {
    telefono: contact.wa_id,
    nombre: contact.profile?.name || `Lead WhatsApp ${contact.wa_id}`,
    messageType: message.type,
    messageText: message.text?.body,
    timestamp: message.timestamp,
    messageId: message.id,
    origen: 'whatsapp'
  }
}];
```

#### 3. HTTP Request: Crear/Actualizar Lead
- **Method**: POST
- **URL**: `{{$env.CRM_BASE_URL}}/api/leads`
- **Headers**:
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer {{$env.WEBHOOK_TOKEN}}"
  }
  ```
- **Body**:
  ```json
  {
    "nombre": "{{$node[\"Function\"].json[\"nombre\"]}}",
    "telefono": "{{$node[\"Function\"].json[\"telefono\"]}}",
    "origen": "{{$node[\"Function\"].json[\"origen\"]}}"
  }
  ```

#### 4. HTTP Request: Registrar Evento
- **Method**: POST
- **URL**: `{{$env.CRM_BASE_URL}}/api/events/whatsapp`
- **Headers**:
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer {{$env.WEBHOOK_TOKEN}}"
  }
  ```
- **Body**:
  ```json
  {
    "telefono": "{{$node[\"Function\"].json[\"telefono\"]}}",
    "type": "{{$node[\"Function\"].json[\"messageType\"]}}",
    "messageId": "{{$node[\"Function\"].json[\"messageId\"]}}",
    "timestamp": "{{$node[\"Function\"].json[\"timestamp\"]}}",
    "payload": {
      "text": "{{$node[\"Function\"].json[\"messageText\"]}}",
      "from": "{{$node[\"Function\"].json[\"telefono\"]}}"
    }
  }
  ```

#### 5. IF Node: Verificar si necesita respuesta automática
- **Condition**: `{{$node["HTTP Request"].json["isUpdate"]}} === false`

#### 6. HTTP Request: Enviar Auto-respuesta (Rama True del IF)
- **Method**: POST
- **URL**: Tu endpoint de WhatsApp Business API
- **Body**: Mensaje de bienvenida

## Workflow 2: Reporte Semanal

### Nodos del Workflow

#### 1. Cron Trigger
- **Cron Expression**: `0 9 * * 1` (Lunes 9:00 AM)
- **Timezone**: America/Argentina/Buenos_Aires

#### 2. Function Node: Calcular Fechas
```javascript
const now = new Date();
const monday = new Date(now);
monday.setDate(now.getDate() - now.getDay() + 1 - 7); // Lunes pasado
monday.setHours(0, 0, 0, 0);

const sunday = new Date(monday);
sunday.setDate(monday.getDate() + 6);
sunday.setHours(23, 59, 59, 999);

return [{
  json: {
    from: monday.toISOString(),
    to: sunday.toISOString(),
    weekStart: monday.toLocaleDateString('es-AR'),
    weekEnd: sunday.toLocaleDateString('es-AR')
  }
}];
```

#### 3. HTTP Request: Obtener Leads
- **Method**: GET
- **URL**: `{{$env.CRM_BASE_URL}}/api/leads?from={{$node["Function"].json["from"]}}&to={{$node["Function"].json["to"]}}&limit=1000`
- **Headers**:
  ```json
  {
    "Authorization": "Bearer {{$env.WEBHOOK_TOKEN}}"
  }
  ```

#### 4. Function Node: Procesar Estadísticas
```javascript
const { leads } = $node["HTTP Request"].json;

const stats = {
  total: leads.length,
  porOrigen: {},
  porEstado: {},
  tasaPreaprobacion: 0
};

leads.forEach(lead => {
  // Contar por origen
  const origen = lead.origen || 'Sin origen';
  stats.porOrigen[origen] = (stats.porOrigen[origen] || 0) + 1;
  
  // Contar por estado
  stats.porEstado[lead.estado] = (stats.porEstado[lead.estado] || 0) + 1;
});

// Calcular tasa de preaprobación
const preaprobados = stats.porEstado['PREAPROBADO'] || 0;
const rechazados = stats.porEstado['RECHAZADO'] || 0;
const evaluados = preaprobados + rechazados;

if (evaluados > 0) {
  stats.tasaPreaprobacion = ((preaprobados / evaluados) * 100).toFixed(1);
}

return [{
  json: {
    ...stats,
    leads: leads,
    fechas: $node["Function"].json
  }
}];
```

#### 5. Function Node: Generar CSV
```javascript
const { leads } = $node["Function Node"].json;

const headers = ['Nombre', 'Teléfono', 'Email', 'Estado', 'Origen', 'Fecha'];
const rows = leads.map(lead => [
  lead.nombre,
  lead.telefono,
  lead.email || '',
  lead.estado,
  lead.origen || '',
  new Date(lead.createdAt).toLocaleDateString('es-AR')
]);

const csv = [headers, ...rows]
  .map(row => row.map(cell => `"${cell}"`).join(','))
  .join('\n');

return [{
  json: {
    csv: csv,
    filename: `leads-${new Date().toISOString().split('T')[0]}.csv`
  }
}];
```

#### 6. Email Node: Enviar Reporte
- **To**: ludmila@phorencial.com, facundo@phorencial.com
- **Subject**: `Reporte Semanal CRM - {{$node["Function"].json["fechas"]["weekStart"]}} a {{$node["Function"].json["fechas"]["weekEnd"]}}`
- **Email Type**: HTML
- **Body**:
```html
<h2>Reporte Semanal - Phorencial CRM</h2>
<p><strong>Período:</strong> {{$node["Function"].json["fechas"]["weekStart"]}} a {{$node["Function"].json["fechas"]["weekEnd"]}}</p>

<h3>Resumen</h3>
<ul>
  <li><strong>Total de leads:</strong> {{$node["Function Node"].json["total"]}}</li>
  <li><strong>Tasa de preaprobación:</strong> {{$node["Function Node"].json["tasaPreaprobacion"]}}%</li>
</ul>

<h3>Leads por Origen</h3>
<ul>
  {{Object.entries($node["Function Node"].json["porOrigen"]).map(([key, value]) => `<li>${key}: ${value}</li>`).join('')}}
</ul>

<h3>Leads por Estado</h3>
<ul>
  {{Object.entries($node["Function Node"].json["porEstado"]).map(([key, value]) => `<li>${key}: ${value}</li>`).join('')}}
</ul>

<p>Archivo CSV adjunto con el detalle completo.</p>
```
- **Attachments**: 
  - **Property Name**: csv
  - **File Name**: `{{$node["Function Node 1"].json["filename"]}}`

## Configuración de Webhooks

### Configurar Webhook de WhatsApp

1. **En tu proveedor de WhatsApp Business**:
   - URL: `https://tu-n8n.railway.app/webhook/whatsapp-leads`
   - Método: POST
   - Headers: `Authorization: Bearer super-seguro`

2. **Verificar conectividad**:
   ```bash
   curl -X POST https://tu-n8n.railway.app/webhook/whatsapp-leads \
     -H "Authorization: Bearer super-seguro" \
     -H "Content-Type: application/json" \
     -d @docs/examples/whatsapp_in.json
   ```

## Deployment en Railway

### 1. Crear proyecto en Railway

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Crear proyecto
railway new
```

### 2. Configurar n8n

Crear `railway.json`:

```json
{
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "startCommand": "n8n start",
    "healthcheckPath": "/healthz"
  }
}
```

Crear `Dockerfile`:

```dockerfile
FROM n8nio/n8n:latest

USER root
RUN apk add --no-cache git

USER node
WORKDIR /home/node

COPY package*.json ./
RUN npm ci --only=production

EXPOSE 5678

CMD ["n8n", "start"]
```

### 3. Variables de entorno en Railway

```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=tu-password-seguro
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_EDITOR_BASE_URL=https://tu-app.railway.app
WEBHOOK_URL=https://tu-app.railway.app
CRM_BASE_URL=https://tu-crm.vercel.app
WEBHOOK_TOKEN=super-seguro
```

### 4. Deploy

```bash
railway up
```

## Monitoreo y Logs

### Logs en n8n
- Accede al editor de n8n en `https://tu-app.railway.app`
- Ve a "Executions" para revisar logs de workflows

### Logs en Railway
```bash
railway logs
```

## Diferencias con Activepieces

| Característica | Activepieces | n8n |
|----------------|--------------|-----|
| **Hosting** | Cloud nativo | Requiere deployment |
| **Costo** | Free tier generoso | Free con hosting propio |
| **UI** | Moderna, simple | Más técnica, potente |
| **Conectores** | Muchos pre-built | Extenso ecosistema |
| **Código** | JavaScript limitado | JavaScript completo |
| **Escalabilidad** | Automática | Manual |

## Troubleshooting

### Webhook no recibe datos
1. Verificar URL del webhook en n8n
2. Revisar logs de ejecución
3. Testear con curl

### Error de autenticación
1. Verificar `WEBHOOK_TOKEN` en ambos sistemas
2. Revisar headers del request

### n8n no inicia
1. Verificar variables de entorno
2. Revisar logs de Railway: `railway logs`

## Migración desde Activepieces

Si ya tienes flows en Activepieces y quieres migrar:

1. **Exportar configuración** de Activepieces
2. **Recrear workflows** en n8n usando esta guía
3. **Actualizar webhooks** para apuntar a n8n
4. **Testear** ambos sistemas en paralelo
5. **Desactivar** flows de Activepieces

La API del CRM es la misma, solo cambia el sistema de orquestación.
