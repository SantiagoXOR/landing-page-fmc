# 🔧 SOLUCIÓN PARA ERRORES DEL PIPELINE

## 🎯 **PROBLEMA IDENTIFICADO**

Los errores "No se pudo crear el pipeline" se deben a que **la tabla `lead_pipeline` no existe en Supabase**.

## 📋 **PASOS PARA SOLUCIONARLO**

### **1. Ejecutar SQL en Supabase**

Ve a **Supabase Dashboard** → **SQL Editor** y ejecuta este código:

```sql
-- CREAR TABLA LEAD_PIPELINE
CREATE TABLE IF NOT EXISTS lead_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
    current_stage TEXT NOT NULL DEFAULT 'LEAD_NUEVO',
    probability_percent INTEGER DEFAULT 10 CHECK (probability_percent >= 0 AND probability_percent <= 100),
    total_value DECIMAL(15,2) DEFAULT 50000,
    expected_close_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to UUID,
    stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índice único para evitar duplicados
    UNIQUE(lead_id)
);

-- CREAR TABLA PIPELINE_HISTORY
CREATE TABLE IF NOT EXISTS pipeline_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_pipeline_id UUID NOT NULL REFERENCES lead_pipeline(id) ON DELETE CASCADE,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    transition_type TEXT NOT NULL DEFAULT 'MANUAL',
    notes TEXT,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CREAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_lead_id ON lead_pipeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_stage ON lead_pipeline(current_stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_pipeline_id ON pipeline_history(lead_pipeline_id);

-- HABILITAR RLS (Row Level Security)
ALTER TABLE lead_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_history ENABLE ROW LEVEL SECURITY;

-- CREAR POLÍTICAS RLS (permitir todo por ahora)
CREATE POLICY "Enable all operations for authenticated users" ON lead_pipeline
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON pipeline_history
    FOR ALL USING (true);

-- CREAR PIPELINES PARA LEADS EXISTENTES
INSERT INTO lead_pipeline (lead_id, current_stage, probability_percent, total_value, expected_close_date)
SELECT 
    l.id,
    'LEAD_NUEVO',
    10,
    CASE 
        WHEN l.ingresos IS NOT NULL THEN l.ingresos * 0.1
        ELSE 50000
    END,
    CURRENT_DATE + INTERVAL '30 days'
FROM "Lead" l
LEFT JOIN lead_pipeline lp ON l.id = lp.lead_id
WHERE lp.id IS NULL;

-- VERIFICAR RESULTADOS
SELECT 
    'Leads' as tabla,
    COUNT(*) as registros
FROM "Lead"
UNION ALL
SELECT 
    'Pipelines' as tabla,
    COUNT(*) as registros
FROM lead_pipeline;
```

### **2. Verificar en la Aplicación**

Después de ejecutar el SQL:

1. **Refrescar la página** del CRM
2. **Ir a la página de diagnóstico**: http://localhost:3001/debug
3. **Verificar que aparezca**: ✅ Tabla Pipeline
4. **Probar crear un nuevo lead**
5. **Verificar que no aparezcan errores**

### **3. Si Persisten los Errores**

Si aún hay problemas, ejecuta también:

```sql
-- FUNCIÓN PARA CREAR PIPELINE AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION create_pipeline_for_new_lead()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO lead_pipeline (
        lead_id,
        current_stage,
        probability_percent,
        total_value,
        expected_close_date
    ) VALUES (
        NEW.id,
        'LEAD_NUEVO',
        10,
        CASE 
            WHEN NEW.ingresos IS NOT NULL THEN NEW.ingresos * 0.1
            ELSE 50000
        END,
        CURRENT_DATE + INTERVAL '30 days'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER PARA CREAR PIPELINE AUTOMÁTICAMENTE
CREATE TRIGGER trigger_create_pipeline_for_new_lead
    AFTER INSERT ON "Lead"
    FOR EACH ROW
    EXECUTE FUNCTION create_pipeline_for_new_lead();
```

## 🎯 **RESULTADO ESPERADO**

Después de ejecutar estos comandos:

- ✅ **No más errores** "No se pudo crear el pipeline"
- ✅ **Pipeline automático** para todos los leads
- ✅ **Página de pipeline** funcionando correctamente
- ✅ **Flujo completo** de leads operativo

## 🚀 **PRÓXIMOS PASOS**

1. **Ejecutar el SQL** en Supabase
2. **Verificar en /debug** que todo esté verde
3. **Probar crear un lead** nuevo
4. **Ejecutar tests** de Playwright
5. **Confirmar que todo funciona** ✅

---

**📞 CONTACTO**: Si necesitas ayuda ejecutando el SQL, avísame y te guío paso a paso.
