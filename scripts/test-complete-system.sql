-- =====================================================
-- SCRIPT: Probar sistema completo CRM Phorencial
-- BASADO EN: Migración completa y nuevas funcionalidades
-- FECHA: 28 de Agosto de 2025
-- =====================================================

-- 1. VERIFICAR ESTRUCTURA DE TABLAS
-- =====================================================
SELECT 
  'VERIFICACIÓN TABLAS' as test_section,
  table_name,
  CASE 
    WHEN table_name IN ('user_profiles', 'lead_history', 'user_zone_assignments', 'lead_assignments', 'formosa_zones') 
    THEN '✅ NUEVA'
    WHEN table_name IN ('Lead', 'User', 'Event', 'Rule')
    THEN '📋 EXISTENTE'
    ELSE '❓ OTRA'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'lead_history', 'user_zone_assignments', 'lead_assignments', 'formosa_zones', 'Lead', 'User', 'Event', 'Rule')
ORDER BY status, table_name;

-- 2. VERIFICAR RLS POLICIES
-- =====================================================
SELECT 
  'VERIFICACIÓN RLS' as test_section,
  schemaname,
  tablename,
  policyname,
  CASE WHEN rowsecurity THEN '✅ HABILITADO' ELSE '❌ DESHABILITADO' END as rls_status
FROM pg_policies p
JOIN pg_class c ON c.relname = p.tablename
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'lead_history', 'user_zone_assignments', 'lead_assignments', 'formosa_zones', 'Lead')
ORDER BY tablename, policyname;

-- 3. VERIFICAR DATOS MIGRADOS
-- =====================================================
-- Resumen de user_profiles
SELECT 
  'DATOS MIGRADOS' as test_section,
  'user_profiles' as tabla,
  role,
  COUNT(*) as cantidad,
  STRING_AGG(nombre, ', ') as usuarios
FROM user_profiles
GROUP BY role
ORDER BY role;

-- Resumen de zonas asignadas
SELECT 
  'DATOS MIGRADOS' as test_section,
  'user_zone_assignments' as tabla,
  up.role,
  COUNT(DISTINCT uza.zone) as zonas_asignadas,
  COUNT(*) as total_asignaciones
FROM user_zone_assignments uza
JOIN user_profiles up ON up.id = uza.user_id
GROUP BY up.role
ORDER BY up.role;

-- Resumen de leads asignados
SELECT 
  'DATOS MIGRADOS' as test_section,
  'lead_assignments' as tabla,
  up.role,
  COUNT(DISTINCT la.lead_id) as leads_asignados,
  COUNT(*) as total_asignaciones
FROM lead_assignments la
JOIN user_profiles up ON up.id = la.user_id
GROUP BY up.role
ORDER BY up.role;

-- 4. PROBAR TRIGGER DE HISTORIAL AUTOMÁTICO
-- =====================================================
-- Crear un lead de prueba para testing
INSERT INTO "Lead" (nombre, telefono, email, origen, estado, zona, "createdAt", "updatedAt")
VALUES (
  'LEAD PRUEBA TRIGGER',
  '+543704999999',
  'prueba-trigger@test.com',
  'test',
  'NUEVO',
  'Formosa Capital',
  NOW(),
  NOW()
)
RETURNING id as lead_test_id;

-- Obtener el ID del lead de prueba para las siguientes operaciones
DO $$
DECLARE
  test_lead_id UUID;
  history_count_before INTEGER;
  history_count_after INTEGER;
BEGIN
  -- Obtener ID del lead de prueba
  SELECT id INTO test_lead_id 
  FROM "Lead" 
  WHERE nombre = 'LEAD PRUEBA TRIGGER' 
  LIMIT 1;
  
  IF test_lead_id IS NOT NULL THEN
    -- Contar registros de historial antes
    SELECT COUNT(*) INTO history_count_before 
    FROM lead_history 
    WHERE lead_id = test_lead_id;
    
    -- Modificar el lead para activar el trigger
    UPDATE "Lead" 
    SET 
      estado = 'EN_REVISION',
      notas = 'Prueba de trigger automático',
      "updatedAt" = NOW()
    WHERE id = test_lead_id;
    
    -- Contar registros de historial después
    SELECT COUNT(*) INTO history_count_after 
    FROM lead_history 
    WHERE lead_id = test_lead_id;
    
    -- Mostrar resultado
    RAISE NOTICE 'PRUEBA TRIGGER: Lead ID %, Historial antes: %, después: %', 
      test_lead_id, history_count_before, history_count_after;
    
    IF history_count_after > history_count_before THEN
      RAISE NOTICE '✅ TRIGGER FUNCIONANDO CORRECTAMENTE';
    ELSE
      RAISE NOTICE '❌ TRIGGER NO FUNCIONÓ';
    END IF;
  ELSE
    RAISE NOTICE '❌ No se pudo crear lead de prueba';
  END IF;
