import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'

// Tipos para el pipeline
export type PipelineStage = 
  | 'LEAD_NUEVO'
  | 'CONTACTO_INICIAL'
  | 'CALIFICACION'
  | 'PRESENTACION'
  | 'PROPUESTA'
  | 'NEGOCIACION'
  | 'CIERRE_GANADO'
  | 'CIERRE_PERDIDO'
  | 'SEGUIMIENTO'

export type TransitionType = 'MANUAL' | 'AUTOMATIC' | 'SCHEDULED'

export type LossReason = 
  | 'PRECIO'
  | 'COMPETENCIA'
  | 'PRESUPUESTO'
  | 'TIMING'
  | 'NO_INTERES'
  | 'NO_CONTACTO'
  | 'OTRO'

export interface LeadPipeline {
  id: string
  lead_id: string
  current_stage: PipelineStage
  stage_entered_at: string
  closed_at?: string
  won?: boolean
  loss_reason?: LossReason
  loss_notes?: string
  total_value?: number
  probability_percent: number
  expected_close_date?: string
  last_activity_date?: string
  next_follow_up_date?: string
  assigned_to?: string
  created_at: string
  updated_at: string
}

export interface PipelineTransition {
  id: string
  from_stage: PipelineStage
  to_stage: PipelineStage
  transition_name: string
  is_allowed: boolean
  requires_approval: boolean
  auto_transition_days?: number
  required_fields?: any
  validation_rules?: any
}

export interface PipelineHistory {
  id: string
  lead_pipeline_id: string
  from_stage?: PipelineStage
  to_stage: PipelineStage
  transition_type: TransitionType
  duration_in_stage_days?: number
  notes?: string
  changed_by?: string
  changed_at: string
  metadata?: any
}

export class PipelineService {
  
  // Obtener pipeline de un lead
  async getLeadPipeline(leadId: string): Promise<LeadPipeline | null> {
    try {
      // Getting pipeline for lead
      const pipelines = await supabase.request(`/lead_pipeline?lead_id=eq.${leadId}&limit=1`)

      if (pipelines && pipelines.length > 0) {
        // Pipeline found for lead
        return pipelines[0]
      } else {
        // No pipeline found for lead
        return null
      }
    } catch (error) {
      logger.error('Error getting lead pipeline:', error)
      // Si la tabla no existe, devolver null en lugar de lanzar error
      if (error instanceof Error && error.message.includes('relation "lead_pipeline" does not exist')) {
        // Pipeline table does not exist yet
        return null
      }
      throw error
    }
  }

