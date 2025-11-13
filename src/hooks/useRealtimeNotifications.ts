'use client'

import { useState, useEffect, useCallback } from 'react'
import { getNotificationClient, RealtimeNotification } from '@/lib/realtime-notifications'
import { useToast } from '@/components/ui/toast'

export interface UseRealtimeNotificationsOptions {
  autoShowToast?: boolean
  filterByUserId?: string
  filterByType?: RealtimeNotification['type'][]
  maxNotifications?: number
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const {
    autoShowToast = true,
    filterByUserId,
    filterByType,
    maxNotifications = 50
  } = options

  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { addToast } = useToast()
  const client = getNotificationClient()

  // Filtrar notificaciones según opciones
  const filterNotification = useCallback((notification: RealtimeNotification): boolean => {
    if (filterByUserId && notification.userId !== filterByUserId) {
      return false
    }
    
    if (filterByType && !filterByType.includes(notification.type)) {
      return false
    }
    
    return true
  }, [filterByUserId, filterByType])

  // Manejar nueva notificación
  const handleNewNotification = useCallback((notification: RealtimeNotification) => {
    if (!filterNotification(notification)) {
      return
    }

    setNotifications(prev => {
      const updated = [notification, ...prev]
      return updated.slice(0, maxNotifications)
    })

    // Mostrar toast automáticamente si está habilitado
    if (autoShowToast) {
      const toastType = getToastType(notification.priority)
      addToast({
        type: toastType,
        title: notification.title,
        description: notification.message,
        duration: getToastDuration(notification.priority)
      })
    }
  }, [filterNotification, maxNotifications, autoShowToast, addToast])

  // Actualizar estado de conexión
  const handleConnectionChange = useCallback(() => {
    setIsConnected(client.isConnected())
  }, [client])

  // Actualizar contador de no leídas
  const updateUnreadCount = useCallback(() => {
    const filtered = client.getNotifications().filter(filterNotification)
    const unread = filtered.filter(n => !n.read).length
    setUnreadCount(unread)
  }, [client, filterNotification])

  useEffect(() => {
    // Cargar notificaciones existentes
    const existingNotifications = client.getNotifications()
      .filter(filterNotification)
      .slice(0, maxNotifications)
    
    setNotifications(existingNotifications)
    setIsConnected(client.isConnected())
    updateUnreadCount()

    // Suscribirse a eventos
    const unsubscribeNotification = client.subscribe(handleNewNotification)
    
    client.on('connected', handleConnectionChange)
    client.on('disconnected', handleConnectionChange)
    client.on('notification_read', updateUnreadCount)
    client.on('all_notifications_read', updateUnreadCount)

    // Cleanup
    return () => {
      unsubscribeNotification()
      client.off('connected', handleConnectionChange)
      client.off('disconnected', handleConnectionChange)
      client.off('notification_read', updateUnreadCount)
      client.off('all_notifications_read', updateUnreadCount)
    }
  }, [client, handleNewNotification, handleConnectionChange, updateUnreadCount, filterNotification, maxNotifications])

  // Métodos para interactuar con las notificaciones
  const markAsRead = useCallback((notificationId: string) => {
    client.markAsRead(notificationId)
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }, [client])

  const markAllAsRead = useCallback(() => {
    client.markAllAsRead()
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [client])

  const clearNotifications = useCallback(() => {
    client.clearNotifications()
    setNotifications([])
    setUnreadCount(0)
  }, [client])

  const sendNotification = useCallback((notification: Omit<RealtimeNotification, 'id' | 'timestamp'>) => {
    client.sendNotification(notification)
  }, [client])

  return {
    notifications,
    isConnected,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    sendNotification
  }
}

// Helpers para convertir prioridad a tipo de toast
function getToastType(priority: RealtimeNotification['priority']): 'success' | 'error' | 'warning' | 'info' {
  switch (priority) {
    case 'critical':
      return 'error'
    case 'high':
      return 'warning'
    case 'medium':
      return 'info'
    case 'low':
      return 'success'
    default:
      return 'info'
  }
}

function getToastDuration(priority: RealtimeNotification['priority']): number {
  switch (priority) {
    case 'critical':
      return 10000 // 10 segundos
    case 'high':
      return 7000  // 7 segundos
    case 'medium':
      return 5000  // 5 segundos
    case 'low':
      return 3000  // 3 segundos
    default:
      return 5000
  }
}

// Hook simplificado para casos básicos
export function useNotificationCount() {
  const { unreadCount, isConnected } = useRealtimeNotifications({
    autoShowToast: false,
    maxNotifications: 0 // Solo queremos el contador
  })
  
  return { unreadCount, isConnected }
}

// Hook para tipos específicos de notificaciones
export function useLeadNotifications() {
  return useRealtimeNotifications({
    filterByType: ['lead_created', 'lead_updated'],
    autoShowToast: true
  })
}

export function usePipelineNotifications() {
  return useRealtimeNotifications({
    filterByType: ['pipeline_changed'],
    autoShowToast: true
  })
}

export function useSystemNotifications() {
  return useRealtimeNotifications({
    filterByType: ['system_alert'],
    autoShowToast: true
  })
}