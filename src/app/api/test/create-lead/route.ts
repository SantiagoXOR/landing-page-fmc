import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseLeadService } from '@/server/services/supabase-lead-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    
    // Log de los datos recibidos
    console.log('Datos recibidos:', body)

    // Crear lead directamente sin validación Zod para testing
    const leadData = {
      nombre: body.nombre,
      telefono: body.telefono,
      email: body.email || null,
      origen: body.origen || null,
      estado: body.estado || 'NUEVO',
      notas: body.notas || null
    }

    console.log('Datos a enviar a Supabase:', leadData)

    const lead = await supabaseLeadService.createLead(leadData)

    return NextResponse.json({
      success: true,
      lead: lead
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error completo:', error)
    
    return NextResponse.json({
      error: 'Error al crear lead',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
