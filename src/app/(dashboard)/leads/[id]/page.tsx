'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate, formatCurrency } from '@/lib/utils'
import { 
  ArrowLeft, CheckCircle, XCircle, Clock, RefreshCw, Tag, Bot, Phone, Mail, 
  MapPin, DollarSign, Building2, Briefcase, FileText, MessageSquare, History,
  Sparkles, AlertCircle, Info, ExternalLink
} from 'lucide-react'
import WhatsAppHistory from '@/components/whatsapp/WhatsAppHistory'
import { TagPill } from '@/components/chat/TagPill'

interface Lead {
  id: string
  nombre: string
  telefono: string
  email?: string
  dni?: string
  cuil?: string
  ingresos?: number
  zona?: string
  producto?: string
  monto?: number
  origen?: string
  utmSource?: string
  estado: string
  agencia?: string
  banco?: string
  trabajo_actual?: string
  notas?: string
  createdAt: string
  updatedAt: string
  events: Event[]
  tags?: string | string[]
  manychatId?: string
  customFields?: string | Record<string, any>
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

function LeadMessageForm({
  leadId,
  telefono,
  onSent,
}: {
  leadId: string
  telefono: string
  onSent: () => void
}) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          to: { phone: telefono },
          message: message.trim(),
          channel: 'whatsapp',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al enviar')
      }
      setMessage('')
      onSent()
    } catch (err: any) {
      setError(err.message || 'Error al enviar')
    } finally {
      setSending(false)
    }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Escribe un mensaje de WhatsApp..."
        className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
        disabled={sending}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" size="sm" disabled={sending || !message.trim()}>
        {sending ? 'Enviando...' : 'Enviar por WhatsApp'}
      </Button>
    </form>
  )
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null)
  const [historyRefresh, setHistoryRefresh] = useState(0)
  
  const fetchLead = useCallback(async () => {
    try {
      const response = await fetch(`/api/leads/${params.id}`)
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
  }, [params.id, router])

  const evaluateLead = async () => {
    try {
      setScoring(true)
      setScoringResult(null) // Limpiar resultado anterior
      
      const response = await fetch('/api/scoring/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: params.id }),
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `Error ${response.status}: Error al evaluar el lead` }
        }
        throw new Error(errorData.error || errorData.message || 'Error al evaluar el lead')
      }
      
      const result = await response.json()
      
      // Validar formato de respuesta
      if (!result || typeof result !== 'object') {
        throw new Error('Respuesta inválida del servidor')
      }
      
      // Validar que tenga los campos esperados
      if (typeof result.score === 'undefined' && typeof result.total_score === 'undefined') {
        console.warn('Scoring result missing score field', result)
      }
      
      // Formatear resultado para compatibilidad
      const formattedResult: ScoringResult = {
        score: result.score ?? result.total_score ?? 0,
        decision: result.decision ?? result.recommendation ?? 'NUEVO',
        motivos: Array.isArray(result.motivos) ? result.motivos : (result.reasons || [])
      }
      
      setScoringResult(formattedResult)
      
      // Refrescar lead para ver el estado actualizado
      await fetchLead()
    } catch (error) {
      console.error('Error evaluating lead:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al evaluar el lead'
      // Mostrar error al usuario (podrías usar un toast aquí)
      alert(`Error: ${errorMessage}`)
    } finally {
      setScoring(false)
    }
  }

  useEffect(() => {
    fetchLead()
  }, [params.id, fetchLead])

  // Función helper para extraer valor de custom field (igual que en el modal)
  const extractCustomFieldValue = (value: any): string => {
    if (value === null || value === undefined) return 'No especificado'
    
    // Si es un objeto Manychat con estructura {id, name, type, description, value}
    if (typeof value === 'object' && value !== null && 'value' in value) {
      return String(value.value || 'No especificado')
    }
    
    // Si es un objeto pero no tiene estructura Manychat, convertir a string
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    
    return String(value)
  }

  // Función helper para obtener iniciales
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Función helper para verificar si un campo tiene valor
  const hasValue = (value: any): boolean => {
    return value !== null && value !== undefined && value !== '' && value !== 'No especificado' && value !== 'No asignada'
  }

  // Función helper para formatear eventos del timeline
  const formatEventDisplay = (event: Event) => {
    const tipoMap: Record<string, { label: string; icon: string; color: string }> = {
      'lead_created': { label: 'Lead creado', icon: '✨', color: 'text-blue-600' },
      'lead_updated': { label: 'Actualización', icon: '📝', color: 'text-gray-600' },
      'whatsapp_in': { label: 'Mensaje recibido', icon: '📥', color: 'text-blue-600' },
      'whatsapp_out': { label: 'Mensaje enviado', icon: '📤', color: 'text-green-600' },
      'scoring_evaluated': { label: 'Evaluación realizada', icon: '📊', color: 'text-purple-600' },
      'manychat_synced': { label: 'Sincronizado', icon: '🤖', color: 'text-indigo-600' },
    }

    const eventInfo = tipoMap[event.tipo] || { 
      label: event.tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      icon: '•', 
      color: 'text-gray-600' 
    }

    let payloadInfo = null
    if (event.payload) {
      try {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload
        
        if (event.tipo === 'lead_updated' && payload.data) {
          const changes = Object.keys(payload.data)
          if (changes.length > 0) {
            payloadInfo = `Cambios: ${changes.join(', ')}`
          }
        } else if (event.tipo === 'whatsapp_in' || event.tipo === 'whatsapp_out') {
          payloadInfo = payload.mensaje || payload.message || null
        } else if (event.tipo === 'scoring_evaluated') {
          payloadInfo = `Puntuación: ${payload.score || 'N/A'}`
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    }

    return { ...eventInfo, payloadInfo }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Lead no encontrado</AlertDescription>
        </Alert>
      </div>
    )
  }

  const getEstadoBadge = (estado: string) => {
    const config = {
      NUEVO: { variant: 'default' as const, icon: Clock, color: 'bg-blue-100 text-blue-800 border-blue-200' },
      EN_REVISION: { variant: 'secondary' as const, icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      PREAPROBADO: { variant: 'default' as const, icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200' },
      RECHAZADO: { variant: 'destructive' as const, icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200' },
      DOC_PENDIENTE: { variant: 'outline' as const, icon: Clock, color: 'bg-orange-100 text-orange-800 border-orange-200' },
      DERIVADO: { variant: 'secondary' as const, icon: CheckCircle, color: 'bg-purple-100 text-purple-800 border-purple-200' },
    }
    
    const { variant, icon: Icon, color } = config[estado as keyof typeof config] || config.NUEVO
    
    return (
      <Badge variant={variant} className={`flex items-center space-x-1 ${color}`}>
        <Icon className="w-3 h-3" />
        <span>{estado}</span>
      </Badge>
    )
  }
  
  // Parsear tags si existen
  let leadTags: string[] = []
  if (lead.tags) {
    try {
      leadTags = typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags
    } catch (e) {
      leadTags = []
    }
  }

  // Parsear customFields si existen
  let customFields: Record<string, any> = {}
  if (lead.customFields) {
    try {
      const parsed = typeof lead.customFields === 'string' 
        ? JSON.parse(lead.customFields) 
        : lead.customFields
      
      // Normalizar custom fields (extraer valores si vienen como objetos Manychat)
      Object.entries(parsed).forEach(([key, value]) => {
        if (value && typeof value === 'object' && value !== null && 'value' in value) {
          customFields[key] = value.value
        } else {
          customFields[key] = value
        }
      })
    } catch (e) {
      customFields = {}
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-7xl mx-auto p-6">
        {/* Header mejorado con Avatar */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} size="icon" className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
                {getInitials(lead.nombre)}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{lead.nombre}</h1>
                {getEstadoBadge(lead.estado)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  {lead.telefono?.startsWith('manychat_') ? (
                    <span className="text-gray-500 italic">
                      Sin teléfono (ID: {lead.manychatId || lead.telefono.replace('manychat_', '')})
                    </span>
                  ) : (
                    <a href={`tel:${lead.telefono}`} className="hover:text-blue-600">
                      {lead.telefono}
                    </a>
                  )}
                </div>
                {lead.manychatId && (
                  <Badge variant="secondary" className="text-xs">
                    <Bot className="w-3 h-3 mr-1" />
                    ID externo
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      
        {/* Tags */}
        {leadTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-gray-400" />
            {leadTags.slice(0, 5).map((tag) => (
              <TagPill key={tag} tag={tag} readonly />
            ))}
            {leadTags.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{leadTags.length - 5} más
              </Badge>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información de contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-600" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hasValue(lead.email) && (
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <Mail className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-sm font-medium break-words">{lead.email}</p>
                      </div>
                    </div>
                  )}

                  {hasValue(lead.dni) && (
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <FileText className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">DNI</p>
                        <p className="text-sm font-medium">{lead.dni}</p>
                      </div>
                    </div>
                  )}

                  {hasValue(lead.cuil) && (
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <FileText className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">CUIL/CUIT</p>
                        <p className="text-sm font-medium">{lead.cuil}</p>
                      </div>
                    </div>
                  )}

                  {hasValue(lead.zona) && (
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Zona</p>
                        <p className="text-sm font-medium">{lead.zona}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información comercial */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Información Comercial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hasValue(lead.producto) && (
                    <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <p className="text-xs text-gray-500 mb-1">Producto</p>
                      <p className="text-sm font-medium">{lead.producto}</p>
                    </div>
                  )}

                  {hasValue(lead.monto) && (
                    <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <p className="text-xs text-gray-500 mb-1">Monto Solicitado</p>
                      <p className="text-sm font-medium text-green-600">{formatCurrency(lead.monto ?? 0)}</p>
                    </div>
                  )}

                  {hasValue(lead.ingresos) && (
                    <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <p className="text-xs text-gray-500 mb-1">Ingresos</p>
                      <p className="text-sm font-medium">{formatCurrency(lead.ingresos ?? 0)}</p>
                    </div>
                  )}

                  {hasValue(lead.origen) && (
                    <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <p className="text-xs text-gray-500 mb-1">Origen</p>
                      <Badge variant="outline">{lead.origen}</Badge>
                    </div>
                  )}

                  {hasValue(lead.agencia) && (
                    <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <p className="text-xs text-gray-500 mb-1">Agencia</p>
                      <p className="text-sm font-medium">{lead.agencia}</p>
                    </div>
                  )}
                </div>

                {hasValue(lead.notas) && (
                  <>
                    <Separator className="my-4" />
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-yellow-900 mb-1">Notas</p>
                          <p className="text-sm text-yellow-800 whitespace-pre-wrap">{lead.notas}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Información laboral - Solo si hay datos */}
            {(hasValue(lead.banco) || hasValue(lead.trabajo_actual)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                    Información Laboral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hasValue(lead.banco) && (
                      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <Building2 className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Banco</p>
                          <p className="text-sm font-medium">{lead.banco}</p>
                        </div>
                      </div>
                    )}

                    {hasValue(lead.trabajo_actual) && (
                      <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <p className="text-xs text-gray-500 mb-1">Trabajo Actual</p>
                        <p className="text-sm font-medium">{lead.trabajo_actual}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Datos de Manychat - Similar al modal del pipeline */}
            {(lead.manychatId || Object.keys(customFields).length > 0 || leadTags.length > 0) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-indigo-600" />
                      Datos de Manychat
                    </CardTitle>
                    {lead.manychatId && (
                      <Button
                        onClick={() => window.open(`https://manychat.com/subscribers/${lead.manychatId}`, '_blank')}
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                      >
                        Ver en Manychat
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {lead.manychatId && (
                    <div>
                      <label className="text-xs text-muted-foreground">ID Manychat</label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-mono">{lead.manychatId}</span>
                      </div>
                    </div>
                  )}

                  {leadTags.length > 0 && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {leadTags.map((tag: string, index: number) => (
                          <TagPill key={index} tag={tag} />
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(customFields).length > 0 && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Custom Fields</label>
                      <div className="space-y-2">
                        {Object.entries(customFields).map(([key, value]) => {
                          const displayValue = extractCustomFieldValue(value)
                          return (
                            <div key={key} className="flex justify-between items-start py-2 border-b last:border-0">
                              <span className="text-xs text-muted-foreground capitalize">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-xs font-medium text-right max-w-[60%] break-words">
                                {displayValue}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline mejorado - Solo eventos relevantes */}
            {lead.events && Array.isArray(lead.events) && lead.events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-600" />
                    Actividad Reciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lead.events
                      .filter((event) => event.createdAt)
                      .slice(0, 10)
                      .map((event) => {
                        try {
                          const eventDate = new Date(event.createdAt)
                          if (isNaN(eventDate.getTime())) return null
                          
                          const { label, icon, color, payloadInfo } = formatEventDisplay(event)
                          
                          return (
                            <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className={`text-xl ${color} shrink-0`}>{icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-sm font-medium ${color}`}>{label}</p>
                                  <p className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDate(event.createdAt)}
                                  </p>
                                </div>
                                {payloadInfo && (
                                  <p className="text-xs text-gray-600 mt-1 truncate">
                                    {payloadInfo}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        } catch (error) {
                          console.error('Error renderizando evento:', event.id, error)
                          return null
                        }
                      })
                      .filter(Boolean)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Panel lateral - Acciones y comunicación */}
          <div className="space-y-6">
            {/* Acciones rápidas */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={evaluateLead} 
                  disabled={scoring}
                  className="w-full"
                  variant="default"
                >
                  {scoring ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Evaluando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Evaluar Lead
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Resultado de evaluación */}
            {scoringResult && (
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="text-green-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Resultado de Evaluación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-700">{scoringResult.score}</div>
                    <div className="text-sm text-green-600 mt-1">Puntuación</div>
                  </div>
                  <Badge 
                    variant={scoringResult.decision === 'PREAPROBADO' ? 'default' : 
                             scoringResult.decision === 'RECHAZADO' ? 'destructive' : 'secondary'}
                    className="w-full justify-center py-2"
                  >
                    {scoringResult.decision}
                  </Badge>
                  {scoringResult.motivos.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Motivos:</h4>
                      <ul className="text-xs space-y-1">
                        {scoringResult.motivos.map((motivo, index) => (
                          <li key={index} className="text-gray-700 flex items-start gap-1">
                            <span className="text-green-600">•</span>
                            <span>{motivo}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Comunicación con Tabs */}
            {lead.telefono && (
              <Card>
                <Tabs defaultValue="send" className="w-full">
                  <CardHeader className="pb-3">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="send" className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span className="hidden sm:inline">Enviar</span>
                      </TabsTrigger>
                      <TabsTrigger value="tags" className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span className="hidden sm:inline">Tags</span>
                      </TabsTrigger>
                      <TabsTrigger value="history" className="flex items-center gap-1">
                        <History className="w-3 h-3" />
                        <span className="hidden sm:inline">Historial</span>
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  
                  <CardContent>
                    <TabsContent value="send" className="mt-0">
                      <LeadMessageForm
                        leadId={lead.id}
                        telefono={lead.telefono}
                        onSent={() => {
                          fetchLead()
                          setHistoryRefresh((r) => r + 1)
                        }}
                      />
                    </TabsContent>
                    
                    <TabsContent value="tags" className="mt-0">
                      <div className="flex flex-wrap gap-2">
                        {leadTags.length === 0 ? (
                          <p className="text-sm text-gray-500">Sin tags</p>
                        ) : (
                          leadTags.map((tag) => (
                            <TagPill key={tag} tag={tag} readonly />
                          ))
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="history" className="mt-0">
                      <WhatsAppHistory
                        leadId={lead.id}
                        telefono={lead.telefono}
                        refreshTrigger={historyRefresh}
                      />
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
