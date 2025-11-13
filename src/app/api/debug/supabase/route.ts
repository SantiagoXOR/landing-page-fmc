import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// Test endpoint para verificar conexión a Supabase
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Variables de entorno faltantes',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      }, { status: 500 })
    }

    // Test de conexión directa a Supabase
    const testResponse = await fetch(`${supabaseUrl}/rest/v1/Lead?select=count`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      return NextResponse.json({
        error: 'Error de conexión a Supabase',
        status: testResponse.status,
        details: errorText
      }, { status: 500 })
    }

    const data = await testResponse.json()

    // Test de inserción simple (sin ID, Supabase lo generará)
    const testLead = {
      nombre: 'Test Lead',
      telefono: '1234567890',
      estado: 'NUEVO'
    }

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/Lead`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testLead)
    })

    let insertResult = null
    let insertError = null

    if (insertResponse.ok) {
      insertResult = await insertResponse.json()
    } else {
      insertError = {
        status: insertResponse.status,
        text: await insertResponse.text()
      }
    }

    return NextResponse.json({
      success: true,
      connection: 'OK',
      environment: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : null
      },
      leadCount: data,
      testInsert: {
        success: !!insertResult,
        result: insertResult,
        error: insertError
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Error interno',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
