'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Save, Plus, Trash2, Settings } from 'lucide-react'

interface Rule {
  key: string
  value: string
  description: string
}

export default function SettingsContent() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newRule, setNewRule] = useState({ key: '', value: '', description: '' })

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/rules')
      if (response.ok) {
        const data = await response.json()
        setRules(data)
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveRule = async (rule: Rule) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/rules/${rule.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: rule.value, description: rule.description }),
      })
      
      if (response.ok) {
        await fetchRules()
      }
    } catch (error) {
      console.error('Error saving rule:', error)
    } finally {
      setSaving(false)
    }
  }

  const createRule = async () => {
    if (!newRule.key || !newRule.value) return

    try {
      setSaving(true)
      const response = await fetch(`/api/rules/${newRule.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          value: newRule.value, 
          description: newRule.description || 'Regla personalizada' 
        }),
      })
      
      if (response.ok) {
        setNewRule({ key: '', value: '', description: '' })
        await fetchRules()
      }
    } catch (error) {
      console.error('Error creating rule:', error)
    } finally {
      setSaving(false)
    }
  }

  const deleteRule = async (key: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta regla?')) return

    try {
      setSaving(true)
      const response = await fetch(`/api/rules/${key}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await fetchRules()
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando configuración...</div>
  }

  const defaultRules = rules.filter(rule => 
    ['MIN_AGE', 'MAX_AGE', 'MIN_INCOME', 'ALLOWED_ZONES'].includes(rule.key)
  )
  
  const customRules = rules.filter(rule => 
    !['MIN_AGE', 'MAX_AGE', 'MIN_INCOME', 'ALLOWED_ZONES'].includes(rule.key)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Configuración</h1>
        <Badge variant="outline" className="flex items-center space-x-1">
          <Settings className="w-3 h-3" />
          <span>Sistema de Scoring</span>
        </Badge>
      </div>

      {/* Reglas del sistema de scoring */}
      <Card>
        <CardHeader>
          <CardTitle>Reglas de Scoring</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configura los parámetros que utiliza el sistema automático de evaluación de leads
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {defaultRules.map((rule) => (
              <div key={rule.key} className="space-y-2">
                <Label htmlFor={rule.key}>{rule.description}</Label>
                <div className="flex space-x-2">
                  <Input
                    id={rule.key}
                    value={rule.value}
                    onChange={(e) => {
                      const updatedRules = rules.map(r => 
                        r.key === rule.key ? { ...r, value: e.target.value } : r
                      )
                      setRules(updatedRules)
                    }}
                    placeholder={`Valor para ${rule.key}`}
                  />
                  <Button
                    onClick={() => saveRule(rule)}
                    disabled={saving}
                    size="sm"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Clave: <code className="bg-gray-100 px-1 rounded">{rule.key}</code>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reglas personalizadas */}
      <Card>
        <CardHeader>
          <CardTitle>Reglas Personalizadas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Crea reglas adicionales para personalizar el comportamiento del sistema
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulario para nueva regla */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-gray-50">
            <div>
              <Label htmlFor="new-key">Clave</Label>
              <Input
                id="new-key"
                value={newRule.key}
                onChange={(e) => setNewRule({ ...newRule, key: e.target.value.toUpperCase() })}
                placeholder="NUEVA_REGLA"
              />
            </div>
            <div>
              <Label htmlFor="new-value">Valor</Label>
              <Input
                id="new-value"
                value={newRule.value}
                onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                placeholder="valor"
              />
            </div>
            <div>
              <Label htmlFor="new-description">Descripción</Label>
              <Input
                id="new-description"
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Descripción de la regla"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={createRule}
                disabled={saving || !newRule.key || !newRule.value}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear
              </Button>
            </div>
          </div>

          {/* Lista de reglas personalizadas */}
          {customRules.length > 0 && (
            <div className="space-y-3">
              {customRules.map((rule) => (
                <div key={rule.key} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Clave</Label>
                      <p className="font-mono text-sm">{rule.key}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Valor</Label>
                      <Input
                        value={rule.value}
                        onChange={(e) => {
                          const updatedRules = rules.map(r =>
                            r.key === rule.key ? { ...r, value: e.target.value } : r
                          )
                          setRules(updatedRules)
                        }}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Descripción</Label>
                      <Input
                        value={rule.description}
                        onChange={(e) => {
                          const updatedRules = rules.map(r =>
                            r.key === rule.key ? { ...r, description: e.target.value } : r
                          )
                          setRules(updatedRules)
                        }}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => saveRule(rule)}
                      disabled={saving}
                      size="sm"
                      variant="outline"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => deleteRule(rule.key)}
                      disabled={saving}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {customRules.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay reglas personalizadas. Crea una nueva regla arriba.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información del sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-gray-500">Versión del CRM</Label>
              <p>Phorencial CRM v1.0.0</p>
            </div>
            <div>
              <Label className="text-gray-500">Base de Datos</Label>
              <p>SQLite (Desarrollo)</p>
            </div>
            <div>
              <Label className="text-gray-500">Reglas Activas</Label>
              <p>{rules.length} reglas configuradas</p>
            </div>
            <div>
              <Label className="text-gray-500">Última Actualización</Label>
              <p>{new Date().toLocaleString('es-AR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
