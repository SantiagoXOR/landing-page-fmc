'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { cn } from '@/lib/utils'

interface ConversationsByChannelProps {
  data?: Array<{
    name: string
    value: number
    color: string
  }>
  className?: string
}

const defaultData = [
  { name: 'WhatsApp', value: 56, color: '#a855f7' },
  { name: 'Instagram', value: 44, color: '#e9d5ff' }
]

export function ConversationsByChannel({ 
  data = defaultData, 
  className 
}: ConversationsByChannelProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [windowWidth, setWindowWidth] = useState(1024)

  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setWindowWidth(width)
    }
    
    checkSize()
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  const getInnerRadius = () => {
    if (isMobile) return 40
    if (windowWidth < 1024) return 50
    return 60
  }

  const getOuterRadius = () => {
    if (isMobile) return 70
    if (windowWidth < 1024) return 85
    return 100
  }

  return (
    <Card className={cn('bg-white border-gray-200', className)}>
      <CardHeader className="px-4 sm:px-5 lg:px-6 pt-3 sm:pt-4 lg:pt-6 pb-2 sm:pb-3 lg:pb-4">
        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">
          CONVERSACIONES POR CANAL
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
        <div className="h-56 sm:h-72 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={getInnerRadius()}
                outerRadius={getOuterRadius()}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend 
                verticalAlign="bottom" 
                height={isMobile ? 28 : 36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color, fontSize: isMobile ? '11px' : '12px' }}>
                    {value} - {entry.payload?.value || 0}%
                  </span>
                )}
                wrapperStyle={{ fontSize: isMobile ? '11px' : '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
