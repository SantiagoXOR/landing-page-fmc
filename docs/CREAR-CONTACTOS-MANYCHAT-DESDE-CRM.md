# 📞 Crear Contactos de WhatsApp en Manychat desde el CRM

Esta guía explica cómo crear contactos/subscribers en Manychat desde el CRM usando la API de Manychat.

## 📚 Documentación Oficial

Consulta la [guía oficial de Manychat](https://help.manychat.com/hc/es/articles/14281353475228-C%C3%B3mo-crear-contactos-de-WhatsApp-a-trav%C3%A9s-de-la-API-de-Manychat) para más detalles.

## 🔧 Cómo Funciona

Cuando creas o actualizas un lead en el CRM, puedes sincronizarlo automáticamente con Manychat usando el método `createOrUpdateSubscriber`.

### Endpoint Utilizado

```
POST https://api.manychat.com/fb/subscriber/createSubscriber
```

### Parámetros Requeridos

- `phone` (requerido): Número de teléfono en formato E.164 (ej: +543701234567)
- `whatsapp_phone` (opcional): Número de WhatsApp (por defecto usa `phone`)
- `first_name` (opcional): Nombre del contacto
- `last_name` (opcional): Apellido del contacto
- `email` (opcional): Email del contacto
- `has_opt_in_sms` (opcional): Si el contacto optó por recibir SMS (default: true)
- `custom_fields` (opcional): Objeto con custom fields
- `tags` (opcional): Array de nombres de tags

## 💻 Uso en el Código

### Crear Subscriber desde un Lead

```typescript
import { ManychatService } from '@/server/services/manychat-service'

const subscriber = await ManychatService.createOrUpdateSubscriber({
  phone: '+543701234567',
  first_name: 'Juan',
  last_name: 'Pérez',
  email: 'juan@example.com',
  whatsapp_phone: '+543701234567',
  custom_fields: {
    dni: '12345678',
    ingresos: 500000,
    zona: 'Formosa Capital'
  },
  tags: ['interesado', 'whatsapp']
})
```

### Sincronización Automática

El CRM sincroniza automáticamente cuando:

1. **Creas un nuevo lead** con teléfono válido
2. **Actualizas un lead** con información nueva
3. **Sincronizas manualmente** desde la página de Manychat

## 📋 Formato del Teléfono

**IMPORTANTE**: El teléfono debe estar en formato **E.164**:

- ✅ Correcto: `+543701234567`
- ❌ Incorrecto: `3701234567` (sin código de país)
- ❌ Incorrecto: `543701234567` (sin el +)
- ❌ Incorrecto: `0370-1234567` (con guiones)

### Conversión Automática

Nuestro código intenta convertir automáticamente:

```typescript
// Si el teléfono empieza con 0, lo reemplaza con +54
if (phone.startsWith('0')) {
  phone = '+54' + phone.substring(1)
}

// Si no tiene +, lo agrega
if (!phone.startsWith('+')) {
  phone = '+54' + phone
}
```

## 🔄 Flujo de Sincronización

### 1. Crear Lead en CRM

```typescript
const lead = await supabaseLeadService.createLead({
  nombre: 'Juan Pérez',
  telefono: '+543701234567',
  email: 'juan@example.com',
  dni: '12345678',
  ingresos: 500000,
  zona: 'Formosa Capital'
})
```

### 2. Sincronizar con Manychat

```typescript
if (ManychatService.isConfigured()) {
  const subscriber = await ManychatService.createOrUpdateSubscriber({
    phone: lead.telefono,
    first_name: lead.nombre.split(' ')[0],
    last_name: lead.nombre.split(' ').slice(1).join(' '),
    email: lead.email,
    whatsapp_phone: lead.telefono,
    custom_fields: {
      dni: lead.dni,
      ingresos: lead.ingresos,
      zona: lead.zona,
      estado: lead.estado
    }
  })
  
  // Guardar el manychatId en el lead
  if (subscriber?.id) {
    await supabaseLeadService.updateLead(lead.id, {
      manychatId: String(subscriber.id)
    })
  }
}
```

## 🏷️ Custom Fields

Para que los custom fields se sincronicen correctamente, deben estar creados en Manychat primero:

1. Ve a Manychat → Settings → Custom Fields
2. Crea los campos que necesitas (ej: `dni`, `ingresos`, `zona`, `estado`)
3. Usa los mismos nombres en el CRM

### Mapeo de Campos

| Campo CRM | Custom Field Manychat |
|-----------|----------------------|
| `dni` | `dni` |
| `ingresos` | `ingresos` |
| `zona` | `zona` |
| `producto` | `producto` |
| `monto` | `monto` |
| `estado` | `estado` |

## 🏷️ Tags

Los tags se agregan automáticamente después de crear el subscriber:

```typescript
// Los tags se agregan uno por uno después de crear el subscriber
if (data.tags && data.tags.length > 0) {
  for (const tagName of data.tags) {
    await ManychatService.addTagToSubscriber(subscriberId, tagName)
  }
}
```

**Nota**: Los tags deben existir en Manychat antes de agregarlos.

## ⚠️ Consideraciones Importantes

### 1. Rate Limiting

Manychat tiene límites de rate:
- **100 requests por segundo** (según documentación)
- Nuestro código implementa rate limiting automático con cola de requests

### 2. Errores Comunes

**Error: "Invalid phone number"**
- Verifica que el teléfono esté en formato E.164
- Asegúrate de que el número sea válido

**Error: "Custom field not found"**
- El custom field debe existir en Manychat antes de usarlo
- Verifica que el nombre del campo coincida exactamente

**Error: "Tag not found"**
- El tag debe existir en Manychat antes de agregarlo
- Los tags son case-sensitive

### 3. Opt-in Requerido

Para WhatsApp Business, el contacto debe haber dado su consentimiento (opt-in). Manychat maneja esto automáticamente cuando:
- El contacto envía un mensaje primero
- O configuras `has_opt_in_sms: true` al crear el subscriber

## 🧪 Probar la Creación

### 1. Crear Lead de Prueba

```bash
# Desde el CRM, crea un lead con:
- Nombre: Test Manychat
- Teléfono: +543701234567 (tu número de prueba)
- Email: test@example.com
```

### 2. Sincronizar Manualmente

1. Ve a la página del lead
2. Haz clic en "Sincronizar con Manychat"
3. Verifica en Manychat que el contacto se creó

### 3. Verificar en Manychat

1. Ve a Manychat → Subscribers
2. Busca el contacto por teléfono
3. Verifica que los custom fields y tags se sincronizaron

## 📊 Monitoreo

### Ver Logs de Sincronización

Los logs de sincronización se guardan en la tabla `ManychatSync`:

```sql
SELECT * FROM "ManychatSync"
WHERE "syncType" = 'lead_to_manychat'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Verificar Estado

```typescript
// Verificar si Manychat está configurado
if (ManychatService.isConfigured()) {
  // Manychat está listo para usar
}

// Verificar conexión
const health = await fetch('/api/manychat/health')
```

## 🔗 Referencias

- [Documentación Oficial - Crear Contactos](https://help.manychat.com/hc/es/articles/14281353475228-C%C3%B3mo-crear-contactos-de-WhatsApp-a-trav%C3%A9s-de-la-API-de-Manychat)
- [Manychat API Documentation](https://api.manychat.com/)
- [Guía de Configuración Completa](./MANYCHAT-SETUP.md)

