# 📋 **DOCUMENTACIÓN TÉCNICA - PLAN DE EVOLUCIÓN CRM PHORENCIAL**

## **VERSIÓN:** 1.0

## **FECHA:** 28 de Agosto de 2025

## **ESTADO ACTUAL:** 213 leads operativos, funcionalidades básicas implementadas

---

# 1. 📊 **RESUMEN EJECUTIVO DE HALLAZGOS**

## **1.1 Estado Actual del Sistema**

El CRM Phorencial presenta una **base técnica sólida** con funcionalidades de visualización y consulta completamente operativas. El diagnóstico con Playwright confirmó que:

- ✅ **213 leads del CSV** correctamente importados y funcionales
- ✅ **Navegación completa** entre módulos (Dashboard, Leads, Documents, Reports, Settings, Admin)
- ✅ **Búsquedas y filtros** operativos con resultados precisos
- ✅ **Interfaz moderna** y responsive funcionando correctamente
- ✅ **Datos consistentes** con formato correcto (nombres con primera letra mayúscula, sin datos inventados)

## **1.2 Gaps Críticos Identificados**

### **🔴 FUNCIONALIDADES CORE FALTANTES**

| Funcionalidad                  | Impacto Operacional             | Estado Actual              | Criticidad |
| ------------------------------ | ------------------------------- | -------------------------- | ---------- |
| **CRUD Completo de Leads**     | Bloquea modificación de datos   | Solo lectura               | 🔴 Crítica |
| **Pipeline de Ventas**         | Sin seguimiento de conversión   | Estados básicos únicamente | 🔴 Crítica |
| **Asignación de Usuarios**     | Sin distribución de trabajo     | Un solo usuario admin      | 🔴 Crítica |
| **Seguimiento de Actividades** | Sin historial de interacciones  | No implementado            | 🟡 Alta    |
| **Gestión de Tareas**          | Sin recordatorios ni follow-ups | No implementado            | 🟡 Alta    |

### **🔗 INTEGRACIONES FALTANTES**

| Integración               | Impacto en Formosa                | Estado Detectado         | Criticidad |
| ------------------------- | --------------------------------- | ------------------------ | ---------- |
| **WhatsApp Business API** | Canal principal de comunicación   | "No configurado" visible | 🔴 Crítica |
| **Email SMTP**            | Comunicación formal               | No implementado          | 🔴 Alta    |
| **RENAPER (DNI)**         | Validación de identidad argentina | No implementado          | 🟡 Media   |
| **SMS Gateway**           | Backup de comunicación            | No implementado          | 🟢 Baja    |

### **🤖 AUTOMATIZACIÓN FALTANTE**

| Proceso                         | Impacto en Eficiencia                   | Estado Actual | Criticidad |
| ------------------------------- | --------------------------------------- | ------------- | ---------- |
| **Workflows de Seguimiento**    | Pérdida de leads por falta de follow-up | Manual        | 🟡 Alta    |
| **Asignación Automática**       | Distribución ineficiente por zonas      | Manual        | 🟡 Alta    |
| **Scoring de Leads**            | Sin priorización automática             | Manual        | 🟡 Media   |
| **Notificaciones Inteligentes** | Retrasos en respuesta                   | Básicas       | 🟡 Media   |

### **🎨 UX/UI MEJORAS NECESARIAS**

| Aspecto                       | Problema Identificado                 | Impacto en Usabilidad     | Criticidad |
| ----------------------------- | ------------------------------------- | ------------------------- | ---------- |
| **Contadores Inconsistentes** | Sidebar muestra "1,247" vs 213 reales | Confusión de usuarios     | 🟡 Media   |
| **Búsqueda Limitada**         | Solo búsqueda simple                  | Ineficiencia en consultas | 🟡 Media   |
| **Bulk Operations**           | Sin selección múltiple                | Operaciones lentas        | 🟡 Media   |
| **Mobile Experience**         | No optimizada                         | Limitación de acceso      | 🟢 Baja    |

### **🔒 SEGURIDAD Y ADMINISTRACIÓN**

| Aspecto                  | Riesgo Identificado        | Impacto en Seguridad     | Criticidad |
| ------------------------ | -------------------------- | ------------------------ | ---------- |
| **Roles Granulares**     | Solo usuario admin visible | Acceso sin restricciones | 🔴 Alta    |
| **Auditoría de Cambios** | Sin trazabilidad           | Pérdida de historial     | 🟡 Alta    |
| **Backup Automático**    | Riesgo de pérdida de datos | Continuidad del negocio  | 🔴 Alta    |
| **Autenticación 2FA**    | Vulnerabilidad de acceso   | Seguridad de cuentas     | 🟡 Media   |

