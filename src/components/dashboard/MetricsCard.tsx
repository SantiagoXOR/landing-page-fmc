"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
    label?: string
  }
  gradient?: "primary" | "success" | "warning" | "danger" | "info"
  className?: string
}

const gradientClasses = {
  primary: "bg-gradient-to-br from-blue-500 to-purple-600",
  success: "bg-gradient-to-br from-green-500 to-emerald-600", 
  warning: "bg-gradient-to-br from-yellow-500 to-orange-600",
  danger: "bg-gradient-to-br from-red-500 to-pink-600",
  info: "bg-gradient-to-br from-cyan-500 to-blue-600"
}

const iconBgClasses = {
  primary: "bg-blue-100 text-blue-600",
  success: "bg-green-100 text-green-600",
  warning: "bg-yellow-100 text-yellow-600", 
  danger: "bg-red-100 text-red-600",
  info: "bg-cyan-100 text-cyan-600"
}

export function MetricsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  gradient = "primary",
  className
}: MetricsCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      // Formatear números grandes con separadores
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`
      }
      return val.toLocaleString()
    }
    return val
  }

  return (
    <Card
      data-testid="metrics-card"
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-105 border-0",
        className
      )}
    >
      {/* Gradient background */}
      <div className={cn(
        "absolute inset-0 opacity-5",
        gradientClasses[gradient]
      )} />
      
      {/* Gradient border effect */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r opacity-20 blur-sm",
        gradientClasses[gradient]
      )} />
      
      <div className="relative bg-white/95 backdrop-blur-sm h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300",
            iconBgClasses[gradient]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Main value */}
          <div className="space-y-1">
            <div className={cn(
              "text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
              gradientClasses[gradient]
            )}>
              {formatValue(value)}
            </div>
            
            {subtitle && (
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          {/* Trend indicator */}
          {trend && (
            <div className="flex items-center space-x-2">
              <Badge 
                variant={trend.isPositive ? "default" : "destructive"}
                className={cn(
                  "flex items-center space-x-1 text-xs font-medium",
                  trend.isPositive 
                    ? "bg-green-100 text-green-700 hover:bg-green-100" 
                    : "bg-red-100 text-red-700 hover:bg-red-100"
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(trend.value)}%</span>
              </Badge>
              
              {trend.label && (
                <span className="text-xs text-muted-foreground">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  )
}

// Componente específico para métricas de Formosa
interface FormosaMetricsCardProps {
  type: "totalLeads" | "conversion" | "revenue" | "preapproved"
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
    label?: string
  }
  className?: string
}

export function FormosaMetricsCard({
  type,
  value,
  subtitle,
  trend,
  className
}: FormosaMetricsCardProps) {
  const configs = {
    totalLeads: {
      title: "Total Leads",
      icon: require("lucide-react").Users,
      gradient: "primary" as const
    },
    conversion: {
      title: "Tasa Conversión", 
      icon: require("lucide-react").TrendingUp,
      gradient: "success" as const
    },
    revenue: {
      title: "Ingresos Proyectados",
      icon: require("lucide-react").DollarSign,
      gradient: "warning" as const
    },
    preapproved: {
      title: "Preaprobados",
      icon: require("lucide-react").Target,
      gradient: "info" as const
    }
  }

  const config = configs[type]

  return (
    <MetricsCard
      title={config.title}
      value={value}
      subtitle={subtitle}
      icon={config.icon}
      trend={trend}
      gradient={config.gradient}
      className={className}
    />
  )
}

// Hook para formatear métricas específicas de Formosa
export function useFormosaMetrics(rawMetrics: any) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return {
    totalLeads: {
      value: rawMetrics.totalLeads,
      subtitle: `${rawMetrics.leadsThisMonth} este mes`,
      trend: { value: 12.5, isPositive: true, label: "vs mes anterior" }
    },
    conversion: {
      value: formatPercentage(rawMetrics.conversionRate),
      subtitle: "Promedio mensual",
      trend: { value: 2.1, isPositive: true, label: "vs mes anterior" }
    },
    revenue: {
      value: formatCurrency(rawMetrics.projectedRevenue),
      subtitle: "Este mes",
      trend: { value: 8.3, isPositive: true, label: "vs proyección" }
    },
    preapproved: {
      value: rawMetrics.leadsByStatus?.PREAPROBADO || 0,
      subtitle: "Listos para cierre",
      trend: { value: 15.2, isPositive: true, label: "vs mes anterior" }
    }
  }
}
