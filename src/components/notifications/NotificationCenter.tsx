'use client'

import { useState } from 'react'
import { Bell, BellRing, Check, CheckCheck, Trash2, X, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// import { ScrollArea } from '@/components/ui/scroll-area' // Not available
// import { Separator } from '@/components/ui/separator' // Not available
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { RealtimeNotification } from '@/lib/realtime-notifications'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const {
    notifications,
    isConnected,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications
  } = useRealtimeNotifications({
    autoShowToast: false, // No mostrar toast aquí para evitar duplicados
    maxNotifications: 100
  })

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleNotificationClick = (notification: RealtimeNotification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  const getNotificationIcon = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'lead_created':
        return '👤'
      case 'lead_updated':
        return '✏️'
      case 'pipeline_changed':
        return '🔄'
      case 'system_alert':
        return '⚠️'
      case 'user_activity':
        return '👥'
      default:
        return '📢'
    }
  }

  const getPriorityColor = (priority: RealtimeNotification['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'high':
        return 'bg-orange-100 border-orange-300 text-orange-800'
      case 'medium':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'low':
        return 'bg-green-100 border-green-300 text-green-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const getTypeLabel = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'lead_created':
        return 'Nuevo Lead'
      case 'lead_updated':
        return 'Lead Actualizado'
      case 'pipeline_changed':
        return 'Pipeline Modificado'
      case 'system_alert':
        return 'Alerta del Sistema'
      case 'user_activity':
        return 'Actividad de Usuario'
      default:
        return 'Notificación'
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Botón de notificaciones */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className="relative p-2"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        
        {/* Badge de contador */}
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        
        {/* Indicador de conexión */}
        <div className="absolute -bottom-1 -right-1">
          {isConnected ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" />
          )}
        </div>
      </Button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                <Badge variant="secondary">{notifications.length}</Badge>
              </div>
              
              <div className="flex items-center space-x-1">
                {/* Estado de conexión */}
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  {isConnected ? (
                    <>
                      <Wifi className="h-3 w-3 text-green-500" />
                      <span>Conectado</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 text-red-500" />
                      <span>Desconectado</span>
                    </>
                  )}
                </div>
                
                <div className="w-px h-4 bg-gray-300" />
                
                {/* Botones de acción */}
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-6 w-6 p-0"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="h-3 w-3" />
                  </Button>
                )}
                
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearNotifications}
                    className="h-6 w-6 p-0"
                    title="Limpiar todas"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Lista de notificaciones */}
            <div className="h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No hay notificaciones</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Icono */}
                        <div className="flex-shrink-0 text-lg">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getPriorityColor(notification.priority)}`}
                            >
                              {getTypeLabel(notification.type)}
                            </Badge>
                            
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(notification.timestamp), {
                                addSuffix: true,
                                locale: es
                              })}
                            </span>
                          </div>
                        </div>
                        
                        {/* Botón marcar como leída */}
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Marcar como leída"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationCenter