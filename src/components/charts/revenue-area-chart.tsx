"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface RevenueData {
  month: string
  ingresos: number
  proyectado: number
}

interface RevenueAreaChartProps {
  data: RevenueData[]
  title?: string
  description?: string
  className?: string
}

export function RevenueAreaChart({ 
  data, 
  title = "Ingresos Acumulados", 
  description = "Evolución de ingresos reales vs proyectados",
  className 
}: RevenueAreaChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorProyectado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-muted-foreground"
                fontSize={12}
              />
              <YAxis 
                className="text-muted-foreground"
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <ChartTooltip>
                        <div className="grid gap-2">
                          <div className="font-medium">{label}</div>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div 
                                className="h-2 w-2 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground">
                                {entry.dataKey === 'ingresos' ? 'Ingresos' : 'Proyectado'}:
                              </span>
                              <span className="font-medium">
                                {formatCurrency(entry.value as number)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ChartTooltip>
                    )
                  }
                  return null
                }}
              />
              <Area 
                type="monotone" 
                dataKey="proyectado" 
                stackId="1"
                stroke="hsl(var(--muted-foreground))" 
                fillOpacity={1} 
                fill="url(#colorProyectado)" 
              />
              <Area 
                type="monotone" 
                dataKey="ingresos" 
                stackId="1"
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorIngresos)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
