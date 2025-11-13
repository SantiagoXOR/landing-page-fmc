-- SQL CORREGIDO PARA CREAR TABLAS DEL PIPELINE
-- Ajustado para usar TEXT en lugar de UUID para compatibilidad con tabla Lead existente

-- 1. CREAR ENUM PARA ETAPAS DEL PIPELINE
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

-- 2. CREAR ENUM PARA TIPOS DE TRANSICIÓN
DO $$ BEGIN
    CREATE TYPE transition_type AS ENUM ('MANUAL', 'AUTOMATIC', 'SCHEDULED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CREAR ENUM PARA MOTIVOS DE PÉRDIDA
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

-- 4. TABLA DE CONFIGURACIÓN DE ETAPAS
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(100) NOT NULL,
    stage_type pipeline_stage UNIQUE NOT NULL,
    description TEXT,
    order_position INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    target_duration_days INTEGER,
    conversion_target_percent DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLA DE TRANSICIONES PERMITIDAS
CREATE TABLE IF NOT EXISTS pipeline_transitions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    from_stage pipeline_stage NOT NULL,
    to_stage pipeline_stage NOT NULL,
    transition_name VARCHAR(100) NOT NULL,
    is_allowed BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    auto_transition_days INTEGER,
    required_fields JSONB,
    validation_rules JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_stage, to_stage)
);

-- 6. TABLA PRINCIPAL DEL PIPELINE (CORREGIDA)
CREATE TABLE IF NOT EXISTS lead_pipeline (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id TEXT NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
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
    assigned_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lead_id)
);

-- 7. TABLA DE HISTORIAL DE TRANSICIONES
CREATE TABLE IF NOT EXISTS pipeline_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_pipeline_id TEXT NOT NULL REFERENCES lead_pipeline(id) ON DELETE CASCADE,
    from_stage pipeline_stage,
    to_stage pipeline_stage NOT NULL,
    transition_type transition_type DEFAULT 'MANUAL',
    duration_in_stage_days INTEGER,
    notes TEXT,
    changed_by TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- 8. TABLA DE ACTIVIDADES DEL PIPELINE
