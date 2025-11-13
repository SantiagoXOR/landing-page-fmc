'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ManychatBadge } from './ManychatBadge'
import { Settings, Save, RefreshCw, CheckCircle2, XCircle, Edit2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface ManychatCustomFieldsProps {
  leadId: string
  manychatId?: string
}

interface CustomField {
  name: string
  value: any
  synced: boolean
  crmValue?: any
}

export function ManychatCustomFields({ leadId, manychatId }: ManychatCustomFieldsProps) {
  const { addToast } = useToast()
  const [fields, setFields] = useState<CustomField[]>([])
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lead, setLead] = useState<any>(null)

  useEffect(() => {
    fetchLeadAndFields()
  }, [leadId])

  const fetchLeadAndFields = async () => {
    try {
      setLoading(true)
      
      // Obtener datos del lead
      const leadResponse = await fetch(`/api/leads/${leadId}`)
      if (leadResponse.ok) {
        const leadData = await leadResponse.json()
        setLead(leadData)
        
        // Parsear custom fields si existen
        let manychatFields: Record<string, any> = {}
        if (leadData.customFields) {
          try {
            manychatFields = typeof leadData.customFields === 'string' 
              ? JSON.parse(leadData.customFields) 
              : leadData.customFields
          } catch (e) {
            manychatFields = {}
          }
        }

        // Mapear campos del CRM a Manychat
        const fieldsList: CustomField[] = [
          {
            name: 'dni',
            value: manychatFields.dni || leadData.dni,
            synced: manychatFields.dni === leadData.dni,
            crmValue: leadData.dni,
          },
          {
            name: 'ingresos',
            value: manychatFields.ingresos || leadData.ingresos,
            synced: manychatFields.ingresos === leadData.ingresos,
            crmValue: leadData.ingresos,
          },
          {
            name: 'zona',
            value: manychatFields.zona || leadData.zona,
            synced: manychatFields.zona === leadData.zona,
            crmValue: leadData.zona,
          },
          {
            name: 'producto',
            value: manychatFields.producto || leadData.producto,
            synced: manychatFields.producto === leadData.producto,
            crmValue: leadData.producto,
          },
          {
            name: 'monto',
            value: manychatFields.monto || leadData.monto,
            synced: manychatFields.monto === leadData.monto,
            crmValue: leadData.monto,
          },
          {
            name: 'origen',
            value: manychatFields.origen || leadData.origen,
            synced: manychatFields.origen === leadData.origen,
            crmValue: leadData.origen,
          },
          {
            name: 'estado',
            value: manychatFields.estado || leadData.estado,
            synced: manychatFields.estado === leadData.estado,
            crmValue: leadData.estado,
          },
          {
            name: 'agencia',
            value: manychatFields.agencia || leadData.agencia,
            synced: manychatFields.agencia === leadData.agencia,
            crmValue: leadData.agencia,
          },
        ]

        setFields(fieldsList)
      }
    } catch (error) {
      console.error('Error fetching fields:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncAll = async () => {
    if (!manychatId) {
      addToast({
        title: 'Lead no sincronizado',
        description: 'El lead debe estar sincronizado con Manychat primero',
        type: 'error',
      })
      return
    }

    try {
      setSyncing(true)
      
      // Sincronizar custom fields vía endpoint de sincronización
      const response = await fetch('/api/manychat/sync-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId,
          fullSync: true,
        }),
      })

      if (response.ok) {
        addToast({
          title: 'Campos sincronizados',
          description: 'Los custom fields se sincronizaron correctamente',
          type: 'success',
        })
        await fetchLeadAndFields()
      } else {
        throw new Error('Error al sincronizar')
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudieron sincronizar los campos',
        type: 'error',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleEditField = (fieldName: string, value: any) => {
    setEditingField(fieldName)
    setEditValues({ ...editValues, [fieldName]: value ?? '' })
  }

  const handleSaveField = async (fieldName: string) => {
    const newValue = editValues[fieldName]
    
    // Actualizar el lead en el CRM (esto debería sincronizar automáticamente)
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [fieldName]: newValue,
        }),
      })

      if (response.ok) {
        addToast({
          title: 'Campo actualizado',
          description: `${fieldName} se actualizó correctamente`,
          type: 'success',
        })
        setEditingField(null)
        await fetchLeadAndFields()
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudo actualizar el campo',
        type: 'error',
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingField(null)
    setEditValues({})
  }

  if (!manychatId) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-sm text-yellow-900">
            Custom Fields no disponibles
          </CardTitle>
          <CardDescription className="text-yellow-700">
            El lead debe estar sincronizado con Manychat para gestionar custom fields
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Custom Fields</CardTitle>
          </div>
          <Button
            onClick={handleSyncAll}
            disabled={syncing}
            size="sm"
            variant="outline"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar todo
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Mapeo de campos entre el CRM y Manychat
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {fields.map((field) => (
            <div
              key={field.name}
              className={cn(
                'p-3 rounded-lg border',
                field.synced ? 'border-green-200 bg-green-50/30' : 'border-yellow-200 bg-yellow-50/30'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="text-sm font-medium text-gray-700 capitalize">
                      {field.name}
                    </Label>
                    {field.synced ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-yellow-600" />
                    )}
                  </div>

                  {editingField === field.name ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={editValues[field.name]}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            [field.name]: e.target.value,
                          })
                        }
                        className="h-8 text-sm"
                        placeholder={`Valor de ${field.name}`}
                      />
                      <Button
                        onClick={() => handleSaveField(field.name)}
                        size="sm"
                        className="h-8"
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        size="sm"
                        variant="ghost"
                        className="h-8"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-900">
                          <span className="text-xs text-gray-500">CRM:</span>{' '}
                          {field.crmValue || <span className="italic text-gray-400">No especificado</span>}
                        </p>
                        {!field.synced && field.value && (
                          <p className="text-sm text-gray-600">
                            <span className="text-xs text-gray-500">Manychat:</span>{' '}
                            {field.value}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => handleEditField(field.name, field.crmValue)}
                        size="sm"
                        variant="ghost"
                        className="h-7"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {!field.synced && (
                <div className="mt-2 pt-2 border-t border-yellow-200">
                  <p className="text-xs text-yellow-700">
                    ⚠ Valor desincronizado. Sincroniza para actualizar Manychat.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <ManychatBadge variant="info" size="sm">
            {fields.filter(f => f.synced).length} de {fields.length} campos sincronizados
          </ManychatBadge>
        </div>
      </CardContent>
    </Card>
  )
}

