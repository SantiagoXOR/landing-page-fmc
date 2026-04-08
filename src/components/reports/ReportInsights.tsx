'use client'

import { Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ReportInsightsProps {
  lines: string[]
  className?: string
}

export function ReportInsights({ lines, className }: ReportInsightsProps) {
  if (!lines.length) return null
  return (
    <Card className={`border-purple-200/80 bg-purple-50/40 dark:bg-purple-950/20 dark:border-purple-900/50 ${className || ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-purple-600" />
          Insights automáticos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          {lines.map((line, i) => (
            <li key={i} className="text-foreground/90">
              {line}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
