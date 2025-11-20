-- =====================================================
-- SCRIPT: Crear tabla de documentos para CRM Phorencial
-- FECHA: 2025
-- =====================================================

-- Crear ENUM para categorías de documentos
DO $$ BEGIN
    CREATE TYPE document_category AS ENUM (
        'dni',
        'comprobantes',
        'contratos',
        'recibos',
        'otros'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear ENUM para estados de documentos
DO $$ BEGIN
    CREATE TYPE document_status AS ENUM (
        'PENDIENTE',
        'APROBADO',
        'RECHAZADO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear tabla documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    category document_category NOT NULL DEFAULT 'otros',
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    public_url TEXT,
    description TEXT,
    status document_status NOT NULL DEFAULT 'PENDIENTE',
    uploaded_by UUID REFERENCES "User"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at_trigger ON documents;
CREATE TRIGGER update_documents_updated_at_trigger
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Comentarios en la tabla y columnas
COMMENT ON TABLE documents IS 'Tabla para almacenar metadata de documentos asociados a leads';
COMMENT ON COLUMN documents.lead_id IS 'ID del lead al que pertenece el documento';
COMMENT ON COLUMN documents.storage_path IS 'Ruta del archivo en Supabase Storage';
COMMENT ON COLUMN documents.status IS 'Estado del documento: PENDIENTE, APROBADO, RECHAZADO';
COMMENT ON COLUMN documents.category IS 'Categoría del documento: dni, comprobantes, contratos, recibos, otros';

