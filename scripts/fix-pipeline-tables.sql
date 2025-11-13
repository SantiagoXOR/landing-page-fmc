-- SCRIPT PARA CORREGIR TABLAS DEL PIPELINE EN SUPABASE
-- Ejecutar en Supabase SQL Editor

-- 1. CREAR TIPOS ENUM SI NO EXISTEN
DO $$ BEGIN
    CREATE TYPE pipeline_stage AS ENUM (
        'LEAD_NUEVO',
        'CONTACTO_INICIAL', 
        'CALIFICACION',
        'PRESENTACION',
        'PROPUESTA',
        'NEGOCIACION',
        'CIERRE_GANADO',
        'CIERRE_PERDIDO',
        'SEGUIMIENTO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transition_type AS ENUM (
        'MANUAL',
        'AUTOMATIC', 
        'SCHEDULED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE loss_reason AS ENUM (
        'PRECIO',
        'COMPETENCIA',
        'PRESUPUESTO', 
        'TIMING',
        'NO_INTERES',
        'NO_CONTACTO',
        'OTRO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CREAR TABLA LEAD_PIPELINE
CREATE TABLE IF NOT EXISTS lead_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
    current_stage pipeline_stage NOT NULL DEFAULT 'LEAD_NUEVO',
    stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    won BOOLEAN,
    loss_reason loss_reason,
    loss_notes TEXT,
    total_value DECIMAL(15,2),
    probability_percent INTEGER DEFAULT 10 CHECK (probability_percent >= 0 AND probability_percent <= 100),
    expected_close_date DATE,
    last_activity_date TIMESTAMP WITH TIME ZONE,
    next_follow_up_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para performance
    UNIQUE(lead_id)
);

-- 3. CREAR TABLA PIPELINE_HISTORY
CREATE TABLE IF NOT EXISTS pipeline_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_pipeline_id UUID NOT NULL REFERENCES lead_pipeline(id) ON DELETE CASCADE,
    from_stage pipeline_stage,
    to_stage pipeline_stage NOT NULL,
    transition_type transition_type NOT NULL DEFAULT 'MANUAL',
    duration_in_stage_days INTEGER,
    notes TEXT,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- 4. CREAR TABLA PIPELINE_TRANSITIONS (Configuración de transiciones permitidas)
CREATE TABLE IF NOT EXISTS pipeline_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_stage pipeline_stage NOT NULL,
    to_stage pipeline_stage NOT NULL,
    is_allowed BOOLEAN DEFAULT true,
    auto_transition_days INTEGER,
    required_fields TEXT[],
    validation_rules JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(from_stage, to_stage)
);

