-- Mensajes del bot / pipeline / plantillas: flag para la UI de Chats
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_from_bot boolean DEFAULT false;

COMMENT ON COLUMN messages.is_from_bot IS 'true si el outbound lo envió el bot o automatización (pipeline, plantilla Meta)';
