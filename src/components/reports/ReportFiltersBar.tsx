'use client'

import { LEAD_ESTADOS, LEAD_ORIGENES, FORMOSA_ZONES } from '@/lib/validators'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

export interface ReportFiltersState {
  origen: string
  estado: string
  zona: string
  agencia: string
  tag: string
  q: string
  dailyGoal: string
}

interface ReportFiltersBarProps {
  value: ReportFiltersState
  onChange: (next: ReportFiltersState) => void
}

const ALL = '__all__'

export function ReportFiltersBar({ value, onChange }: ReportFiltersBarProps) {
  const patch = (partial: Partial<ReportFiltersState>) => onChange({ ...value, ...partial })

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label>Origen</Label>
            <Select
              value={value.origen || ALL}
              onValueChange={(v) => patch({ origen: v === ALL ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {LEAD_ORIGENES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={value.estado || ALL}
              onValueChange={(v) => patch({ estado: v === ALL ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value={ALL}>Todos</SelectItem>
                {LEAD_ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Zona</Label>
            <Select
              value={value.zona || ALL}
              onValueChange={(v) => patch({ zona: v === ALL ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value={ALL}>Todas</SelectItem>
                {FORMOSA_ZONES.map((z) => (
                  <SelectItem key={z} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Agencia</Label>
            <Input
              placeholder="Filtrar…"
              value={value.agencia}
              onChange={(e) => patch({ agencia: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Tag (contiene)</Label>
            <Input
              placeholder="ej. credito-preaprobado"
              value={value.tag}
              onChange={(e) => patch({ tag: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Objetivo diario (gráfico)</Label>
            <Input
              type="number"
              min={1}
              placeholder="25"
              value={value.dailyGoal}
              onChange={(e) => patch({ dailyGoal: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3 xl:col-span-6">
            <Label>Búsqueda (nombre, teléfono, email, DNI)</Label>
            <Input
              placeholder="Opcional…"
              value={value.q}
              onChange={(e) => patch({ q: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
