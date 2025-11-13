-- DATOS INICIALES PARA PIPELINE DE VENTAS - PHORENCIAL CRM
-- =====================================================
-- Este script pobla las etapas del pipeline y transiciones permitidas

BEGIN;

-- 1. INSERTAR ETAPAS DEL PIPELINE
-- =====================================================

INSERT INTO pipeline_stages (name, stage_type, description, order_position, color, target_duration_days, conversion_target_percent) VALUES
('Lead Nuevo', 'LEAD_NUEVO', 'Lead recién ingresado al sistema', 1, '#6B7280', 1, 85.0),
('Contacto Inicial', 'CONTACTO_INICIAL', 'Primer contacto realizado con el lead', 2, '#3B82F6', 2, 75.0),
('Calificación', 'CALIFICACION', 'Lead calificado y evaluado', 3, '#8B5CF6', 3, 65.0),
('Presentación', 'PRESENTACION', 'Presentación de producto/servicio realizada', 4, '#06B6D4', 5, 50.0),
('Propuesta', 'PROPUESTA', 'Propuesta comercial enviada', 5, '#F59E0B', 7, 40.0),
('Negociación', 'NEGOCIACION', 'En proceso de negociación', 6, '#F97316', 10, 30.0),
('Cierre Ganado', 'CIERRE_GANADO', 'Venta cerrada exitosamente', 7, '#10B981', NULL, NULL),
('Cierre Perdido', 'CIERRE_PERDIDO', 'Venta perdida', 8, '#EF4444', NULL, NULL),
('Seguimiento', 'SEGUIMIENTO', 'En seguimiento post-venta', 9, '#84CC16', 30, 95.0)
ON CONFLICT (stage_type) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    order_position = EXCLUDED.order_position,
    color = EXCLUDED.color,
    target_duration_days = EXCLUDED.target_duration_days,
    conversion_target_percent = EXCLUDED.conversion_target_percent,
    updated_at = NOW();

-- Marcar etapas finales
UPDATE pipeline_stages 
SET is_final = true 
WHERE stage_type IN ('CIERRE_GANADO', 'CIERRE_PERDIDO');

-- 2. INSERTAR TRANSICIONES PERMITIDAS
-- =====================================================

-- Transiciones desde LEAD_NUEVO
INSERT INTO pipeline_transitions (from_stage, to_stage, transition_name, auto_transition_days) VALUES
('LEAD_NUEVO', 'CONTACTO_INICIAL', 'Realizar contacto inicial', 2),
('LEAD_NUEVO', 'CIERRE_PERDIDO', 'Marcar como perdido', NULL)
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- Transiciones desde CONTACTO_INICIAL
INSERT INTO pipeline_transitions (from_stage, to_stage, transition_name, auto_transition_days) VALUES
('CONTACTO_INICIAL', 'CALIFICACION', 'Calificar lead', NULL),
('CONTACTO_INICIAL', 'CIERRE_PERDIDO', 'Marcar como perdido', 5)
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- Transiciones desde CALIFICACION
INSERT INTO pipeline_transitions (from_stage, to_stage, transition_name, auto_transition_days) VALUES
('CALIFICACION', 'PRESENTACION', 'Programar presentación', NULL),
('CALIFICACION', 'PROPUESTA', 'Enviar propuesta directa', NULL),
('CALIFICACION', 'CIERRE_PERDIDO', 'Marcar como perdido', NULL)
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- Transiciones desde PRESENTACION
INSERT INTO pipeline_transitions (from_stage, to_stage, transition_name, auto_transition_days) VALUES
('PRESENTACION', 'PROPUESTA', 'Enviar propuesta', NULL),
('PRESENTACION', 'NEGOCIACION', 'Iniciar negociación', NULL),
('PRESENTACION', 'CIERRE_PERDIDO', 'Marcar como perdido', 7)
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- Transiciones desde PROPUESTA
INSERT INTO pipeline_transitions (from_stage, to_stage, transition_name, auto_transition_days) VALUES
('PROPUESTA', 'NEGOCIACION', 'Iniciar negociación', NULL),
('PROPUESTA', 'CIERRE_GANADO', 'Cerrar venta', NULL),
('PROPUESTA', 'CIERRE_PERDIDO', 'Marcar como perdido', 14)
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- Transiciones desde NEGOCIACION
INSERT INTO pipeline_transitions (from_stage, to_stage, transition_name, auto_transition_days) VALUES
('NEGOCIACION', 'CIERRE_GANADO', 'Cerrar venta', NULL),
('NEGOCIACION', 'CIERRE_PERDIDO', 'Marcar como perdido', NULL),
('NEGOCIACION', 'PROPUESTA', 'Revisar propuesta', NULL)
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- Transiciones desde CIERRE_GANADO
INSERT INTO pipeline_transitions (from_stage, to_stage, transition_name) VALUES
('CIERRE_GANADO', 'SEGUIMIENTO', 'Iniciar seguimiento post-venta')
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- 3. MIGRAR LEADS EXISTENTES AL PIPELINE
-- =====================================================

