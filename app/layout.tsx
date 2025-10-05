import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Formosa Moto Crédito - Financiación de Motos en Formosa',
  description: 'Conseguí la moto de tus sueños con Formosa Moto Crédito. Financiación rápida y fácil para Honda, Yamaha, Zanella y más marcas. Cuotas accesibles y proceso 100% digital.',
  keywords: 'motos formosa, credito motos, financiacion motos, honda formosa, yamaha formosa, zanella formosa, moto credito, cuotas motos',
  authors: [{ name: 'Formosa Moto Crédito' }],
  creator: 'Formosa Moto Crédito',
  publisher: 'Formosa Moto Crédito',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: 'https://formosamoto.com',
    siteName: 'Formosa Moto Crédito',
    title: 'Formosa Moto Crédito - Financiación de Motos en Formosa',
    description: 'Conseguí la moto de tus sueños con Formosa Moto Crédito. Financiación rápida y fácil para Honda, Yamaha, Zanella y más marcas.',
    images: [
      {
        url: '/logofmc.svg',
        width: 1200,
        height: 630,
        alt: 'Formosa Moto Crédito - Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Formosa Moto Crédito - Financiación de Motos',
    description: 'Conseguí la moto de tus sueños con financiación rápida y fácil. Cuotas accesibles y proceso 100% digital.',
    images: ['/logofmc.svg'],
  },
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#5b00ea',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/logofmcsimple.svg" type="image/svg+xml" />
        <link rel="canonical" href="https://formosamoto.com" />
        <meta name="geo.region" content="AR-P" />
        <meta name="geo.placename" content="Formosa, Argentina" />
        <meta name="geo.position" content="-26.1775;-58.1781" />
        <meta name="ICBM" content="-26.1775, -58.1781" />
      </head>
      <body className="font-acto antialiased bg-white text-gray-900">
        {children}
        <Toaster position="top-right" />
        <Analytics />
      </body>
    </html>
  )
}
