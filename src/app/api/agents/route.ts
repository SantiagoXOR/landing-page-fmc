import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'

// GET - Obtener todos los agentes activos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obtener todos los usuarios
    const users = await supabase.findAllUsers()
    
    // Filtrar solo los agentes (AGENT o VENDEDOR) que estén activos
    const agents = users
      .filter((user: any) => 
        (user.role === 'AGENT' || user.role === 'VENDEDOR') && 
        user.status === 'ACTIVE'
      )
      .map((user: any) => ({
        id: user.id,
        nombre: user.nombre || user.name || '',
        email: user.email || ''
      }))

    return NextResponse.json(agents)

  } catch (error: any) {
    logger.error('Error in GET /api/agents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






