'use client'

import React, { useEffect } from 'react'
import { usePerformanceMonitoring, trackWebVitals } from '@/hooks/usePerformanceMonitoring'
import * as Sentry from '@sentry/nextjs'

interface PerformanceWrapperProps {
  children: React.ReactNode
  componentName: string
}

export function PerformanceWrapper({ children, componentName }: PerformanceWrapperProps) {
  const { trackUserAction, trackApiCall } = usePerformanceMonitoring(componentName)

  useEffect(() => {
    // Initialize Web Vitals tracking
    trackWebVitals()
  }, [])

  // Provide performance tracking context to children
  return (
    <div data-component={componentName}>
      {children}
    </div>
  )
}

// HOC for wrapping components with performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function WrappedComponent(props: P) {
    const { trackUserAction } = usePerformanceMonitoring(componentName)

    // Track component mount
    useEffect(() => {
      trackUserAction('component_mounted', { componentName })
    }, [])

    return (
      <PerformanceWrapper componentName={componentName}>
        <Component {...props} />
      </PerformanceWrapper>
    )
  }
}

// Error Boundary with Sentry integration
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class SentryErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Capture error in Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback
      
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} />
      }

      return (
        <div className="p-4 border border-red-300 rounded-lg bg-red-50">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Algo salió mal
          </h2>
          <p className="text-red-600">
            Ha ocurrido un error inesperado. El equipo técnico ha sido notificado.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Intentar de nuevo
          </button>
        </div>
      )
    }

    return this.props.children
  }
}