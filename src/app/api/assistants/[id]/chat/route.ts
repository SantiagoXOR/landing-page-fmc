import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { geminiService, ChatMessage } from '@/server/services/gemini-service'

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1)
  })).min(1),
  leadId: z.string().optional(), // ID del lead para obtener información del usuario
  leadData: z.object({
    nombre: z.string().optional(),
    cuil: z.string().optional(),
    zona: z.string().optional(),
    trabajo_actual: z.string().optional(),
    banco: z.string().optional(),
    producto: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().optional(),
    ingresos: z.number().optional(),
    monto: z.number().optional()
  }).optional() // Datos del lead directamente (opcional)
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    checkPermission(session.user.role, 'settings:read')

    const body = await request.json()
    const { messages, leadId, leadData } = ChatRequestSchema.parse(body)

    // Convertir mensajes al formato esperado por Gemini
    const chatMessages: ChatMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Obtener información del lead si se proporciona leadId
    let leadInfo = leadData
    if (leadId && !leadInfo) {
      try {
        const { supabase } = await import('@/lib/db')
        const leads = await supabase.request(`/Lead?id=eq.${leadId}&select=nombre,cuil,zona,trabajo_actual,banco,producto,telefono,email,ingresos,monto&limit=1`)
        if (leads && Array.isArray(leads) && leads.length > 0) {
          leadInfo = leads[0]
        }
      } catch (error) {
        logger.warn('Error fetching lead data', { error, leadId })
      }
    }

    // Enviar mensaje al asistente usando Gemini con información del lead
    const response = await geminiService.chat(params.id, chatMessages, leadInfo)

    logger.info('Chat message processed', {
      assistantId: params.id,
      messageCount: messages.length
    }, { userId: session.user.id })

    return NextResponse.json({
      message: response.message,
      usage: response.usage
    })

  } catch (error: any) {
    logger.error('Error in POST /api/assistants/[id]/chat', {
      error: error.message,
      stack: error.stack,
      assistantId: params.id
    })
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: error.errors 
      }, { status: 400 })
    }
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (error.message.includes('no está inicializado') || error.message.includes('API_KEY')) {
      return NextResponse.json({ 
        error: 'Gemini API no está configurada. Por favor, configura GOOGLE_GEMINI_API_KEY en las variables de entorno.' 
      }, { status: 503 })
    }

    if (error.message.includes('no encontrado') || error.message.includes('inactivo')) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      error: 'Error al procesar el mensaje',
      details: error.message 
    }, { status: 500 })
  }
}

