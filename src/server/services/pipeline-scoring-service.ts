/**
 * Servicio para calcular scoring de leads basado en tiempo en etapa
 */

import { logger } from '@/lib/logger'

export interface TimeBasedScore {
  score: number // 0-100, donde 100 es mejor (lead fresco)
  daysInStage: number
  urgency: 'low' | 'medium' | 'high' | 'critical'
  color: string // Color para UI
  label: string // Etiqueta descriptiva
}

// Configuración de tiempos normales por etapa (en días)
// Algunas etapas pueden tener tiempos normales más largos
const stageTimeThresholds: Record<string, { normal: number; warning: number; critical: number }> = {
  'nuevo': { normal: 3, warning: 7, critical: 14 },
  'contactado': { normal: 3, warning: 7, critical: 14 },
  'calificado': { normal: 5, warning: 10, critical: 20 },
  'propuesta': { normal: 7, warning: 14, critical: 30 },
  'negociacion': { normal: 10, warning: 20, critical: 45 },
  'cerrado-ganado': { normal: 0, warning: 0, critical: 0 }, // No aplica
  'cerrado-perdido': { normal: 0, warning: 0, critical: 0 }, // No aplica
}

/**
 * Calcular score basado en tiempo que lleva el lead en su etapa actual
 */
export function calculateTimeBasedScore(
  stageEntryDate: Date,
  stageId: string
): TimeBasedScore {
  try {
    const now = new Date()
    const entryDate = new Date(stageEntryDate)
    
    // Calcular días transcurridos
    const diffTime = now.getTime() - entryDate.getTime()
    const daysInStage = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    // Obtener umbrales para esta etapa, o usar valores por defecto
    const thresholds = stageTimeThresholds[stageId] || { 
      normal: 3, 
      warning: 7, 
      critical: 14 
    }
    
    // Si la etapa está cerrada, no calcular score
    if (stageId === 'cerrado-ganado' || stageId === 'cerrado-perdido') {
      return {
        score: 100,
        daysInStage: 0,
        urgency: 'low',
        color: '#10B981', // verde
        label: 'Cerrado'
      }
    }
    
    let score: number
    let urgency: 'low' | 'medium' | 'high' | 'critical'
    let color: string
    let label: string
    
    if (daysInStage <= thresholds.normal) {
      // Lead fresco (0-3 días normalmente)
      score = 100 - (daysInStage * 5) // Penalizar ligeramente por cada día
      urgency = 'low'
      color = '#10B981' // verde
      label = 'Fresco'
    } else if (daysInStage <= thresholds.warning) {
      // Requiere seguimiento (4-7 días normalmente)
      const daysOverNormal = daysInStage - thresholds.normal
      score = Math.max(60, 80 - (daysOverNormal * 5))
      urgency = 'medium'
      color = '#F59E0B' // amarillo/naranja
      label = 'Requiere seguimiento'
    } else if (daysInStage <= thresholds.critical) {
      // Urgente (8-14 días normalmente)
      const daysOverWarning = daysInStage - thresholds.warning
      score = Math.max(30, 60 - (daysOverWarning * 3))
      urgency = 'high'
      color = '#EF4444' // rojo
      label = 'Urgente'
    } else {
      // Crítico (15+ días)
      const daysOverCritical = daysInStage - thresholds.critical
      score = Math.max(0, 30 - (daysOverCritical * 2))
      urgency = 'critical'
      color = '#DC2626' // rojo oscuro
      label = 'Muy urgente'
    }
    
    // Asegurar que el score esté en el rango 0-100
    score = Math.max(0, Math.min(100, Math.round(score)))
    
    return {
      score,
      daysInStage,
      urgency,
      color,
      label
    }
  } catch (error) {
    logger.error('Error calculating time-based score:', error)
    // Retornar score neutro en caso de error
    return {
      score: 50,
      daysInStage: 0,
      urgency: 'medium',
      color: '#6B7280', // gris
      label: 'Sin datos'
    }
  }
}

/**
 * Calcular score para múltiples leads de forma eficiente
 */
export function calculateScoresForLeads(
  leads: Array<{ stageEntryDate: Date; stageId: string }>
): Map<string, TimeBasedScore> {
  const scores = new Map<string, TimeBasedScore>()
  
  for (const lead of leads) {
    const score = calculateTimeBasedScore(lead.stageEntryDate, lead.stageId)
    // Usar un identificador único si está disponible, sino usar índice
    scores.set(lead.stageId, score)
  }
  
  return scores
}

/**
 * Obtener configuración de umbrales para una etapa específica
 */
export function getStageThresholds(stageId: string): { normal: number; warning: number; critical: number } {
  return stageTimeThresholds[stageId] || { 
    normal: 3, 
    warning: 7, 
    critical: 14 
  }
}

/**
 * Actualizar umbrales para una etapa (útil para configuración personalizada)
 */
export function updateStageThresholds(
  stageId: string,
  thresholds: { normal: number; warning: number; critical: number }
): void {
  stageTimeThresholds[stageId] = thresholds
  logger.info(`Updated thresholds for stage ${stageId}`, thresholds)
}

