-- Script para reactivar RLS después de la importación
-- Ejecutar en Supabase SQL Editor DESPUÉS de la importación

-- 1. Reactivar RLS en la tabla Lead
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;

-- 2. Verificar que RLS está activado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'Lead' AND schemaname = 'public';

-- 3. Crear políticas básicas de seguridad si no existen
-- Política para permitir SELECT a usuarios autenticados
CREATE POLICY IF NOT EXISTS "Users can view leads" ON "Lead"
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir INSERT a usuarios autenticados
CREATE POLICY IF NOT EXISTS "Users can insert leads" ON "Lead"
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir UPDATE a usuarios autenticados
CREATE POLICY IF NOT EXISTS "Users can update leads" ON "Lead"
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para permitir DELETE a usuarios autenticados
CREATE POLICY IF NOT EXISTS "Users can delete leads" ON "Lead"
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'Lead' AND schemaname = 'public';

-- 5. Contar leads importados
SELECT COUNT(*) as total_leads_importados FROM "Lead";

-- 6. Verificar distribución por estado
SELECT estado, COUNT(*) as cantidad 
FROM "Lead" 
GROUP BY estado 
ORDER BY cantidad DESC;

-- 7. Verificar distribución por zona
SELECT zona, COUNT(*) as cantidad 
FROM "Lead" 
WHERE zona IS NOT NULL
GROUP BY zona 
ORDER BY cantidad DESC
LIMIT 10;
