'use client'

import { forwardRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

interface BaseFieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  showValidation?: boolean
  isValidating?: boolean
  autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error'
}

interface OptimizedInputProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'tel' | 'password' | 'number'
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void
  disabled?: boolean
  maxLength?: number
  'aria-invalid'?: boolean
}

interface OptimizedTextareaProps extends BaseFieldProps {
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur?: () => void
  disabled?: boolean
  rows?: number
  maxLength?: number
  'aria-invalid'?: boolean
}

interface OptimizedSelectProps extends BaseFieldProps {
  placeholder?: string
  value: string
  onValueChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  children: React.ReactNode
}

// Componente de estado de validación
function ValidationStatus({ 
  error, 
  isValidating, 
  showValidation,
  autoSaveStatus 
}: {
  error?: string
  isValidating?: boolean
  showValidation?: boolean
  autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error'
}) {
  if (isValidating) {
    return (
      <div className="flex items-center text-blue-500 text-sm mt-1">
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
        Validando...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center text-red-500 text-sm mt-1">
        <AlertCircle className="h-3 w-3 mr-1" />
        {error}
      </div>
    )
  }

  if (showValidation && !error) {
    return (
      <div className="flex items-center text-green-500 text-sm mt-1">
        <CheckCircle className="h-3 w-3 mr-1" />
        Válido
      </div>
    )
  }

  if (autoSaveStatus === 'saving') {
    return (
      <div className="flex items-center text-blue-500 text-sm mt-1">
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
        Guardando...
      </div>
    )
  }

  if (autoSaveStatus === 'saved') {
    return (
      <div className="flex items-center text-green-500 text-sm mt-1">
        <CheckCircle className="h-3 w-3 mr-1" />
        Guardado automáticamente
      </div>
    )
  }

  if (autoSaveStatus === 'error') {
    return (
      <div className="flex items-center text-red-500 text-sm mt-1">
        <AlertCircle className="h-3 w-3 mr-1" />
        Error al guardar
      </div>
    )
  }

  return null
}

// Input optimizado
export const OptimizedInput = forwardRef<HTMLInputElement, OptimizedInputProps>(
  ({ 
    label, 
    error, 
    hint, 
    required, 
    className, 
    showValidation,
    isValidating,
    autoSaveStatus,
    type = 'text',
    maxLength,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type

    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        <div className="relative">
          <Input
            ref={ref}
            type={inputType}
            className={cn(
              'transition-all duration-200',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              !error && showValidation && 'border-green-500 focus:border-green-500 focus:ring-green-500',
              isValidating && 'border-blue-500'
            )}
            maxLength={maxLength}
            {...props}
          />
          
          {isPassword && (
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>

        {hint && !error && (
          <p className="text-sm text-gray-500">{hint}</p>
        )}

        {maxLength && (
          <div className="text-right text-xs text-gray-400">
            {props.value.length}/{maxLength}
          </div>
        )}

        <ValidationStatus 
          error={error}
          isValidating={isValidating}
          showValidation={showValidation}
          autoSaveStatus={autoSaveStatus}
        />
      </div>
    )
  }
)

OptimizedInput.displayName = 'OptimizedInput'

// Textarea optimizado
export const OptimizedTextarea = forwardRef<HTMLTextAreaElement, OptimizedTextareaProps>(
  ({ 
    label, 
    error, 
    hint, 
    required, 
    className, 
    showValidation,
    isValidating,
    autoSaveStatus,
    rows = 3,
    maxLength,
    ...props 
  }, ref) => {
    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        <Textarea
          ref={ref}
          rows={rows}
          className={cn(
            'transition-all duration-200 resize-none',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            !error && showValidation && 'border-green-500 focus:border-green-500 focus:ring-green-500',
            isValidating && 'border-blue-500'
          )}
          maxLength={maxLength}
          {...props}
        />

        {hint && !error && (
          <p className="text-sm text-gray-500">{hint}</p>
        )}

        {maxLength && (
          <div className="text-right text-xs text-gray-400">
            {props.value.length}/{maxLength}
          </div>
        )}

        <ValidationStatus 
          error={error}
          isValidating={isValidating}
          showValidation={showValidation}
          autoSaveStatus={autoSaveStatus}
        />
      </div>
    )
  }
)

OptimizedTextarea.displayName = 'OptimizedTextarea'

// Select optimizado
export function OptimizedSelect({ 
  label, 
  error, 
  hint, 
  required, 
  className, 
  showValidation,
  isValidating,
  autoSaveStatus,
  placeholder,
  children,
  ...props 
}: OptimizedSelectProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <Select {...props}>
        <SelectTrigger 
          className={cn(
            'transition-all duration-200',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            !error && showValidation && 'border-green-500 focus:border-green-500 focus:ring-green-500',
            isValidating && 'border-blue-500'
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>

      {hint && !error && (
        <p className="text-sm text-gray-500">{hint}</p>
      )}

      <ValidationStatus 
        error={error}
        isValidating={isValidating}
        showValidation={showValidation}
        autoSaveStatus={autoSaveStatus}
      />
    </div>
  )
}

// Componente de estado del formulario
export function FormStatus({ 
  isDirty, 
  isValid, 
  lastSaved,
  autoSaveEnabled = false 
}: {
  isDirty: boolean
  isValid: boolean
  lastSaved?: Date
  autoSaveEnabled?: boolean
}) {
  if (!isDirty && lastSaved && autoSaveEnabled) {
    return (
      <div className="flex items-center text-green-600 text-sm">
        <CheckCircle className="h-4 w-4 mr-2" />
        Guardado automáticamente a las {lastSaved.toLocaleTimeString()}
      </div>
    )
  }

  if (isDirty && !isValid) {
    return (
      <div className="flex items-center text-red-600 text-sm">
        <AlertCircle className="h-4 w-4 mr-2" />
        Hay errores en el formulario
      </div>
    )
  }

  if (isDirty && isValid) {
    return (
      <div className="flex items-center text-blue-600 text-sm">
        <AlertCircle className="h-4 w-4 mr-2" />
        Hay cambios sin guardar
      </div>
    )
  }

  return null
}
