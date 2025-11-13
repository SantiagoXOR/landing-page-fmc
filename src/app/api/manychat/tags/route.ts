import { NextRequest, NextResponse } from 'next/server'
import { ManychatService } from '@/server/services/manychat-service'

/**
 * GET - Obtener todos los tags disponibles en Manychat
 */
export async function GET(request: NextRequest) {
  try {
    const tags = await ManychatService.getTags()

    return NextResponse.json({
      success: true,
      tags,
    })
  } catch (error: any) {
    console.error('Error obteniendo tags de Manychat:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener tags' },
      { status: 500 }
    )
  }
}

/**
 * POST - Agregar o remover tag a un subscriber
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriberId, tagName, tagId, action = 'add' } = body

    if (!subscriberId) {
      return NextResponse.json(
        { error: 'subscriberId es requerido' },
        { status: 400 }
      )
    }

    if (!tagName && !tagId) {
      return NextResponse.json(
        { error: 'tagName o tagId es requerido' },
        { status: 400 }
      )
    }

    let success: boolean

    if (action === 'add') {
      if (tagId) {
        success = await ManychatService.addTagByIdToSubscriber(subscriberId, tagId)
      } else {
        success = await ManychatService.addTagToSubscriber(subscriberId, tagName)
      }
    } else if (action === 'remove') {
      if (tagId) {
        success = await ManychatService.removeTagByIdFromSubscriber(subscriberId, tagId)
      } else {
        success = await ManychatService.removeTagFromSubscriber(subscriberId, tagName)
      }
    } else {
      return NextResponse.json(
        { error: 'action debe ser "add" o "remove"' },
        { status: 400 }
      )
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Tag ${action === 'add' ? 'agregado' : 'removido'} exitosamente`,
      })
    } else {
      return NextResponse.json(
        { error: `Error al ${action === 'add' ? 'agregar' : 'remover'} tag` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error en operación de tag:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar tag' },
      { status: 500 }
    )
  }
}

