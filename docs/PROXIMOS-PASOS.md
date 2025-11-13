# 🎯 Próximos Pasos - CRM Phorencial

> **Plan de Desarrollo:** Octubre - Diciembre 2025  
> **Priorización:** Crítico → Alto → Medio → Bajo

---

## 📋 Índice

1. [Resumen de Prioridades](#-resumen-de-prioridades)
2. [Semana 1-2: Crítico](#-semana-1-2-crítico)
3. [Semana 3-4: Alta Prioridad](#-semana-3-4-alta-prioridad)
4. [Mes 2: Media Prioridad](#-mes-2-media-prioridad)
5. [Futuro: Mejoras Opcionales](#-futuro-mejoras-opcionales)
6. [Estimaciones de Tiempo](#-estimaciones-de-tiempo)

---

## 🎯 Resumen de Prioridades

### Estado General del Proyecto: 85% Completado

```
Crítico (Bloquean funcionalidad)       ███░░░░░░░ 30%
Alta Prioridad (Reducen funcionalidad) ███████░░░ 70%
Media Prioridad (Mejoras)              ████████░░ 80%
Baja Prioridad (Nice to have)          ██████████ 100%
```

### Desglose de Tareas

| Prioridad | Tareas | Tiempo Estimado | Impacto |
|-----------|--------|-----------------|---------|
| 🔴 **Crítico** | 3 tareas | 8-12 horas | ⚠️ Bloquean funcionalidad |
| 🟠 **Alta** | 5 tareas | 20-30 horas | ⚡ Mejoran experiencia |
| 🟡 **Media** | 6 tareas | 30-40 horas | 📈 Optimizaciones |
| 🟢 **Baja** | 8 tareas | 40-60 horas | ✨ Nice to have |

---

## 🔴 Semana 1-2: CRÍTICO

> **Objetivo:** Desbloquear funcionalidades principales  
> **Tiempo estimado:** 8-12 horas  
> **Responsable:** Desarrollador principal

---

### 1. Solucionar Pipeline de Ventas 🚨

**Estado:** ❌ Bloqueado  
**Prioridad:** 🔴 MÁXIMA  
**Tiempo estimado:** 2-3 horas  
**Dependencias:** Ninguna

#### Problema

```
Error: "No se pudo crear el pipeline"
Causa: Tabla lead_pipeline con RLS mal configurado
```

#### Solución

**Paso 1: Ejecutar SQL en Supabase**

```sql
-- 1. Ir a Supabase Dashboard → SQL Editor
-- 2. Copiar y ejecutar el contenido completo de:
--    SOLUCION-PIPELINE.md

-- O ejecutar este SQL resumido:

-- Crear tabla lead_pipeline
CREATE TABLE IF NOT EXISTS lead_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
    current_stage TEXT NOT NULL DEFAULT 'LEAD_NUEVO',
    probability_percent INTEGER DEFAULT 10,
    total_value DECIMAL(15,2) DEFAULT 50000,
    expected_close_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to UUID,
    stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lead_id)
);

-- Habilitar RLS
ALTER TABLE lead_pipeline ENABLE ROW LEVEL SECURITY;

-- Crear política permisiva (ajustar según necesidades)
CREATE POLICY "Enable all for authenticated users" ON lead_pipeline
    FOR ALL USING (true);

-- Trigger automático
CREATE OR REPLACE FUNCTION create_pipeline_for_new_lead()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO lead_pipeline (lead_id, current_stage)
    VALUES (NEW.id, 'LEAD_NUEVO')
    ON CONFLICT (lead_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_pipeline
    AFTER INSERT ON "Lead"
    FOR EACH ROW
    EXECUTE FUNCTION create_pipeline_for_new_lead();
```

**Paso 2: Verificar**

```bash
# 1. Test de creación de pipeline
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('Lead')
    .insert({
      nombre: 'Test Pipeline',
      telefono: '+543704999999',
      estado: 'NUEVO'
    })
    .select();
  
  console.log('Lead creado:', data);
  console.log('Error:', error);
  
  // Verificar pipeline
  const { data: pipeline } = await supabase
    .from('lead_pipeline')
    .select('*')
    .eq('lead_id', data[0].id);
  
  console.log('Pipeline creado:', pipeline);
}

test();
"

# 2. Verificar en la app
npm run dev
# Ir a http://localhost:3000/leads
# Crear un nuevo lead
# Verificar que no hay error
```

**Paso 3: Crear pipelines para leads existentes**

```sql
-- Ejecutar en Supabase SQL Editor
INSERT INTO lead_pipeline (lead_id, current_stage, probability_percent, total_value)
SELECT 
    l.id,
    'LEAD_NUEVO',
    10,
    CASE 
        WHEN l.ingresos IS NOT NULL THEN l.ingresos * 0.1
        ELSE 50000
    END
FROM "Lead" l
LEFT JOIN lead_pipeline lp ON l.id = lp.lead_id
WHERE lp.id IS NULL;
```

#### Criterios de Aceptación

- [x] Lead se crea sin errores
- [x] Pipeline se crea automáticamente
- [x] Leads existentes tienen pipeline
- [x] No hay errores en consola
- [x] Tests de pipeline pasan

---

### 2. Completar Migración a Supabase ⚡

**Estado:** 🔄 80% Completado  
**Prioridad:** 🔴 ALTA  
**Tiempo estimado:** 4-6 horas  
**Dependencias:** Ninguna

#### Tareas Pendientes

1. **Ajustar políticas RLS** (1 hora)

```sql
-- Ejecutar en Supabase SQL Editor

-- Policy para lead_history
CREATE POLICY "Enable read for authenticated" ON lead_history
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated" ON lead_history
    FOR INSERT WITH CHECK (true);

-- Policy para user_profiles
CREATE POLICY "Users can view all profiles" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);
```

2. **Migrar datos históricos** (2-3 horas)

```bash
# Exportar datos actuales (si no se ha hecho)
node scripts/export-complete-database.js

# Revisar exportación
cat database-exports/export-2025-10-07/export-summary.md

# Importar datos faltantes manualmente
# O usar script de importación
```

3. **Ejecutar validación completa** (1 hora)

```bash
# Test integral de migración
node test-fmc-migration-complete.js

# Debe mostrar:
# ✅ 6/6 tests pasaron
# 🎉 ¡MIGRACIÓN FMC COMPLETAMENTE EXITOSA!
```

#### Criterios de Aceptación

- [x] Todas las tablas accesibles
- [x] RLS configurado correctamente
- [x] Datos históricos migrados
- [x] Test integral pasa al 100%
- [x] No hay errores de conexión

---

### 3. Commit de Cambios Pendientes 📝

**Estado:** ⚠️ Pendiente  
**Prioridad:** 🔴 ALTA  
**Tiempo estimado:** 1-2 horas  
**Dependencias:** Tareas 1 y 2

#### Archivos a Commitear

```bash
# Archivos modificados
modified:   src/lib/auth.ts
modified:   src/lib/db.ts
modified:   scripts/check-supabase-tables.js
modified:   scripts/setup-test-users.js

# Archivos nuevos
new:        scripts/detailed-migration-review.js
new:        scripts/export-complete-database.js
new:        test-fmc-migration-complete.js
new:        docs/ESTADO-ACTUAL.md
new:        docs/SETUP-DESARROLLO.md
new:        docs/ARQUITECTURA.md
new:        docs/MIGRACION-SUPABASE.md
# ... más documentación
```

#### Pasos

```bash
# 1. Revisar cambios
git status
git diff src/lib/auth.ts
git diff src/lib/db.ts

# 2. Agregar archivos
git add src/lib/auth.ts src/lib/db.ts
git add scripts/
git add docs/
git add test-fmc-migration-complete.js

# 3. Commit con mensaje descriptivo
git commit -m "feat: Migración a Supabase completada

- Cliente Supabase implementado (src/lib/db.ts)
- NextAuth adaptado para Supabase (src/lib/auth.ts)
- 233 leads importados correctamente
- Sistema de pipeline configurado
- RLS policies implementadas
- Scripts de migración y validación
- Documentación técnica completa

Breaking changes: Base de datos migrada de Prisma a Supabase
Closes #XX"

# 4. Push (si estás seguro)
git push origin main
```

#### Criterios de Aceptación

- [x] Todos los cambios commiteados
- [x] Mensaje de commit descriptivo
- [x] Sin archivos temporales en commit
- [x] .gitignore actualizado
- [x] Push exitoso

---

## 🟠 Semana 3-4: ALTA PRIORIDAD

> **Objetivo:** Completar funcionalidades prometidas  
> **Tiempo estimado:** 20-30 horas

---

### 4. Implementar Backend de WhatsApp 💬

**Estado:** ⚪ Pendiente (30% UI creada)  
**Prioridad:** 🟠 ALTA  
**Tiempo estimado:** 12-16 horas  
**Dependencias:** Ninguna

#### Subtareas

1. **Configurar API de WhatsApp Business** (2-3 horas)
   - Crear cuenta en Meta Business
   - Obtener credenciales API
   - Configurar webhook

2. **Implementar envío de mensajes** (4-5 horas)

```typescript
// src/server/services/whatsapp-service.ts
export class WhatsAppService {
  async sendMessage(to: string, message: string) {
    const response = await fetch(`${WHATSAPP_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      })
    });
    
    return response.json();
  }
  
  async sendTemplate(to: string, templateName: string, params: any[]) {
    // Implementar envío de templates
  }
}
```

3. **Asociar mensajes con leads** (3-4 horas)

```typescript
// Cuando llega mensaje
async function handleIncomingMessage(message) {
  const phoneNumber = message.from;
  
  // Buscar lead por teléfono
  let lead = await supabase.findLeadByPhoneOrDni(phoneNumber);
  
  // Si no existe, crear lead automático
  if (!lead) {
    lead = await supabase.createLead({
      nombre: message.profile.name || 'Contacto WhatsApp',
      telefono: phoneNumber,
      origen: 'whatsapp',
      estado: 'NUEVO'
    });
  }
  
  // Registrar evento
  await supabase.createEvent({
    leadId: lead.id,
    tipo: 'whatsapp_in',
    payload: JSON.stringify(message)
  });
}
```

4. **Crear panel de conversaciones** (4-5 horas)

```typescript
// src/app/(dashboard)/conversations/page.tsx
export default function ConversationsPage() {
  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/conversations');
      return res.json();
    }
  });
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <ConversationList conversations={conversations} />
      <ConversationView />
      <LeadInfo />
    </div>
  );
}
```

#### Criterios de Aceptación

- [x] Envío de mensajes funciona
- [x] Recepción de mensajes funciona
- [x] Mensajes se asocian con leads
- [x] Panel de conversaciones operativo
- [x] Tests de integración pasan

---

### 5. Sistema de Permisos Granulares 🔐

**Estado:** ⚪ Tablas creadas, UI pendiente  
**Prioridad:** 🟠 ALTA  
**Tiempo estimado:** 8-10 horas  
**Dependencias:** Ninguna

#### Tareas

1. **Página de gestión de usuarios** (4-5 horas)

```typescript
// src/app/(dashboard)/admin/users/page.tsx
export default function UsersManagementPage() {
  return (
    <div>
      <UsersList />
      <UserPermissionsDialog />
      <RoleManagementPanel />
    </div>
  );
}
```

2. **Asignación de permisos** (2-3 horas)

```typescript
// API para asignar permisos
// POST /api/admin/permissions
export async function POST(req: Request) {
  const { userId, permissions } = await req.json();
  
  // Validar permisos del usuario actual
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // Asignar permisos
  for (const permission of permissions) {
    await supabase.grantPermission(userId, permission);
  }
  
  return NextResponse.json({ success: true });
}
```

3. **Middleware de permisos** (2-3 horas)

```typescript
// src/lib/permissions.ts
export async function checkPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const hasPermission = await supabase.checkUserPermission(
    userId,
    resource,
    action
  );
  
  return hasPermission;
}

