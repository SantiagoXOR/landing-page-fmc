'use client'

import { cn } from '@/lib/utils'
import { Loader2, Search, Database, Users, BarChart3, FileText } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  )
}

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />
  )
}

// Skeleton para tarjetas de leads
export function LeadCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-3 w-36" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  )
}

// Skeleton para tabla de leads
export function LeadTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-6 gap-4 p-4 border-b">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-4 p-4 border-b">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

// Skeleton para métricas del dashboard
export function MetricCardSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

// Skeleton para gráficos
export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={cn('border rounded-lg p-6', height)}>
      <div className="space-y-3 mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex items-end justify-between h-32 space-x-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={`w-8 ${i % 2 === 0 ? 'h-20' : 'h-16'}`} 
          />
        ))}
      </div>
    </div>
  )
}

// Loading state con mensaje contextual
interface LoadingStateProps {
  type?: 'search' | 'data' | 'users' | 'reports' | 'general'
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingState({ 
  type = 'general', 
  message, 
  size = 'md',
  className 
}: LoadingStateProps) {
  const icons = {
    search: Search,
    data: Database,
    users: Users,
    reports: BarChart3,
    general: FileText
  }

  const messages = {
    search: 'Buscando leads...',
    data: 'Cargando datos...',
    users: 'Cargando usuarios...',
    reports: 'Generando reporte...',
    general: 'Cargando...'
  }

  const Icon = icons[type]
  const displayMessage = message || messages[type]

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 space-y-4', className)}>
      <div className="relative">
        <Icon className={cn(
          'text-gray-400',
          size === 'sm' && 'h-8 w-8',
          size === 'md' && 'h-12 w-12',
          size === 'lg' && 'h-16 w-16'
        )} />
        <LoadingSpinner 
          size={size} 
          className="absolute -top-1 -right-1 text-blue-500" 
        />
      </div>
      <p className="text-gray-600 text-center">{displayMessage}</p>
    </div>
  )
}

// Loading overlay para formularios
export function FormLoadingOverlay({ message = 'Guardando...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <LoadingSpinner size="md" className="text-blue-500" />
        <span className="text-gray-700 font-medium">{message}</span>
      </div>
    </div>
  )
}

// Loading state para páginas completas
export function PageLoadingState({ 
  title = 'Cargando página...',
  description = 'Por favor espere mientras cargamos el contenido'
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="h-20 w-20 mx-auto border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  )
}

// Loading state para listas vacías con búsqueda
export function EmptySearchState({ 
  query,
  onClear,
  type = 'leads'
}: {
  query: string
  onClear: () => void
  type?: string
}) {
  return (
    <div className="text-center py-12">
      <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No se encontraron {type}
      </h3>
      <p className="text-gray-600 mb-4">
        No hay resultados para &quot;{query}&quot;
      </p>
      <button
        onClick={onClear}
        className="text-blue-600 hover:text-blue-800 font-medium"
      >
        Limpiar búsqueda
      </button>
    </div>
  )
}

// Progress bar para operaciones largas
interface ProgressBarProps {
  progress: number
  message?: string
  className?: string
}

export function ProgressBar({ progress, message, className }: ProgressBarProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {message && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{message}</span>
          <span className="text-gray-900 font-medium">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

// Loading button state
interface LoadingButtonProps {
  loading: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function LoadingButton({
  loading,
  children,
  loadingText,
  className,
  disabled,
  onClick,
  type = 'button'
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md',
        'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {loading ? (loadingText || 'Cargando...') : children}
    </button>
  )
}
