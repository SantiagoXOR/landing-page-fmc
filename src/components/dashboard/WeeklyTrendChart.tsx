'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface WeeklyTrendChartProps {
  data?: Array<{
    day: string
    value: number
  }>
  className?: string
}

const defaultData = [
  { day: 'Jueves 16/10', value: 2 },
  { day: 'Viernes 17/10', value: 6 },
  { day: 'Sábado 18/10', value: 0 },
  { day: 'Domingo 19/10', value: 5 },
  { day: 'Lunes 20/10', value: 5 },
  { day: 'Martes 21/10', value: 3 },
  { day: 'Miércoles 22/10', value: 1 }
]

export function WeeklyTrendChart({ 
  data = defaultData, 
  className 
}: WeeklyTrendChartProps) {
  return (
    <Card className={cn('bg-white border-gray-200', className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Tendencia Semanal
        </CardTitle>
        <p className="text-sm text-gray-500">
          Evolución de conversaciones en los últimos 7 días
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="day" 
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 'dataMax + 1']}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151', fontWeight: '500' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#a855f7" 
                strokeWidth={3}
                dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#a855f7', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
