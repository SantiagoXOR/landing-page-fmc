import { z } from 'zod'
import { createTRPCRouter, adminProcedure } from '@/server/trpc'
import { logger } from '@/lib/logger'
import { TRPCError } from '@trpc/server'
import { rateLimitMiddleware } from '@/server/middleware/rate-limit'

export const adminRouter = createTRPCRouter({
  // Get all users (admin only)
  getUsers: adminProcedure
    .use(rateLimitMiddleware.admin)
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        role: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Simulación de usuarios - en producción esto vendría de Supabase
        const mockUsers = [
          {
            id: '1',
            name: 'Admin User',
            email: 'admin@phorencial.com',
            role: 'admin',
            isActive: true,
            createdAt: new Date('2024-01-01').toISOString(),
            lastLogin: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'Sales User',
            email: 'sales@phorencial.com',
            role: 'sales',
            isActive: true,
            createdAt: new Date('2024-01-15').toISOString(),
            lastLogin: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '3',
            name: 'Manager User',
            email: 'manager@phorencial.com',
            role: 'manager',
            isActive: true,
            createdAt: new Date('2024-02-01').toISOString(),
            lastLogin: new Date(Date.now() - 3600000).toISOString(),
          },
        ]

        // Apply filters
        let filteredUsers = mockUsers
        
        if (input.search) {
          const searchLower = input.search.toLowerCase()
          filteredUsers = filteredUsers.filter(
            (user) =>
              user.name.toLowerCase().includes(searchLower) ||
              user.email.toLowerCase().includes(searchLower)
          )
        }

        if (input.role) {
          filteredUsers = filteredUsers.filter((user) => user.role === input.role)
        }

        // Pagination
        const total = filteredUsers.length
        const offset = (input.page - 1) * input.limit
        const paginatedUsers = filteredUsers.slice(offset, offset + input.limit)

        logger.info('Users retrieved by admin', {
          adminId: ctx.session.user.id,
          count: paginatedUsers.length,
          filters: { search: input.search, role: input.role },
        })

        return {
          data: paginatedUsers,
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit),
        }
      } catch (error: any) {
        logger.error('Error fetching users:', error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch users' })
      }
    }),

  // Update user (admin only)
  updateUser: adminProcedure
    .use(rateLimitMiddleware.strict)
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().optional(),
          email: z.string().email().optional(),
          role: z.enum(['admin', 'manager', 'sales', 'viewer']).optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Simulación de actualización de usuario
        const updatedUser = {
          id: input.id,
          ...input.data,
          updatedAt: new Date().toISOString(),
          updatedBy: ctx.session.user.id,
        }

        logger.info('User updated by admin', {
          adminId: ctx.session.user.id,
          targetUserId: input.id,
          changes: input.data,
        })

        return updatedUser
      } catch (error: any) {
        logger.error('Error updating user:', error)
        
        if (error.message.includes('not found')) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update user' })
      }
    }),

  // Delete user (admin only)
  deleteUser: adminProcedure
    .use(rateLimitMiddleware.strict)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Prevent admin from deleting themselves
        if (input.id === ctx.session.user.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete your own account' })
        }

        // Simulación de eliminación de usuario
        logger.info('User deleted by admin', {
          adminId: ctx.session.user.id,
          deletedUserId: input.id,
        })

        return { success: true }
      } catch (error: any) {
        logger.error('Error deleting user:', error)
        
        if (error.message.includes('Cannot delete')) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
        }
        
        if (error.message.includes('not found')) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
        }
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete user' })
      }
    }),

  // Get system statistics (admin only)
  getSystemStats: adminProcedure
    .use(rateLimitMiddleware.admin)
    .query(async ({ ctx }) => {
      try {
        // Simulación de estadísticas del sistema
        const stats = {
          totalUsers: 3,
          activeUsers: 3,
          totalLeads: 156,
          leadsThisMonth: 42,
          systemHealth: {
            status: 'healthy',
            uptime: '99.9%',
            responseTime: '120ms',
            errorRate: '0.1%',
          },
          storage: {
            used: '2.3 GB',
            total: '10 GB',
            percentage: 23,
          },
          apiUsage: {
            requestsToday: 1247,
            requestsThisMonth: 38420,
            averageResponseTime: '145ms',
          },
          recentErrors: [
            {
              id: '1',
              message: 'Database connection timeout',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              severity: 'warning',
            },
            {
              id: '2',
              message: 'Rate limit exceeded for user',
              timestamp: new Date(Date.now() - 7200000).toISOString(),
              severity: 'info',
            },
          ],
        }

        logger.info('System stats retrieved by admin', {
          adminId: ctx.session.user.id,
        })

        return stats
      } catch (error: any) {
        logger.error('Error fetching system stats:', error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch system statistics' })
      }
    }),

  // Update system settings (admin only)
  updateSettings: adminProcedure
    .use(rateLimitMiddleware.strict)
    .input(
      z.object({
        settings: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Simulación de actualización de configuración
        const updatedSettings = {
          ...input.settings,
          updatedAt: new Date().toISOString(),
          updatedBy: ctx.session.user.id,
        }

        logger.info('System settings updated by admin', {
          adminId: ctx.session.user.id,
          settings: Object.keys(input.settings),
        })

        return updatedSettings
      } catch (error: any) {
        logger.error('Error updating system settings:', error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update system settings' })
      }
    }),

  // Get audit logs (admin only)
  getAuditLogs: adminProcedure
    .use(rateLimitMiddleware.admin)
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        action: z.string().optional(),
        userId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Simulación de logs de auditoría
        const mockLogs = [
          {
            id: '1',
            action: 'user_login',
            userId: '2',
            userName: 'Sales User',
            details: 'User logged in successfully',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0...',
            timestamp: new Date().toISOString(),
          },
          {
            id: '2',
            action: 'lead_created',
            userId: '2',
            userName: 'Sales User',
            details: 'Created lead: Juan Pérez',
            ipAddress: '192.168.1.100',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '3',
            action: 'user_updated',
            userId: '1',
            userName: 'Admin User',
            details: 'Updated user role for Sales User',
            ipAddress: '192.168.1.101',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
          },
        ]

        // Apply filters
        let filteredLogs = mockLogs
        
        if (input.action) {
          filteredLogs = filteredLogs.filter((log) => log.action === input.action)
        }

        if (input.userId) {
          filteredLogs = filteredLogs.filter((log) => log.userId === input.userId)
        }

        // Pagination
        const total = filteredLogs.length
        const offset = (input.page - 1) * input.limit
        const paginatedLogs = filteredLogs.slice(offset, offset + input.limit)

        logger.info('Audit logs retrieved by admin', {
          adminId: ctx.session.user.id,
          count: paginatedLogs.length,
          filters: { action: input.action, userId: input.userId },
        })

        return {
          data: paginatedLogs,
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit),
        }
      } catch (error: any) {
        logger.error('Error fetching audit logs:', error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch audit logs' })
      }
    }),
})