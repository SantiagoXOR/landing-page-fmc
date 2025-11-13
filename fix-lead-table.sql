-- Arreglar la tabla Lead para que genere IDs automáticamente
-- Este script debe ejecutarse en Supabase SQL Editor

-- 1. Primero, verificar si la tabla existe y su estructura
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'Lead' AND table_schema = 'public';

-- 2. Modificar la tabla para que el ID sea UUID con valor por defecto
ALTER TABLE "Lead" 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Verificar que la extensión uuid-ossp esté habilitada (ya debería estar)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 4. Verificar la estructura actualizada
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'Lead' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Probar inserción de un lead de prueba
INSERT INTO "Lead" (nombre, telefono, email, origen, estado, "createdAt", "updatedAt")
VALUES (
  'Test Lead SQL',
  '1234567890',
  'test-sql@test.com',
  'whatsapp',
  'NUEVO',
  NOW(),
  NOW()
);

-- 6. Verificar que se insertó correctamente
SELECT id, nombre, telefono, email, origen, estado, "createdAt"
FROM "Lead" 
WHERE nombre = 'Test Lead SQL';
