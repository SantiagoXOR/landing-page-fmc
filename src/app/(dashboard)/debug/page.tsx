'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface DiagnosticResult {
  timestamp: string
  supabaseConnection: boolean
  leadTableExists: boolean
  pipelineTableExists: boolean
  leadCount: number
  pipelineCount: number
  testResults: any
  errors: string[]
}

export default function DebugPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string>('')

  const runDiagnostics = async (leadId?: string) => {
    setLoading(true)
    try {
      const url = leadId 
        ? `/api/debug/pipeline?leadId=${leadId}`
        : '/api/debug/pipeline'
      
      const response = await fetch(url)
      const data = await response.json()
      setDiagnostics(data)
    } catch (error) {
      console.error('Error running diagnostics:', error)
    } finally {
      setLoading(false)
    }
  }

  const createPipelineTable = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_pipeline_table' })
      })
      const data = await response.json()
      console.log('Create pipeline result:', data)
      
      // Ejecutar diagnósticos nuevamente
      await runDiagnostics()
    } catch (error) {
      console.error('Error creating pipeline table:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const StatusIcon = ({ status }: { status: boolean }) => {
    return status ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Diagnóstico del Sistema</h1>
          <p className="text-muted-foreground">
            Verificación del estado del pipeline y conectividad con Supabase
          </p>
        </div>
        <Button 
          onClick={() => runDiagnostics()} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Actualizar
        </Button>
      </div>

      {diagnostics && (
        <div className="grid gap-6">
          {/* Estado General */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StatusIcon status={diagnostics.supabaseConnection} />
                Estado General del Sistema
              </CardTitle>
              <CardDescription>
                Última verificación: {new Date(diagnostics.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <StatusIcon status={diagnostics.supabaseConnection} />
                  <span>Conexión Supabase</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon status={diagnostics.leadTableExists} />
                  <span>Tabla Leads</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon status={diagnostics.pipelineTableExists} />
                  <span>Tabla Pipeline</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {diagnostics.leadCount} Leads
                  </Badge>
                  <Badge variant="outline">
                    {diagnostics.pipelineCount} Pipelines
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Errores */}
          {diagnostics.errors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Errores Detectados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {diagnostics.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Acciones */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones de Reparación</CardTitle>
              <CardDescription>
                Herramientas para solucionar problemas detectados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!diagnostics.pipelineTableExists && (
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={createPipelineTable}
                    disabled={loading}
                    variant="outline"
                  >
                    Crear Tabla Pipeline
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Crea la tabla lead_pipeline básica en Supabase
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="ID del Lead para probar"
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                />
                <Button 
                  onClick={() => runDiagnostics(selectedLeadId)}
                  disabled={loading || !selectedLeadId}
                  variant="outline"
                >
                  Probar Lead Específico
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resultados de Pruebas */}
          {diagnostics.testResults && Object.keys(diagnostics.testResults).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resultados de Pruebas</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
                  {JSON.stringify(diagnostics.testResults, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Leads de Muestra */}
          {diagnostics.testResults?.sampleLeads && (
            <Card>
              <CardHeader>
                <CardTitle>Leads de Muestra</CardTitle>
                <CardDescription>
                  Primeros 5 leads para testing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {diagnostics.testResults.sampleLeads.map((lead: any) => (
                    <div 
                      key={lead.id} 
                      className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedLeadId(lead.id)
                        runDiagnostics(lead.id)
                      }}
                    >
                      <span className="font-medium">
                        {lead.nombre} {lead.apellido}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{lead.estado}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {lead.id.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
