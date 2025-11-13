'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Search, Plus, Download } from 'lucide-react'

interface Lead {
  id: string
  nombre: string
  telefono: string
  email?: string
  estado: string
  origen?: string
  ingresos?: number
  zona?: string
  createdAt: string
}

interface LeadsResponse {
  leads: Lead[]
  total: number
  page: number
  totalPages: number
}

export default function LeadsContent() {
  const { data: session } = useSession()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [origen, setOrigen] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { q: search }),
        ...(estado && { estado }),
        ...(origen && { origen }),
      })

      const response = await fetch(`/api/leads?${params}`)
      if (response.ok) {
        const data: LeadsResponse = await response.json()
        setLeads(data.leads)
        setTotalPages(data.totalPages)
        setTotalLeads(data.total)
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [page, search, estado, origen])

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      NUEVO: 'default',
      EN_REVISION: 'secondary',
      PREAPROBADO: 'default',
      RECHAZADO: 'destructive',
      DOC_PENDIENTE: 'outline',
      DERIVADO: 'secondary',
    }
    return <Badge variant={variants[estado] || 'default'}>{estado}</Badge>
  }

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams({
        ...(search && { q: search }),
        ...(estado && { estado }),
        ...(origen && { origen }),
        limit: '1000',
      })

      const response = await fetch(`/api/leads?${params}`)
      if (response.ok) {
        const data: LeadsResponse = await response.json()
        
        const headers = ['Nombre', 'Teléfono', 'Email', 'Estado', 'Origen', 'Ingresos', 'Zona', 'Fecha']
        const csvContent = [
          headers.join(','),
          ...data.leads.map(lead => [
            lead.nombre,
            lead.telefono,
            lead.email || '',
            lead.estado,
            lead.origen || '',
            lead.ingresos || '',
            lead.zona || '',
            new Date(lead.createdAt).toLocaleDateString('es-AR')
          ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting CSV:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Leads</h1>
        <div className="flex space-x-2">
          <Button onClick={exportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="NUEVO">Nuevo</option>
              <option value="EN_REVISION">En Revisión</option>
              <option value="PREAPROBADO">Preaprobado</option>
              <option value="RECHAZADO">Rechazado</option>
              <option value="DOC_PENDIENTE">Doc. Pendiente</option>
              <option value="DERIVADO">Derivado</option>
            </select>
            <select
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos los orígenes</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="web">Web</option>
              <option value="ads">Ads</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de leads */}
      <Card>
        <CardHeader>
          <CardTitle>
            Leads ({totalLeads})
            {(estado || origen || search) && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (filtrado{estado && ` por estado: ${estado}`}{origen && ` por origen: ${origen}`}{search && ` por búsqueda: "${search}"`})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No se encontraron leads</div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => (
                <div key={lead.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <Link href={`/leads/${lead.id}`} className="font-medium text-blue-600 hover:underline">
                          {lead.nombre}
                        </Link>
                        {getEstadoBadge(lead.estado)}
                        {lead.origen && (
                          <Badge variant="outline">{lead.origen}</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {lead.telefono} • {lead.email || 'Sin email'}
                        {lead.ingresos && ` • ${formatCurrency(lead.ingresos)}`}
                        {lead.zona && ` • ${lead.zona}`}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {formatDate(new Date(lead.createdAt))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
