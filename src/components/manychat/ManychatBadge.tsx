'use client'

import { cn } from '@/lib/utils'
import { ManychatBadgeProps } from '@/types/manychat-ui'
import { MessageSquare } from 'lucide-react'

export function ManychatBadge({
  variant = 'info',
  size = 'md',
  children,
  className,
}: ManychatBadgeProps) {
  const variantStyles = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  }

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      <MessageSquare className={cn(
        'flex-shrink-0',
        size === 'sm' && 'w-3 h-3',
        size === 'md' && 'w-3.5 h-3.5',
        size === 'lg' && 'w-4 h-4'
      )} />
      {children}
    </div>
  )
}

