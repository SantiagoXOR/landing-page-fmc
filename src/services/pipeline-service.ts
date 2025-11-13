/**
 * Servicio para gestión del pipeline avanzado
 */

import { 
  PipelineStage, 
  PipelineLead, 
  DragDropResult, 
  StageTransition,
  PipelineMetrics,
  TransitionValidation,
  PipelineConfig,
  LeadTask,
  LeadActivity,
  ForecastData
} from '@/types/pipeline'

export class PipelineService {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  // Obtener configuración del pipeline
  async getPipelineConfig(): Promise<PipelineConfig> {
    const response = await fetch(`${this.baseUrl}/pipeline/config`)
    if (!response.ok) {
      throw new Error('Error al obtener configuración del pipeline')
    }
    return response.json()
  }

  // Obtener etapas del pipeline
  async getStages(): Promise<PipelineStage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/pipeline/stages`)
      
      if (!response.ok) {
        if (response.status === 404) {
          // No existen stages, retornar array vacío
          return []
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data.stages || []
    } catch (error) {
      console.error('Error fetching stages:', error)
      // Retornar array vacío en lugar de lanzar error
      return []
    }
  }

  // Crear etapas por defecto
  async createDefaultStages(): Promise<PipelineStage[]> {
    const defaultStages = [
      { name: 'Nuevo', order: 0, color: '#3B82F6' },
      { name: 'Contactado', order: 1, color: '#8B5CF6' },
      { name: 'Calificado', order: 2, color: '#6366F1' },
      { name: 'Propuesta', order: 3, color: '#A855F7' },
      { name: 'Negociación', order: 4, color: '#EC4899' },
      { name: 'Ganado', order: 5, color: '#10B981' },
      { name: 'Perdido', order: 6, color: '#EF4444' }
    ]

    const response = await fetch(`${this.baseUrl}/pipeline/stages/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages: defaultStages })
    })

    if (!response.ok) {
      throw new Error('No se pudieron crear las etapas por defecto')
    }

    const data = await response.json()
    return data.stages || []
  }

  // Obtener leads del pipeline
  async getLeads(filters?: any): Promise<PipelineLead[]> {
    const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : ''
    const response = await fetch(`${this.baseUrl}/pipeline/leads${queryParams}`)
    if (!response.ok) {
      throw new Error('Error al obtener leads del pipeline')
    }
    return response.json()
  }

  // Mover lead entre etapas
  async moveLead(result: DragDropResult): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/pipeline/leads/${result.leadId}/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fromStageId: result.sourceStageId,
        toStageId: result.destinationStageId,
        notes: ''
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error al mover lead')
    }

    return true
  }

  // Validar transición de etapa
  async validateTransition(
    leadId: string, 
    fromStageId: string, 
    toStageId: string
  ): Promise<TransitionValidation> {
    const response = await fetch(`${this.baseUrl}/pipeline/validate-transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        leadId,
        fromStageId,
        toStageId
      })
    })

    if (!response.ok) {
      throw new Error('Error al validar transición')
    }

    return response.json()
  }

  // Obtener métricas del pipeline
  async getMetrics(period: 'week' | 'month' | 'quarter' = 'month'): Promise<PipelineMetrics> {
    // Calcular fechas basadas en el período
    const dateTo = new Date().toISOString().split('T')[0]
    const dateFrom = new Date()

    switch (period) {
      case 'week':
        dateFrom.setDate(dateFrom.getDate() - 7)
        break
      case 'quarter':
        dateFrom.setMonth(dateFrom.getMonth() - 3)
        break
      default: // month
        dateFrom.setMonth(dateFrom.getMonth() - 1)
        break
    }

    const params = new URLSearchParams()
    params.append('date_from', dateFrom.toISOString().split('T')[0])
    params.append('date_to', dateTo)

    const response = await fetch(`${this.baseUrl}/pipeline?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Error al obtener métricas del pipeline')
    }
    return response.json()
  }

  // Obtener historial de transiciones
  async getTransitionHistory(leadId?: string): Promise<StageTransition[]> {
    const queryParams = leadId ? `?leadId=${leadId}` : ''
    const response = await fetch(`${this.baseUrl}/pipeline/transitions${queryParams}`)
    if (!response.ok) {
      throw new Error('Error al obtener historial de transiciones')
    }
    return response.json()
  }

  // Crear tarea para un lead
  async createTask(leadId: string, task: Omit<LeadTask, 'id' | 'createdAt'>): Promise<LeadTask> {
    const response = await fetch(`${this.baseUrl}/pipeline/leads/${leadId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(task)
    })

    if (!response.ok) {
      throw new Error('Error al crear tarea')
    }

    return response.json()
  }

  // Actualizar tarea
  async updateTask(taskId: string, updates: Partial<LeadTask>): Promise<LeadTask> {
    const response = await fetch(`${this.baseUrl}/pipeline/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Error al actualizar tarea')
    }

    return response.json()
  }

  // Obtener tareas de un lead
  async getLeadTasks(leadId: string): Promise<LeadTask[]> {
    const response = await fetch(`${this.baseUrl}/pipeline/leads/${leadId}/tasks`)
    if (!response.ok) {
      throw new Error('Error al obtener tareas del lead')
    }
    return response.json()
  }

  // Agregar actividad a un lead
  async addActivity(leadId: string, activity: Omit<LeadActivity, 'id' | 'date'>): Promise<LeadActivity> {
    const response = await fetch(`${this.baseUrl}/pipeline/leads/${leadId}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activity)
    })

    if (!response.ok) {
      throw new Error('Error al agregar actividad')
    }

    return response.json()
  }

  // Obtener actividades de un lead
  async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    const response = await fetch(`${this.baseUrl}/pipeline/leads/${leadId}/activities`)
    if (!response.ok) {
      throw new Error('Error al obtener actividades del lead')
    }
    return response.json()
  }

  // Actualizar score de un lead
  async updateLeadScore(leadId: string, score: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/pipeline/leads/${leadId}/score`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ score })
    })

    if (!response.ok) {
      throw new Error('Error al actualizar score del lead')
    }
  }

  // Obtener datos de forecasting
  async getForecast(period: 'week' | 'month' | 'quarter' = 'month'): Promise<ForecastData> {
    const response = await fetch(`${this.baseUrl}/pipeline/forecast?period=${period}`)
    if (!response.ok) {
      throw new Error('Error al obtener datos de forecasting')
    }
    return response.json()
  }

  // Crear etapa personalizada
  async createStage(stage: Omit<PipelineStage, 'id'>): Promise<PipelineStage> {
    const response = await fetch(`${this.baseUrl}/pipeline/stages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stage)
    })

    if (!response.ok) {
      throw new Error('Error al crear etapa')
    }

    return response.json()
  }

  // Actualizar etapa
  async updateStage(stageId: string, updates: Partial<PipelineStage>): Promise<PipelineStage> {
    const response = await fetch(`${this.baseUrl}/pipeline/stages/${stageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Error al actualizar etapa')
    }

    return response.json()
  }

  // Reordenar etapas
  async reorderStages(stageIds: string[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/pipeline/stages/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ stageIds })
    })

    if (!response.ok) {
      throw new Error('Error al reordenar etapas')
    }
  }

  // Obtener leads por etapa
  async getLeadsByStage(stageId: string): Promise<PipelineLead[]> {
    const response = await fetch(`${this.baseUrl}/pipeline/stages/${stageId}/leads`)
    if (!response.ok) {
      throw new Error('Error al obtener leads de la etapa')
    }
    return response.json()
  }

  // Buscar leads
  async searchLeads(query: string, filters?: any): Promise<PipelineLead[]> {
    const params = new URLSearchParams({ q: query })
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }

    const response = await fetch(`${this.baseUrl}/pipeline/leads/search?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Error al buscar leads')
    }
    return response.json()
  }

  // Exportar datos del pipeline
  async exportPipelineData(format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/pipeline/export?format=${format}`)
    if (!response.ok) {
      throw new Error('Error al exportar datos del pipeline')
    }
    return response.blob()
  }

  // Obtener estadísticas de conversión
  async getConversionStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/pipeline/stats/conversion`)
    if (!response.ok) {
      throw new Error('Error al obtener estadísticas de conversión')
    }
    return response.json()
  }

  // Obtener análisis de cuellos de botella
  async getBottleneckAnalysis(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/pipeline/stats/bottlenecks`)
    if (!response.ok) {
      throw new Error('Error al obtener análisis de cuellos de botella')
    }
    return response.json()
  }
}

// Instancia singleton del servicio
export const pipelineService = new PipelineService()
