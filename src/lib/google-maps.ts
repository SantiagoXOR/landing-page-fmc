// Configuración y helpers para Google Maps

// Coordenadas de Formosa Capital (centro por defecto)
export const FORMOSA_CENTER = {
  lat: -26.1849,
  lng: -58.1731
}

// Configuración por defecto del mapa
export const DEFAULT_MAP_CONFIG = {
  center: FORMOSA_CENTER,
  zoom: 12,
  minZoom: 10,
  maxZoom: 18,
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true
}

// Estilos del mapa (opcional - tema personalizado)
export const MAP_STYLES = [
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'on' }]
  },
  {
    featureType: 'poi.park',
    stylers: [{ visibility: 'off' }]
  }
]

/**
 * Obtiene la API key de Google Maps para el frontend
 */
export function getGoogleMapsApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no está configurada')
    return ''
  }
  return apiKey
}

/**
 * Verifica si Google Maps está configurado
 */
export function isGoogleMapsConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
}

/**
 * Genera la URL del script de Google Maps JavaScript API
 */
export function getGoogleMapsScriptUrl(libraries: string[] = ['places']): string {
  const apiKey = getGoogleMapsApiKey()
  const librariesParam = libraries.length > 0 ? `&libraries=${libraries.join(',')}` : ''
  return `https://maps.googleapis.com/maps/api/js?key=${apiKey}${librariesParam}&callback=initMap`
}

/**
 * Tipo para coordenadas
 */
export interface Coordinates {
  lat: number
  lng: number
}

/**
 * Calcula la distancia entre dos puntos en kilómetros (fórmula de Haversine)
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371 // Radio de la Tierra en kilómetros
  const dLat = toRadians(point2.lat - point1.lat)
  const dLng = toRadians(point2.lng - point1.lng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
      Math.cos(toRadians(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Formatea la distancia para mostrar
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`
  }
  return `${distanceKm.toFixed(1)} km`
}

/**
 * Obtiene el zoom apropiado basado en el número de marcadores
 */
export function getOptimalZoom(markerCount: number): number {
  if (markerCount === 0) return DEFAULT_MAP_CONFIG.zoom
  if (markerCount === 1) return 15
  if (markerCount <= 5) return 13
  if (markerCount <= 10) return 12
  return 11
}
