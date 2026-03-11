-- Tabla para evitar doble disparo del webhook lead-nuevo
-- Solo una petición puede insertar por lead_id; el resto recibe unique violation y no llama a UChat.

CREATE TABLE IF NOT EXISTS lead_nuevo_webhook_sent (
  lead_id uuid PRIMARY KEY REFERENCES "Lead"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE lead_nuevo_webhook_sent IS 'Registro de leads para los que ya se llamó al Inbound Webhook lead-nuevo; evita doble envío por concurrencia o reintentos de Meta.';
