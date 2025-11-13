import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkUserPermission } from '@/lib/rbac'

/**
 * POST /api/reports/export/excel
 * Exportar reporte a CSV (compatible con Excel)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasExportPermission = await checkUserPermission(session.user.id, 'reports', 'create')
    
    if (!hasExportPermission) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para exportar reportes'
      }, { status: 403 })
    }

    const { reportData, config } = await request.json()

    // Generar CSV
    const csv = generateCSV(reportData.data, config)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte-${config.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv"`
      }
    })
  } catch (error) {
    console.error('[Reports] Error exporting Excel:', error)
    return NextResponse.json({ 
      error: 'Failed to export Excel'
    }, { status: 500 })
  }
}

function generateCSV(data: any[], config: any): string {
  if (!data || data.length === 0) {
    return 'Sin datos'
  }

  // Obtener headers
  const headers = Object.keys(data[0])
  
  // Crear línea de headers
  const headerRow = headers.map(h => `"${formatHeaderName(h)}"`).join(',')

  // Crear líneas de datos
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header]
      // Escapar comillas y envolver en comillas si contiene comas o saltos de línea
      if (value === null || value === undefined) return ''
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(',')
  }).join('\n')

  // Agregar BOM para que Excel reconozca UTF-8
  return '\ufeff' + headerRow + '\n' + dataRows
}

function formatHeaderName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

