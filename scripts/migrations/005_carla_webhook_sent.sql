-- Tabla para evitar doble disparo del webhook Consultas - Carla por mensaje.
-- Solo una petición puede insertar por platform_msg_id; el resto recibe unique violation y no llama a Carla.

CREATE TABLE IF NOT EXISTS carla_webhook_sent (
  platform_msg_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE carla_webhook_sent IS 'Mensajes entrantes ya reenviados al Inbound Webhook Consultas - Carla; evita duplicar respuesta cuando Meta reenvía el webhook o hay concurrencia.';
