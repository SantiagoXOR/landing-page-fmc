'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Filter, Tag, Plus, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
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

export default function SmartTagsPage() {
  const [activeFilter, setActiveFilter] = useState<string>("todos")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tagsData, setTagsData] = useState<TagsResponse | null>(null)
  const [page, setPage] = useState(1)
  const limit = 50

  // Cargar datos de tags
  useEffect(() => {
    loadTagsData()
  }, [activeFilter, page])

  const loadTagsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const tagParam = activeFilter === "todos" ? undefined : activeFilter
      const url = `/api/tags?page=${page}&limit=${limit}${tagParam ? `&tag=${encodeURIComponent(tagParam)}` : ''}`
      
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Smart Tags"
        subtitle="Crea y edita tus Smart Tags para que Prometheo pueda clasificar a tus leads automáticamente"
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
            <Button variant="outline" size="sm" disabled>
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button className="gradient-primary text-white" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Tags
            </Button>
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
                No hay tags disponibles. Los tags se sincronizan automáticamente desde Manychat.
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
