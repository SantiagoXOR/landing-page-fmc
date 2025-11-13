/**
 * Integration Manager
 * Gestor centralizado para todas las integraciones externas
 */

import { BaseIntegration, IntegrationConfig, IntegrationResponse, WebhookPayload } from './base-integration'
import { WhatsAppIntegration, WhatsAppConfig } from './whatsapp-integration'

export type IntegrationType = 'whatsapp' | 'facebook' | 'instagram' | 'email' | 'sms'

export interface IntegrationManagerConfig {
  whatsapp?: WhatsAppConfig
  // Futuras integraciones
  facebook?: IntegrationConfig
  instagram?: IntegrationConfig
  email?: IntegrationConfig
  sms?: IntegrationConfig
}

export class IntegrationManager {
  private integrations: Map<IntegrationType, BaseIntegration> = new Map()
  private config: IntegrationManagerConfig
  private initialized: boolean = false

  constructor(config: IntegrationManagerConfig) {
    this.config = config
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing Integration Manager...')

      // Inicializar WhatsApp si está configurado
      if (this.config.whatsapp) {
        const whatsappIntegration = new WhatsAppIntegration(this.config.whatsapp)
        const initialized = await whatsappIntegration.initialize()
        
        if (initialized) {
          this.integrations.set('whatsapp', whatsappIntegration)
          console.log('WhatsApp integration initialized successfully')
        } else {
          console.warn('Failed to initialize WhatsApp integration')
        }
      }

      // Aquí se pueden agregar más integraciones en el futuro
      // if (this.config.facebook) { ... }
      // if (this.config.instagram) { ... }

      this.initialized = true
      console.log(`Integration Manager initialized with ${this.integrations.size} active integrations`)
      
      return true
    } catch (error: any) {
      console.error('Failed to initialize Integration Manager:', error.message)
      return false
    }
  }

  // Obtener una integración específica
  getIntegration<T extends BaseIntegration>(type: IntegrationType): T | null {
    return (this.integrations.get(type) as T) || null
  }

  // Verificar si una integración está disponible y habilitada
  isIntegrationEnabled(type: IntegrationType): boolean {
    const integration = this.integrations.get(type)
    return integration ? integration.isEnabled() : false
  }

  // Obtener todas las integraciones activas
  getActiveIntegrations(): Array<{ type: IntegrationType; integration: BaseIntegration }> {
    const active: Array<{ type: IntegrationType; integration: BaseIntegration }> = []
    
    this.integrations.forEach((integration, type) => {
      if (integration.isEnabled()) {
        active.push({ type, integration })
      }
    })
    
    return active
  }

  // Procesar webhook de cualquier integración
  async processWebhook(
    type: IntegrationType, 
    payload: WebhookPayload
  ): Promise<IntegrationResponse> {
    try {
      const integration = this.integrations.get(type)
      
      if (!integration) {
        return {
          success: false,
          error: `Integration ${type} not found`,
          timestamp: new Date()
        }
      }

      if (!integration.isEnabled()) {
        return {
          success: false,
          error: `Integration ${type} is disabled`,
          timestamp: new Date()
        }
      }

      return await integration.processWebhook(payload)
    } catch (error: any) {
      console.error(`Error processing webhook for ${type}:`, error.message)
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      }
    }
  }

  // Verificar salud de todas las integraciones
  async healthCheck(): Promise<Record<IntegrationType, boolean>> {
    const results: Record<string, boolean> = {}
    
    this.integrations.forEach(async (integration, type) => {
      try {
        results[type] = await integration.healthCheck()
      } catch (error) {
        results[type] = false
      }
    })
    
    return results as Record<IntegrationType, boolean>
  }

  // Obtener métricas de todas las integraciones
  getMetrics(): Record<IntegrationType, any> {
    const metrics: Record<string, any> = {}
    
    this.integrations.forEach((integration, type) => {
      metrics[type] = integration.getMetrics()
    })
    
    return metrics as Record<IntegrationType, any>
  }

  // Habilitar/deshabilitar integraciones
  enableIntegration(type: IntegrationType): boolean {
    const integration = this.integrations.get(type)
    if (integration) {
      integration.enable()
      console.log(`Integration ${type} enabled`)
      return true
    }
    return false
  }

  disableIntegration(type: IntegrationType): boolean {
    const integration = this.integrations.get(type)
    if (integration) {
      integration.disable()
      console.log(`Integration ${type} disabled`)
      return true
    }
    return false
  }

  // Métodos específicos para WhatsApp (shortcuts)
  async sendWhatsAppMessage(to: string, message: string): Promise<IntegrationResponse> {
    const whatsapp = this.getIntegration<WhatsAppIntegration>('whatsapp')
    
    if (!whatsapp) {
      return {
        success: false,
        error: 'WhatsApp integration not available',
        timestamp: new Date()
      }
    }

    return await whatsapp.sendTextMessage(to, message)
  }

  async sendWhatsAppTemplate(
    to: string, 
    templateName: string, 
    languageCode?: string,
    components?: any[]
  ): Promise<IntegrationResponse> {
    const whatsapp = this.getIntegration<WhatsAppIntegration>('whatsapp')
    
    if (!whatsapp) {
      return {
        success: false,
        error: 'WhatsApp integration not available',
        timestamp: new Date()
      }
    }

    return await whatsapp.sendTemplateMessage(to, templateName, languageCode, components)
  }

  // Verificar webhook de WhatsApp
  verifyWhatsAppWebhook(mode: string, token: string, challenge: string): string | null {
    const whatsapp = this.getIntegration<WhatsAppIntegration>('whatsapp')
    
    if (!whatsapp) {
      return null
    }

    return whatsapp.verifyWebhook(mode, token, challenge)
  }

  // Obtener configuración de una integración
  getIntegrationConfig(type: IntegrationType): IntegrationConfig | null {
    const integration = this.integrations.get(type)
    return integration ? integration.getConfig() : null
  }

  // Actualizar configuración de una integración
  updateIntegrationConfig(type: IntegrationType, newConfig: Partial<IntegrationConfig>): boolean {
    const integration = this.integrations.get(type)
    if (integration) {
      integration.updateConfig(newConfig)
      console.log(`Integration ${type} configuration updated`)
      return true
    }
    return false
  }

  // Obtener estado general del manager
  getStatus(): {
    initialized: boolean
    totalIntegrations: number
    activeIntegrations: number
    integrations: Array<{
      type: IntegrationType
      enabled: boolean
      name: string
    }>
  } {
    const integrations: Array<{
      type: IntegrationType
      enabled: boolean
      name: string
    }> = []
    
    this.integrations.forEach((integration, type) => {
      integrations.push({
        type,
        enabled: integration.isEnabled(),
        name: integration.getName()
      })
    })

    return {
      initialized: this.initialized,
      totalIntegrations: this.integrations.size,
      activeIntegrations: integrations.filter(i => i.enabled).length,
      integrations
    }
  }

  // Cleanup al cerrar la aplicación
  async shutdown(): Promise<void> {
    console.log('Shutting down Integration Manager...')
    
    // Aquí se pueden agregar tareas de limpieza específicas
    // para cada integración si es necesario
    
    this.integrations.clear()
    this.initialized = false
    
    console.log('Integration Manager shut down successfully')
  }
}

// Instancia singleton del manager
let integrationManager: IntegrationManager | null = null

export function getIntegrationManager(): IntegrationManager | null {
  return integrationManager
}

export function initializeIntegrationManager(config: IntegrationManagerConfig): Promise<boolean> {
  if (!integrationManager) {
    integrationManager = new IntegrationManager(config)
  }
  
  return integrationManager.initialize()
}

export function shutdownIntegrationManager(): Promise<void> {
  if (integrationManager) {
    return integrationManager.shutdown()
  }
  return Promise.resolve()
}

// Configuración por defecto para desarrollo
export const defaultIntegrationConfig: IntegrationManagerConfig = {
  whatsapp: {
    name: 'WhatsApp Business',
    enabled: false, // Deshabilitado por defecto en desarrollo
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    apiKey: process.env.WHATSAPP_API_KEY || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'phorencial-webhook-token',
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || '',
    baseUrl: 'https://graph.facebook.com',
    apiVersion: 'v18.0',
    timeout: 30000,
    retryAttempts: 3,
    rateLimit: {
      requests: 1000,
      windowMs: 60000 // 1 minuto
    }
  }
}