-- Insertar leads existentes en el pipeline basándose en su estado actual
INSERT INTO lead_pipeline (lead_id, current_stage, assigned_to, created_at, updated_at)
SELECT 
    l.id as lead_id,
    CASE 
        WHEN l.estado = 'NUEVO' THEN 'LEAD_NUEVO'::pipeline_stage
        WHEN l.estado = 'CONTACTADO' THEN 'CONTACTO_INICIAL'::pipeline_stage
        WHEN l.estado = 'CALIFICADO' THEN 'CALIFICACION'::pipeline_stage
        WHEN l.estado = 'PRESENTACION' THEN 'PRESENTACION'::pipeline_stage
        WHEN l.estado = 'PROPUESTA' THEN 'PROPUESTA'::pipeline_stage
        WHEN l.estado = 'NEGOCIACION' THEN 'NEGOCIACION'::pipeline_stage
        WHEN l.estado = 'PREAPROBADO' THEN 'CIERRE_GANADO'::pipeline_stage
        WHEN l.estado = 'RECHAZADO' THEN 'CIERRE_PERDIDO'::pipeline_stage
        WHEN l.estado = 'DOCUMENTACION_PENDIENTE' THEN 'PROPUESTA'::pipeline_stage
        WHEN l.estado = 'DERIVADO' THEN 'SEGUIMIENTO'::pipeline_stage
        ELSE 'LEAD_NUEVO'::pipeline_stage
    END as current_stage,
    NULL as assigned_to, -- Se asignará posteriormente
    l.created_at,
    l.updated_at
FROM leads l
WHERE NOT EXISTS (
    SELECT 1 FROM lead_pipeline lp WHERE lp.lead_id = l.id
);

-- 4. CREAR HISTORIAL INICIAL PARA LEADS MIGRADOS
-- =====================================================

INSERT INTO pipeline_history (lead_pipeline_id, from_stage, to_stage, duration_in_stage_days, notes, changed_at)
SELECT 
    lp.id as lead_pipeline_id,
    NULL as from_stage,
    lp.current_stage as to_stage,
    EXTRACT(DAY FROM NOW() - lp.created_at) as duration_in_stage_days,
    'Migración inicial al pipeline' as notes,
    lp.created_at as changed_at
FROM lead_pipeline lp
WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_history ph WHERE ph.lead_pipeline_id = lp.id
);

-- 5. CONFIGURAR VALORES ESTIMADOS PARA LEADS EXISTENTES
-- =====================================================

-- Asignar valores estimados basados en ingresos del lead
UPDATE lead_pipeline 
SET 
    total_value = CASE 
        WHEN l.ingresos IS NOT NULL THEN l.ingresos * 0.1 -- 10% de los ingresos como valor estimado
        ELSE 50000 -- Valor por defecto
    END,
    probability_percent = CASE 
        WHEN current_stage = 'LEAD_NUEVO' THEN 10
        WHEN current_stage = 'CONTACTO_INICIAL' THEN 20
        WHEN current_stage = 'CALIFICACION' THEN 30
        WHEN current_stage = 'PRESENTACION' THEN 50
        WHEN current_stage = 'PROPUESTA' THEN 70
        WHEN current_stage = 'NEGOCIACION' THEN 80
        WHEN current_stage = 'CIERRE_GANADO' THEN 100
        WHEN current_stage = 'CIERRE_PERDIDO' THEN 0
        WHEN current_stage = 'SEGUIMIENTO' THEN 100
        ELSE 10
    END,
    expected_close_date = CASE 
        WHEN current_stage IN ('CIERRE_GANADO', 'CIERRE_PERDIDO') THEN CURRENT_DATE
        ELSE CURRENT_DATE + INTERVAL '30 days'
    END
FROM leads l
WHERE lead_pipeline.lead_id = l.id;

-- 6. CREAR ACTIVIDADES INICIALES PARA LEADS EN PIPELINE
-- =====================================================

-- Crear actividades de seguimiento para leads que necesitan acción
INSERT INTO pipeline_activities (lead_pipeline_id, activity_type, subject, description, scheduled_at, assigned_to, created_by)
SELECT 
    lp.id as lead_pipeline_id,
    'task' as activity_type,
    CASE 
        WHEN lp.current_stage = 'LEAD_NUEVO' THEN 'Realizar contacto inicial'
        WHEN lp.current_stage = 'CONTACTO_INICIAL' THEN 'Calificar lead'
        WHEN lp.current_stage = 'CALIFICACION' THEN 'Programar presentación'
        WHEN lp.current_stage = 'PRESENTACION' THEN 'Enviar propuesta'
        WHEN lp.current_stage = 'PROPUESTA' THEN 'Seguimiento de propuesta'
        WHEN lp.current_stage = 'NEGOCIACION' THEN 'Cerrar negociación'
        ELSE 'Seguimiento general'
    END as subject,
    'Actividad generada automáticamente durante migración al pipeline' as description,
    NOW() + INTERVAL '1 day' as scheduled_at,
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1) as assigned_to,
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1) as created_by
FROM lead_pipeline lp
WHERE lp.current_stage NOT IN ('CIERRE_GANADO', 'CIERRE_PERDIDO', 'SEGUIMIENTO');

COMMIT;

-- 7. VERIFICACIÓN DE DATOS
-- =====================================================

-- Mostrar resumen del pipeline creado
SELECT 
    ps.name as etapa,
    ps.stage_type,
    COUNT(lp.id) as total_leads,
    ps.target_duration_days as duracion_objetivo,
    ps.conversion_target_percent as meta_conversion
FROM pipeline_stages ps
LEFT JOIN lead_pipeline lp ON ps.stage_type = lp.current_stage
GROUP BY ps.id, ps.name, ps.stage_type, ps.order_position, ps.target_duration_days, ps.conversion_target_percent
ORDER BY ps.order_position;

-- Mostrar transiciones configuradas
SELECT 
    pt.from_stage as desde,
    pt.to_stage as hacia,
    pt.transition_name as transicion,
    pt.auto_transition_days as dias_auto
FROM pipeline_transitions pt
ORDER BY pt.from_stage, pt.to_stage;
