import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// Forzar renderizado dinámico (usa headers y session)
export const dynamic = 'force-dynamic'

/**
 * @swagger
 * /api/dashboard/metrics:
 *   get:
 *     summary: Get dashboard metrics
 *     description: Retrieves key performance metrics for the dashboard
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Metrics'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Configuración de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

interface Lead {
  id: string
  nombre: string
  telefono: string
  email?: string
  estado: string
  origen?: string
  createdAt: string
}

/**
 * Valida que las variables de Supabase estén configuradas
 */
function validateSupabaseConfig(): { isValid: boolean; error?: string } {
  if (!SUPABASE_URL) {
    return {
      isValid: false,
      error: 'NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL no está configurada. Por favor, verifica tus variables de entorno.'
    }
  }

  if (!SERVICE_ROLE_KEY) {
    return {
      isValid: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SERVICE_KEY no está configurada. Por favor, verifica tus variables de entorno.'
    }
  }

  // Validar formato de URL
  try {
    new URL(SUPABASE_URL)
  } catch {
    return {
      isValid: false,
      error: `SUPABASE_URL tiene un formato inválido: ${SUPABASE_URL}`
    }
  }

  return { isValid: true }
}

/**
 * Retorna métricas vacías como fallback
 */
function getEmptyMetrics() {
  return {
    totalLeads: 0,
    newLeadsToday: 0,
    conversionRate: 0,
    leadsThisWeek: 0,
    leadsThisMonth: 0,
    leadsByStatus: {} as Record<string, number>,
    recentLeads: [],
    trendData: Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return {
        date: date.toISOString().split('T')[0],
        leads: 0,
        conversions: 0
      }
    })
  }
}

async function fetchFromSupabase(table: string, query: string = '') {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Supabase no está configurado correctamente')
  }

  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`Error fetching ${table}: ${response.status} ${errorText}`)
    }

    return response.json()
  } catch (error: any) {
    // Capturar errores de conexión específicos
    if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo')) {
      throw new Error(`No se pudo conectar a Supabase. Verifica que la URL ${SUPABASE_URL} sea correcta y que el proyecto exista.`)
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)

    // Permitir acceso sin autenticación en modo testing
    const isTestingMode = process.env.TESTING_MODE === 'true'

    if (!session && !isTestingMode) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener parámetros de fecha de la query string
    const { searchParams } = new URL(request.url)
    const dateFromParam = searchParams.get('dateFrom')
    const dateToParam = searchParams.get('dateTo')

    // Validar configuración de Supabase
    const configValidation = validateSupabaseConfig()
    if (!configValidation.isValid) {
      console.warn('Supabase no configurado correctamente:', configValidation.error)
      // Retornar métricas vacías en lugar de error 500
      return NextResponse.json({
        ...getEmptyMetrics(),
        warning: 'Supabase no está configurado. Mostrando métricas vacías.'
      })
    }

    // Obtener todos los leads
    let leads: Lead[] = []
    try {
      leads = await fetchFromSupabase('Lead', '?select=*&order=createdAt.desc')
    } catch (supabaseError: any) {
      console.error('Error conectando a Supabase:', supabaseError.message)
      // Retornar métricas vacías en lugar de error 500
      return NextResponse.json({
        ...getEmptyMetrics(),
        warning: `No se pudo conectar a Supabase: ${supabaseError.message}`
      })
    }

    // Filtrar leads por rango de fechas si se proporcionan
    if (dateFromParam && dateToParam) {
      const dateFrom = new Date(dateFromParam)
      const dateTo = new Date(dateToParam)
      // Ajustar dateTo al final del día
      dateTo.setHours(23, 59, 59, 999)
      
      leads = leads.filter(lead => {
        const leadDate = new Date(lead.createdAt)
        return leadDate >= dateFrom && leadDate <= dateTo
      })
    }

    // Calcular fechas para métricas relativas
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Calcular métricas
    const totalLeads = leads.length

    const newLeadsToday = leads.filter(lead => {
      const leadDate = new Date(lead.createdAt)
      return leadDate >= today
    }).length

    const leadsThisWeek = leads.filter(lead => {
      const leadDate = new Date(lead.createdAt)
      return leadDate >= weekAgo
    }).length

    const leadsThisMonth = leads.filter(lead => {
      const leadDate = new Date(lead.createdAt)
      return leadDate >= monthAgo
    }).length

    // Calcular tasa de conversión (preaprobados / total)
    const preaprobados = leads.filter(lead => lead.estado === 'PREAPROBADO').length
    const conversionRate = totalLeads > 0 ? (preaprobados / totalLeads) * 100 : 0

    // Agrupar leads por estado
    const leadsByStatus = leads.reduce((acc, lead) => {
      acc[lead.estado] = (acc[lead.estado] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Obtener leads recientes (últimos 10)
    const recentLeads = leads.slice(0, 10).map(lead => ({
      id: lead.id,
      nombre: lead.nombre,
      telefono: lead.telefono,
      email: lead.email,
      estado: lead.estado,
      origen: lead.origen,
      createdAt: lead.createdAt
    }))

    // Generar datos de tendencia según el rango de fechas
    let trendData = []
    
    if (dateFromParam && dateToParam) {
      // Si hay un rango específico, generar datos para ese rango
      const dateFrom = new Date(dateFromParam)
      const dateTo = new Date(dateToParam)
      const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (24 * 60 * 60 * 1000))
      const maxDays = Math.min(daysDiff, 30) // Limitar a 30 días máximo para evitar arrays muy grandes
      
      const startDate = new Date(dateFrom)
      startDate.setHours(0, 0, 0, 0)
      
      for (let i = 0; i <= maxDays; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]

        const dayLeads = leads.filter(lead => {
          const leadDate = new Date(lead.createdAt).toISOString().split('T')[0]
          return leadDate === dateStr
        })

        const dayConversions = dayLeads.filter(lead => lead.estado === 'PREAPROBADO')

        trendData.push({
          date: dateStr,
          leads: dayLeads.length,
          conversions: dayConversions.length
        })
      }
    } else {
      // Por defecto, últimos 7 días
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]

        const dayLeads = leads.filter(lead => {
          const leadDate = new Date(lead.createdAt).toISOString().split('T')[0]
          return leadDate === dateStr
        })

        const dayConversions = dayLeads.filter(lead => lead.estado === 'PREAPROBADO')

        trendData.push({
          date: dateStr,
          leads: dayLeads.length,
          conversions: dayConversions.length
        })
      }
    }

    const metrics = {
      totalLeads,
      newLeadsToday,
      conversionRate,
      leadsThisWeek,
      leadsThisMonth,
      leadsByStatus,
      recentLeads,
      trendData
    }

    return NextResponse.json(metrics)

  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error)
    
    // Si es un error de configuración, retornar métricas vacías
    if (error.message?.includes('no está configurada') || 
        error.message?.includes('formato inválido') ||
        error.message?.includes('No se pudo conectar')) {
      return NextResponse.json({
        ...getEmptyMetrics(),
        warning: error.message || 'Error de configuración de Supabase'
      })
    }
    
    // Para otros errores, retornar error 500 pero con mensaje claro
    return NextResponse.json(
      { 
        error: 'Error al obtener métricas',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