  // Crear pipeline para un lead nuevo
  async createLeadPipeline(leadId: string, assignedTo?: string): Promise<LeadPipeline> {
    try {
      // Verificar si ya existe un pipeline para este lead
      const existingPipeline = await this.getLeadPipeline(leadId)
      if (existingPipeline) {
        // Pipeline already exists for lead
        return existingPipeline
      }

      const pipelineData = {
        lead_id: leadId,
        current_stage: 'LEAD_NUEVO' as PipelineStage,
        probability_percent: 10,
        expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días
        assigned_to: assignedTo || null,
        total_value: 50000 // Valor por defecto
      }

      // Creating pipeline with data

      const pipelines = await supabase.request('/lead_pipeline', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(pipelineData)
      })

      if (!pipelines || pipelines.length === 0) {
        throw new Error('No pipeline returned from creation')
      }

      const pipeline = pipelines[0]
      // Pipeline created successfully

      // Crear entrada en historial
      try {
        await this.createHistoryEntry(pipeline.id, null, 'LEAD_NUEVO', 'MANUAL', 'Pipeline creado')
      } catch (historyError) {
        logger.error('Error creating history entry:', historyError)
        // No fallar la creación del pipeline por esto
      }

      return pipeline
    } catch (error) {
      logger.error('Error creating lead pipeline:', error)
      // Intentar crear con datos mínimos si falla
      try {
        const minimalData = {
          lead_id: leadId,
          current_stage: 'LEAD_NUEVO' as PipelineStage,
          probability_percent: 10
        }

        const pipelines = await supabase.request('/lead_pipeline', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(minimalData)
        })

        return pipelines[0]
      } catch (fallbackError) {
        logger.error('Fallback pipeline creation also failed:', fallbackError)
        throw new Error(`Failed to create pipeline for lead ${leadId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  // Obtener transiciones permitidas desde una etapa
  async getAllowedTransitions(fromStage: PipelineStage): Promise<PipelineTransition[]> {
    try {
      const transitions = await supabase.request(
        `/pipeline_transitions?from_stage=eq.${fromStage}&is_allowed=eq.true`
      )
      return transitions
    } catch (error) {
      logger.error('Error getting allowed transitions:', error)
      throw error
    }
  }

  // Validar si una transición es permitida
  async isTransitionAllowed(fromStage: PipelineStage, toStage: PipelineStage): Promise<boolean> {
    try {
      const transitions = await supabase.request(
        `/pipeline_transitions?from_stage=eq.${fromStage}&to_stage=eq.${toStage}&is_allowed=eq.true&limit=1`
      )
      return transitions.length > 0
    } catch (error) {
      logger.error('Error validating transition:', error)
      return false
    }
  }

  // Mover lead a nueva etapa
  async moveLeadToStage(
    leadId: string, 
    newStage: PipelineStage, 
    userId: string, 
    notes?: string,
    lossReason?: LossReason
  ): Promise<LeadPipeline> {
    try {
      // Obtener pipeline actual
      const currentPipeline = await this.getLeadPipeline(leadId)
      if (!currentPipeline) {
        throw new Error('Lead not found in pipeline')
      }

      // Validar transición
      const isAllowed = await this.isTransitionAllowed(currentPipeline.current_stage, newStage)
      if (!isAllowed) {
        throw new Error(`Transition from ${currentPipeline.current_stage} to ${newStage} is not allowed`)
      }

      // Calcular duración en etapa actual
      const stageEnteredAt = new Date(currentPipeline.stage_entered_at)
      const durationDays = Math.floor((Date.now() - stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24))

      // Preparar datos de actualización
      const updateData: any = {
        current_stage: newStage,
        stage_entered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Actualizar probabilidad según etapa
      updateData.probability_percent = this.getProbabilityForStage(newStage)

      // Si es etapa final, marcar como cerrado
      if (newStage === 'CIERRE_GANADO' || newStage === 'CIERRE_PERDIDO') {
        updateData.closed_at = new Date().toISOString()
        updateData.won = newStage === 'CIERRE_GANADO'
        
        if (newStage === 'CIERRE_PERDIDO' && lossReason) {
          updateData.loss_reason = lossReason
          updateData.loss_notes = notes
        }
      }

      // Actualizar pipeline
      const updatedPipelines = await supabase.request(`/lead_pipeline?id=eq.${currentPipeline.id}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(updateData)
      })

      const updatedPipeline = updatedPipelines[0]

      // Crear entrada en historial
      await this.createHistoryEntry(
        currentPipeline.id,
        currentPipeline.current_stage,
        newStage,
        'MANUAL',
        notes,
        userId,
        durationDays
      )

