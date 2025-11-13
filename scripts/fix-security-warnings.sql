-- FIX SECURITY WARNINGS - PHORENCIAL CRM
-- Este script corrige los warnings del Security Advisor sobre search_path
BEGIN;

-- =====================================================
-- 1. CORREGIR FUNCIÓN track_lead_changes
-- =====================================================

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
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = '';

-- =====================================================
-- 2. CORREGIR FUNCIÓN update_updated_at_column
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql 
   SET search_path = '';

-- =====================================================
-- 3. VERIFICAR QUE LAS FUNCIONES ESTÉN CORRECTAS
-- =====================================================

-- Verificar función track_lead_changes
SELECT 
    'track_lead_changes' as function_name,
    prosecdef as security_definer,
    proconfig as search_path_config
FROM pg_proc 
WHERE proname = 'track_lead_changes';

-- Verificar función update_updated_at_column
SELECT 
    'update_updated_at_column' as function_name,
    prosecdef as security_definer,
    proconfig as search_path_config
FROM pg_proc 
WHERE proname = 'update_updated_at_column';

-- =====================================================
-- 4. RECREAR TRIGGERS SI ES NECESARIO
-- =====================================================

-- Verificar si el trigger existe en la tabla Lead
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
      
    RAISE NOTICE 'Trigger lead_changes_trigger recreado en tabla Lead';
  ELSE
    RAISE NOTICE 'Tabla Lead no encontrada';
  END IF;
END $$;

-- Recrear trigger para user_profiles si existe
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
    CREATE TRIGGER update_user_profiles_updated_at
        BEFORE UPDATE ON user_profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE 'Trigger update_user_profiles_updated_at recreado';
  END IF;
END $$;

-- =====================================================
-- 5. CONFIRMACIÓN FINAL
-- =====================================================

SELECT 'SECURITY WARNINGS CORREGIDOS EXITOSAMENTE' as status,
       'Funciones actualizadas con search_path seguro' as detalle;

COMMIT;