---

# 2. 🗺️ **PLAN DE IMPLEMENTACIÓN ESTRUCTURADO**

## **2.1 Metodología de Priorización**

### **Criterios de Evaluación:**

1. **Impacto en Negocio** (40%): Efecto directo en conversión y operación
2. **Facilidad Técnica** (25%): Complejidad de implementación
3. **Necesidades Específicas de Formosa** (20%): Adaptación al mercado local
4. **Dependencias Técnicas** (15%): Requisitos previos para otras funcionalidades

### **Matriz de Priorización:**

- 🔴 **Crítica**: Bloquea operación eficiente
- 🟡 **Alta**: Mejora significativa en productividad
- 🟢 **Media**: Optimización y escalabilidad
- 🔵 **Baja**: Funcionalidades avanzadas

## **2.2 Roadmap por Fases**

### **📋 FASE 1: FUNCIONALIDADES CORE CRÍTICAS**

**Objetivo:** Habilitar operación completa del CRM con los 213 leads existentes

#### **Entregables Principales:**

1. **CRUD Completo de Leads**
   - Edición de información personal y comercial
   - Validación de datos en tiempo real
   - Historial de modificaciones
2. **Sistema de Usuarios y Roles**
   - Roles: Admin, Manager, Agent, Viewer
   - Permisos granulares por módulo
   - Asignación de leads a usuarios
3. **Pipeline de Ventas Básico**
   - Etapas: Nuevo → Contactado → Calificado → Propuesta → Cerrado/Perdido
   - Transiciones de estado con validaciones
   - Métricas de conversión por etapa

#### **Dependencias:**

- Sistema de usuarios debe implementarse antes que asignación de leads
- CRUD debe estar completo antes que pipeline avanzado

#### **Criterios de Aceptación:**

- ✅ Editar cualquier campo de los 213 leads existentes
- ✅ Crear nuevos leads con validación completa
- ✅ Asignar leads a diferentes usuarios
- ✅ Mover leads a través del pipeline con restricciones de rol

### **📞 FASE 2: COMUNICACIÓN E INTEGRACIONES**

**Objetivo:** Habilitar comunicación directa con leads y validación de datos

#### **Entregables Principales:**

1. **WhatsApp Business API**
   - Integración completa con Meta Business API
   - Envío y recepción de mensajes
   - Templates de mensajes para Formosa
   - Historial de conversaciones por lead
2. **Sistema de Email**
   - Configuración SMTP
   - Templates de email personalizables
   - Tracking de apertura y clicks
   - Integración con pipeline de ventas
3. **Integración RENAPER**
   - Validación automática de DNI
   - Verificación de datos personales
   - Actualización automática de información

#### **Dependencias:**

- Requiere CRUD completo de Fase 1
- Sistema de usuarios necesario para asignación de conversaciones

#### **Criterios de Aceptación:**

- ✅ Enviar WhatsApp a cualquier lead con teléfono válido
- ✅ Recibir y asociar respuestas al lead correspondiente
- ✅ Validar DNI de los 213 leads existentes
- ✅ Enviar emails con templates personalizados

### **🤖 FASE 3: AUTOMATIZACIÓN Y WORKFLOWS**

**Objetivo:** Automatizar procesos repetitivos y mejorar eficiencia

#### **Entregables Principales:**

1. **Workflows Automáticos**
   - Asignación automática por zona de Formosa
   - Recordatorios de follow-up
   - Escalación por tiempo de inactividad
   - Scoring automático de leads
2. **Sistema de Tareas y Recordatorios**
   - Creación automática de tareas
   - Notificaciones push y email
   - Calendario integrado
   - Reportes de productividad
3. **Automatización de Comunicación**
   - Respuestas automáticas en WhatsApp
   - Secuencias de email marketing
   - Triggers por cambio de estado

#### **Dependencias:**

- Requiere comunicación implementada de Fase 2
- Necesita pipeline completo de Fase 1

#### **Criterios de Aceptación:**

- ✅ Asignación automática de nuevos leads por zona
- ✅ Recordatorios automáticos cada 3-7 días
- ✅ Scoring automático basado en criterios definidos
- ✅ Secuencias de comunicación automatizadas

### **📊 FASE 4: ANALYTICS Y REPORTES AVANZADOS**

**Objetivo:** Proporcionar insights para optimización de ventas

#### **Entregables Principales:**

