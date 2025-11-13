/**
 * Hook personalizado para facilitar el uso de analytics en componentes
 */
'use client'

import { useCallback } from 'react'
import { trackEvent, trackConversion } from '@/components/analytics/GoogleAnalytics'
import { MetaEvents, trackMetaEvent } from '@/components/analytics/MetaPixel'

export function useAnalytics() {
  /**
   * Rastrear creación de lead
   */
  const trackLeadCreated = useCallback((data: {
    source?: string
    value?: number
    leadId?: string
  }) => {
    // Google Analytics
    trackEvent('lead_created', {
      lead_source: data.source || 'unknown',
      lead_id: data.leadId,
      value: data.value,
    })

    // Meta Pixel
    MetaEvents.Lead({
      content_name: 'Nuevo Lead CRM',
      value: data.value || 0,
      currency: 'ARS',
    })
  }, [])

  /**
   * Rastrear edición de lead
   */
  const trackLeadUpdated = useCallback((data: {
    leadId: string
    changes?: string[]
  }) => {
    trackEvent('lead_updated', {
      lead_id: data.leadId,
      fields_changed: data.changes?.join(','),
    })
  }, [])

  /**
   * Rastrear eliminación de lead
   */
  const trackLeadDeleted = useCallback((leadId: string) => {
    trackEvent('lead_deleted', {
      lead_id: leadId,
    })
  }, [])

  /**
   * Rastrear cambio de etapa en pipeline
   */
  const trackPipelineStageChange = useCallback((data: {
    leadId: string
    fromStage: string
    toStage: string
    dealValue?: number
  }) => {
    // Google Analytics
    trackEvent('pipeline_stage_change', {
      lead_id: data.leadId,
      from_stage: data.fromStage,
      to_stage: data.toStage,
      deal_value: data.dealValue,
    })

    // Si es una conversión (venta cerrada), rastrear como conversión
    if (data.toStage.toLowerCase().includes('cerrado') || 
        data.toStage.toLowerCase().includes('ganado')) {
      trackConversion('purchase', {
        value: data.dealValue || 0,
        currency: 'ARS',
        transaction_id: data.leadId,
      })

      MetaEvents.Purchase({
        value: data.dealValue || 0,
        currency: 'ARS',
        content_type: 'deal',
      })
    }
  }, [])

  /**
   * Rastrear búsqueda de leads
   */
  const trackSearch = useCallback((searchTerm: string, resultsCount?: number) => {
    trackEvent('search', {
      search_term: searchTerm,
      results_count: resultsCount,
    })

    MetaEvents.Search({
      search_string: searchTerm,
    })
  }, [])

  /**
   * Rastrear visualización de lead
   */
  const trackLeadViewed = useCallback((data: {
    leadId: string
    leadValue?: number
  }) => {
    trackEvent('view_lead', {
      lead_id: data.leadId,
      value: data.leadValue,
    })

    MetaEvents.ViewContent({
      content_name: `Lead ${data.leadId}`,
      value: data.leadValue || 0,
      currency: 'ARS',
    })
  }, [])

  /**
   * Rastrear sincronización con ManyChat
   */
  const trackManyChatSync = useCallback((data: {
    action: 'sync' | 'message_sent' | 'tag_added'
    leadId?: string
    success: boolean
  }) => {
    trackEvent('manychat_action', {
      action: data.action,
      lead_id: data.leadId,
      success: data.success,
    })
  }, [])

  /**
   * Rastrear envío de formulario
   */
  const trackFormSubmit = useCallback((formName: string, success: boolean) => {
    trackEvent('form_submit', {
      form_name: formName,
      success: success,
    })

    if (success) {
      MetaEvents.Contact({
        content_name: formName,
      })
    }
  }, [])

  /**
   * Rastrear error
   */
  const trackError = useCallback((data: {
    error_type: string
    error_message?: string
    page?: string
  }) => {
    trackEvent('error', {
      error_type: data.error_type,
      error_message: data.error_message,
      page: data.page || window.location.pathname,
    })
  }, [])

  /**
   * Rastrear registro de usuario
   */
  const trackUserRegistration = useCallback((data: {
    method?: string
    userId?: string
  }) => {
    trackEvent('user_registration', {
      registration_method: data.method || 'email',
      user_id: data.userId,
    })

    MetaEvents.CompleteRegistration({
      status: 'success',
    })
  }, [])

  /**
   * Rastrear evento personalizado
   */
  const trackCustomEvent = useCallback((
    eventName: string,
    params?: Record<string, any>
  ) => {
    trackEvent(eventName, params)
  }, [])

  /**
   * Rastrear evento personalizado en Meta
   */
  const trackCustomMetaEvent = useCallback((
    eventName: string,
    params?: Record<string, any>
  ) => {
    trackMetaEvent(eventName, params)
  }, [])

  return {
    // Eventos de Leads
    trackLeadCreated,
    trackLeadUpdated,
    trackLeadDeleted,
    trackLeadViewed,
    
    // Pipeline
    trackPipelineStageChange,
    
    // Búsqueda
    trackSearch,
    
    // ManyChat
    trackManyChatSync,
    
    // Formularios
    trackFormSubmit,
    
    // Usuarios
    trackUserRegistration,
    
    // Errores
    trackError,
    
    // Personalizados
    trackCustomEvent,
    trackCustomMetaEvent,
    
    // Acceso directo a las funciones originales
    MetaEvents,
    trackEvent,
    trackConversion,
  }
}

