import { useState, useEffect, useCallback } from 'react'
import { ManychatTag } from '@/types/manychat'

interface UseManychatTagsReturn {
  availableTags: ManychatTag[]
  leadTags: string[]
  addTag: (tagName: string) => Promise<void>
  removeTag: (tagName: string) => Promise<void>
  loading: boolean
  error: string | null
  refreshTags: () => Promise<void>
}

export function useManychatTags(leadId?: string): UseManychatTagsReturn {
  const [availableTags, setAvailableTags] = useState<ManychatTag[]>([])
  const [leadTags, setLeadTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Obtener tags disponibles de Manychat
  const fetchAvailableTags = useCallback(async () => {
    try {
      const response = await fetch('/api/manychat/tags')
      if (response.ok) {
        const data = await response.json()
        setAvailableTags(data.tags || [])
      }
    } catch (err) {
      console.error('Error fetching available tags:', err)
    }
  }, [])

  // Obtener tags del lead
  const fetchLeadTags = useCallback(async () => {
    if (!leadId) return

    try {
      const response = await fetch(`/api/leads/${leadId}`)
      if (response.ok) {
        const lead = await response.json()
        if (lead.tags) {
          try {
            const parsedTags = typeof lead.tags === 'string' 
              ? JSON.parse(lead.tags) 
              : lead.tags
            setLeadTags(Array.isArray(parsedTags) ? parsedTags : [])
          } catch (e) {
            setLeadTags([])
          }
        } else {
          setLeadTags([])
        }
      }
    } catch (err) {
      console.error('Error fetching lead tags:', err)
    }
  }, [leadId])

  // Cargar tags al montar
  useEffect(() => {
    fetchAvailableTags()
  }, [fetchAvailableTags])

  useEffect(() => {
    if (leadId) {
      fetchLeadTags()
    }
  }, [leadId, fetchLeadTags])

  // Agregar tag a un lead
  const addTag = useCallback(async (tagName: string) => {
    if (!leadId) {
      setError('No se especificó leadId')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Obtener el lead para encontrar el manychatId
      const leadResponse = await fetch(`/api/leads/${leadId}`)
      if (!leadResponse.ok) {
        throw new Error('No se pudo obtener el lead')
      }

      const lead = await leadResponse.json()
      
      if (!lead.manychatId) {
        throw new Error('Lead no está sincronizado con Manychat')
      }

      // Agregar tag vía API de Manychat
      const response = await fetch('/api/manychat/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriberId: parseInt(lead.manychatId),
          tagName,
          action: 'add',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al agregar tag')
      }

      // Actualizar estado local
      setLeadTags(prev => [...prev, tagName])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar tag')
      throw err
    } finally {
      setLoading(false)
    }
  }, [leadId])

  // Remover tag de un lead
  const removeTag = useCallback(async (tagName: string) => {
    if (!leadId) {
      setError('No se especificó leadId')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Obtener el lead para encontrar el manychatId
      const leadResponse = await fetch(`/api/leads/${leadId}`)
      if (!leadResponse.ok) {
        throw new Error('No se pudo obtener el lead')
      }

      const lead = await leadResponse.json()
      
      if (!lead.manychatId) {
        throw new Error('Lead no está sincronizado con Manychat')
      }

      // Remover tag vía API de Manychat
      const response = await fetch('/api/manychat/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriberId: parseInt(lead.manychatId),
          tagName,
          action: 'remove',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al remover tag')
      }

      // Actualizar estado local
      setLeadTags(prev => prev.filter(t => t !== tagName))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al remover tag')
      throw err
    } finally {
      setLoading(false)
    }
  }, [leadId])

  // Refrescar tags
  const refreshTags = useCallback(async () => {
    await Promise.all([
      fetchAvailableTags(),
      fetchLeadTags(),
    ])
  }, [fetchAvailableTags, fetchLeadTags])

  return {
    availableTags,
    leadTags,
    addTag,
    removeTag,
    loading,
    error,
    refreshTags,
  }
}

