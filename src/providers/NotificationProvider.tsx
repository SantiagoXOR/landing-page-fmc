'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getNotificationClient, RealtimeNotification } from '@/lib/realtime-notifications'
import { useToast } from '@/components/ui/toast'
import { useSession } from 'next-auth/react'

interface NotificationContextType {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  unreadCount: number
  notifications: any[]
  connect: () => void
  disconnect: () => void
  markAsRead: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const { addToast } = useToast()
  const { data: session } = useSession()

  const client = getNotificationClient()

  useEffect(() => {
    // Load preferences from localStorage
    const loadPreferences = () => {
      try {
        const saved = localStorage.getItem('notification-preferences')
        if (saved) {
          const preferences = JSON.parse(saved)
          return preferences.realtime?.enabled !== false // Default to true
        }
      } catch (error) {
        console.warn('Error loading notification preferences:', error)
      }
      return true // Default to enabled
    }

    // Auto-connect if user is authenticated and notifications are enabled
    if (session?.user && loadPreferences()) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [session])

  const connect = () => {
    if (!session?.user?.id) {
      console.warn('Cannot connect to notifications: user not authenticated')
      return
    }

    setConnectionStatus('connecting')
    
    try {
      // Subscribe to notifications
      const unsubscribe = client.subscribe((notification: RealtimeNotification) => {
        // Add to notifications list
        setNotifications(prev => [notification, ...prev.slice(0, 49)]) // Keep last 50
        setUnreadCount(prev => prev + 1)

        // Check user preferences for showing toasts
        try {
          const preferences = JSON.parse(localStorage.getItem('notification-preferences') || '{}')
            const shouldShowToast = preferences.realtime?.enabled !== false
            
            if (shouldShowToast) {
              // Show toast notification
              addToast({
                type: getToastType(notification.type),
                title: notification.title,
                description: notification.message
              })

              // Play sound if enabled
              if (preferences.realtime?.sound) {
                playNotificationSound()
              }

              // Show desktop notification if enabled and permission granted
              if (preferences.realtime?.desktop && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                  new Notification(notification.title, {
                    body: notification.message,
                    icon: '/favicon.ico'
                  })
                } else if (Notification.permission !== 'denied') {
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      new Notification(notification.title, {
                        body: notification.message,
                        icon: '/favicon.ico'
                      })
                    }
                  })
                }
              }
            }
          } catch (error) {
            console.warn('Error processing notification preferences:', error)
          }
      })

      setIsConnected(true)
      setConnectionStatus('connected')
    } catch (error) {
      setConnectionStatus('error')
      console.error('Failed to connect to notification server:', error)
    }
  }

  const disconnect = () => {
    try {
      client.disconnect()
      setIsConnected(false)
      setConnectionStatus('disconnected')
    } catch (error) {
      console.error('Error disconnecting from notification server:', error)
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const clearAll = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  const getToastType = (notificationType: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (notificationType) {
      case 'lead_created':
      case 'lead_updated':
      case 'pipeline_moved':
        return 'success'
      case 'system_alert':
        return 'warning'
      case 'error':
        return 'error'
      default:
        return 'info'
    }
  }

  const playNotificationSound = () => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
      console.warn('Could not play notification sound:', error)
    }
  }

  const value: NotificationContextType = {
    isConnected,
    connectionStatus,
    unreadCount,
    notifications,
    connect,
    disconnect,
    markAsRead,
    clearAll
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}