-- MIGRACIÓN: Etapa REMARKETING en pipeline
-- Re-engagement por WhatsApp (plantilla Meta) al mover leads fuera de ventana de 24 h.
--
-- IMPORTANTE (PostgreSQL): el valor del enum debe commitearse antes de usarlo en INSERT.
-- Ejecutar en dos pasos si aplica manualmente:
--   1) ALTER TYPE pipeline_stage ADD VALUE IF NOT EXISTS 'REMARKETING';
--   2) INSERT en pipeline_stage_tags (ver abajo)

ALTER TYPE pipeline_stage ADD VALUE IF NOT EXISTS 'REMARKETING';

-- Paso 2 (en transacción separada / segunda migración):
-- INSERT INTO pipeline_stage_tags (stage, manychat_tag, tag_type, description, is_active)
-- VALUES ('REMARKETING', 'remarketing', 'pipeline', 'Lead en campaña de remarketing (reengagement WhatsApp)', true)
-- ON CONFLICT (stage) DO UPDATE SET manychat_tag = EXCLUDED.manychat_tag, description = EXCLUDED.description, is_active = true, updated_at = NOW();
