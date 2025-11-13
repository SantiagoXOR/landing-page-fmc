'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Save } from 'lucide-react'

interface ScoringRule {
  id?: string
  name: string
  description: string
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in_list'
  value: any
  score_points: number
  is_active: boolean
  priority: number
}

interface RuleBuilderProps {
  rule?: ScoringRule | null
  onSave: (rule: Partial<ScoringRule>) => Promise<void>
  onCancel: () => void
  saving?: boolean
}

const AVAILABLE_FIELDS = [
  { value: 'edad', label: 'Edad', type: 'number' },
  { value: 'ingresos', label: 'Ingresos', type: 'number' },
  { value: 'zona', label: 'Zona', type: 'string' },
  { value: 'estado', label: 'Estado', type: 'string' },
  { value: 'origen', label: 'Origen', type: 'string' },
  { value: 'producto', label: 'Producto', type: 'string' },
  { value: 'data_completeness', label: 'Completitud de datos', type: 'string' },
]

const OPERATORS = {
  number: [
    { value: 'equals', label: 'Igual a' },
    { value: 'greater_than', label: 'Mayor que' },
    { value: 'less_than', label: 'Menor que' },
    { value: 'between', label: 'Entre' },
  ],
  string: [
    { value: 'equals', label: 'Igual a' },
    { value: 'contains', label: 'Contiene' },
    { value: 'in_list', label: 'En lista' },
  ]
}

export function RuleBuilder({ rule, onSave, onCancel, saving = false }: RuleBuilderProps) {
  const [formData, setFormData] = useState<Partial<ScoringRule>>({
    name: rule?.name || '',
    description: rule?.description || '',
    field: rule?.field || 'edad',
    operator: rule?.operator || 'equals',
    value: rule?.value || '',
    score_points: rule?.score_points || 0,
    is_active: rule?.is_active ?? true,
    priority: rule?.priority || 1,
  })

  const selectedField = AVAILABLE_FIELDS.find(f => f.value === formData.field)
  const availableOperators = selectedField?.type === 'number' ? OPERATORS.number : OPERATORS.string

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{rule ? 'Editar Regla' : 'Nueva Regla de Scoring'}</CardTitle>
              <CardDescription>
                Define los criterios para puntuar automáticamente los leads
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onCancel}
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la regla *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Ej: Edad válida"
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Ej: Lead tiene edad entre 18 y 75 años"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Condición */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Condición</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="field">Campo *</Label>
                  <select
                    id="field"
                    value={formData.field}
                    onChange={(e) => handleFieldChange('field', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                    disabled={saving}
                  >
                    {AVAILABLE_FIELDS.map(field => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="operator">Operador *</Label>
                  <select
                    id="operator"
                    value={formData.operator}
                    onChange={(e) => handleFieldChange('operator', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                    disabled={saving}
                  >
                    {availableOperators.map(op => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Valor - dinámico según operador */}
              <div>
                <Label htmlFor="value">Valor *</Label>
                {formData.operator === 'between' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Mínimo"
                      value={formData.value?.min || ''}
                      onChange={(e) => handleFieldChange('value', {
                        ...formData.value,
                        min: parseInt(e.target.value)
                      })}
                      required
                      disabled={saving}
                    />
                    <Input
                      type="number"
                      placeholder="Máximo"
                      value={formData.value?.max || ''}
                      onChange={(e) => handleFieldChange('value', {
                        ...formData.value,
                        max: parseInt(e.target.value)
                      })}
                      required
                      disabled={saving}
                    />
                  </div>
                ) : formData.operator === 'in_list' ? (
                  <Input
                    id="value"
                    value={Array.isArray(formData.value) ? formData.value.join(', ') : formData.value}
                    onChange={(e) => handleFieldChange('value', e.target.value.split(',').map(s => s.trim()))}
                    placeholder="Valor 1, Valor 2, Valor 3"
                    required
                    disabled={saving}
                  />
                ) : selectedField?.type === 'number' ? (
                  <Input
                    id="value"
                    type="number"
                    value={formData.value}
                    onChange={(e) => handleFieldChange('value', parseInt(e.target.value))}
                    placeholder="Ingresa un número"
                    required
                    disabled={saving}
                  />
                ) : (
                  <Input
                    id="value"
                    value={formData.value}
                    onChange={(e) => handleFieldChange('value', e.target.value)}
                    placeholder="Ingresa el valor"
                    required
                    disabled={saving}
                  />
                )}
              </div>
            </div>

            {/* Puntuación */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Puntuación</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="score_points">Puntos *</Label>
                  <Input
                    id="score_points"
                    type="number"
                    value={formData.score_points}
                    onChange={(e) => handleFieldChange('score_points', parseInt(e.target.value))}
                    placeholder="0"
                    required
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Positivo para sumar, negativo para restar
                  </p>
                </div>

                <div>
                  <Label htmlFor="priority">Prioridad *</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    value={formData.priority}
                    onChange={(e) => handleFieldChange('priority', parseInt(e.target.value))}
                    placeholder="1"
                    required
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Orden de evaluación (1 = primero)
                  </p>
                </div>
              </div>

              {/* Estado activo */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  disabled={saving}
                />
                <Label htmlFor="is_active">Regla activa</Label>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                type="button"
                variant="outline" 
                className="flex-1"
                onClick={onCancel}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {rule ? 'Actualizar' : 'Crear'} Regla
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

