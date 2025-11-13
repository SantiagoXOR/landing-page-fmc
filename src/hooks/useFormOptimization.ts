'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { z } from 'zod'

interface FormOptimizationOptions<T> {
  schema?: z.ZodSchema<T>
  debounceMs?: number
  autoSaveMs?: number
  validateOnChange?: boolean
  validateOnBlur?: boolean
  onAutoSave?: (data: T) => Promise<void>
  onValidationError?: (errors: Record<string, string>) => void
}

interface FormState<T> {
  data: T
  errors: Record<string, string>
  touched: Record<string, boolean>
  isValid: boolean
  isDirty: boolean
  isSubmitting: boolean
  lastSaved?: Date
}

export function useFormOptimization<T extends Record<string, any>>(
  initialData: T,
  options: FormOptimizationOptions<T> = {}
) {
  const {
    schema,
    debounceMs = 300,
    autoSaveMs = 5000,
    validateOnChange = true,
    validateOnBlur = true,
    onAutoSave,
    onValidationError
  } = options

  const [state, setState] = useState<FormState<T>>({
    data: initialData,
    errors: {},
    touched: {},
    isValid: true,
    isDirty: false,
    isSubmitting: false
  })

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialDataRef = useRef(initialData)

  // Función para validar un campo específico
  const validateField = useCallback((fieldName: string, value: any): string | null => {
    if (!schema) return null

    try {
      // Crear un objeto temporal con el campo actualizado
      const tempData = { ...state.data, [fieldName]: value }
      schema.parse(tempData)
      return null
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(err => 
          err.path.length > 0 && err.path[0] === fieldName
        )
        return fieldError?.message || null
      }
      return 'Error de validación'
    }
  }, [schema, state.data])

  // Función para validar todo el formulario
  const validateForm = useCallback((data: T): Record<string, string> => {
    if (!schema) return {}

    try {
      schema.parse(data)
      return {}
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            const fieldName = err.path[0] as string
            errors[fieldName] = err.message
          }
        })
        return errors
      }
      return {}
    }
  }, [schema])

  // Función para actualizar un campo
  const updateField = useCallback((fieldName: string, value: any) => {
    setState(prev => {
      const newData = { ...prev.data, [fieldName]: value }
      const isDirty = JSON.stringify(newData) !== JSON.stringify(initialDataRef.current)
      
      let newErrors = { ...prev.errors }
      
      // Validación en tiempo real si está habilitada
      if (validateOnChange && prev.touched[fieldName]) {
        const fieldError = validateField(fieldName, value)
        if (fieldError) {
          newErrors[fieldName] = fieldError
        } else {
          delete newErrors[fieldName]
        }
      }

      const isValid = Object.keys(newErrors).length === 0
      
      return {
        ...prev,
        data: newData,
        errors: newErrors,
        isValid,
        isDirty
      }
    })

    // Debounce para validación completa
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setState(prev => {
        const fullErrors = validateForm(prev.data)
        const isValid = Object.keys(fullErrors).length === 0
        
        if (onValidationError && Object.keys(fullErrors).length > 0) {
          onValidationError(fullErrors)
        }
        
        return {
          ...prev,
          errors: { ...prev.errors, ...fullErrors },
          isValid
        }
      })
    }, debounceMs)

    // Auto-save si está configurado
    if (onAutoSave && autoSaveMs > 0) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(async () => {
        setState(prev => {
          if (prev.isDirty && prev.isValid) {
            onAutoSave(prev.data).then(() => {
              setState(current => ({
                ...current,
                lastSaved: new Date(),
                isDirty: false
              }))
            }).catch(error => {
              console.error('Auto-save failed:', error)
            })
          }
          return prev
        })
      }, autoSaveMs)
    }
  }, [validateOnChange, validateField, validateForm, onValidationError, onAutoSave, debounceMs, autoSaveMs])

  // Función para marcar un campo como tocado
  const touchField = useCallback((fieldName: string) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [fieldName]: true }
    }))

    // Validación en blur si está habilitada
    if (validateOnBlur) {
      const fieldError = validateField(fieldName, state.data[fieldName])
      setState(prev => {
        const newErrors = { ...prev.errors }
        if (fieldError) {
          newErrors[fieldName] = fieldError
        } else {
          delete newErrors[fieldName]
        }
        return {
          ...prev,
          errors: newErrors
        }
      })
    }
  }, [validateOnBlur, validateField, state.data])

  // Función para resetear el formulario
  const resetForm = useCallback((newData?: T) => {
    const dataToUse = newData || initialDataRef.current
    initialDataRef.current = dataToUse
    
    setState({
      data: dataToUse,
      errors: {},
      touched: {},
      isValid: true,
      isDirty: false,
      isSubmitting: false
    })

    // Limpiar timeouts
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
  }, [])

  // Función para enviar el formulario
  const submitForm = useCallback(async (onSubmit: (data: T) => Promise<void>) => {
    setState(prev => ({ ...prev, isSubmitting: true }))

    try {
      // Validación final
      const finalErrors = validateForm(state.data)
      
      if (Object.keys(finalErrors).length > 0) {
        setState(prev => ({
          ...prev,
          errors: finalErrors,
          isValid: false,
          isSubmitting: false
        }))
        return false
      }

      await onSubmit(state.data)
      
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isDirty: false,
        lastSaved: new Date()
      }))
      
      return true
    } catch (error) {
      setState(prev => ({ ...prev, isSubmitting: false }))
      throw error
    }
  }, [state.data, validateForm])

  // Función para obtener props de un campo
  const getFieldProps = useCallback((fieldName: string) => ({
    value: state.data[fieldName] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      updateField(fieldName, e.target.value)
    },
    onBlur: () => touchField(fieldName),
    error: state.touched[fieldName] ? state.errors[fieldName] : undefined,
    'aria-invalid': state.touched[fieldName] && !!state.errors[fieldName]
  }), [state.data, state.errors, state.touched, updateField, touchField])

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  return {
    // Estado del formulario
    data: state.data,
    errors: state.errors,
    touched: state.touched,
    isValid: state.isValid,
    isDirty: state.isDirty,
    isSubmitting: state.isSubmitting,
    lastSaved: state.lastSaved,
    
    // Funciones de control
    updateField,
    touchField,
    resetForm,
    submitForm,
    getFieldProps,
    
    // Utilidades
    validateForm: () => validateForm(state.data),
    setData: (newData: T) => setState(prev => ({ ...prev, data: newData })),
    setErrors: (errors: Record<string, string>) => setState(prev => ({ ...prev, errors }))
  }
}

// Hook específico para búsquedas con debounce
export function useSearchOptimization(
  onSearch: (query: string) => void,
  debounceMs: number = 500
) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery)
    setIsSearching(true)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      onSearch(newQuery)
      setIsSearching(false)
    }, debounceMs)
  }, [onSearch, debounceMs])

  const clearSearch = useCallback(() => {
    setQuery('')
    setIsSearching(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    onSearch('')
  }, [onSearch])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    query,
    isSearching,
    updateQuery,
    clearSearch
  }
}
