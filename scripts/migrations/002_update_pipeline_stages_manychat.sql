-- MIGRACIÓN: Actualizar Pipeline Stages para integración ManyChat
-- ==============================================================
-- Esta migración actualiza las etapas del pipeline para alinearlas
-- con las automatizaciones de ManyChat y crea la tabla de mapeo.

BEGIN;

-- 1. ACTUALIZAR ENUM pipeline_stage
-- ==============================================================

-- Renombrar el enum actual
ALTER TYPE pipeline_stage RENAME TO pipeline_stage_old;

-- Crear nuevo enum con las etapas actualizadas
CREATE TYPE pipeline_stage AS ENUM (
    'CLIENTE_NUEVO',           -- lead-nuevo
    'CONSULTANDO_CREDITO',     -- lead-consultando
    'SOLICITANDO_DOCS',        -- solicitando-documentos
    'LISTO_ANALISIS',          -- solicitud-en-proceso
    'PREAPROBADO',             -- credito-preaprobado
    'APROBADO',                -- credito-aprobado
    'EN_SEGUIMIENTO',          -- en-seguimiento
    'CERRADO_GANADO',          -- venta-cerrada
    'ENCUESTA',                -- encuesta-pendiente
    'RECHAZADO',               -- credito-rechazado
    'SOLICITAR_REFERIDO'       -- solicitar-referido
);

-- Actualizar columnas que usan el enum antiguo
ALTER TABLE lead_pipeline 
    ALTER COLUMN current_stage TYPE pipeline_stage 
    USING current_stage::text::pipeline_stage;

ALTER TABLE pipeline_history 
    ALTER COLUMN from_stage TYPE pipeline_stage 
    USING from_stage::text::pipeline_stage;

ALTER TABLE pipeline_history 
    ALTER COLUMN to_stage TYPE pipeline_stage 
    USING to_stage::text::pipeline_stage;

ALTER TABLE pipeline_stages 
    ALTER COLUMN stage_type TYPE pipeline_stage 
    USING stage_type::text::pipeline_stage;

ALTER TABLE pipeline_transitions 
    ALTER COLUMN from_stage TYPE pipeline_stage 
    USING from_stage::text::pipeline_stage;

ALTER TABLE pipeline_transitions 
    ALTER COLUMN to_stage TYPE pipeline_stage 
    USING to_stage::text::pipeline_stage;

-- Eliminar enum antiguo
DROP TYPE pipeline_stage_old;

-- 2. CREAR TABLA pipeline_stage_tags
-- ==============================================================

CREATE TABLE IF NOT EXISTS pipeline_stage_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage pipeline_stage UNIQUE NOT NULL,
    manychat_tag VARCHAR(100) NOT NULL,
    tag_type VARCHAR(20) DEFAULT 'pipeline' CHECK (tag_type IN ('pipeline', 'business')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas por tag
CREATE INDEX idx_pipeline_stage_tags_manychat_tag 
    ON pipeline_stage_tags(manychat_tag);

-- Índice para búsquedas por tipo
CREATE INDEX idx_pipeline_stage_tags_type 
    ON pipeline_stage_tags(tag_type);

-- Trigger para updated_at
CREATE TRIGGER update_pipeline_stage_tags_updated_at 
    BEFORE UPDATE ON pipeline_stage_tags
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 3. INSERTAR MAPEO INICIAL
-- ==============================================================

INSERT INTO pipeline_stage_tags (stage, manychat_tag, description) VALUES
    ('CLIENTE_NUEVO', 'lead-nuevo', 'Cliente nuevo que acaba de ingresar al sistema'),
    ('CONSULTANDO_CREDITO', 'lead-consultando', 'Cliente consultando opciones de crédito'),
    ('SOLICITANDO_DOCS', 'solicitando-documentos', 'Solicitando documentación al cliente'),
    ('LISTO_ANALISIS', 'solicitud-en-proceso', 'Documentación completa, listo para análisis'),
    ('PREAPROBADO', 'credito-preaprobado', 'Crédito preaprobado por el sistema'),
    ('APROBADO', 'credito-aprobado', 'Crédito aprobado finalmente'),
    ('EN_SEGUIMIENTO', 'en-seguimiento', 'Cliente en seguimiento post-aprobación'),
    ('CERRADO_GANADO', 'venta-cerrada', 'Venta cerrada exitosamente'),
    ('ENCUESTA', 'encuesta-pendiente', 'Pendiente de enviar encuesta de satisfacción'),
    ('RECHAZADO', 'credito-rechazado', 'Crédito rechazado'),
    ('SOLICITAR_REFERIDO', 'solicitar-referido', 'Solicitar referidos al cliente');

-- Marcar tags de negocio (que no son parte del pipeline)
INSERT INTO pipeline_stage_tags (stage, manychat_tag, tag_type, description, is_active) VALUES
    ('CLIENTE_NUEVO', 'atencion-humana', 'business', 'Cliente requiere atención humana inmediata', true),
    ('CERRADO_GANADO', 'venta-concretada', 'business', 'Venta concretada (alias de venta-cerrada)', true)
ON CONFLICT (stage) DO NOTHING;

-- 4. ACTUALIZAR FUNCIÓN move_lead_to_stage PARA SOPORTAR NUEVAS ETAPAS
-- ==============================================================

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
    IF p_new_stage IN ('CERRADO_GANADO', 'RECHAZADO') THEN
        UPDATE lead_pipeline 
        SET 
            closed_at = NOW(),
            won = (p_new_stage = 'CERRADO_GANADO')
        WHERE id = current_pipeline.id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCIÓN PARA OBTENER TAG DE UNA ETAPA
-- ==============================================================

CREATE OR REPLACE FUNCTION get_manychat_tag_for_stage(
    p_stage pipeline_stage
) RETURNS VARCHAR AS $$
DECLARE
    v_tag VARCHAR;
BEGIN
    SELECT manychat_tag INTO v_tag
    FROM pipeline_stage_tags
    WHERE stage = p_stage
    AND tag_type = 'pipeline'
    AND is_active = true
    LIMIT 1;
    
    RETURN v_tag;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNCIÓN PARA OBTENER TODOS LOS TAGS DE PIPELINE
-- ==============================================================

CREATE OR REPLACE FUNCTION get_all_pipeline_tags()
RETURNS TABLE (tag VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT manychat_tag as tag
    FROM pipeline_stage_tags
    WHERE tag_type = 'pipeline'
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Comentarios finales
COMMENT ON TABLE pipeline_stage_tags IS 'Mapeo entre etapas del pipeline CRM y tags de ManyChat para activar automatizaciones';
COMMENT ON COLUMN pipeline_stage_tags.stage IS 'Etapa del pipeline en el CRM';
COMMENT ON COLUMN pipeline_stage_tags.manychat_tag IS 'Tag correspondiente en ManyChat que activa la automatización';
COMMENT ON COLUMN pipeline_stage_tags.tag_type IS 'Tipo de tag: pipeline (se reemplaza) o business (se mantiene)';