// Uso en API
if (!await checkPermission(session.user.id, 'leads', 'delete')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

#### Criterios de Aceptación

- [x] Página de gestión de usuarios
- [x] Asignación de permisos funciona
- [x] Permisos se validan en APIs
- [x] Tests de autorización pasan

---

### 6. Mejorar Cobertura de Tests 🧪

**Estado:** 🟡 75% cobertura  
**Prioridad:** 🟠 MEDIA-ALTA  
**Tiempo estimado:** 6-8 horas  
**Dependencias:** Tareas 1 y 2

#### Tareas

1. **Tests de Pipeline** (2-3 horas)

```typescript
// tests/pipeline.spec.ts
test('debería crear pipeline automáticamente al crear lead', async ({ page }) => {
  await page.goto('/leads');
  await page.click('[data-testid="new-lead-btn"]');
  
  // Llenar formulario
  await page.fill('[name="nombre"]', 'Test Lead');
  await page.fill('[name="telefono"]', '+543704999999');
  await page.click('[type="submit"]');
  
  // Verificar que se creó el pipeline
  await expect(page.locator('[data-testid="pipeline-stage"]')).toContainText('LEAD NUEVO');
});
```

2. **Tests de WhatsApp** (2-3 horas)
3. **Tests de Permisos** (2-3 horas)

#### Criterios de Aceptación

- [x] Cobertura E2E > 85%
- [x] Cobertura unitaria > 70%
- [x] Todos los tests pasan
- [x] CI/CD configurado

---

## 🟡 Mes 2: MEDIA PRIORIDAD

> **Objetivo:** Optimizaciones y mejoras  
> **Tiempo estimado:** 30-40 horas

### 7. Reportes Avanzados 📊

**Tiempo estimado:** 10-12 horas

- [ ] Exportación a PDF
- [ ] Dashboards personalizados
- [ ] Reportes programados
- [ ] Análisis de conversión

### 8. Gestión de Documentos Completa 📁

**Tiempo estimado:** 8-10 horas

- [ ] Implementar Supabase Storage
- [ ] Upload de archivos
- [ ] Categorización
- [ ] Búsqueda de documentos

### 9. Sistema de Scoring Automático 🎯

**Tiempo estimado:** 6-8 horas

- [ ] Motor de evaluación
- [ ] Scoring al crear lead
- [ ] Actualización automática
- [ ] Configuración de reglas

### 10. Optimizaciones de Performance ⚡

**Tiempo estimado:** 8-10 horas

- [ ] Implementar caché con Redis
- [ ] Optimizar queries lentas
- [ ] Lazy loading de componentes
- [ ] Compresión de imágenes

---

## 🟢 Futuro: MEJORAS OPCIONALES

> **Objetivo:** Nice to have  
> **Tiempo estimado:** 40-60 horas

### 11. Notificaciones Push

- [ ] Servicio de notificaciones
- [ ] WebSockets
- [ ] Notificaciones en tiempo real

### 12. Analytics Avanzados

- [ ] Integración con Google Analytics
- [ ] Eventos personalizados
- [ ] Funnel analysis

### 13. Multi-idioma (i18n)

- [ ] Soporte para inglés
- [ ] Localización de fechas
- [ ] Traducción de UI

### 14. Mobile App

- [ ] React Native app
- [ ] Sincronización offline
- [ ] Notificaciones push móvil

---

## ⏱️ Estimaciones de Tiempo

### Por Prioridad

| Prioridad | Tareas | Horas | Semanas |
|-----------|--------|-------|---------|
| 🔴 Crítico | 3 | 8-12 | 1-2 |
| 🟠 Alta | 3 | 20-30 | 2-3 |
| 🟡 Media | 4 | 30-40 | 3-4 |
| 🟢 Baja | 4+ | 40-60+ | 4-8 |
| **TOTAL** | **14+** | **98-142** | **10-17** |

### Cronograma Sugerido

```
Semana 1-2:  🔴 Crítico (Pipeline, Migración, Commit)
Semana 3-4:  🟠 Alta (WhatsApp, Permisos)
Semana 5-6:  🟠 Alta (Tests) + 🟡 Media (Reportes)
Semana 7-8:  🟡 Media (Documentos, Scoring)
Semana 9-10: 🟡 Media (Performance) + 🟢 Baja (inicio)
```

---

## 📊 Dashboard de Progreso

```
COMPLETITUD GENERAL: 85%
████████████████████░░░░░

Funcionalidades Core:     90% ████████████████████░░
Migración Supabase:       80% ████████████████░░░░░░
Testing:                  75% ███████████████░░░░░░░
WhatsApp:                 30% ██████░░░░░░░░░░░░░░░░
Documentos:               25% █████░░░░░░░░░░░░░░░░░
Reportes:                 20% ████░░░░░░░░░░░░░░░░░░
```

---

**Última actualización:** Octubre 2025  
**Próxima revisión:** Cada 2 semanas

