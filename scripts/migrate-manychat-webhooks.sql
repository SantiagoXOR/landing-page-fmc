-- Migración para soportar webhooks de Manychat
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar/Crear índice único en platform_msg_id de Message
-- (Ya debería existir por el UNIQUE constraint, pero verificamos)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'Message' 
        AND indexname = 'idx_message_platform_msg_id'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS idx_message_platform_msg_id 
        ON "Message"(platform_msg_id) 
        WHERE platform_msg_id IS NOT NULL;
    END IF;
END $$;

-- 2. Verificar/Crear índice en manychatId de Lead para búsquedas rápidas
-- (Ya debería existir por el UNIQUE constraint, pero verificamos)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'Lead' 
        AND indexname = 'idx_lead_manychat_id'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_manychat_id 
        ON "Lead"(manychatId) 
        WHERE manychatId IS NOT NULL;
    END IF;
END $$;

-- 3. Verificar/Crear índice compuesto en Conversation para búsquedas rápidas por plataforma
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'conversations' 
        AND indexname = 'idx_conversation_platform_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_conversation_platform_id 
        ON conversations(platform, platform_id);
    END IF;
END $$;

-- 4. Verificar/Crear índice en last_message_at para ordenar conversaciones
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'conversations' 
        AND indexname = 'idx_conversation_last_message_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_conversation_last_message_at 
        ON conversations(last_message_at DESC);
    END IF;
END $$;

-- 5. Verificar/Crear índice en direction y read_at para contar mensajes no leídos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'messages' 
        AND indexname = 'idx_message_direction_read'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_message_direction_read 
        ON messages(conversation_id, direction, read_at) 
        WHERE read_at IS NULL;
    END IF;
END $$;

-- 6. Verificar que la tabla Message tenga el campo media_url (no mediaUrl)
-- Si existe mediaUrl, agregar migración para renombrar si es necesario
DO $$ 
BEGIN
    -- Verificar si existe mediaUrl (camelCase) pero no media_url (snake_case)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Message' AND column_name = 'mediaUrl'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Message' AND column_name = 'media_url'
    ) THEN
        -- Supabase usa snake_case, así que si Prisma usa camelCase, 
        -- Supabase debería tenerlo mapeado. Si no, creamos el campo.
        ALTER TABLE "Message" 
        ADD COLUMN IF NOT EXISTS media_url TEXT;
        
        -- Copiar datos si existen
        UPDATE "Message" 
        SET media_url = "mediaUrl"::TEXT 
        WHERE "mediaUrl" IS NOT NULL AND media_url IS NULL;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Message' AND column_name = 'media_url'
    ) THEN
        -- Si no existe ninguno, crear media_url
        ALTER TABLE "Message" 
        ADD COLUMN IF NOT EXISTS media_url TEXT;
    END IF;
END $$;

-- 7. Verificar que la tabla Message tenga el campo message_type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Message' AND column_name = 'message_type'
    ) THEN
        ALTER TABLE "Message" 
        ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';
    END IF;
END $$;

-- 8. Verificar que la tabla Message tenga el campo sent_at
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Message' AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE "Message" 
        ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Verificación final
SELECT 
    'Índices creados/verificados exitosamente' as status,
    COUNT(*) as total_indexes
FROM pg_indexes 
WHERE tablename IN ('Message', 'Lead', 'conversations', 'messages')
AND indexname LIKE 'idx_%';

