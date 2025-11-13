import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

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

// Simulación de cliente de base de datos
// En producción esto debería usar Prisma o el cliente de Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

interface Lead {
  id: string
  nombre: string
  telefono: string
  email?: string
  estado: string
  origen?: string
  createdAt: string
}

async function fetchFromSupabase(table: string, query: string = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`
  
  const response = await fetch(url, {
    headers: {
      'apikey': SERVICE_ROLE_KEY || '',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Error fetching ${table}: ${response.statusText}`)
  }

  return response.json()
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

    // Obtener todos los leads
    const leads: Lead[] = await fetchFromSupabase('Lead', '?select=*&order=createdAt.desc')

    // Calcular fechas
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

    // Generar datos de tendencia para los últimos 7 días
    const trendData = []
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

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
