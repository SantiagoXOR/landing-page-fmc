import { NextRequest, NextResponse } from 'next/server'
import { ManychatService } from '@/server/services/manychat-service'

/**
 * GET - Obtener todos los custom fields disponibles en Manychat
 */
export async function GET(request: NextRequest) {
  try {
    const fields = await ManychatService.getCustomFields()

    return NextResponse.json({
      success: true,
      fields,
    })
  } catch (error: any) {
    console.error('Error obteniendo custom fields de Manychat:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener custom fields' },
      { status: 500 }
    )
  }
}

/**
 * POST - Actualizar custom field de un subscriber
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriberId, fieldName, value } = body

    if (!subscriberId || !fieldName || value === undefined) {
      return NextResponse.json(
        { error: 'subscriberId, fieldName y value son requeridos' },
        { status: 400 }
      )
    }

    const success = await ManychatService.setCustomField(subscriberId, fieldName, value)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Custom field actualizado exitosamente',
      })
    } else {
      return NextResponse.json(
        { error: 'Error al actualizar custom field' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error actualizando custom field:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar custom field' },
      { status: 500 }
    )
  }
}

