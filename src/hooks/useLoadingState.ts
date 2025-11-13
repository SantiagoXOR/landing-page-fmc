'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface LoadingState {
  isLoading: boolean
  error: string | null
  progress: number
  message: string
}

interface UseLoadingStateOptions {
  initialMessage?: string
  minLoadingTime?: number // Tiempo mínimo de loading en ms
  showProgress?: boolean
}

export function useLoadingState(options: UseLoadingStateOptions = {}) {
  const {
    initialMessage = 'Cargando...',
    minLoadingTime = 500,
    showProgress = false
  } = options

  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    progress: 0,
    message: initialMessage
  })

  const startTimeRef = useRef<number | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Función para iniciar el loading
  const startLoading = useCallback((message?: string) => {
    startTimeRef.current = Date.now()
    setState({
      isLoading: true,
      error: null,
      progress: 0,
      message: message || initialMessage
    })

    // Si se debe mostrar progreso, simular progreso gradual
    if (showProgress) {
      let currentProgress = 0
      progressIntervalRef.current = setInterval(() => {
        currentProgress += Math.random() * 15
        if (currentProgress < 90) {
          setState(prev => ({ ...prev, progress: currentProgress }))
        }
      }, 200)
    }
  }, [initialMessage, showProgress])

  // Función para actualizar el mensaje
  const updateMessage = useCallback((message: string) => {
    setState(prev => ({ ...prev, message }))
  }, [])

  // Función para actualizar el progreso manualmente
  const updateProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress: Math.min(100, Math.max(0, progress)) }))
  }, [])

  // Función para finalizar el loading
  const stopLoading = useCallback(async () => {
    // Limpiar interval de progreso
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    // Asegurar tiempo mínimo de loading
    if (startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed))
      }
    }

    // Completar progreso si se está mostrando
    if (showProgress) {
      setState(prev => ({ ...prev, progress: 100 }))
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    setState({
      isLoading: false,
      error: null,
      progress: 0,
      message: initialMessage
    })
  }, [minLoadingTime, showProgress, initialMessage])

  // Función para manejar errores
  const setError = useCallback((error: string) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    setState({
      isLoading: false,
      error,
      progress: 0,
      message: initialMessage
    })
  }, [initialMessage])

  // Función para limpiar errores
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Wrapper para ejecutar operaciones asíncronas con loading
  const withLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    loadingMessage?: string
  ): Promise<T> => {
    try {
      startLoading(loadingMessage)
      const result = await operation()
      await stopLoading()
      return result
    } catch (error: any) {
      setError(error.message || 'Ha ocurrido un error')
      throw error
    }
  }, [startLoading, stopLoading, setError])

  // Limpiar intervals al desmontar
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  return {
    ...state,
    startLoading,
    stopLoading,
    updateMessage,
    updateProgress,
    setError,
    clearError,
    withLoading
  }
}

// Hook específico para operaciones de API
export function useApiLoading() {
  const loadingState = useLoadingState({
    minLoadingTime: 300,
    showProgress: false
  })

  const apiCall = useCallback(async <T>(
    apiFunction: () => Promise<T>,
    options: {
      loadingMessage?: string
      successMessage?: string
      errorMessage?: string
    } = {}
  ): Promise<T> => {
    const {
      loadingMessage = 'Procesando...',
      successMessage,
      errorMessage
    } = options

    try {
      const result = await loadingState.withLoading(apiFunction, loadingMessage)
      
      if (successMessage) {
        // Aquí podrías integrar con un sistema de notificaciones
        console.log(successMessage)
      }
      
      return result
    } catch (error: any) {
      const message = errorMessage || error.message || 'Error en la operación'
      loadingState.setError(message)
      throw error
    }
  }, [loadingState])

  return {
    ...loadingState,
    apiCall
  }
}

// Hook para manejar múltiples estados de carga
export function useMultipleLoadingStates() {
  const [states, setStates] = useState<Record<string, LoadingState>>({})

  const startLoading = useCallback((key: string, message?: string) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        isLoading: true,
        error: null,
        progress: 0,
        message: message || 'Cargando...'
      }
    }))
  }, [])

  const stopLoading = useCallback((key: string) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        isLoading: false,
        error: null,
        progress: 0,
        message: 'Cargando...'
      }
    }))
  }, [])

  const setError = useCallback((key: string, error: string) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        isLoading: false,
        error,
        progress: 0,
        message: 'Cargando...'
      }
    }))
  }, [])

  const updateProgress = useCallback((key: string, progress: number) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        progress: Math.min(100, Math.max(0, progress))
      }
    }))
  }, [])

  const getState = useCallback((key: string): LoadingState => {
    return states[key] || {
      isLoading: false,
      error: null,
      progress: 0,
      message: 'Cargando...'
    }
  }, [states])

  const isAnyLoading = useCallback(() => {
    return Object.values(states).some(state => state.isLoading)
  }, [states])

  return {
    states,
    startLoading,
    stopLoading,
    setError,
    updateProgress,
    getState,
    isAnyLoading
  }
}

// Hook para debounce con loading state
export function useDebouncedLoading(delay: number = 300) {
  const [isLoading, setIsLoading] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedExecute = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setIsLoading(true)

    return new Promise((resolve, reject) => {
      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await operation()
          setIsLoading(false)
          resolve(result)
        } catch (error) {
          setIsLoading(false)
          reject(error)
        }
      }, delay)
    })
  }, [delay])

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    isLoading,
    debouncedExecute,
    cancel
  }
}
