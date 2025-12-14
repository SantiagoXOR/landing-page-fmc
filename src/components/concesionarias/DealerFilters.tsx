'use client'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, Filter, X } from 'lucide-react'
import { getAllBrands } from '@/lib/dealers-data'
import { cn } from '@/lib/utils'

interface DealerFiltersProps {
  zoneFilter: string
  brandFilter: string
  searchQuery: string
  onZoneChange: (zone: string) => void
  onBrandChange: (brand: string) => void
  onSearchChange: (query: string) => void
  onClearFilters: () => void
}

export function DealerFilters({
  zoneFilter,
  brandFilter,
  searchQuery,
  onZoneChange,
  onBrandChange,
  onSearchChange,
  onClearFilters,
}: DealerFiltersProps) {
  const allBrands = getAllBrands()
  const hasActiveFilters = zoneFilter !== 'all' || brandFilter !== 'all' || searchQuery !== ''

  return (
    <div className="space-y-4">
      {/* Título de filtros */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-fmc-purple" />
        <h3 className="font-acto-semibold text-fmc-purple text-lg">Filtros</h3>
      </div>

      {/* Filtros en grid responsive */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Búsqueda por nombre */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "pl-10 font-acto-regular border-fmc-purple/30 focus:border-fmc-purple focus:ring-2 focus:ring-fmc-purple/20",
              searchQuery && "border-fmc-purple"
            )}
          />
        </div>

        {/* Filtro por zona */}
        <Select value={zoneFilter} onValueChange={onZoneChange}>
          <SelectTrigger className={cn(
            "font-acto-regular border-fmc-purple/30 focus:border-fmc-purple focus:ring-2 focus:ring-fmc-purple/20",
            zoneFilter !== 'all' && "border-fmc-purple"
          )}>
            <SelectValue placeholder="Todas las zonas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las zonas</SelectItem>
            <SelectItem value="Capital">Capital</SelectItem>
            <SelectItem value="Interior">Interior</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro por marca */}
        <Select value={brandFilter} onValueChange={onBrandChange}>
          <SelectTrigger className={cn(
            "font-acto-regular border-fmc-purple/30 focus:border-fmc-purple focus:ring-2 focus:ring-fmc-purple/20",
            brandFilter !== 'all' && "border-fmc-purple"
          )}>
            <SelectValue placeholder="Todas las marcas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las marcas</SelectItem>
            {allBrands.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Botón limpiar filtros */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="font-acto-medium border-fmc-purple/30 text-fmc-purple hover:bg-fmc-purple/5"
          >
            <X className="w-4 h-4 mr-2" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
