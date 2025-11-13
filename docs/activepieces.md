# Integración con Activepieces Cloud

Este documento describe cómo configurar los flujos de Activepieces para integrar WhatsApp Business con el CRM de Phorencial.

## Configuración General

### Variables de Entorno en Activepieces

Configura las siguientes variables en tu proyecto de Activepieces:

- `CRM_BASE_URL`: URL base del CRM (ej: `https://tu-app.vercel.app`)
- `WEBHOOK_TOKEN`: Token compartido para autenticación (`super-seguro`)
- `WHATSAPP_TOKEN`: Token de acceso de WhatsApp Business API

## Flow 1: Ingreso de Leads desde WhatsApp

### Descripción
Este flujo procesa mensajes entrantes de WhatsApp y crea/actualiza leads en el CRM.

### Configuración del Flow

#### 1. Trigger: Webhook
- **URL**: `https://tu-activepieces.com/api/v1/webhooks/[webhook-id]`
- **Método**: POST
- **Headers**: Configurar según tu proveedor de WhatsApp Business

#### 2. Step: Normalizar Datos
**Tipo**: Code (JavaScript)

```javascript
export const code = async (inputs) => {
  const { body } = inputs;
  
  // Extraer datos del webhook de WhatsApp
  // Ajustar según el formato de tu proveedor (Twilio, 360Dialog, etc.)
  const message = body.messages?.[0];
  const contact = body.contacts?.[0];
  
  if (!message || !contact) {
    return { skip: true };
  }
  
  return {
    telefono: contact.wa_id,
    nombre: contact.profile?.name || `Lead WhatsApp ${contact.wa_id}`,
    messageType: message.type,
    messageText: message.text?.body,
    timestamp: message.timestamp,
    messageId: message.id,
    origen: 'whatsapp'
  };
};
```

#### 3. Step: Crear/Actualizar Lead
**Tipo**: HTTP Request

- **URL**: `{{CRM_BASE_URL}}/api/leads`
- **Método**: POST
- **Headers**:
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer {{WEBHOOK_TOKEN}}"
  }
  ```
- **Body**:
  ```json
  {
    "nombre": "{{step2.nombre}}",
    "telefono": "{{step2.telefono}}",
    "origen": "{{step2.origen}}"
  }
  ```

#### 4. Step: Registrar Evento WhatsApp
**Tipo**: HTTP Request

- **URL**: `{{CRM_BASE_URL}}/api/events/whatsapp`
- **Método**: POST
- **Headers**:
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer {{WEBHOOK_TOKEN}}"
  }
  ```
- **Body**:
  ```json
  {
    "telefono": "{{step2.telefono}}",
    "type": "{{step2.messageType}}",
    "messageId": "{{step2.messageId}}",
    "timestamp": "{{step2.timestamp}}",
    "payload": {
      "text": "{{step2.messageText}}",
      "from": "{{step2.telefono}}"
    }
  }
  ```

#### 5. Step: Auto-respuesta (Opcional)
**Tipo**: HTTP Request

Enviar respuesta automática al cliente:

- **URL**: Tu endpoint de WhatsApp Business API
- **Método**: POST
- **Body**: Mensaje de bienvenida personalizado

## Flow 2: Reporte Semanal Automático

### Descripción
Genera y envía reportes semanales por email con estadísticas de leads.

### Configuración del Flow

#### 1. Trigger: Schedule
- **Cron**: `0 9 * * 1` (Lunes a las 9:00 AM)
- **Timezone**: America/Argentina/Buenos_Aires

#### 2. Step: Calcular Fechas
**Tipo**: Code (JavaScript)

```javascript
export const code = async (inputs) => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 - 7); // Lunes pasado
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    from: monday.toISOString(),
    to: sunday.toISOString(),
    weekStart: monday.toLocaleDateString('es-AR'),
    weekEnd: sunday.toLocaleDateString('es-AR')
  };
};
```

#### 3. Step: Obtener Datos del CRM
**Tipo**: HTTP Request

- **URL**: `{{CRM_BASE_URL}}/api/leads?from={{step2.from}}&to={{step2.to}}&limit=1000`
- **Método**: GET
- **Headers**:
  ```json
  {
    "Authorization": "Bearer {{WEBHOOK_TOKEN}}"
  }
  ```

