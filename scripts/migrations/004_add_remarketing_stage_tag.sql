-- Paso 2 de REMARKETING: tag en pipeline_stage_tags (ejecutar después de 003)

INSERT INTO pipeline_stage_tags (stage, manychat_tag, tag_type, description, is_active)
VALUES (
  'REMARKETING',
  'remarketing',
  'pipeline',
  'Lead en campaña de remarketing (reengagement WhatsApp)',
  true
)
ON CONFLICT (stage) DO UPDATE SET
  manychat_tag = EXCLUDED.manychat_tag,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = NOW();
