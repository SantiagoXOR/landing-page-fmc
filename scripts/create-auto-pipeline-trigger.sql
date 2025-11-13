-- SQL PARA CREAR TRIGGER AUTOMÁTICO DE PIPELINE
-- Ejecutar en Supabase SQL Editor

-- 1. FUNCIÓN PARA CREAR PIPELINE AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION create_pipeline_for_new_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear pipeline para el nuevo lead
    INSERT INTO lead_pipeline (
        lead_id,
        current_stage,
        probability_percent,
        total_value,
        expected_close_date,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        'LEAD_NUEVO'::pipeline_stage,
        10,
        CASE 
            WHEN NEW.ingresos IS NOT NULL THEN NEW.ingresos * 0.1
            ELSE 50000
        END,
        CURRENT_DATE + INTERVAL '30 days',
        NOW(),
        NOW()
    );
    
    -- Crear entrada inicial en historial
    INSERT INTO pipeline_history (
        lead_pipeline_id,
        from_stage,
        to_stage,
        transition_type,
        notes,
        changed_at
    ) VALUES (
        (SELECT id FROM lead_pipeline WHERE lead_id = NEW.id),
        NULL,
        'LEAD_NUEVO'::pipeline_stage,
        'AUTOMATIC'::transition_type,
        'Pipeline creado automáticamente',
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. CREAR TRIGGER PARA EJECUTAR LA FUNCIÓN
DROP TRIGGER IF EXISTS trigger_create_pipeline_for_new_lead ON "Lead";

CREATE TRIGGER trigger_create_pipeline_for_new_lead
    AFTER INSERT ON "Lead"
    FOR EACH ROW
    EXECUTE FUNCTION create_pipeline_for_new_lead();

-- 3. FUNCIÓN PARA ACTUALIZAR PIPELINE CUANDO SE ACTUALIZA LEAD
CREATE OR REPLACE FUNCTION update_pipeline_for_lead_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar valor total si cambió el ingreso
    IF OLD.ingresos IS DISTINCT FROM NEW.ingresos THEN
        UPDATE lead_pipeline 
        SET 
            total_value = CASE 
                WHEN NEW.ingresos IS NOT NULL THEN NEW.ingresos * 0.1
                ELSE 50000
            END,
            updated_at = NOW()
        WHERE lead_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. CREAR TRIGGER PARA ACTUALIZACIONES
DROP TRIGGER IF EXISTS trigger_update_pipeline_for_lead_changes ON "Lead";

CREATE TRIGGER trigger_update_pipeline_for_lead_changes
    AFTER UPDATE ON "Lead"
    FOR EACH ROW
    EXECUTE FUNCTION update_pipeline_for_lead_changes();

-- 5. FUNCIÓN PARA LIMPIAR PIPELINE CUANDO SE ELIMINA LEAD (redundante con CASCADE pero por seguridad)
CREATE OR REPLACE FUNCTION cleanup_pipeline_for_deleted_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- El CASCADE ya debería manejar esto, pero por seguridad
    DELETE FROM lead_pipeline WHERE lead_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 6. CREAR TRIGGER PARA ELIMINACIONES
DROP TRIGGER IF EXISTS trigger_cleanup_pipeline_for_deleted_lead ON "Lead";

CREATE TRIGGER trigger_cleanup_pipeline_for_deleted_lead
    BEFORE DELETE ON "Lead"
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_pipeline_for_deleted_lead();
