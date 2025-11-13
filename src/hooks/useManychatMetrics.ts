import { useState, useEffect, useCallback } from 'react'
import { ManychatMetricsData, FlowStat } from '@/types/manychat-ui'

interface UseManychatMetricsReturn extends ManychatMetricsData {
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useManychatMetrics(): UseManychatMetricsReturn {
  const [metrics, setMetrics] = useState<ManychatMetricsData>({
    totalSubscribers: 0,
    syncedLeads: 0,
    unsyncedLeads: 0,
    botMessages: 0,
    agentMessages: 0,
    activeFlows: [],
    topTags: [],
    messagesPerDay: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Por ahora, calcular métricas desde los datos locales
      // TODO: Crear endpoint dedicado para métricas agregadas

      // Obtener leads sincronizados
      const leadsResponse = await fetch('/api/leads?limit=1000')
      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json()
        const allLeads = leadsData.leads || []
        
        const synced = allLeads.filter((lead: any) => lead.manychatId).length
        const unsynced = allLeads.length - synced

        // Obtener tags de Manychat
        const tagsResponse = await fetch('/api/manychat/tags')
        let topTags: any[] = []
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json()
          // Contar uso de tags (simplificado)
          const tagCounts = new Map<string, number>()
          allLeads.forEach((lead: any) => {
            if (lead.tags) {
              try {
                const leadTags = typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags
                if (Array.isArray(leadTags)) {
                  leadTags.forEach(tag => {
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
                  })
                }
              } catch (e) {
                // Ignorar errores de parseo
              }
            }
          })

          topTags = Array.from(tagCounts.entries())
            .map(([tagName, count]) => ({
              tagId: 0, // No tenemos el ID aquí
              tagName,
              count,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        }

        // Obtener flujos
        const flowsResponse = await fetch('/api/manychat/flows')
        let activeFlows: FlowStat[] = []
        if (flowsResponse.ok) {
          const flowsData = await flowsResponse.json()
          // Verificar que flowsData.flows sea un array antes de hacer map
          const flows = Array.isArray(flowsData.flows) ? flowsData.flows : 
                       Array.isArray(flowsData) ? flowsData : []
          activeFlows = flows.map((flow: any) => ({
            flowId: flow.id,
            flowName: flow.name,
            activeLeads: 0, // Calcular esto requiere más datos
            completionRate: 0, // Calcular esto requiere más datos
          }))
        }

        setMetrics({
          totalSubscribers: synced, // Aprox: leads sincronizados = subscribers
          syncedLeads: synced,
          unsyncedLeads: unsynced,
          botMessages: 0, // TODO: calcular desde mensajes
          agentMessages: 0, // TODO: calcular desde mensajes
          activeFlows,
          topTags,
          messagesPerDay: [], // TODO: calcular desde mensajes
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener métricas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return {
    ...metrics,
    loading,
    error,
    refresh: fetchMetrics,
  }
}

