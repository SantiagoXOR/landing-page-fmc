'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TagPillProps } from '@/types/manychat-ui'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Función para generar color basado en el nombre del tag
function getTagColor(tag: string): string {
  const colors = [
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-red-100 text-red-800 border-red-200',
    'bg-orange-100 text-orange-800 border-orange-200',
  ]

  // Simple hash function para consistencia
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

export function TagPill({
  tag,
  onRemove,
  readonly = false,
  color,
  className,
}: TagPillProps) {
  const colorClass = color || getTagColor(tag)

  const pill = (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
        colorClass,
        className
      )}
    >
      <span>{tag}</span>
      {!readonly && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 hover:bg-black/10 rounded-full p-0.5 transition-colors"
          aria-label={`Remover tag ${tag}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )

  if (readonly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {pill}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Tag de Manychat: {tag}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return pill
}

