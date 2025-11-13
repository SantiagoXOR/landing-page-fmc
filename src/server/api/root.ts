import { createTRPCRouter } from '@/server/trpc'
import { leadsRouter } from './routers/leads'
import { dashboardRouter } from './routers/dashboard'
import { pipelineRouter } from './routers/pipeline'
import { adminRouter } from './routers/admin'

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  leads: leadsRouter,
  dashboard: dashboardRouter,
  pipeline: pipelineRouter,
  admin: adminRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter