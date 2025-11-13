"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormosaMetricsCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  icon?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
  badge?: {
    text: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
}

const variantStyles = {
  default: "bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 hover:from-blue-100 hover:to-indigo-200",
  success: "bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 hover:from-green-100 hover:to-emerald-200",
  warning: "bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-200 hover:from-yellow-100 hover:to-orange-200",
  danger: "bg-gradient-to-br from-red-50 to-pink-100 border-red-200 hover:from-red-100 hover:to-pink-200",
  info: "bg-gradient-to-br from-cyan-50 to-blue-100 border-cyan-200 hover:from-cyan-100 hover:to-blue-200"
}

const iconStyles = {
  default: "text-blue-600",
  success: "text-green-600", 
  warning: "text-yellow-600",
  danger: "text-red-600",
  info: "text-cyan-600"
}

export function FormosaMetricsCard({
  title,
  value,
  description,
  trend,
  icon,
  variant = 'default',
  className,
  badge
}: FormosaMetricsCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    
    if (trend.isPositive === true) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (trend.isPositive === false) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    } else {
      return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = () => {
    if (!trend) return "text-gray-600"
    
    if (trend.isPositive === true) {
      return "text-green-600"
    } else if (trend.isPositive === false) {
      return "text-red-600"
    } else {
      return "text-gray-600"
    }
  }

  return (
    <Card
      data-testid="formosa-metrics-card"
      className={cn(
        "formosa-card hover-lift transition-all duration-300 cursor-pointer",
        variantStyles[variant],
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn("p-2 rounded-lg bg-white/50", iconStyles[variant])}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString('es-AR') : value}
            </div>
            {description && (
              <p className="text-xs text-gray-600">
                {description}
              </p>
            )}
          </div>
          
          {badge && (
            <Badge 
              variant={badge.variant || 'default'}
              className="ml-2 formosa-badge-nuevo"
            >
              {badge.text}
            </Badge>
          )}
        </div>
        
        {trend && (
          <div className="flex items-center space-x-1 mt-3 pt-3 border-t border-white/30">
            {getTrendIcon()}
            <span className={cn("text-xs font-medium", getTrendColor())}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-xs text-gray-600">
              {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Componente específico para métricas de Formosa
export function FormosaLeadsMetricsCard({
  totalLeads,
  newLeads,
  preapproved,
  rejected,
  className
}: {
  totalLeads: number
  newLeads: number
  preapproved: number
  rejected: number
  className?: string
}) {
  const conversionRate = totalLeads > 0 ? ((preapproved / totalLeads) * 100).toFixed(1) : '0.0'
  const rejectionRate = totalLeads > 0 ? ((rejected / totalLeads) * 100).toFixed(1) : '0.0'
  
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      <FormosaMetricsCard
        title="Total Leads Formosa"
        value={totalLeads}
        description="Leads registrados"
        variant="info"
        trend={{
          value: 12.5,
          label: "vs mes anterior",
          isPositive: true
        }}
        badge={{
          text: "Activo",
          variant: "outline"
        }}
      />
      
      <FormosaMetricsCard
        title="Nuevos Leads"
        value={newLeads}
        description="Pendientes de revisión"
        variant="default"
        trend={{
          value: 8.2,
          label: "esta semana",
          isPositive: true
        }}
      />
      
      <FormosaMetricsCard
        title="Preaprobados"
        value={preapproved}
        description={`Tasa: ${conversionRate}%`}
        variant="success"
        trend={{
          value: 15.3,
          label: "vs mes anterior",
          isPositive: true
        }}
        badge={{
          text: "Meta",
          variant: "default"
        }}
      />
      
      <FormosaMetricsCard
        title="Rechazados"
        value={rejected}
        description={`Tasa: ${rejectionRate}%`}
        variant="warning"
        trend={{
          value: -2.1,
          label: "vs mes anterior",
          isPositive: false
        }}
      />
    </div>
  )
}
