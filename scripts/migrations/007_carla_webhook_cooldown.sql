-- Cooldown por lead: no llamar a Consultas - Carla de nuevo si ya se llamó hace menos de 20 segundos.
-- Evita mensaje repetido cuando el usuario envía dos mensajes seguidos (ej. "hola!" y "s") que activarían la misma respuesta.

CREATE TABLE IF NOT EXISTS carla_webhook_last_per_lead (
  lead_id uuid PRIMARY KEY REFERENCES "Lead"(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE carla_webhook_last_per_lead IS 'Última vez que se llamó al webhook Consultas - Carla por lead; cooldown para no repetir el mismo mensaje.';
