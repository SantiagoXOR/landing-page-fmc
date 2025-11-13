"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts"
import { cn } from "@/lib/utils"

interface DashboardChartsProps {
  metrics: {
    trendData?: Array<{
      month: string
      leads: number
      conversions: number
    }>
    leadsByStatus?: Record<string, number>
    leadsByZone?: Array<{
      zona: string
      count: number
      percentage: number
    }>
    revenueData?: Array<{
      month: string
      ingresos: number
      proyectado: number
    }>
  }
  className?: string
}

// Colores específicos para estados de Formosa
const STATUS_COLORS = {
  NUEVO: "#3b82f6",           // Azul
  EN_REVISION: "#6b7280",     // Gris
  PREAPROBADO: "#10b981",     // Verde
  RECHAZADO: "#ef4444",       // Rojo
  DOC_PENDIENTE: "#f59e0b",   // Amarillo
  DERIVADO: "#8b5cf6"         // Púrpura
}

// Gradientes para gráficos
const CHART_GRADIENTS = {
  primary: "url(#primaryGradient)",
  success: "url(#successGradient)",
  warning: "url(#warningGradient)"
}

export function DashboardCharts({ metrics, className }: DashboardChartsProps) {
  // Preparar datos para gráfico de estados
  const statusData = metrics.leadsByStatus ? 
    Object.entries(metrics.leadsByStatus).map(([status, count]) => ({
      name: status,
      value: count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "#6b7280"
    })) : []

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)} data-testid="dashboard-charts">
      {/* Tendencia de Leads */}
      {metrics.trendData && (
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-50" />
          <div className="relative bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tendencia de Leads</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Últimos 6 meses
                </Badge>
              </CardTitle>
              <CardDescription>
                Evolución de leads y conversiones por mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.trendData}>
                  <defs>
                    <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="conversionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis 
                    dataKey="month" 
                    className="text-gray-600"
                    fontSize={12}
                  />
                  <YAxis 
                    className="text-gray-600"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#leadsGradient)"
                    name="Leads"
                  />
                  <Area
                    type="monotone"
                    dataKey="conversions"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#conversionsGradient)"
                    name="Conversiones"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </div>
        </Card>
      )}

      {/* Distribución por Estado */}
      {statusData.length > 0 && (
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-50" />
          <div className="relative bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Distribución por Estado</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {statusData.reduce((sum, item) => sum + item.value, 0)} total
                </Badge>
              </CardTitle>
              <CardDescription>
                Leads organizados por estado actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gráfico de torta */}
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [value.toLocaleString(), "Leads"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Leyenda con valores */}
                <div className="space-y-2">
                  {statusData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <Badge variant="secondary">
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      )}

      {/* Leads por Zona (si hay datos) */}
      {metrics.leadsByZone && (
        <Card className="relative overflow-hidden lg:col-span-2">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-orange-50 opacity-50" />
          <div className="relative bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Distribución por Zona - Formosa</span>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  {metrics.leadsByZone.length} zonas activas
                </Badge>
              </CardTitle>
              <CardDescription>
                Leads distribuidos por zonas geográficas de Formosa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.leadsByZone.slice(0, 10)}>
                  <defs>
                    <linearGradient id="zoneGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis 
                    dataKey="zona" 
                    className="text-gray-600"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    className="text-gray-600"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill="url(#zoneGradient)"
                    radius={[4, 4, 0, 0]}
                    name="Leads"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </div>
        </Card>
      )}

      {/* Ingresos Proyectados */}
      {metrics.revenueData && (
        <Card className="relative overflow-hidden lg:col-span-2">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-50" />
          <div className="relative bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Ingresos vs Proyección</span>
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  ARS
                </Badge>
              </CardTitle>
              <CardDescription>
                Comparación de ingresos reales vs proyectados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis 
                    dataKey="month" 
                    className="text-gray-600"
                    fontSize={12}
                  />
                  <YAxis 
                    className="text-gray-600"
                    fontSize={12}
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [
                      new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS',
                        minimumFractionDigits: 0
                      }).format(value),
                      ""
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="ingresos"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                    name="Ingresos Reales"
                  />
                  <Line
                    type="monotone"
                    dataKey="proyectado"
                    stroke="#ec4899"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#ec4899", strokeWidth: 2, r: 4 }}
                    name="Proyectado"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </div>
        </Card>
      )}
    </div>
  )
}
