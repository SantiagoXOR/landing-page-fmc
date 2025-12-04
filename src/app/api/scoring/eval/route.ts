import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ScoringService } from '@/server/services/scoring-service'
import { ScoringRequestSchema } from '@/lib/validators'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/scoring/eval - Starting request')

    const session = await getServerSession(authOptions)

    if (!session) {
      logger.warn('Unauthorized access attempt to scoring endpoint')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('User authenticated', { userId: session.user.id, role: session.user.role })

    checkPermission(session.user.role, 'leads:write')

    const body = await request.json()
    logger.info('Request body received', { body })

    const { leadId } = ScoringRequestSchema.parse(body)
    logger.info('Lead ID validated', { leadId })

    // Usar el servicio estático actualizado
    const result = await ScoringService.evaluateLead(leadId)
    logger.info('Scoring evaluation completed', { leadId, result })

    // Validar que el resultado tenga el formato esperado
    if (!result || typeof result !== 'object') {
      logger.error('Invalid scoring result format', { leadId, result })
      return NextResponse.json({
        error: 'Invalid scoring result format',
        details: process.env.NODE_ENV === 'development' ? 'Result is not an object' : undefined
      }, { status: 500 })
    }

    // Validar campos requeridos en el resultado
    if (typeof result.total_score === 'undefined') {
      logger.error('Scoring result missing total_score', { leadId, result })
      return NextResponse.json({
        error: 'Scoring result is incomplete',
        details: process.env.NODE_ENV === 'development' ? 'Missing total_score field' : undefined
      }, { status: 500 })
    }

    // Generar motivos desde el score_breakdown
    const motivos: string[] = []
    if (result.score_breakdown && typeof result.score_breakdown === 'object') {
      Object.values(result.score_breakdown).forEach((breakdown: any) => {
        if (breakdown?.matched && breakdown?.rule_name) {
          const reason = breakdown.reason 
            ? `${breakdown.rule_name}: ${breakdown.reason}`
            : breakdown.rule_name
          motivos.push(reason)
        }
      })
    }

    // Si no hay motivos pero hay reglas aplicadas, generar motivos básicos
    if (motivos.length === 0 && result.rules_applied && Array.isArray(result.rules_applied) && result.rules_applied.length > 0) {
      motivos.push(`${result.rules_applied.length} regla(s) aplicada(s)`)
    }

    // Si aún no hay motivos, agregar uno genérico basado en el score
    if (motivos.length === 0) {
      const score = result.total_score ?? 0
      if (score > 0) {
        motivos.push(`Puntuación obtenida: ${score} puntos`)
      } else {
        motivos.push('No se aplicaron reglas de evaluación')
      }
    }

    // Formatear respuesta para compatibilidad con el frontend
    const formattedResult = {
      score: result.total_score ?? 0,
      decision: result.recommendation ?? result.decision ?? 'NUEVO',
      motivos: motivos.length > 0 ? motivos : (result.reasons ?? result.motivos ?? [])
    }

    return NextResponse.json(formattedResult)

  } catch (error: any) {
    // Validar que error tenga las propiedades esperadas antes de acceder
    const errorMessage = error?.message || 'Unknown error'
    const errorName = error?.name || 'Error'
    const errorStack = error?.stack || undefined

    logger.error('Error in POST /api/scoring/eval', {
      error: errorMessage,
      stack: errorStack,
      name: errorName,
      leadId: error?.leadId || 'unknown'
    })

    // Manejar errores de validación Zod
    if (errorName === 'ZodError' && error?.errors) {
      logger.error('Validation error', { errors: error.errors })
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: Array.isArray(error.errors) ? error.errors : [error.errors]
      }, { status: 400 })
    }

    // Manejar errores de permisos
    if (errorMessage.includes('Insufficient permissions') || errorMessage.includes('permission')) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tienes permisos para evaluar leads'
      }, { status: 403 })
    }

    // Manejar lead no encontrado
    if (errorMessage === 'Lead not found' || errorMessage.includes('not found')) {
      return NextResponse.json({ 
        error: 'Lead not found',
        message: 'El lead especificado no existe'
      }, { status: 404 })
    }

    // Manejar sistema de scoring no configurado
    if (errorMessage.includes('scoring rules') || errorMessage.includes('not configured')) {
      return NextResponse.json({ 
        error: 'Scoring system not configured',
        message: 'El sistema de evaluación no está configurado'
      }, { status: 503 })
    }

    // Error genérico
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error al evaluar el lead',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 })
  }
}
