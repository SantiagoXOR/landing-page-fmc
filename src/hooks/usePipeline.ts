import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { PipelineStage, LossReason, LeadPipeline, PipelineTransition, PipelineHistory } from '@/server/services/pipeline-service'
import { notifyPipelineChanged } from '@/lib/notification-helpers'
import { logger } from '@/lib/logger'

export function usePipeline(leadId?: string) {
  const { addToast } = useToast()
  const [pipeline, setPipeline] = useState<LeadPipeline | null>(null)
  const [history, setHistory] = useState<PipelineHistory[]>([])
  const [allowedTransitions, setAllowedTransitions] = useState<PipelineTransition[]>([])
  const [loading, setLoading] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  // Cargar pipeline de un lead
  const loadPipeline = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/pipeline/${id}`)
      
      if (response.ok) {
        const data = await response.json()
        setPipeline(data)
        
        // Cargar transiciones permitidas
        await loadAllowedTransitions(data.current_stage)
      } else if (response.status === 404) {
        // Pipeline no existe, crear uno nuevo
        await createPipeline(id)
      } else {
        throw new Error('Error loading pipeline')
      }
    } catch (error) {
      logger.error('Error loading pipeline:', error)
      addToast({
        type: 'error',
        title: 'Error',
        description: 'No se pudo cargar el pipeline del lead'
      })
    } finally {
      setLoading(false)
    }
  }

  // Crear pipeline para un lead
  const createPipeline = async (id: string, assignedTo?: string) => {
    try {
      const response = await fetch(`/api/pipeline/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assigned_to: assignedTo })
      })

      if (!response.ok) {
        throw new Error('Error creating pipeline')
      }

      const data = await response.json()
      setPipeline(data)
      
      // Cargar transiciones permitidas
      await loadAllowedTransitions(data.current_stage)

      addToast({
        type: 'success',
        title: 'Pipeline creado',
        description: 'Pipeline de ventas creado exitosamente'
      })
    } catch (error) {
      logger.error('Error creating pipeline:', error)
      addToast({
        type: 'error',
        title: 'Error',
        description: 'No se pudo crear el pipeline'
      })
    }
  }

  // Cargar transiciones permitidas desde una etapa
  const loadAllowedTransitions = async (stage: PipelineStage) => {
    try {
      const response = await fetch(`/api/pipeline/transitions/${stage}`)
      
      if (response.ok) {
        const data = await response.json()
        setAllowedTransitions(data)
      }
    } catch (error) {
      logger.error('Error loading transitions:', error)
    }
  }

  // Cargar historial de transiciones
  const loadHistory = async (id: string) => {
    try {
      const response = await fetch(`/api/pipeline/${id}/history`)
      
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      }
    } catch (error) {
      logger.error('Error loading history:', error)
    }
  }

  // Mover lead a nueva etapa
  const moveToStage = async (
    id: string, 
    newStage: PipelineStage, 
    notes?: string, 
    lossReason?: LossReason
  ) => {
    try {
      setTransitioning(true)
      
      const response = await fetch(`/api/pipeline/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_stage: newStage,
          notes,
          loss_reason: lossReason
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error moving lead')
      }

      const updatedPipeline = await response.json()
      setPipeline(updatedPipeline)
      
      // Actualizar transiciones permitidas
      await loadAllowedTransitions(newStage)
      
      // Recargar historial
      await loadHistory(id)

      // Enviar notificación en tiempo real
      try {
        // Obtener información del lead para la notificación
        const leadResponse = await fetch(`/api/leads/${id}`)
        if (leadResponse.ok) {
          const leadData = await leadResponse.json()
          notifyPipelineChanged({
            id: updatedPipeline.id,
            nombre: 'Pipeline',
            etapa: getStageDisplayName(newStage),
            leadId: id,
            leadNombre: leadData.nombre
          }, 'moved')
        }
      } catch (notificationError) {
        logger.warn('Error enviando notificación de pipeline:', notificationError)
      }

      addToast({
        type: 'success',
        title: 'Etapa actualizada',
        description: `Lead movido a ${getStageDisplayName(newStage)}`
      })

      return updatedPipeline
    } catch (error) {
      logger.error('Error moving lead:', error)
      addToast({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo mover el lead'
      })
      throw error
    } finally {
      setTransitioning(false)
    }
  }

  // Obtener nombre de visualización de la etapa
  const getStageDisplayName = (stage: PipelineStage): string => {
    const stageNames: Record<PipelineStage, string> = {
      'CLIENTE_NUEVO': 'Cliente Nuevo',
      'CONSULTANDO_CREDITO': 'Consultando Crédito',
      'SOLICITANDO_DOCS': 'Solicitando Documentación',
      'LISTO_ANALISIS': 'Listo para Análisis',
      'PREAPROBADO': 'Preaprobado',
      'APROBADO': 'Aprobado',
      'EN_SEGUIMIENTO': 'En Seguimiento',
      'CERRADO_GANADO': 'Cerrado Ganado',
      'ENCUESTA': 'Encuesta Satisfacción',
      'RECHAZADO': 'Rechazado',
      'SOLICITAR_REFERIDO': 'Solicitar Referido',
      // Legacy support
      'LEAD_NUEVO': 'Cliente Nuevo',
      'CONTACTO_INICIAL': 'Consultando Crédito',
      'CALIFICACION': 'Listo para Análisis',
      'PRESENTACION': 'Preaprobado',
      'PROPUESTA': 'Aprobado',
      'NEGOCIACION': 'En Seguimiento',
      'CIERRE_GANADO': 'Cerrado Ganado',
      'CIERRE_PERDIDO': 'Rechazado',
      'SEGUIMIENTO': 'En Seguimiento'
    }
    return stageNames[stage] || stage
  }

  // Obtener color de la etapa
  const getStageColor = (stage: PipelineStage): string => {
    const stageColors: Record<PipelineStage, string> = {
      'CLIENTE_NUEVO': '#3B82F6',
      'CONSULTANDO_CREDITO': '#10B981',
      'SOLICITANDO_DOCS': '#F59E0B',
      'LISTO_ANALISIS': '#8B5CF6',
      'PREAPROBADO': '#6366F1',
      'APROBADO': '#06B6D4',
      'EN_SEGUIMIENTO': '#84CC16',
      'CERRADO_GANADO': '#059669',
      'ENCUESTA': '#A855F7',
      'RECHAZADO': '#DC2626',
      'SOLICITAR_REFERIDO': '#EC4899',
      // Legacy support
      'LEAD_NUEVO': '#3B82F6',
      'CONTACTO_INICIAL': '#10B981',
      'CALIFICACION': '#8B5CF6',
      'PRESENTACION': '#6366F1',
      'PROPUESTA': '#06B6D4',
      'NEGOCIACION': '#84CC16',
      'CIERRE_GANADO': '#059669',
      'CIERRE_PERDIDO': '#DC2626',
      'SEGUIMIENTO': '#84CC16'
    }
    return stageColors[stage] || '#6B7280'
  }

  // Verificar si una transición es permitida
  const isTransitionAllowed = (toStage: PipelineStage): boolean => {
    return allowedTransitions.some(t => t.to_stage === toStage)
  }

  // Obtener métricas del pipeline
  const getPipelineMetrics = async (dateFrom?: string, dateTo?: string) => {
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)

      const response = await fetch(`/api/pipeline?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Error loading metrics')
      }

      return await response.json()
    } catch (error) {
      console.error('Error loading pipeline metrics:', error)
      addToast({
        type: 'error',
        title: 'Error',
        description: 'No se pudieron cargar las métricas del pipeline'
      })
      return []
    }
  }

  // Cargar pipeline automáticamente si se proporciona leadId
  useEffect(() => {
    if (leadId) {
      loadPipeline(leadId)
      loadHistory(leadId)
    }
  }, [leadId])

  return {
    pipeline,
    history,
    allowedTransitions,
    loading,
    transitioning,
    loadPipeline,
    createPipeline,
    loadHistory,
    moveToStage,
    getStageDisplayName,
    getStageColor,
    isTransitionAllowed,
    getPipelineMetrics
  }
}
