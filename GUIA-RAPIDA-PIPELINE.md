# 🚀 Guía Rápida - Pipeline de Ventas

## ✅ Tu Pipeline ya está Listo

El sistema de Pipeline de Ventas está **100% operativo**. Esta guía te ayudará a empezar a usarlo en 5 minutos.

---

## 📍 Paso 1: Acceder al Pipeline (30 segundos)

### Iniciar la aplicación
```bash
npm run dev
```

### Abrir el Pipeline
```
URL: http://localhost:3001/pipeline
```

### ¿Qué verás?
- **Kanban Board** con 9 columnas (etapas)
- **233 leads** en la primera columna (Lead Nuevo)
- **Métricas** en la parte superior
- **Filtros** y búsqueda

---

## 📍 Paso 2: Probar el Sistema (2 minutos)

### A. Mover un Lead
1. **Click y mantén** en cualquier lead
2. **Arrastra** a otra columna
3. **Suelta** para cambiar de etapa
4. ✅ El cambio se registra automáticamente en el historial

### B. Ver Detalles de un Lead
1. **Click** en el nombre del lead
2. Se abre el panel de detalles
3. Puedes ver:
   - Información del cliente
   - Historial de cambios
   - Actividades
   - Tareas pendientes

### C. Crear un Nuevo Lead
1. Click en **"Nuevo Lead"** (botón superior derecho)
2. Completa el formulario
3. Guarda
4. ✅ El pipeline se crea **automáticamente**

---

## 📍 Paso 3: Organizar tus Leads (15 minutos)

Actualmente **todos los 233 leads están en "Lead Nuevo"**. Vamos a organizarlos:

### Distribución Recomendada

```sql
-- Ejecutar en Supabase SQL Editor
-- (Dashboard > SQL Editor)

-- Ejemplo: Mover leads antiguos a "Seguimiento"
UPDATE lead_pipeline 
SET current_stage = 'SEGUIMIENTO'::pipeline_stage,
    previous_stage = 'LEAD_NUEVO'::pipeline_stage,
    stage_entered_at = NOW()
WHERE lead_id IN (
    SELECT id FROM "Lead" 
    WHERE "createdAt" < NOW() - INTERVAL '90 days'
);

-- Ejemplo: Leads con alto valor a "Calificación"
UPDATE lead_pipeline 
SET current_stage = 'CALIFICACION'::pipeline_stage,
    previous_stage = 'LEAD_NUEVO'::pipeline_stage,
    probability_percent = 30,
    stage_entered_at = NOW()
WHERE expected_value > 100000;
```

---

## 📍 Paso 4: Personalizar (5 minutos)

### Asignar Responsables

```sql
-- Asignar leads a un usuario específico
UPDATE lead_pipeline 
SET assigned_to = 'UUID_DEL_USUARIO'
WHERE current_stage = 'CONTACTO_INICIAL';
```

### Actualizar Valores

```sql
-- Actualizar valor estimado y probabilidad
UPDATE lead_pipeline 
SET expected_value = 150000,
    probability_percent = 50,
    estimated_close_date = CURRENT_DATE + INTERVAL '30 days'
WHERE lead_id = 'UUID_DEL_LEAD';
```

---

## 🎯 Las 9 Etapas del Pipeline

| # | Etapa | Uso Recomendado | Probabilidad |
|---|-------|-----------------|--------------|
| 1 | **Lead Nuevo** | Recién ingresados al CRM | 10% |
| 2 | **Contacto Inicial** | Primera llamada/mensaje realizado | 20% |
| 3 | **Calificación** | Lead validado como oportunidad | 30% |
| 4 | **Presentación** | Producto/servicio presentado | 50% |
| 5 | **Propuesta** | Cotización enviada | 70% |
| 6 | **Negociación** | Negociando términos finales | 80% |
| 7 | **Cierre Ganado** | ¡Venta exitosa! 🎉 | 100% |
| 8 | **Cierre Perdido** | Oportunidad perdida | 0% |
| 9 | **Seguimiento** | Contacto futuro programado | 15% |

---

## 📊 Métricas Disponibles

### En el Dashboard Principal
- **Total Leads:** Cantidad total en el pipeline
- **Valor Total:** Suma de todos los valores estimados
- **Ticket Promedio:** Valor promedio por lead
- **Alta Prioridad:** Leads que requieren atención inmediata
- **Con Tareas:** Leads con actividades pendientes

### Queries Útiles

