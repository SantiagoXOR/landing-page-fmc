import { NextRequest, NextResponse } from 'next/server'
import { ManychatService } from '@/server/services/manychat-service'

export async function GET(request: NextRequest) {
  try {
    const flows = await ManychatService.getFlows()

    return NextResponse.json({
      success: true,
      flows,
    })
  } catch (error: any) {
    console.error('Error obteniendo flows de Manychat:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener flows' },
      { status: 500 }
    )
  }
}

