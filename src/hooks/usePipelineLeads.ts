import { useState, useEffect, useCallback } from 'react'
import { PipelineLead } from '@/types/pipeline'
import { PipelineFilters } from '@/components/pipeline/PipelineFiltersDrawer'

interface UsePipelineLeadsOptions {
  filters?: PipelineFilters
  debounceMs?: number
}

export function usePipelineLeads(options: UsePipelineLeadsOptions = {}) {
  const { filters, debounceMs = 300 } = options
  const [leads, setLeads] = useState<PipelineLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debouncedFilters, setDebouncedFilters] = useState<PipelineFilters>(filters || {})

  // Debounce de filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters || {})
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [filters, debounceMs])

  // Cargar leads
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Construir query params
      const params = new URLSearchParams()
      
      if (debouncedFilters.search) {
        params.append('search', debouncedFilters.search)
      }
      if (debouncedFilters.tags && debouncedFilters.tags.length > 0) {
        params.append('tags', debouncedFilters.tags.join(','))
      }
      if (debouncedFilters.stages && debouncedFilters.stages.length > 0) {
        params.append('stageId', debouncedFilters.stages[0]) // Por ahora solo el primero
      }
      if (debouncedFilters.priority && debouncedFilters.priority.length > 0) {
        params.append('priority', debouncedFilters.priority[0]) // Por ahora solo el primero
      }
      if (debouncedFilters.timeInStage?.min) {
        params.append('timeInStageMin', debouncedFilters.timeInStage.min.toString())
      }
      if (debouncedFilters.timeInStage?.max) {
        params.append('timeInStageMax', debouncedFilters.timeInStage.max.toString())
      }
      if (debouncedFilters.score?.min) {
        params.append('scoreMin', debouncedFilters.score.min.toString())
      }
      if (debouncedFilters.score?.max) {
        params.append('scoreMax', debouncedFilters.score.max.toString())
      }

      const response = await fetch(`/api/pipeline/leads?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Error al obtener leads: ${response.statusText}`)
      }

      const data = await response.json()
      setLeads(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar leads'
      setError(errorMessage)
      console.error('Error fetching pipeline leads:', err)
    } finally {
      setLoading(false)
    }
  }, [debouncedFilters])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  return {
    leads,
    loading,
    error,
    refetch: fetchLeads
  }
}

