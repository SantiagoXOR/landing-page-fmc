'use client'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  className?: string
}

export function EmptyState({ className }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center h-full p-8 text-center',
      className
    )}>
      {/* Texto principal */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Es lindo ver como un bot mensajea por ti
      </h3>
      
      {/* Texto secundario */}
      <p className="text-gray-500 max-w-md">
        Elige una persona del menú izquierdo y mira o contesta una conversación
      </p>
    </div>
  )
}
