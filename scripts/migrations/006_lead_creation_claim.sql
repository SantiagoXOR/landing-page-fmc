-- Evitar dos registros de lead para el mismo teléfono cuando llegan varios mensajes seguidos.
-- La primera petición que inserte el teléfono aquí es la que crea el lead; las demás esperan y reutilizan.

CREATE TABLE IF NOT EXISTS lead_creation_claim (
  telefono text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE lead_creation_claim IS 'Claim por teléfono al crear lead desde WhatsApp; solo una petición crea el lead, el resto reutiliza tras esperar.';
