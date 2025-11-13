-- Script para crear las tablas faltantes en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Crear tabla Event
CREATE TABLE
IF NOT EXISTS "Event"
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
    "leadId" UUID,
    tipo VARCHAR NOT NULL,
    payload JSONB,
    "createdAt" TIMESTAMP
WITH TIME ZONE DEFAULT NOW
()
);

-- 2. Crear tabla Rule
CREATE TABLE
IF NOT EXISTS "Rule"
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
    key VARCHAR UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    "createdAt" TIMESTAMP
WITH TIME ZONE DEFAULT NOW
(),
    "updatedAt" TIMESTAMP
WITH TIME ZONE DEFAULT NOW
()
);

-- 3. Crear índices para mejor performance
CREATE INDEX
IF NOT EXISTS idx_event_leadid ON "Event"
("leadId");
CREATE INDEX
IF NOT EXISTS idx_event_tipo ON "Event"
(tipo);
CREATE INDEX
IF NOT EXISTS idx_event_created ON "Event"
("createdAt");
CREATE INDEX
IF NOT EXISTS idx_rule_key ON "Rule"
(key);

-- 4. Insertar reglas por defecto para el sistema de scoring
INSERT INTO "Rule"
    (key, value, description)
VALUES
    ('edadMin', '18', 'Edad mínima permitida para leads'),
    ('edadMax', '75', 'Edad máxima permitida para leads'),
    ('minIngreso', '200000', 'Ingreso mínimo requerido en pesos argentinos'),
    ('zonasPermitidas', '["CABA", "GBA", "Córdoba"]', 'Zonas geográficas permitidas'),
    ('requiereBlanco', 'true', 'Indica si se requieren ingresos en blanco')
ON CONFLICT
(key) DO NOTHING;

-- 5. Verificar que las tablas se crearon correctamente
SELECT 'Event table created' as status, count(*) as rows
FROM "Event";
SELECT 'Rule table created' as status, count(*) as rows
FROM "Rule";

-- 6. Mostrar las reglas insertadas
SELECT key, value, description
FROM "Rule"
ORDER BY key;
