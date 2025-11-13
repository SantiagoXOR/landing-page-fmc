'use client'

import Script from 'next/script'

interface GoogleAnalyticsProps {
  measurementId: string
}

/**
 * Componente para integrar Google Analytics 4
 * @param measurementId - Tu ID de medición de GA4 (formato: G-XXXXXXXXXX)
 */
export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  if (!measurementId || measurementId === 'G-XXXXXXXXXX') {
    console.warn('Google Analytics: ID de medición no configurado')
    return null
  }

  return (
    <>
      {/* Google Analytics Script */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      
      {/* Configuración de Google Analytics */}
      <Script
        id="google-analytics-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
              send_page_view: true
            });
          `,
        }}
      />
    </>
  )
}

/**
 * Función auxiliar para enviar eventos personalizados a Google Analytics
 * @example
 * trackEvent('button_click', { button_name: 'contact' })
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventParams)
  }
}

/**
 * Función auxiliar para rastrear conversiones
 * @example
 * trackConversion('purchase', { value: 99.99, currency: 'ARS' })
 */
export function trackConversion(
  conversionName: string,
  params?: {
    value?: number
    currency?: string
    transaction_id?: string
    items?: any[]
  }
) {
  trackEvent(conversionName, params)
}

