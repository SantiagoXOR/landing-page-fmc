-- SCRIPT SIMPLE PARA CREAR TABLA LEAD_HISTORY SIN FOREIGN KEY
-- Ejecutar en Supabase SQL Editor

-- 1. ELIMINAR TABLA SI EXISTE (para empezar limpio)
DROP TABLE IF EXISTS lead_history
CASCADE;

-- 2. VERIFICAR TIPO DE DATOS DE Lead.id
DO $$
DECLARE
    lead_id_type TEXT;
BEGIN
    SELECT data_type
    INTO lead_id_type
    FROM information_schema.columns
    WHERE table_name = 'Lead'
        AND column_name = 'id'
        AND table_schema = 'public';

    RAISE NOTICE 'Tipo de datos de Lead.id: %', COALESCE
    (lead_id_type, 'NO ENCONTRADO');
END
$$;

-- 3. CREAR TABLA LEAD_HISTORY SIN FOREIGN KEY (por ahora)
CREATE TABLE lead_history
(
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()
    ::text,
    lead_id TEXT NOT NULL,
    campo_modificado VARCHAR
    (100) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario_id UUID REFERENCES auth.users
    (id),
    fecha_cambio TIMESTAMP
    WITH TIME ZONE DEFAULT NOW
    ()
);

    -- 4. CREAR ÍNDICES
    CREATE INDEX idx_lead_history_lead_id ON lead_history(lead_id);
    CREATE INDEX idx_lead_history_usuario ON lead_history(usuario_id);
    CREATE INDEX idx_lead_history_fecha ON lead_history(fecha_cambio);

    -- 5. FUNCIÓN SIMPLE PARA TRACKING DE CAMBIOS
    CREATE OR REPLACE FUNCTION track_lead_changes
    ()
RETURNS TRIGGER AS $$
    BEGIN
        -- Solo procesar si hay cambios reales
        IF OLD IS DISTINCT FROM NEW THEN
        -- Insertar un registro simple por cada actualización
        INSERT INTO lead_history
            (
            lead_id,
            campo_modificado,
            valor_anterior,
            valor_nuevo,
            usuario_id
            )
        VALUES
            (
                NEW.id,
                'lead_updated',
                'multiple_fields',
                'updated_values',
                auth.uid()
        );
    END
    IF;
    
    RETURN NEW;
    END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 6. CREAR TRIGGER
    DROP TRIGGER IF EXISTS lead_changes_trigger
    ON "Lead";

    CREATE TRIGGER lead_changes_trigger
    AFTER
    UPDATE ON "Lead"
    FOR EACH ROW
    EXECUTE FUNCTION track_lead_changes
    ();

-- 7. VERIFICAR CREACIÓN
DO $$
    DECLARE
    rec RECORD;
    BEGIN
        IF EXISTS (SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'lead_history' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Tabla lead_history creada exitosamente';

    -- Mostrar estructura de la tabla
    RAISE NOTICE 'Estructura de lead_history:';
        FOR rec IN
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'lead_history'
        AND table_schema = 'public'
    ORDER BY ordinal_position
        LOOP
            RAISE NOTICE
    '  - %: %', rec.column_name, rec.data_type;
    END LOOP;
    ELSE
        RAISE NOTICE '❌ Error: Tabla lead_history no se pudo crear';
    END
    IF;
END $$;

    -- 8. PROBAR INSERCIÓN SIMPLE
    INSERT INTO lead_history
        (
        lead_id,
        campo_modificado,
        valor_anterior,
        valor_nuevo
        )
    VALUES
        (
            'test-lead-id',
            'test_field',
            'old_value',
            'new_value'
);

    -- 9. VERIFICAR INSERCIÓN
    DO $$
    DECLARE
    record_count INTEGER;
    BEGIN
        SELECT COUNT(*)
        INTO record_count
        FROM lead_history;
        RAISE NOTICE 'Registros en lead_history: %', record_count;

    -- Limpiar registro de prueba
    DELETE FROM lead_history WHERE lead_id = 'test-lead-id';
    RAISE NOTICE 'Registro de prueba eliminado';
    END $$;
