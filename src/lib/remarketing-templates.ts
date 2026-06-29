/**
 * Perfiles de plantillas WhatsApp para la etapa Remarketing del pipeline.
 * Agregar entradas aquí al crear nuevas plantillas en Meta.
 */

export type RemarketingBodyMode = 'full_message' | 'name_only'

export interface RemarketingTemplateProfile {
  /** ID estable usado en API y UI */
  id: string
  label: string
  description: string
  /** Texto de vista previa para el modal (placeholders: {nombre}) */
  preview: string
  /** Nombre por defecto en Meta si no hay env */
  metaTemplateNameDefault: string
  /** Variables de entorno a probar en orden (primera no vacía gana) */
  metaTemplateNameEnvKeys: string[]
  bodyMode: RemarketingBodyMode
  /** Variable del cuerpo en Meta (ej. mensaje_pipeline, nombre_contacto) */
  bodyParameterName?: string
  /** true = imagen fija en Meta, no enviar header por API */
  skipHeader?: boolean
  /** URL opcional de header variable (solo si skipHeader es false) */
  headerImageUrl?: string
}

export const DEFAULT_REMARKETING_TEMPLATE_ID = 'seguimiento_credito'

export const REMARKETING_TEMPLATE_PROFILES: RemarketingTemplateProfile[] = [
  {
    id: DEFAULT_REMARKETING_TEMPLATE_ID,
    label: 'Seguimiento crédito prendario',
    description: 'Plantilla actual (notif_pipeline_crm). Mensaje corto con variable de texto completo.',
    preview:
      'Hola {nombre}, seguimos disponibles para ayudarte con tu crédito prendario. ¿Querés que retomemos tu consulta?',
    metaTemplateNameDefault: 'notif_pipeline_crm',
    metaTemplateNameEnvKeys: ['WHATSAPP_TEMPLATE_REMARKETING', 'WHATSAPP_TEMPLATE_PIPELINE_NOTIFY'],
    bodyMode: 'full_message',
    skipHeader: false,
  },
  {
    id: 'credito_autos_referidos',
    label: 'Créditos autos — referidos',
    description:
      'Campaña 4 ruedas. Copy fijo en Meta; el CRM envía solo el nombre del contacto.',
    preview:
      '¡Hola, {nombre}! Lanzamos Créditos Prendarios para Autos (0KM y Usados) con tasas competitivas y la seguridad del Banco Formosa. 📈🚗',
    metaTemplateNameDefault: 'credito_autos_referidos',
    metaTemplateNameEnvKeys: ['WHATSAPP_TEMPLATE_REMARKETING_AUTOS'],
    bodyMode: 'name_only',
    bodyParameterName: 'nombre_contacto',
    skipHeader: true,
  },
]

export type RemarketingTemplateUiOption = Pick<
  RemarketingTemplateProfile,
  'id' | 'label' | 'description' | 'preview'
>

export function getRemarketingTemplatesForUi(): RemarketingTemplateUiOption[] {
  return REMARKETING_TEMPLATE_PROFILES.map(({ id, label, description, preview }) => ({
    id,
    label,
    description,
    preview,
  }))
}

export function isRemarketingStageId(stageId: string): boolean {
  const normalized = stageId.toLowerCase().trim()
  return normalized === 'remarketing' || normalized.includes('remarketing')
}

export function getRemarketingTemplateProfile(
  templateId?: string | null
): RemarketingTemplateProfile | undefined {
  const id = (templateId || DEFAULT_REMARKETING_TEMPLATE_ID).trim()
  return REMARKETING_TEMPLATE_PROFILES.find((p) => p.id === id)
}

function firstEnvValue(keys: string[]): string {
  for (const key of keys) {
    const value = (process.env[key] || '').trim()
    if (value) return value
  }
  return ''
}

/** Nombre de plantilla en Meta resolviendo env + default del perfil */
export function resolveRemarketingMetaTemplateName(profile: RemarketingTemplateProfile): string {
  return firstEnvValue(profile.metaTemplateNameEnvKeys) || profile.metaTemplateNameDefault
}

export function resolveRemarketingBodyParameterName(
  profile: RemarketingTemplateProfile
): string | undefined {
  if (profile.bodyParameterName) return profile.bodyParameterName
  if (profile.bodyMode === 'full_message') {
    const fromEnv = (process.env.WHATSAPP_TEMPLATE_BODY_PARAMETER_NAME || '').trim()
    return fromEnv || undefined
  }
  return undefined
}

export function buildRemarketingTemplateBodyValue(
  profile: RemarketingTemplateProfile,
  contactFirstName: string,
  fullMessage: string
): string {
  if (profile.bodyMode === 'name_only') {
    return contactFirstName.trim() || 'Cliente'
  }
  return fullMessage
}

export function formatRemarketingPreview(preview: string, firstName?: string | null): string {
  const name = (firstName || '').trim() || 'Cliente'
  return preview.replace(/\{nombre\}/g, name)
}
