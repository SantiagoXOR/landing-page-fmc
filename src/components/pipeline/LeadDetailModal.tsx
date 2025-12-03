'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-states'
import { PipelineLead } from '@/types/pipeline'
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Building2, 
  Briefcase,
  Tag,
  ExternalLink,
  Calendar,
  FileText
} from 'lucide-react'
import Link from 'next/link'

interface LeadDetailModalProps {
  lead: PipelineLead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface LeadDetails {
  id: string
  nombre: string
  telefono: string
  email?: string
  dni?: string
  cuil?: string
  zona?: string
  ingresos?: number
  producto?: string
  monto?: number
  banco?: string
  trabajo_actual?: string
  origen?: string
  estado?: string
  agencia?: string
  manychatId?: string
  tags?: string[]
  customFields?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

export function LeadDetailModal({ lead, open, onOpenChange }: LeadDetailModalProps) {
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && lead) {
      fetchLeadDetails()
    } else {
      setLeadDetails(null)
    }
  }, [open, lead])

  const fetchLeadDetails = async () => {
    if (!lead) return

    try {
      setLoading(true)
      const response = await fetch(`/api/leads/${lead.id}`)
      if (response.ok) {
        const data = await response.json()
        setLeadDetails(data)
      }
    } catch (error) {
      console.error('Error fetching lead details:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value?: number) => {
    if (!value) return 'No especificado'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificado'
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const parseCustomFields = () => {
    if (!leadDetails?.customFields) return {}
    
    try {
      return typeof leadDetails.customFields === 'string'
        ? JSON.parse(leadDetails.customFields)
        : leadDetails.customFields
    } catch {
      return {}
    }
  }

  const parseTags = () => {
    if (!leadDetails?.tags) return []
    
    try {
      return typeof leadDetails.tags === 'string'
        ? JSON.parse(leadDetails.tags)
        : Array.isArray(leadDetails.tags)
        ? leadDetails.tags
        : []
    } catch {
      return []
    }
  }

  const customFields = parseCustomFields()
  const tags = parseTags()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : leadDetails ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {leadDetails.nombre}
              </DialogTitle>
              <DialogDescription>
                Detalles del lead y datos de Manychat
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Información básica */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Información Básica
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Teléfono</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{leadDetails.telefono}</span>
                    </div>
                  </div>
                  
                  {leadDetails.email && (
                    <div>
                      <label className="text-xs text-muted-foreground">Email</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{leadDetails.email}</span>
                      </div>
                    </div>
                  )}

                  {leadDetails.dni && (
                    <div>
                      <label className="text-xs text-muted-foreground">DNI</label>
                      <span className="text-sm font-medium block mt-1">{leadDetails.dni}</span>
                    </div>
                  )}

                  {leadDetails.cuil && (
                    <div>
                      <label className="text-xs text-muted-foreground">CUIL/CUIT</label>
                      <span className="text-sm font-medium block mt-1">{leadDetails.cuil}</span>
                    </div>
                  )}

                  {leadDetails.zona && (
                    <div>
                      <label className="text-xs text-muted-foreground">Zona</label>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{leadDetails.zona}</span>
                      </div>
                    </div>
                  )}

                  {leadDetails.origen && (
                    <div>
                      <label className="text-xs text-muted-foreground">Origen</label>
                      <Badge variant="outline" className="mt-1">
                        {leadDetails.origen}
                      </Badge>
                    </div>
                  )}

                  {leadDetails.estado && (
                    <div>
                      <label className="text-xs text-muted-foreground">Estado</label>
                      <Badge variant="secondary" className="mt-1">
                        {leadDetails.estado}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Información financiera */}
              {(leadDetails.ingresos || leadDetails.monto) && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Información Financiera
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {leadDetails.ingresos && (
                      <div>
                        <label className="text-xs text-muted-foreground">Ingresos</label>
                        <span className="text-sm font-medium block mt-1">
                          {formatCurrency(leadDetails.ingresos)}
                        </span>
                      </div>
                    )}
                    {leadDetails.monto && (
                      <div>
                        <label className="text-xs text-muted-foreground">Monto Solicitado</label>
                        <span className="text-sm font-medium block mt-1">
                          {formatCurrency(leadDetails.monto)}
                        </span>
                      </div>
                    )}
                    {leadDetails.producto && (
                      <div>
                        <label className="text-xs text-muted-foreground">Producto</label>
                        <span className="text-sm font-medium block mt-1">{leadDetails.producto}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Información laboral */}
              {(leadDetails.banco || leadDetails.trabajo_actual) && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Información Laboral
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {leadDetails.banco && (
                      <div>
                        <label className="text-xs text-muted-foreground">Banco</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{leadDetails.banco}</span>
                        </div>
                      </div>
                    )}
                    {leadDetails.trabajo_actual && (
                      <div>
                        <label className="text-xs text-muted-foreground">Trabajo Actual</label>
                        <span className="text-sm font-medium block mt-1">
                          {leadDetails.trabajo_actual}
                        </span>
                      </div>
                    )}
                    {leadDetails.agencia && (
                      <div>
                        <label className="text-xs text-muted-foreground">Agencia</label>
                        <span className="text-sm font-medium block mt-1">{leadDetails.agencia}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Datos de Manychat */}
              {(leadDetails.manychatId || Object.keys(customFields).length > 0 || tags.length > 0) && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Datos de Manychat
                  </h3>
                  
                  {leadDetails.manychatId && (
                    <div className="mb-4">
                      <label className="text-xs text-muted-foreground">ID Manychat</label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-mono">{leadDetails.manychatId}</span>
                        <Link
                          href={`https://manychat.com/subscribers/${leadDetails.manychatId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Ver en Manychat
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {tags.length > 0 && (
                    <div className="mb-4">
                      <label className="text-xs text-muted-foreground mb-2 block">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(customFields).length > 0 && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Custom Fields</label>
                      <div className="space-y-2">
                        {Object.entries(customFields).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-start py-2 border-b last:border-0">
                            <span className="text-xs text-muted-foreground capitalize">
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <span className="text-xs font-medium text-right max-w-[60%] break-words">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fechas */}
              {(leadDetails.createdAt || leadDetails.updatedAt) && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fechas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {leadDetails.createdAt && (
                      <div>
                        <label className="text-xs text-muted-foreground">Creado</label>
                        <span className="text-sm font-medium block mt-1">
                          {formatDate(leadDetails.createdAt)}
                        </span>
                      </div>
                    )}
                    {leadDetails.updatedAt && (
                      <div>
                        <label className="text-xs text-muted-foreground">Actualizado</label>
                        <span className="text-sm font-medium block mt-1">
                          {formatDate(leadDetails.updatedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Link a página completa */}
              <div className="pt-4 border-t">
                <Link
                  href={`/leads/${leadDetails.id}`}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-2"
                >
                  Ver página completa del lead
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No se pudieron cargar los detalles del lead
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

