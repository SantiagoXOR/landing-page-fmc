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
    if (typeof data !== 'object' || data === null) {
      return data
    }

    const sanitized = { ...data }
    
    // Remover campos sensibles
    const sensitiveFields = ['password', 'hash', 'secret', 'token', 'key']
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
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
