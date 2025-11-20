'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface LeadsByStatusChartProps {
  data: Record<string, number>
  totalLeads: number
  className?: string
}

const STATUS_COLORS: Record<string, string> = {
  PREAPROBADO: 'hsl(142, 76%, 36%)', // Verde
  RECHAZADO: 'hsl(0, 84%, 60%)', // Rojo
  NUEVO: 'hsl(217, 91%, 60%)', // Azul
  CONTACTADO: 'hsl(38, 92%, 50%)', // Amarillo/Naranja
  EN_PROCESO: 'hsl(262, 83%, 58%)', // Púrpura
  CERRADO: 'hsl(142, 76%, 36%)', // Verde
}

const DEFAULT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight="medium"
    >
      {percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
    </text>
  )
}

export function LeadsByStatusChart({
  data,
  totalLeads,
  className,
}: LeadsByStatusChartProps) {
  const chartData = Object.entries(data)
    .map(([estado, cantidad], index) => ({
      name: estado,
      value: cantidad,
      porcentaje: totalLeads > 0 ? ((cantidad / totalLeads) * 100).toFixed(1) : 0,
      color: STATUS_COLORS[estado] || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Leads por Estado</CardTitle>
          <CardDescription>Distribución de leads según su estado</CardDescription>
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
        <CardTitle>Leads por Estado</CardTitle>
        <CardDescription>Distribución de leads según su estado</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
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
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry: any) => (
                  <span className="text-sm text-muted-foreground">
                    {value} ({entry.payload.porcentaje}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

