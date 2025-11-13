import { broadcastNotification, sendNotificationToUser } from '@/server/websocket-server'
import { RealtimeNotification } from '@/lib/realtime-notifications'
import { logger } from '@/lib/logger'

// Tipos de datos para diferentes eventos
interface LeadData {
  id: string
  nombre: string
  email?: string
  telefono?: string
  estado?: string
}

interface PipelineData {
  id: string
  nombre: string
  etapa?: string
  leadId?: string
  leadNombre?: string
}

interface UserData {
  id: string
  nombre: string
  email?: string
  rol?: string
}

// Funciones para notificaciones de leads
export function notifyLeadCreated(lead: LeadData, createdByUserId?: string) {
  const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
    type: 'lead_created',
    title: 'Nuevo Lead Creado',
    message: `Se ha creado un nuevo lead: ${lead.nombre}`,
    priority: 'medium',
    read: false,
    data: {
      leadId: lead.id,
      leadNombre: lead.nombre,
      leadEmail: lead.email,
      leadTelefono: lead.telefono
    }
  }

  broadcastNotification(notification, createdByUserId)
  
  logger.info('📢 Notificación enviada: Lead creado', {
    leadId: lead.id,
    leadNombre: lead.nombre,
    createdBy: createdByUserId
  })
}

export function notifyLeadUpdated(lead: LeadData, updatedByUserId?: string, changes?: string[]) {
  const changesText = changes && changes.length > 0 
    ? ` (${changes.join(', ')})`
    : ''
    
  const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
    type: 'lead_updated',
    title: 'Lead Actualizado',
    message: `${lead.nombre} ha sido actualizado${changesText}`,
    priority: 'low',
    read: false,
    data: {
      leadId: lead.id,
      leadNombre: lead.nombre,
      changes: changes || [],
      estado: lead.estado
    }
  }

  broadcastNotification(notification, updatedByUserId)
  
  logger.info('📢 Notificación enviada: Lead actualizado', {
    leadId: lead.id,
    leadNombre: lead.nombre,
    changes,
    updatedBy: updatedByUserId
  })
}

export function notifyLeadStatusChanged(lead: LeadData, oldStatus: string, newStatus: string, changedByUserId?: string) {
  const priority = newStatus === 'convertido' ? 'high' : 'medium'
  
  const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
    type: 'lead_updated',
    title: 'Estado de Lead Cambiado',
    message: `${lead.nombre} cambió de "${oldStatus}" a "${newStatus}"`,
    priority,
    read: false,
    data: {
      leadId: lead.id,
      leadNombre: lead.nombre,
      oldStatus,
      newStatus
    }
  }

  broadcastNotification(notification, changedByUserId)
  
  logger.info('📢 Notificación enviada: Estado de lead cambiado', {
    leadId: lead.id,
    oldStatus,
    newStatus,
    changedBy: changedByUserId
  })
}

// Funciones para notificaciones de pipeline
export function notifyPipelineChanged(pipeline: PipelineData, action: 'moved' | 'created' | 'updated', userId?: string) {
  let title: string
  let message: string
  
  switch (action) {
    case 'moved':
      title = 'Lead Movido en Pipeline'
      message = pipeline.leadNombre 
        ? `${pipeline.leadNombre} fue movido a "${pipeline.etapa}"`
        : `Un lead fue movido en el pipeline "${pipeline.nombre}"`
      break
    case 'created':
      title = 'Nuevo Pipeline Creado'
      message = `Se creó el pipeline "${pipeline.nombre}"`
      break
    case 'updated':
      title = 'Pipeline Actualizado'
      message = `El pipeline "${pipeline.nombre}" fue actualizado`
      break
  }
  
  const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
    type: 'pipeline_changed',
    title,
    message,
    priority: action === 'moved' ? 'medium' : 'low',
    read: false,
    data: {
      pipelineId: pipeline.id,
      pipelineName: pipeline.nombre,
      etapa: pipeline.etapa,
      leadId: pipeline.leadId,
      leadNombre: pipeline.leadNombre,
      action
    }
  }

  broadcastNotification(notification, userId)
  
  logger.info('📢 Notificación enviada: Pipeline cambiado', {
    pipelineId: pipeline.id,
    action,
    userId
  })
}

