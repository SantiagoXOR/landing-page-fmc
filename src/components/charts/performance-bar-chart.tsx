"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PerformanceData {
  name: string
  ventas: number
  meta: number
}

interface PerformanceBarChartProps {
  data: PerformanceData[]
  title?: string
  description?: string
  className?: string
}

export function PerformanceBarChart({ 
  data, 
  title = "Rendimiento por Vendedor", 
  description = "Comparación de ventas vs metas por vendedor",
  className 
}: PerformanceBarChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-muted-foreground"
                fontSize={12}
              />
              <YAxis 
                className="text-muted-foreground"
                fontSize={12}
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
                                {entry.dataKey === 'ventas' ? 'Ventas' : 'Meta'}:
                              </span>
                              <span className="font-medium">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </ChartTooltip>
                    )
                  }
                  return null
                }}
              />
              <Bar 
                dataKey="ventas" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="meta" 
                fill="hsl(var(--muted))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
