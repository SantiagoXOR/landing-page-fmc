/**
 * Base Integration Class
 * Clase base para todas las integraciones externas
 */

export interface IntegrationConfig {
  name: string
  enabled: boolean
  apiKey?: string
  apiSecret?: string
  webhookUrl?: string
  baseUrl?: string
  timeout?: number
  retryAttempts?: number
  rateLimit?: {
    requests: number
    windowMs: number
  }
}

export interface IntegrationResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
  headers?: Record<string, string>
  timestamp: Date
}

export interface WebhookPayload {
  event: string
  data: any
  timestamp: Date
  source: string
  signature?: string
}

export interface IntegrationMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  lastRequestTime?: Date
  rateLimitHits: number
}

export abstract class BaseIntegration {
  protected config: IntegrationConfig
  protected metrics: IntegrationMetrics

  constructor(config: IntegrationConfig) {
    this.config = config
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitHits: 0
    }
  }

  // Métodos abstractos que deben implementar las clases hijas
  abstract initialize(): Promise<boolean>
  abstract healthCheck(): Promise<boolean>
  abstract processWebhook(payload: WebhookPayload): Promise<IntegrationResponse>

  // Métodos comunes
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<IntegrationResponse<T>> {
    const startTime = Date.now()
    this.metrics.totalRequests++

    try {
      // Verificar rate limiting
      if (!this.checkRateLimit()) {
        this.metrics.rateLimitHits++
        throw new Error('Rate limit exceeded')
      }

      // Configurar headers por defecto
      const defaultHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'Phorencial-CRM/1.0',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }

      const requestOptions: RequestInit = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        },
        signal: AbortSignal.timeout(this.config.timeout || 30000)
      }

      const response = await fetch(url, requestOptions)
      const responseTime = Date.now() - startTime

      // Actualizar métricas
      this.updateMetrics(responseTime, response.ok)

      let data: T | undefined
      try {
        data = await response.json()
      } catch {
        // Response might not be JSON
      }

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          timestamp: new Date()
        }
      }

      return {
        success: true,
        data,
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date()
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime
      this.updateMetrics(responseTime, false)

      return {
        success: false,
        error: error.message || 'Unknown error',
        timestamp: new Date()
      }
    }
  }

  protected async retryRequest<T>(
    requestFn: () => Promise<IntegrationResponse<T>>,
    maxAttempts?: number
  ): Promise<IntegrationResponse<T>> {
    const attempts = maxAttempts || this.config.retryAttempts || 3
    let lastError: IntegrationResponse<T>

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await requestFn()
        if (result.success) {
          return result
        }
        lastError = result

        // Esperar antes del siguiente intento (exponential backoff)
        if (attempt < attempts) {
          const delay = Math.pow(2, attempt - 1) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error: any) {
        lastError = {
          success: false,
          error: error.message,
          timestamp: new Date()
        }
      }
    }

    return lastError!
  }

  protected validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    // Implementación básica - las clases hijas pueden sobrescribir
    try {
      const crypto = require('crypto')
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    } catch {
      return false
    }
  }

  private checkRateLimit(): boolean {
    if (!this.config.rateLimit) return true

    const now = Date.now()
    const windowStart = now - this.config.rateLimit.windowMs

    // Implementación simple - en producción usar Redis
    // Por ahora solo verificamos si no excedemos el límite global
    return this.metrics.totalRequests < this.config.rateLimit.requests
  }

  private updateMetrics(responseTime: number, success: boolean): void {
    if (success) {
      this.metrics.successfulRequests++
    } else {
      this.metrics.failedRequests++
    }

    // Calcular promedio de tiempo de respuesta
    const totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests

    this.metrics.lastRequestTime = new Date()
  }

  // Getters públicos
  public getConfig(): IntegrationConfig {
    return { ...this.config }
  }

  public getMetrics(): IntegrationMetrics {
    return { ...this.metrics }
  }

  public isEnabled(): boolean {
    return this.config.enabled
  }

  public getName(): string {
    return this.config.name
  }

  // Métodos de configuración
  public updateConfig(newConfig: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  public enable(): void {
    this.config.enabled = true
  }

  public disable(): void {
    this.config.enabled = false
  }

  // Método para logging (puede ser sobrescrito)
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      integration: this.config.name,
      level,
      message,
      data
    }

    console.log(`[${level.toUpperCase()}] ${this.config.name}: ${message}`, data || '')
  }
}

// Utility functions para integraciones
export class IntegrationUtils {
  static generateWebhookSignature(payload: string, secret: string): string {
    const crypto = require('crypto')
    return crypto.createHmac('sha256', secret).update(payload).digest('hex')
  }

  static validateRequiredFields(data: any, requiredFields: string[]): string[] {
    const missingFields: string[] = []
    
    for (const field of requiredFields) {
      if (!data[field] || data[field] === '') {
        missingFields.push(field)
      }
    }
    
    return missingFields
  }

  static sanitizePhoneNumber(phone: string): string {
    // Limpiar y formatear número de teléfono
    return phone.replace(/\D/g, '')
  }

  static formatArgentinianPhone(phone: string): string {
    const cleaned = IntegrationUtils.sanitizePhoneNumber(phone)
    
    // Si no tiene código de país, agregar +54
    if (!cleaned.startsWith('54')) {
      return `54${cleaned}`
    }
    
    return cleaned
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static generateUniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  static parseWebhookHeaders(headers: Record<string, string>): {
    signature?: string
    timestamp?: string
    event?: string
  } {
    return {
      signature: headers['x-signature'] || headers['x-hub-signature-256'],
      timestamp: headers['x-timestamp'],
      event: headers['x-event-type']
    }
  }
}