1. **Dashboards Especializados**
   - Dashboard por agente con métricas individuales
   - Dashboard por zona de Formosa
   - Dashboard ejecutivo con KPIs consolidados
   - Dashboard de forecasting
2. **Reportes Avanzados**
   - Análisis de conversión por fuente
   - Tiempo promedio de cierre por zona
   - Rendimiento comparativo de agentes
   - Análisis de pérdida de leads
3. **Exportación y APIs**
   - Exportación en múltiples formatos
   - API REST para integraciones
   - Webhooks para eventos importantes

#### **Dependencias:**

- Requiere datos históricos de fases anteriores
- Necesita workflows implementados para métricas precisas

#### **Criterios de Aceptación:**

- ✅ Dashboards actualizados en tiempo real
- ✅ Reportes exportables en PDF/Excel
- ✅ API funcional para integraciones externas
- ✅ Métricas de rendimiento por agente y zona

### **🔒 FASE 5: SEGURIDAD Y ESCALABILIDAD**

**Objetivo:** Asegurar el sistema para crecimiento empresarial

#### **Entregables Principales:**

1. **Seguridad Avanzada**
   - Autenticación de dos factores
   - Auditoría completa de acciones
   - Encriptación de datos sensibles
   - Políticas de contraseñas
2. **Administración Empresarial**
   - Backup automático diario
   - Monitoreo de performance
   - Logs de sistema centralizados
   - Recuperación ante desastres
3. **Optimización de Performance**
   - Caching inteligente
   - Optimización de consultas
   - CDN para assets estáticos
   - Escalabilidad horizontal

#### **Dependencias:**

- Puede implementarse en paralelo con otras fases
- Requiere sistema estable de fases anteriores

#### **Criterios de Aceptación:**

- ✅ 2FA obligatorio para todos los usuarios
- ✅ Backup automático con recuperación probada
- ✅ Tiempo de respuesta < 2 segundos
- ✅ Auditoría completa de todas las acciones

# 3. 🔧 **ESPECIFICACIONES TÉCNICAS DETALLADAS**

## **3.1 CRUD Completo de Leads**

### **Descripción Técnica:**

Sistema completo de gestión de datos de leads con validación, historial y permisos granulares basado en las mejores prácticas de Next.js y Supabase.

### **Arquitectura de Componentes:**

#### **Frontend - Next.js App Router:**

```typescript
// src/app/leads/[id]/edit/page.tsx
interface LeadEditForm {
  personalInfo: {
    nombre: string;
    dni: string;
    telefono: string;
    email?: string;
    zona: string;
  };
  commercialInfo: {
    ingresos?: number;
    estado: LeadStatus;
    origen: string;
    notas?: string;
  };
  systemInfo: {
    asignadoA?: string;
    fechaCreacion: Date;
    fechaActualizacion: Date;
  };
}

// Validación con Zod (mejores prácticas Next.js)
const leadSchema = z.object({
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  dni: z.string().regex(/^\d{8}$/, "DNI debe tener 8 dígitos"),
  telefono: z.string().regex(/^\+5437\d{8}$/, "Formato: +5437XXXXXXXX"),
  zona: z.enum(FORMOSA_ZONES),
  ingresos: z.number().min(0).optional(),
});
```

#### **API Routes - Next.js:**

```typescript
// src/app/api/leads/[id]/route.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });

  // Verificar autenticación (mejores prácticas Supabase)
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validar permisos con RLS
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Actualizar con historial automático
  const { data, error } = await supabase
    .from("leads")
    .update(validatedData)
    .eq("id", params.id)
    .select();

  return NextResponse.json({ data, error });
}
```

#### **Supabase RLS Policies:**

```sql
-- Política para edición de leads (basada en documentación oficial)
CREATE POLICY "Users can update assigned leads"
ON leads
FOR UPDATE
TO authenticated
USING (
  -- Solo el usuario asignado o admin puede editar
  assigned_to = (SELECT auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role IN ('admin', 'manager')
  )
);

-- Política para historial de cambios
CREATE POLICY "Users can view lead history"
ON lead_history
FOR SELECT
TO authenticated
USING (
  lead_id IN (
    SELECT id FROM leads
    WHERE assigned_to = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  )
);
```

### **Validaciones Específicas para Formosa:**

- **DNI**: Formato argentino con algoritmo de verificación
- **Teléfono**: Códigos de área de Formosa (+5437XX)
- **Zona**: Lista predefinida de localidades
- **Ingresos**: Formato pesos argentinos con rangos válidos

### **Base de Datos - Supabase:**

