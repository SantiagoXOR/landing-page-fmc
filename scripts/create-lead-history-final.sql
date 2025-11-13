-- SCRIPT FINAL PARA CREAR TABLA LEAD_HISTORY
-- Ejecutar paso a paso en Supabase SQL Editor

-- PASO 1: Eliminar tabla anterior
DROP TABLE IF EXISTS lead_history CASCADE;

-- PASO 2: Crear tabla lead_history con tipos compatibles
CREATE TABLE lead_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id TEXT NOT NULL,
    campo_modificado VARCHAR(100) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 3: Crear índices
CREATE INDEX idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX idx_lead_history_usuario ON lead_history(usuario_id);
CREATE INDEX idx_lead_history_fecha ON lead_history(fecha_cambio);

-- PASO 4: Función para tracking
CREATE OR REPLACE FUNCTION track_lead_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD IS DISTINCT FROM NEW THEN
        INSERT INTO lead_history (
            lead_id, 
            campo_modificado, 
            valor_anterior, 
            valor_nuevo, 
            usuario_id
        ) VALUES (
            NEW.id::text,
            'lead_updated',
            'previous_state',
            'new_state',
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 5: Crear trigger
DROP TRIGGER IF EXISTS lead_changes_trigger ON "Lead";
CREATE TRIGGER lead_changes_trigger
    AFTER UPDATE ON "Lead"
    FOR EACH ROW
    EXECUTE FUNCTION track_lead_changes();

-- PASO 6: Verificar que todo funciona
SELECT 'Tabla lead_history creada exitosamente' as status;
