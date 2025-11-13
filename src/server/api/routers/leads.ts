import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, adminProcedure } from '@/server/trpc'
import { supabaseLeadService } from '@/server/services/supabase-lead-service'
import { LeadCreateSchema, LeadQuerySchema } from '@/lib/validators'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { captureBusinessMetric } from '@/lib/monitoring-temp'
import { TRPCError } from '@trpc/server'
import { createCacheMiddleware, createCacheInvalidationMiddleware, CacheConfigs, InvalidationPatterns } from '@/server/middleware/cache'
import { rateLimitMiddleware } from '@/server/middleware/rate-limit'

export const leadsRouter = createTRPCRouter({
  // Get all leads with filtering and pagination
  getAll: protectedProcedure
    .use(rateLimitMiddleware.authenticated)
    .use(createCacheMiddleware(CacheConfigs.leadsList))
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        estado: z.string().optional(),
        origen: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Check permissions
        checkPermission(ctx.session.user.role, 'leads:read')

        const { page, limit, search, estado, origen, dateFrom, dateTo } = input
        const offset = (page - 1) * limit

        const result = await supabaseLeadService.getLeads({
          limit,
          offset,
          search,
          estado,
          origen,
        })

        // Capture business metric
        captureBusinessMetric('leads_queried', result.leads.length, {
          user_id: ctx.session.user.id,
          search: search || '',
          estado: estado || '',
          origen: origen || '',
        })

        return {
          data: result.leads,
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        }
      } catch (error: any) {
        logger.error('Error fetching leads:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch leads' })
      }
    }),

  // Get lead by ID
  getById: protectedProcedure
    .use(createCacheMiddleware(CacheConfigs.leadById))
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        checkPermission(ctx.session.user.role, 'leads:read')

        const lead = await supabaseLeadService.getLeadById(input.id)
        
        if (!lead) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' })
        }

        return lead
      } catch (error: any) {
        logger.error('Error fetching lead:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        if (error.message.includes('not found')) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch lead' })
      }
    }),

  // Create new lead
  create: protectedProcedure
    .use(rateLimitMiddleware.mutations)
    .use(createCacheInvalidationMiddleware(InvalidationPatterns.leadMutations))
    .input(LeadCreateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        checkPermission(ctx.session.user.role, 'leads:write')

        const leadData = {
          ...input,
          created_by: ctx.session.user.id,
        }

        const newLead = await supabaseLeadService.createLead(leadData)

        // Capture business metric
        await captureBusinessMetric('lead_created', 1, {
          user_id: ctx.session.user.id,
          lead_id: newLead?.id || '',
          origen: input.origen || '',
        })

        logger.info('Lead created successfully', {
          leadId: newLead.id,
          userId: ctx.session.user.id,
        })

        return newLead
      } catch (error: any) {
        logger.error('Error creating lead:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        if (error.message.includes('already exists')) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Lead with this phone number already exists' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create lead' })
      }
    }),

  // Update lead
  update: protectedProcedure
    .use(rateLimitMiddleware.mutations)
    .use(createCacheInvalidationMiddleware(InvalidationPatterns.leadMutations))
    .input(
      z.object({
        id: z.string(),
        data: LeadCreateSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        checkPermission(ctx.session.user.role, 'leads:update')

        const updatedLead = await supabaseLeadService.updateLead(input.id, {
          ...input.data,
        })

        // Capture business metric
        await captureBusinessMetric('lead_updated', 1, {
          user_id: ctx.session.user.id,
          lead_id: input.id,
        })

        logger.info('Lead updated successfully', {
          leadId: input.id,
          userId: ctx.session.user.id,
        })

        return updatedLead
      } catch (error: any) {
        logger.error('Error updating lead:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        if (error.message.includes('not found')) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update lead' })
      }
    }),

  // Delete lead (admin only)
  delete: adminProcedure
    .use(rateLimitMiddleware.strict)
    .use(createCacheInvalidationMiddleware(InvalidationPatterns.leadMutations))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await supabaseLeadService.deleteLead(input.id)

        // Capture business metric
        await captureBusinessMetric('lead_deleted', 1, {
          user_id: ctx.session.user.id,
          lead_id: input.id,
        })

        logger.info('Lead deleted successfully', {
          leadId: input.id,
          userId: ctx.session.user.id,
        })

        return { success: true }
      } catch (error: any) {
        logger.error('Error deleting lead:', error)
        
        if (error.message.includes('not found')) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete lead' })
      }
    }),

  // Get lead events/history
  getEvents: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        checkPermission(ctx.session.user.role, 'leads:read')

        const events = await supabaseLeadService.getLeadEvents(input.id)
        return events
      } catch (error: any) {
        logger.error('Error fetching lead events:', error)
        
        if (error.message.includes('Insufficient permissions')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch lead events' })
      }
    }),
})