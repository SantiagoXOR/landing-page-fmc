import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  buildRemarketingTemplateBodyValue,
  getRemarketingTemplateProfile,
  resolveRemarketingMetaTemplateName,
  resolveRemarketingBodyParameterName,
  resolveRemarketingHeaderUrl,
  isRemarketingStageId,
  DEFAULT_REMARKETING_TEMPLATE_ID,
} from '@/lib/remarketing-templates'

describe('remarketing-templates', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('detecta etapa remarketing', () => {
    expect(isRemarketingStageId('remarketing')).toBe(true)
    expect(isRemarketingStageId('REMARKETING')).toBe(true)
    expect(isRemarketingStageId('preaprobado')).toBe(false)
  })

  it('resuelve perfil por id o default', () => {
    expect(getRemarketingTemplateProfile('credito_autos_referidos')?.id).toBe(
      'credito_autos_referidos'
    )
    expect(getRemarketingTemplateProfile(undefined)?.id).toBe(DEFAULT_REMARKETING_TEMPLATE_ID)
  })

  it('full_message usa el texto completo', () => {
    const profile = getRemarketingTemplateProfile('seguimiento_credito')!
    expect(buildRemarketingTemplateBodyValue(profile, 'Ana', 'Hola Ana, mensaje largo')).toBe(
      'Hola Ana, mensaje largo'
    )
  })

  it('name_only envía solo el nombre', () => {
    const profile = getRemarketingTemplateProfile('credito_autos_referidos')!
    expect(buildRemarketingTemplateBodyValue(profile, 'Santiago', 'ignorado')).toBe('Santiago')
    expect(buildRemarketingTemplateBodyValue(profile, '', 'ignorado')).toBe('Cliente')
  })

  it('resuelve nombre Meta desde env', () => {
    process.env.WHATSAPP_TEMPLATE_REMARKETING_AUTOS = 'mi_plantilla_autos'
    const profile = getRemarketingTemplateProfile('credito_autos_referidos')!
    expect(resolveRemarketingMetaTemplateName(profile)).toBe('mi_plantilla_autos')
  })

  it('autos usa nombre_contacto como parámetro', () => {
    const profile = getRemarketingTemplateProfile('credito_autos_referidos')!
    expect(resolveRemarketingBodyParameterName(profile)).toBe('nombre_contacto')
  })

  it('seguimiento usa env WHATSAPP_TEMPLATE_BODY_PARAMETER_NAME si existe', () => {
    process.env.WHATSAPP_TEMPLATE_BODY_PARAMETER_NAME = 'mensaje_pipeline'
    const profile = getRemarketingTemplateProfile('seguimiento_credito')!
    expect(resolveRemarketingBodyParameterName(profile)).toBe('mensaje_pipeline')
  })

  it('autos resuelve URL de header desde env', () => {
    process.env.WHATSAPP_TEMPLATE_REMARKETING_AUTOS_HEADER_URL =
      'https://www.formosafmc.com.ar/banners/autos-referidos.jpg'
    const profile = getRemarketingTemplateProfile('credito_autos_referidos')!
    expect(resolveRemarketingHeaderUrl(profile)).toBe(
      'https://www.formosafmc.com.ar/banners/autos-referidos.jpg'
    )
    expect(profile.skipHeader).toBe(false)
  })
})