```sql
-- Ver distribución por etapa
SELECT 
    current_stage,
    COUNT(*) as leads,
    SUM(expected_value) as valor_total,
    AVG(probability_percent) as prob_promedio
FROM lead_pipeline
GROUP BY current_stage
ORDER BY valor_total DESC;

-- Top 10 leads por valor
SELECT 
    l.nombre,
    lp.current_stage,
    lp.expected_value,
    lp.probability_percent
FROM lead_pipeline lp
JOIN "Lead" l ON lp.lead_id = l.id
ORDER BY lp.expected_value DESC
LIMIT 10;

-- Leads estancados (más de 30 días en misma etapa)
SELECT 
    l.nombre,
    lp.current_stage,
    EXTRACT(DAY FROM (NOW() - lp.stage_entered_at)) as dias_en_etapa
FROM lead_pipeline lp
JOIN "Lead" l ON lp.lead_id = l.id
WHERE lp.stage_entered_at < NOW() - INTERVAL '30 days'
    AND lp.current_stage NOT IN ('CIERRE_GANADO', 'CIERRE_PERDIDO')
ORDER BY dias_en_etapa DESC;
```

---

## 🔍 Verificación Rápida

### ¿Todo funciona?

Ejecuta el test de validación:
```bash
node test-fmc-migration-complete.js
```

Deberías ver:
```
✅ PASÓ - Conexión a BD
✅ PASÓ - Existencia de tablas
✅ PASÓ - Datos iniciales
✅ PASÓ - Políticas RLS
✅ PASÓ - Operaciones básicas
✅ PASÓ - Preparación de app

RESULTADO FINAL: 6/6 tests pasaron ✅
```

---

## 🎓 Tips de Uso

### 1. Actualiza Regularmente
- Mueve leads a su etapa correcta cada día
- Actualiza fechas estimadas de cierre
- Registra actividades importantes

### 2. Usa el Historial
- Cada cambio se registra automáticamente
- Puedes ver quién y cuándo movió cada lead
- Útil para auditorías y seguimiento

### 3. Aprovecha la Automatización
- Al crear un lead, el pipeline se crea solo
- Los cambios de etapa se registran automáticamente
- No necesitas hacer nada manualmente

### 4. Personaliza Valores
- Ajusta `expected_value` según la negociación
- Actualiza `probability_percent` conforme avanza
- Configura `estimated_close_date` realista

---

## 🚨 Solución de Problemas

### Error: "No se puede mover el lead"
✅ **Solución:** El sistema RLS está funcionando. Asegúrate de estar autenticado.

### No veo los leads
✅ **Solución:** Verifica que tengas permisos de lectura. Ejecuta:
```sql
SELECT * FROM lead_pipeline LIMIT 5;
```

### El pipeline no se crea para leads nuevos
✅ **Solución:** El trigger está activo. Verifica con:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_create_pipeline_for_new_lead';
```

---

## 📚 Documentación Adicional

- **Implementación Técnica:** `PIPELINE-IMPLEMENTACION-COMPLETA.md`
- **Resumen Ejecutivo:** `PIPELINE-RESUMEN-EJECUTIVO.md`
- **Solución Original:** `SOLUCION-PIPELINE.md`

---

## ✨ Siguiente Nivel

### Cuando domines lo básico:

1. **Configurar Alertas**
   - Leads estancados más de X días
   - Leads con cierre próximo
   - Oportunidades de alto valor

2. **Analytics Avanzados**
   - Tasa de conversión por etapa
   - Tiempo promedio en cada etapa
   - Forecasting de ventas

3. **Automatizaciones**
   - Asignación automática de leads
   - Notificaciones por WhatsApp
   - Tareas automáticas

---

## 🎉 ¡Listo para Empezar!

```
1. ✅ npm run dev
2. ✅ Ir a http://localhost:3001/pipeline
3. ✅ Empezar a mover leads
4. ✅ Ver el historial registrarse automáticamente
```

**Valor actual de tu pipeline:** $12,916,977.80 ARS  
**Leads en gestión:** 233  
**Sistema:** 100% Operativo ✅

---

¿Necesitas ayuda? Revisa:
- `PIPELINE-IMPLEMENTACION-COMPLETA.md` para detalles técnicos
- Supabase Dashboard > SQL Editor para queries
- `test-fmc-migration-complete.js` para verificar el estado

**¡Buen trabajo con tu pipeline! 🚀**

