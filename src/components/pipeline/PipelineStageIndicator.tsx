'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

  const stage = currentStage || pipeline?.current_stage || 'LEAD_NUEVO'
  const canEdit = checkPermission('leads:write')

  // Obtener icono para la etapa
  const getStageIcon = (stageType: PipelineStage) => {
    switch (stageType) {
      case 'LEAD_NUEVO':
        return <Clock className="h-4 w-4" />
      case 'CONTACTO_INICIAL':
      case 'CALIFICACION':
      case 'PRESENTACION':
        return <TrendingUp className="h-4 w-4" />
      case 'PROPUESTA':
      case 'NEGOCIACION':
        return <ArrowRight className="h-4 w-4" />
      case 'CIERRE_GANADO':
        return <CheckCircle className="h-4 w-4" />
      case 'CIERRE_PERDIDO':
        return <XCircle className="h-4 w-4" />
      case 'SEGUIMIENTO':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  // Manejar transición a nueva etapa
  const handleStageTransition = async (newStage: PipelineStage, notes?: string, lossReason?: LossReason) => {
    try {
      await moveToStage(leadId, newStage, notes, lossReason)
    } catch (error) {
      console.error('Error transitioning stage:', error)
    }
  }

  // Manejar click en transición que requiere motivo de pérdida
  const handleLossTransition = (newStage: PipelineStage) => {
    if (newStage === 'CIERRE_PERDIDO') {
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
            En esta etapa desde {new Date(pipeline.stage_entered_at).toLocaleDateString('es-AR')}
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
                  Cierre esperado: {new Date(pipeline.expected_close_date).toLocaleDateString('es-AR')}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}

      {/* Modal para motivo de pérdida - implementar después */}
      {showLossReasonDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Motivo de pérdida</span>
              </CardTitle>
              <CardDescription>
                Selecciona el motivo por el cual se perdió este lead
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      handleStageTransition(
                        selectedStage!,
                        `Motivo: ${reason.label}`,
                        reason.value as LossReason
                      )
                      setShowLossReasonDialog(false)
                      setSelectedStage(null)
                    }}
                    className="justify-start"
                  >
                    {reason.label}
                  </Button>
                ))}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowLossReasonDialog(false)
                    setSelectedStage(null)
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
