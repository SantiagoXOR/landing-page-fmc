-- Script para agregar campos cuil, banco y trabajo_actual a la tabla Lead
-- Ejecutar este script en el SQL Editor de Supabase

-- Agregar campo cuil
ALTER TABLE "Lead" 
ADD COLUMN IF NOT EXISTS cuil VARCHAR;

-- Agregar campo banco
ALTER TABLE "Lead" 
ADD COLUMN IF NOT EXISTS banco VARCHAR;

-- Agregar campo trabajo_actual
ALTER TABLE "Lead" 
ADD COLUMN IF NOT EXISTS trabajo_actual VARCHAR;

-- Verificar que los campos se agregaron correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Lead' 
AND column_name IN ('cuil', 'banco', 'trabajo_actual')
ORDER BY column_name;

