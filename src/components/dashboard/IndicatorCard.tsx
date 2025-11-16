'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IndicatorCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: string
    isPositive: boolean
  }
  className?: string
}

export function IndicatorCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className
}: IndicatorCardProps) {
  return (
    <Card className={cn('bg-white border-gray-200 hover:shadow-md transition-shadow', className)}>
      <CardHeader className="pb-2 px-4 sm:px-5 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 sm:h-7 sm:w-7 p-0 text-gray-400 hover:text-gray-600 touch-manipulation"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 sm:px-5 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
        <div className="flex items-center space-x-2 sm:space-x-3">
          {icon && (
            <div className="flex-shrink-0">
              <div className="scale-90 sm:scale-100">
                {icon}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              {value}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={cn(
                'text-xs font-medium mt-1',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
