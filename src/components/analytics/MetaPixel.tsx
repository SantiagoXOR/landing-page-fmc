'use client'

import Script from 'next/script'
import { useEffect } from 'react'

interface MetaPixelProps {
  pixelId: string
}

// Declarar tipos para el objeto fbq
declare global {
  interface Window {
    fbq: any
    _fbq: any
  }
}

/**
 * Componente para integrar Meta Pixel (Facebook Pixel)
 * @param pixelId - Tu ID de Pixel de Meta (solo números)
 */
export default function MetaPixel({ pixelId }: MetaPixelProps) {
  useEffect(() => {
    if (!pixelId || pixelId === 'YOUR_PIXEL_ID') {
      console.warn('Meta Pixel: ID no configurado')
      return
    }

    // Inicializar el pixel solo una vez
    if (typeof window !== 'undefined' && !window.fbq) {
      // @ts-ignore - Facebook Pixel código inline
      // eslint-disable-next-line
      !(function (f: any, b: any, e: any, v: any, n: any, t: any, s: any) {
        if (f.fbq) return
        // @ts-ignore
        n = f.fbq = function () {
          n.callMethod
            ? n.callMethod.apply(n, arguments)
            : n.queue.push(arguments)
        }
        if (!f._fbq) f._fbq = n
        n.push = n
        n.loaded = !0
        n.version = '2.0'
        n.queue = []
        t = b.createElement(e)
        t.async = !0
        t.src = v
        s = b.getElementsByTagName(e)[0]
        s.parentNode.insertBefore(t, s)
      })(
        window,
        document,
        'script',
        'https://connect.facebook.net/en_US/fbevents.js'
      )

      window.fbq('init', pixelId)
      window.fbq('track', 'PageView')
    }
  }, [pixelId])

  if (!pixelId || pixelId === 'YOUR_PIXEL_ID') {
    return null
  }

  return (
    <>
      {/* Noscript fallback para Meta Pixel */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}

/**
 * Función auxiliar para rastrear eventos personalizados en Meta
 * @example
 * trackMetaEvent('Lead', { content_name: 'Formulario Contacto' })
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, any>
) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params)
  }
}

/**
 * Eventos estándar de Meta Pixel
 */
export const MetaEvents = {
  /**
   * Rastrear cuando un usuario ve contenido
   */
  ViewContent: (params?: { content_name?: string; value?: number; currency?: string }) => {
    trackMetaEvent('ViewContent', params)
  },

  /**
   * Rastrear cuando un usuario genera un lead
   */
  Lead: (params?: { content_name?: string; value?: number; currency?: string }) => {
    trackMetaEvent('Lead', params)
  },

  /**
   * Rastrear cuando un usuario completa un registro
   */
  CompleteRegistration: (params?: { status?: string; value?: number }) => {
    trackMetaEvent('CompleteRegistration', params)
  },

  /**
   * Rastrear cuando un usuario inicia un proceso de checkout
   */
  InitiateCheckout: (params?: { value?: number; currency?: string; num_items?: number }) => {
    trackMetaEvent('InitiateCheckout', params)
  },

  /**
   * Rastrear compras
   */
  Purchase: (params: {
    value: number
    currency: string
    content_type?: string
    contents?: any[]
  }) => {
    trackMetaEvent('Purchase', params)
  },

  /**
   * Rastrear cuando un usuario busca algo
   */
  Search: (params?: { search_string?: string }) => {
    trackMetaEvent('Search', params)
  },

  /**
   * Rastrear cuando un usuario agrega algo al carrito
   */
  AddToCart: (params?: {
    content_name?: string
    value?: number
    currency?: string
    content_type?: string
  }) => {
    trackMetaEvent('AddToCart', params)
  },

  /**
   * Rastrear cuando un usuario envía un formulario de contacto
   */
  Contact: (params?: { content_name?: string }) => {
    trackMetaEvent('Contact', params)
  },
}

