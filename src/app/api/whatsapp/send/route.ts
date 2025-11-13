import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { whatsappService } from '@/server/services/whatsapp-service'
import { EventRepository } from '@/server/repositories/event-repository'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'

/**
 * @swagger
 * /api/whatsapp/send:
 *   post:
 *     summary: Send WhatsApp message
 *     description: Sends a WhatsApp message to a lead
 *     tags:
 *       - WhatsApp
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leadId
 *               - telefono
 *               - mensaje
 *             properties:
 *               leadId:
 *                 type: string
 *                 description: Lead ID (CUID format)
 *                 example: "clh1234567890abcdef"
 *               telefono:
 *                 type: string
 *                 description: Phone number (minimum 10 digits)
 *                 example: "+5491155556789"
 *               mensaje:
 *                 type: string
 *                 description: Message content (1-4096 characters)
 *                 example: "Hola, gracias por tu interés en nuestros productos"
 *               tipo:
 *                 type: string
 *                 enum: [text, template]
 *                 default: text
 *                 description: Message type
 *               templateName:
 *                 type: string
 *                 description: Template name (required if tipo is 'template')
 *                 example: "welcome_message"
 *               templateParams:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Template parameters (required if tipo is 'template')
 *                 example: ["Juan", "Premium"]
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 messageId:
 *                   type: string
 *                   description: WhatsApp message ID
 *                   example: "wamid.HBgNNTQ5MTE1NTU1Njc4OQ=="
 *                 eventId:
 *                   type: string
 *                   description: Event record ID
 *                   example: "clh1234567890abcdef"
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
 */

const eventRepo = new EventRepository()

// Esquema de validación para envío de mensajes
const SendMessageSchema = z.object({
  leadId: z.string().cuid(),
  telefono: z.string().min(10),
  mensaje: z.string().min(1).max(4096),
  tipo: z.enum(['text', 'template']).default('text'),
  templateName: z.string().optional(),
  templateParams: z.array(z.string()).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'leads:write')

    // Validar datos
    const body = await request.json()
    const validatedData = SendMessageSchema.parse(body)

    // Verificar que WhatsApp esté configurado
    if (!whatsappService.isConfigured()) {
      return NextResponse.json({ 
        error: 'WhatsApp no está configurado' 
      }, { status: 503 })
    }

    // Enviar mensaje
    const result = await whatsappService.sendMessage({
      to: validatedData.telefono,
      message: validatedData.mensaje,
      messageType: 'text'
    })

    if (!result) {
      return NextResponse.json({ 
        error: 'No se pudo enviar el mensaje' 
      }, { status: 500 })
    }

    // Registrar evento de mensaje enviado
    await eventRepo.create({
      leadId: validatedData.leadId,
      tipo: 'whatsapp_out',
      payload: {
        mensaje: validatedData.mensaje,
        telefono: validatedData.telefono,
        messageId: result.messageId,
        tipo: validatedData.tipo,
        sentBy: session.user.id,
        sentAt: new Date().toISOString()
      }
    })

    logger.info('WhatsApp message sent from CRM', {
      leadId: validatedData.leadId,
      telefono: validatedData.telefono,
      messageId: result.messageId,
      sentBy: session.user.id
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      provider: result.provider
    })

  } catch (error: any) {
    logger.error('Error sending WhatsApp message', {
      error: error.message,
      stack: error.stack
    })

    if (error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Datos inválidos', 
        details: error.errors 
      }, { status: 400 })
    }

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// Endpoint para obtener templates disponibles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    checkPermission(session.user.role, 'leads:read')
    
    // Templates predefinidos (en producción estos vendrían de la API de Meta)
    const templates = [
      {
        name: 'bienvenida_phorencial',
        displayName: 'Bienvenida',
        description: 'Mensaje de bienvenida para nuevos leads',
        parameters: ['nombre']
      },
      {
        name: 'seguimiento_lead',
        displayName: 'Seguimiento',
        description: 'Mensaje de seguimiento para leads en proceso',
        parameters: ['nombre', 'estado']
      },
      {
        name: 'solicitud_documentos',
        displayName: 'Solicitud de Documentos',
        description: 'Solicitar documentación al lead',
        parameters: ['nombre', 'documentos']
      },
      {
        name: 'prestamo_aprobado',
        displayName: 'Préstamo Aprobado',
        description: 'Notificar aprobación del préstamo',
        parameters: ['nombre', 'monto']
      },
      {
        name: 'prestamo_rechazado',
        displayName: 'Préstamo Rechazado',
        description: 'Notificar rechazo del préstamo',
        parameters: ['nombre', 'motivo']
      }
    ]

    return NextResponse.json({
      config: {
        configured: whatsappService.isConfigured()
      },
      templates
    })

  } catch (error: any) {
    logger.error('Error getting WhatsApp templates', {
      error: error.message
    })

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