CREATE TABLE IF NOT EXISTS pipeline_activities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_pipeline_id TEXT NOT NULL REFERENCES lead_pipeline(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    assigned_to TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- 9. ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_lead_id ON lead_pipeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_stage ON lead_pipeline(current_stage);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_assigned ON lead_pipeline(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_pipeline_id ON pipeline_history(lead_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_date ON pipeline_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_activities_pipeline_id ON pipeline_activities(lead_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_activities_due_date ON pipeline_activities(due_date);

-- 10. POBLAR DATOS INICIALES DE CONFIGURACIÓN
INSERT INTO pipeline_stages (name, stage_type, description, order_position, target_duration_days, conversion_target_percent) VALUES
('Lead Nuevo', 'LEAD_NUEVO', 'Lead recién ingresado al sistema', 1, 1, 85.00),
('Contacto Inicial', 'CONTACTO_INICIAL', 'Primer contacto realizado con el lead', 2, 2, 75.00),
('Calificación', 'CALIFICACION', 'Lead evaluado y calificado', 3, 3, 65.00),
('Presentación', 'PRESENTACION', 'Producto/servicio presentado al lead', 4, 5, 50.00),
('Propuesta', 'PROPUESTA', 'Propuesta comercial enviada', 5, 7, 40.00),
('Negociación', 'NEGOCIACION', 'En proceso de negociación', 6, 10, 30.00),
('Cierre Ganado', 'CIERRE_GANADO', 'Lead convertido exitosamente', 7, NULL, NULL),
('Cierre Perdido', 'CIERRE_PERDIDO', 'Lead perdido', 8, NULL, NULL),
('Seguimiento', 'SEGUIMIENTO', 'Lead en seguimiento post-venta', 9, 30, 95.00)
ON CONFLICT (stage_type) DO NOTHING;

-- 11. POBLAR TRANSICIONES PERMITIDAS
INSERT INTO pipeline_transitions (from_stage, to_stage, transition_name, is_allowed) VALUES
('LEAD_NUEVO', 'CONTACTO_INICIAL', 'Realizar contacto inicial', true),
('LEAD_NUEVO', 'CIERRE_PERDIDO', 'Marcar como perdido', true),
('CONTACTO_INICIAL', 'CALIFICACION', 'Calificar lead', true),
('CONTACTO_INICIAL', 'CIERRE_PERDIDO', 'Marcar como perdido', true),
('CALIFICACION', 'PRESENTACION', 'Programar presentación', true),
('CALIFICACION', 'CIERRE_PERDIDO', 'Marcar como perdido', true),
('PRESENTACION', 'PROPUESTA', 'Enviar propuesta', true),
('PRESENTACION', 'CIERRE_PERDIDO', 'Marcar como perdido', true),
('PROPUESTA', 'NEGOCIACION', 'Iniciar negociación', true),
('PROPUESTA', 'CIERRE_PERDIDO', 'Marcar como perdido', true),
('NEGOCIACION', 'CIERRE_GANADO', 'Cerrar como ganado', true),
('NEGOCIACION', 'CIERRE_PERDIDO', 'Marcar como perdido', true),
('CIERRE_GANADO', 'SEGUIMIENTO', 'Iniciar seguimiento', true)
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- 12. FUNCIÓN PARA MOVER LEADS EN EL PIPELINE
CREATE OR REPLACE FUNCTION move_lead_to_stage(
    p_lead_id TEXT,
    p_new_stage pipeline_stage,
    p_notes TEXT DEFAULT NULL,
    p_changed_by TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_pipeline_id TEXT;
    v_current_stage pipeline_stage;
    v_stage_entered_at TIMESTAMP WITH TIME ZONE;
    v_duration_days INTEGER;
BEGIN
    -- Obtener pipeline actual
    SELECT id, current_stage, stage_entered_at 
    INTO v_pipeline_id, v_current_stage, v_stage_entered_at
    FROM lead_pipeline 
    WHERE lead_id = p_lead_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead not found in pipeline: %', p_lead_id;
    END IF;
    
    -- Calcular duración en etapa actual
    v_duration_days := EXTRACT(DAY FROM NOW() - v_stage_entered_at);
    
    -- Actualizar pipeline
    UPDATE lead_pipeline 
    SET 
        current_stage = p_new_stage,
        stage_entered_at = NOW(),
        updated_at = NOW(),
        closed_at = CASE 
            WHEN p_new_stage IN ('CIERRE_GANADO', 'CIERRE_PERDIDO') THEN NOW()
            ELSE NULL 
        END,
        won = CASE 
            WHEN p_new_stage = 'CIERRE_GANADO' THEN true
            WHEN p_new_stage = 'CIERRE_PERDIDO' THEN false
            ELSE NULL 
        END
    WHERE lead_id = p_lead_id;
    
    -- Crear entrada en historial
    INSERT INTO pipeline_history (
        lead_pipeline_id, 
        from_stage, 
        to_stage, 
        duration_in_stage_days, 
        notes, 
        changed_by
    ) VALUES (
        v_pipeline_id, 
        v_current_stage, 
        p_new_stage, 
        v_duration_days, 
        p_notes, 
        p_changed_by
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 13. FUNCIÓN PARA OBTENER MÉTRICAS DEL PIPELINE
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
        COUNT(lp.id) as total_leads,
        ROUND(AVG(EXTRACT(DAY FROM COALESCE(lp.closed_at, NOW()) - lp.stage_entered_at)), 2) as avg_duration_days,
        ROUND(
            CASE 
                WHEN lp.current_stage = 'CIERRE_GANADO' THEN 100.0
                WHEN lp.current_stage = 'CIERRE_PERDIDO' THEN 0.0
                ELSE AVG(lp.probability_percent)
            END, 2
        ) as conversion_rate
    FROM lead_pipeline lp
    WHERE (p_date_from IS NULL OR lp.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR lp.created_at::date <= p_date_to)
    GROUP BY lp.current_stage
    ORDER BY 
        CASE lp.current_stage
            WHEN 'LEAD_NUEVO' THEN 1
            WHEN 'CONTACTO_INICIAL' THEN 2
            WHEN 'CALIFICACION' THEN 3
            WHEN 'PRESENTACION' THEN 4
            WHEN 'PROPUESTA' THEN 5
            WHEN 'NEGOCIACION' THEN 6
            WHEN 'CIERRE_GANADO' THEN 7
            WHEN 'CIERRE_PERDIDO' THEN 8
            WHEN 'SEGUIMIENTO' THEN 9
        END;
END;
$$ LANGUAGE plpgsql;
