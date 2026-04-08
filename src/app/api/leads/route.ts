import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseLeadService } from '@/server/services/supabase-lead-service'
import { LeadCreateSchema, LeadQuerySchema } from '@/lib/validators'
import { checkPermission, hasPermission, checkUserPermission, type UserRole } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { pipelineService } from '@/server/services/pipeline-service'
import { ScoringService } from '@/server/services/scoring-service'
import { withMonitoring, captureDbError, setSentryUser, captureBusinessMetric } from '@/lib/monitoring-temp'
import { withValidation, createValidationErrorResponse } from '@/lib/validation-middleware'

// Forzar renderizado dinámico (usa headers y session)
export const dynamic = 'force-dynamic'

/**
 * @swagger
 * /api/leads:
 *   post:
 *     summary: Create a new lead
 *     description: Creates a new lead in the system
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - telefono
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Lead name
 *                 example: "Juan Pérez"
 *               telefono:
 *                 type: string
 *                 description: Phone number
 *                 example: "+5491155556789"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *                 example: "juan.perez@example.com"
 *               origen:
 *                 type: string
 *                 description: Lead source
 *                 example: "WhatsApp"
 *               notas:
 *                 type: string
 *                 description: Additional notes
 *                 example: "Interesado en el producto premium"
 *     responses:
 *       201:
 *         description: Lead created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
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
 *   get:
 *     summary: Get leads with pagination and filtering
 *     description: Retrieves a paginated list of leads with optional filtering
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term for filtering leads
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [NUEVO, CONTACTADO, CALIFICADO, PROPUESTA, GANADO, PERDIDO]
 *         description: Filter by lead status
 *       - in: query
 *         name: origen
 *         schema:
 *           type: string
 *         description: Filter by lead source
 *       - in: query
 *         name: include_pipeline
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include pipeline information in response
 *     responses:
 *       200:
 *         description: List of leads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leads:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lead'
 *                 total:
 *                   type: integer
 *                   example: 150
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
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

async function postHandler(
  request: NextRequest,
  context: { body?: any }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para crear leads'
      }, { status: 401 })
    }

    // Verificar permisos granulares
    const hasCreatePermission = await checkUserPermission(session.user.id, 'leads', 'create')
    
    if (!hasCreatePermission) {
      logger.warn('Permission denied for lead creation', {
        userId: session.user.id,
        userRole: session.user.role
      })
      
      return NextResponse.json({
        error: 'Forbidden',
        message: 'No tiene permisos para crear leads'
      }, { status: 403 })
    }

    // Los datos ya están validados por el middleware
    const validatedData = context.body

    logger.info('Creating new lead', {
      userId: session.user.id,
      leadData: { ...validatedData, telefono: '***' } // Ocultar teléfono en logs
    })

    // Crear lead en el CRM (sin integración ManyChat)
    const leadData = {
      ...validatedData,
      manychatId: undefined as string | undefined
    }

    const lead = await supabaseLeadService.createLead(leadData)

    // Verificar que el lead fue creado correctamente con un ID
    if (!lead.id) {
      throw new Error('Lead created but no ID returned')
    }

    // Crear pipeline automáticamente para el nuevo lead
    try {
      if (session.user?.id) {
        await pipelineService.createLeadPipeline(lead.id, session.user.id)
        logger.info('Pipeline created automatically for new lead', { leadId: lead.id })
      }
    } catch (pipelineError) {
      // Log error pero no fallar la creación del lead
      logger.error('Error creating pipeline for new lead', {
        leadId: lead.id,
        error: pipelineError
      })
    }

    // Evaluar scoring automáticamente
    // Guardar el estado actual para usarlo en el response
    let finalEstado = lead.estado
    try {
      const scoringResult = await ScoringService.evaluateLead(lead.id!, lead as any)
      logger.info('Scoring evaluated automatically for new lead', { 
        leadId: lead.id,
        score: scoringResult.total_score,
        recommendation: scoringResult.recommendation
      })

      // Si la recomendación es diferente al estado actual, actualizar
      if (scoringResult.recommendation !== lead.estado) {
        logger.info('Updating lead estado based on scoring', {
          leadId: lead.id,
          from: lead.estado,
          to: scoringResult.recommendation
        })
        
        // Actualizar estado del lead basado en scoring
        await supabaseLeadService.updateLead(lead.id!, { estado: scoringResult.recommendation })
        // Actualizar el estado final para devolverlo en el response
        finalEstado = scoringResult.recommendation
      }
    } catch (scoringError) {
      // Log error pero no fallar la creación del lead
      logger.error('Error evaluating scoring for new lead', {
        leadId: lead.id,
        error: scoringError
      })
    }

    // Verificar si el lead tiene CUIL y moverlo automáticamente a LISTO_ANALISIS
    // si está en CLIENTE_NUEVO o CONSULTANDO_CREDITO
    try {
      const { PipelineAutoMoveService } = await import('@/server/services/pipeline-auto-move-service')
      await PipelineAutoMoveService.checkAndMoveLeadWithCUIL(lead.id!)
    } catch (autoMoveError: any) {
      // No bloquear la creación del lead si falla el auto-move
      logger.warn('Error en auto-move después de crear lead (no crítico)', {
        leadId: lead.id,
        error: autoMoveError.message
      })
    }

    logger.info('Lead created successfully', {
      leadId: lead.id,
      estado: finalEstado,
      userId: session.user.id
    })

    return NextResponse.json({
      id: lead.id,
      estado: finalEstado,
      isUpdate: false,
      message: 'Lead creado exitosamente'
    }, { status: 201 })

  } catch (error: any) {
    logger.error('Error in POST /api/leads', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al crear el lead'
    }, { status: 500 })
  }
}

// Export wrapped handlers with validation and monitoring
export const POST = withMonitoring(
  withValidation(postHandler, {
    bodySchema: LeadCreateSchema
  }),
  '/api/leads'
)

export const GET = withMonitoring(
  withValidation(getHandler, {
    querySchema: LeadQuerySchema
  }),
  '/api/leads'
)

async function getHandler(
  request: NextRequest,
  context: { query?: any }
) {
  try {
    logger.info('🔍 GET /api/leads - Iniciando request', {
      url: request.url,
      method: request.method
    })

    const session = await getServerSession(authOptions)

    logger.info('🔐 Sesión obtenida', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role
    })

    // Permitir acceso sin autenticación en modo testing
    const isTestingMode = process.env.TESTING_MODE === 'true'

    if (!session && !isTestingMode) {
      logger.warn('❌ Acceso denegado: Sin sesión')
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para ver los leads'
      }, { status: 401 })
    }

    // Verificar permisos granulares si hay sesión
    if (session) {
      logger.info('🔑 Verificando permisos de lectura de leads para usuario', {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role
      })

      // Usar el rol de la sesión directamente en lugar de consultar la base de datos
      const hasReadPermission = hasPermission(session.user.role as UserRole, 'leads:read')
      
      logger.info(`${hasReadPermission ? '✅' : '❌'} Resultado verificación permisos`, {
        hasReadPermission,
        userId: session.user.id,
        role: session.user.role
      })

      if (!hasReadPermission) {
        logger.error('🚫 Acceso denegado: Sin permisos de lectura', {
          userId: session.user.id,
          email: session.user.email,
          role: session.user.role,
          requiredPermission: 'leads:read'
        })
        return NextResponse.json({
          error: 'Forbidden',
          message: 'No tiene permisos para ver los leads'
        }, { status: 403 })
      }

      logger.info('✅ Permisos verificados correctamente')
    }

    // Los query params ya están validados por el middleware
    const validatedQuery = context?.query || {}
    const { searchParams } = new URL(request.url)
    const includePipeline = searchParams.get('include_pipeline') === 'true'

    logger.info('GET /api/leads - Validated query', {
      validatedQuery,
      includePipeline,
      userId: session?.user?.id,
      hasContext: !!context
    })

    // Obtener leads usando el servicio de Supabase
    const page = validatedQuery.page || 1
    const requestedLimit = validatedQuery.limit || 10
    const hasIsoRange = !!(validatedQuery.from && validatedQuery.to)
    const maxLimit = hasIsoRange ? 10_000 : 100
    const limit = Math.min(requestedLimit, maxLimit)

    // Rango por createdAt: reportes usan `from`/`to` ISO; listados pueden usar fechaDesde/fechaHasta
    let createdAtFrom: string | undefined
    let createdAtTo: string | undefined
    if (validatedQuery.from) {
      createdAtFrom = validatedQuery.from
    } else if (validatedQuery.fechaDesde) {
      createdAtFrom = `${validatedQuery.fechaDesde}T00:00:00`
    }
    if (validatedQuery.to) {
      createdAtTo = validatedQuery.to
    } else if (validatedQuery.fechaHasta) {
      createdAtTo = `${validatedQuery.fechaHasta}T23:59:59`
    }

    const filters: any = {
      estado: validatedQuery.estado,
      origen: validatedQuery.origen,
      zona: validatedQuery.zona,
      search: validatedQuery.q,
      ingresoMin: validatedQuery.ingresoMin,
      ingresoMax: validatedQuery.ingresoMax,
      createdAtFrom,
      createdAtTo,
      tag: validatedQuery.tag,
      sortBy: validatedQuery.sortBy,
      sortOrder: validatedQuery.sortOrder,
      limit: limit,
      offset: (page - 1) * limit,
      includePipeline: includePipeline
    }

    // Limpiar filtros undefined/null
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
        delete filters[key]
      }
    })

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:510',message:'Filtros después de limpieza',data:{filters:Object.keys(filters),tag:filters.tag,ingresoMin:filters.ingresoMin,ingresoMax:filters.ingresoMax,createdAtFrom:filters.createdAtFrom,createdAtTo:filters.createdAtTo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion

    logger.info('GET /api/leads - Using Supabase client directly', {
      filters: { ...filters, search: filters.search ? '***' : undefined } // Ocultar búsqueda en logs
    })

    let leads: any[] = []
    let total = 0

    try {
      // Usar el cliente de Supabase directamente (más confiable que el servicio HTTP)
      const { supabaseClient } = await import('@/lib/db')
      if (!supabaseClient) {
        throw new Error('Supabase client not available')
      }

      // Construir query usando el cliente de Supabase directamente
      let query = supabaseClient
        .from('Lead')
        .select('*', { count: 'exact' })
      
      // Aplicar ordenamiento
      if (filters.sortBy) {
        const orderBy = filters.sortBy === 'createdAt' ? 'createdAt' : filters.sortBy
        const ascending = filters.sortOrder === 'asc'
        query = query.order(orderBy, { ascending })
      } else {
        query = query.order('createdAt', { ascending: false })
      }
      
      // Aplicar límite y offset
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      if (filters.offset !== undefined) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:547',message:'GET /api/leads - Filtros recibidos',data:{filters},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      // Aplicar filtros
      if (filters.estado) {
        query = query.eq('estado', filters.estado)
      }
      if (filters.origen) {
        query = query.eq('origen', filters.origen)
      }
      if (filters.zona) {
        query = query.eq('zona', filters.zona)
      }
      if (filters.ingresoMin !== undefined && filters.ingresoMin !== null && filters.ingresoMin !== '') {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:556',message:'Aplicando filtro ingresoMin',data:{ingresoMin:filters.ingresoMin},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        query = query.gte('ingresos', Number(filters.ingresoMin))
      }
      if (filters.ingresoMax !== undefined && filters.ingresoMax !== null && filters.ingresoMax !== '') {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:561',message:'Aplicando filtro ingresoMax',data:{ingresoMax:filters.ingresoMax},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        query = query.lte('ingresos', Number(filters.ingresoMax))
      }
      if (filters.createdAtFrom) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:566',message:'Aplicando filtro createdAtFrom',data:{createdAtFrom:filters.createdAtFrom},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        query = query.gte('createdAt', filters.createdAtFrom)
      }
      if (filters.createdAtTo) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:571',message:'Aplicando filtro createdAtTo',data:{createdAtTo:filters.createdAtTo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        query = query.lte('createdAt', filters.createdAtTo)
      }
      if (filters.search) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:576',message:'Aplicando búsqueda',data:{search:filters.search},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        query = query.or(`nombre.ilike.%${filters.search}%,telefono.ilike.%${filters.search}%,email.ilike.%${filters.search}%,dni.ilike.%${filters.search}%`)
      }
      
      // Filtro por tag
      if (filters.tag) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:585',message:'Aplicando filtro tag',data:{tag:filters.tag},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // Los tags se almacenan como JSON string, necesitamos buscar leads que contengan el tag
        // Usamos ilike para buscar el tag dentro del string JSON
        query = query.ilike('tags', `%${filters.tag}%`)
      }
      
      const { data, error, count } = await query
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:583',message:'Query ejecutada - Resultado',data:{leadsCount:data?.length,total:count,hasError:!!error,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      
      if (error) {
        throw error
      }
      
      leads = data || []
      total = count || 0
      
      logger.info('Successfully fetched leads using Supabase client', {
        leadsCount: leads.length,
        total
      })
    } catch (error: any) {
      logger.error('Error fetching leads from Supabase', {
        error: error.message,
        stack: error.stack
      })
      // Retornar array vacío en lugar de error 500 para que la UI funcione
      leads = []
      total = 0
      logger.warn('Returning empty leads array due to error')
    }

    logger.info('GET /api/leads - Response from service', {
      leadsCount: leads.length,
      total,
      page,
      limit,
      userId: session?.user?.id
    })

    return NextResponse.json({
      leads: leads || [],
      total: total || 0,
      page: page,
      limit: limit,
      filters: {
        estado: validatedQuery.estado,
        origen: validatedQuery.origen,
        zona: validatedQuery.zona,
        hasSearch: !!validatedQuery.q,
        sortBy: validatedQuery.sortBy,
        sortOrder: validatedQuery.sortOrder
      }
    })

  } catch (error: any) {
    logger.error('Error in GET /api/leads', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener los leads'
    }, { status: 500 })
  }
}
