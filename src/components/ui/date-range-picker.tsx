'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DateRange as ReactDayPickerDateRange } from 'react-day-picker'
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

export type DateRange = ReactDayPickerDateRange

export type DatePreset = 'today' | 'thisWeek' | 'last30Days' | 'custom'

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange) => void
  className?: string
}

const getPresetRange = (preset: DatePreset): DateRange => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endOfToday = new Date(today)
  endOfToday.setHours(23, 59, 59, 999)

  switch (preset) {
    case 'today':
      return {
        from: new Date(today),
        to: endOfToday,
      }
    case 'thisWeek': {
      const startOfWeek = new Date(today)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Lunes
      startOfWeek.setDate(diff)
      startOfWeek.setHours(0, 0, 0, 0)
      return {
        from: startOfWeek,
        to: endOfToday,
      }
    }
    case 'last30Days': {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      thirtyDaysAgo.setHours(0, 0, 0, 0)
      return {
        from: thirtyDaysAgo,
        to: endOfToday,
      }
    }
    default:
      return { from: undefined, to: undefined }
  }
}

const getPresetFromRange = (range: DateRange): DatePreset | 'custom' => {
  if (!range.from || !range.to) return 'custom'

  // Normalizar fechas para comparación (solo fecha, sin horas)
  const normalizeDate = (date: Date): string => {
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    // Comparar solo la fecha (YYYY-MM-DD)
    return normalized.toISOString().split('T')[0]
  }

  const fromStr = normalizeDate(range.from)
  const toStr = normalizeDate(range.to)
  const todayStr = normalizeDate(new Date())

  // Verificar si es hoy
  if (fromStr === todayStr && toStr === todayStr) {
    return 'today'
  }

  // Verificar si es esta semana
  const thisWeekRange = getPresetRange('thisWeek')
  if (thisWeekRange.from && thisWeekRange.to) {
    const thisWeekFromStr = normalizeDate(thisWeekRange.from)
    const thisWeekToStr = normalizeDate(thisWeekRange.to)
    if (fromStr === thisWeekFromStr && toStr === thisWeekToStr) {
      return 'thisWeek'
    }
  }

  // Verificar si son últimos 30 días
  const last30Range = getPresetRange('last30Days')
  if (last30Range.from && last30Range.to) {
    const last30FromStr = normalizeDate(last30Range.from)
    const last30ToStr = normalizeDate(last30Range.to)
    if (fromStr === last30FromStr && toStr === last30ToStr) {
      return 'last30Days'
    }
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
  const lastUserPresetRef = React.useRef<DatePreset | 'custom' | null>(null)

  React.useEffect(() => {
    if (value) {
      const preset = getPresetFromRange(value)
      
      // Si el usuario acaba de seleccionar un preset, mantenerlo
      if (lastUserPresetRef.current !== null) {
        // El usuario seleccionó un preset, mantenerlo sin importar lo que detecte getPresetFromRange
        setSelectedPreset(lastUserPresetRef.current)
        // Actualizar el rango según el preset del usuario
        if (lastUserPresetRef.current !== 'custom') {
          const presetRange = getPresetRange(lastUserPresetRef.current as DatePreset)
          setDateRange(presetRange)
        } else {
          setDateRange(value)
        }
        // Resetear después de procesar
        lastUserPresetRef.current = null
      } else {
        // Cambio externo, actualizar normalmente
        setSelectedPreset(preset)
        if (preset !== 'custom') {
          const presetRange = getPresetRange(preset as DatePreset)
          setDateRange(presetRange)
        } else {
          setDateRange(value)
        }
      }
    }
  }, [value])

  const handlePresetChange = (preset: DatePreset | 'custom') => {
    // Guardar el preset seleccionado por el usuario
    lastUserPresetRef.current = preset
    setSelectedPreset(preset)
    if (preset !== 'custom') {
      const range = getPresetRange(preset as DatePreset)
      setDateRange(range)
      // Forzar actualización inmediata
      onChange?.(range)
    } else {
      setIsCustomOpen(true)
    }
  }

  const handleCustomDateChange = (range: ReactDayPickerDateRange | undefined) => {
    if (range) {
      const newRange: DateRange = {
        from: range.from,
        to: range.to,
      }
      // Asegurar que el to incluya todo el día
      if (newRange.to) {
        newRange.to.setHours(23, 59, 59, 999)
      }
      setDateRange(newRange)
      if (range.from && range.to) {
        lastUserPresetRef.current = 'custom'
        setIsCustomOpen(false)
        setSelectedPreset('custom')
        onChange?.(newRange)
      }
    }
  }

  const formatDateRange = () => {
    if (!dateRange.from) return 'Seleccionar rango'
    if (!dateRange.to) return format(dateRange.from, 'dd/MM/yyyy', { locale: es })
    // Comparar solo las fechas (sin horas)
    const fromDate = dateRange.from.toISOString().split('T')[0]
    const toDate = dateRange.to.toISOString().split('T')[0]
    if (fromDate === toDate) {
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

