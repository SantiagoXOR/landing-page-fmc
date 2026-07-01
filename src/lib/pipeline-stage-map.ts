/** Mapeo stageId (UI) ↔ enum lead_pipeline.current_stage */

export const STAGE_ID_TO_PIPELINE_STAGE: Record<string, string[]> = {
  'cliente-nuevo': ['CLIENTE_NUEVO'],
  'consultando-credito': ['CONSULTANDO_CREDITO'],
  'solicitando-docs': ['SOLICITANDO_DOCS'],
  'listo-analisis': ['LISTO_ANALISIS'],
  preaprobado: ['PREAPROBADO'],
  rechazado: ['RECHAZADO'],
  aprobado: ['APROBADO'],
  'en-seguimiento': ['EN_SEGUIMIENTO'],
  'cerrado-ganado': ['CERRADO_GANADO'],
  'solicitar-referido': ['SOLICITAR_REFERIDO'],
  remarketing: ['REMARKETING'],
  encuesta: ['ENCUESTA'],
  'encuesta-pendiente': ['ENCUESTA'],
}

const LEGACY_STAGE_ID_TO_ENUM: Record<string, string> = {
  nuevo: 'CLIENTE_NUEVO',
  contactado: 'CONSULTANDO_CREDITO',
  calificado: 'LISTO_ANALISIS',
  propuesta: 'PREAPROBADO',
  negociacion: 'APROBADO',
  'cerrado-ganado': 'CERRADO_GANADO',
  'cerrado-perdido': 'RECHAZADO',
  'solicitando-documentacion': 'SOLICITANDO_DOCS',
  'venta-cerrada': 'CERRADO_GANADO',
}

/** Etapas disponibles para broadcast masivo (orden pipeline) */
export const BROADCAST_STAGE_OPTIONS: { id: string; label: string }[] = [
  { id: 'remarketing', label: 'Remarketing' },
  { id: 'preaprobado', label: 'Preaprobado' },
  { id: 'rechazado', label: 'Rechazado' },
  { id: 'aprobado', label: 'Aprobado' },
  { id: 'en-seguimiento', label: 'En seguimiento' },
  { id: 'listo-analisis', label: 'Listo para análisis' },
  { id: 'solicitando-docs', label: 'Solicitando documentación' },
  { id: 'consultando-credito', label: 'Consultando crédito' },
  { id: 'cliente-nuevo', label: 'Cliente nuevo' },
  { id: 'cerrado-ganado', label: 'Cerrado ganado' },
  { id: 'solicitar-referido', label: 'Solicitar referido' },
]

export function resolvePipelineStagesForStageId(stageId: string): string[] {
  const normalized = stageId.toLowerCase().trim()
  return STAGE_ID_TO_PIPELINE_STAGE[normalized] || []
}

export function getBroadcastStageLabel(stageId: string): string {
  return BROADCAST_STAGE_OPTIONS.find((s) => s.id === stageId)?.label || stageId
}

export function stageIdToPipelineEnum(stageId: string): string {
  const normalized = stageId.toLowerCase().trim()
  const mapped = STAGE_ID_TO_PIPELINE_STAGE[normalized]?.[0]
  if (mapped) return mapped
  if (LEGACY_STAGE_ID_TO_ENUM[normalized]) return LEGACY_STAGE_ID_TO_ENUM[normalized]
  return normalized.toUpperCase().replace(/-/g, '_')
}
