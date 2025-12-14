'use client'

import { useEffect, useRef, useState } from 'react'
import { type Dealer, getWhatsAppUrl } from '@/lib/dealers-data'
import { DEFAULT_MAP_CONFIG, isGoogleMapsConfigured, getGoogleMapsApiKey } from '@/lib/google-maps'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, MessageCircle, ExternalLink, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

interface DealersMapProps {
  dealers: Dealer[]
  center?: { lat: number; lng: number }
  zoom?: number
  onMarkerClick?: (dealer: Dealer) => void
  className?: string
}

export function DealersMap({
  dealers,
  center = DEFAULT_MAP_CONFIG.center,
  zoom = DEFAULT_MAP_CONFIG.zoom,
  onMarkerClick,
  className
}: DealersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infoWindowsRef = useRef<any[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filtrar dealers con coordenadas
  const dealersWithCoords = dealers.filter(
    dealer => dealer.latitude !== undefined && dealer.longitude !== undefined
  )

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setLoadError('Google Maps no está configurado')
      return
    }

    // Verificar si Google Maps ya está cargado
    if (window.google && window.google.maps) {
      initializeMap()
      return
    }

    // Cargar script de Google Maps
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${getGoogleMapsApiKey()}&libraries=places&callback=initMap`
    script.async = true
    script.defer = true

    window.initMap = () => {
      setIsLoaded(true)
      initializeMap()
    }

    script.onerror = () => {
      setLoadError('Error al cargar Google Maps')
    }

    document.head.appendChild(script)

    return () => {
      // Limpiar
      if (window.initMap) {
        delete window.initMap
      }
      // Remover script si existe
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`)
      if (existingScript) {
        document.head.removeChild(existingScript)
      }
    }
  }, [])

  useEffect(() => {
    if (isLoaded && mapInstanceRef.current) {
      updateMarkers()
    }
  }, [dealersWithCoords, isLoaded])

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeControl: DEFAULT_MAP_CONFIG.mapTypeControl,
      streetViewControl: DEFAULT_MAP_CONFIG.streetViewControl,
      fullscreenControl: DEFAULT_MAP_CONFIG.fullscreenControl,
      zoomControl: DEFAULT_MAP_CONFIG.zoomControl,
      styles: []
    })

    mapInstanceRef.current = map
    updateMarkers()
  }

  const createInfoWindowContent = (dealer: Dealer): string => {
    const waUrl = getWhatsAppUrl(dealer)
    const googleMapsUrl = dealer.placeId
      ? `https://www.google.com/maps/place/?q=place_id:${dealer.placeId}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dealer.address + ', Formosa, Argentina')}`

    return `
      <div style="min-width: 250px; max-width: 300px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #6B21A8;">
            ${dealer.name}
          </h3>
          ${dealer.zone ? `<span style="display: inline-block; padding: 2px 8px; background: ${dealer.zone === 'Capital' ? '#10B981' : '#3B82F6'}; color: white; border-radius: 12px; font-size: 11px; font-weight: 600; margin-bottom: 8px;">${dealer.zone}</span>` : ''}
        </div>
        <div style="margin-bottom: 8px; color: #6B7280; font-size: 14px;">
          <div style="display: flex; align-items: start; gap: 6px; margin-bottom: 6px;">
            <span style="color: #3B82F6;">📍</span>
            <span>${dealer.address}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="color: #3B82F6;">📞</span>
            <a href="tel:${dealer.phone.replace(/\D/g, '')}" style="color: #3B82F6; text-decoration: none;">${dealer.phone}</a>
          </div>
          ${dealer.rating ? `
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
              <span style="color: #FBBF24;">⭐</span>
              <span style="font-weight: 600;">${dealer.rating.toFixed(1)}</span>
              ${dealer.openingHours?.openNow !== undefined ? `
                <span style="margin-left: 8px; padding: 2px 6px; background: ${dealer.openingHours.openNow ? '#10B981' : '#EF4444'}; color: white; border-radius: 8px; font-size: 10px; font-weight: 600;">
                  ${dealer.openingHours.openNow ? 'Abierto' : 'Cerrado'}
                </span>
              ` : ''}
            </div>
          ` : ''}
        </div>
        ${dealer.brands.length > 0 ? `
          <div style="margin-bottom: 8px;">
            <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 4px; text-transform: uppercase; font-weight: 600;">Marcas</div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${dealer.brands.map(brand => `
                <span style="padding: 2px 6px; background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 6px; font-size: 11px; color: #6B7280;">
                  ${brand}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <a href="${waUrl}" target="_blank" rel="noopener noreferrer" 
             style="flex: 1; display: inline-block; padding: 8px 12px; background: #25D366; color: white; text-align: center; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">
            WhatsApp
          </a>
          <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer"
             style="flex: 1; display: inline-block; padding: 8px 12px; background: #6B7280; color: white; text-align: center; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">
            Ver en Maps
          </a>
        </div>
      </div>
    `
  }

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !window.google) return

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => marker.setMap(null))
    infoWindowsRef.current.forEach(infoWindow => infoWindow.close())
    markersRef.current = []
    infoWindowsRef.current = []

    // Crear nuevos marcadores
    dealersWithCoords.forEach(dealer => {
      if (dealer.latitude === undefined || dealer.longitude === undefined) return

      const marker = new window.google.maps.Marker({
        position: { lat: dealer.latitude, lng: dealer.longitude },
        map: mapInstanceRef.current,
        title: dealer.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: dealer.zone === 'Capital' ? '#10B981' : '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        }
      })

      const infoWindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(dealer)
      })

      marker.addListener('click', () => {
        // Cerrar otros info windows
        infoWindowsRef.current.forEach(iw => iw.close())
        
        infoWindow.open(mapInstanceRef.current, marker)
        
        if (onMarkerClick) {
          onMarkerClick(dealer)
        }
      })

      markersRef.current.push(marker)
      infoWindowsRef.current.push(infoWindow)
    })

    // Ajustar bounds para mostrar todos los marcadores
    if (markersRef.current.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getPosition())
      })
      mapInstanceRef.current.fitBounds(bounds)
      
      // Ajustar zoom máximo si es necesario
      const listener = window.google.maps.event.addListener(
        mapInstanceRef.current,
        'bounds_changed',
        () => {
          if (mapInstanceRef.current.getZoom() > DEFAULT_MAP_CONFIG.maxZoom) {
            mapInstanceRef.current.setZoom(DEFAULT_MAP_CONFIG.maxZoom)
          }
          window.google.maps.event.removeListener(listener)
        }
      )
    }
  }

  if (loadError) {
    return (
      <div className={cn("flex items-center justify-center h-96 bg-gray-100 rounded-lg", className)}>
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-acto-regular">{loadError}</p>
        </div>
      </div>
    )
  }

  if (dealersWithCoords.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-96 bg-gray-100 rounded-lg", className)}>
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-acto-regular">
            No hay concesionarias con coordenadas para mostrar en el mapa
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full h-96 rounded-lg overflow-hidden border border-fmc-purple/20", className)}>
      <div ref={mapRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fmc-purple mx-auto mb-2"></div>
            <p className="text-gray-600 font-acto-regular text-sm">Cargando mapa...</p>
          </div>
        </div>
      )}
    </div>
  )
}