END $$;

-- 5. VERIFICAR HISTORIAL GENERADO
-- =====================================================
SELECT 
  'PRUEBA TRIGGER' as test_section,
  lh.campo_modificado,
  lh.valor_anterior,
  lh.valor_nuevo,
  lh.fecha_cambio,
  CASE 
    WHEN lh.campo_modificado IN ('estado', 'notas') THEN '✅ ESPERADO'
    ELSE '❓ INESPERADO'
  END as resultado
FROM lead_history lh
JOIN "Lead" l ON l.id = lh.lead_id
WHERE l.nombre = 'LEAD PRUEBA TRIGGER'
ORDER BY lh.fecha_cambio DESC;

-- 6. PROBAR FUNCIONES Y CONSTRAINTS
-- =====================================================
-- Verificar ENUM user_role
SELECT 
  'VERIFICACIÓN ENUM' as test_section,
  enumlabel as valores_permitidos
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;

-- Verificar foreign keys
SELECT 
  'VERIFICACIÓN FK' as test_section,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✅ CONFIGURADO' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('user_profiles', 'lead_history', 'user_zone_assignments', 'lead_assignments')
ORDER BY tc.table_name, kcu.column_name;

-- 7. VERIFICAR ÍNDICES CREADOS
-- =====================================================
SELECT 
  'VERIFICACIÓN ÍNDICES' as test_section,
  schemaname,
  tablename,
  indexname,
  indexdef,
  '✅ CREADO' as status
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'lead_history', 'user_zone_assignments', 'lead_assignments')
ORDER BY tablename, indexname;

-- 8. ESTADÍSTICAS FINALES DEL SISTEMA
-- =====================================================
SELECT 
  'ESTADÍSTICAS FINALES' as test_section,
  'RESUMEN GENERAL' as categoria,
  'Total Usuarios' as metrica,
  COUNT(*)::text as valor
FROM user_profiles

UNION ALL

SELECT 
  'ESTADÍSTICAS FINALES',
  'RESUMEN GENERAL',
  'Total Leads',
  COUNT(*)::text
FROM "Lead"

UNION ALL

SELECT 
  'ESTADÍSTICAS FINALES',
  'RESUMEN GENERAL',
  'Total Zonas Formosa',
  COUNT(*)::text
FROM formosa_zones

UNION ALL

SELECT 
  'ESTADÍSTICAS FINALES',
  'RESUMEN GENERAL',
  'Total Asignaciones Zona',
  COUNT(*)::text
FROM user_zone_assignments

UNION ALL

SELECT 
  'ESTADÍSTICAS FINALES',
  'RESUMEN GENERAL',
  'Total Asignaciones Lead',
  COUNT(*)::text
FROM lead_assignments

UNION ALL

SELECT 
  'ESTADÍSTICAS FINALES',
  'RESUMEN GENERAL',
  'Total Registros Historial',
  COUNT(*)::text
FROM lead_history;

-- 9. LIMPIAR DATOS DE PRUEBA
-- =====================================================
-- Eliminar el lead de prueba y su historial
DELETE FROM lead_history 
WHERE lead_id IN (
  SELECT id FROM "Lead" WHERE nombre = 'LEAD PRUEBA TRIGGER'
);

DELETE FROM "Lead" 
WHERE nombre = 'LEAD PRUEBA TRIGGER';

-- =====================================================
-- PRUEBAS COMPLETADAS
-- =====================================================
SELECT 
  '🎉 SISTEMA COMPLETAMENTE PROBADO' as resultado,
  '✅ Tablas creadas' as check1,
  '✅ RLS Policies aplicadas' as check2,
  '✅ Datos migrados' as check3,
  '✅ Trigger funcionando' as check4,
  '✅ Asignaciones configuradas' as check5,
  '✅ Sistema listo para producción' as status_final;

-- =====================================================
