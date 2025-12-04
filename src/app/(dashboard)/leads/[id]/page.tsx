'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  User, Sparkles, AlertCircle, Info
} from 'lucide-react'
import WhatsAppHistory from '@/components/whatsapp/WhatsAppHistory'
import ManychatMessageSender from '@/components/manychat/ManychatMessageSender'
import { ManychatTagManager } from '@/components/manychat/ManychatTagManager'
import { ManychatSyncPanel } from '@/components/manychat/ManychatSyncPanel'
import { ManychatBadge } from '@/components/manychat/ManychatBadge'
import { TagPill } from '@/components/manychat/TagPill'
import { useManychatSync } from '@/hooks/useManychatSync'

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

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null)
  
  // Hook debe estar al principio, antes de cualquier return condicional
  const { isSynced, syncNow, syncStatus } = useManychatSync(params.id as string)

  const fetchLead = async () => {
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
  }

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
  }, [params.id])

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
      customFields = typeof lead.customFields === 'string' 
        ? JSON.parse(lead.customFields) 
        : lead.customFields
    } catch (e) {
      customFields = {}
    }
  }

  // Campos que ya están mapeados en el schema y no necesitan mostrarse en customFields
  const mappedFields = new Set([
    'dni', 'cuil', 'ingresos', 'zona', 'producto', 'monto', 
    'origen', 'estado', 'agencia', 'banco', 'trabajo_actual'
  ])

  // Filtrar solo los campos personalizados que NO están mapeados y tienen valor
  const additionalCustomFields = Object.entries(customFields)
    .filter(([key, value]) => 
      !mappedFields.has(key) && 
      value !== null && 
      value !== undefined && 
      value !== '' &&
      (typeof value !== 'object' || (typeof value === 'object' && value.value))
    )
    .reduce((acc, [key, value]) => {
      // Extraer valor si es objeto Manychat
      acc[key] = typeof value === 'object' && value !== null && 'value' in value 
        ? value.value 
        : value
      return acc
    }, {} as Record<string, any>)

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
                  <span>{lead.telefono}</span>
                </div>
                {lead.manychatId && (
                  <ManychatBadge variant="success" size="sm">
                    <Bot className="w-3 h-3 mr-1" />
                    Sincronizado
                  </ManychatBadge>
                )}
              </div>
            </div>
          </div>
          
          {!lead.manychatId && isSynced === false && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={syncNow}
                  disabled={syncStatus === 'syncing'}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  Sincronizar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sincronizar este contacto con el chatbot</p>
              </TooltipContent>
            </Tooltip>
          )}
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

            {/* Campos personalizados de ManyChat - Solo si hay datos relevantes */}
            {Object.keys(additionalCustomFields).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Información Adicional
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(additionalCustomFields).map(([key, value]) => (
                      <div key={key} className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <p className="text-xs text-gray-500 mb-1 capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm font-medium">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
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

            {/* Panel de sincronización - Simplificado */}
            <ManychatSyncPanel
              leadId={lead.id}
              onSyncComplete={() => {
                fetchLead()
              }}
            />

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
                      <ManychatMessageSender
                        leadId={lead.id}
                        telefono={lead.telefono}
                        manychatId={lead.manychatId}
                        onMessageSent={() => {
                          fetchLead()
                        }}
                      />
                    </TabsContent>
                    
                    <TabsContent value="tags" className="mt-0">
                      <ManychatTagManager
                        leadId={lead.id}
                        initialTags={leadTags}
                        onTagsChange={() => {
                          fetchLead()
                        }}
                      />
                    </TabsContent>
                    
                    <TabsContent value="history" className="mt-0">
                      <WhatsAppHistory
                        leadId={lead.id}
                        telefono={lead.telefono}
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