#### 4. Step: Procesar Estadísticas
**Tipo**: Code (JavaScript)

```javascript
export const code = async (inputs) => {
  const { leads } = inputs.step3.body;
  
  const stats = {
    total: leads.length,
    porOrigen: {},
    porEstado: {},
    tasaPreaprobacion: 0
  };
  
  leads.forEach(lead => {
    // Contar por origen
    stats.porOrigen[lead.origen || 'Sin origen'] = 
      (stats.porOrigen[lead.origen || 'Sin origen'] || 0) + 1;
    
    // Contar por estado
    stats.porEstado[lead.estado] = 
      (stats.porEstado[lead.estado] || 0) + 1;
  });
  
  // Calcular tasa de preaprobación
  const preaprobados = stats.porEstado['PREAPROBADO'] || 0;
  const rechazados = stats.porEstado['RECHAZADO'] || 0;
  const evaluados = preaprobados + rechazados;
  
  if (evaluados > 0) {
    stats.tasaPreaprobacion = ((preaprobados / evaluados) * 100).toFixed(1);
  }
  
  return stats;
};
```

#### 5. Step: Generar CSV
**Tipo**: Code (JavaScript)

```javascript
export const code = async (inputs) => {
  const { leads } = inputs.step3.body;
  
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
  
  return { csv };
};
```

#### 6. Step: Enviar Email
**Tipo**: Email (Gmail/Outlook/SMTP)

- **To**: ludmila@phorencial.com, facundo@phorencial.com
- **Subject**: `Reporte Semanal CRM - {{step2.weekStart}} a {{step2.weekEnd}}`
- **Body**:
  ```html
  <h2>Reporte Semanal - Phorencial CRM</h2>
  <p><strong>Período:</strong> {{step2.weekStart}} a {{step2.weekEnd}}</p>
  
  <h3>Resumen</h3>
  <ul>
    <li><strong>Total de leads:</strong> {{step4.total}}</li>
    <li><strong>Tasa de preaprobación:</strong> {{step4.tasaPreaprobacion}}%</li>
  </ul>
  
  <h3>Leads por Origen</h3>
  <ul>
    {{#each step4.porOrigen}}
    <li>{{@key}}: {{this}}</li>
    {{/each}}
  </ul>
  
  <h3>Leads por Estado</h3>
  <ul>
    {{#each step4.porEstado}}
    <li>{{@key}}: {{this}}</li>
    {{/each}}
  </ul>
  
  <p>Archivo CSV adjunto con el detalle completo.</p>
  ```
- **Attachments**: CSV generado en step 5

## Configuración de Webhooks

### WhatsApp Business API

Configura el webhook de tu proveedor para que apunte al trigger de Activepieces:

1. **Twilio**: Configurar webhook URL en la consola de Twilio
2. **360Dialog**: Configurar en el panel de 360Dialog
3. **Meta Cloud API**: Configurar en Meta for Developers

### Verificación de Webhook

Asegúrate de que el webhook incluya el token de verificación correcto en los headers.

## Monitoreo y Logs

### Logs en Activepieces
- Revisa los logs de ejecución en el dashboard de Activepieces
- Configura alertas para fallos en los flows

### Logs en el CRM
- Los eventos se registran automáticamente en la tabla `Event`
- Usa el endpoint `/api/health` para verificar el estado del CRM

## Troubleshooting

### Problemas Comunes

1. **Error 401 en requests al CRM**
   - Verificar que el `WEBHOOK_TOKEN` sea correcto
   - Asegurar que el header `Authorization` esté bien formateado

2. **Leads duplicados**
   - El CRM maneja automáticamente la deduplicación por teléfono/DNI
   - Verificar que el teléfono esté en formato internacional

3. **Mensajes de WhatsApp no procesados**
   - Verificar la configuración del webhook en el proveedor
   - Revisar el formato del payload en los logs de Activepieces

### Contacto de Soporte

Para problemas técnicos, contactar al equipo de desarrollo con:
- Logs de Activepieces
- Timestamp del error
- Payload del webhook que falló
