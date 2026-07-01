-- Cola de broadcast WhatsApp (remarketing masivo desde CRM)

CREATE TABLE IF NOT EXISTS whatsapp_broadcast_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by text,
  stage_id text NOT NULL DEFAULT 'remarketing',
  template_id text NOT NULL,
  custom_message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS whatsapp_broadcast_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES whatsapp_broadcast_jobs(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
  lead_nombre text,
  telefono text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  message_id text,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcast_items_job_status
  ON whatsapp_broadcast_items(job_id, status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcast_jobs_created
  ON whatsapp_broadcast_jobs(created_at DESC);

COMMENT ON TABLE whatsapp_broadcast_jobs IS 'Campañas de broadcast WhatsApp (remarketing) encoladas desde el CRM';
COMMENT ON TABLE whatsapp_broadcast_items IS 'Un ítem por lead en un job de broadcast; estado y log por envío';
