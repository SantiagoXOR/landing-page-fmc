/**
 * Lectura de mapeo etapa → tag desde pipeline_stage_tags (solo BD).
 * Sin integración con ManyChat/UChat.
 */

import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Obtener el nombre de tag para una etapa del pipeline (desde BD).
 */
export async function getTagForStage(stage: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('pipeline_stage_tags')
      .select('manychat_tag')
      .eq('stage', stage)
      .eq('tag_type', 'pipeline')
      .eq('is_active', true)
      .single()

    if (error) {
      logger.error(`Failed to get tag for stage ${stage}`, { error: error.message })
      return null
    }

    const tag = data?.manychat_tag || null

    if (stage === 'PREAPROBADO' && tag !== 'credito-preaprobado') {
      return 'credito-preaprobado'
    }
    if (stage === 'APROBADO' && tag !== 'credito-aprobado') {
      return 'credito-aprobado'
    }
    if (stage === 'RECHAZADO' && tag !== 'credito-rechazado') {
      return 'credito-rechazado'
    }

    return tag
  } catch (error: any) {
    logger.error(`Error getting tag for stage ${stage}`, { error: error.message })
    return null
  }
}

/**
 * Obtener todos los tags de pipeline (para filtrado).
 */
export async function getPipelineTags(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('pipeline_stage_tags')
      .select('manychat_tag')
      .eq('tag_type', 'pipeline')
      .eq('is_active', true)

    if (error) {
      logger.error('Failed to get pipeline tags', { error: error.message })
      return []
    }

    return (data || []).map((row: { manychat_tag: string }) => row.manychat_tag)
  } catch (error: any) {
    logger.error('Error getting pipeline tags', { error: error.message })
    return []
  }
}

/**
 * Obtener todos los tags de negocio.
 */
export async function getBusinessTags(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('pipeline_stage_tags')
      .select('manychat_tag')
      .eq('tag_type', 'business')
      .eq('is_active', true)

    if (error) {
      logger.error('Failed to get business tags', { error: error.message })
      return []
    }

    return (data || []).map((row: { manychat_tag: string }) => row.manychat_tag)
  } catch (error: any) {
    logger.error('Error getting business tags', { error: error.message })
    return []
  }
}
