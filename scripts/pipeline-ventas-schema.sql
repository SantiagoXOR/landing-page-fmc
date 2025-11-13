-- PIPELINE DE VENTAS BÁSICO - PHORENCIAL CRM
-- =====================================================
-- Este script crea un sistema completo de pipeline de ventas con etapas, transiciones y métricas

BEGIN;

-- 1. ENUM TYPES PARA PIPELINE
-- =====================================================

-- Estados del pipeline de ventas
CREATE TYPE pipeline_stage AS ENUM (
    'LEAD_NUEVO',           -- Lead recién ingresado
    'CONTACTO_INICIAL',     -- Primer contacto realizado
    'CALIFICACION',         -- Lead calificado y evaluado
    'PRESENTACION',         -- Presentación de producto/servicio
    'PROPUESTA',            -- Propuesta comercial enviada
    'NEGOCIACION',          -- En proceso de negociación
    'CIERRE_GANADO',        -- Venta cerrada exitosamente
    'CIERRE_PERDIDO',       -- Venta perdida
    'SEGUIMIENTO'           -- En seguimiento post-venta
);

-- Tipos de transición
CREATE TYPE transition_type AS ENUM (
    'MANUAL',               -- Transición manual por usuario
    'AUTOMATIC',            -- Transición automática por reglas
    'SCHEDULED'             -- Transición programada
);

-- Motivos de pérdida
CREATE TYPE loss_reason AS ENUM (
    'PRECIO',               -- Precio muy alto
    'COMPETENCIA',          -- Eligió competencia
    'PRESUPUESTO',          -- Sin presupuesto
    'TIMING',               -- Mal momento
    'NO_INTERES',           -- Perdió interés
    'NO_CONTACTO',          -- No se pudo contactar
    'OTRO'                  -- Otro motivo
);

-- 2. TABLA PIPELINE_STAGES (Configuración de Etapas)
-- =====================================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    stage_type pipeline_stage NOT NULL UNIQUE,
    description TEXT,
    order_position INTEGER NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Color hex para UI
    
    -- Configuración de etapa
    is_active BOOLEAN DEFAULT true,
    is_final BOOLEAN DEFAULT false,     -- Etapa final (ganado/perdido)
    requires_approval BOOLEAN DEFAULT false,
    
    -- Métricas y metas
    target_duration_days INTEGER,      -- Duración objetivo en días
    conversion_target_percent DECIMAL(5,2), -- Meta de conversión %
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- 3. TABLA PIPELINE_TRANSITIONS (Transiciones Permitidas)
-- =====================================================
CREATE TABLE IF NOT EXISTS pipeline_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_stage pipeline_stage NOT NULL,
    to_stage pipeline_stage NOT NULL,
    transition_name VARCHAR(100) NOT NULL,
    
    -- Configuración de transición
    is_allowed BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    auto_transition_days INTEGER,      -- Días para transición automática
    
    -- Condiciones
    required_fields JSONB,             -- Campos requeridos para transición
    validation_rules JSONB,            -- Reglas de validación
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar duplicados
    UNIQUE(from_stage, to_stage)
);

-- 4. TABLA LEAD_PIPELINE (Estado de Leads en Pipeline)
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_pipeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Estado actual
    current_stage pipeline_stage NOT NULL DEFAULT 'LEAD_NUEVO',
    stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Información de cierre
    closed_at TIMESTAMP WITH TIME ZONE,
    won BOOLEAN,                       -- true = ganado, false = perdido
    loss_reason loss_reason,
    loss_notes TEXT,
    
    -- Métricas
    total_value DECIMAL(12,2),         -- Valor total del deal
    probability_percent INTEGER DEFAULT 0 CHECK (probability_percent >= 0 AND probability_percent <= 100),
    
    -- Fechas importantes
    expected_close_date DATE,
    last_activity_date DATE,
    next_follow_up_date DATE,
    
    -- Asignación
    assigned_to UUID REFERENCES users(id),
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para un lead por pipeline
    UNIQUE(lead_id)
);

-- 5. TABLA PIPELINE_HISTORY (Historial de Transiciones)
-- =====================================================
CREATE TABLE IF NOT EXISTS pipeline_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_pipeline_id UUID NOT NULL REFERENCES lead_pipeline(id) ON DELETE CASCADE,
    
    -- Transición
    from_stage pipeline_stage,
    to_stage pipeline_stage NOT NULL,
    transition_type transition_type DEFAULT 'MANUAL',
    
    -- Información de la transición
    duration_in_stage_days INTEGER,   -- Días en etapa anterior
    notes TEXT,
    
    -- Usuario y timestamp
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Datos adicionales
    metadata JSONB                     -- Datos adicionales de la transición
);

