'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface EmbudoResumenChartProps {
  nuevos: number
  enSeguimiento: number
  ganados: number
  noConcretados: number
  totalLeads: number
  className?: string
}

const COLORS = {
  nuevos: 'hsl(217, 91%, 55%)',
  seguimiento: 'hsl(262, 83%, 58%)',
  ganados: 'hsl(142, 76%, 36%)',
  noConcretados: 'hsl(0, 72%, 55%)',
}

export function EmbudoResumenChart({
  nuevos,
  enSeguimiento,
  ganados,
  noConcretados,
  totalLeads,
  className,
}: EmbudoResumenChartProps) {
  const data = [
    { name: 'Nuevos', value: nuevos, color: COLORS.nuevos },
    { name: 'En seguimiento', value: enSeguimiento, color: COLORS.seguimiento },
    { name: 'Cerrados ganados', value: ganados, color: COLORS.ganados },
    { name: 'No concretados', value: noConcretados, color: COLORS.noConcretados },
  ].filter((d) => d.value > 0)

  const tasaExito =
    ganados + noConcretados > 0
      ? (ganados / (ganados + noConcretados)) * 100
      : null

  if (totalLeads === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Resumen del embudo</CardTitle>
          <CardDescription>Leads nuevos, en trabajo y resultados cerrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] gap-2 text-muted-foreground text-sm">
            No hay leads en el período seleccionado
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Resumen del embudo</CardTitle>
        <CardDescription>Leads nuevos, en trabajo y resultados cerrados</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <ChartContainer className="h-[220px] w-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
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
                        const row = payload[0].payload
                        const pct =
                          totalLeads > 0 ? ((row.value / totalLeads) * 100).toFixed(1) : '0'
                        return (
                          <ChartTooltip>
                            <div className="grid gap-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: row.color }}
                                />
                                <span className="font-medium">{row.name}</span>
                              </div>
                              <div className="text-muted-foreground">
                                Cantidad: <span className="font-medium">{row.value}</span>
                              </div>
                              <div className="text-muted-foreground">
                                Del total: <span className="font-medium">{pct}%</span>
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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center px-2">
                {tasaExito !== null ? (
                  <>
                    <div className="text-2xl font-bold text-primary">{tasaExito.toFixed(0)}%</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">
                      Éxito sobre<br />cerrados
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-muted-foreground">—</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">
                      Sin cierres<br />en período
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full text-center">
            {[
              { label: 'Nuevos', value: nuevos, color: COLORS.nuevos },
              { label: 'Seguimiento', value: enSeguimiento, color: COLORS.seguimiento },
              { label: 'Ganados', value: ganados, color: COLORS.ganados },
              { label: 'No concretados', value: noConcretados, color: COLORS.noConcretados },
            ].map((row) => (
              <div key={row.label} className="p-3 rounded-lg bg-muted/50">
                <div className="text-lg font-bold" style={{ color: row.color }}>
                  {row.value}
                </div>
                <div className="text-xs text-muted-foreground">{row.label}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
