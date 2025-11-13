import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { pipelineService } from '@/server/services/pipeline-service'
import { logger } from '@/lib/logger'

// Define types for better type safety
interface DiagnosticsTestResults {
  leadId?: string
  leadExists?: boolean
  leadData?: any
  pipelineExists?: boolean
  pipelineData?: any
  pipelineCreated?: boolean
  newPipelineData?: any
  sampleLeads?: any[]
  samplePipelines?: any[]
}

interface DiagnosticsResponse {
  timestamp: string
  supabaseConnection: boolean
  leadTableExists: boolean
  pipelineTableExists: boolean
  leadCount: number
  pipelineCount: number
  testResults: DiagnosticsTestResults
  errors: string[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    const diagnostics: DiagnosticsResponse = {
      timestamp: new Date().toISOString(),
      supabaseConnection: false,
      leadTableExists: false,
      pipelineTableExists: false,
      leadCount: 0,
      pipelineCount: 0,
      testResults: {},
      errors: []
    }

    // 1. Probar conexión con Supabase
    try {
      await supabase.request('/Lead?select=count&limit=1')
      diagnostics.supabaseConnection = true
      diagnostics.leadTableExists = true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      diagnostics.errors.push(`Supabase connection error: ${errorMessage}`)
    }

    // 2. Contar leads
    try {
      const leadsResponse = await supabase.request('/Lead?select=count', {
        headers: { 'Prefer': 'count=exact' }
      })
      diagnostics.leadCount = leadsResponse[0]?.count || 0
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      diagnostics.errors.push(`Lead count error: ${errorMessage}`)
    }

    // 3. Verificar tabla pipeline
    try {
      const pipelineResponse = await supabase.request('/lead_pipeline?select=count&limit=1')
      diagnostics.pipelineTableExists = true

      const pipelineCountResponse = await supabase.request('/lead_pipeline?select=count', {
        headers: { 'Prefer': 'count=exact' }
      })
      diagnostics.pipelineCount = pipelineCountResponse[0]?.count || 0
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      diagnostics.errors.push(`Pipeline table error: ${errorMessage}`)
    }

    // 4. Si se proporciona leadId, probar operaciones específicas
    if (leadId) {
      diagnostics.testResults.leadId = leadId
      
      // Verificar que el lead existe
      try {
        const lead = await supabase.request(`/Lead?id=eq.${leadId}&limit=1`)
        if (lead.length > 0) {
          diagnostics.testResults.leadExists = true
          diagnostics.testResults.leadData = lead[0]
        } else {
          diagnostics.testResults.leadExists = false
          diagnostics.errors.push(`Lead ${leadId} not found`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        diagnostics.errors.push(`Error checking lead: ${errorMessage}`)
      }

      // Probar obtener pipeline
      try {
        const pipeline = await pipelineService.getLeadPipeline(leadId)
        if (pipeline) {
          diagnostics.testResults.pipelineExists = true
          diagnostics.testResults.pipelineData = pipeline
        } else {
          diagnostics.testResults.pipelineExists = false

          // Intentar crear pipeline
          try {
            const newPipeline = await pipelineService.createLeadPipeline(leadId, 'test-user')
            diagnostics.testResults.pipelineCreated = true
            diagnostics.testResults.newPipelineData = newPipeline
          } catch (createError) {
            const createErrorMessage = createError instanceof Error ? createError.message : 'Unknown error'
            diagnostics.testResults.pipelineCreated = false
            diagnostics.errors.push(`Error creating pipeline: ${createErrorMessage}`)
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        diagnostics.errors.push(`Error with pipeline service: ${errorMessage}`)
      }
    }

    // 5. Obtener algunos leads de muestra para testing
    try {
      const sampleLeads = await supabase.request('/Lead?select=id,nombre,apellido,estado&limit=5')
      diagnostics.testResults.sampleLeads = sampleLeads
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      diagnostics.errors.push(`Error getting sample leads: ${errorMessage}`)
    }

    // 6. Verificar estructura de la tabla pipeline si existe
    if (diagnostics.pipelineTableExists) {
      try {
        const samplePipelines = await supabase.request('/lead_pipeline?select=*&limit=3')
        diagnostics.testResults.samplePipelines = samplePipelines
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        diagnostics.errors.push(`Error getting sample pipelines: ${errorMessage}`)
      }
    }

    return NextResponse.json(diagnostics, { status: 200 })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST para crear tabla pipeline básica
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'create_pipeline_table') {
      // Intentar crear un pipeline básico para un lead existente
      const leads = await supabase.request('/Lead?select=id&limit=1')
      
      if (leads.length === 0) {
        return NextResponse.json({ error: 'No leads found to test with' }, { status: 400 })
      }

      const leadId = leads[0].id
      
      // Verificar si ya tiene pipeline
      try {
        const existingPipeline = await supabase.request(`/lead_pipeline?lead_id=eq.${leadId}&limit=1`)
        if (existingPipeline.length > 0) {
          return NextResponse.json({ 
            message: 'Pipeline already exists',
            pipeline: existingPipeline[0]
          })
        }
      } catch (error) {
        // La tabla no existe, esto es esperado
      }

      // Crear pipeline básico
      const pipelineData = {
        lead_id: leadId,
        current_stage: 'LEAD_NUEVO',
        probability_percent: 10,
        total_value: 50000,
        expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }

      try {
        const newPipeline = await supabase.request('/lead_pipeline', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(pipelineData)
        })

        return NextResponse.json({
          message: 'Pipeline created successfully',
          pipeline: newPipeline[0]
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({
          error: 'Failed to create pipeline',
          message: errorMessage,
          sqlNeeded: `
            CREATE TABLE IF NOT EXISTS lead_pipeline (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              lead_id UUID NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
              current_stage TEXT NOT NULL DEFAULT 'LEAD_NUEVO',
              probability_percent INTEGER DEFAULT 10,
              total_value DECIMAL(15,2) DEFAULT 50000,
              expected_close_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: 'POST diagnostic failed',
      message: errorMessage
    }, { status: 500 })
  }
}
