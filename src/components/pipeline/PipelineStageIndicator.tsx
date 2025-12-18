'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu'
import { 
  ChevronDown, 
  ArrowRight, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle 
} from 'lucide-react'
import { usePipeline } from '@/hooks/usePipeline'
import { PipelineStage, LossReason } from '@/server/services/pipeline-service'
import { usePermissions } from '@/components/auth/PermissionGuard'
import { REJECTION_MESSAGES, REJECTION_MESSAGE_OPTIONS } from '@/lib/rejection-messages'
import { useEffect } from 'react'

interface PipelineStageIndicatorProps {
  leadId: string
  currentStage?: PipelineStage
  compact?: boolean
  showTransitions?: boolean
}

export function PipelineStageIndicator({ 
  leadId, 
  currentStage, 
  compact = false,
  showTransitions = true 
}: PipelineStageIndicatorProps) {
  const { checkPermission } = usePermissions()
  const {
    pipeline,
    allowedTransitions,
    transitioning,
    moveToStage,
    getStageDisplayName,
    getStageColor,
    isTransitionAllowed
  } = usePipeline(leadId)

  const [showLossReasonDialog, setShowLossReasonDialog] = useState(false)
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)
  const [leadOrigin, setLeadOrigin] = useState<string | null>(null)
  const [selectedRejectionMessage, setSelectedRejectionMessage] = useState<string | null>(null)
  const [loadingLead, setLoadingLead] = useState(false)

  // Obtener información del lead para determinar si es Instagram
  useEffect(() => {
    const fetchLeadInfo = async () => {
      try {
        setLoadingLead(true)
        const response = await fetch(`/api/leads/${leadId}`)
        if (response.ok) {
          const leadData = await response.json()
          setLeadOrigin(leadData.origen || null)
        }
      } catch (error) {
        console.error('Error fetching lead info:', error)
      } finally {
        setLoadingLead(false)
      }
    }

    if (leadId) {
      fetchLeadInfo()
    }
  }, [leadId])

  const stage = currentStage || pipeline?.current_stage || 'CLIENTE_NUEVO'
  const canEdit = checkPermission('leads:write')

  // Obtener icono para la etapa
  const getStageIcon = (stageType: PipelineStage) => {
    switch (stageType) {
      case 'CLIENTE_NUEVO':
      case 'LEAD_NUEVO': // Legacy
        return <Clock className="h-4 w-4" />
      case 'CONSULTANDO_CREDITO':
      case 'SOLICITANDO_DOCS':
      case 'LISTO_ANALISIS':
      case 'CONTACTO_INICIAL': // Legacy
      case 'CALIFICACION': // Legacy
      case 'PRESENTACION': // Legacy
        return <TrendingUp className="h-4 w-4" />
      case 'PREAPROBADO':
      case 'APROBADO':
      case 'PROPUESTA': // Legacy
      case 'NEGOCIACION': // Legacy
        return <ArrowRight className="h-4 w-4" />
      case 'EN_SEGUIMIENTO':
      case 'SEGUIMIENTO': // Legacy
        return <CheckCircle className="h-4 w-4" />
      case 'CERRADO_GANADO':
      case 'CIERRE_GANADO': // Legacy
        return <CheckCircle className="h-4 w-4" />
      case 'ENCUESTA':
        return <TrendingUp className="h-4 w-4" />
      case 'RECHAZADO':
      case 'CIERRE_PERDIDO': // Legacy
        return <XCircle className="h-4 w-4" />
      case 'SOLICITAR_REFERIDO':
        return <ArrowRight className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  // Manejar transición a nueva etapa
  const handleStageTransition = async (newStage: PipelineStage, notes?: string, lossReason?: LossReason, rejectionMessage?: string) => {
    try {
      await moveToStage(leadId, newStage, notes, lossReason, rejectionMessage)
      // Resetear estado después de la transición
      setSelectedRejectionMessage(null)
    } catch (error) {
      console.error('Error transitioning stage:', error)
    }
  }

  // Manejar click en transición que requiere motivo de pérdida
  const handleLossTransition = (newStage: PipelineStage) => {
    if (newStage === 'RECHAZADO' || newStage === 'CIERRE_PERDIDO') {
      setSelectedStage(newStage)
      setShowLossReasonDialog(true)
    } else {
      handleStageTransition(newStage)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <Badge 
          style={{ backgroundColor: getStageColor(stage), color: 'white' }}
          className="text-xs"
        >
          {getStageIcon(stage)}
          <span className="ml-1">{getStageDisplayName(stage)}</span>
        </Badge>
        
        {canEdit && showTransitions && allowedTransitions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                disabled={transitioning}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {allowedTransitions.map((transition) => (
                <DropdownMenuItem
                  key={transition.to_stage}
                  onClick={() => handleLossTransition(transition.to_stage)}
                  className="flex items-center space-x-2"
                >
                  {getStageIcon(transition.to_stage)}
                  <span>{transition.transition_name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getStageColor(stage) }}
            />
            <CardTitle className="text-lg">{getStageDisplayName(stage)}</CardTitle>
          </div>
          
          {pipeline && (
            <Badge variant="outline" className="text-xs">
              {pipeline.probability_percent}% probabilidad
            </Badge>
          )}
        </div>
        
        {pipeline?.stage_entered_at && (
          <CardDescription>
            En esta etapa desde {pipeline.stage_entered_at ? formatDate(pipeline.stage_entered_at).split(' ')[0] : 'Fecha no disponible'}
          </CardDescription>
        )}
      </CardHeader>

      {canEdit && showTransitions && allowedTransitions.length > 0 && (
        <CardContent>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Acciones disponibles:</h4>
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.map((transition) => (
                <Button
                  key={transition.to_stage}
                  variant="outline"
                  size="sm"
                  onClick={() => handleLossTransition(transition.to_stage)}
                  disabled={transitioning}
                  className="flex items-center space-x-1"
                >
                  {getStageIcon(transition.to_stage)}
                  <span>{transition.transition_name}</span>
                </Button>
              ))}
            </div>
          </div>

          {pipeline?.expected_close_date && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  Cierre esperado: {pipeline.expected_close_date ? formatDate(pipeline.expected_close_date).split(' ')[0] : 'Fecha no disponible'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}

      {/* Modal para motivo de pérdida y selección de mensaje de rechazo para Instagram */}
      {showLossReasonDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>
                  {leadOrigin === 'instagram' && (selectedStage === 'RECHAZADO' || selectedStage === 'CIERRE_PERDIDO')
                    ? 'Rechazar Lead - Seleccionar Mensaje'
                    : 'Motivo de pérdida'}
                </span>
              </CardTitle>
              <CardDescription>
                {leadOrigin === 'instagram' && (selectedStage === 'RECHAZADO' || selectedStage === 'CIERRE_PERDIDO')
                  ? 'Selecciona el mensaje que se enviará al cliente por Instagram'
                  : 'Selecciona el motivo por el cual se perdió este lead'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mostrar selector de mensajes de rechazo si es Instagram */}
              {leadOrigin === 'instagram' && (selectedStage === 'RECHAZADO' || selectedStage === 'CIERRE_PERDIDO') && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700">
                    Mensaje de rechazo para Instagram:
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {REJECTION_MESSAGE_OPTIONS.map((messageOption) => (
                      <Button
                        key={messageOption.id}
                        variant={selectedRejectionMessage === messageOption.id ? "default" : "outline"}
                        onClick={() => setSelectedRejectionMessage(messageOption.id)}
                        className="justify-start text-left h-auto py-3 px-4"
                      >
                        <div className="flex flex-col items-start w-full">
                          <div className="font-medium mb-1">{messageOption.label}</div>
                          <div className="text-xs text-gray-600 line-clamp-2">
                            {messageOption.message.substring(0, 100)}...
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                  {selectedRejectionMessage && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <div className="text-xs font-medium text-gray-700 mb-1">Mensaje completo:</div>
                      <div className="text-sm text-gray-600 whitespace-pre-wrap">
                        {REJECTION_MESSAGES[selectedRejectionMessage as keyof typeof REJECTION_MESSAGES]?.message}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mostrar motivos de pérdida si no es Instagram o si ya se seleccionó mensaje */}
              {(!(leadOrigin === 'instagram' && (selectedStage === 'RECHAZADO' || selectedStage === 'CIERRE_PERDIDO')) || selectedRejectionMessage) && (
                <div className="space-y-3">
                  {leadOrigin === 'instagram' && selectedRejectionMessage && (
                    <div className="text-sm font-medium text-gray-700 border-t pt-3">
                      Motivo de pérdida (opcional):
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: 'PRECIO', label: 'Precio muy alto' },
                      { value: 'COMPETENCIA', label: 'Eligió competencia' },
                      { value: 'PRESUPUESTO', label: 'Sin presupuesto' },
                      { value: 'TIMING', label: 'Mal momento' },
                      { value: 'NO_INTERES', label: 'Perdió interés' },
                      { value: 'NO_CONTACTO', label: 'No se pudo contactar' },
                      { value: 'OTRO', label: 'Otro motivo' }
                    ].map((reason) => (
                      <Button
                        key={reason.value}
                        variant="outline"
                        onClick={() => {
                          const rejectionMsg = leadOrigin === 'instagram' && selectedRejectionMessage
                            ? REJECTION_MESSAGES[selectedRejectionMessage as keyof typeof REJECTION_MESSAGES]?.message
                            : undefined
                          
                          handleStageTransition(
                            selectedStage!,
                            `Motivo: ${reason.label}`,
                            reason.value as LossReason,
                            rejectionMsg
                          )
                          setShowLossReasonDialog(false)
                          setSelectedStage(null)
                          setSelectedRejectionMessage(null)
                        }}
                        className="justify-start"
                      >
                        {reason.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón para rechazar directamente con mensaje (solo Instagram) */}
              {leadOrigin === 'instagram' && selectedRejectionMessage && (selectedStage === 'RECHAZADO' || selectedStage === 'CIERRE_PERDIDO') && (
                <div className="border-t pt-4">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const rejectionMsg = REJECTION_MESSAGES[selectedRejectionMessage as keyof typeof REJECTION_MESSAGES]?.message
                      handleStageTransition(
                        selectedStage!,
                        undefined,
                        undefined,
                        rejectionMsg
                      )
                      setShowLossReasonDialog(false)
                      setSelectedStage(null)
                      setSelectedRejectionMessage(null)
                    }}
                    className="w-full"
                  >
                    Rechazar y Enviar Mensaje
                  </Button>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowLossReasonDialog(false)
                    setSelectedStage(null)
                    setSelectedRejectionMessage(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  )
}
