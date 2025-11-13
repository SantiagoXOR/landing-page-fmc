import { useState, useEffect, useCallback } from 'react'
import { ManychatSyncLog, SyncStatus } from '@/types/manychat-ui'

interface UseManychatSyncReturn {
  isSynced: boolean
  isManychatConfigured: boolean
  syncNow: () => Promise<void>
  syncStatus: SyncStatus
  lastSyncAt: Date | null
  logs: ManychatSyncLog[]
  loading: boolean
  error: string | null
}

export function useManychatSync(leadId: string): UseManychatSyncReturn {
  const [isSynced, setIsSynced] = useState(false)
  const [isManychatConfigured, setIsManychatConfigured] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [logs, setLogs] = useState<ManychatSyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Verificar si Manychat está configurado
  useEffect(() => {
    const checkManychatConfig = async () => {
      try {
        const response = await fetch('/api/manychat/health')
        if (response.ok) {
          const data = await response.json()
          setIsManychatConfigured(data.status === 'healthy')
        }
      } catch (err) {
        setIsManychatConfigured(false)
      }
    }

    checkManychatConfig()
  }, [])

  // Obtener estado de sincronización del lead
  const fetchSyncStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener datos del lead
      const leadResponse = await fetch(`/api/leads/${leadId}`)
      if (leadResponse.ok) {
        const lead = await leadResponse.json()
        setIsSynced(!!lead.manychatId)
        
        // Obtener logs de sincronización (mock por ahora, implementar endpoint más adelante)
        // const logsResponse = await fetch(`/api/leads/${leadId}/sync-logs`)
        // if (logsResponse.ok) {
        //   const syncLogs = await logsResponse.json()
        //   setLogs(syncLogs)
        //   if (syncLogs.length > 0) {
        //     const latestLog = syncLogs[0]
        //     setLastSyncAt(new Date(latestLog.completedAt || latestLog.createdAt))
        //   }
        // }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener estado de sincronización')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchSyncStatus()
  }, [fetchSyncStatus])

  // Sincronizar lead ahora
  const syncNow = useCallback(async () => {
    try {
      setSyncStatus('syncing')
      setError(null)

      const response = await fetch('/api/manychat/sync-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId,
          fullSync: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al sincronizar lead')
      }

      setSyncStatus('success')
      setIsSynced(true)
      setLastSyncAt(new Date())
      
      // Refrescar logs
      await fetchSyncStatus()

      // Resetear estado de éxito después de 3 segundos
      setTimeout(() => {
        setSyncStatus('idle')
      }, 3000)
    } catch (err) {
      setSyncStatus('error')
      setError(err instanceof Error ? err.message : 'Error al sincronizar')
      
      // Resetear estado de error después de 5 segundos
      setTimeout(() => {
        setSyncStatus('idle')
      }, 5000)
    }
  }, [leadId, fetchSyncStatus])

  return {
    isSynced,
    isManychatConfigured,
    syncNow,
    syncStatus,
    lastSyncAt,
    logs,
    loading,
    error,
  }
}