-- 5. INSERTAR TRANSICIONES PERMITIDAS POR DEFECTO
INSERT INTO pipeline_transitions (from_stage, to_stage, is_allowed) VALUES
    ('LEAD_NUEVO', 'CONTACTO_INICIAL', true),
    ('CONTACTO_INICIAL', 'CALIFICACION', true),
    ('CALIFICACION', 'PRESENTACION', true),
    ('PRESENTACION', 'PROPUESTA', true),
    ('PROPUESTA', 'NEGOCIACION', true),
    ('NEGOCIACION', 'CIERRE_GANADO', true),
    ('NEGOCIACION', 'CIERRE_PERDIDO', true),
    ('CALIFICACION', 'CIERRE_PERDIDO', true),
    ('PRESENTACION', 'CIERRE_PERDIDO', true),
    ('PROPUESTA', 'CIERRE_PERDIDO', true),
    ('CIERRE_GANADO', 'SEGUIMIENTO', true),
    ('SEGUIMIENTO', 'CIERRE_GANADO', true)
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- 6. CREAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_lead_id ON lead_pipeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_stage ON lead_pipeline(current_stage);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_assigned ON lead_pipeline(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_pipeline_id ON pipeline_history(lead_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_changed_at ON pipeline_history(changed_at);

-- 7. FUNCIÓN PARA ACTUALIZAR UPDATED_AT AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. TRIGGER PARA ACTUALIZAR UPDATED_AT
DROP TRIGGER IF EXISTS update_lead_pipeline_updated_at ON lead_pipeline;
CREATE TRIGGER update_lead_pipeline_updated_at
    BEFORE UPDATE ON lead_pipeline
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. FUNCIÓN PARA CREAR PIPELINE AUTOMÁTICAMENTE AL CREAR LEAD
CREATE OR REPLACE FUNCTION create_pipeline_for_new_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear pipeline para el nuevo lead
    INSERT INTO lead_pipeline (
        lead_id,
        current_stage,
        probability_percent,
        total_value,
        expected_close_date
    ) VALUES (
        NEW.id,
        'LEAD_NUEVO'::pipeline_stage,
        10,
        CASE 
            WHEN NEW.ingresos IS NOT NULL THEN NEW.ingresos * 0.1
            ELSE 50000
        END,
        CURRENT_DATE + INTERVAL '30 days'
    );
    
    -- Crear entrada inicial en historial
    INSERT INTO pipeline_history (
        lead_pipeline_id,
        from_stage,
        to_stage,
        transition_type,
        notes
    ) VALUES (
        (SELECT id FROM lead_pipeline WHERE lead_id = NEW.id),
        NULL,
        'LEAD_NUEVO'::pipeline_stage,
        'AUTOMATIC'::transition_type,
        'Pipeline creado automáticamente'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. CREAR TRIGGER PARA PIPELINE AUTOMÁTICO
DROP TRIGGER IF EXISTS trigger_create_pipeline_for_new_lead ON "Lead";
CREATE TRIGGER trigger_create_pipeline_for_new_lead
    AFTER INSERT ON "Lead"
    FOR EACH ROW
    EXECUTE FUNCTION create_pipeline_for_new_lead();

-- 11. HABILITAR RLS (Row Level Security) SI ES NECESARIO
ALTER TABLE lead_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_transitions ENABLE ROW LEVEL SECURITY;

-- 12. CREAR POLÍTICAS RLS BÁSICAS (permitir todo por ahora)
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON lead_pipeline;
CREATE POLICY "Enable all operations for authenticated users" ON lead_pipeline
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON pipeline_history;
CREATE POLICY "Enable all operations for authenticated users" ON pipeline_history
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON pipeline_transitions;
CREATE POLICY "Enable all operations for authenticated users" ON pipeline_transitions
    FOR ALL USING (true);

-- 13. CREAR PIPELINES PARA LEADS EXISTENTES QUE NO LOS TENGAN
INSERT INTO lead_pipeline (lead_id, current_stage, probability_percent, total_value, expected_close_date)
SELECT 
    l.id,
    'LEAD_NUEVO'::pipeline_stage,
    10,
    CASE 
        WHEN l.ingresos IS NOT NULL THEN l.ingresos * 0.1
        ELSE 50000
    END,
    CURRENT_DATE + INTERVAL '30 days'
FROM "Lead" l
LEFT JOIN lead_pipeline lp ON l.id = lp.lead_id
WHERE lp.id IS NULL;

-- 14. CREAR HISTORIAL PARA PIPELINES EXISTENTES
INSERT INTO pipeline_history (lead_pipeline_id, from_stage, to_stage, transition_type, notes)
SELECT 
    lp.id,
    NULL,
    lp.current_stage,
    'AUTOMATIC'::transition_type,
    'Pipeline creado retroactivamente'
FROM lead_pipeline lp
LEFT JOIN pipeline_history ph ON lp.id = ph.lead_pipeline_id
WHERE ph.id IS NULL;

-- VERIFICACIÓN FINAL
SELECT 
    'lead_pipeline' as tabla,
    COUNT(*) as registros
FROM lead_pipeline
UNION ALL
SELECT 
    'pipeline_history' as tabla,
    COUNT(*) as registros
FROM pipeline_history
UNION ALL
SELECT 
    'pipeline_transitions' as tabla,
    COUNT(*) as registros
FROM pipeline_transitions;
