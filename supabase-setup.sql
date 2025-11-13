-- Script para configurar las tablas en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla Lead con UUID automático
CREATE TABLE IF NOT EXISTS "Lead" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR NOT NULL,
    dni VARCHAR UNIQUE,
    telefono VARCHAR NOT NULL,
    email VARCHAR,
    ingresos INTEGER,
    zona VARCHAR,
    producto VARCHAR,
    monto INTEGER,
    origen VARCHAR,
    "utmSource" VARCHAR,
    estado VARCHAR DEFAULT 'NUEVO',
    agencia VARCHAR,
    notas TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla Event
CREATE TABLE IF NOT EXISTS "Event" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "leadId" UUID NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
    tipo VARCHAR NOT NULL,
    payload JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla User
CREATE TABLE IF NOT EXISTS "User" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR,
    role VARCHAR DEFAULT 'USER',
    "hashedPassword" VARCHAR,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla Rule
CREATE TABLE IF NOT EXISTS "Rule" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear función para actualizar updatedAt automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar updatedAt
CREATE TRIGGER update_lead_updated_at BEFORE UPDATE ON "Lead"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rule_updated_at BEFORE UPDATE ON "Rule"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuario admin por defecto (si no existe)
INSERT INTO "User" (email, name, role, "hashedPassword")
VALUES ('admin@phorencial.com', 'Admin', 'ADMIN', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (email) DO NOTHING;

-- Insertar algunas reglas por defecto
INSERT INTO "Rule" (key, value, description)
VALUES 
    ('scoring_weights', '{"ingresos": 0.4, "monto": 0.3, "zona": 0.2, "producto": 0.1}', 'Pesos para el scoring de leads'),
    ('whatsapp_templates', '{"bienvenida": "Hola {nombre}, gracias por tu interés en nuestros productos financieros."}', 'Templates de WhatsApp'),
    ('lead_states', '["NUEVO", "EN_REVISION", "PREAPROBADO", "RECHAZADO", "DOC_PENDIENTE", "DERIVADO"]', 'Estados válidos para leads')
ON CONFLICT (key) DO NOTHING;

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_lead_telefono ON "Lead"(telefono);
CREATE INDEX IF NOT EXISTS idx_lead_estado ON "Lead"(estado);
CREATE INDEX IF NOT EXISTS idx_lead_origen ON "Lead"(origen);
CREATE INDEX IF NOT EXISTS idx_lead_created_at ON "Lead"("createdAt");
CREATE INDEX IF NOT EXISTS idx_event_lead_id ON "Event"("leadId");
CREATE INDEX IF NOT EXISTS idx_event_tipo ON "Event"(tipo);
CREATE INDEX IF NOT EXISTS idx_event_created_at ON "Event"("createdAt");

-- Habilitar RLS (Row Level Security) para seguridad
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rule" ENABLE ROW LEVEL SECURITY;

-- Crear políticas básicas (permitir todo por ahora, refinar después)
CREATE POLICY "Allow all operations on Lead" ON "Lead" FOR ALL USING (true);
CREATE POLICY "Allow all operations on Event" ON "Event" FOR ALL USING (true);
CREATE POLICY "Allow all operations on User" ON "User" FOR ALL USING (true);
CREATE POLICY "Allow all operations on Rule" ON "Rule" FOR ALL USING (true);

-- Verificar que todo esté creado correctamente
SELECT 
    'Lead' as table_name, 
    COUNT(*) as record_count 
FROM "Lead"
UNION ALL
SELECT 
    'Event' as table_name, 
    COUNT(*) as record_count 
FROM "Event"
UNION ALL
SELECT 
    'User' as table_name, 
    COUNT(*) as record_count 
FROM "User"
UNION ALL
SELECT 
    'Rule' as table_name, 
    COUNT(*) as record_count 
FROM "Rule";
