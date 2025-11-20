'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type DateRange = {
  from: Date | undefined
  to: Date | undefined
}

export type DatePreset = 'today' | 'thisWeek' | 'last30Days' | 'custom'

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange) => void
  className?: string
}

const getPresetRange = (preset: DatePreset): DateRange => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (preset) {
    case 'today':
      return {
        from: new Date(today),
        to: new Date(today),
      }
    case 'thisWeek': {
      const startOfWeek = new Date(today)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Lunes
      startOfWeek.setDate(diff)
      return {
        from: startOfWeek,
        to: today,
      }
    }
    case 'last30Days': {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return {
        from: thirtyDaysAgo,
        to: today,
      }
    }
    default:
      return { from: undefined, to: undefined }
  }
}

const getPresetFromRange = (range: DateRange): DatePreset | 'custom' => {
  if (!range.from || !range.to) return 'custom'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const from = new Date(range.from)
  from.setHours(0, 0, 0, 0)
  const to = new Date(range.to)
  to.setHours(0, 0, 0, 0)

  // Verificar si es hoy
  if (from.getTime() === today.getTime() && to.getTime() === today.getTime()) {
    return 'today'
  }

  // Verificar si es esta semana
  const thisWeekRange = getPresetRange('thisWeek')
  if (
    from.getTime() === thisWeekRange.from?.getTime() &&
    to.getTime() === thisWeekRange.to?.getTime()
  ) {
    return 'thisWeek'
  }

  // Verificar si son últimos 30 días
  const last30Range = getPresetRange('last30Days')
  if (
    from.getTime() === last30Range.from?.getTime() &&
    to.getTime() === last30Range.to?.getTime()
  ) {
    return 'last30Days'
  }

  return 'custom'
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<DatePreset | 'custom'>(
    value ? getPresetFromRange(value) : 'thisWeek'
  )
  const [dateRange, setDateRange] = React.useState<DateRange>(
    value || getPresetRange('thisWeek')
  )
  const [isCustomOpen, setIsCustomOpen] = React.useState(false)

  React.useEffect(() => {
    if (value) {
      setDateRange(value)
      setSelectedPreset(getPresetFromRange(value))
    }
  }, [value])

  const handlePresetChange = (preset: DatePreset | 'custom') => {
    setSelectedPreset(preset)
    if (preset !== 'custom') {
      const range = getPresetRange(preset as DatePreset)
      setDateRange(range)
      onChange?.(range)
    } else {
      setIsCustomOpen(true)
    }
  }

  const handleCustomDateChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range)
      if (range.from && range.to) {
        setIsCustomOpen(false)
        onChange?.(range)
      }
    }
  }

  const formatDateRange = () => {
    if (!dateRange.from) return 'Seleccionar rango'
    if (!dateRange.to) return format(dateRange.from, 'dd/MM/yyyy', { locale: es })
    if (dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, 'dd/MM/yyyy', { locale: es })
    }
    return `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px] h-9 sm:h-10 text-xs sm:text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoy</SelectItem>
          <SelectItem value="thisWeek">Esta semana</SelectItem>
          <SelectItem value="last30Days">Últimos 30 días</SelectItem>
          <SelectItem value="custom">Rango personalizado</SelectItem>
        </SelectContent>
      </Select>

      {selectedPreset === 'custom' && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-9 sm:h-10 text-xs sm:text-sm justify-start text-left font-normal',
                !dateRange.from && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={dateRange.from}
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={handleCustomDateChange}
              numberOfMonths={2}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

