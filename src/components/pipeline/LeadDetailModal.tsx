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
import { Button } from '@/components/ui/button'
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
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'

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

// Función helper para extraer valor de custom field (puede venir como objeto Manychat o valor directo)
const extractCustomFieldValue = (value: any): string => {
  if (value === null || value === undefined) return 'No especificado'
  
  // Si es un objeto Manychat con estructura {id, name, type, description, value}
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return String(value.value || 'No especificado')
  }
  
  // Si es un objeto pero no tiene estructura Manychat, convertir a string
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  
  return String(value)
}

export function LeadDetailModal({ lead, open, onOpenChange }: LeadDetailModalProps) {
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const { addToast } = useToast()

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

  const handleSyncManychat = async () => {
    if (!lead || !leadDetails) return

    try {
      setSyncing(true)
      setSyncStatus('idle')
      
      const response = await fetch(`/api/leads/${lead.id}/sync-manychat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al sincronizar desde Manychat')
      }

      const result = await response.json()
      
      setSyncStatus('success')
      addToast({
        title: 'Sincronización exitosa',
        description: 'Los datos del lead han sido actualizados desde Manychat',
        type: 'success',
      })

      // Recargar los detalles del lead después de sincronizar
      await fetchLeadDetails()

      // Resetear estado de éxito después de 3 segundos
      setTimeout(() => {
        setSyncStatus('idle')
      }, 3000)
    } catch (error: any) {
      setSyncStatus('error')
      addToast({
        title: 'Error al sincronizar',
        description: error.message || 'No se pudo sincronizar el lead desde Manychat',
        type: 'error',
      })

      // Resetear estado de error después de 5 segundos
      setTimeout(() => {
        setSyncStatus('idle')
      }, 5000)
    } finally {
      setSyncing(false)
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
      const parsed = typeof leadDetails.customFields === 'string'
        ? JSON.parse(leadDetails.customFields)
        : leadDetails.customFields
      
      // Si los custom fields vienen como objetos Manychat con estructura {id, name, type, description, value}
      // necesitamos extraer solo el valor
      const normalized: Record<string, any> = {}
      
      Object.entries(parsed).forEach(([key, value]) => {
        // Si el valor es un objeto con estructura Manychat, extraer solo el valor
        if (value && typeof value === 'object' && value !== null && 'value' in value) {
          normalized[key] = value.value
        } else {
          normalized[key] = value
        }
      })
      
      return normalized
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
  
  // Función helper para extraer CUIL/CUIT/DNI de un valor (puede estar dentro de texto)
  const extractCUILOrDNI = (value: any): string | null => {
    if (!value) return null
    
    const strValue = String(value)
    
    // Buscar patrón CUIL/CUIT con formato XX-XXXXXXXX-X
    const cuilWithDashes = strValue.match(/\b\d{2}-\d{8}-\d{1}\b/)
    if (cuilWithDashes) {
      return cuilWithDashes[0]
    }
    
    // Buscar patrón CUIL/CUIT sin guiones (11 dígitos consecutivos)
    const cuilWithoutDashes = strValue.match(/\b\d{11}\b/)
    if (cuilWithoutDashes) {
      const digits = cuilWithoutDashes[0]
      // Validar que tenga formato de CUIL/CUIT (XX-XXXXXXXX-X)
      if (/^\d{2}\d{8}\d{1}$/.test(digits)) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
      }
    }
    
    // Buscar DNI (8 dígitos) - solo si no encontramos CUIL/CUIT
    const dni = strValue.match(/\b\d{8}\b/)
    if (dni && !cuilWithDashes && !cuilWithoutDashes) {
      return dni[0]
    }
    
    return null
  }
  
  // Extraer CUIL/DNI de customFields si no está en el campo directo
  // Buscar en claves conocidas primero
  let cuilValue = leadDetails?.cuil || customFields.cuit || customFields.cuil || customFields.dni
  
  // Si ya tenemos un valor, intentar extraerlo en caso de que tenga formato incorrecto
  if (cuilValue) {
    const extracted = extractCUILOrDNI(cuilValue)
    if (extracted) {
      cuilValue = extracted
    }
  }
  
  // Si no se encontró, buscar en todos los valores de customFields por patrón
  if (!cuilValue) {
    for (const [key, value] of Object.entries(customFields)) {
      if (value === null || value === undefined) continue
      
      // Intentar extraer CUIL/DNI del valor (puede estar dentro de texto)
      const extracted = extractCUILOrDNI(value)
      if (extracted) {
        cuilValue = extracted
        break
      }
    }
  }
  
  cuilValue = cuilValue || null

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

                  {cuilValue && (
                    <div>
                      <label className="text-xs text-muted-foreground">CUIL/CUIT</label>
                      <span className="text-sm font-medium block mt-1">{cuilValue}</span>
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
              {(leadDetails.manychatId || Object.keys(customFields).length > 0 || tags.length > 0 || leadDetails.telefono) && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Datos de Manychat
                    </h3>
                    <Button
                      onClick={handleSyncManychat}
                      disabled={syncing || (!leadDetails.manychatId && !leadDetails.telefono)}
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                    >
                      {syncing ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                          Sincronizando...
                        </>
                      ) : syncStatus === 'success' ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-2 text-green-600" />
                          Sincronizado
                        </>
                      ) : syncStatus === 'error' ? (
                        <>
                          <AlertCircle className="h-3 w-3 mr-2 text-red-600" />
                          Error
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-2" />
                          Sincronizar desde Manychat
                        </>
                      )}
                    </Button>
                  </div>
                  
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
                        {tags.map((tag: string, index: number) => (
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
                        {Object.entries(customFields).map(([key, value]) => {
                          const displayValue = extractCustomFieldValue(value)
                          return (
                            <div key={key} className="flex justify-between items-start py-2 border-b last:border-0">
                              <span className="text-xs text-muted-foreground capitalize">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-xs font-medium text-right max-w-[60%] break-words">
                                {displayValue}
                              </span>
                            </div>
                          )
                        })}
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

