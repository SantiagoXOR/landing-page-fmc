'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
// import { Separator } from '@/components/ui/separator' // Not available
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, Settings, Wifi, WifiOff } from 'lucide-react'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { useNotificationContext } from '@/providers/NotificationProvider'
import { useToast } from '@/components/ui/toast'

interface NotificationPreferences {
  leads: {
    created: boolean
    updated: boolean
    statusChanged: boolean
  }
  pipeline: {
    moved: boolean
    stageChanged: boolean
  }
  system: {
    alerts: boolean
    maintenance: boolean
  }
  realtime: {
    enabled: boolean
    sound: boolean
    desktop: boolean
  }
}

const defaultPreferences: NotificationPreferences = {
  leads: {
    created: true,
    updated: true,
    statusChanged: true
  },
  pipeline: {
    moved: true,
    stageChanged: true
  },
  system: {
    alerts: true,
    maintenance: false
  },
  realtime: {
    enabled: true,
    sound: false,
    desktop: true
  }
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences)
  const [isLoading, setIsLoading] = useState(false)
  const { connectionStatus, connect, disconnect } = useNotificationContext()
  const { addToast } = useToast()

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notification-preferences')
      if (saved) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(saved) })
      }
    } catch (error) {
      console.warn('Error loading notification preferences:', error)
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = async () => {
    setIsLoading(true)
    try {
      localStorage.setItem('notification-preferences', JSON.stringify(preferences))
      
      // If realtime notifications were disabled, disconnect
      if (!preferences.realtime.enabled && connectionStatus === 'connected') {
        disconnect()
      }
      // If realtime notifications were enabled, connect
      else if (preferences.realtime.enabled && connectionStatus === 'disconnected') {
        connect()
      }
      
      addToast({
        type: 'success',
        title: 'Configuración guardada',
        description: 'Tus preferencias de notificaciones han sido actualizadas'
      })
    } catch (error) {
      console.error('Error saving preferences:', error)
      addToast({
        type: 'error',
        title: 'Error',
        description: 'No se pudieron guardar las preferencias'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreference = (category: keyof NotificationPreferences, key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500"><Wifi className="w-3 h-3 mr-1" />Conectado</Badge>
      case 'connecting':
        return <Badge variant="secondary"><Settings className="w-3 h-3 mr-1 animate-spin" />Conectando...</Badge>
      case 'disconnected':
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Desconectado</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Configuración de Notificaciones
              </CardTitle>
              <CardDescription>
                Personaliza cómo y cuándo recibir notificaciones del sistema
              </CardDescription>
            </div>
            {getConnectionStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notificaciones en Tiempo Real */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notificaciones en Tiempo Real</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="realtime-enabled" className="flex flex-col space-y-1">
                  <span>Habilitar notificaciones en tiempo real</span>
                  <span className="text-sm text-muted-foreground">Recibe actualizaciones instantáneas</span>
                </Label>
                <Switch
                  id="realtime-enabled"
                  checked={preferences.realtime.enabled}
                  onCheckedChange={(checked) => updatePreference('realtime', 'enabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="realtime-sound" className="flex flex-col space-y-1">
                  <span>Sonidos de notificación</span>
                  <span className="text-sm text-muted-foreground">Reproducir sonido al recibir notificaciones</span>
                </Label>
                <Switch
                  id="realtime-sound"
                  checked={preferences.realtime.sound}
                  onCheckedChange={(checked) => updatePreference('realtime', 'sound', checked)}
                  disabled={!preferences.realtime.enabled}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="realtime-desktop" className="flex flex-col space-y-1">
                  <span>Notificaciones de escritorio</span>
                  <span className="text-sm text-muted-foreground">Mostrar notificaciones del navegador</span>
                </Label>
                <Switch
                  id="realtime-desktop"
                  checked={preferences.realtime.desktop}
                  onCheckedChange={(checked) => updatePreference('realtime', 'desktop', checked)}
                  disabled={!preferences.realtime.enabled}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 my-4" />

          {/* Notificaciones de Leads */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Leads</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="leads-created">Nuevos leads creados</Label>
                <Switch
                  id="leads-created"
                  checked={preferences.leads.created}
                  onCheckedChange={(checked) => updatePreference('leads', 'created', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="leads-updated">Leads actualizados</Label>
                <Switch
                  id="leads-updated"
                  checked={preferences.leads.updated}
                  onCheckedChange={(checked) => updatePreference('leads', 'updated', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="leads-status">Cambios de estado</Label>
                <Switch
                  id="leads-status"
                  checked={preferences.leads.statusChanged}
                  onCheckedChange={(checked) => updatePreference('leads', 'statusChanged', checked)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 my-4" />

          {/* Notificaciones de Pipeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Pipeline</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="pipeline-moved">Leads movidos entre etapas</Label>
                <Switch
                  id="pipeline-moved"
                  checked={preferences.pipeline.moved}
                  onCheckedChange={(checked) => updatePreference('pipeline', 'moved', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="pipeline-stage">Cambios de configuración de etapas</Label>
                <Switch
                  id="pipeline-stage"
                  checked={preferences.pipeline.stageChanged}
                  onCheckedChange={(checked) => updatePreference('pipeline', 'stageChanged', checked)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 my-4" />

          {/* Notificaciones del Sistema */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sistema</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="system-alerts">Alertas del sistema</Label>
                <Switch
                  id="system-alerts"
                  checked={preferences.system.alerts}
                  onCheckedChange={(checked) => updatePreference('system', 'alerts', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="system-maintenance">Notificaciones de mantenimiento</Label>
                <Switch
                  id="system-maintenance"
                  checked={preferences.system.maintenance}
                  onCheckedChange={(checked) => updatePreference('system', 'maintenance', checked)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 my-4" />

          <div className="flex justify-end">
            <Button onClick={savePreferences} disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}