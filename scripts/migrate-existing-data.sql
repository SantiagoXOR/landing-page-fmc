-- =====================================================
-- SCRIPT: Migrar datos existentes a nuevas tablas
-- BASADO EN: Análisis de estructura actual del CRM Phorencial
-- FECHA: 28 de Agosto de 2025
-- =====================================================

-- 1. VERIFICAR DATOS EXISTENTES
-- =====================================================
-- Mostrar usuarios actuales en tabla User
SELECT 
  'USUARIOS EXISTENTES' as info,
  COUNT(*) as total_usuarios,
  STRING_AGG(DISTINCT role, ', ') as roles_existentes
FROM "User";

-- Mostrar leads por zona para análisis
SELECT 
  'LEADS POR ZONA' as info,
  zona,
  COUNT(*) as total_leads
FROM "Lead"
WHERE zona IS NOT NULL
GROUP BY zona
ORDER BY total_leads DESC
LIMIT 10;

-- 2. CREAR USUARIOS EN AUTH.USERS (SIMULACIÓN)
-- =====================================================
-- NOTA: En producción, los usuarios deben registrarse via Supabase Auth
-- Este script simula la migración asumiendo que ya están en auth.users

-- Verificar si existen usuarios en auth.users
SELECT 
  'AUTH USERS' as info,
  COUNT(*) as total_auth_users
FROM auth.users;

-- 3. MIGRAR DATOS DE USER A USER_PROFILES
-- =====================================================
-- Solo migrar si la tabla User tiene datos y user_profiles está vacía

DO $$ 
DECLARE
  user_count INTEGER;
  profile_count INTEGER;
BEGIN
  -- Contar usuarios existentes
  SELECT COUNT(*) INTO user_count FROM "User";
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  
  RAISE NOTICE 'Usuarios en tabla User: %', user_count;
  RAISE NOTICE 'Perfiles en user_profiles: %', profile_count;
  
  -- Solo proceder si hay usuarios que migrar y user_profiles está vacía
  IF user_count > 0 AND profile_count = 0 THEN
    
    -- Crear usuarios temporales en auth.users si no existen
    -- NOTA: En producción esto se hace via Supabase Auth UI
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    SELECT 
      u.id::uuid,
      u.email,
      COALESCE(u."hashedPassword", '$2a$10$defaulthash'), -- Hash temporal
      NOW(),
      COALESCE(u."createdAt", NOW()),
      COALESCE(u."updatedAt", NOW())
    FROM "User" u
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users au WHERE au.id = u.id::uuid
    );
    
    -- Migrar a user_profiles
    INSERT INTO user_profiles (id, email, nombre, role, is_active, created_at, updated_at)
    SELECT 
      u.id::uuid,
      u.email,
      COALESCE(u.name, u.email), -- Usar email como nombre si name es NULL
      CASE 
        WHEN UPPER(u.role) = 'ADMIN' THEN 'ADMIN'::user_role
        WHEN UPPER(u.role) = 'ANALISTA' THEN 'MANAGER'::user_role
        WHEN UPPER(u.role) = 'VENDEDOR' THEN 'AGENT'::user_role
        ELSE 'AGENT'::user_role
      END,
      true, -- is_active
      COALESCE(u."createdAt", NOW()),
      COALESCE(u."updatedAt", NOW())
    FROM "User" u;
    
    RAISE NOTICE 'Migración completada: % usuarios migrados', user_count;
    
  ELSE
    RAISE NOTICE 'Migración omitida: user_count=%, profile_count=%', user_count, profile_count;
  END IF;
END $$;

-- 4. ASIGNAR ZONAS AUTOMÁTICAMENTE
-- =====================================================
-- Asignar usuarios a zonas basado en distribución de leads

DO $$
DECLARE
  admin_user_id UUID;
  manager_user_id UUID;
  zona_record RECORD;
