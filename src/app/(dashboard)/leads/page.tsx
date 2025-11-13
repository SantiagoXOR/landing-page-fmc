'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { Search, Plus, Filter, Download, Users, TrendingUp, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Tag, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { TagPill } from '@/components/manychat/TagPill'
import DeleteConfirmationModal from '@/components/ui/delete-confirmation-modal'
import { useToast } from '@/components/ui/toast'
import { PermissionGuard, usePermissions, ConditionalRender } from '@/components/auth/PermissionGuard'
import AdvancedSearch from '@/components/leads/AdvancedSearch'
import {
  LoadingState,
  LeadTableSkeleton,
  MetricCardSkeleton,
  EmptySearchState,
  LoadingButton
} from '@/components/ui/loading-states'
import { useApiLoading } from '@/hooks/useLoadingState'

interface Lead {
  id: string
  nombre: string
  telefono: string
  email?: string
  estado: string
  origen?: string
  ingresos?: number
  zona?: string
  notas?: string
  createdAt: string
  manychatId?: string
  tags?: string | string[]
}

interface LeadsResponse {
  leads: Lead[]
  total: number
  page: number
  totalPages: number
}

function LeadsPage() {
  const { data: session } = useSession()
  const { addToast } = useToast()
  const { checkPermission } = usePermissions()
  const [leads, setLeads] = useState<Lead[]>([])
  const [allLeads, setAllLeads] = useState<Lead[]>([]) // Para contadores dinámicos exactos

  // Estados de carga usando el hook personalizado
  const {
    isLoading: loading,
    error: loadingError,
    apiCall
  } = useApiLoading()
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [origen, setOrigen] = useState('')
  const [zona, setZona] = useState('')
  const [ingresoMin, setIngresoMin] = useState('')
  const [ingresoMax, setIngresoMax] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    leadId: string
    leadName: string
  }>({
    isOpen: false,
    leadId: '',
    leadName: ''
  })
  const [editingField, setEditingField] = useState<{
    leadId: string
    field: 'estado' | 'notas'
    value: string
  } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Función para obtener todos los leads para contadores dinámicos
  const fetchAllLeads = async () => {
    try {
      const response = await fetch('/api/leads?limit=1000') // Obtener todos para contadores
      if (response.ok) {
        const data: LeadsResponse = await response.json()
        setAllLeads(data.leads)
      }
    } catch (error) {
      console.error('Error fetching all leads:', error)
    }
  }

  const fetchLeads = async () => {
    await apiCall(
      async () => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
          ...(search && { q: search }),
          ...(estado && { estado }),
          ...(origen && { origen }),
          ...(zona && { zona }),
          ...(ingresoMin && { ingresoMin }),
          ...(ingresoMax && { ingresoMax }),
          ...(fechaDesde && { fechaDesde }),
          ...(fechaHasta && { fechaHasta }),
        })

        const response = await fetch(`/api/leads?${params}`)
        if (!response.ok) {
          throw new Error('Error al cargar los leads')
        }

        const data: LeadsResponse = await response.json()
        setLeads(data.leads)
        setTotalPages(data.totalPages)
        setTotalLeads(data.total)

        return data
      },
      {
        loadingMessage: 'Cargando leads...',
        successMessage: `${leads.length} leads cargados exitosamente`,
        errorMessage: 'Error al cargar los leads'
      }
    )
  }

  // Función para manejar búsqueda avanzada
  const handleAdvancedSearch = (filters: any) => {
    setSearch(filters.search)
    setEstado(filters.estado)
    setZona(filters.zona)
    setOrigen(filters.origen)
    setIngresoMin(filters.ingresoMin)
    setIngresoMax(filters.ingresoMax)
    setFechaDesde(filters.fechaDesde)
    setFechaHasta(filters.fechaHasta)
    setPage(1) // Reset to first page
  }

  // Función para limpiar filtros
  const handleClearFilters = () => {
    setSearch('')
    setEstado('')
    setZona('')
    setOrigen('')
    setIngresoMin('')
    setIngresoMax('')
    setFechaDesde('')
    setFechaHasta('')
    setPage(1)
  }

  // Función para abrir modal de eliminación
  const openDeleteModal = (leadId: string, leadName: string) => {
    setDeleteModal({
      isOpen: true,
      leadId,
      leadName
    })
  }

  // Función para cerrar modal de eliminación
  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      leadId: '',
      leadName: ''
    })
  }

  // Función para confirmar eliminación
  const confirmDeleteLead = async () => {
    try {
      setDeletingId(deleteModal.leadId)
      const response = await fetch(`/api/leads/${deleteModal.leadId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar el lead')
      }

      // Actualizar la lista de leads
      await fetchAllLeads()
      await fetchLeads()

      // Mostrar mensaje de éxito
      addToast({
        type: 'success',
        title: 'Lead eliminado',
        description: 'El lead ha sido eliminado exitosamente'
      })
    } catch (error) {
      console.error('Error eliminando lead:', error)
      addToast({
        type: 'error',
        title: 'Error al eliminar',
        description: error instanceof Error ? error.message : 'Error al eliminar el lead'
      })
      throw error // Re-throw para que el modal maneje el error
    } finally {
      setDeletingId(null)
    }
  }

  // Funciones para edición rápida
  const startQuickEdit = (leadId: string, field: 'estado' | 'notas', currentValue: string) => {
    setEditingField({
      leadId,
      field,
      value: currentValue || ''
    })
  }

  const cancelQuickEdit = () => {
    setEditingField(null)
  }

  const saveQuickEdit = async () => {
    if (!editingField) return

    try {
      setUpdatingId(editingField.leadId)

      const updateData = {
        [editingField.field]: editingField.value
      }

      const response = await fetch(`/api/leads/${editingField.leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar el lead')
      }

      // Actualizar la lista de leads
      await fetchAllLeads()
      await fetchLeads()

      setEditingField(null)
      addToast({
        type: 'success',
        title: 'Lead actualizado',
        description: `${editingField.field === 'estado' ? 'Estado' : 'Notas'} actualizado exitosamente`
      })
    } catch (error) {
      console.error('Error actualizando lead:', error)
      addToast({
        type: 'error',
        title: 'Error al actualizar',
        description: error instanceof Error ? error.message : 'Error al actualizar el lead'
      })
    } finally {
      setUpdatingId(null)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [page, search, estado, origen, zona, ingresoMin, ingresoMax, fechaDesde, fechaHasta])

  useEffect(() => {
    fetchAllLeads() // Cargar todos los leads para contadores dinámicos
  }, [])

  // Funciones para contadores dinámicos exactos
  const getEstadoCount = (estadoFilter: string) => {
    return allLeads.filter(lead => lead.estado === estadoFilter).length
  }

  const getOrigenCount = (origenFilter: string) => {
    return allLeads.filter(lead => lead.origen === origenFilter).length
  }

  const getFilteredCount = () => {
    let filtered = allLeads

    if (estado) {
      filtered = filtered.filter(lead => lead.estado === estado)
    }
    if (origen) {
      filtered = filtered.filter(lead => lead.origen === origen)
    }
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(lead =>
        lead.nombre?.toLowerCase().includes(searchLower) ||
        lead.telefono?.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower)
      )
    }

    return filtered.length
  }

  // Función para generar título con contadores dinámicos exactos
  const getPageTitle = () => {
    const totalCount = allLeads.length
    const filteredCount = getFilteredCount()

    if (!estado && !origen && !search) {
      return `Leads de Formosa (${totalCount})`
    }

    let filterText = ''
    if (estado) filterText += ` por estado: ${estado}`
    if (origen) filterText += ` por origen: ${origen}`
    if (search) filterText += ` por búsqueda: &quot;${search}&quot;`

    return `Leads (${filteredCount})(filtrado${filterText})`
  }

  const getEstadoBadge = (estado: string) => {
    const badgeClasses = {
      NUEVO: 'formosa-badge-nuevo',
      EN_REVISION: 'formosa-badge-revision',
      PREAPROBADO: 'formosa-badge-preaprobado',
      RECHAZADO: 'formosa-badge-rechazado',
      DOC_PENDIENTE: 'formosa-badge-pendiente',
      DERIVADO: 'formosa-badge-derivado',
    }

    return (
      <Badge className={cn(
        "text-xs font-medium",
        badgeClasses[estado as keyof typeof badgeClasses] || 'formosa-badge-revision'
      )}>
        {estado.replace('_', ' ')}
      </Badge>
    )
  }

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams({
        ...(search && { q: search }),
        ...(estado && { estado }),
        ...(origen && { origen }),
        limit: '1000', // Export más leads
      })

      const response = await fetch(`/api/leads?${params}`)
      if (response.ok) {
        const data: LeadsResponse = await response.json()
        
        // Crear CSV
        const headers = ['Nombre', 'Teléfono', 'Email', 'Estado', 'Origen', 'Ingresos', 'Zona', 'Fecha']
        const csvContent = [
          headers.join(','),
          ...data.leads.map(lead => [
            lead.nombre,
            lead.telefono,
            lead.email || '',
            lead.estado,
            lead.origen || '',
            lead.ingresos || '',
            lead.zona || '',
            new Date(lead.createdAt).toLocaleDateString('es-AR')
          ].join(','))
        ].join('\n')

        // Descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting CSV:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header moderno */}
      <Header
        title="Gestión de Leads"
        subtitle={getPageTitle()}
        showNewButton={true}
        newButtonText="Nuevo Lead"
        newButtonHref="/leads/new"
        showExportButton={true}
        onExport={exportCSV}
      />

      <div className="space-y-8 p-6">

        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {allLeads.length === 0 && loading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <Card className="formosa-card">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{allLeads.length}</p>
                      <p className="text-sm text-muted-foreground">Total Leads</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

          <Card className="formosa-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {getEstadoCount('PREAPROBADO')}
                  </p>
                  <p className="text-sm text-muted-foreground">Preaprobados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="formosa-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg flex items-center justify-center">
                  <Filter className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {getEstadoCount('EN_REVISION')}
                  </p>
                  <p className="text-sm text-muted-foreground">En Revisión</p>
                </div>
              </div>
            </CardContent>
          </Card>

              <Card className="formosa-card">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                      <Plus className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {getEstadoCount('NUEVO')}
                      </p>
                      <p className="text-sm text-muted-foreground">Nuevos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Búsqueda Avanzada */}
        <AdvancedSearch
          onSearch={handleAdvancedSearch}
          onClear={handleClearFilters}
          loading={loading}
          totalResults={totalLeads}
        />

        {/* Filtros rápidos con badges */}
        <Card className="formosa-card">
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-3">Filtros Rápidos</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setEstado('')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    !estado
                      ? 'bg-purple-100 text-purple-800 border-2 border-purple-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos ({allLeads.length})
                </button>
                {['NUEVO', 'EN_REVISION', 'PREAPROBADO', 'RECHAZADO', 'DOC_PENDIENTE', 'DERIVADO'].map((est) => (
                  <button
                    key={est}
                    onClick={() => setEstado(est)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      estado === est
                        ? 'bg-purple-100 text-purple-800 border-2 border-purple-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {est.replace('_', ' ')} ({getEstadoCount(est)})
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de leads mejorada */}
        <Card className="formosa-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">
                  {getPageTitle()}
                </CardTitle>
                {(estado || origen || search) && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Filtros aplicados
                    </Badge>
                    {estado && (
                      <Badge className="formosa-badge-nuevo">
                        Estado: {estado}
                      </Badge>
                    )}
                    {origen && (
                      <Badge variant="outline" className="bg-gray-50">
                        Origen: {origen}
                      </Badge>
                    )}
                    {search && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        Búsqueda: &quot;{search}&quot;
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Página {page} de {totalPages}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LeadTableSkeleton rows={5} />
            ) : loadingError ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-4">
                  <p className="font-medium">Error al cargar los leads</p>
                  <p className="text-sm">{loadingError}</p>
                </div>
                <Button onClick={fetchLeads} variant="outline">
                  Reintentar
                </Button>
              </div>
            ) : leads.length === 0 ? (
              search ? (
                <EmptySearchState
                  query={search}
                  onClear={() => {
                    setSearch('')
                    setEstado('')
                    setOrigen('')
                    setZona('')
                    setPage(1)
                  }}
                  type="leads"
                />
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    No se encontraron leads
                  </h3>
                  <p className="text-gray-500 mb-4">
                    No hay leads que coincidan con los filtros aplicados
                  </p>
                  <Button asChild className="gradient-primary text-white">
                    <Link href="/leads/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear primer lead
                    </Link>
                  </Button>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {leads.map((lead, index) => (
                  <div
                    key={lead.id}
                    className="formosa-card hover-lift p-4 transition-all duration-200 animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <Link
                              href={`/leads/${lead.id}`}
                              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {lead.nombre}
                            </Link>
                            <div className="flex items-center space-x-2 mt-1">
                              {/* Estado editable */}
                              {editingField?.leadId === lead.id && editingField?.field === 'estado' ? (
                                <div className="flex items-center space-x-2">
                                  <select
                                    value={editingField.value}
                                    onChange={(e) => setEditingField({...editingField, value: e.target.value})}
                                    className="text-xs border rounded px-2 py-1"
                                    disabled={updatingId === lead.id}
                                  >
                                    <option value="NUEVO">Nuevo</option>
                                    <option value="EN_REVISION">En Revisión</option>
                                    <option value="PREAPROBADO">Preaprobado</option>
                                    <option value="RECHAZADO">Rechazado</option>
                                    <option value="DOC_PENDIENTE">Doc. Pendiente</option>
                                    <option value="DERIVADO">Derivado</option>
                                  </select>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={saveQuickEdit}
                                    disabled={updatingId === lead.id}
                                    className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                                  >
                                    ✓
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelQuickEdit}
                                    disabled={updatingId === lead.id}
                                    className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                  >
                                    ✕
                                  </Button>
                                </div>
                              ) : (
                                <div
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => startQuickEdit(lead.id, 'estado', lead.estado)}
                                  title="Click para editar estado"
                                >
                                  {getEstadoBadge(lead.estado)}
                                </div>
                              )}
                              {lead.origen && (
                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                                  {lead.origen}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="ml-13 space-y-1">
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>📞 {lead.telefono}</span>
                            <span>✉️ {lead.email || 'Sin email'}</span>
                            {lead.zona && <span>📍 {lead.zona}</span>}
                          </div>

                          {lead.ingresos && (
                            <div className="text-sm text-green-600 font-medium">
                              💰 {formatCurrency(lead.ingresos)}
                            </div>
                          )}

                          <div className="text-xs text-gray-400">
                            📅 {formatDate(new Date(lead.createdAt))}
                          </div>

                          {/* Tags de Manychat */}
                          {(() => {
                            let leadTags: string[] = []
                            if (lead.tags) {
                              try {
                                leadTags = typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags
                              } catch (e) {
                                leadTags = []
                              }
                            }
                            
                            return leadTags.length > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap mt-2">
                                <Tag className="w-3 h-3 text-gray-400" />
                                {leadTags.slice(0, 3).map((tag) => (
                                  <TagPill key={tag} tag={tag} readonly />
                                ))}
                                {leadTags.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{leadTags.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : null
                          })()}

                          {/* Notas editables */}
                          <div className="mt-2">
                            {editingField?.leadId === lead.id && editingField?.field === 'notas' ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingField.value}
                                  onChange={(e) => setEditingField({...editingField, value: e.target.value})}
                                  className="w-full text-xs border rounded px-2 py-1 resize-none"
                                  rows={2}
                                  placeholder="Agregar notas..."
                                  disabled={updatingId === lead.id}
                                />
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={saveQuickEdit}
                                    disabled={updatingId === lead.id}
                                    className="h-6 px-2 text-green-600 hover:bg-green-50"
                                  >
                                    ✓ Guardar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelQuickEdit}
                                    disabled={updatingId === lead.id}
                                    className="h-6 px-2 text-red-600 hover:bg-red-50"
                                  >
                                    ✕ Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors"
                                onClick={() => startQuickEdit(lead.id, 'notas', lead.notas || '')}
                                title="Click para editar notas"
                              >
                                {lead.notas ? (
                                  <div className="text-xs text-gray-600">
                                    📝 {lead.notas.length > 50 ? `${lead.notas.substring(0, 50)}...` : lead.notas}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400 italic">
                                    📝 Click para agregar notas
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Estado simplificado */}
                          {lead.estado && (
                            <div className="mt-2">
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="text-gray-500">Proceso:</span>
                                <Badge variant="outline" className="text-xs bg-gray-50">
                                  {lead.estado.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Indicador de sincronización con Manychat */}
                        {lead.manychatId && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded" title="Sincronizado con Manychat">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-700">MC</span>
                          </div>
                        )}
                        
                        <Button asChild variant="ghost" size="sm" className="hover:bg-blue-50" title="Ver detalles">
                          <Link href={`/leads/${lead.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <ConditionalRender permission="leads:write">
                          <Button asChild variant="ghost" size="sm" className="hover:bg-green-50" title="Editar lead">
                            <Link href={`/leads/${lead.id}/edit`}>
                              <Edit className="h-4 w-4 text-green-600" />
                            </Link>
                          </Button>
                        </ConditionalRender>
                        <ConditionalRender permission="leads:delete">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-50"
                            title="Eliminar lead"
                            onClick={() => openDeleteModal(lead.id, lead.nombre)}
                            disabled={deletingId === lead.id}
                          >
                            {deletingId === lead.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-600" />
                            )}
                          </Button>
                        </ConditionalRender>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paginación moderna */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((page - 1) * 10) + 1} - {Math.min(page * 10, totalLeads)} de {totalLeads} leads
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="hover-lift"
                  >
                    ← Anterior
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            "w-8 h-8",
                            page === pageNum && "gradient-primary text-white"
                          )}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="hover-lift"
                  >
                    Siguiente →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmación de eliminación */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteLead}
        title="Eliminar Lead"
        description="¿Estás seguro de que quieres eliminar este lead? Se perderán todos los datos asociados incluyendo historial de interacciones y documentos."
        itemName={deleteModal.leadName}
        loading={deletingId === deleteModal.leadId}
      />
    </div>
  )
}

// Envolver con PermissionGuard
function ProtectedLeadsPage() {
  return (
    <PermissionGuard permission="leads:read" route="/leads">
      <LeadsPage />
    </PermissionGuard>
  )
}

export { ProtectedLeadsPage as default }