-- 6. TABLA PIPELINE_ACTIVITIES (Actividades del Pipeline)
-- =====================================================
CREATE TABLE IF NOT EXISTS pipeline_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_pipeline_id UUID NOT NULL REFERENCES lead_pipeline(id) ON DELETE CASCADE,
    
    -- Tipo de actividad
    activity_type VARCHAR(50) NOT NULL, -- call, email, meeting, task, note
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Programación
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT false,
    
    -- Asignación
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Lead Pipeline
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_lead_id ON lead_pipeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_stage ON lead_pipeline(current_stage);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_assigned ON lead_pipeline(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_stage_entered ON lead_pipeline(stage_entered_at);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_expected_close ON lead_pipeline(expected_close_date);

-- Pipeline History
CREATE INDEX IF NOT EXISTS idx_pipeline_history_lead ON pipeline_history(lead_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_stage ON pipeline_history(to_stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_date ON pipeline_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_user ON pipeline_history(changed_by);

-- Pipeline Activities
CREATE INDEX IF NOT EXISTS idx_pipeline_activities_lead ON pipeline_activities(lead_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_activities_type ON pipeline_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_activities_scheduled ON pipeline_activities(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_activities_assigned ON pipeline_activities(assigned_to);

-- Pipeline Stages
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON pipeline_stages(order_position);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_active ON pipeline_stages(is_active);

-- 8. TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para pipeline_stages
CREATE TRIGGER update_pipeline_stages_updated_at 
    BEFORE UPDATE ON pipeline_stages
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para lead_pipeline
CREATE TRIGGER update_lead_pipeline_updated_at 
    BEFORE UPDATE ON lead_pipeline
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para pipeline_activities
CREATE TRIGGER update_pipeline_activities_updated_at 
    BEFORE UPDATE ON pipeline_activities
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 9. FUNCIONES DE UTILIDAD PARA PIPELINE
-- =====================================================

-- Función para mover lead a siguiente etapa
CREATE OR REPLACE FUNCTION move_lead_to_stage(
    p_lead_id UUID,
    p_new_stage pipeline_stage,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_pipeline RECORD;
    stage_duration INTEGER;
BEGIN
    -- Obtener pipeline actual del lead
    SELECT * INTO current_pipeline 
    FROM lead_pipeline 
    WHERE lead_id = p_lead_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead not found in pipeline: %', p_lead_id;
    END IF;
    
    -- Calcular duración en etapa actual
    stage_duration := EXTRACT(DAY FROM NOW() - current_pipeline.stage_entered_at);
    
    -- Insertar en historial
    INSERT INTO pipeline_history (
        lead_pipeline_id,
        from_stage,
        to_stage,
        duration_in_stage_days,
        notes,
        changed_by
    ) VALUES (
        current_pipeline.id,
        current_pipeline.current_stage,
        p_new_stage,
        stage_duration,
        p_notes,
        p_user_id
    );
    
    -- Actualizar pipeline actual
    UPDATE lead_pipeline 
    SET 
        current_stage = p_new_stage,
        stage_entered_at = NOW(),
        updated_at = NOW()
    WHERE id = current_pipeline.id;
    
    -- Si es etapa final, marcar como cerrado
    IF p_new_stage IN ('CIERRE_GANADO', 'CIERRE_PERDIDO') THEN
        UPDATE lead_pipeline 
        SET 
            closed_at = NOW(),
            won = (p_new_stage = 'CIERRE_GANADO')
        WHERE id = current_pipeline.id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener métricas del pipeline
CREATE OR REPLACE FUNCTION get_pipeline_metrics(
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    stage pipeline_stage,
    total_leads BIGINT,
    avg_duration_days NUMERIC,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lp.current_stage as stage,
        COUNT(*) as total_leads,
        AVG(EXTRACT(DAY FROM NOW() - lp.stage_entered_at)) as avg_duration_days,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN lp.won = true THEN 1 END) * 100.0 / COUNT(*))
            ELSE 0 
        END as conversion_rate
    FROM lead_pipeline lp
    WHERE (p_date_from IS NULL OR lp.created_at >= p_date_from)
    AND (p_date_to IS NULL OR lp.created_at <= p_date_to)
    GROUP BY lp.current_stage
    ORDER BY lp.current_stage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
