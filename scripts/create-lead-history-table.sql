-- SQL PARA CREAR TABLA LEAD_HISTORY FALTANTE
-- Ejecutar en Supabase SQL Editor

-- 1. CREAR TABLA LEAD_HISTORY
CREATE TABLE IF NOT EXISTS lead_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id TEXT NOT NULL,
    campo_modificado VARCHAR(100) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREAR ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_usuario ON lead_history(usuario_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_fecha ON lead_history(fecha_cambio);

-- 3. AGREGAR FOREIGN KEY CONSTRAINT (si no existe)
DO $$ 
BEGIN
    -- Verificar si la constraint ya existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_lead_history_lead_id' 
        AND table_name = 'lead_history'
    ) THEN
        -- Agregar foreign key constraint
        ALTER TABLE lead_history 
        ADD CONSTRAINT fk_lead_history_lead_id 
        FOREIGN KEY (lead_id) REFERENCES "Lead"(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. FUNCIÓN PARA TRACKING DE CAMBIOS (actualizada)
CREATE OR REPLACE FUNCTION track_lead_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo procesar si hay cambios reales
    IF OLD IS DISTINCT FROM NEW THEN
        -- Insertar cambios en historial para cada campo modificado
        INSERT INTO lead_history (lead_id, campo_modificado, valor_anterior, valor_nuevo, usuario_id)
        SELECT 
            NEW.id,
            key,
            COALESCE(old_data.value, 'NULL'),
            COALESCE(new_data.value, 'NULL'),
            auth.uid()
        FROM jsonb_each_text(to_jsonb(OLD)) AS old_data(key, value)
        FULL OUTER JOIN jsonb_each_text(to_jsonb(NEW)) AS new_data(key, value) 
            ON old_data.key = new_data.key
        WHERE old_data.value IS DISTINCT FROM new_data.value
            AND key NOT IN ('updatedAt', 'updated_at'); -- Excluir campos de timestamp
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CREAR TRIGGER PARA HISTORIAL AUTOMÁTICO
DO $$ 
BEGIN
    -- Verificar si la tabla Lead existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Lead' AND table_schema = 'public') THEN
        -- Eliminar trigger existente si existe
        DROP TRIGGER IF EXISTS lead_changes_trigger ON "Lead";
        
        -- Crear nuevo trigger
        CREATE TRIGGER lead_changes_trigger
            AFTER UPDATE ON "Lead"
            FOR EACH ROW
            EXECUTE FUNCTION track_lead_changes();
            
        RAISE NOTICE 'Trigger lead_changes_trigger creado en tabla Lead';
    ELSE
        RAISE NOTICE 'Tabla Lead no encontrada, trigger no creado';
    END IF;
END $$;

-- 6. COMENTARIOS EN LA TABLA
COMMENT ON TABLE lead_history IS 'Historial automático de cambios en leads para auditoría y seguimiento';
COMMENT ON COLUMN lead_history.lead_id IS 'ID del lead que fue modificado';
COMMENT ON COLUMN lead_history.campo_modificado IS 'Nombre del campo que fue modificado';
COMMENT ON COLUMN lead_history.valor_anterior IS 'Valor anterior del campo';
COMMENT ON COLUMN lead_history.valor_nuevo IS 'Nuevo valor del campo';
COMMENT ON COLUMN lead_history.usuario_id IS 'ID del usuario que realizó el cambio';
COMMENT ON COLUMN lead_history.fecha_cambio IS 'Timestamp del cambio';

-- 7. VERIFICAR CREACIÓN
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_history' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Tabla lead_history creada exitosamente';
    ELSE
        RAISE NOTICE '❌ Error: Tabla lead_history no se pudo crear';
    END IF;
END $$;
