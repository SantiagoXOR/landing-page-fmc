import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/trpc'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { TRPCError } from '@trpc/server'
import { createCacheMiddleware, CacheConfigs } from '@/server/middleware/cache'

// Simulación de cliente de base de datos
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

interface DashboardMetrics {
  totalLeads: number
  newLeadsToday: number
  conversionRate: number
  activeLeads: number
  leadsBySource: Array<{ source: string; count: number }>
  leadsByStatus: Array<{ status: string; count: number }>
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    leadId?: string
  }>
  monthlyTrends: Array<{
    month: string
    leads: number
    conversions: number
  }>
}

// Función auxiliar para obtener métricas
async function getDashboardMetrics(dateFrom?: string, dateTo?: string): Promise<DashboardMetrics> {
  try {
    // Simulación de datos - en producción esto vendría de Supabase
    const mockLeads: Lead[] = [
      {
        id: '1',
        nombre: 'Juan Pérez',
        telefono: '+5491155556789',
        email: 'juan@example.com',
        estado: 'nuevo',
        origen: 'WhatsApp',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        nombre: 'María García',
        telefono: '+5491155556790',
        email: 'maria@example.com',
        estado: 'contactado',
        origen: 'Facebook',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      },
      {
        id: '3',
        nombre: 'Carlos López',
        telefono: '+5491155556791',
        estado: 'calificado',
        origen: 'Web',
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      },
    ]

    const today = new Date().toDateString()
    const newLeadsToday = mockLeads.filter(
      (lead) => new Date(lead.createdAt).toDateString() === today
    ).length

    const leadsBySource = mockLeads.reduce((acc, lead) => {
      const source = lead.origen || 'Unknown'
      const existing = acc.find((item) => item.source === source)
      if (existing) {
        existing.count++
      } else {
        acc.push({ source, count: 1 })
      }
      return acc
    }, [] as Array<{ source: string; count: number }>)

    const leadsByStatus = mockLeads.reduce((acc, lead) => {
      const existing = acc.find((item) => item.status === lead.estado)
      if (existing) {
        existing.count++
      } else {
        acc.push({ status: lead.estado, count: 1 })
      }
      return acc
    }, [] as Array<{ status: string; count: number }>)

    const recentActivity = [
      {
        id: '1',
        type: 'lead_created',
        description: 'Nuevo lead creado: Juan Pérez',
        timestamp: new Date().toISOString(),
        leadId: '1',
      },
      {
        id: '2',
        type: 'lead_updated',
        description: 'Lead actualizado: María García',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        leadId: '2',
      },
    ]

    const monthlyTrends = [
      { month: 'Enero', leads: 45, conversions: 12 },
      { month: 'Febrero', leads: 52, conversions: 15 },
      { month: 'Marzo', leads: 38, conversions: 10 },
      { month: 'Abril', leads: 61, conversions: 18 },
      { month: 'Mayo', leads: 49, conversions: 14 },
      { month: 'Junio', leads: 55, conversions: 16 },
    ]

    return {
      totalLeads: mockLeads.length,
      newLeadsToday,
      conversionRate: 28.5, // Porcentaje simulado
      activeLeads: mockLeads.filter((lead) => lead.estado !== 'cerrado').length,
      leadsBySource,
      leadsByStatus,
      recentActivity,
      monthlyTrends,
    }
  } catch (error) {
    logger.error('Error fetching dashboard metrics:', error)
    throw error
  }
}

export const dashboardRouter = createTRPCRouter({
  // Get dashboard metrics
  getMetrics: protectedProcedure
    .use(createCacheMiddleware(CacheConfigs.dashboardMetrics))
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Check permissions
        checkPermission(ctx.session.user.role, 'dashboard:read')

        const metrics = await getDashboardMetrics(input.dateFrom, input.dateTo)

        logger.info('Dashboard metrics retrieved', {
          userId: ctx.session.user.id,
          dateRange: { from: input.dateFrom, to: input.dateTo },
        })

        return metrics
      } catch (error: any) {
        logger.error('Error fetching dashboard metrics:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch dashboard metrics' })
      }
    }),

  // Get recent activity
  getRecentActivity: protectedProcedure
    .use(createCacheMiddleware(CacheConfigs.dashboardActivity))
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        checkPermission(ctx.session.user.role, 'dashboard:read')

        // Simulación de actividad reciente
        const recentActivity = [
          {
            id: '1',
            type: 'lead_created',
            description: 'Nuevo lead creado: Juan Pérez',
            timestamp: new Date().toISOString(),
            leadId: '1',
            user: 'Admin User',
          },
          {
            id: '2',
            type: 'lead_updated',
            description: 'Lead actualizado: María García - Estado cambiado a "contactado"',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            leadId: '2',
            user: 'Sales User',
          },
          {
            id: '3',
            type: 'pipeline_moved',
            description: 'Lead movido en pipeline: Carlos López',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            leadId: '3',
            user: 'Manager User',
          },
        ].slice(0, input.limit)

        return recentActivity
      } catch (error: any) {
        logger.error('Error fetching recent activity:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch recent activity' })
      }
    }),

  // Get performance summary
  getPerformanceSummary: protectedProcedure
    .use(createCacheMiddleware(CacheConfigs.dashboardPerformance))
    .input(
      z.object({
        period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        checkPermission(ctx.session.user.role, 'dashboard:read')

        // Simulación de resumen de performance
        const performanceSummary = {
          period: input.period,
          totalLeads: 156,
          convertedLeads: 42,
          conversionRate: 26.9,
          averageResponseTime: '2.3 horas',
          topPerformer: {
            name: 'Sales User',
            conversions: 18,
          },
          trends: {
            leadsGrowth: 12.5, // Porcentaje de crecimiento
            conversionGrowth: 8.3,
            responseTimeImprovement: -15.2, // Negativo significa mejora
          },
        }

        return performanceSummary
      } catch (error: any) {
        logger.error('Error fetching performance summary:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch performance summary' })
      }
    }),
})