```sql
-- Tabla de historial de cambios (trigger automático)
CREATE TABLE lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  campo_modificado VARCHAR(100),
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  fecha_cambio TIMESTAMP DEFAULT NOW()
);

-- Trigger para historial automático
CREATE OR REPLACE FUNCTION track_lead_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar cambios en historial
  INSERT INTO lead_history (lead_id, campo_modificado, valor_anterior, valor_nuevo, usuario_id)
  SELECT NEW.id, key, OLD.value, NEW.value, (SELECT auth.uid())
  FROM jsonb_each_text(to_jsonb(OLD)) AS old_data(key, value)
  JOIN jsonb_each_text(to_jsonb(NEW)) AS new_data(key, value) ON old_data.key = new_data.key
  WHERE old_data.value IS DISTINCT FROM new_data.value;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER lead_changes_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_lead_changes();
```

---

## **3.2 WhatsApp Business API Integration**

### **Descripción Técnica:**

Integración completa con Meta WhatsApp Business API siguiendo las mejores prácticas oficiales para comunicación bidireccional.

### **Arquitectura de Integración:**

#### **Configuración de Webhook (Next.js):**

```typescript
// src/app/api/webhooks/whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  // Verificación de webhook (documentación oficial Meta)
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  // Verificar firma (seguridad Meta)
  const expectedSignature = crypto
    .createHmac("sha256", process.env.WHATSAPP_APP_SECRET!)
    .update(body)
    .digest("hex");

  if (`sha256=${expectedSignature}` !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const webhook: WhatsAppWebhook = JSON.parse(body);
  await processWhatsAppWebhook(webhook);

  return NextResponse.json({ status: "ok" });
}
```

#### **Gestión de Mensajes (Documentación Meta):**

```typescript
interface WhatsAppMessage {
  id: string;
  from: string; // Número del lead
  timestamp: string;
  type: "text" | "image" | "document" | "template";
  text?: { body: string };
  image?: { id: string; caption?: string };
  template?: {
    name: string;
    language: { code: string };
    components: TemplateComponent[];
  };
}

// Envío de mensajes (API oficial Meta)
async function sendWhatsAppMessage(to: string, message: WhatsAppMessage) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        ...message,
      }),
    }
  );

  return response.json();
}
```

#### **Templates para Formosa (Mejores Prácticas Meta):**

```typescript
const TEMPLATES_FORMOSA = {
  BIENVENIDA: {
    name: "bienvenida_formosa",
    language: { code: "es_AR" },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: "{{nombre_lead}}" },
          { type: "text", text: "{{zona_formosa}}" },
        ],
      },
    ],
  },
  SEGUIMIENTO_CREDITO: {
    name: "seguimiento_credito",
    language: { code: "es_AR" },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: "{{nombre_lead}}" },
          { type: "text", text: "{{monto_solicitado}}" },
        ],
      },
    ],
  },
};

// Envío con template (documentación oficial)
async function sendTemplateMessage(leadId: string, templateName: string) {
  const lead = await getLeadById(leadId);
  const template = TEMPLATES_FORMOSA[templateName];

  return sendWhatsAppMessage(lead.telefono, {
    type: "template",
    template: {
      ...template,
      components: template.components.map((comp) => ({
        ...comp,
        parameters: comp.parameters.map((param) => ({
          ...param,
          text: param.text
            .replace("{{nombre_lead}}", lead.nombre)
            .replace("{{zona_formosa}}", lead.zona)
            .replace("{{monto_solicitado}}", formatCurrency(lead.ingresos)),
        })),
      })),
    },
  });
}
```

### **Base de Datos - Supabase:**

```sql
-- Tabla de conversaciones WhatsApp
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  phone_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de mensajes con RLS
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id),
  message_id VARCHAR(100) UNIQUE, -- ID de WhatsApp
  direction VARCHAR(10), -- 'inbound' | 'outbound'
  content TEXT,
  message_type VARCHAR(20),
  status VARCHAR(20),
  timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS para mensajes
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversation messages"
ON whatsapp_messages
FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM whatsapp_conversations wc
    JOIN leads l ON l.id = wc.lead_id
    WHERE l.assigned_to = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  )
);
```

### **Consideraciones Específicas:**

- **Números de Formosa**: Validar formato +5437XX antes de envío
- **Horarios locales**: Respetar zona horaria Argentina (UTC-3)
- **Compliance**: Cumplir regulaciones WhatsApp Business
- **Rate limiting**: Gestionar límites de envío de Meta
- **Templates**: Seguir guidelines de Meta para aprobación

