import type { Metadata } from 'next'
import Providers from '@/components/providers'
import { SentryErrorBoundary } from '@/components/monitoring/PerformanceWrapper'
import Analytics from '@/components/analytics'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.formosafmc.com.ar'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Créditos para Motos | Formosa FMC - Financiá hasta 36 meses',
    template: '%s | Formosa FMC'
  },
  description: 'Con los mejores créditos, la moto de tus sueños está a solo un paso. Financiá en hasta 36 meses (UVA o tasa fija). Obtené la aprobación en minutos.',
  keywords: [
    'créditos motos',
    'financiación motos',
    'Banco Formosa',
    'crédito prendario',
    'motos Formosa',
    'crédito motocicleta',
    'financiación vehículos',
    'préstamo prendario',
    'crédito inmediato',
    'motos en cuotas',
    'financiación hasta 36 meses',
    'tasa fija motos',
    'UVA motos',
    'Formosa FMC'
  ],
  authors: [{ name: 'Formosa FMC' }],
  creator: 'Formosa FMC',
  publisher: 'Formosa FMC',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: siteUrl,
    siteName: 'Formosa FMC',
    title: 'Créditos para Motos | Formosa FMC - Financiá hasta 36 meses',
    description: 'Con los mejores créditos, la moto de tus sueños está a solo un paso. Financiá en hasta 36 meses (UVA o tasa fija). Obtené la aprobación en minutos.',
    images: [
      {
        url: '/landing/seo/og-image-1.png',
        width: 1200,
        height: 630,
        alt: 'Formosa FMC - Créditos para Motos',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Créditos para Motos | Formosa FMC',
    description: 'Con los mejores créditos, la moto de tus sueños está a solo un paso. Financiá en hasta 36 meses (UVA o tasa fija).',
    images: [
      {
        url: '/landing/seo/twitter-image-1.png',
        width: 1200,
        height: 600,
        alt: 'Formosa FMC - Créditos para Motos',
      },
    ],
    creator: '@formosafmc',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'icon', url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: siteUrl,
  },
  category: 'financiación',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* Analytics - Meta Pixel y Google Analytics */}
        <Analytics 
          googleAnalyticsId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
          metaPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID}
        />
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FinancialService',
              name: 'Formosa FMC',
              description: 'Créditos para motos con financiación hasta 36 meses. Tasa fija o UVA. Aprobación en minutos.',
              url: siteUrl,
              logo: `${siteUrl}/landing/logofmc.svg`,
              image: `${siteUrl}/landing/seo/og-image-1.png`,
              telephone: '+543704069592',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Formosa',
                addressRegion: 'Formosa',
                addressCountry: 'AR'
              },
              offers: {
                '@type': 'Offer',
                name: 'Crédito Prendario para Motos',
                description: 'Financiación hasta 36 meses con tasa fija o UVA',
                priceCurrency: 'ARS',
                availability: 'https://schema.org/InStock'
              },
              areaServed: {
                '@type': 'State',
                name: 'Formosa'
              }
            })
          }}
        />
      </head>
      <body className="font-acto">
        <SentryErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </SentryErrorBoundary>
      </body>
    </html>
  )
}
