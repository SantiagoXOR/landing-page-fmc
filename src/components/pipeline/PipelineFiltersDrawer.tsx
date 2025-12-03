'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Filter, X, Tag, Clock, DollarSign, Search } from 'lucide-react'

export interface PipelineFilters {
  search?: string
  tags?: string[]
  stages?: string[]
  priority?: ('low' | 'medium' | 'high' | 'urgent')[]
  origen?: string[]
  timeInStage?: {
    min?: number
    max?: number
  }
  score?: {
    min?: number
    max?: number
  }
  value?: {
    min?: number
    max?: number
  }
}

interface PipelineFiltersDrawerProps {
  filters: PipelineFilters
  onFiltersChange: (filters: PipelineFilters) => void
  availableTags?: Array<{ id: string; name: string }>
  availableStages?: Array<{ id: string; name: string }>
}

// Cache global de tags para evitar recargas innecesarias
let tagsCache: Array<{ id: string; name: string }> | null = null
let tagsCacheTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export function PipelineFiltersDrawer({
  filters,
  onFiltersChange,
  availableTags = [],
  availableStages = []
}: PipelineFiltersDrawerProps) {
  const [localFilters, setLocalFilters] = useState<PipelineFilters>(filters)
  const [isOpen, setIsOpen] = useState(false)
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>(tagsCache || [])
  const [loadingTags, setLoadingTags] = useState(false)

  // Cargar tags disponibles con cache
  useEffect(() => {
    const loadTags = async () => {
      // Usar cache si está disponible y no ha expirado
      const now = Date.now()
      if (tagsCache && (now - tagsCacheTime) < CACHE_DURATION) {
        setTags(tagsCache)
        return
      }

      try {
        setLoadingTags(true)
        const response = await fetch('/api/manychat/tags')
        if (response.ok) {
          const data = await response.json()
          const tagsData = data.tags || []
          setTags(tagsData)
          // Actualizar cache
          tagsCache = tagsData
          tagsCacheTime = now
        }
      } catch (error) {
        console.error('Error loading tags:', error)
      } finally {
        setLoadingTags(false)
      }
    }
    
    // Solo cargar si el drawer está abierto
    if (isOpen) {
      loadTags()
    }
  }, [isOpen])

  // Contar filtros activos
  const activeFiltersCount = () => {
    let count = 0
    if (localFilters.search) count++
    if (localFilters.tags && localFilters.tags.length > 0) count++
    if (localFilters.stages && localFilters.stages.length > 0) count++
    if (localFilters.priority && localFilters.priority.length > 0) count++
    if (localFilters.origen && localFilters.origen.length > 0) count++
    if (localFilters.timeInStage?.min || localFilters.timeInStage?.max) count++
    if (localFilters.score?.min || localFilters.score?.max) count++
    if (localFilters.value?.min || localFilters.value?.max) count++
    return count
  }

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const handleClearFilters = () => {
    const clearedFilters: PipelineFilters = {}
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const toggleTag = (tagId: string) => {
    setLocalFilters(prev => {
      const currentTags = prev.tags || []
      const newTags = currentTags.includes(tagId)
        ? currentTags.filter(t => t !== tagId)
        : [...currentTags, tagId]
      return { ...prev, tags: newTags.length > 0 ? newTags : undefined }
    })
  }

  const toggleStage = (stageId: string) => {
    setLocalFilters(prev => {
      const currentStages = prev.stages || []
      const newStages = currentStages.includes(stageId)
        ? currentStages.filter(s => s !== stageId)
        : [...currentStages, stageId]
      return { ...prev, stages: newStages.length > 0 ? newStages : undefined }
    })
  }

  const togglePriority = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    setLocalFilters(prev => {
      const currentPriority = prev.priority || []
      const newPriority = currentPriority.includes(priority)
        ? currentPriority.filter(p => p !== priority)
        : [...currentPriority, priority]
      return { ...prev, priority: newPriority.length > 0 ? newPriority : undefined }
    })
  }

  const activeCount = activeFiltersCount()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros del Pipeline</SheetTitle>
          <SheetDescription>
            Filtra los leads del pipeline según tus criterios
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Búsqueda */}
          <div className="space-y-2">
            <Label htmlFor="search">Búsqueda</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Nombre, teléfono, email..."
                value={localFilters.search || ''}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value || undefined }))}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
              {loadingTags ? (
                <p className="text-sm text-gray-500 text-center py-4">Cargando tags...</p>
              ) : tags.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No hay tags disponibles</p>
              ) : (
                tags.map(tag => (
                  <div key={tag.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={localFilters.tags?.includes(tag.id) || false}
                      onCheckedChange={() => toggleTag(tag.id)}
                    />
                    <Label
                      htmlFor={`tag-${tag.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {tag.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Etapas */}
          {availableStages.length > 0 && (
            <div className="space-y-2">
              <Label>Etapas</Label>
              <div className="space-y-2">
                {availableStages.map(stage => (
                  <div key={stage.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`stage-${stage.id}`}
                      checked={localFilters.stages?.includes(stage.id) || false}
                      onCheckedChange={() => toggleStage(stage.id)}
                    />
                    <Label
                      htmlFor={`stage-${stage.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {stage.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prioridad */}
          <div className="space-y-2">
            <Label>Prioridad</Label>
            <div className="space-y-2">
              {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                <div key={priority} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={localFilters.priority?.includes(priority) || false}
                    onCheckedChange={() => togglePriority(priority)}
                  />
                  <Label
                    htmlFor={`priority-${priority}`}
                    className="text-sm font-normal cursor-pointer flex-1 capitalize"
                  >
                    {priority === 'low' && 'Baja'}
                    {priority === 'medium' && 'Media'}
                    {priority === 'high' && 'Alta'}
                    {priority === 'urgent' && 'Urgente'}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Origen */}
          <div className="space-y-2">
            <Label>Origen</Label>
            <Select
              value={localFilters.origen?.[0] || ''}
              onValueChange={(value) => 
                setLocalFilters(prev => ({ 
                  ...prev, 
                  origen: value ? [value] : undefined 
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los orígenes</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="referido">Referido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tiempo en etapa */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tiempo en Etapa (días)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="time-min" className="text-xs text-gray-500">Mínimo</Label>
                <Input
                  id="time-min"
                  type="number"
                  placeholder="0"
                  value={localFilters.timeInStage?.min || ''}
                  onChange={(e) => 
                    setLocalFilters(prev => ({
                      ...prev,
                      timeInStage: {
                        ...prev.timeInStage,
                        min: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="time-max" className="text-xs text-gray-500">Máximo</Label>
                <Input
                  id="time-max"
                  type="number"
                  placeholder="∞"
                  value={localFilters.timeInStage?.max || ''}
                  onChange={(e) => 
                    setLocalFilters(prev => ({
                      ...prev,
                      timeInStage: {
                        ...prev.timeInStage,
                        max: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="space-y-2">
            <Label>Score (0-100)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="score-min" className="text-xs text-gray-500">Mínimo</Label>
                <Input
                  id="score-min"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={localFilters.score?.min || ''}
                  onChange={(e) => 
                    setLocalFilters(prev => ({
                      ...prev,
                      score: {
                        ...prev.score,
                        min: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="score-max" className="text-xs text-gray-500">Máximo</Label>
                <Input
                  id="score-max"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={localFilters.score?.max || ''}
                  onChange={(e) => 
                    setLocalFilters(prev => ({
                      ...prev,
                      score: {
                        ...prev.score,
                        max: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valor ($)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="value-min" className="text-xs text-gray-500">Mínimo</Label>
                <Input
                  id="value-min"
                  type="number"
                  placeholder="0"
                  value={localFilters.value?.min || ''}
                  onChange={(e) => 
                    setLocalFilters(prev => ({
                      ...prev,
                      value: {
                        ...prev.value,
                        min: e.target.value ? parseFloat(e.target.value) : undefined
                      }
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="value-max" className="text-xs text-gray-500">Máximo</Label>
                <Input
                  id="value-max"
                  type="number"
                  placeholder="∞"
                  value={localFilters.value?.max || ''}
                  onChange={(e) => 
                    setLocalFilters(prev => ({
                      ...prev,
                      value: {
                        ...prev.value,
                        max: e.target.value ? parseFloat(e.target.value) : undefined
                      }
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleApplyFilters} className="flex-1">
              Aplicar Filtros
            </Button>
            {activeCount > 0 && (
              <Button onClick={handleClearFilters} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