---

## **3.3 Pipeline de Ventas**

### **Descripción Técnica:**

Sistema de seguimiento de leads a través de etapas definidas con métricas y automatización basado en mejores prácticas de CRM.

### **Definición de Estados:**

```typescript
enum LeadStatus {
  NUEVO = "NUEVO",
  CONTACTADO = "CONTACTADO",
  CALIFICADO = "CALIFICADO",
  PROPUESTA = "PROPUESTA",
  PREAPROBADO = "PREAPROBADO",
  DOCUMENTACION = "DOCUMENTACION",
  APROBADO = "APROBADO",
  RECHAZADO = "RECHAZADO",
  PERDIDO = "PERDIDO",
}

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  isActive: boolean;
  requiredFields?: string[];
  autoActions?: AutoAction[];
}
```

### **Transiciones de Estado:**

```typescript
interface StateTransition {
  from: LeadStatus;
  to: LeadStatus;
  requiredRole: UserRole;
  requiredFields: string[];
  validations: ValidationRule[];
  autoActions: AutoAction[];
}

// Ejemplo de transición específica para Formosa
const TRANSICIONES_FORMOSA: StateTransition[] = [
  {
    from: LeadStatus.NUEVO,
    to: LeadStatus.CONTACTADO,
    requiredRole: UserRole.AGENT,
    requiredFields: ["telefono", "zona"],
    validations: [{ field: "telefono", rule: "formosa_phone_format" }],
    autoActions: [{ type: "create_task", data: { title: "Llamar en 24hs" } }],
  },
];
```

### **Métricas del Pipeline:**

```sql
-- Vista para métricas de conversión
CREATE VIEW pipeline_metrics AS
SELECT
  estado,
  COUNT(*) as total_leads,
  AVG(EXTRACT(EPOCH FROM (fecha_actualizacion - fecha_creacion))/86400) as dias_promedio,
  zona,
  DATE_TRUNC('month', fecha_creacion) as mes
FROM leads
WHERE origen = 'csv'
GROUP BY estado, zona, DATE_TRUNC('month', fecha_creacion);
```

---

## **3.4 Sistema de Usuarios y Roles**

### **Descripción Técnica:**

Sistema de autenticación y autorización con roles específicos para operación de CRM en Formosa usando Supabase Auth.

### **Definición de Roles:**

```typescript
enum UserRole {
  ADMIN = "ADMIN", // Acceso completo
  MANAGER = "MANAGER", // Gestión de equipo y reportes
  AGENT = "AGENT", // Gestión de leads asignados
  VIEWER = "VIEWER", // Solo lectura
}

interface Permission {
  resource: string; // 'leads', 'reports', 'users'
  action: string; // 'create', 'read', 'update', 'delete'
  scope: "own" | "team" | "all";
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [{ resource: "*", action: "*", scope: "all" }],
  MANAGER: [
    { resource: "leads", action: "read", scope: "all" },
    { resource: "leads", action: "update", scope: "team" },
    { resource: "reports", action: "read", scope: "all" },
    { resource: "users", action: "read", scope: "team" },
  ],
  AGENT: [
    { resource: "leads", action: "read", scope: "own" },
    { resource: "leads", action: "update", scope: "own" },
    { resource: "leads", action: "create", scope: "own" },
  ],
  VIEWER: [
    { resource: "leads", action: "read", scope: "own" },
    { resource: "reports", action: "read", scope: "own" },
  ],
};
```

### **Asignación por Zonas de Formosa:**

```typescript
interface UserZoneAssignment {
  userId: string;
  zones: string[];
  isDefault: boolean;
}

// Configuración específica para Formosa
const FORMOSA_ZONES = [
  "Formosa Capital",
  "Clorinda",
  "Pirané",
  "El Colorado",
  "Las Lomitas",
  "Ingeniero Juárez",
  "Ibarreta",
  "Comandante Fontana",
  // ... resto de zonas
];
```

### **Base de Datos con RLS:**

```sql
-- Tabla de usuarios (extiende auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS para perfiles de usuario
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

CREATE POLICY "Admins can view all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = (SELECT auth.uid())
    AND role = 'ADMIN'
  )
);

-- Tabla de asignación de zonas
CREATE TABLE user_zone_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  zone VARCHAR(100),
  is_default BOOLEAN DEFAULT false
);

-- Tabla de asignación de leads
CREATE TABLE lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  user_id UUID REFERENCES user_profiles(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id)
);
```

---

_[Continuará en el siguiente archivo debido a límite de líneas]_
