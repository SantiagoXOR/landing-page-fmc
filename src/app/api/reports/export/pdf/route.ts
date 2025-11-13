import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkUserPermission } from '@/lib/rbac'

/**
 * POST /api/reports/export/pdf
 * Exportar reporte a PDF
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

    // Generar HTML del reporte
    const html = generateReportHTML(reportData, config, session.user.email || '')

    // Por ahora retornamos el HTML que el navegador puede imprimir como PDF
    // En producción, se usaría una librería como @react-pdf/renderer o puppeteer
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="reporte-${Date.now()}.html"`
      }
    })
  } catch (error) {
    console.error('[Reports] Error exporting PDF:', error)
    return NextResponse.json({ 
      error: 'Failed to export PDF'
    }, { status: 500 })
  }
}

function generateReportHTML(reportData: any, config: any, userEmail: string): string {
  const date = new Date().toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${config.name || 'Reporte'} - CRM Phorencial</title>
  <style>
    @media print {
      .no-print { display: none; }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      border-bottom: 3px solid #a855f7;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      color: #a855f7;
      margin: 0;
    }
    .metadata {
      color: #666;
      font-size: 14px;
      margin-top: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .no-print {
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" style="padding: 10px 20px; background: #a855f7; color: white; border: none; border-radius: 5px; cursor: pointer;">
      Imprimir / Guardar como PDF
    </button>
  </div>

  <div class="header">
    <h1>${config.name || 'Reporte Personalizado'}</h1>
    <p class="metadata">
      ${config.description || ''}<br>
      Generado: ${date}<br>
      Por: ${userEmail}<br>
      Total de registros: ${reportData.metadata?.total_records || 0}
    </p>
  </div>

  <table>
    <thead>
      <tr>
        ${generateTableHeaders(reportData.data)}
      </tr>
    </thead>
    <tbody>
      ${generateTableRows(reportData.data)}
    </tbody>
  </table>

  <div class="footer">
    <p>CRM Phorencial - Sistema de Gestión de Leads para Formosa</p>
    <p>Este reporte es confidencial y solo para uso interno</p>
  </div>
</body>
</html>
  `.trim()
}

function generateTableHeaders(data: any[]): string {
  if (!data || data.length === 0) return '<th>Sin datos</th>'
  
  const keys = Object.keys(data[0])
  return keys.map(key => `<th>${formatHeaderName(key)}</th>`).join('')
}

function generateTableRows(data: any[]): string {
  if (!data || data.length === 0) return '<tr><td>Sin datos</td></tr>'
  
  return data.map(row => {
    const keys = Object.keys(row)
    const cells = keys.map(key => `<td>${formatCellValue(row[key])}</td>`).join('')
    return `<tr>${cells}</tr>`
  }).join('')
}

function formatHeaderName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') return value.toLocaleString('es-AR')
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return String(value)
}
