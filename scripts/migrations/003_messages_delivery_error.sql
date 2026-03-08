-- MIGRACIÓN: Columna delivery_error en messages
-- ==============================================
-- Persiste el error de entrega cuando Meta envía value.errors en el webhook
-- (mensaje fallido: número inválido, bloqueado, etc.).

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS delivery_error TEXT;

COMMENT ON COLUMN messages.delivery_error IS 'Error de entrega desde webhook Meta (value.errors) cuando el mensaje falla.';
