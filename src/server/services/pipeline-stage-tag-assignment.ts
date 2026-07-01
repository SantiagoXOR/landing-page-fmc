import { supabase } from '@/lib/db'
import { getTagForStage, getPipelineTags } from '@/lib/pipeline-stage-tags'
import { stageIdToPipelineEnum } from '@/lib/pipeline-stage-map'
import { logger } from '@/lib/logger'

/** Asigna el tag de pipeline correspondiente a la etapa destino. */
export async function assignStageTagForLead(leadId: string, stageId: string): Promise<void> {
  try {
    const lead = await supabase.findLeadById(leadId)
    if (!lead) {
      logger.warn('Lead not found for tag assignment', { leadId })
      return
    }

    const stageEnum = stageIdToPipelineEnum(stageId)
    const tagToAdd = await getTagForStage(stageEnum)
    if (!tagToAdd) {
      logger.warn('No tag mapping found for stage', { leadId, stageId, stageEnum })
      return
    }

    const pipelineTagNames = await getPipelineTags()

    let currentTags: string[] = []
    if (lead.tags) {
      try {
        currentTags = typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags
      } catch {
        currentTags = Array.isArray(lead.tags) ? lead.tags : []
      }
    }

    let filteredTags: string[]
    if (stageEnum === 'LISTO_ANALISIS') {
      filteredTags = [tagToAdd]
    } else {
      filteredTags = currentTags.filter((tag) => !pipelineTagNames.includes(tag))
      if (!filteredTags.includes(tagToAdd)) {
        filteredTags.push(tagToAdd)
      }
    }

    await supabase.updateLead(leadId, {
      tags: JSON.stringify(filteredTags),
    })
  } catch (error) {
    logger.error('Error assigning stage tag', {
      leadId,
      stageId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
