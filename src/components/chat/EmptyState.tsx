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
      {/* Ilustración abstracta */}
      <div className="relative mb-8">
        {/* Círculos */}
        <div className="w-16 h-16 bg-gray-200 rounded-full absolute -top-2 -left-2 animate-pulse"></div>
        <div className="w-12 h-12 bg-purple-200 rounded-full absolute top-4 -right-1 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="w-8 h-8 bg-gray-300 rounded-full absolute -bottom-1 left-4 animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* Rectángulos (burbujas de mensaje) */}
        <div className="w-20 h-12 bg-gray-100 rounded-lg absolute top-8 left-8 transform rotate-12"></div>
        <div className="w-16 h-10 bg-purple-100 rounded-lg absolute top-12 right-8 transform -rotate-12"></div>
        <div className="w-14 h-8 bg-gray-200 rounded-lg absolute bottom-8 left-12 transform rotate-6"></div>
        
        {/* Líneas */}
        <div className="w-24 h-0.5 bg-gray-200 absolute top-16 left-2 transform rotate-45"></div>
        <div className="w-20 h-0.5 bg-purple-200 absolute bottom-12 right-4 transform -rotate-45"></div>
      </div>

      {/* Texto principal */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Es lindo ver como un bot mensajea por ti
      </h3>
      
      {/* Texto secundario */}
      <p className="text-gray-500 max-w-md">
        Elige una persona del menú izquierdo y mira o contesta una conversación
      </p>

      {/* Icono decorativo */}
      <div className="mt-6 text-purple-400">
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
    </div>
  )
}
