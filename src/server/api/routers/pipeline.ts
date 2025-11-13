import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/trpc'
import { pipelineService } from '@/server/services/pipeline-service'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { TRPCError } from '@trpc/server'
import { createCacheMiddleware, createCacheInvalidationMiddleware, CacheConfigs, InvalidationPatterns } from '@/server/middleware/cache'

export const pipelineRouter = createTRPCRouter({
  // Get pipeline metrics
  getMetrics: protectedProcedure
    .use(createCacheMiddleware(CacheConfigs.pipelineMetrics))
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

        const metrics = await pipelineService.getPipelineMetrics(
          input.dateFrom,
          input.dateTo
        )

        logger.info('Pipeline metrics retrieved', {
          userId: ctx.session.user.id,
          dateRange: { from: input.dateFrom, to: input.dateTo },
        })

        return metrics
      } catch (error: any) {
        logger.error('Error fetching pipeline metrics:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch pipeline metrics' })
      }
    }),

  // Get pipeline stages
  getStages: protectedProcedure
    .use(createCacheMiddleware(CacheConfigs.pipelineStages))
    .query(async ({ ctx }) => {
      try {
        checkPermission(ctx.session.user.role, 'pipeline:read')

        // Simulación de etapas del pipeline
        const stages = [
          {
            id: 'nuevo',
            name: 'Nuevo',
            description: 'Leads recién ingresados al sistema',
            order: 1,
            color: '#3B82F6',
            isActive: true,
          },
          {
            id: 'contactado',
            name: 'Contactado',
            description: 'Primer contacto realizado',
            order: 2,
            color: '#F59E0B',
            isActive: true,
          },
          {
            id: 'calificado',
            name: 'Calificado',
            description: 'Lead calificado como oportunidad',
            order: 3,
            color: '#10B981',
            isActive: true,
          },
          {
            id: 'propuesta',
            name: 'Propuesta',
            description: 'Propuesta enviada al cliente',
            order: 4,
            color: '#8B5CF6',
            isActive: true,
          },
          {
            id: 'negociacion',
            name: 'Negociación',
            description: 'En proceso de negociación',
            order: 5,
            color: '#F97316',
            isActive: true,
          },
          {
            id: 'cerrado_ganado',
            name: 'Cerrado Ganado',
            description: 'Venta exitosa',
            order: 6,
            color: '#059669',
            isActive: true,
          },
          {
            id: 'cerrado_perdido',
            name: 'Cerrado Perdido',
            description: 'Oportunidad perdida',
            order: 7,
            color: '#DC2626',
            isActive: true,
          },
        ]

        return stages
      } catch (error: any) {
        logger.error('Error fetching pipeline stages:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch pipeline stages' })
      }
    }),

  // Move lead in pipeline
  moveLead: protectedProcedure
    .use(createCacheInvalidationMiddleware(InvalidationPatterns.pipelineMutations))
    .input(
      z.object({
        leadId: z.string(),
        fromStage: z.string(),
        toStage: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        checkPermission(ctx.session.user.role, 'leads:update')

        // Simulación de movimiento en pipeline
        const transition = {
          id: `transition_${Date.now()}`,
          leadId: input.leadId,
          fromStage: input.fromStage,
          toStage: input.toStage,
          notes: input.notes,
          userId: ctx.session.user.id,
          timestamp: new Date().toISOString(),
        }

        logger.info('Lead moved in pipeline', {
          leadId: input.leadId,
          fromStage: input.fromStage,
          toStage: input.toStage,
          userId: ctx.session.user.id,
        })

        return transition
      } catch (error: any) {
        logger.error('Error moving lead in pipeline:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to move lead in pipeline' })
      }
    }),

  // Get lead history in pipeline
  getLeadHistory: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        checkPermission(ctx.session.user.role, 'leads:read')

        // Simulación de historial del lead
        const history = [
          {
            id: '1',
            leadId: input.leadId,
            fromStage: null,
            toStage: 'nuevo',
            notes: 'Lead creado en el sistema',
            userId: ctx.session.user.id,
            userName: 'Admin User',
            timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          },
          {
            id: '2',
            leadId: input.leadId,
            fromStage: 'nuevo',
            toStage: 'contactado',
            notes: 'Primer contacto realizado por WhatsApp',
            userId: ctx.session.user.id,
            userName: 'Sales User',
            timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          },
          {
            id: '3',
            leadId: input.leadId,
            fromStage: 'contactado',
            toStage: 'calificado',
            notes: 'Lead muestra interés en el producto',
            userId: ctx.session.user.id,
            userName: 'Sales User',
            timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
          },
        ]

        return history
      } catch (error: any) {
        logger.error('Error fetching lead pipeline history:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch lead pipeline history' })
      }
    }),

  // Get conversion rates between stages
  getConversionRates: protectedProcedure
    .use(createCacheMiddleware(CacheConfigs.pipelineConversion))
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        checkPermission(ctx.session.user.role, 'dashboard:read')

        // Simulación de tasas de conversión
        const conversionRates = [
          {
            fromStage: 'nuevo',
            toStage: 'contactado',
            rate: 85.2,
            totalLeads: 125,
            convertedLeads: 106,
          },
          {
            fromStage: 'contactado',
            toStage: 'calificado',
            rate: 62.3,
            totalLeads: 106,
            convertedLeads: 66,
          },
          {
            fromStage: 'calificado',
            toStage: 'propuesta',
            rate: 78.8,
            totalLeads: 66,
            convertedLeads: 52,
          },
          {
            fromStage: 'propuesta',
            toStage: 'negociacion',
            rate: 71.2,
            totalLeads: 52,
            convertedLeads: 37,
          },
          {
            fromStage: 'negociacion',
            toStage: 'cerrado_ganado',
            rate: 54.1,
            totalLeads: 37,
            convertedLeads: 20,
          },
        ]

        return conversionRates
      } catch (error: any) {
        logger.error('Error fetching conversion rates:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch conversion rates' })
      }
    }),
})