BEGIN
  -- Obtener IDs de usuarios ADMIN y MANAGER
  SELECT id INTO admin_user_id 
  FROM user_profiles 
  WHERE role = 'ADMIN' 
  LIMIT 1;
  
  SELECT id INTO manager_user_id 
  FROM user_profiles 
  WHERE role = 'MANAGER' 
  LIMIT 1;
  
  -- Si hay usuarios ADMIN/MANAGER, asignarles todas las zonas
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO user_zone_assignments (user_id, zone, is_default)
    SELECT admin_user_id, name, true
    FROM formosa_zones
    WHERE is_active = true;
    
    RAISE NOTICE 'Zonas asignadas a usuario ADMIN: %', admin_user_id;
  END IF;
  
  IF manager_user_id IS NOT NULL AND manager_user_id != admin_user_id THEN
    INSERT INTO user_zone_assignments (user_id, zone, is_default)
    SELECT manager_user_id, name, false
    FROM formosa_zones
    WHERE is_active = true;
    
    RAISE NOTICE 'Zonas asignadas a usuario MANAGER: %', manager_user_id;
  END IF;
  
  -- Asignar agentes a zonas específicas (distribución equitativa)
  FOR zona_record IN 
    SELECT name, ROW_NUMBER() OVER (ORDER BY name) as zona_num
    FROM formosa_zones 
    WHERE is_active = true
  LOOP
    -- Asignar cada zona a un agente diferente (rotación)
    INSERT INTO user_zone_assignments (user_id, zone, is_default)
    SELECT 
      up.id,
      zona_record.name,
      (zona_record.zona_num = 1) -- Primera zona como default
    FROM user_profiles up
    WHERE up.role = 'AGENT'
    AND up.id = (
      SELECT id FROM user_profiles 
      WHERE role = 'AGENT' 
      ORDER BY created_at
      OFFSET (zona_record.zona_num - 1) % (
        SELECT COUNT(*) FROM user_profiles WHERE role = 'AGENT'
      )
      LIMIT 1
    );
  END LOOP;
  
  RAISE NOTICE 'Asignación de zonas completada';
END $$;

-- 5. CREAR ASIGNACIONES INICIALES DE LEADS
-- =====================================================
-- Asignar leads existentes a usuarios basado en zona

INSERT INTO lead_assignments (lead_id, user_id, assigned_at, assigned_by)
SELECT DISTINCT
  l.id::uuid,
  uza.user_id,
  NOW(),
  (SELECT id FROM user_profiles WHERE role = 'ADMIN' LIMIT 1)
FROM "Lead" l
JOIN user_zone_assignments uza ON uza.zone = l.zona
WHERE l.zona IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM lead_assignments la 
  WHERE la.lead_id = l.id::uuid
);

-- 6. VERIFICAR RESULTADOS DE LA MIGRACIÓN
-- =====================================================
SELECT 
  'RESUMEN MIGRACIÓN' as seccion,
  'user_profiles' as tabla,
  COUNT(*) as total_registros,
  STRING_AGG(DISTINCT role::text, ', ') as roles
FROM user_profiles

UNION ALL

SELECT 
  'RESUMEN MIGRACIÓN',
  'user_zone_assignments',
  COUNT(*),
  COUNT(DISTINCT zone)::text || ' zonas únicas'
FROM user_zone_assignments

UNION ALL

SELECT 
  'RESUMEN MIGRACIÓN',
  'lead_assignments',
  COUNT(*),
  COUNT(DISTINCT user_id)::text || ' usuarios asignados'
FROM lead_assignments

UNION ALL

SELECT 
  'RESUMEN MIGRACIÓN',
  'formosa_zones',
  COUNT(*),
  COUNT(CASE WHEN is_active THEN 1 END)::text || ' activas'
FROM formosa_zones;

-- 7. MOSTRAR DISTRIBUCIÓN FINAL
-- =====================================================
SELECT 
  up.nombre,
  up.role,
  COUNT(DISTINCT uza.zone) as zonas_asignadas,
  COUNT(DISTINCT la.lead_id) as leads_asignados
FROM user_profiles up
LEFT JOIN user_zone_assignments uza ON up.id = uza.user_id
LEFT JOIN lead_assignments la ON up.id = la.user_id
GROUP BY up.id, up.nombre, up.role
ORDER BY up.role, up.nombre;

-- =====================================================
-- SCRIPT COMPLETADO
-- =====================================================
-- Migración realizada:
-- ✅ Usuarios migrados de "User" a user_profiles
-- ✅ Zonas asignadas automáticamente
-- ✅ Leads asignados por zona geográfica
-- ✅ Estructura completa lista para producción
-- 
-- Próximos pasos:
-- 1. Probar el trigger automático de lead_history
-- 2. Verificar RLS policies funcionando
-- 3. Configurar autenticación real con Supabase Auth
-- =====================================================
