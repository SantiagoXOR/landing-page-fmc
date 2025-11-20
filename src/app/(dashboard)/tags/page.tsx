'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Tag, Plus, Loader2, AlertCircle, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface TagLead {
  id: string
  nombre: string
  telefono: string
  email?: string | null
  tags?: string[]
}

interface TagGroup {
  name: string
  count: number
  leads: TagLead[]
}

interface TagsResponse {
  tags: TagGroup[]
  withoutTags: {
    count: number
    leads: TagLead[]
  }
  total: number
}

// Colores para avatares
const avatarColors = [
  'bg-pink-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-yellow-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-cyan-500'
]

function getAvatarColor(index: number): string {
  return avatarColors[index % avatarColors.length]
}

function getTagColor(tagName: string): string {
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-red-100 text-red-800',
    'bg-purple-100 text-purple-800',
    'bg-yellow-100 text-yellow-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800',
    'bg-cyan-100 text-cyan-800'
  ]
  // Generar un color basado en el nombre del tag
  let hash = 0
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Componente para seleccionar leads
function AssignLeadsSelector({
  selectedLeads,
  onSelectionChange,
  tagsData,
  highlightLeadId
}: {
  selectedLeads: string[]
  onSelectionChange: (leads: string[]) => void
  tagsData: TagsResponse | null
  highlightLeadId?: string
}) {
  const [searchLeadQuery, setSearchLeadQuery] = useState("")
  
  // Obtener todos los leads disponibles
  const allLeads: TagLead[] = []
  if (tagsData) {
    // Agregar leads sin tags
    allLeads.push(...tagsData.withoutTags.leads)
    
    // Agregar leads con tags (sin duplicados)
    const leadIds = new Set(tagsData.withoutTags.leads.map(l => l.id))
    tagsData.tags.forEach(tagGroup => {
      tagGroup.leads.forEach(lead => {
        if (!leadIds.has(lead.id)) {
          allLeads.push(lead)
          leadIds.add(lead.id)
        }
      })
    })
  }

  // Filtrar leads por búsqueda
  const filteredLeads = allLeads.filter(lead =>
    lead.nombre.toLowerCase().includes(searchLeadQuery.toLowerCase()) ||
    lead.telefono.includes(searchLeadQuery)
  )

  const toggleLead = (leadId: string) => {
    if (selectedLeads.includes(leadId)) {
      onSelectionChange(selectedLeads.filter(id => id !== leadId))
    } else {
      onSelectionChange([...selectedLeads, leadId])
    }
  }

  const selectAll = () => {
    onSelectionChange(filteredLeads.map(l => l.id))
  }

  const deselectAll = () => {
    onSelectionChange([])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar lead..."
          value={searchLeadQuery}
          onChange={(e) => setSearchLeadQuery(e.target.value)}
          className="h-8"
        />
        <div className="flex space-x-1 ml-2">
          <Button size="sm" variant="outline" onClick={selectAll} className="h-8 text-xs">
            Todos
          </Button>
          <Button size="sm" variant="outline" onClick={deselectAll} className="h-8 text-xs">
            Ninguno
          </Button>
        </div>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {filteredLeads.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No hay leads disponibles</p>
        ) : (
          filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className={`flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer ${
                highlightLeadId === lead.id ? 'bg-purple-50 border border-purple-200' : ''
              }`}
              onClick={() => toggleLead(lead.id)}
            >
              <input
                type="checkbox"
                checked={selectedLeads.includes(lead.id)}
                onChange={() => toggleLead(lead.id)}
                className="rounded"
                onClick={(e) => e.stopPropagation()}
              />
              <Avatar className="h-6 w-6">
                <AvatarFallback className={`text-white text-xs ${getAvatarColor(0)}`}>
                  {lead.nombre.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{lead.nombre}</p>
                <p className="text-xs text-gray-500 truncate">{lead.telefono}</p>
              </div>
            </div>
          ))
        )}
      </div>
      {selectedLeads.length > 0 && (
        <p className="text-xs text-gray-500 pt-2 border-t">
          {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} seleccionado{selectedLeads.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

export default function SmartTagsPage() {
  const [activeFilter, setActiveFilter] = useState<string>("todos")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tagsData, setTagsData] = useState<TagsResponse | null>(null)
  const [page, setPage] = useState(1)
  const limit = 50

  // Estados para filtros avanzados
  const [showFiltersDialog, setShowFiltersDialog] = useState(false)
  const [showAssignTagsDialog, setShowAssignTagsDialog] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [assigningTags, setAssigningTags] = useState(false)

  // Estados para filtro de fecha
  const [dateRange, setDateRange] = useState<string>("semana")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")

  // Cargar datos de tags
  useEffect(() => {
    loadTagsData()
  }, [activeFilter, page, dateRange])

  const loadTagsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const tagParam = activeFilter === "todos" ? undefined : activeFilter
      
      // Calcular fechas según el rango seleccionado
      let fechaDesde = ""
      let fechaHasta = ""
      const today = new Date()
      
      switch (dateRange) {
        case "semana":
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          fechaDesde = weekAgo.toISOString().split('T')[0]
          fechaHasta = today.toISOString().split('T')[0]
          break
        case "mes":
          const monthAgo = new Date(today)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          fechaDesde = monthAgo.toISOString().split('T')[0]
          fechaHasta = today.toISOString().split('T')[0]
          break
        case "personalizado":
          if (customDateFrom && customDateTo) {
            fechaDesde = customDateFrom
            fechaHasta = customDateTo
          }
          break
        default:
          // Sin filtro de fecha
          break
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(tagParam && { tag: tagParam }),
        ...(fechaDesde && { fechaDesde }),
        ...(fechaHasta && { fechaHasta })
      })

      const url = `/api/tags?${params.toString()}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Error al cargar los tags')
      }

      const data: TagsResponse = await response.json()
      setTagsData(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar los tags')
      console.error('Error loading tags', err)
    } finally {
      setLoading(false)
    }
  }

  // Función para exportar CSV
  const exportTagsCSV = async () => {
    try {
      // Obtener todos los datos sin paginación para exportar
      const tagParam = activeFilter === "todos" ? undefined : activeFilter
      
      let fechaDesde = ""
      let fechaHasta = ""
      const today = new Date()
      
      switch (dateRange) {
        case "semana":
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          fechaDesde = weekAgo.toISOString().split('T')[0]
          fechaHasta = today.toISOString().split('T')[0]
          break
        case "mes":
          const monthAgo = new Date(today)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          fechaDesde = monthAgo.toISOString().split('T')[0]
          fechaHasta = today.toISOString().split('T')[0]
          break
        case "personalizado":
          if (customDateFrom && customDateTo) {
            fechaDesde = customDateFrom
            fechaHasta = customDateTo
          }
          break
      }

      const params = new URLSearchParams({
        limit: '10000', // Obtener muchos registros para exportar
        ...(tagParam && { tag: tagParam }),
        ...(fechaDesde && { fechaDesde }),
        ...(fechaHasta && { fechaHasta })
      })

      const response = await fetch(`/api/tags?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Error al obtener datos para exportar')
      }

      const data: TagsResponse = await response.json()
      
      // Preparar datos para CSV
      const csvRows: string[] = []
      csvRows.push('Nombre,Teléfono,Email,Tags,Fecha Creación')

      // Agregar leads sin tags
      data.withoutTags.leads.forEach(lead => {
        csvRows.push([
          `"${lead.nombre}"`,
          lead.telefono,
          lead.email || '',
          '',
          ''
        ].join(','))
      })

      // Agregar leads con tags
      data.tags.forEach(tagGroup => {
        tagGroup.leads.forEach(lead => {
          csvRows.push([
            `"${lead.nombre}"`,
            lead.telefono,
            lead.email || '',
            `"${lead.tags?.join('; ') || ''}"`,
            ''
          ].join(','))
        })
      })

      // Crear y descargar archivo
      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tags-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Error exporting CSV:', err)
      alert('Error al exportar los datos')
    }
  }

  // Estado para resaltar un lead específico en el selector
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | undefined>()

  // Función para abrir diálogo de asignar tags con un contacto preseleccionado
  const handleContactClick = (leadId: string) => {
    setSelectedLeads([leadId])
    setHighlightedLeadId(leadId)
    setShowAssignTagsDialog(true)
  }

  // Función para asignar tags a leads
  const handleAssignTags = async () => {
    if (selectedLeads.length === 0 || selectedTags.length === 0) {
      alert('Por favor selecciona al menos un lead y un tag')
      return
    }

    try {
      setAssigningTags(true)
      
      const results = await Promise.allSettled(
        selectedLeads.map(async (leadId) => {
          // Obtener lead actual para preservar tags existentes
          const leadResponse = await fetch(`/api/leads/${leadId}`)
          if (!leadResponse.ok) {
            throw new Error(`Error al obtener lead ${leadId}`)
          }
          
          const lead = await leadResponse.json()
          const existingTags = lead.tags ? (typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags) : []
          
          // Combinar tags existentes con nuevos (sin duplicados)
          const updatedTags = Array.from(new Set([...existingTags, ...selectedTags]))
          
          // Actualizar lead
          const updateResponse = await fetch(`/api/leads/${leadId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tags: updatedTags
            })
          })

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json().catch(() => ({}))
            throw new Error(errorData.message || `Error al actualizar lead ${leadId}`)
          }

          return { leadId, success: true }
        })
      )

      // Analizar resultados
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      // Recargar datos
      await loadTagsData()
      
      // Limpiar selección
      setSelectedLeads([])
      setSelectedTags([])
      setHighlightedLeadId(undefined)
      setShowAssignTagsDialog(false)
      
      // Mostrar mensaje apropiado
      if (failed === 0) {
        alert(`Tags asignados exitosamente a ${successful} lead(s)`)
      } else if (successful > 0) {
        alert(`Tags asignados parcialmente: ${successful} exitoso(s), ${failed} fallido(s). Algunos tags pueden no existir en Manychat.`)
      } else {
        alert(`Error al asignar tags. Verifica que los tags existan en Manychat y que los leads tengan un manychatId válido.`)
      }
    } catch (err: any) {
      console.error('Error assigning tags:', err)
      alert(`Error al asignar tags: ${err.message || 'Error desconocido'}`)
    } finally {
      setAssigningTags(false)
    }
  }

  // Función para obtener todos los leads disponibles (para el diálogo de asignar tags)
  const getAllLeadsForSelection = async (): Promise<TagLead[]> => {
    try {
      const response = await fetch('/api/tags?limit=10000')
      if (!response.ok) return []
      
      const data: TagsResponse = await response.json()
      const allLeads: TagLead[] = []
      
      // Agregar leads sin tags
      allLeads.push(...data.withoutTags.leads)
      
      // Agregar leads con tags (sin duplicados)
      const leadIds = new Set(data.withoutTags.leads.map(l => l.id))
      data.tags.forEach(tagGroup => {
        tagGroup.leads.forEach(lead => {
          if (!leadIds.has(lead.id)) {
            allLeads.push(lead)
            leadIds.add(lead.id)
          }
        })
      })
      
      return allLeads
    } catch (err) {
      console.error('Error getting leads:', err)
      return []
    }
  }

  // Filtrar leads por búsqueda
  const filterLeads = (leads: TagLead[]) => {
    if (!searchQuery.trim()) return leads
    
    const query = searchQuery.toLowerCase()
    return leads.filter(lead => 
      lead.nombre.toLowerCase().includes(query) ||
      lead.telefono.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query)
    )
  }

  // Obtener tags para los filtros
  const allTags = tagsData?.tags || []
  const filteredTags = activeFilter === "todos" 
    ? allTags 
    : allTags.filter(tag => tag.name === activeFilter)

  // Obtener leads sin tags filtrados
  const leadsWithoutTags = filterLeads(tagsData?.withoutTags.leads || [])

  // Obtener leads con tags filtrados
  const leadsWithTags = filteredTags.map(tag => ({
    ...tag,
    leads: filterLeads(tag.leads)
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Smart Tags"
          subtitle="Crea y edita tus Smart Tags para que Prometheo pueda clasificar a tus leads automáticamente"
        />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <p className="text-gray-600">Cargando tags...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Smart Tags"
          subtitle="Crea y edita tus Smart Tags para que Prometheo pueda clasificar a tus leads automáticamente"
        />
        <div className="p-6">
          <Card className="bg-white border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
              <Button 
                onClick={loadTagsData} 
                className="mt-4"
                variant="outline"
              >
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Obtener todos los tags disponibles para el selector
  const allAvailableTags = tagsData?.tags.map(t => t.name) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Smart Tags"
        subtitle="Crea y edita tus Smart Tags para que Prometheo pueda clasificar a tus leads automáticamente"
        onExport={exportTagsCSV}
        showNewButton={false}
        showDateFilter={false}
        actions={
          <div className="flex items-center space-x-2">
            {/* Filtro de fecha personalizado */}
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-700 border-gray-300 hover:bg-gray-50 text-xs sm:text-sm h-9 sm:h-10 px-2.5 sm:px-3 lg:px-4"
                >
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5 lg:mr-2" />
                  <span className="hidden sm:inline">
                    {dateRange === "semana" ? "Esta semana" : 
                     dateRange === "mes" ? "Este mes" : 
                     dateRange === "personalizado" ? "Personalizado" : 
                     "Todos"}
                  </span>
                  <span className="sm:hidden">Fecha</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Rango de fechas</Label>
                    <Select value={dateRange} onValueChange={(value) => {
                      setDateRange(value)
                      if (value !== "personalizado") {
                        setShowDatePicker(false)
                      }
                    }}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los tiempos</SelectItem>
                        <SelectItem value="semana">Esta semana</SelectItem>
                        <SelectItem value="mes">Este mes</SelectItem>
                        <SelectItem value="personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {dateRange === "personalizado" && (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">Desde</Label>
                        <Input
                          type="date"
                          value={customDateFrom}
                          onChange={(e) => setCustomDateFrom(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Hasta</Label>
                        <Input
                          type="date"
                          value={customDateTo}
                          onChange={(e) => setCustomDateTo(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (customDateFrom && customDateTo) {
                            setShowDatePicker(false)
                          }
                        }}
                        className="w-full"
                      >
                        Aplicar
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        }
      />

      <div className="p-6">
        {/* Filtros y búsqueda */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div className="flex items-center space-x-4 overflow-x-auto pb-2">
            <div className="flex space-x-1 min-w-max">
              <Button
                variant={activeFilter === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveFilter("todos")
                  setPage(1)
                }}
                className={activeFilter === "todos" ? "bg-purple-600 text-white" : ""}
              >
                Todos
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag.name}
                  variant={activeFilter === tag.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveFilter(tag.name)
                    setPage(1)
                  }}
                  className={activeFilter === tag.name ? "bg-purple-600 text-white" : ""}
                >
                  {tag.name} ({tag.count})
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                className="pl-10 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Dialog open={showFiltersDialog} onOpenChange={setShowFiltersDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Filtros Avanzados</DialogTitle>
                  <DialogDescription>
                    Aplica filtros adicionales para refinar tu búsqueda
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Rango de fechas</Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los tiempos</SelectItem>
                        <SelectItem value="semana">Esta semana</SelectItem>
                        <SelectItem value="mes">Este mes</SelectItem>
                        <SelectItem value="personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {dateRange === "personalizado" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Desde</Label>
                        <Input
                          type="date"
                          value={customDateFrom}
                          onChange={(e) => setCustomDateFrom(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Hasta</Label>
                        <Input
                          type="date"
                          value={customDateTo}
                          onChange={(e) => setCustomDateTo(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setDateRange("todos")
                    setCustomDateFrom("")
                    setCustomDateTo("")
                  }}>
                    Limpiar
                  </Button>
                  <Button onClick={() => setShowFiltersDialog(false)}>
                    Aplicar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showAssignTagsDialog} onOpenChange={setShowAssignTagsDialog}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Tags
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Asignar Tags a Leads</DialogTitle>
                  <DialogDescription>
                    Selecciona los leads y los tags que deseas asignar
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Seleccionar Tags</Label>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {allAvailableTags.length === 0 ? (
                        <p className="text-sm text-gray-500">No hay tags disponibles. Los tags se crean automáticamente desde el chatbot.</p>
                      ) : (
                        allAvailableTags.map((tag) => (
                          <div key={tag} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`tag-${tag}`}
                              checked={selectedTags.includes(tag)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTags([...selectedTags, tag])
                                } else {
                                  setSelectedTags(selectedTags.filter(t => t !== tag))
                                }
                              }}
                              className="rounded"
                            />
                            <Label htmlFor={`tag-${tag}`} className="cursor-pointer">
                              <Badge className={getTagColor(tag)}>{tag}</Badge>
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Crear Nuevo Tag</Label>
                    <div className="flex space-x-2 mt-2">
                      <Input
                        placeholder="Nombre del tag"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newTagName.trim()) {
                            if (!selectedTags.includes(newTagName.trim())) {
                              setSelectedTags([...selectedTags, newTagName.trim()])
                              setNewTagName("")
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (newTagName.trim() && !selectedTags.includes(newTagName.trim())) {
                            setSelectedTags([...selectedTags, newTagName.trim()])
                            setNewTagName("")
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Tags Seleccionados</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedTags.length === 0 ? (
                        <p className="text-sm text-gray-500">Ningún tag seleccionado</p>
                      ) : (
                        selectedTags.map((tag) => (
                          <Badge key={tag} className={getTagColor(tag)}>
                            {tag}
                            <button
                              onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                              className="ml-2 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Seleccionar Leads</Label>
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                      <AssignLeadsSelector
                        selectedLeads={selectedLeads}
                        onSelectionChange={setSelectedLeads}
                        tagsData={tagsData}
                        highlightLeadId={highlightedLeadId}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setSelectedLeads([])
                    setSelectedTags([])
                    setNewTagName("")
                    setHighlightedLeadId(undefined)
                    setShowAssignTagsDialog(false)
                  }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAssignTags} disabled={assigningTags || selectedLeads.length === 0 || selectedTags.length === 0}>
                    {assigningTags ? 'Asignando...' : 'Asignar Tags'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Sección Sin tags */}
        {activeFilter === "todos" && (
          <Card className="bg-white border-gray-200 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">Sin tags</span>
                <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                  {leadsWithoutTags.length} / {tagsData?.withoutTags.count || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leadsWithoutTags.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay leads sin tags</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {leadsWithoutTags.map((lead, index) => (
                    <div 
                      key={lead.id} 
                      onClick={() => handleContactClick(lead.id)}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`text-white ${getAvatarColor(index)}`}>
                          {lead.nombre.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{lead.nombre}</p>
                        <p className="text-xs text-gray-500 truncate">{lead.telefono}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Secciones con tags */}
        {leadsWithTags.map((tagGroup) => (
          <Card key={tagGroup.name} className="bg-white border-gray-200 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Tag className="h-5 w-5 text-purple-600" />
                  <span className="text-lg font-semibold text-gray-900">{tagGroup.name}</span>
                </div>
                <Badge className={getTagColor(tagGroup.name)}>
                  {tagGroup.leads.length} / {tagGroup.count}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tagGroup.leads.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {searchQuery ? 'No se encontraron leads con este filtro' : 'No hay leads con este tag'}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {tagGroup.leads.map((lead, index) => (
                    <div 
                      key={lead.id} 
                      onClick={() => handleContactClick(lead.id)}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`text-white ${getAvatarColor(index)}`}>
                          {lead.nombre.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{lead.nombre}</p>
                        <p className="text-xs text-gray-500 truncate">{lead.telefono}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Mensaje cuando no hay datos */}
        {!loading && !error && allTags.length === 0 && leadsWithoutTags.length === 0 && (
          <Card className="max-w-2xl mx-auto mt-8">
            <CardContent className="pt-6">
              <p className="text-gray-600 text-center py-8">
                No hay tags disponibles. Los tags se sincronizan automáticamente desde el chatbot.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Controles de paginación */}
        {!loading && !error && tagsData && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Mostrando página {page} de {Math.ceil((tagsData.total || 0) / limit)}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => prev + 1)}
                disabled={page * limit >= (tagsData.total || 0)}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
