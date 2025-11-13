'use client'

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
  return (
    <Card className={cn('bg-white border-gray-200', className)}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          CONVERSACIONES POR CANAL
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color, fontSize: '12px' }}>
                    {value} - {entry.payload?.value || 0}%
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
