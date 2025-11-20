'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PreapprovalRateChartProps {
  tasaPreaprobacion: number
  preaprobados: number
  rechazados: number
  evaluados: number
  className?: string
}

const COLORS = {
  preaprobados: 'hsl(142, 76%, 36%)', // Verde
  rechazados: 'hsl(0, 84%, 60%)', // Rojo
  noEvaluados: 'hsl(var(--muted))', // Gris
}

export function PreapprovalRateChart({
  tasaPreaprobacion,
  preaprobados,
  rechazados,
  evaluados,
  className,
}: PreapprovalRateChartProps) {
  const data = [
    { name: 'Preaprobados', value: preaprobados, color: COLORS.preaprobados },
    { name: 'Rechazados', value: rechazados, color: COLORS.rechazados },
  ]

  // Si no hay datos evaluados, mostrar un estado vacío
  if (evaluados === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Tasa de Preaprobación</CardTitle>
          <CardDescription>Porcentaje de leads preaprobados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] gap-4">
            <div className="text-4xl font-bold text-muted-foreground">0%</div>
            <div className="text-sm text-muted-foreground text-center">
              No hay leads evaluados
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Tasa de Preaprobación</CardTitle>
        <CardDescription>Porcentaje de leads preaprobados</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <ChartContainer className="h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <ChartTooltip>
                            <div className="grid gap-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: data.color }}
                                />
                                <span className="font-medium">{data.name}</span>
                              </div>
                              <div className="text-muted-foreground">
                                Cantidad: <span className="font-medium">{data.value}</span>
                              </div>
                            </div>
                          </ChartTooltip>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {tasaPreaprobacion.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Preaprobación</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-green-600">{preaprobados}</div>
              <div className="text-xs text-muted-foreground">Preaprobados</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-red-600">{rechazados}</div>
              <div className="text-xs text-muted-foreground">Rechazados</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

