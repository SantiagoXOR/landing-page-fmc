-- Script para deshabilitar temporalmente RLS durante la importación
-- Ejecutar en Supabase SQL Editor ANTES de la importación

-- 1. Verificar estado actual de RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'Lead' AND schemaname = 'public';

-- 2. Deshabilitar RLS temporalmente para la tabla Lead
ALTER TABLE "Lead" DISABLE ROW LEVEL SECURITY;

-- 3. Verificar que RLS está deshabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'Lead' AND schemaname = 'public';

-- 4. Mostrar políticas existentes (para referencia)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'Lead' AND schemaname = 'public';

-- NOTA: Después de la importación, ejecutar enable-rls-import.sql para reactivar la seguridad
