'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddIndicatorCardProps {
  className?: string
  onClick?: () => void
}

export function AddIndicatorCard({ className, onClick }: AddIndicatorCardProps) {
  return (
    <Card className={cn(
      'bg-white border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer',
      className
    )} onClick={onClick}>
      <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10 lg:py-12 px-4 sm:px-5 lg:px-6">
        <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
          <Plus className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-gray-400" />
        </div>
        <p className="text-xs sm:text-sm font-medium text-gray-600 text-center">
          Añadir indicador
        </p>
      </CardContent>
    </Card>
  )
}
