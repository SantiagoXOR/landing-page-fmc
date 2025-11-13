'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, X, MapPin, Calendar, DollarSign } from 'lucide-react'
import { FORMOSA_ZONES } from '@/lib/validators'
import { LoadingButton, LoadingSpinner } from '@/components/ui/loading-states'
import { useDebouncedLoading } from '@/hooks/useLoadingState'

interface SearchFilters {
  search: string
  estado: string
  zona: string
  origen: string
  ingresoMin: string
  ingresoMax: string
  fechaDesde: string
  fechaHasta: string
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void
  onClear: () => void
  loading?: boolean
  totalResults?: number
}

const ESTADOS = [
  'NUEVO',
  'PREAPROBADO', 
  'RECHAZADO',
  'EN_REVISION',
  'DOC_PENDIENTE',
  'DERIVADO'
]

const ORIGENES = [
  'WhatsApp',
  'Facebook',
  'Instagram',
  'Google Ads',
  'Referido',
  'Llamada directa',
  'Web',
  'Otro'
]

export default function AdvancedSearch({
  onSearch,
  onClear,
  loading = false,
  totalResults = 0
}: AdvancedSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    estado: '',
    zona: '',
    origen: '',
    ingresoMin: '',
    ingresoMax: '',
    fechaDesde: '',
    fechaHasta: ''
  })

  const { isLoading: isSearching, debouncedExecute } = useDebouncedLoading(500)

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSearch = async () => {
    await debouncedExecute(async () => {
      onSearch(filters)
    })
  }

  const handleClear = () => {
    setFilters({
      search: '',
      estado: '',
      zona: '',
      origen: '',
      ingresoMin: '',
      ingresoMax: '',
      fechaDesde: '',
      fechaHasta: ''
    })
    onClear()
  }

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value.trim() !== '').length
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-lg">Búsqueda de Leads</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {totalResults > 0 && (
              <span className="text-sm text-gray-600">
                {totalResults} resultado{totalResults !== 1 ? 's' : ''}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {isExpanded ? 'Ocultar filtros' : 'Filtros avanzados'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Búsqueda básica - siempre visible */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre, teléfono, email o DNI..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full"
            />
          </div>
          <LoadingButton
            onClick={handleSearch}
            loading={loading || isSearching}
            loadingText="Buscando..."
          >
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </LoadingButton>
          {activeFiltersCount > 0 && (
            <Button variant="outline" onClick={handleClear}>
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
          {(loading || isSearching) && (
            <div className="flex items-center text-sm text-gray-600">
              <LoadingSpinner size="sm" className="mr-2" />
              Buscando leads...
            </div>
          )}
        </div>

        {/* Filtros avanzados - expandibles */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            {/* Estado */}
            <div>
              <Label htmlFor="estado" className="flex items-center space-x-1">
                <span>Estado</span>
              </Label>
              <Select value={filters.estado} onValueChange={(value) => handleFilterChange('estado', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  {ESTADOS.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Zona de Formosa */}
            <div>
              <Label htmlFor="zona" className="flex items-center space-x-1">
                <MapPin className="h-3 w-3" />
                <span>Zona de Formosa</span>
              </Label>
              <Select value={filters.zona} onValueChange={(value) => handleFilterChange('zona', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las zonas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las zonas</SelectItem>
                  {FORMOSA_ZONES.map((zona) => (
                    <SelectItem key={zona} value={zona}>
                      {zona}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Origen */}
            <div>
              <Label htmlFor="origen">Origen</Label>
              <Select value={filters.origen} onValueChange={(value) => handleFilterChange('origen', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los orígenes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los orígenes</SelectItem>
                  {ORIGENES.map((origen) => (
                    <SelectItem key={origen} value={origen}>
                      {origen}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rango de ingresos */}
            <div>
              <Label className="flex items-center space-x-1">
                <DollarSign className="h-3 w-3" />
                <span>Ingresos mensuales</span>
              </Label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={filters.ingresoMin}
                  onChange={(e) => handleFilterChange('ingresoMin', e.target.value)}
                  className="w-full"
                />
                <Input
                  type="number"
                  placeholder="Máx"
                  value={filters.ingresoMax}
                  onChange={(e) => handleFilterChange('ingresoMax', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Rango de fechas */}
            <div className="md:col-span-2">
              <Label className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Fecha de creación</span>
              </Label>
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                  className="w-full"
                />
                <span className="flex items-center text-gray-500">hasta</span>
                <Input
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
