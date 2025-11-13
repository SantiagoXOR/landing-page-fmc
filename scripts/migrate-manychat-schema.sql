-- Migración para soporte de Manychat
-- Agregar campos necesarios a la tabla Lead

-- Agregar columnas a Lead
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "manychatId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "tags" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "customFields" TEXT;

-- Crear índice único en manychatId
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_manychatId_key" ON "Lead"("manychatId");
CREATE INDEX IF NOT EXISTS "Lead_manychatId_idx" ON "Lead"("manychatId");

-- Agregar columna a Conversation
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "manychatData" TEXT;

-- Crear tabla ManychatSync
CREATE TABLE IF NOT EXISTS "ManychatSync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "direction" TEXT NOT NULL,
    "data" TEXT,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    
    CONSTRAINT "ManychatSync_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Crear índices para ManychatSync
CREATE INDEX IF NOT EXISTS "ManychatSync_leadId_idx" ON "ManychatSync"("leadId");
CREATE INDEX IF NOT EXISTS "ManychatSync_status_idx" ON "ManychatSync"("status");
CREATE INDEX IF NOT EXISTS "ManychatSync_syncType_idx" ON "ManychatSync"("syncType");
CREATE INDEX IF NOT EXISTS "ManychatSync_createdAt_idx" ON "ManychatSync"("createdAt");

-- Verificar que todo se creó correctamente
SELECT 'Migración completada exitosamente' AS resultado;

