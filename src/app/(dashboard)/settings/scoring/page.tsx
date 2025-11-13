'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { RuleBuilder } from '@/components/scoring/RuleBuilder'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Save, Trash2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'

interface ScoringRule {
  id: string
  name: string
  description: string
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in_list'
  value: any
  score_points: number
  is_active: boolean
  priority: number
}

const DEFAULT_RULES: Partial<ScoringRule>[] = [
  {
    name: 'Edad válida',
    description: 'Lead tiene edad entre 18 y 75 años',
    field: 'edad',
    operator: 'between',
    value: { min: 18, max: 75 },
    score_points: 20,
    is_active: true,
    priority: 1
  },
  {
    name: 'Ingresos suficientes',
    description: 'Ingresos mínimos de $200,000',
    field: 'ingresos',
    operator: 'greater_than',
    value: 200000,
    score_points: 25,
    is_active: true,
    priority: 2
  },
  {
    name: 'Zona prioritaria',
    description: 'Lead de zona prioritaria (Formosa Capital, Clorinda)',
    field: 'zona',
    operator: 'in_list',
    value: ['Formosa Capital', 'Clorinda', 'Pirané'],
    score_points: 15,
    is_active: true,
    priority: 3
  },
  {
    name: 'Datos completos',
    description: 'Lead tiene email, teléfono y DNI',
    field: 'data_completeness',
    operator: 'equals',
    value: 'complete',
    score_points: 10,
    is_active: true,
    priority: 4
  }
]

export default function ScoringSettingsPage() {
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingRule, setEditingRule] = useState<ScoringRule | null>(null)
  const [showRuleBuilder, setShowRuleBuilder] = useState(false)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/scoring/rules')
      
      if (response.ok) {
        const data = await response.json()
        setRules(data.rules || [])
      } else {
        // Si no hay reglas, usar defaults
        setRules([])
      }
    } catch (error) {
      console.error('Error fetching scoring rules:', error)
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRule = () => {
    setEditingRule(null)
    setShowRuleBuilder(true)
  }

  const handleEditRule = (rule: ScoringRule) => {
    setEditingRule(rule)
    setShowRuleBuilder(true)
  }

  const handleSaveRule = async (rule: Partial<ScoringRule>) => {
    try {
      setSaving(true)

      const method = editingRule ? 'PUT' : 'POST'
      const url = editingRule 
        ? `/api/scoring/rules/${editingRule.id}`
        : '/api/scoring/rules'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      })

      if (response.ok) {
        await fetchRules()
        setShowRuleBuilder(false)
        setEditingRule(null)
      } else {
        console.error('Error saving rule')
      }
    } catch (error) {
      console.error('Error saving rule:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/scoring/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })

      if (response.ok) {
        await fetchRules()
      }
    } catch (error) {
      console.error('Error toggling rule:', error)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta regla?')) {
      return
    }

    try {
      const response = await fetch(`/api/scoring/rules/${ruleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchRules()
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  const getTotalPossiblePoints = () => {
    return rules
      .filter(r => r.is_active)
      .reduce((sum, rule) => sum + rule.score_points, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Reglas de Scoring"
          subtitle="Configura el sistema automático de puntuación de leads"
          showDateFilter={false}
          showExportButton={false}
          showNewButton={false}
        />
        <div className="p-6 space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Reglas de Scoring"
        subtitle="Configura el sistema automático de puntuación de leads"
        showDateFilter={false}
        showExportButton={false}
        showNewButton={false}
      />

      <div className="p-6 space-y-6">
        {/* Info Banner */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-900 font-medium">Sistema de Scoring Automático</p>
                <p className="text-sm text-blue-700 mt-1">
                  Define reglas para puntuar automáticamente los leads según sus características. 
                  El puntaje ayuda a priorizar y clasificar leads automáticamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Reglas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rules.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Reglas Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {rules.filter(r => r.is_active).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Puntaje Máximo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {getTotalPossiblePoints()} puntos
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botón de crear regla */}
        <div className="flex justify-end">
          <Button 
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleCreateRule}
          >
            <Plus className="h-4 w-4" />
            Nueva Regla
          </Button>
        </div>

        {/* Lista de reglas */}
        <div className="space-y-4">
          {rules.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No hay reglas configuradas</p>
                <Button onClick={handleCreateRule} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear primera regla
                </Button>
              </CardContent>
            </Card>
          )}

          {rules.map((rule, index) => (
            <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{rule.name}</h3>
                      <Badge className={rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {rule.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                      <Badge variant="outline" className="text-purple-700 border-purple-300">
                        {rule.score_points > 0 ? `+${rule.score_points}` : rule.score_points} pts
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{rule.description}</p>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <code className="bg-gray-100 px-2 py-1 rounded">
                        {rule.field} {rule.operator} {JSON.stringify(rule.value)}
                      </code>
                      <span>•</span>
                      <span>Prioridad: {rule.priority}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleRule(rule.id, rule.is_active)}
                      title={rule.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {rule.is_active ? (
                        <ToggleRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRule(rule)}
                    >
                      Editar
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Explicación de puntajes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sistema de Puntuación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="font-semibold text-green-700 mb-1">≥ 70 puntos</p>
                <p className="text-green-600">Lead Calificado (PREAPROBADO)</p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="font-semibold text-yellow-700 mb-1">40-69 puntos</p>
                <p className="text-yellow-600">Requiere Revisión (EN_REVISION)</p>
              </div>

              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="font-semibold text-red-700 mb-1">&lt; 40 puntos</p>
                <p className="text-red-600">No Calificado (RECHAZADO)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Rule Builder */}
      {showRuleBuilder && (
        <RuleBuilder
          rule={editingRule}
          onSave={handleSaveRule}
          onCancel={() => {
            setShowRuleBuilder(false)
            setEditingRule(null)
          }}
          saving={saving}
        />
      )}
    </div>
  )
}

