'use client'

import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  ReferenceLine,
  Legend,
} from 'recharts'
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
  /** Misma ventana de tiempo previa; se alinea por índice de día con `data` */
  comparisonData?: LeadsByDayData[]
  comparisonLabel?: string
  /** Objetivo diario de leads (línea horizontal) */
  dailyGoal?: number
  className?: string
}

export function LeadsByDayChart({
  data,
  comparisonData,
  comparisonLabel = 'Período anterior',
  dailyGoal,
  className,
}: LeadsByDayChartProps) {
  const hasComparison = comparisonData && comparisonData.length > 0
  const chartData = data.map((item, i) => ({
    fecha: format(new Date(item.fecha), 'dd/MM', { locale: es }),
    fechaCompleta: format(new Date(item.fecha), 'dd/MM/yyyy', { locale: es }),
    cantidad: item.cantidad,
    comparacion: hasComparison ? (comparisonData![i]?.cantidad ?? null) : null,
  }))

  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(d.cantidad, d.comparacion ?? 0)),
    dailyGoal ?? 0,
    1
  )

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
        <CardDescription>
          Evolución diaria en el rango seleccionado
          {hasComparison ? ` · Línea naranja: ${comparisonLabel} (misma duración, alineada por día)` : ''}
          {dailyGoal != null && dailyGoal > 0 ? ` · Línea gris: objetivo ${dailyGoal}/día` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                domain={[0, maxValue + Math.max(2, Math.ceil(maxValue * 0.08))]}
              />
              {dailyGoal != null && dailyGoal > 0 && (
                <ReferenceLine
                  y={dailyGoal}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="6 4"
                  label={{ value: 'Objetivo', position: 'insideTopRight', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
              )}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload
                    return (
                      <ChartTooltip>
                        <div className="grid gap-2">
                          <div className="font-medium">{row.fechaCompleta}</div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <span className="text-muted-foreground">Leads:</span>
                            <span className="font-medium">{row.cantidad}</span>
                          </div>
                          {hasComparison && row.comparacion != null && (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-orange-500" />
                              <span className="text-muted-foreground">{comparisonLabel}:</span>
                              <span className="font-medium">{row.comparacion}</span>
                            </div>
                          )}
                        </div>
                      </ChartTooltip>
                    )
                  }
                  return null
                }}
              />
              {hasComparison && <Legend />}
              <Area
                type="monotone"
                dataKey="cantidad"
                name="Período actual"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorLeads)"
              />
              {hasComparison && (
                <Line
                  type="monotone"
                  dataKey="comparacion"
                  name={comparisonLabel}
                  stroke="hsl(25, 95%, 48%)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
