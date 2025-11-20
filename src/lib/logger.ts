type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: any
  userId?: string
  leadId?: string
}

class Logger {
  private log(level: LogLevel, message: string, data?: any, context?: { userId?: string; leadId?: string }) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    }

    if (data) {
      // Sanitizar datos sensibles
      entry.data = this.sanitize(data)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify(entry, null, 2))
    } else {
      console.log(JSON.stringify(entry))
    }
  }

  private sanitize(data: any): any {
    if (data === null || data === undefined) {
      return data
    }

    // Manejar tipos primitivos
    if (typeof data !== 'object') {
      return data
    }

    // Manejar Date objects
    if (data instanceof Date) {
      return data.toISOString()
    }

    // Manejar arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item))
    }

    // Manejar Error objects
    if (data instanceof Error) {
      return {
        message: data.message,
        name: data.name,
        stack: data.stack
      }
    }

    // Manejar objetos planos
    const sanitized: any = {}
    
    for (const [key, value] of Object.entries(data)) {
      // Remover campos sensibles
      const sensitiveFields = ['password', 'hash', 'secret', 'token', 'key']
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]'
        continue
      }

      // Sanitizar recursivamente
      try {
        sanitized[key] = this.sanitize(value)
      } catch (e) {
        // Si no se puede serializar, convertir a string
        sanitized[key] = String(value)
      }
    }

    return sanitized
  }

  info(message: string, data?: any, context?: { userId?: string; leadId?: string }) {
    this.log('info', message, data, context)
  }

  warn(message: string, data?: any, context?: { userId?: string; leadId?: string }) {
    this.log('warn', message, data, context)
  }

  error(message: string, data?: any, context?: { userId?: string; leadId?: string }) {
    this.log('error', message, data, context)
  }

  debug(message: string, data?: any, context?: { userId?: string; leadId?: string }) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data, context)
    }
  }
}

export const logger = new Logger()
