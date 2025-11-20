'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface LeadsByDayData {
  fecha: string
  cantidad: number
}

interface LeadsByDayChartProps {
  data: LeadsByDayData[]
  className?: string
}

export function LeadsByDayChart({ data, className }: LeadsByDayChartProps) {
  const chartData = data.map((item) => ({
    fecha: format(new Date(item.fecha), 'dd/MM', { locale: es }),
    fechaCompleta: format(new Date(item.fecha), 'dd/MM/yyyy', { locale: es }),
    cantidad: item.cantidad,
  }))

  const maxValue = Math.max(...chartData.map((d) => d.cantidad), 1)

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Leads por Día</CardTitle>
          <CardDescription>Evolución diaria de leads generados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay datos disponibles
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Leads por Día</CardTitle>
        <CardDescription>Evolución diaria de leads generados</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="fecha"
                className="text-muted-foreground"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                className="text-muted-foreground"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, maxValue + 1]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <ChartTooltip>
                        <div className="grid gap-2">
                          <div className="font-medium">{data.fechaCompleta}</div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <span className="text-muted-foreground">Leads:</span>
                            <span className="font-medium">{data.cantidad}</span>
                          </div>
                        </div>
                      </ChartTooltip>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="cantidad"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorLeads)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

