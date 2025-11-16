'use client'

import { useState, useEffect } from 'react'
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <Card className={cn('bg-white border-gray-200', className)}>
      <CardHeader className="px-4 sm:px-5 lg:px-6 pt-3 sm:pt-4 lg:pt-6 pb-2 sm:pb-3 lg:pb-4">
        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
          Tendencia Semanal
        </CardTitle>
        <p className="text-xs sm:text-sm text-gray-500">
          Evolución de conversaciones en los últimos 7 días
        </p>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
        <div className="h-56 sm:h-72 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="day" 
                stroke="#666"
                fontSize={isMobile ? 10 : 12}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                tickLine={false}
                axisLine={false}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 60 : 40}
              />
              <YAxis 
                stroke="#666"
                fontSize={isMobile ? 10 : 12}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 'dataMax + 1']}
                width={isMobile ? 30 : 40}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: isMobile ? '11px' : '12px',
                  padding: isMobile ? '6px' : '8px'
                }}
                labelStyle={{ color: '#374151', fontWeight: '500', fontSize: isMobile ? '11px' : '12px' }}
                itemStyle={{ fontSize: isMobile ? '11px' : '12px', padding: '2px' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#a855f7" 
                strokeWidth={isMobile ? 2 : 3}
                dot={{ fill: '#a855f7', strokeWidth: 2, r: isMobile ? 3 : 4 }}
                activeDot={{ r: isMobile ? 5 : 6, stroke: '#a855f7', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
