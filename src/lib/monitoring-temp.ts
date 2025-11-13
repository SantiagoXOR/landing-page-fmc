// Versión temporal de monitoring sin Sentry para resolver problemas de build
import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

interface ApiMetrics {
  endpoint: string
  method: string
  statusCode: number
  duration: number
  userId?: string
  userAgent?: string
  ip?: string
}

// Middleware para capturar métricas de API
export function withMonitoring<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  endpoint: string
) {
  return async (...args: T): Promise<NextResponse> => {
    const startTime = performance.now()
    const request = args[0] as NextRequest
    
    const method = request.method
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    try {
      const response = await handler(...args)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      const metrics: ApiMetrics = {
        endpoint,
        method,
        statusCode: response.status,
        duration,
        userAgent,
        ip,
      }
      
      // Log métricas
      logger.info(`[API] ${method} ${endpoint} - ${response.status} - ${duration.toFixed(2)}ms`)
      
      // Alertar sobre APIs lentas
      if (duration > 5000) {
        logger.warn(`Slow API detected: ${method} ${endpoint}`, { duration, metrics })
      }
      
      // Alertar sobre errores HTTP
      if (response.status >= 400) {
        logger.error(`API error: ${method} ${endpoint}`, { metrics })
      }
      
      return response
      
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Log error
      logger.error(`API exception: ${method} ${endpoint}`, { error, duration })
      
      throw error
    }
  }
}

// Función para capturar errores de base de datos
export function captureDbError(error: any, operation: string, table?: string) {
  logger.error('Database error', {
    error: error.message,
    operation,
    table: table || 'unknown',
  })
}

// Función para capturar errores de autenticación
export function captureAuthError(error: any, userId?: string) {
  logger.error('Auth error', {
    error: error.message,
    userId,
  })
}

// Función para capturar métricas de negocio
export function captureBusinessMetric(metric: string, value: number, tags?: Record<string, string>) {
  logger.info(`Business metric: ${metric} = ${value}`, { metric, value, tags })
}

// Función para configurar usuario (placeholder)
export function setSentryUser(userId: string, email?: string, username?: string) {
  logger.info('User context set', { userId, email, username })
}
