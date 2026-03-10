import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { supabaseLeadService } from '@/server/services/supabase-lead-service'
import { z } from 'zod'

/**
 * Schema de validación para formularios web
 * Más permisivo que el schema interno ya que viene de formularios externos
 */
const WebFormLeadSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  telefono: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  dni: z.string().max(8, 'DNI no puede exceder 8 dígitos').optional().or(z.literal('')),
  ingresos: z.union([
    z.number(),
    z.string().refine((val) => {
      if (!val || val === '') return true
      // Validar que el string completo sea numérico (solo dígitos)
      // Esto rechaza strings como "123abc" que parseInt aceptaría
      if (!/^\d+$/.test(val.trim())) return false
      const parsed = parseInt(val, 10)
      // Verificar que el parseo sea válido y que el string original sea igual al parseado
      // Esto asegura que "123" sea válido pero "123abc" sea rechazado
      return !isNaN(parsed) && isFinite(parsed) && String(parsed) === val.trim()
    }, 'Ingresos debe ser un número válido (solo dígitos)').transform((val) => val ? parseInt(val.trim(), 10) : undefined)
  ]).optional(),
  zona: z.string().optional().or(z.literal('')),
  producto: z.string().optional().or(z.literal('')),
  monto: z.union([
    z.number(),
    z.string().refine((val) => {
      if (!val || val === '') return true
      // Validar que el string completo sea numérico (solo dígitos)
      // Esto rechaza strings como "123abc" que parseInt aceptaría
      if (!/^\d+$/.test(val.trim())) return false
      const parsed = parseInt(val, 10)
      // Verificar que el parseo sea válido y que el string original sea igual al parseado
      // Esto asegura que "123" sea válido pero "123abc" sea rechazado
      return !isNaN(parsed) && isFinite(parsed) && String(parsed) === val.trim()
    }, 'Monto debe ser un número válido (solo dígitos)').transform((val) => val ? parseInt(val.trim(), 10) : undefined)
  ]).optional(),
  origen: z.string().optional().default('web'),
  utmSource: z.string().optional().or(z.literal('')),
  estado: z.string().optional().default('NUEVO'),
  agencia: z.string().optional().or(z.literal('')),
  notas: z.string().optional().or(z.literal('')),
  tags: z.array(z.string()).optional()
})

/**
 * POST /api/leads/webhook
 * Endpoint público para recibir leads desde formularios web de landing page
 * Autenticación mediante token en header o query parameter
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar token de autenticación
    const authHeader = request.headers.get('authorization')
    const tokenFromHeader = authHeader?.replace('Bearer ', '')
    const { searchParams } = new URL(request.url)
    const tokenFromQuery = searchParams.get('token')
    const expectedToken =
      process.env.WEBHOOK_TOKEN ||
      process.env.ALLOWED_WEBHOOK_TOKEN ||
      process.env.NEXT_PUBLIC_WEBHOOK_TOKEN

    const providedToken = tokenFromHeader || tokenFromQuery

    if (!expectedToken || !providedToken || providedToken !== expectedToken) {
      logger.warn('Unauthorized webhook attempt', {
        hasToken: !!providedToken,
        hasExpectedToken: !!expectedToken
      })
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Token de autenticación inválido o faltante'
      }, { status: 401 })
    }

    // Parsear y validar datos del formulario
    const body = await request.json()
    
    let validatedData
    try {
      validatedData = WebFormLeadSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Invalid webhook data', { errors: error.errors })
        return NextResponse.json({
          error: 'Validation error',
          message: 'Datos del formulario inválidos',
          details: error.errors
        }, { status: 400 })
      }
      throw error
    }

    logger.info('Webhook lead received', {
      nombre: validatedData.nombre,
      telefono: '***', // Ocultar teléfono en logs
      origen: validatedData.origen
    })

    const leadData = {
      nombre: validatedData.nombre,
      telefono: validatedData.telefono,
      email: validatedData.email || null,
      dni: validatedData.dni || null,
      ingresos: validatedData.ingresos ?? null,
      zona: validatedData.zona || null,
      producto: validatedData.producto || null,
      monto: validatedData.monto ?? null,
      origen: validatedData.origen || 'web',
      utmSource: validatedData.utmSource || null,
      estado: validatedData.estado || 'NUEVO',
      agencia: validatedData.agencia || null,
      notas: validatedData.notas || null,
      manychatId: undefined as string | undefined,
    }

    const lead = await supabaseLeadService.createLead(leadData)

    if (!lead.id) {
      throw new Error('Lead created but no ID returned')
    }

    logger.info('Webhook lead created successfully', {
      leadId: lead.id,
      origen: validatedData.origen
    })

    return NextResponse.json({
      success: true,
      id: lead.id,
      estado: lead.estado,
      message: 'Lead creado exitosamente desde formulario web'
    }, { status: 201 })

  } catch (error: any) {
    logger.error('Error in POST /api/leads/webhook', {
      error: error.message,
      stack: error.stack
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al procesar el formulario web'
    }, { status: 500 })
  }
}

/**
 * GET /api/leads/webhook
 * Endpoint de verificación/health check para formularios web
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint para formularios web está activo',
    method: 'POST',
    authentication: 'Bearer token en header o ?token=xxx en query',
    requiredFields: ['nombre', 'telefono'],
    optionalFields: ['email', 'dni', 'ingresos', 'zona', 'producto', 'monto', 'origen', 'utmSource', 'estado', 'agencia', 'notas', 'tags']
  })
}

