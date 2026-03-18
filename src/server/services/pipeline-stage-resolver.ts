/**
 * Resolución de etapa de pipeline para un lead.
 * Misma lógica que el tablero: pipeline + tags (Manychat) + estado del lead.
 * Usado por la API de métricas para que los números coincidan con lo que ve el usuario.
 */

// Mapeo de pipeline_stage (enum de DB) a stageId interno
export const pipelineStageToStageId: Record<string, string> = {
  'LEAD_NUEVO': 'nuevo',
  'CLIENTE_NUEVO': 'nuevo',
  'CONTACTO_INICIAL': 'contactado',
  'CONSULTANDO_CREDITO': 'contactado',
  'CALIFICACION': 'calificado',
  'SOLICITANDO_DOCS': 'calificado',
  'PRESENTACION': 'calificado',
  'LISTO_ANALISIS': 'propuesta',
  'PROPUESTA': 'propuesta',
  'PREAPROBADO': 'negociacion',
  'NEGOCIACION': 'negociacion',
  'APROBADO': 'negociacion',
  'CIERRE_GANADO': 'cerrado-ganado',
  'CERRADO_GANADO': 'cerrado-ganado',
  'CIERRE_PERDIDO': 'cerrado-perdido',
  'RECHAZADO': 'cerrado-perdido',
  'SEGUIMIENTO': 'cerrado-ganado'
}

// Mapeo de estados del lead a stageId (fallback si no hay pipeline)
const estadoToStageId: Record<string, string> = {
  'NUEVO': 'nuevo',
  'CONTACTADO': 'contactado',
  'EN_REVISION': 'calificado',
  'CALIFICADO': 'calificado',
  'PREAPROBADO': 'propuesta',
  'PROPUESTA': 'propuesta',
  'NEGOCIACION': 'negociacion',
  'DOC_PENDIENTE': 'propuesta',
  'RECHAZADO': 'cerrado-perdido',
  'DERIVADO': 'cerrado-ganado'
}

// Mapeo de tags (Manychat, etc.) a stageId
const tagToStageId: Record<string, string> = {
  'lead-consultando': 'contactado',
  'consultando-credito': 'contactado',
  'consultando': 'contactado',
  'solicitud-en-proceso': 'propuesta',
  'solicitando-docs': 'calificado',
  'solicitando-documentacion': 'calificado',
  'documentacion': 'calificado',
  'listo-para-analisis': 'propuesta',
  'listo-analisis': 'propuesta',
  'preaprobado': 'negociacion',
  'pre-aprobado': 'negociacion',
  'aprobado': 'negociacion',
  'cerrado-ganado': 'cerrado-ganado',
  'venta-concretada': 'cerrado-ganado',
  'rechazado': 'cerrado-perdido',
  'credito-rechazado': 'cerrado-perdido',
  'rechazado-credito': 'cerrado-perdido',
  'perdido': 'cerrado-perdido',
  'nuevo-lead': 'nuevo',
  'nuevo': 'nuevo',
  'contactado': 'contactado',
  'calificado': 'calificado',
  'propuesta-enviada': 'propuesta',
  'negociacion': 'negociacion'
}

const initialStages = ['LEAD_NUEVO', 'CLIENTE_NUEVO']

export interface ResolvedStage {
  stageId: string
  stageEntryDate: Date
}

function createValidDate(dateValue: unknown): Date {
  try {
    if (!dateValue) return new Date()
    const date = new Date(dateValue as string)
    if (isNaN(date.getTime())) return new Date()
    return date
  } catch {
    return new Date()
  }
}

/**
 * Resuelve la etapa que debe mostrarse para un lead (igual que el tablero).
 * Prioridad: pipeline → tags → estado del lead → 'nuevo'.
 */
export function resolveDisplayStage(
  lead: { id?: string; tags?: unknown; estado?: string; createdAt?: string },
  pipelineInfo: { current_stage: string; stage_entered_at: string } | null
): ResolvedStage {
  let tagsArray: string[] = []
  try {
    if (lead.tags) {
      const raw = typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags
      tagsArray = Array.isArray(raw) ? raw.map((t: unknown) => String(t).toLowerCase().trim()) : []
    }
  } catch {
    tagsArray = []
  }

  let stageId: string = 'nuevo'
  let stageEntryDate: Date = new Date()

  let stageFromTag: string | null = null
  for (const tag of tagsArray) {
    const tagLower = String(tag).toLowerCase().trim()
    if (tagToStageId[tagLower]) {
      stageFromTag = tagToStageId[tagLower]
      break
    }
  }

  if (pipelineInfo?.current_stage) {
    const pipelineStageId = pipelineStageToStageId[pipelineInfo.current_stage] || 'nuevo'
    if (stageFromTag) {
      if (stageFromTag !== pipelineStageId || initialStages.includes(pipelineInfo.current_stage)) {
        stageId = stageFromTag
      } else {
        stageId = pipelineStageId
      }
    } else {
      stageId = pipelineStageId
    }
    stageEntryDate = createValidDate(pipelineInfo.stage_entered_at ?? lead.createdAt)
  } else {
    if (stageFromTag) {
      stageId = stageFromTag
    } else {
      const estadoNormalizado = lead.estado ? String(lead.estado).trim().toUpperCase() : 'NUEVO'
      stageId = estadoToStageId[estadoNormalizado] ?? 'nuevo'
    }
    stageEntryDate = createValidDate(lead.createdAt)
  }

  return { stageId, stageEntryDate }
}
