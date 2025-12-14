'use client'

import { useState, useMemo } from 'react'
import { DEALERS, type Dealer } from '@/lib/dealers-data'
import { DealerCard } from '@/components/concesionarias/DealerCard'
import { DealerFilters } from '@/components/concesionarias/DealerFilters'
import { DealersMap } from '@/components/concesionarias/DealersMap'
import { MapPin } from 'lucide-react'

export default function ConcesionariasPage() {
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null)

  // Filtrar concesionarias según los filtros activos
  const filteredDealers = useMemo(() => {
    return DEALERS.filter((dealer) => {
      // Filtro por zona
      if (zoneFilter !== 'all' && dealer.zone !== zoneFilter) {
        return false
      }

      // Filtro por marca
      if (brandFilter !== 'all' && !dealer.brands.includes(brandFilter)) {
        return false
      }

      // Búsqueda por nombre
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim()
        const nameMatch = dealer.name.toLowerCase().includes(query)
        if (!nameMatch) {
          return false
        }
      }

      return true
    })
  }, [zoneFilter, brandFilter, searchQuery])

  const handleClearFilters = () => {
    setZoneFilter('all')
    setBrandFilter('all')
    setSearchQuery('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-fmc-purple to-fmc-blue text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-acto-bold mb-4">
              Concesionarias Asociadas
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-acto-regular">
              Encontrá la concesionaria más cercana a tu ubicación en Formosa
            </p>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Filtros */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-fmc-purple/10 p-6">
          <DealerFilters
            zoneFilter={zoneFilter}
            brandFilter={brandFilter}
            searchQuery={searchQuery}
            onZoneChange={setZoneFilter}
            onBrandChange={setBrandFilter}
            onSearchChange={setSearchQuery}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Contador de resultados */}
        <div className="mb-6">
          <p className="text-sm md:text-base text-gray-600 font-acto-regular">
            {filteredDealers.length === 0 ? (
              <span>No se encontraron concesionarias</span>
            ) : (
              <span>
                {filteredDealers.length} {filteredDealers.length === 1 ? 'concesionaria encontrada' : 'concesionarias encontradas'}
              </span>
            )}
          </p>
        </div>

        {/* Mapa y lista de concesionarias */}
        {filteredDealers.length > 0 ? (
          <div className="mb-8">
            <DealersMap 
              dealers={filteredDealers}
              selectedDealer={selectedDealer}
              className="mb-6"
            />
            {/* Grid de cards debajo del mapa */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDealers.map((dealer) => (
                <DealerCard 
                  key={`${dealer.name}-${dealer.phone}`} 
                  dealer={dealer}
                  isSelected={selectedDealer?.name === dealer.name}
                  onClick={() => setSelectedDealer(dealer)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-fmc-purple/10 p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-acto-bold text-gray-700 mb-2">
              No se encontraron concesionarias
            </h3>
            <p className="text-gray-500 font-acto-regular mb-6">
              Intenta ajustar los filtros para ver más resultados
            </p>
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center px-4 py-2 bg-fmc-purple text-white rounded-md hover:bg-fmc-purple/90 transition-colors font-acto-semibold"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-fmc-purple/10 p-6 md:p-8">
          <h2 className="text-2xl font-acto-bold text-fmc-purple mb-4">
            ¿Necesitás ayuda?
          </h2>
          <p className="text-gray-600 font-acto-regular mb-4">
            Si no encontrás la concesionaria que buscás o tenés alguna consulta, podés contactarnos directamente.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="https://wa.me/5493704069592"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 bg-[#25D366] text-white rounded-md hover:bg-[#20BA5A] transition-colors font-acto-semibold"
            >
              Contactar por WhatsApp
            </a>
            <a
              href="tel:+543704069592"
              className="inline-flex items-center justify-center px-6 py-3 bg-fmc-purple text-white rounded-md hover:bg-fmc-purple/90 transition-colors font-acto-semibold"
            >
              Llamar ahora
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
