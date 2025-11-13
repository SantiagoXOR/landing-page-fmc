/**
 * Componente central para gestionar todos los servicios de analytics
 */
'use client'

import GoogleAnalytics from './GoogleAnalytics'
import MetaPixel from './MetaPixel'

interface AnalyticsProps {
  googleAnalyticsId?: string
  metaPixelId?: string
}

/**
 * Componente que integra todos los servicios de analytics
 * Incluye Google Analytics 4 y Meta Pixel
 */
export default function Analytics({ googleAnalyticsId, metaPixelId }: AnalyticsProps) {
  return (
    <>
      {googleAnalyticsId && <GoogleAnalytics measurementId={googleAnalyticsId} />}
      {metaPixelId && <MetaPixel pixelId={metaPixelId} />}
    </>
  )
}

// Exportar componentes individuales y funciones de tracking
export { default as GoogleAnalytics, trackEvent, trackConversion } from './GoogleAnalytics'
export { default as MetaPixel, trackMetaEvent, MetaEvents } from './MetaPixel'

