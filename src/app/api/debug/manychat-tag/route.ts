import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkUserPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { ManychatService } from '@/server/services/manychat-service'

/**
 * GET /api/debug/manychat-tag
 * Endpoint de diagnóstico para verificar tags y subscribers en ManyChat
 * Query params: subscriberId, tagName
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión'
      }, { status: 401 })
    }

    // Verificar permisos
    const hasWritePermission = await checkUserPermission(session.user.id, 'pipeline', 'write')
    
    if (!hasWritePermission) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const subscriberId = searchParams.get('subscriberId')
    const tagName = searchParams.get('tagName') || 'credito-preaprobado'

    if (!subscriberId) {
      return NextResponse.json({
        error: 'Missing subscriberId',
        message: 'Proporciona subscriberId como query param'
      }, { status: 400 })
    }

    const diagnostics: any = {
      subscriberId,
      tagName,
      timestamp: new Date().toISOString()
    }

    // 1. Verificar subscriber
    try {
      const subscriber = await ManychatService.getSubscriberById(subscriberId)
      if (subscriber) {
        diagnostics.subscriber = {
          exists: true,
          id: subscriber.id,
          firstName: subscriber.first_name,
          lastName: subscriber.last_name,
          phone: subscriber.phone,
          whatsappPhone: subscriber.whatsapp_phone,
          currentTags: subscriber.tags?.map(t => ({ id: t.id, name: t.name })) || []
        }
      } else {
        diagnostics.subscriber = {
          exists: false,
          error: 'Subscriber no encontrado en ManyChat'
        }
      }
    } catch (subError: any) {
      diagnostics.subscriber = {
        exists: false,
        error: subError.message,
        stack: subError.stack
      }
    }

    // 2. Verificar tag
    try {
      const allTags = await ManychatService.getTags()
      const normalizedTag = tagName.toLowerCase().trim()
      const tag = allTags.find(t => 
        t.name.toLowerCase().trim() === normalizedTag ||
        t.name.trim() === tagName
      )
      
      if (tag) {
        diagnostics.tag = {
          exists: true,
          id: tag.id,
          name: tag.name,
          totalTagsInManyChat: allTags.length
        }
      } else {
        diagnostics.tag = {
          exists: false,
          searchedTag: tagName,
          normalizedSearch: normalizedTag,
          availableTags: allTags.slice(0, 30).map(t => ({ id: t.id, name: t.name, normalized: t.name.toLowerCase().trim() })),
          totalTagsInManyChat: allTags.length
        }
      }
    } catch (tagError: any) {
      diagnostics.tag = {
        exists: false,
        error: tagError.message,
        stack: tagError.stack
      }
    }

    // 3. Verificar si el tag ya está asignado
    if (diagnostics.subscriber?.exists && diagnostics.tag?.exists) {
      const tagAlreadyAssigned = diagnostics.subscriber.currentTags?.some(
        (t: { id: number; name: string }) => t.id === diagnostics.tag.id || t.name.toLowerCase() === tagName.toLowerCase()
      )
      diagnostics.tagAlreadyAssigned = tagAlreadyAssigned || false
    }

    // 4. Intentar agregar el tag si ambos existen y no está asignado
    if (diagnostics.subscriber?.exists && diagnostics.tag?.exists && !diagnostics.tagAlreadyAssigned) {
      try {
        const added = await ManychatService.addTagToSubscriber(subscriberId, tagName)
        diagnostics.addTagAttempt = {
          success: added,
          message: added ? 'Tag agregado exitosamente' : 'No se pudo agregar el tag (ver logs del servidor)'
        }
      } catch (addError: any) {
        // Convertir fullResponse a string si existe y no es string
        const fullResponseStr = addError.fullResponse 
          ? (typeof addError.fullResponse === 'string' 
              ? addError.fullResponse 
              : JSON.stringify(addError.fullResponse))
          : undefined
        
        const fullResponsePreview = fullResponseStr ? fullResponseStr.substring(0, 5000) : undefined
        const htmlResponse = fullResponseStr && fullResponseStr.includes('<!DOCTYPE') 
          ? fullResponseStr.substring(0, 10000) 
          : undefined
        
        logger.error('Error agregando tag en endpoint de diagnóstico', {
          subscriberId,
          tagName,
          error: addError.message,
          error_code: addError.error_code,
          details: addError.details,
          fullResponse: fullResponsePreview
        })
        diagnostics.addTagAttempt = {
          success: false,
          error: addError.message,
          error_code: addError.error_code,
          details: addError.details,
          fullResponse: fullResponsePreview,
          htmlResponse: htmlResponse,
          stack: addError.stack
        }
      }
    } else if (diagnostics.tagAlreadyAssigned) {
      diagnostics.addTagAttempt = {
        success: true,
        message: 'Tag ya estaba asignado'
      }
    } else {
      diagnostics.addTagAttempt = {
        skipped: true,
        reason: !diagnostics.subscriber?.exists ? 'Subscriber no existe' : 'Tag no existe'
      }
    }

    return NextResponse.json({
      success: true,
      diagnostics
    })

  } catch (error: any) {
    logger.error('Error in debug manychat-tag endpoint', {
      error: error.message,
      stack: error.stack
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

