-- =====================================================
-- SCRIPT: Crear tablas faltantes para CRM Phorencial
-- BASADO EN: Documentación técnica plan-evolucion-crm-phorencial.md
-- FECHA: 28 de Agosto de 2025
-- =====================================================

-- 1. CREAR ENUM PARA ROLES DE USUARIO
-- =====================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'AGENT', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLA USER_PROFILES (extiende auth.users)
-- =====================================================
-- Nota: Esta tabla extiende el sistema de autenticación de Supabase
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'AGENT',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);

-- 3. TABLA LEAD_HISTORY (historial de cambios automático)
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  campo_modificado VARCHAR(100) NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  fecha_cambio TIMESTAMP DEFAULT NOW()
);

-- Índices para lead_history
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_usuario ON lead_history(usuario_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_fecha ON lead_history(fecha_cambio);

-- 4. TABLA USER_ZONE_ASSIGNMENTS (asignación de zonas de Formosa)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_zone_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  zone VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para user_zone_assignments
CREATE INDEX IF NOT EXISTS idx_user_zone_user_id ON user_zone_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_zone_zone ON user_zone_assignments(zone);

-- 5. TABLA LEAD_ASSIGNMENTS (asignación de leads a usuarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT true
);

-- Índices para lead_assignments
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead_id ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_user_id ON lead_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_active ON lead_assignments(is_active);

-- 6. FUNCIÓN PARA HISTORIAL AUTOMÁTICO DE LEADS
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
      AND key NOT IN ('updated_at', 'updatedAt'); -- Excluir campos de timestamp automático
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TRIGGER PARA HISTORIAL AUTOMÁTICO
-- =====================================================
-- Nota: Necesitamos verificar si la tabla 'Lead' existe y crear el trigger
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

-- 8. FUNCIÓN PARA ACTUALIZAR TIMESTAMP
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. COMENTARIOS EN LAS TABLAS
-- =====================================================
COMMENT ON TABLE user_profiles IS 'Perfiles de usuario que extienden auth.users con roles específicos del CRM';
COMMENT ON TABLE lead_history IS 'Historial automático de cambios en leads para auditoría';
COMMENT ON TABLE user_zone_assignments IS 'Asignación de usuarios a zonas geográficas de Formosa';
COMMENT ON TABLE lead_assignments IS 'Asignación de leads específicos a usuarios del CRM';

-- 10. INSERTAR ZONAS DE FORMOSA PREDEFINIDAS
-- =====================================================
-- Crear tabla temporal para zonas si no existe
CREATE TABLE IF NOT EXISTS formosa_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Insertar zonas de Formosa según documentación
INSERT INTO formosa_zones (name) VALUES
  ('Formosa Capital'),
  ('Clorinda'),
  ('Pirané'),
  ('El Colorado'),
  ('Las Lomitas'),
  ('Ingeniero Juárez'),
  ('Ibarreta'),
  ('Comandante Fontana'),
  ('Villa Dos Trece'),
  ('General Güemes'),
  ('Laguna Blanca'),
  ('Pozo del Mortero'),
  ('Estanislao del Campo'),
  ('Villa del Rosario'),
  ('Namqom'),
  ('La Nueva Formosa'),
  ('Solidaridad'),
  ('San Antonio'),
  ('Obrero'),
  ('GUEMES')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SCRIPT COMPLETADO
-- =====================================================
-- Las siguientes tablas han sido creadas:
-- ✅ user_profiles (con enum user_role)
-- ✅ lead_history (con trigger automático)
-- ✅ user_zone_assignments
-- ✅ lead_assignments
-- ✅ formosa_zones (tabla auxiliar)
-- 
-- Próximos pasos:
-- 1. Ejecutar RLS policies (script separado)
-- 2. Migrar datos existentes de tabla User a user_profiles
-- 3. Configurar asignaciones iniciales
-- =====================================================