      return updatedPipeline
    } catch (error) {
      logger.error('Error moving lead to stage:', error)
      throw error
    }
  }

  // Crear entrada en historial
  private async createHistoryEntry(
    pipelineId: string,
    fromStage: PipelineStage | null,
    toStage: PipelineStage,
    transitionType: TransitionType,
    notes?: string,
    userId?: string,
    durationDays?: number
  ): Promise<void> {
    try {
      const historyData = {
        lead_pipeline_id: pipelineId,
        from_stage: fromStage,
        to_stage: toStage,
        transition_type: transitionType,
        duration_in_stage_days: durationDays,
        notes: notes,
        changed_by: userId,
        changed_at: new Date().toISOString()
      }

      await supabase.request('/pipeline_history', {
        method: 'POST',
        body: JSON.stringify(historyData)
      })
    } catch (error) {
      logger.error('Error creating history entry:', error)
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  // Obtener probabilidad por etapa
  private getProbabilityForStage(stage: PipelineStage): number {
    const probabilities: Record<PipelineStage, number> = {
      'LEAD_NUEVO': 10,
      'CONTACTO_INICIAL': 20,
      'CALIFICACION': 30,
      'PRESENTACION': 50,
      'PROPUESTA': 70,
      'NEGOCIACION': 80,
      'CIERRE_GANADO': 100,
      'CIERRE_PERDIDO': 0,
      'SEGUIMIENTO': 100
    }
    return probabilities[stage] || 10
  }

  // Obtener historial de un lead
  async getLeadHistory(leadId: string): Promise<PipelineHistory[]> {
    try {
      const pipeline = await this.getLeadPipeline(leadId)
      if (!pipeline) return []

      const history = await supabase.request(
        `/pipeline_history?lead_pipeline_id=eq.${pipeline.id}&order=changed_at.desc`
      )
      return history
    } catch (error) {
      logger.error('Error getting lead history:', error)
      throw error
    }
  }

  // Obtener métricas del pipeline
  async getPipelineMetrics(dateFrom?: string, dateTo?: string) {
    try {
      // Usar función de base de datos para obtener métricas
      // Llamar a la función RPC de Supabase con POST body
      const rpcBody = {
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null
      }

      const endpoint = `/rpc/get_pipeline_metrics`
      const rawMetrics = await supabase.request(endpoint, { 
        method: 'POST',
        body: JSON.stringify(rpcBody)
      })

      // Transformar los datos a la estructura esperada
      const metrics = {
        totalLeads: rawMetrics?.reduce((sum: number, item: any) => sum + (item.total_leads || 0), 0) || 0,
        totalValue: 0, // Calcular desde los leads
        averageDealSize: 0,
        conversionRate: rawMetrics?.find((item: any) => item.stage === 'won')?.conversion_rate || 0,
        averageSalesCycle: rawMetrics?.reduce((sum: number, item: any) => sum + (item.avg_duration_days || 0), 0) / (rawMetrics?.length || 1) || 0,
        stageMetrics: {},
        trends: {
          leadsThisWeek: 0,
          leadsLastWeek: 0,
          valueThisWeek: 0,
          valueLastWeek: 0,
          conversionThisWeek: 0,
          conversionLastWeek: 0
        },
        forecasting: {
          projectedRevenue: 0,
          projectedClosedDeals: 0,
          confidence: 0.75
        }
      }

      // Procesar métricas por etapa
      if (rawMetrics && Array.isArray(rawMetrics)) {
        rawMetrics.forEach((item: any) => {
          if (item.stage && typeof item.stage === 'string') {
            (metrics.stageMetrics as any)[item.stage] = {
              totalLeads: item.total_leads || 0,
              averageDuration: item.avg_duration_days || 0,
              conversionRate: item.conversion_rate || 0
            }
          }
        })
      }

      return metrics
    } catch (error) {
      logger.error('Error getting pipeline metrics:', error)

      // Retornar métricas por defecto en caso de error
      return {
        totalLeads: 0,
        totalValue: 0,
        averageDealSize: 0,
        conversionRate: 0,
        averageSalesCycle: 0,
        stageMetrics: {},
        trends: {
          leadsThisWeek: 0,
          leadsLastWeek: 0,
          valueThisWeek: 0,
          valueLastWeek: 0,
          conversionThisWeek: 0,
          conversionLastWeek: 0
        },
        forecasting: {
          projectedRevenue: 0,
          projectedClosedDeals: 0,
          confidence: 0.75
        }
      }
    }
  }

  // Procesar transiciones automáticas
  async processAutomaticTransitions(): Promise<void> {
    try {
      // Obtener transiciones con auto_transition_days configurado
      const autoTransitions = await supabase.request(
        '/pipeline_transitions?auto_transition_days=not.is.null'
      )

      for (const transition of autoTransitions) {
        // Buscar leads que cumplan condiciones para transición automática
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - transition.auto_transition_days)

        const candidatePipelines = await supabase.request(
          `/lead_pipeline?current_stage=eq.${transition.from_stage}&stage_entered_at=lt.${cutoffDate.toISOString()}`
        )

        // Procesar cada candidato
        for (const pipeline of candidatePipelines) {
          try {
            await this.moveLeadToStage(
              pipeline.lead_id,
              transition.to_stage,
              'system', // Usuario del sistema
              `Transición automática después de ${transition.auto_transition_days} días`
            )
          } catch (error) {
            logger.error(`Error in automatic transition for lead ${pipeline.lead_id}:`, error)
            // Continuar con el siguiente lead
          }
        }
      }
    } catch (error) {
      logger.error('Error processing automatic transitions:', error)
      throw error
    }
  }
}

export const pipelineService = new PipelineService()
