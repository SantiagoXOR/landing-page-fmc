# 📡 Referencia de APIs - CRM Phorencial

> **Version:** 1.0.0  
> **Base URL:** `http://localhost:3000/api` (desarrollo)  
> **Base URL:** `https://tu-app.vercel.app/api` (producción)

---

## 📋 Índice

1. [Autenticación](#-autenticación)
2. [Leads](#-leads)
3. [Pipeline](#-pipeline)
4. [Dashboard](#-dashboard)
5. [Admin](#-admin)
6. [Webhooks](#-webhooks)
7. [Códigos de Error](#-códigos-de-error)

---

## 🔐 Autenticación

Todas las APIs (excepto webhooks) requieren autenticación mediante **JWT tokens** gestionados por NextAuth.

### Obtener Token (Login)

```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "admin@phorencial.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@phorencial.com",
    "name": "Admin",
    "role": "ADMIN",
    "status": "ACTIVE"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Headers Requeridos

```http
Cookie: next-auth.session-token=eyJhbGciOiJIUzI1NiIs...
```

---

## 👤 Leads

### Listar Leads

```http
GET /api/leads
GET /api/leads?page=1&limit=10
GET /api/leads?estado=NUEVO
GET /api/leads?q=juan
```

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | number | 1 | Número de página |
| `limit` | number | 10 | Leads por página |
| `estado` | string | - | Filtrar por estado |
| `origen` | string | - | Filtrar por origen |
| `q` | string | - | Búsqueda por nombre/teléfono/email |
| `from` | string | - | Fecha inicio (ISO 8601) |
| `to` | string | - | Fecha fin (ISO 8601) |

**Response 200:**
```json
{
  "leads": [
    {
      "id": "uuid",
      "nombre": "Juan Pérez",
      "telefono": "+543704555123",
      "email": "juan@example.com",
      "estado": "NUEVO",
      "origen": "whatsapp",
      "ingresos": 150000,
      "zona": "Formosa Capital",
      "createdAt": "2025-10-22T10:30:00.000Z",
      "updatedAt": "2025-10-22T10:30:00.000Z"
    }
  ],
  "total": 233,
  "page": 1,
  "limit": 10,
  "totalPages": 24
}
```

**Ejemplo con cURL:**
```bash
curl -X GET "http://localhost:3000/api/leads?page=1&limit=10" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

---

### Crear Lead

```http
POST /api/leads
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "María García",
  "telefono": "+543704555999",
  "email": "maria@example.com",
  "dni": "38123456",
  "estado": "NUEVO",
  "origen": "whatsapp",
  "ingresos": 180000,
  "zona": "Formosa Capital",
  "producto": "Crédito Personal",
  "monto": 50000,
  "notas": "Interesada en crédito a 12 meses"
}
```

**Campos Requeridos:**
- `nombre` (string)
- `telefono` (string)

**Campos Opcionales:**
- `email` (string)
- `dni` (string)
- `estado` (string): NUEVO, EN_REVISION, PREAPROBADO, RECHAZADO, DOC_PENDIENTE, DERIVADO
- `origen` (string): whatsapp, instagram, facebook, comentario, web, ads
- `ingresos` (number)
- `zona` (string)
- `producto` (string)
- `monto` (number)
- `notas` (text)

**Response 201:**
```json
{
  "id": "uuid",
  "nombre": "María García",
  "telefono": "+543704555999",
  "email": "maria@example.com",
  "estado": "NUEVO",
  "createdAt": "2025-10-22T11:00:00.000Z"
}
```

**Errores:**
```json
// 400 - Validación
{
  "error": "Validation error",
  "details": [
    {
      "field": "telefono",
      "message": "Formato de teléfono inválido"
    }
  ]
}

// 401 - No autenticado
{
  "error": "Unauthorized"
}

// 403 - Sin permisos
{
  "error": "Forbidden - insufficient permissions"
}
```

**Ejemplo con cURL:**
```bash
curl -X POST "http://localhost:3000/api/leads" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "nombre": "María García",
    "telefono": "+543704555999",
    "email": "maria@example.com"
  }'
```

---

### Obtener Lead por ID

```http
GET /api/leads/{id}
```

**Response 200:**
```json
{
  "id": "uuid",
  "nombre": "Juan Pérez",
  "telefono": "+543704555123",
  "email": "juan@example.com",
  "dni": "38123456",
  "estado": "NUEVO",
  "origen": "whatsapp",
  "ingresos": 150000,
  "zona": "Formosa Capital",
  "createdAt": "2025-10-22T10:30:00.000Z",
  "updatedAt": "2025-10-22T10:30:00.000Z",
  "events": [
    {
      "id": "uuid",
      "tipo": "lead_created",
      "createdAt": "2025-10-22T10:30:00.000Z"
    }
  ]
}
```

**Response 404:**
```json
{
  "error": "Lead not found"
}
```

---

### Actualizar Lead

```http
PATCH /api/leads/{id}
Content-Type: application/json
```

**Body:**
```json
{
  "estado": "PREAPROBADO",
  "notas": "Documentación completa recibida"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "estado": "PREAPROBADO",
  "notas": "Documentación completa recibida",
  "updatedAt": "2025-10-22T12:00:00.000Z"
}
```

---

### Eliminar Lead

```http
DELETE /api/leads/{id}
```

**Response 204:**
```
No content
```

**Response 404:**
```json
{
  "error": "Lead not found"
}
```

---

### Obtener Eventos de Lead

```http
GET /api/leads/{id}/events
```

**Response 200:**
```json
{
  "events": [
    {
      "id": "uuid",
      "leadId": "lead-uuid",
      "tipo": "whatsapp_in",
      "payload": {
        "message": "Hola, me interesa el producto"
      },
      "createdAt": "2025-10-22T10:35:00.000Z"
    }
  ]
}
```

---

## 🔄 Pipeline

### Listar Pipelines

```http
GET /api/pipeline
```

**Response 200:**
```json
{
  "pipelines": [
    {
      "id": "uuid",
      "lead_id": "lead-uuid",
      "current_stage": "LEAD_NUEVO",
      "probability_percent": 10,
      "total_value": 50000,
      "expected_close_date": "2025-11-22",
      "created_at": "2025-10-22T10:30:00.000Z"
    }
  ]
}
```

---

### Obtener Pipeline de Lead

```http
GET /api/pipeline/{leadId}
```

**Response 200:**
```json
{
  "id": "uuid",
  "lead_id": "lead-uuid",
  "current_stage": "CONTACTO",
  "probability_percent": 25,
  "total_value": 75000,
  "expected_close_date": "2025-11-15",
  "created_at": "2025-10-22T10:30:00.000Z",
  "updated_at": "2025-10-22T11:00:00.000Z"
}
```

---

### Mover Lead en Pipeline

```http
POST /api/pipeline/leads/{leadId}/move
Content-Type: application/json
```

**Body:**
```json
{
  "to_stage": "CALIFICACION",
  "notes": "Lead calificado exitosamente",
  "probability_percent": 40
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "current_stage": "CALIFICACION",
  "probability_percent": 40,
  "updated_at": "2025-10-22T12:00:00.000Z"
}
```

**Etapas Disponibles:**
1. `LEAD_NUEVO` (10%)
2. `CONTACTO` (25%)
3. `CALIFICACION` (40%)
4. `PRESENTACION` (55%)
5. `PROPUESTA` (70%)
6. `NEGOCIACION` (85%)
7. `CIERRE` (95%)
8. `GANADO` (100%)
9. `PERDIDO` (0%)

---

### Historial de Pipeline

```http
GET /api/pipeline/{leadId}/history
```

**Response 200:**
```json
{
  "history": [
    {
      "id": "uuid",
      "lead_pipeline_id": "pipeline-uuid",
      "from_stage": "LEAD_NUEVO",
      "to_stage": "CONTACTO",
      "transition_type": "MANUAL",
      "notes": "Contacto realizado",
      "changed_by": "user-uuid",
      "changed_at": "2025-10-22T11:00:00.000Z"
    }
  ]
}
```

---

### Listar Etapas del Pipeline

```http
GET /api/pipeline/stages
```

**Response 200:**
```json
{
  "stages": [
    {
      "id": "uuid",
      "name": "Lead Nuevo",
      "stage_type": "LEAD_NUEVO",
      "order_position": 1,
      "probability_percent": 10,
      "color": "#3B82F6"
    },
    {
      "id": "uuid",
      "name": "Contacto",
      "stage_type": "CONTACTO",
      "order_position": 2,
      "probability_percent": 25,
      "color": "#8B5CF6"
    }
  ]
}
```

---

## 📊 Dashboard

### Obtener Métricas

```http
GET /api/dashboard/metrics
```

**Response 200:**
```json
{
  "totalLeads": 233,
  "newLeadsToday": 5,
  "conversionRate": 3.0,
  "leadsThisWeek": 18,
  "leadsThisMonth": 67,
  "leadsByStatus": {
    "NUEVO": 195,
    "PREAPROBADO": 7,
    "RECHAZADO": 35,
    "EN_REVISION": 10
  },
  "recentLeads": [
    {
      "id": "uuid",
      "nombre": "Juan Pérez",
      "telefono": "+543704555123",
      "estado": "NUEVO",
      "createdAt": "2025-10-22T10:30:00.000Z"
    }
  ],
  "trendData": [
    {
      "date": "2025-10-16",
      "leads": 3,
      "conversions": 0
    },
    {
      "date": "2025-10-17",
      "leads": 5,
      "conversions": 1
    }
  ]
}
```

---

## 👑 Admin

### Listar Usuarios

```http
GET /api/admin/users
```

**Requiere:** Role ADMIN

**Response 200:**
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Admin User",
      "email": "admin@phorencial.com",
      "role": "ADMIN",
      "lastLogin": "2025-10-22T09:00:00.000Z",
      "createdAt": "2025-08-01T00:00:00.000Z"
    }
  ]
}
```

---

### Crear Usuario

```http
POST /api/admin/users
Content-Type: application/json
```

**Requiere:** Role ADMIN

**Body:**
```json
{
  "name": "Nuevo Usuario",
  "email": "nuevo@phorencial.com",
  "password": "password123",
  "role": "ANALISTA"
}
```

**Roles Disponibles:**
- `ADMIN` - Acceso total
- `MANAGER` - Gestión de equipo
- `ANALISTA` - Análisis de leads
- `VENDEDOR` - Gestión de leads asignados
- `VIEWER` - Solo lectura

**Response 201:**
```json
{
  "id": "uuid",
  "name": "Nuevo Usuario",
  "email": "nuevo@phorencial.com",
  "role": "ANALISTA",
  "createdAt": "2025-10-22T13:00:00.000Z"
}
```

---

### Actualizar Usuario

```http
PATCH /api/admin/users/{id}
Content-Type: application/json
```

**Requiere:** Role ADMIN

**Body:**
```json
{
  "role": "MANAGER",
  "name": "Usuario Actualizado"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Usuario Actualizado",
  "role": "MANAGER",
  "updatedAt": "2025-10-22T13:30:00.000Z"
}
```

---

## 🔗 Webhooks

### Webhook de WhatsApp

```http
POST /api/webhooks/whatsapp
Content-Type: application/json
Authorization: Bearer YOUR_WEBHOOK_TOKEN
```

**Headers:**
```
Authorization: Bearer super-seguro-webhook-token-123
```

**Body:**
```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "5491155556789",
                "type": "text",
                "text": {
                  "body": "Hola, me interesa el producto"
                },
                "timestamp": "1698075123"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

---

## ❌ Códigos de Error

### Códigos HTTP

| Código | Descripción | Ejemplo |
|--------|-------------|---------|
| **200** | OK | Operación exitosa |
| **201** | Created | Recurso creado |
| **204** | No Content | Recurso eliminado |
| **400** | Bad Request | Datos inválidos |
| **401** | Unauthorized | No autenticado |
| **403** | Forbidden | Sin permisos |
| **404** | Not Found | Recurso no encontrado |
| **429** | Too Many Requests | Rate limit excedido |
| **500** | Internal Server Error | Error del servidor |

---

### Estructura de Error

```json
{
  "error": "Descripción del error",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "nombre",
      "message": "El nombre es requerido"
    }
  ],
  "timestamp": "2025-10-22T10:30:00.000Z"
}
```

---

### Errores Comunes

#### Validation Error (400)
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "telefono",
      "message": "Formato de teléfono inválido. Use +54 seguido del número"
    }
  ]
}
```

#### Unauthorized (401)
```json
{
  "error": "Unauthorized",
  "message": "No se proporcionó token de autenticación"
}
```

#### Forbidden (403)
```json
{
  "error": "Forbidden",
  "message": "No tienes permisos para realizar esta acción"
}
```

#### Not Found (404)
```json
{
  "error": "Not found",
  "message": "Lead con ID 'xyz' no encontrado"
}
```

#### Rate Limit (429)
```json
{
  "error": "Too many requests",
  "message": "Límite de tasa excedido. Intenta de nuevo en 60 segundos",
  "retryAfter": 60
}
```

---

## 🔧 Rate Limiting

**Límites actuales:**
- Usuarios autenticados: **100 requests / minuto**
- Webhooks: **500 requests / minuto**
- APIs públicas: **20 requests / minuto**

**Headers de respuesta:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698075183
```

---

## 📝 Ejemplos Completos

### Flujo Completo: Crear Lead y Mover en Pipeline

```bash
# 1. Login
curl -X POST "http://localhost:3000/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@phorencial.com","password":"admin123"}'

# Guardar el token de la respuesta

# 2. Crear lead
curl -X POST "http://localhost:3000/api/leads" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "nombre": "Test Lead",
    "telefono": "+543704555999",
    "email": "test@example.com",
    "estado": "NUEVO"
  }'

# Guardar el ID del lead

# 3. Obtener pipeline del lead
curl -X GET "http://localhost:3000/api/pipeline/LEAD_ID" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# 4. Mover en pipeline
curl -X POST "http://localhost:3000/api/pipeline/leads/LEAD_ID/move" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "to_stage": "CONTACTO",
    "notes": "Contacto exitoso",
    "probability_percent": 25
  }'

# 5. Ver historial
curl -X GET "http://localhost:3000/api/pipeline/LEAD_ID/history" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

---

## 🚀 SDK / Clientes

### JavaScript/TypeScript

```typescript
// Cliente de ejemplo
class PhorencialClient {
  constructor(private baseUrl: string, private token: string) {}
  
  async getLeads(query?: { page?: number; limit?: number; estado?: string }) {
    const params = new URLSearchParams(query as any);
    const response = await fetch(`${this.baseUrl}/api/leads?${params}`, {
      headers: {
        'Cookie': `next-auth.session-token=${this.token}`
      }
    });
    
    return response.json();
  }
  
  async createLead(data: CreateLeadDto) {
    const response = await fetch(`${this.baseUrl}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `next-auth.session-token=${this.token}`
      },
      body: JSON.stringify(data)
    });
    
    return response.json();
  }
}

// Uso
const client = new PhorencialClient('http://localhost:3000', 'YOUR_TOKEN');
const leads = await client.getLeads({ page: 1, estado: 'NUEVO' });
```

---

## 📚 Recursos Adicionales

- [Swagger/OpenAPI Docs](http://localhost:3000/api/docs) (en desarrollo)
- [Postman Collection](#) (próximamente)
- [Estado del Proyecto](./ESTADO-ACTUAL.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

**Última actualización:** Octubre 2025  
**Versión de API:** 1.0.0

