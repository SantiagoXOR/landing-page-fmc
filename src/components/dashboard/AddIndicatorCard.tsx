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
      <CardContent className="flex flex-col items-center justify-center py-8">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Plus className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">
          Añadir indicador
        </p>
      </CardContent>
    </Card>
  )
}