// Funciones para notificaciones de sistema
export function notifySystemAlert(title: string, message: string, priority: RealtimeNotification['priority'] = 'medium', targetUserId?: string) {
  const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
    type: 'system_alert',
    title,
    message,
    priority,
    read: false,
    userId: targetUserId
  }

  if (targetUserId) {
    sendNotificationToUser(targetUserId, notification)
  } else {
    broadcastNotification(notification)
  }
  
  logger.info('📢 Notificación enviada: Alerta del sistema', {
    title,
    priority,
    targetUserId
  })
}

export function notifyUserActivity(user: UserData, activity: string, priority: RealtimeNotification['priority'] = 'low') {
  const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
    type: 'user_activity',
    title: 'Actividad de Usuario',
    message: `${user.nombre} ${activity}`,
    priority,
    read: false,
    data: {
      userId: user.id,
      userName: user.nombre,
      activity
    }
  }

  broadcastNotification(notification, user.id) // Excluir al usuario que realizó la acción
  
  logger.info('📢 Notificación enviada: Actividad de usuario', {
    userId: user.id,
    activity
  })
}

// Funciones para notificaciones específicas de eventos de negocio
export function notifyLeadConverted(lead: LeadData, convertedByUserId?: string) {
  const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
    type: 'lead_updated',
    title: '🎉 Lead Convertido',
    message: `¡Excelente! ${lead.nombre} se ha convertido en cliente`,
    priority: 'high',
    read: false,
    data: {
      leadId: lead.id,
      leadNombre: lead.nombre,
      converted: true
    }
  }

  broadcastNotification(notification, convertedByUserId)
  
  logger.info('📢 Notificación enviada: Lead convertido', {
    leadId: lead.id,
    convertedBy: convertedByUserId
  })
}

export function notifyHighPriorityLead(lead: LeadData, reason: string) {
  const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
    type: 'lead_created',
    title: '🔥 Lead de Alta Prioridad',
    message: `Nuevo lead importante: ${lead.nombre} - ${reason}`,
    priority: 'high',
    read: false,
    data: {
      leadId: lead.id,
      leadNombre: lead.nombre,
      reason,
      highPriority: true
    }
  }

  broadcastNotification(notification)
  
  logger.info('📢 Notificación enviada: Lead de alta prioridad', {
    leadId: lead.id,
    reason
  })
}

export function notifySystemMaintenance(message: string, scheduledTime?: Date) {
  const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
    type: 'system_alert',
    title: '🔧 Mantenimiento del Sistema',
    message: scheduledTime 
      ? `${message} Programado para: ${scheduledTime.toLocaleString()}`
      : message,
    priority: 'critical',
    read: false,
    data: {
      maintenance: true,
      scheduledTime: scheduledTime?.toISOString()
    }
  }

  broadcastNotification(notification)
  
  logger.info('📢 Notificación enviada: Mantenimiento del sistema', {
    message,
    scheduledTime
  })
}

// Función de utilidad para notificaciones personalizadas
export function sendCustomNotification(
  type: RealtimeNotification['type'],
  title: string,
  message: string,
  options: {
    priority?: RealtimeNotification['priority']
    data?: any
    targetUserId?: string
    excludeUserId?: string
  } = {}
) {
  const {
    priority = 'medium',
    data,
    targetUserId,
    excludeUserId
  } = options
  
  const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
    type,
    title,
    message,
    priority,
    read: false,
    data,
    userId: targetUserId
  }

  if (targetUserId) {
    sendNotificationToUser(targetUserId, notification)
  } else {
    broadcastNotification(notification, excludeUserId)
  }
  
  logger.info('📢 Notificación personalizada enviada', {
    type,
    title,
    priority,
    targetUserId,
    excludeUserId
  })
}

// Exportar tipos para uso en otros archivos
export type { LeadData, PipelineData, UserData }