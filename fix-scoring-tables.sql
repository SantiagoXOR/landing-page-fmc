-- Script para corregir las tablas del sistema de scoring
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Eliminar tablas existentes si hay problemas
DROP TABLE IF EXISTS "Event" CASCADE;
DROP TABLE IF EXISTS "Rule" CASCADE;

-- 2. Crear tabla Event con estructura correcta
CREATE TABLE "Event" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "leadId" UUID,
    tipo VARCHAR NOT NULL,
    payload JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla Rule con estructura correcta
CREATE TABLE "Rule" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear índices para mejor performance
CREATE INDEX idx_event_leadid ON "Event"("leadId");
CREATE INDEX idx_event_tipo ON "Event"(tipo);
CREATE INDEX idx_event_created ON "Event"("createdAt");
CREATE INDEX idx_rule_key ON "Rule"(key);

-- 5. Insertar reglas por defecto para el sistema de scoring
INSERT INTO "Rule" (key, value, description)
VALUES 
    ('edadMin', '18', 'Edad mínima permitida para leads'),
    ('edadMax', '75', 'Edad máxima permitida para leads'),
    ('minIngreso', '200000', 'Ingreso mínimo requerido en pesos argentinos'),
    ('zonasPermitidas', '["CABA", "GBA", "Córdoba"]', 'Zonas geográficas permitidas'),
    ('requiereBlanco', 'true', 'Indica si se requieren ingresos en blanco')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    "updatedAt" = NOW();

-- 6. Verificar que las tablas se crearon correctamente
SELECT 'Event table created' as status, count(*) as rows FROM "Event";
SELECT 'Rule table created' as status, count(*) as rows FROM "Rule";

-- 7. Mostrar las reglas insertadas
SELECT key, value, description FROM "Rule" ORDER BY key;
