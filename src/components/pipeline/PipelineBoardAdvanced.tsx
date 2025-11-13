'use client'

import { useState, useCallback } from 'react'
import { DndContext, DragOverlay, useDroppable, useDraggable } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MoreHorizontal, 
  Plus, 
  Filter, 
  Search,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { usePipelineDragDrop } from '@/hooks/usePipelineDragDrop'
import { PipelineStage, PipelineLead, DragDropResult, StageTransition } from '@/types/pipeline'
import { LoadingSpinner } from '@/components/ui/loading-states'
import { toast } from 'sonner'

interface PipelineBoardAdvancedProps {
  stages: PipelineStage[]
  leads: PipelineLead[]
  onLeadMove: (result: DragDropResult) => Promise<boolean>
  onLeadClick?: (lead: PipelineLead) => void
  onStageClick?: (stage: PipelineStage) => void
  onAddLead?: (stageId: string) => void
  isLoading?: boolean
  className?: string
}

export function PipelineBoardAdvanced({
  stages,
  leads,
  onLeadMove,
  onLeadClick,
  onStageClick,
  onAddLead,
  isLoading = false,
  className = ''
}: PipelineBoardAdvancedProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  // Hook para drag & drop
  const {
    activeId,
    draggedLead,
    isValidating,
    leadsByStage,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    getActiveLead,
    canDropInStage,
    getStageStats,
    collisionDetection
  } = usePipelineDragDrop({
    stages,
    leads,
    onLeadMove,
    onStageTransition: (transition: StageTransition) => {
      console.log('Stage transition:', transition)
      // Aquí se podría enviar a analytics o logging
    }
  })

  // Filtrar leads según búsqueda
  const filteredLeadsByStage = useCallback(() => {
    if (!searchTerm && selectedFilters.length === 0) {
      return leadsByStage
    }

    const filtered: Record<string, PipelineLead[]> = {}
    
    Object.entries(leadsByStage).forEach(([stageId, stageLeads]) => {
      filtered[stageId] = stageLeads.filter(lead => {
        // Filtro de búsqueda
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          const matchesSearch = 
            lead.nombre.toLowerCase().includes(searchLower) ||
            lead.telefono.includes(searchTerm) ||
            lead.email?.toLowerCase().includes(searchLower) ||
            lead.origen.toLowerCase().includes(searchLower)
          
          if (!matchesSearch) return false
        }

        // Filtros adicionales
        if (selectedFilters.length > 0) {
          if (selectedFilters.includes('high-priority') && 
              !['high', 'urgent'].includes(lead.priority)) {
            return false
          }
          
          if (selectedFilters.includes('has-tasks') && 
              (!lead.tasks || lead.tasks.length === 0)) {
            return false
          }
          
          if (selectedFilters.includes('high-value') && 
              (lead.value || 0) < 10000) {
            return false
          }
        }

        return true
      })
    })

    return filtered
  }, [leadsByStage, searchTerm, selectedFilters])

  // Obtener color de prioridad
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  // Formatear valor monetario
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(value)
  }

  // Formatear fecha relativa
  const formatRelativeDate = (date: Date | string) => {
    if (!date) return 'Sin fecha'

    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return 'Fecha inválida'

    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Hoy'
    if (diffInDays === 1) return 'Ayer'
    if (diffInDays < 7) return `Hace ${diffInDays} días`
    if (diffInDays < 30) return `Hace ${Math.floor(diffInDays / 7)} semanas`
    return `Hace ${Math.floor(diffInDays / 30)} meses`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const filteredLeads = filteredLeadsByStage()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pipeline de Ventas</h2>
          <p className="text-muted-foreground">
            Gestiona tus leads a través del proceso de ventas
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md w-64"
            />
          </div>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Pipeline Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4">
          {stages
            .sort((a, b) => a.order - b.order)
            .map((stage) => {
              const stageLeads = filteredLeads[stage.id] || []
              const stats = getStageStats(stage.id)
              const canDrop = canDropInStage(stage.id, activeId || undefined)

              return (
                <PipelineStageColumn
                  key={stage.id}
                  stage={stage}
                  leads={stageLeads}
                  stats={stats}
                  canDrop={canDrop}
                  isDragOver={activeId !== null}
                  onLeadClick={onLeadClick}
                  onStageClick={onStageClick}
                  onAddLead={onAddLead}
                  formatCurrency={formatCurrency}
                  formatRelativeDate={formatRelativeDate}
                  getPriorityColor={getPriorityColor}
                />
              )
            })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && draggedLead ? (
            <LeadCardDragging
              lead={draggedLead}
              formatCurrency={formatCurrency}
              formatRelativeDate={formatRelativeDate}
              getPriorityColor={getPriorityColor}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Loading overlay durante validación */}
      {isValidating && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <LoadingSpinner size="sm" />
              <span>Validando transición...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente para la columna de etapa
interface PipelineStageColumnProps {
  stage: PipelineStage
  leads: PipelineLead[]
  stats: any
  canDrop: boolean
  isDragOver: boolean
  onLeadClick?: (lead: PipelineLead) => void
  onStageClick?: (stage: PipelineStage) => void
  onAddLead?: (stageId: string) => void
  formatCurrency: (value: number) => string
  formatRelativeDate: (date: Date | string) => string
  getPriorityColor: (priority: string) => string
}

function PipelineStageColumn({
  stage,
  leads,
  stats,
  canDrop,
  isDragOver,
  onLeadClick,
  onStageClick,
  onAddLead,
  formatCurrency,
  formatRelativeDate,
  getPriorityColor
}: PipelineStageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  return (
    <div className="flex-shrink-0 w-80" ref={setNodeRef}>
      <Card className={`h-full ${!canDrop && isDragOver ? 'opacity-50' : ''} ${isOver ? 'ring-2 ring-blue-500' : ''}`}>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onStageClick?.(stage)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <CardTitle className="text-sm font-medium">
                {stage.name}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {stats.count}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1">
              {onAddLead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddLead(stage.id)
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Estadísticas de la etapa */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(stats.totalValue)}
            </div>
            {stats.highPriorityCount > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-orange-500" />
                {stats.highPriorityCount}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick?.(lead)}
              formatCurrency={formatCurrency}
              formatRelativeDate={formatRelativeDate}
              getPriorityColor={getPriorityColor}
            />
          ))}
          
          {leads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay leads en esta etapa</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Componente para la tarjeta de lead
interface LeadCardProps {
  lead: PipelineLead
  onClick?: () => void
  formatCurrency: (value: number) => string
  formatRelativeDate: (date: Date | string) => string
  getPriorityColor: (priority: string) => string
}

function LeadCard({
  lead,
  onClick,
  formatCurrency,
  formatRelativeDate,
  getPriorityColor
}: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: lead.id,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{lead.nombre}</h4>
          <p className="text-xs text-muted-foreground truncate">{lead.telefono}</p>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <div
            className={`w-2 h-2 rounded-full ${getPriorityColor(lead.priority)}`}
            title={`Prioridad: ${lead.priority}`}
          />
          {lead.tasks && lead.tasks.filter(t => t.status === 'pending').length > 0 && (
            <Clock className="h-3 w-3 text-orange-500" />
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Origen:</span>
          <Badge variant="outline" className="text-xs">
            {lead.origen}
          </Badge>
        </div>

        {lead.value && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Valor:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(lead.value)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">En etapa:</span>
          <span>{formatRelativeDate(lead.stageEntryDate)}</span>
        </div>

        {lead.score && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Score:</span>
            <div className="flex items-center gap-1">
              <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(lead.score, 100)}%` }}
                />
              </div>
              <span className="text-xs">{lead.score}</span>
            </div>
          </div>
        )}
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lead.tags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {lead.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{lead.tags.length - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

// Componente para la tarjeta durante el drag
interface LeadCardDraggingProps {
  lead: PipelineLead
  formatCurrency: (value: number) => string
  formatRelativeDate: (date: Date | string) => string
  getPriorityColor: (priority: string) => string
}

function LeadCardDragging({
  lead,
  formatCurrency,
  formatRelativeDate,
  getPriorityColor
}: LeadCardDraggingProps) {
  return (
    <div className="p-3 bg-white border-2 border-blue-500 rounded-lg shadow-lg w-80 opacity-90 transform rotate-2">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{lead.nombre}</h4>
          <p className="text-xs text-muted-foreground truncate">{lead.telefono}</p>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <div
            className={`w-2 h-2 rounded-full ${getPriorityColor(lead.priority)}`}
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Origen:</span>
          <Badge variant="outline" className="text-xs">
            {lead.origen}
          </Badge>
        </div>

        {lead.value && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Valor:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(lead.value)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
