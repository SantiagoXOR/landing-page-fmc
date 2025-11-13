import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/providers'
import { SentryErrorBoundary } from '@/components/monitoring/PerformanceWrapper'
import Analytics from '@/components/analytics'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Phorencial CRM',
  description: 'Sistema de gestión de leads para Phorencial',
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
      </head>
      <body className={inter.className}>
        <SentryErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </SentryErrorBoundary>
      </body>
    </html>
  )
}
