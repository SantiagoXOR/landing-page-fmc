import React, { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

interface PerformanceMetrics {
  componentName: string
  renderTime?: number
  loadTime?: number
  userAction?: string
}

export function usePerformanceMonitoring(componentName: string) {
  useEffect(() => {
    const startTime = performance.now()

    // Measure component mount time
    const endTime = performance.now()
    const renderTime = endTime - startTime

    // Send performance metrics to Sentry
    Sentry.addBreadcrumb({
      message: `Component ${componentName} rendered`,
      category: 'performance',
      level: 'info',
      data: {
        componentName,
        renderTime: `${renderTime.toFixed(2)}ms`,
      },
    })

    // Track performance metrics
    if (renderTime > 100) { // Alert if render time > 100ms
      Sentry.captureMessage(`Slow render detected in ${componentName}`, {
        level: 'warning',
        tags: {
          component: componentName,
          performance: 'slow_render',
        },
        extra: {
          renderTime,
        },
      })
    }
  }, [])

  const trackUserAction = (action: string, data?: Record<string, any>) => {
    Sentry.addBreadcrumb({
      message: `User action: ${action}`,
      category: 'user',
      level: 'info',
      data: {
        componentName,
        action,
        ...data,
      },
    })
  }

  const trackApiCall = (endpoint: string, method: string, duration: number, status: number) => {
    Sentry.addBreadcrumb({
      message: `API call: ${method} ${endpoint}`,
      category: 'http',
      level: status >= 400 ? 'error' : 'info',
      data: {
        endpoint,
        method,
        duration: `${duration.toFixed(2)}ms`,
        status,
      },
    })

    // Track slow API calls
    if (duration > 2000) { // Alert if API call > 2s
      Sentry.captureMessage(`Slow API call detected: ${method} ${endpoint}`, {
        level: 'warning',
        tags: {
          api: endpoint,
          performance: 'slow_api',
        },
        extra: {
          duration,
          status,
        },
      })
    }
  }

  return {
    trackUserAction,
    trackApiCall,
  }
}

// Web Vitals monitoring
export function trackWebVitals() {
  if (typeof window !== 'undefined') {
    // Track Core Web Vitals - disabled due to compatibility issues
    // TODO: Update web-vitals to compatible version
  }
}