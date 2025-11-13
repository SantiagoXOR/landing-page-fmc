"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Phone } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  progress?: {
    value: number
    max: number
  }
  icon?: React.ReactNode
  className?: string
}

export function MetricCard({ 
  title, 
  value, 
  description, 
  trend, 
  progress, 
  icon,
  className 
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="flex items-center pt-1">
            {trend.isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <Badge 
              variant={trend.isPositive ? "default" : "destructive"}
              className="ml-1 text-xs"
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </Badge>
          </div>
        )}
        {progress && (
          <div className="pt-2">
            <Progress 
              value={(progress.value / progress.max) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {progress.value} de {progress.max}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface CRMMetricsProps {
  className?: string
}

export function CRMMetrics({ className }: CRMMetricsProps) {
  // Datos de ejemplo - en producción vendrían del backend
  const metrics = [
    {
      title: "Leads Totales",
      value: "1,234",
      description: "Este mes",
      trend: { value: 12.5, isPositive: true },
      icon: <Users className="h-4 w-4" />
    },
    {
      title: "Ingresos",
      value: formatCurrency(450000),
      description: "Este mes",
      trend: { value: 8.2, isPositive: true },
      icon: <DollarSign className="h-4 w-4" />
    },
    {
      title: "Meta Mensual",
      value: formatCurrency(500000),
      description: "Progreso actual",
      progress: { value: 450000, max: 500000 },
      icon: <Target className="h-4 w-4" />
    },
    {
      title: "Tasa de Conversión",
      value: "24.5%",
      description: "Leads a ventas",
      trend: { value: -2.1, isPositive: false },
      icon: <Phone className="h-4 w-4" />
    }
  ]

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  )
}
