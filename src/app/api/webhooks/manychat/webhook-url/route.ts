import { NextResponse } from 'next/server'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

/**
 * GET /api/webhooks/manychat/webhook-url
 * Endpoint para obtener la URL del webhook en producción
 */
export async function GET() {
  try {
    // Determinar la URL base según el entorno
    let baseUrl = ''
    
    if (process.env.NEXTAUTH_URL) {
      baseUrl = process.env.NEXTAUTH_URL
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    } else {
      // Fallback a dominio conocido
      baseUrl = 'https://www.formosafmc.com.ar'
    }
    
    const webhookUrl = `${baseUrl}/api/webhooks/manychat`
    
    return NextResponse.json({
      webhookUrl,
      baseUrl,
      environment: process.env.APP_ENV || process.env.NODE_ENV || 'unknown',
      vercelUrl: process.env.VERCEL_URL || null,
      nextAuthUrl: process.env.NEXTAUTH_URL || null,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error obteniendo URL del webhook', message: error.message },
      { status: 500 }
    )
  }
}

