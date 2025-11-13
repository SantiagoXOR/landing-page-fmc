'use client'

import { useState, useCallback, useEffect } from 'react'
import { 
  DndContext, 
  DragEndEvent, 
  DragOverEvent, 
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core'

import { toast } from 'sonner'
import { 
  PipelineLead, 
  PipelineStage, 
  DragDropResult, 
  TransitionValidation,
  StageTransition 
} from '@/types/pipeline'

interface UsePipelineDragDropProps {
  stages: PipelineStage[]
  leads: PipelineLead[]
  onLeadMove: (result: DragDropResult) => Promise<boolean>
  onStageTransition?: (transition: StageTransition) => void
  validateTransition?: (leadId: string, fromStage: string, toStage: string) => Promise<TransitionValidation>
}

export function usePipelineDragDrop({
  stages,
  leads,
  onLeadMove,
  onStageTransition,
  validateTransition
}: UsePipelineDragDropProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedLead, setDraggedLead] = useState<PipelineLead | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Configurar sensores para el drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mínima distancia para activar el drag
      },
    })
  )

  // Organizar leads por etapa
  const leadsByStage = useCallback(() => {
    const organized: Record<string, PipelineLead[]> = {}
    
    stages.forEach(stage => {
      organized[stage.id] = leads.filter(lead => lead.stageId === stage.id)
        .sort((a, b) => {
          // Ordenar por prioridad y luego por fecha de entrada a la etapa
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          const aPriority = priorityOrder[a.priority] || 1
          const bPriority = priorityOrder[b.priority] || 1
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority
          }
          
          return new Date(a.stageEntryDate).getTime() - new Date(b.stageEntryDate).getTime()
        })
    })
    
    return organized
  }, [stages, leads])

  // Validar si una transición es permitida
  const validateStageTransition = useCallback(async (
    leadId: string, 
    fromStageId: string, 
    toStageId: string
  ): Promise<TransitionValidation> => {
    if (validateTransition) {
      return await validateTransition(leadId, fromStageId, toStageId)
    }

    // Validación básica por defecto
    const fromStage = stages.find(s => s.id === fromStageId)
    const toStage = stages.find(s => s.id === toStageId)
    const lead = leads.find(l => l.id === leadId)

    if (!fromStage || !toStage || !lead) {
      return {
        isValid: false,
        errors: ['Etapa o lead no encontrado'],
        warnings: []
      }
    }

    const errors: string[] = []
    const warnings: string[] = []

    // Verificar reglas de la etapa de destino
    if (toStage.rules) {
      for (const rule of toStage.rules) {
        if (!rule.isActive) continue

        switch (rule.type) {
          case 'required_field':
            if (rule.field && !lead.customFields?.[rule.field]) {
              errors.push(`Campo requerido: ${rule.field}`)
            }
            break
          
          case 'min_time':
            const timeInStage = Date.now() - new Date(lead.stageEntryDate).getTime()
            const minTime = (rule.value || 0) * 24 * 60 * 60 * 1000 // días a ms
            if (timeInStage < minTime) {
              warnings.push(`El lead debe permanecer al menos ${rule.value} días en la etapa actual`)
            }
            break

          case 'approval_required':
            // En una implementación real, verificaríamos si hay aprobación pendiente
            warnings.push('Esta transición requiere aprobación')
            break
        }
      }
    }

    // Verificar si se está saltando etapas
    const fromOrder = fromStage.order
    const toOrder = toStage.order
    if (Math.abs(toOrder - fromOrder) > 1) {
      warnings.push('Se está saltando una o más etapas del pipeline')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }, [stages, leads, validateTransition])

  // Manejar inicio del drag
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    
    const lead = leads.find(l => l.id === active.id)
    if (lead) {
      setDraggedLead(lead)
    }
  }, [leads])

  // Manejar drag over (para feedback visual)
  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Aquí podríamos agregar lógica para feedback visual durante el drag
  }, [])

  // Manejar fin del drag
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveId(null)
    setDraggedLead(null)
    setValidationErrors([])

    if (!over || !draggedLead) return

    const leadId = active.id as string
    const newStageId = over.id as string
    const currentStageId = draggedLead.stageId

    // Si se suelta en la misma etapa, no hacer nada
    if (newStageId === currentStageId) return

    try {
      setIsValidating(true)

      // Validar la transición
      const validation = await validateStageTransition(leadId, currentStageId, newStageId)
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors)
        toast.error('No se puede mover el lead', {
          description: validation.errors.join(', ')
        })
        return
      }

      // Mostrar warnings si los hay
      if (validation.warnings.length > 0) {
        toast.warning('Advertencias', {
          description: validation.warnings.join(', ')
        })
      }

      // Encontrar índices para el resultado
      const organizedLeads = leadsByStage()
      const sourceLeads = organizedLeads[currentStageId] || []
      const sourceIndex = sourceLeads.findIndex(l => l.id === leadId)

      const result: DragDropResult = {
        leadId,
        sourceStageId: currentStageId,
        destinationStageId: newStageId,
        sourceIndex,
        destinationIndex: 0 // Por defecto al inicio de la nueva etapa
      }

      // Ejecutar el movimiento
      const success = await onLeadMove(result)

      if (success) {
        toast.success('Lead movido exitosamente')
        
        // Crear registro de transición
        const transition: StageTransition = {
          id: `transition-${Date.now()}`,
          leadId,
          fromStageId: currentStageId,
          toStageId: newStageId,
          date: new Date(),
          userId: 'current-user', // En una implementación real, obtener del contexto
          userName: 'Usuario Actual',
          duration: Math.floor((Date.now() - new Date(draggedLead.stageEntryDate).getTime()) / (1000 * 60 * 60 * 24)),
          wasAutomated: false
        }

        onStageTransition?.(transition)
      } else {
        toast.error('Error al mover el lead')
      }

    } catch (error) {
      console.error('Error en drag & drop:', error)
      toast.error('Error inesperado al mover el lead')
    } finally {
      setIsValidating(false)
    }
  }, [draggedLead, leadsByStage, validateStageTransition, onLeadMove, onStageTransition])

  // Obtener el lead que se está arrastrando
  const getActiveLead = useCallback(() => {
    if (!activeId) return null
    return leads.find(lead => lead.id === activeId) || null
  }, [activeId, leads])

  // Verificar si una etapa puede recibir un lead
  const canDropInStage = useCallback((stageId: string, leadId?: string) => {
    if (!leadId || !draggedLead) return true

    const stage = stages.find(s => s.id === stageId)
    if (!stage || !stage.isActive) return false

    // Verificar límites de leads por etapa
    const currentLeadsInStage = leads.filter(l => l.stageId === stageId).length
    // Nota: max_leads no está en el tipo StageRule actual, se implementará en el futuro
    // const maxLeads = stage.rules?.find(r => r.type === 'max_leads')?.value

    // if (maxLeads && currentLeadsInStage >= maxLeads) {
    //   return false
    // }

    return true
  }, [stages, leads, draggedLead])

  // Obtener estadísticas de la etapa
  const getStageStats = useCallback((stageId: string) => {
    const stageLeads = leads.filter(l => l.stageId === stageId)
    const totalValue = stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0)
    const averageScore = stageLeads.length > 0 
      ? stageLeads.reduce((sum, lead) => sum + (lead.score || 0), 0) / stageLeads.length 
      : 0

    return {
      count: stageLeads.length,
      totalValue,
      averageScore,
      highPriorityCount: stageLeads.filter(l => l.priority === 'high' || l.priority === 'urgent').length
    }
  }, [leads])

  return {
    // Estado
    activeId,
    draggedLead,
    isValidating,
    validationErrors,
    
    // Datos organizados
    leadsByStage: leadsByStage(),
    
    // Handlers para DndContext
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    
    // Utilidades
    getActiveLead,
    canDropInStage,
    getStageStats,
    validateStageTransition,
    
    // Configuración para DndContext
    collisionDetection: closestCorners
  }
}
