'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DateRange } from '@/components/ui/date-range-picker'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface WeeklyTrendChartProps {
  data?: Array<{
    day: string
    value: number
  }>
  dateRange?: DateRange
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
  dateRange,
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

  const getTitle = () => {
    if (!dateRange?.from || !dateRange?.to) {
      return 'Tendencia Semanal'
    }
    
    const from = dateRange.from
    const to = dateRange.to
    
    if (from.getTime() === to.getTime()) {
      return `Tendencia - ${format(from, 'dd/MM/yyyy', { locale: es })}`
    }
    
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
    if (daysDiff <= 7) {
      return 'Tendencia Semanal'
    } else if (daysDiff <= 30) {
      return 'Tendencia Mensual'
    } else {
      return 'Tendencia'
    }
  }

  const getDescription = () => {
    if (!dateRange?.from || !dateRange?.to) {
      return 'Evolución de conversaciones en los últimos 7 días'
    }
    
    const from = dateRange.from
    const to = dateRange.to
    
    if (from.getTime() === to.getTime()) {
      return `Conversaciones del ${format(from, 'dd/MM/yyyy', { locale: es })}`
    }
    
    return `Evolución de conversaciones del ${format(from, 'dd/MM/yyyy', { locale: es })} al ${format(to, 'dd/MM/yyyy', { locale: es })}`
  }

  const chartData = data && data.length > 0 ? data : defaultData

  return (
    <Card className={cn('bg-white border-gray-200', className)}>
      <CardHeader className="px-4 sm:px-5 lg:px-6 pt-3 sm:pt-4 lg:pt-6 pb-2 sm:pb-3 lg:pb-4">
        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
          {getTitle()}
        </CardTitle>
        <p className="text-xs sm:text-sm text-gray-500">
          {getDescription()}
        </p>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
        {chartData.length === 0 ? (
          <div className="h-56 sm:h-72 lg:h-80 flex items-center justify-center text-muted-foreground">
            No hay datos disponibles
          </div>
        ) : (
          <div className="h-56 sm:h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
        )}
      </CardContent>
    </Card>
  )
}
