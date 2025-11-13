import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { checkUserPermission } from '@/lib/rbac'

interface ReportConfig {
  name: string
  description: string
  type: 'leads' | 'pipeline' | 'conversion' | 'custom'
  dateRange: {
    from: string | null
    to: string | null
  }
  filters: {
    zonas?: string[]
    estados?: string[]
    origenes?: string[]
    assignedTo?: string
  }
  groupBy: string[]
  metrics: string[]
}

/**
 * POST /api/reports/generate
 * Generar un reporte personalizado
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permiso
    const hasReadPermission = await checkUserPermission(session.user.id, 'reports', 'read')
    
    if (!hasReadPermission) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para generar reportes'
      }, { status: 403 })
    }

    const config: ReportConfig = await request.json()

    if (!supabase.client) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }

    // Construir query base
    let query = supabase.client.from('"Lead"').select('*')

    // Aplicar filtros de fecha
    if (config.dateRange.from) {
      query = query.gte('createdAt', config.dateRange.from)
    }
    if (config.dateRange.to) {
      query = query.lte('createdAt', config.dateRange.to)
    }

    // Aplicar filtros adicionales
    if (config.filters.zonas && config.filters.zonas.length > 0) {
      query = query.in('zona', config.filters.zonas)
    }
    if (config.filters.estados && config.filters.estados.length > 0) {
      query = query.in('estado', config.filters.estados)
    }
    if (config.filters.origenes && config.filters.origenes.length > 0) {
      query = query.in('origen', config.filters.origenes)
    }

    const { data: leads, error } = await query

    if (error) throw error

    // Procesar datos según configuración
    let reportData: any = {
      metadata: {
        generated_at: new Date().toISOString(),
        generated_by: session.user.email,
        config,
        total_records: leads?.length || 0
      },
      data: []
    }

    if (config.type === 'leads') {
      // Agrupar por zona
      if (config.groupBy.includes('zona')) {
        const groupedByZona = leads?.reduce((acc: any, lead: any) => {
          const zona = lead.zona || 'Sin zona'
          if (!acc[zona]) {
            acc[zona] = {
              zona,
              count: 0,
              total_ingresos: 0,
              avg_ingresos: 0
            }
          }
          acc[zona].count++
          acc[zona].total_ingresos += lead.ingresos || 0
          return acc
        }, {})

        reportData.data = Object.values(groupedByZona || {}).map((item: any) => ({
          ...item,
          avg_ingresos: item.total_ingresos / item.count
        }))
      }
    } else if (config.type === 'pipeline') {
      // Obtener datos del pipeline
      const { data: pipelines, error: pipelineError } = await supabase.client!
        .from('lead_pipeline')
        .select('*')

      if (pipelineError) throw pipelineError

      const groupedByStage = pipelines?.reduce((acc: any, pipeline: any) => {
        const stage = pipeline.current_stage || 'SIN_ETAPA'
        if (!acc[stage]) {
          acc[stage] = {
            stage,
            count: 0,
            total_value: 0,
            avg_probability: 0
          }
        }
        acc[stage].count++
        acc[stage].total_value += Number(pipeline.expected_value || 0)
        acc[stage].avg_probability += pipeline.probability_percent || 0
        return acc
      }, {})

      reportData.data = Object.values(groupedByStage || {}).map((item: any) => ({
        ...item,
        avg_probability: item.avg_probability / item.count
      }))
    } else {
      // Reporte simple de conteo
      reportData.data = leads || []
    }

    console.log('[Reports] Report generated:', {
      type: config.type,
      recordsFound: leads?.length || 0,
      userId: session.user.id
    })

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('[Reports] Error generating report:', error)
    return NextResponse.json({ 
      error: 'Failed to generate report'
    }, { status: 500 })
  }
}

