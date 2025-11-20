'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface LeadsByOriginChartProps {
  data: Record<string, number>
  totalLeads: number
  className?: string
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

export function LeadsByOriginChart({
  data,
  totalLeads,
  className,
}: LeadsByOriginChartProps) {
  const chartData = Object.entries(data)
    .map(([origen, cantidad], index) => ({
      name: origen,
      cantidad,
      porcentaje: totalLeads > 0 ? ((cantidad / totalLeads) * 100).toFixed(1) : 0,
      color: COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.cantidad - a.cantidad)

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Leads por Origen</CardTitle>
          <CardDescription>Distribución de leads según su origen</CardDescription>
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
        <CardTitle>Leads por Origen</CardTitle>
        <CardDescription>Distribución de leads según su origen</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-muted-foreground" fontSize={12} />
              <YAxis
                dataKey="name"
                type="category"
                className="text-muted-foreground"
                fontSize={12}
                width={100}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <ChartTooltip>
                        <div className="grid gap-2">
                          <div className="font-medium">{data.name}</div>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: data.color }}
                            />
                            <span className="text-muted-foreground">Cantidad:</span>
                            <span className="font-medium">{data.cantidad}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Porcentaje: <span className="font-medium">{data.porcentaje}%</span>
                          </div>
                        </div>
                      </ChartTooltip>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

