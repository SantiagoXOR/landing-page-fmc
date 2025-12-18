'use client'

import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react'
import Link from 'next/link'
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
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Loader2,
  Tag,
  X,
  Copy
} from 'lucide-react'
import { usePipelineDragDrop } from '@/hooks/usePipelineDragDrop'
import { PipelineStage, PipelineLead, DragDropResult, StageTransition } from '@/types/pipeline'
import { LoadingSpinner } from '@/components/ui/loading-states'
import { toast } from 'sonner'
import { PipelineFiltersDrawer, PipelineFilters } from '@/components/pipeline/PipelineFiltersDrawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { useLongPress } from '@/hooks/useLongPress'

interface PipelineBoardAdvancedProps {
  stages: PipelineStage[]
  leads: PipelineLead[]
  onLeadMove: (result: DragDropResult) => Promise<boolean>
  onLeadClick?: (lead: PipelineLead) => void
  onStageClick?: (stage: PipelineStage) => void
  onAddLead?: (stageId: string) => void
  onLeadMoved?: (leadId: string, newStageId: string) => void
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
  onLeadMoved,
  isLoading = false,
  className = ''
}: PipelineBoardAdvancedProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [filters, setFilters] = useState<PipelineFilters>({})
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const isDraggingScrollRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartScrollLeftRef = useRef(0)

  // Debounce de búsqueda
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setFilters(prev => ({ ...prev, search: searchTerm || undefined }))
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm])

  // Agregar listeners globales para el drag de scroll del contenedor principal
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingScrollRef.current || !scrollContainerRef.current) return
      
      e.preventDefault()
      const deltaX = dragStartXRef.current - e.clientX
      scrollContainerRef.current.scrollLeft = dragStartScrollLeftRef.current + deltaX
    }

    const handleGlobalMouseUp = () => {
      if (isDraggingScrollRef.current) {
        isDraggingScrollRef.current = false
      }
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [])

  // Log para debugging
  console.log('PipelineBoardAdvanced render:', {
    stagesCount: stages.length,
    leadsCount: leads.length,
    stageIds: stages.map(s => s.id),
    leadStageIds: leads.map(l => l.stageId)
  })

  // Función para mover lead usando el endpoint correcto
  const handleLeadMoveToStage = async (leadId: string, toStageId: string) => {
    try {
      const lead = leads.find(l => l.id === leadId)
      if (!lead) {
        throw new Error('Lead no encontrado')
      }

      const fromStageId = lead.stageId || ''
      
      const response = await fetch(`/api/pipeline/leads/${leadId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromStageId,
          toStageId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al mover el lead')
      }

      // Recargar los datos del pipeline después de mover el lead
      // El callback onLeadMove es para drag & drop, no para el dropdown
    } catch (error: any) {
      throw error
    }
  }

  // Hook para drag & drop
  const {
    activeId,
    draggedLead,
    isValidating,
    isSyncing,
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
  
  // Log leads agrupados por etapa
  console.log('Leads by stage:', leadsByStage)

  // Filtrar leads según búsqueda y filtros avanzados
  const filteredLeadsByStage = useCallback(() => {
    const leadsByStageData = leadsByStage // leadsByStage ya es un objeto, no una función
    
    const hasFilters = searchTerm || 
      (filters.tags && filters.tags.length > 0) ||
      (filters.stages && filters.stages.length > 0) ||
      (filters.priority && filters.priority.length > 0) ||
      filters.origen ||
      filters.timeInStage ||
      filters.score ||
      filters.value

    if (!hasFilters && selectedFilters.length === 0) {
      return leadsByStageData
    }

    const filtered: Record<string, PipelineLead[]> = {}
    
    Object.entries(leadsByStageData).forEach(([stageId, stageLeads]) => {
      filtered[stageId] = stageLeads.filter(lead => {
        // Filtro de búsqueda (usar debounced)
        const searchValue = filters.search || debouncedSearchTerm
        if (searchValue) {
          const searchLower = searchValue.toLowerCase()
          const matchesSearch = 
            lead.nombre.toLowerCase().includes(searchLower) ||
            lead.telefono.includes(searchValue) ||
            lead.email?.toLowerCase().includes(searchLower) ||
            lead.origen.toLowerCase().includes(searchLower)
          
          if (!matchesSearch) return false
        }

        // Filtro por tags
        if (filters.tags && filters.tags.length > 0) {
          const leadTags = lead.tags || []
          const hasMatchingTag = filters.tags.some(tagId => 
            leadTags.some(tag => tag === tagId || tag.includes(tagId))
          )
          if (!hasMatchingTag) return false
        }

        // Filtro por etapas
        if (filters.stages && filters.stages.length > 0) {
          if (!filters.stages.includes(lead.stageId)) return false
        }

        // Filtro por prioridad
        if (filters.priority && filters.priority.length > 0) {
          if (!filters.priority.includes(lead.priority)) return false
        }

        // Filtro por origen
        if (filters.origen && filters.origen.length > 0) {
          if (!filters.origen.includes(lead.origen)) return false
        }

        // Filtro por tiempo en etapa
        if (filters.timeInStage) {
          const daysInStage = lead.timeInStage || 0
          if (filters.timeInStage.min !== undefined && daysInStage < filters.timeInStage.min) {
            return false
          }
          if (filters.timeInStage.max !== undefined && daysInStage > filters.timeInStage.max) {
            return false
          }
        }

        // Filtro por score
        if (filters.score && lead.score !== undefined) {
          if (filters.score.min !== undefined && lead.score < filters.score.min) {
            return false
          }
          if (filters.score.max !== undefined && lead.score > filters.score.max) {
            return false
          }
        }

        // Filtro por valor
        if (filters.value && lead.value !== undefined) {
          if (filters.value.min !== undefined && lead.value < filters.value.min) {
            return false
          }
          if (filters.value.max !== undefined && lead.value > filters.value.max) {
            return false
          }
        }

        // Filtros adicionales legacy
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
  }, [leadsByStage, debouncedSearchTerm, selectedFilters, filters])

  // Obtener color de prioridad (memoizado)
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }, [])

  // Función para obtener colores de tags según su tipo (memoizado)
  const getTagColor = useCallback((tag: string): { bg: string; text: string; border: string } => {
    const tagLower = tag.toLowerCase().trim()
    
    // Tags relacionados con consultas
    if (tagLower.includes('consultando') || tagLower.includes('consulta')) {
      return { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' } // Azul claro
    }
    
    // Tags relacionados con solicitudes y procesos
    if (tagLower.includes('solicitud') || tagLower.includes('proceso') || tagLower.includes('en-proceso')) {
      return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' } // Amarillo claro
    }
    
    // Tags relacionados con documentación
    if (tagLower.includes('document') || tagLower.includes('docs')) {
      return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' } // Verde claro
    }
    
    // Tags relacionados con análisis
    if (tagLower.includes('analisis') || tagLower.includes('listo')) {
      return { bg: '#E9D5FF', text: '#6B21A8', border: '#C084FC' } // Morado claro
    }
    
    // Tags relacionados con aprobación
    if (tagLower.includes('aprobado') || tagLower.includes('preaprobado')) {
      return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' } // Verde más oscuro
    }
    
    // Tags relacionados con cierre ganado
    if (tagLower.includes('ganado') || tagLower.includes('concretada') || tagLower.includes('cerrado')) {
      return { bg: '#D1FAE5', text: '#065F46', border: '#34D399' } // Verde éxito
    }
    
    // Tags relacionados con rechazo
    if (tagLower.includes('rechazado') || tagLower.includes('perdido')) {
      return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' } // Rojo claro
    }
    
    // Tags relacionados con nuevo lead
    if (tagLower.includes('nuevo') || tagLower.includes('nuevo-lead')) {
      return { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' } // Índigo claro
    }
    
    // Tags relacionados con contacto
    if (tagLower.includes('contactado') || tagLower.includes('contacto')) {
      return { bg: '#FCE7F3', text: '#9F1239', border: '#F9A8D4' } // Rosa claro
    }
    
    // Default: gris neutro
    return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' }
  }, [])

  // Formatear valor monetario (memoizado)
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(value)
  }, [])

  // Formatear fecha relativa (memoizado)
  const formatRelativeDate = useCallback((date: Date | string) => {
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
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const filteredLeads = filteredLeadsByStage()
  
  // Verificar si hay leads en total
  const totalLeads = Object.values(filteredLeads).reduce((sum, stageLeads) => sum + stageLeads.length, 0)
  const hasAnyLeads = totalLeads > 0

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pipeline de Ventas</h2>
          <p className="text-muted-foreground">
            Gestiona tus contactos a través del proceso de ventas
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar contactos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md w-64"
            />
          </div>
          
          <PipelineFiltersDrawer
            filters={filters}
            onFiltersChange={setFilters}
            availableStages={stages.map(s => ({ id: s.id, name: s.name }))}
          />
        </div>
      </div>

      {/* Mensaje cuando no hay leads - Mejorado */}
      {!hasAnyLeads && stages.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardContent className="p-12">
            <div className="text-center max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-100 mb-4">
                  <Users className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Tu pipeline está vacío
              </h3>
              <p className="text-base text-gray-700 mb-2">
                El pipeline de ventas te ayuda a gestionar tus contactos a través de todo el proceso de ventas.
              </p>
              <p className="text-sm text-gray-600 mb-8">
                Arrastra y suelta contactos entre etapas para organizarlos visualmente y hacer seguimiento de su progreso.
              </p>
              
              <div className="bg-white rounded-lg p-6 mb-8 border border-gray-200 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                  ¿Cómo funciona?
                </h4>
                <ul className="text-left text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">1.</span>
                    <span>Agrega contactos desde la página de <strong>Leads</strong> o crea uno nuevo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">2.</span>
                    <span>Arrastra los contactos entre las diferentes etapas del proceso</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">3.</span>
                    <span>Visualiza el progreso y métricas en tiempo real</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 justify-center">
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <a href="/leads">
                    <Users className="h-4 w-4 mr-2" />
                    Ver Todos los Leads
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="/leads/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Nuevo Contacto
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="relative pipeline-scroll-top">
          {/* Contenedor con scrollbar arriba */}
          <div 
            ref={scrollContainerRef} 
            className="overflow-x-auto pb-4 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={(e) => {
              // Solo activar si es click izquierdo y no es en una tarjeta o columna
              if (e.button !== 0) return
              
              const target = e.target as HTMLElement
              // Verificar si el click fue en una tarjeta, columna, botón o enlace
              const clickedCard = target.closest('[data-lead-card]')
              const clickedColumn = target.closest('[data-pipeline-column]')
              const clickedButton = target.closest('button')
              const clickedLink = target.closest('a')
              
              // Si se hizo click en una tarjeta, columna, botón o enlace, no hacer nada
              if (clickedCard || clickedColumn || clickedButton || clickedLink) {
                return
              }
              
              // Es un espacio en blanco del contenedor, activar drag de scroll
              e.preventDefault()
              isDraggingScrollRef.current = true
              dragStartXRef.current = e.clientX
              if (scrollContainerRef.current) {
                dragStartScrollLeftRef.current = scrollContainerRef.current.scrollLeft
              }
            }}
            onMouseMove={(e) => {
              if (!isDraggingScrollRef.current || !scrollContainerRef.current) return
              
              e.preventDefault()
              const deltaX = dragStartXRef.current - e.clientX
              scrollContainerRef.current.scrollLeft = dragStartScrollLeftRef.current + deltaX
            }}
            onMouseUp={() => {
              if (isDraggingScrollRef.current) {
                isDraggingScrollRef.current = false
              }
            }}
            onMouseLeave={() => {
              if (isDraggingScrollRef.current) {
                isDraggingScrollRef.current = false
              }
            }}
          >
            <div className="flex gap-6">
              {stages
                .sort((a, b) => a.order - b.order)
                .map((stage) => {
                  const stageLeads = filteredLeads[stage.id] || []
                  const stats = getStageStats(stage.id)
                  const canDrop = canDropInStage(stage.id, activeId || undefined)

                  return (
                    <div key={stage.id}>
                      <PipelineStageColumn
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
                        getTagColor={getTagColor}
                        stages={stages}
                        onLeadMove={handleLeadMoveToStage}
                        onLeadMoved={onLeadMoved}
                        scrollContainerRef={scrollContainerRef}
                      />
                    </div>
                  )
                })}
            </div>
          </div>
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
  getTagColor: (tag: string) => { bg: string; text: string; border: string }
  stages: PipelineStage[]
  onLeadMove?: (leadId: string, toStageId: string) => Promise<void>
  onLeadMoved?: (leadId: string, newStageId: string) => void
  scrollContainerRef: React.RefObject<HTMLDivElement>
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
  getPriorityColor,
  getTagColor,
  stages,
  onLeadMove,
  onLeadMoved,
  scrollContainerRef
}: PipelineStageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })
  const columnRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const isDraggingScrollRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartScrollLeftRef = useRef(0)

  // Función para hacer scroll a esta columna
  const scrollToColumn = useCallback(() => {
    if (!scrollContainerRef.current || !columnRef.current) return
    
    const container = scrollContainerRef.current
    const column = columnRef.current
    
    // Obtener posición de la columna relativa al contenedor
    const containerRect = container.getBoundingClientRect()
    const columnRect = column.getBoundingClientRect()
    
    // Calcular la posición de scroll necesaria para centrar la columna
    const scrollLeft = container.scrollLeft
    const columnLeft = columnRect.left - containerRect.left + scrollLeft
    const columnWidth = columnRect.width
    const containerWidth = containerRect.width
    
    // Calcular posición para centrar la columna en el viewport
    const targetScroll = columnLeft - (containerWidth / 2) + (columnWidth / 2)
    
    // Hacer scroll suave
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    })
  }, [])

  // Handler para detectar clicks en espacios en blanco
  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Si estamos haciendo drag para scroll, no hacer click
    if (isDraggingScrollRef.current) {
      return
    }
    
    // Si el click fue directamente en el CardContent (no en una tarjeta), hacer scroll
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.text-center')) {
      scrollToColumn()
      return
    }
    
    // Verificar si el click fue en un espacio en blanco (no en una tarjeta)
    const target = e.target as HTMLElement
    const clickedCard = target.closest('[data-lead-card]')
    
    // Si no se hizo click en una tarjeta, hacer scroll
    if (!clickedCard) {
      scrollToColumn()
    }
  }, [scrollToColumn])

  // Handler para iniciar drag de scroll en espacios vacíos
  const handleContentMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Solo activar si es click izquierdo y no es en una tarjeta
    if (e.button !== 0) return
    
    const target = e.target as HTMLElement
    const clickedCard = target.closest('[data-lead-card]')
    
    // Si se hizo click en una tarjeta, no hacer nada (dejar que el drag & drop funcione)
    if (clickedCard) {
      return
    }
    
    // Verificar si es un espacio en blanco
    if (target === e.currentTarget || target.closest('.text-center')) {
      e.preventDefault()
      isDraggingScrollRef.current = true
      dragStartXRef.current = e.clientX
      if (scrollContainerRef.current) {
        dragStartScrollLeftRef.current = scrollContainerRef.current.scrollLeft
      }
      // Cambiar cursor para indicar que se puede arrastrar
      if (contentRef.current) {
        contentRef.current.style.cursor = 'grabbing'
      }
    } else {
      // Verificar si es un espacio entre tarjetas
      const isBlankSpace = !clickedCard && !target.closest('button') && !target.closest('a')
      if (isBlankSpace) {
        e.preventDefault()
        isDraggingScrollRef.current = true
        dragStartXRef.current = e.clientX
        if (scrollContainerRef.current) {
          dragStartScrollLeftRef.current = scrollContainerRef.current.scrollLeft
        }
        if (contentRef.current) {
          contentRef.current.style.cursor = 'grabbing'
        }
      }
    }
  }, [])

  // Handler para mover durante el drag de scroll
  const handleContentMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingScrollRef.current || !scrollContainerRef.current) return
    
    e.preventDefault()
    const deltaX = dragStartXRef.current - e.clientX
    scrollContainerRef.current.scrollLeft = dragStartScrollLeftRef.current + deltaX
  }, [])

  // Handler para finalizar drag de scroll
  const handleContentMouseUp = useCallback(() => {
    if (isDraggingScrollRef.current) {
      isDraggingScrollRef.current = false
      if (contentRef.current) {
        contentRef.current.style.cursor = 'pointer'
      }
    }
  }, [])

  // Handler para mouse leave durante drag
  const handleContentMouseLeave = useCallback(() => {
    if (isDraggingScrollRef.current) {
      isDraggingScrollRef.current = false
      if (contentRef.current) {
        contentRef.current.style.cursor = 'pointer'
      }
    }
  }, [])

  // Agregar listeners globales para el drag de scroll (para continuar drag fuera del área)
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingScrollRef.current || !scrollContainerRef.current) return
      
      e.preventDefault()
      const deltaX = dragStartXRef.current - e.clientX
      scrollContainerRef.current.scrollLeft = dragStartScrollLeftRef.current + deltaX
    }

    const handleGlobalMouseUp = () => {
      if (isDraggingScrollRef.current) {
        isDraggingScrollRef.current = false
        if (contentRef.current) {
          contentRef.current.style.cursor = 'pointer'
        }
      }
    }

    // Siempre agregar los listeners, pero solo actuar si isDraggingScrollRef es true
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [])

  return (
    <div 
      className="flex-shrink-0 w-80" 
      data-pipeline-column
      ref={(node) => {
        setNodeRef(node)
        columnRef.current = node
      }}
    >
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
          
          {/* Estadísticas de la etapa - Solo mostrar urgentes si hay */}
          {stats.highPriorityCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <AlertCircle className="h-3 w-3 text-orange-500" />
              <span>{stats.highPriorityCount} urgente{stats.highPriorityCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </CardHeader>
        
        <CardContent 
          ref={contentRef}
          className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto cursor-pointer select-none"
          onClick={handleContentClick}
          onMouseDown={handleContentMouseDown}
          onMouseMove={handleContentMouseMove}
          onMouseUp={handleContentMouseUp}
          onMouseLeave={handleContentMouseLeave}
        >
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick?.(lead)}
              formatCurrency={formatCurrency}
              formatRelativeDate={formatRelativeDate}
              getPriorityColor={getPriorityColor}
              getTagColor={getTagColor}
              stages={stages}
              onLeadMove={onLeadMove}
              onLeadMoved={onLeadMoved}
            />
          ))}
          
          {leads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium mb-1">No hay contactos en esta etapa</p>
              <p className="text-xs">Arrastra contactos aquí o crea uno nuevo</p>
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
  getTagColor: (tag: string) => { bg: string; text: string; border: string }
  stages: PipelineStage[]
  onLeadMove?: (leadId: string, toStageId: string) => Promise<void>
  onLeadMoved?: (leadId: string, newStageId: string) => void
}

const LeadCard = memo(function LeadCard({
  lead,
  onClick,
  formatCurrency,
  formatRelativeDate,
  getPriorityColor,
  getTagColor,
  stages,
  onLeadMove,
  onLeadMoved
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
  
  // Parsear tags si vienen como string JSON
  const parseTags = (): string[] => {
    if (!lead.tags) return []
    try {
      if (typeof lead.tags === 'string') {
        const parsed = JSON.parse(lead.tags)
        return Array.isArray(parsed) ? parsed : []
      }
      return Array.isArray(lead.tags) ? lead.tags : []
    } catch {
      return Array.isArray(lead.tags) ? lead.tags : []
    }
  }
  
  const parsedTags = parseTags()

  const [isMoving, setIsMoving] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownType, setDropdownType] = useState<'stage' | 'tags'>('stage')
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 })
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string }>>([])
  const [loadingTags, setLoadingTags] = useState(false)
  const [copiedField, setCopiedField] = useState<'cuil' | 'telefono' | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const dragStartedRef = useRef(false)
  const longPressTriggeredRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const isScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  // Cargar tags disponibles cuando se abre el dropdown
  const loadAvailableTags = async () => {
    try {
      setLoadingTags(true)
      const response = await fetch('/api/manychat/tags')
      if (response.ok) {
        const data = await response.json()
        setAvailableTags(data.tags || [])
      }
    } catch (error) {
      console.error('Error loading tags:', error)
    } finally {
      setLoadingTags(false)
    }
  }

  // Hook para detectar long press
  const longPressHandlers = useLongPress({
    onLongPress: (e) => {
      // Si estamos scrolleando, no activar el long press
      if (isScrollingRef.current) {
        return
      }
      
      e.preventDefault()
      e.stopPropagation()
      longPressTriggeredRef.current = true
      
      // Obtener posición del card para posicionar el dropdown
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        setDropdownPosition({
          x: rect.left + rect.width / 2,
          y: rect.top
        })
      }
      
      // Cargar tags disponibles
      loadAvailableTags()
      
      // Abrir dropdown en modo 'stage' por defecto
      setDropdownType('stage')
      setShowDropdown(true)
    },
    onClick: onClick,
    delay: 500
  })

  // Detectar scroll para cancelar long press
  useEffect(() => {
    const handleWheel = (e: Event) => {
      const wheelEvent = e as WheelEvent
      // Si hay scroll horizontal, marcar que estamos scrolleando
      if (Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)) {
        isScrollingRef.current = true
        // Cancelar cualquier long press en progreso
        longPressTriggeredRef.current = false
        longPressHandlers.cancel?.()
        // Limpiar después de un breve delay
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingRef.current = false
        }, 150)
      }
    }

    const handleScroll = () => {
      isScrollingRef.current = true
      // Cancelar cualquier long press en progreso
      longPressTriggeredRef.current = false
      longPressHandlers.cancel?.()
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false
      }, 150)
    }

    // Buscar el contenedor con scroll
    const findScrollContainer = () => {
      if (!cardRef.current) return window
      let element = cardRef.current.parentElement
      while (element) {
        const style = window.getComputedStyle(element)
        if (style.overflow === 'auto' || style.overflowX === 'auto' || 
            style.overflow === 'scroll' || style.overflowX === 'scroll') {
          return element
        }
        element = element.parentElement
      }
      return window
    }

    const container = findScrollContainer()
    
    container.addEventListener('wheel', handleWheel, { passive: true })
    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [longPressHandlers])

  // Combinar handlers de long press con drag and drop
  const handleMouseDown = (e: React.MouseEvent) => {
    // Detener propagación para evitar que active el drag de scroll del contenedor
    e.stopPropagation()
    
    // Si hay dropdown abierto o estamos scrolleando, no permitir drag ni long press
    if (showDropdown || isScrollingRef.current) {
      e.preventDefault()
      return
    }
    
    dragStartedRef.current = false
    longPressTriggeredRef.current = false
    
    // Guardar posición inicial para detectar movimiento
    startPosRef.current = { x: e.clientX, y: e.clientY }
    
    // Ejecutar handler de long press primero
    longPressHandlers.onMouseDown(e)
    
    // Aplicar listeners de drag, pero el PointerSensor con activationConstraint
    // solo activará el drag si hay movimiento de más de 8px
    // Esto permite que el long press se complete antes de que el drag se active
    if (listeners && listeners.onMouseDown) {
      listeners.onMouseDown(e)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    // Detener propagación para evitar que active el drag de scroll del contenedor
    e.stopPropagation()
    
    // Si hay dropdown abierto, no permitir drag
    if (showDropdown) {
      e.preventDefault()
      return
    }
    
    dragStartedRef.current = false
    longPressTriggeredRef.current = false
    
    // Guardar posición inicial
    if (e.touches && e.touches.length > 0) {
      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    
    // Ejecutar handler de long press primero
    longPressHandlers.onTouchStart(e)
    
    // Aplicar listeners de drag
    if (listeners && listeners.onTouchStart) {
      listeners.onTouchStart(e)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // Si ya se activó el long press, hay dropdown, o estamos scrolleando, no permitir drag
    if (longPressTriggeredRef.current || showDropdown || isScrollingRef.current) {
      // Si estamos scrolleando, cancelar el long press
      if (isScrollingRef.current && longPressHandlers.onMouseLeave) {
        longPressHandlers.onMouseLeave(e)
      }
      return
    }
    
    // Verificar si hay movimiento significativo (más de 8px como el activationConstraint)
    if (startPosRef.current) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - startPosRef.current.x, 2) + 
        Math.pow(e.clientY - startPosRef.current.y, 2)
      )
      
      // Si se movió más de 8px, marcar que es un drag (pero no activar aún)
      if (distance > 8) {
        dragStartedRef.current = true
      }
    }
    
    // Continuar con el handler de long press para que pueda cancelar si detecta movimiento
    longPressHandlers.onMouseMove?.(e)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // Si ya se activó el long press o hay dropdown, no permitir drag
    if (longPressTriggeredRef.current || showDropdown) {
      return
    }
    
    // Verificar si hay movimiento significativo
    if (startPosRef.current && e.touches && e.touches.length > 0) {
      const distance = Math.sqrt(
        Math.pow(e.touches[0].clientX - startPosRef.current.x, 2) + 
        Math.pow(e.touches[0].clientY - startPosRef.current.y, 2)
      )
      
      if (distance > 8) {
        dragStartedRef.current = true
      }
    }
    
    longPressHandlers.onTouchMove?.(e)
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    // Limpiar referencias
    startPosRef.current = null
    
    // Ejecutar handler de long press
    longPressHandlers.onMouseUp(e)
    
    // Reset flags
    dragStartedRef.current = false
    longPressTriggeredRef.current = false
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    startPosRef.current = null
    
    longPressHandlers.onTouchEnd(e)
    
    dragStartedRef.current = false
    longPressTriggeredRef.current = false
  }

  // Los listeners se aplican directamente, pero el PointerSensor con activationConstraint
  // solo activará el drag si hay movimiento de más de 8px, lo que permite que el long press se complete

  // Función para mover el lead a una etapa
  const handleMoveToStage = async (toStageId: string) => {
    if (isMoving) {
      console.log('handleMoveToStage: Ya hay un movimiento en proceso', { isMoving })
      return
    }
    
    try {
      console.log('handleMoveToStage: Iniciando movimiento', { leadId: lead.id, leadName: lead.nombre, fromStageId: lead.stageId, toStageId })
      setIsMoving(true)
      
      // Llamar directamente a la API en lugar de usar onLeadMove (que es para drag & drop)
      const fromStageId = lead.stageId || ''
      
      const response = await fetch(`/api/pipeline/leads/${lead.id}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromStageId,
          toStageId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Error al mover el lead')
      }

      const result = await response.json()
      console.log('handleMoveToStage: Movimiento exitoso', result)
      
      setShowDropdown(false)
      const stageName = stages.find(s => s.id === toStageId)?.name || toStageId
      toast.success(`Lead movido a ${stageName}`)
      
      // Notificar al padre para actualizar el estado sin recargar
      onLeadMoved?.(lead.id, toStageId)
    } catch (error: any) {
      console.error('handleMoveToStage: Error al mover', error)
      toast.error(error.message || 'Error al mover el lead')
    } finally {
      setIsMoving(false)
    }
  }

  // Obtener etapas disponibles (excluyendo la actual)
  const currentStageId = lead.stageId
  const availableStages = stages.filter(s => s.id !== currentStageId)

  // Funciones para gestionar tags
  const handleAddTag = async (tagName: string) => {
    try {
      // Obtener el lead para encontrar el manychatId
      const leadResponse = await fetch(`/api/leads/${lead.id}`)
      if (!leadResponse.ok) {
        throw new Error('No se pudo obtener el lead')
      }

      const leadData = await leadResponse.json()
      
      if (!leadData.manychatId) {
        toast.error('Lead no está sincronizado con Manychat')
        return
      }

      // Agregar tag vía API de Manychat
      const response = await fetch('/api/manychat/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriberId: parseInt(leadData.manychatId),
          tagName,
          action: 'add',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al agregar tag')
      }

      toast.success(`Tag "${tagName}" agregado`)
      setShowDropdown(false)
      // Notificar al padre para refrescar datos si es necesario
      // Por ahora solo cerramos el dropdown, los tags se actualizarán en la próxima carga
    } catch (error: any) {
      console.error('Error adding tag:', error)
      toast.error(error.message || 'Error al agregar tag')
    }
  }

  const handleRemoveTag = async (tagName: string) => {
    try {
      const leadResponse = await fetch(`/api/leads/${lead.id}`)
      if (!leadResponse.ok) {
        throw new Error('No se pudo obtener el lead')
      }

      const leadData = await leadResponse.json()
      
      if (!leadData.manychatId) {
        toast.error('Lead no está sincronizado con Manychat')
        return
      }

      const response = await fetch('/api/manychat/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriberId: parseInt(leadData.manychatId),
          tagName,
          action: 'remove',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al remover tag')
      }

      toast.success(`Tag "${tagName}" removido`)
      setShowDropdown(false)
      // Notificar al padre para refrescar datos si es necesario
      // Por ahora solo cerramos el dropdown, los tags se actualizarán en la próxima carga
    } catch (error: any) {
      console.error('Error removing tag:', error)
      toast.error(error.message || 'Error al remover tag')
    }
  }

  // Formatear tiempo en etapa de manera más clara (memoizado)
  const formatTimeInStage = useCallback((days?: number) => {
    if (days === undefined || days === null) return null
    if (days === 0) return 'Hoy'
    if (days === 1) return '1 día'
    if (days < 7) return `${days} días`
    if (days < 30) {
      const weeks = Math.floor(days / 7)
      return weeks === 1 ? '1 semana' : `${weeks} semanas`
    }
    const months = Math.floor(days / 30)
    return months === 1 ? '1 mes' : `${months} meses`
  }, [])

  return (
    <>
      <div
        ref={(node) => {
          setNodeRef(node)
          cardRef.current = node
        }}
        data-lead-card
        style={style}
        {...attributes}
        {...listeners}
        className={`p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer relative ${
          isDragging ? 'opacity-50' : ''
        } ${showDropdown ? 'ring-2 ring-blue-500' : ''} ${isMoving ? 'opacity-75' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={longPressHandlers.onMouseLeave}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          // Prevenir que el click en la tarjeta active el scroll del contenedor
          e.stopPropagation()
          onClick?.()
        }}
      >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{lead.nombre}</h4>
            {/* Badge de urgencia si es alta o crítica */}
            {(lead.urgency === 'high' || lead.urgency === 'critical') && (
              <Badge 
                variant="destructive" 
                className="text-xs px-1.5 py-0"
                style={{ 
                  backgroundColor: lead.scoreColor || '#EF4444',
                  borderColor: lead.scoreColor || '#EF4444'
                }}
              >
                {lead.urgency === 'critical' ? 'Urgente' : 'Alerta'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {lead.origen || 'N/A'}
          </p>
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

      <div className="space-y-1.5">
        {/* Mostrar CUIL en lugar de Origen */}
        {/* Extraer CUIL también de customFields si no está disponible directamente */}
        {(() => {
          // Función helper para extraer CUIL/CUIT/DNI de un valor (puede estar dentro de texto)
          const extractCUILOrDNI = (value: any): string | null => {
            if (!value) return null
            
            const strValue = String(value).trim()
            if (!strValue) return null
            
            // Buscar patrón CUIL/CUIT con formato XX-XXXXXXXX-X
            const cuilWithDashes = strValue.match(/\b\d{2}-\d{8}-\d{1}\b/)
            if (cuilWithDashes) {
              return cuilWithDashes[0]
            }
            
            // Buscar patrón CUIL/CUIT sin guiones (11 dígitos consecutivos)
            const cuilWithoutDashes = strValue.match(/\b\d{11}\b/)
            if (cuilWithoutDashes) {
              const digits = cuilWithoutDashes[0]
              // Validar que tenga formato de CUIL/CUIT (XX-XXXXXXXX-X)
              if (/^\d{2}\d{8}\d{1}$/.test(digits)) {
                return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
              }
            }
            
            // Buscar DNI (8 dígitos) - solo si no encontramos CUIL/CUIT
            const dni = strValue.match(/\b\d{8}\b/)
            if (dni && !cuilWithDashes && !cuilWithoutDashes) {
              return dni[0]
            }
            
            return null
          }
          
          // Buscar CUIL/DNI en claves conocidas primero
          let cuilValue = lead.cuil || 
            (lead.customFields && (lead.customFields.cuit || lead.customFields.cuil || lead.customFields.dni))
          
          // Si ya tenemos un valor, intentar extraerlo en caso de que tenga formato incorrecto
          if (cuilValue) {
            const extracted = extractCUILOrDNI(cuilValue)
            if (extracted) {
              cuilValue = extracted
            }
          }
          
          // Si no se encontró, buscar en TODOS los valores de customFields por patrón
          // Esto maneja el caso donde los customFields tienen índices numéricos (0, 1, 2, etc.)
          if (!cuilValue && lead.customFields) {
            for (const [key, value] of Object.entries(lead.customFields)) {
              if (value === null || value === undefined || value === '') continue
              
              let normalizedValue: any
              try {
                // Si el valor es un objeto Manychat con estructura {id, name, value, ...}
                normalizedValue = typeof value === 'object' && value !== null && 'value' in value ? value.value : value
              } catch (e) {
                normalizedValue = value
              }
              
              // Intentar extraer CUIL/DNI del valor (puede estar dentro de texto)
              const extracted = extractCUILOrDNI(normalizedValue)
              if (extracted) {
                cuilValue = extracted
                console.log(`[LeadCard] CUIL encontrado en customField[${key}] para lead ${lead.id}:`, {
                  leadId: lead.id,
                  leadNombre: lead.nombre,
                  customFieldKey: key,
                  customFieldValue: normalizedValue,
                  extractedCUIL: extracted
                })
                break
              }
            }
          }
          
          // Normalizar el valor si es un objeto
          const displayValue = cuilValue 
            ? (typeof cuilValue === 'object' && cuilValue !== null && 'value' in cuilValue ? cuilValue.value : cuilValue)
            : null
          
          // Función para copiar al portapapeles
          const copyToClipboard = async (text: string, fieldName: string, fieldType: 'cuil' | 'telefono') => {
            try {
              await navigator.clipboard.writeText(text)
              setCopiedField(fieldType)
              toast.success(`${fieldName} copiado al portapapeles`)
              // Resetear el estado después de 2 segundos
              setTimeout(() => {
                setCopiedField(null)
              }, 2000)
            } catch (err) {
              toast.error('Error al copiar al portapapeles')
            }
          }
          
          return displayValue ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">CUIL:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-900">{String(displayValue)}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    copyToClipboard(String(displayValue), 'CUIL', 'cuil')
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  className="p-0.5 hover:bg-gray-100 rounded transition-all active:scale-95"
                  title="Copiar CUIL"
                >
                  {copiedField === 'cuil' ? (
                    <CheckCircle className="h-3 w-3 text-green-600 animate-in fade-in duration-200" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          ) : null
        })()}

        {/* Mostrar teléfono después del CUIL */}
        {(() => {
          // Función para validar si es un teléfono válido (no un ID de ManyChat)
          const isValidPhone = (phone: string | undefined | null): boolean => {
            if (!phone) return false
            // Si empieza con "manychat_", es un ID de ManyChat, no un teléfono
            if (phone.trim().toLowerCase().startsWith('manychat_')) return false
            // Si es solo números o tiene formato de teléfono (con +, espacios, guiones), es válido
            // Eliminar espacios, guiones y paréntesis para validar
            const cleaned = phone.replace(/[\s\-\(\)]/g, '')
            // Debe tener al menos 8 dígitos y puede empezar con +
            return /^\+?\d{8,}$/.test(cleaned)
          }

          const validPhone = isValidPhone(lead.telefono) ? lead.telefono : null

          // Función para copiar al portapapeles
          const copyToClipboard = async (text: string, fieldName: string, fieldType: 'cuil' | 'telefono') => {
            try {
              await navigator.clipboard.writeText(text)
              setCopiedField(fieldType)
              toast.success(`${fieldName} copiado al portapapeles`)
              // Resetear el estado después de 2 segundos
              setTimeout(() => {
                setCopiedField(null)
              }, 2000)
            } catch (err) {
              toast.error('Error al copiar al portapapeles')
            }
          }

          // Mostrar teléfono solo si es válido, o mostrar guion si no hay teléfono válido
          return (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Teléfono:</span>
              {validPhone ? (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-900 truncate max-w-[120px]">{validPhone}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      copyToClipboard(validPhone, 'Teléfono', 'telefono')
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="p-0.5 hover:bg-gray-100 rounded transition-all active:scale-95 flex-shrink-0"
                    title="Copiar teléfono"
                  >
                    {copiedField === 'telefono' ? (
                      <CheckCircle className="h-3 w-3 text-green-600 animate-in fade-in duration-200" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          )
        })()}

        {/* Información de tiempo mejorada */}
        {lead.timeInStage !== undefined && (
          <div className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">En esta etapa:</span>
            </div>
            <span className="font-medium text-gray-900">
              {formatTimeInStage(lead.timeInStage)}
            </span>
          </div>
        )}

        {/* Fecha de ingreso a la etapa */}
        {lead.stageEntryDate && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Ingresó:</span>
            <span>{formatRelativeDate(lead.stageEntryDate)}</span>
          </div>
        )}

        {/* Score visual mejorado con color según urgencia */}
        {lead.score !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Score:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{ 
                    width: `${Math.min(lead.score, 100)}%`,
                    backgroundColor: lead.scoreColor || '#3B82F6'
                  }}
                />
              </div>
              <span 
                className="text-xs font-medium"
                style={{ color: lead.scoreColor || '#6B7280' }}
                title={lead.scoreLabel || `Score: ${lead.score}`}
              >
                {lead.score}
              </span>
            </div>
          </div>
        )}
      </div>

      {parsedTags && parsedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {parsedTags.slice(0, 3).map((tag: string, index: number) => {
            const tagColor = getTagColor(tag)
            return (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs cursor-pointer hover:opacity-80 transition-opacity font-medium"
                style={{
                  backgroundColor: tagColor.bg,
                  color: tagColor.text,
                  borderColor: tagColor.border
                }}
                title={`Click para filtrar por: ${tag}`}
              >
                {tag}
              </Badge>
            )
          })}
          {parsedTags.length > 3 && (
            <Badge 
              variant="secondary" 
              className="text-xs"
              title={`${parsedTags.slice(3).join(', ')}`}
            >
              +{parsedTags.length - 3}
            </Badge>
          )}
        </div>
      )}

        {/* Indicador visual cuando se muestra el dropdown */}
        {showDropdown && (
          <div className="absolute inset-0 bg-blue-50/50 border-2 border-blue-500 rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <div className="text-xs text-blue-600 font-medium bg-white px-2 py-1 rounded shadow">
              {dropdownType === 'tags' ? 'Gestionar tags...' : 'Selecciona una etapa...'}
            </div>
          </div>
        )}
        
        {/* Loading overlay durante el movimiento */}
        {isMoving && (
          <div className="absolute inset-0 bg-white/80 border-2 border-blue-500 rounded-lg flex items-center justify-center z-20 pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <LoadingSpinner size="sm" />
              <div className="text-xs text-blue-600 font-medium">
                Moviendo...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {showDropdown && (
        <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
          <DropdownMenuTrigger asChild>
            <div 
              className="fixed pointer-events-none"
              style={{
                left: dropdownPosition.x,
                top: dropdownPosition.y + 10,
                transform: 'translateX(-50%)',
              }}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start"
            side="bottom"
            className="w-64 max-h-96 overflow-y-auto z-[100]"
            onCloseAutoFocus={(e) => {
              e.preventDefault()
              setShowDropdown(false)
            }}
            onEscapeKeyDown={() => setShowDropdown(false)}
            onInteractOutside={() => setShowDropdown(false)}
          >
            {/* Tabs para cambiar entre etapas y tags */}
            <div className="flex border-b">
              <button
                onClick={() => setDropdownType('stage')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  dropdownType === 'stage'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Etapas
              </button>
              <button
                onClick={() => {
                  setDropdownType('tags')
                  loadAvailableTags()
                }}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  dropdownType === 'tags'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tags
              </button>
            </div>

            {dropdownType === 'stage' ? (
              <>
                <DropdownMenuLabel className="px-3 py-2">
                  Mover a etapa
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableStages.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No hay etapas disponibles
                  </DropdownMenuItem>
                ) : (
                  availableStages
                    .sort((a, b) => a.order - b.order)
                    .map((stage) => (
                      <DropdownMenuItem
                        key={stage.id}
                        onClick={() => handleMoveToStage(stage.id)}
                        disabled={isMoving}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span>{stage.name}</span>
                          </div>
                          {isMoving ? (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          ) : (
                            <ArrowRight className="h-4 w-4 ml-2 text-muted-foreground" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))
                )}
              </>
            ) : (
              <>
                <DropdownMenuLabel className="px-3 py-2">
                  Gestionar tags
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Tags actuales del lead */}
                {parsedTags.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs text-muted-foreground font-medium">
                      Tags actuales
                    </div>
                    {parsedTags.map((tag: string) => {
                      const tagColor = getTagColor(tag)
                      return (
                        <DropdownMenuItem
                          key={tag}
                          onClick={() => handleRemoveTag(tag)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: tagColor.bg }}
                              />
                              <span>{tag}</span>
                            </div>
                            <X className="h-3 w-3 text-red-500" />
                          </div>
                        </DropdownMenuItem>
                      )
                    })}
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* Tags disponibles para agregar */}
                <div className="px-3 py-2 text-xs text-muted-foreground font-medium">
                  Agregar tag
                </div>
                {loadingTags ? (
                  <DropdownMenuItem disabled>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Cargando tags...
                  </DropdownMenuItem>
                ) : availableTags.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No hay tags disponibles
                  </DropdownMenuItem>
                ) : (
                  availableTags
                    .filter(tag => !parsedTags.includes(tag.name))
                    .slice(0, 10)
                    .map((tag) => (
                      <DropdownMenuItem
                        key={tag.id}
                        onClick={() => handleAddTag(tag.name)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <span>{tag.name}</span>
                        </div>
                      </DropdownMenuItem>
                    ))
                )}
              </>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDropdown(false)}
              className="text-muted-foreground"
            >
              Cancelar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )
})

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
          <p className="text-xs text-muted-foreground truncate">
            {lead.origen || 'N/A'}
          </p>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <div
            className={`w-2 h-2 rounded-full ${getPriorityColor(lead.priority)}`}
          />
        </div>
      </div>

      <div className="space-y-1">
        {/* Mostrar CUIL en lugar de Origen */}
        {(() => {
          // Función helper para extraer CUIL/CUIT/DNI de un valor (puede estar dentro de texto)
          const extractCUILOrDNI = (value: any): string | null => {
            if (!value) return null
            
            const strValue = String(value).trim()
            if (!strValue) return null
            
            // Buscar patrón CUIL/CUIT con formato XX-XXXXXXXX-X
            const cuilWithDashes = strValue.match(/\b\d{2}-\d{8}-\d{1}\b/)
            if (cuilWithDashes) {
              return cuilWithDashes[0]
            }
            
            // Buscar patrón CUIL/CUIT sin guiones (11 dígitos consecutivos)
            const cuilWithoutDashes = strValue.match(/\b\d{11}\b/)
            if (cuilWithoutDashes) {
              const digits = cuilWithoutDashes[0]
              // Validar que tenga formato de CUIL/CUIT (XX-XXXXXXXX-X)
              if (/^\d{2}\d{8}\d{1}$/.test(digits)) {
                return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
              }
            }
            
            // Buscar DNI (8 dígitos) - solo si no encontramos CUIL/CUIT
            const dni = strValue.match(/\b\d{8}\b/)
            if (dni && !cuilWithDashes && !cuilWithoutDashes) {
              return dni[0]
            }
            
            return null
          }
          
          // Buscar CUIL/DNI en claves conocidas primero
          let cuilValue = lead.cuil || 
            (lead.customFields && (lead.customFields.cuit || lead.customFields.cuil || lead.customFields.dni))
          
          // Si ya tenemos un valor, intentar extraerlo en caso de que tenga formato incorrecto
          if (cuilValue) {
            const extracted = extractCUILOrDNI(cuilValue)
            if (extracted) {
              cuilValue = extracted
            }
          }
          
          // Si no se encontró, buscar en TODOS los valores de customFields por patrón
          // Esto maneja el caso donde los customFields tienen índices numéricos (0, 1, 2, etc.)
          if (!cuilValue && lead.customFields) {
            for (const [key, value] of Object.entries(lead.customFields)) {
              if (value === null || value === undefined || value === '') continue
              
              let normalizedValue: any
              try {
                // Si el valor es un objeto Manychat con estructura {id, name, value, ...}
                normalizedValue = typeof value === 'object' && value !== null && 'value' in value ? value.value : value
              } catch (e) {
                normalizedValue = value
              }
              
              // Intentar extraer CUIL/DNI del valor (puede estar dentro de texto)
              const extracted = extractCUILOrDNI(normalizedValue)
              if (extracted) {
                cuilValue = extracted
                break
              }
            }
          }
          
          // Normalizar el valor si es un objeto
          const displayValue = cuilValue 
            ? (typeof cuilValue === 'object' && cuilValue !== null && 'value' in cuilValue ? cuilValue.value : cuilValue)
            : null
          
          return displayValue ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">CUIL:</span>
              <span className="font-medium">{String(displayValue)}</span>
            </div>
          ) : null
        })()}

        {/* Mostrar teléfono después del CUIL */}
        {(() => {
          // Función para validar si es un teléfono válido (no un ID de ManyChat)
          const isValidPhone = (phone: string | undefined | null): boolean => {
            if (!phone) return false
            // Si empieza con "manychat_", es un ID de ManyChat, no un teléfono
            if (phone.trim().toLowerCase().startsWith('manychat_')) return false
            // Si es solo números o tiene formato de teléfono (con +, espacios, guiones), es válido
            const cleaned = phone.replace(/[\s\-\(\)]/g, '')
            // Debe tener al menos 8 dígitos y puede empezar con +
            return /^\+?\d{8,}$/.test(cleaned)
          }

          const validPhone = isValidPhone(lead.telefono) ? lead.telefono : null

          return (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Teléfono:</span>
              {validPhone ? (
                <span className="font-medium truncate max-w-[120px]">{validPhone}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
