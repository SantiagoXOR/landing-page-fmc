'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react'

interface Lead {
  id: string
  nombre: string
  telefono: string
  email?: string
  dni?: string
  ingresos?: number
  zona?: string
  producto?: string
  monto?: number
  origen?: string
  utmSource?: string
  estado: string
  agencia?: string
  notas?: string
  createdAt: string
  updatedAt: string
  events: Event[]
}

interface Event {
  id: string
  tipo: string
  payload?: any
  createdAt: string
}

interface ScoringResult {
  score: number
  decision: string
  motivos: string[]
}

interface LeadDetailContentProps {
  leadId: string
}

export default function LeadDetailContent({ leadId }: LeadDetailContentProps) {
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null)

  const fetchLead = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}`)
      if (response.ok) {
        const data = await response.json()
        setLead(data)
      } else if (response.status === 404) {
        router.push('/leads')
      }
    } catch (error) {
      console.error('Error fetching lead:', error)
    } finally {
      setLoading(false)
    }
  }

  const evaluateLead = async () => {
    try {
      setScoring(true)
      const response = await fetch('/api/scoring/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      
      if (response.ok) {
        const result = await response.json()
        setScoringResult(result)
        // Refrescar lead para ver el estado actualizado
        await fetchLead()
      }
    } catch (error) {
      console.error('Error evaluating lead:', error)
    } finally {
      setScoring(false)
    }
  }

  useEffect(() => {
    fetchLead()
  }, [leadId])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  if (!lead) {
    return <div className="text-center py-8">Lead no encontrado</div>
  }

  const getEstadoBadge = (estado: string) => {
    const config = {
      NUEVO: { variant: 'default' as const, icon: Clock },
      EN_REVISION: { variant: 'secondary' as const, icon: Clock },
      PREAPROBADO: { variant: 'default' as const, icon: CheckCircle },
      RECHAZADO: { variant: 'destructive' as const, icon: XCircle },
      DOC_PENDIENTE: { variant: 'outline' as const, icon: Clock },
      DERIVADO: { variant: 'secondary' as const, icon: CheckCircle },
    }
    
    const { variant, icon: Icon } = config[estado as keyof typeof config] || config.NUEVO
    
    return (
      <Badge variant={variant} className="flex items-center space-x-1">
        <Icon className="w-3 h-3" />
        <span>{estado}</span>
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold">{lead.nombre}</h1>
        {getEstadoBadge(lead.estado)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del lead */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nombre</label>
                  <p className="text-sm">{lead.nombre}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">DNI</label>
                  <p className="text-sm">{lead.dni || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Teléfono</label>
                  <p className="text-sm">{lead.telefono}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm">{lead.email || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Ingresos</label>
                  <p className="text-sm">{lead.ingresos ? formatCurrency(lead.ingresos) : 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Zona</label>
                  <p className="text-sm">{lead.zona || 'No especificada'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información Comercial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Producto</label>
                  <p className="text-sm">{lead.producto || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Monto</label>
                  <p className="text-sm">{lead.monto ? formatCurrency(lead.monto) : 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Origen</label>
                  <p className="text-sm">{lead.origen || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">UTM Source</label>
                  <p className="text-sm">{lead.utmSource || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Agencia</label>
                  <p className="text-sm">{lead.agencia || 'No asignada'}</p>
                </div>
              </div>
              {lead.notas && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notas</label>
                  <p className="text-sm mt-1">{lead.notas}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline de eventos */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lead.events.map((event) => (
                  <div key={event.id} className="flex items-start space-x-3 pb-4 border-b last:border-b-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{event.tipo}</p>
                        <p className="text-xs text-gray-500">{formatDate(new Date(event.createdAt))}</p>
                      </div>
                      {event.payload && (
                        <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                          {typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={evaluateLead} 
                disabled={scoring}
                className="w-full"
              >
                {scoring ? 'Evaluando...' : 'Evaluar Lead'}
              </Button>
            </CardContent>
          </Card>

          {scoringResult && (
            <Card>
              <CardHeader>
                <CardTitle>Resultado de Evaluación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold">{scoringResult.score}</div>
                  <div className="text-sm text-gray-500">Puntuación</div>
                </div>
                <Badge 
                  variant={scoringResult.decision === 'PREAPROBADO' ? 'default' : 
                           scoringResult.decision === 'RECHAZADO' ? 'destructive' : 'secondary'}
                  className="w-full justify-center"
                >
                  {scoringResult.decision}
                </Badge>
                <div>
                  <h4 className="text-sm font-medium mb-2">Motivos:</h4>
                  <ul className="text-xs space-y-1">
                    {scoringResult.motivos.map((motivo, index) => (
                      <li key={index} className="text-gray-600">• {motivo}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Creado:</span> {formatDate(new Date(lead.createdAt))}
              </div>
              <div>
                <span className="font-medium">Actualizado:</span> {formatDate(new Date(lead.updatedAt))}
              </div>
              <div>
                <span className="font-medium">ID:</span> {lead.id}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
