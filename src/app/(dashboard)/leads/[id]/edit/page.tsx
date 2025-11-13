'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { LeadUpdateSchema, FORMOSA_ZONES } from '@/lib/validators'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface LeadFormData {
  nombre: string
  telefono: string
  email: string
  dni: string
  ingresos: string
  zona: string
  producto: string
  monto: string
  origen: string
  utmSource: string
  estado: string
  agencia: string
  notas: string
}

export default function EditLeadPage() {
  const router = useRouter()
  const params = useParams()
  const { addToast } = useToast()
  const leadId = params.id as string
  
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<LeadFormData>({
    nombre: '',
    telefono: '',
    email: '',
    dni: '',
    ingresos: '',
    zona: '',
    producto: '',
    monto: '',
    origen: '',
    utmSource: '',
    estado: 'NUEVO',
    agencia: '',
    notas: ''
  })

  // Cargar datos del lead
  useEffect(() => {
    const fetchLead = async () => {
      try {
        setLoadingData(true)
        const response = await fetch(`/api/leads/${leadId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/leads')
            return
          }
          throw new Error('Error al cargar el lead')
        }

        const lead = await response.json()
        
        // Poblar el formulario con los datos existentes
        setFormData({
          nombre: lead.nombre || '',
          telefono: lead.telefono || '',
          email: lead.email || '',
          dni: lead.dni || '',
          ingresos: lead.ingresos ? lead.ingresos.toString() : '',
          zona: lead.zona || '',
          producto: lead.producto || '',
          monto: lead.monto ? lead.monto.toString() : '',
          origen: lead.origen || '',
          utmSource: lead.utmSource || '',
          estado: lead.estado || 'NUEVO',
          agencia: lead.agencia || '',
          notas: lead.notas || ''
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
        setError(errorMessage)
        addToast({
          type: 'error',
          title: 'Error al cargar',
          description: errorMessage
        })
      } finally {
        setLoadingData(false)
      }
    }

    if (leadId) {
      fetchLead()
    }
  }, [leadId, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Validación en tiempo real
    validateField(name, value)
  }

  const validateField = (fieldName: string, value: string) => {
    try {
      // Crear objeto temporal para validar solo este campo
      const tempData: any = { ...formData, [fieldName]: value }

      // Convertir valores numéricos si es necesario
      if (fieldName === 'ingresos' || fieldName === 'monto') {
        tempData[fieldName] = value ? parseInt(value) : undefined
      }

      // Validar campo específico
      if (fieldName === 'nombre' && (!value || value.trim().length < 2)) {
        throw new Error('El nombre debe tener al menos 2 caracteres')
      }
      if (fieldName === 'telefono' && (!value || value.trim().length < 8)) {
        throw new Error('El teléfono debe tener al menos 8 dígitos')
      }
      if (fieldName === 'email' && value && !/\S+@\S+\.\S+/.test(value)) {
        throw new Error('Email inválido')
      }
      if (fieldName === 'dni' && value && (value.length < 7 || value.length > 8)) {
        throw new Error('DNI debe tener 7-8 dígitos')
      }

      // Si la validación pasa, remover el error
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    } catch (error: any) {
      // Si hay error de validación, agregarlo
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: error.message || 'Error de validación'
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Preparar datos para validación
      const leadData = {
        ...formData,
        ingresos: formData.ingresos ? parseInt(formData.ingresos) : undefined,
        monto: formData.monto ? parseInt(formData.monto) : undefined,
        // Limpiar campos vacíos
        email: formData.email.trim() || undefined,
        dni: formData.dni.trim() || undefined,
        zona: formData.zona.trim() || undefined,
        producto: formData.producto.trim() || undefined,
        origen: formData.origen.trim() || undefined,
        utmSource: formData.utmSource.trim() || undefined,
        agencia: formData.agencia.trim() || undefined,
        notas: formData.notas.trim() || undefined
      }

      // Validar con Zod
      const validatedData = LeadUpdateSchema.parse(leadData)

      // Preparar datos finales para envío
      const finalData = {
        ...validatedData,
        telefono: validatedData.telefono?.replace(/[^\d]/g, ''), // Solo números
        ingresos: validatedData.ingresos || null,
        monto: validatedData.monto || null,
        email: validatedData.email || null,
        dni: validatedData.dni || null,
        zona: validatedData.zona || null,
        producto: validatedData.producto || null,
        origen: validatedData.origen || null,
        utmSource: validatedData.utmSource || null,
        agencia: validatedData.agencia || null,
        notas: validatedData.notas || null
      }

      console.log('Updating lead data:', finalData)

      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(finalData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        throw new Error(errorData.error || 'Error al actualizar el lead')
      }

      // Mostrar mensaje de éxito y redirigir
      addToast({
        type: 'success',
        title: 'Lead actualizado',
        description: 'Los datos del lead han sido actualizados exitosamente'
      })

      router.push(`/leads/${leadId}`)
    } catch (err: any) {
      let errorMessage = 'Error desconocido'

      // Manejar errores de validación Zod
      if (err.errors && Array.isArray(err.errors)) {
        const validationErrors: Record<string, string> = {}
        err.errors.forEach((error: any) => {
          if (error.path && error.path.length > 0) {
            validationErrors[error.path[0]] = error.message
          }
        })
        setValidationErrors(validationErrors)
        errorMessage = 'Por favor corrige los errores en el formulario'
      } else if (err instanceof Error) {
        errorMessage = err.message
      }

      setError(errorMessage)
      addToast({
        type: 'error',
        title: 'Error al actualizar',
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando datos del lead...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/leads/${leadId}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Lead
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Editar Lead</h1>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Datos básicos del lead</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Nombre completo"
                  required
                  className={validationErrors.nombre ? 'border-red-500' : ''}
                />
                {validationErrors.nombre && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.nombre}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  placeholder="+54 3704 123456 (Formosa)"
                  required
                  className={validationErrors.telefono ? 'border-red-500' : ''}
                />
                {validationErrors.telefono && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.telefono}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@ejemplo.com"
                  className={validationErrors.email ? 'border-red-500' : ''}
                />
                {validationErrors.email && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.email}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  name="dni"
                  value={formData.dni}
                  onChange={handleInputChange}
                  placeholder="12345678 (7-8 dígitos)"
                  className={validationErrors.dni ? 'border-red-500' : ''}
                />
                {validationErrors.dni && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.dni}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información Comercial */}
          <Card>
            <CardHeader>
              <CardTitle>Información Comercial</CardTitle>
              <CardDescription>Datos del negocio y producto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ingresos">Ingresos Mensuales</Label>
                <Input
                  id="ingresos"
                  name="ingresos"
                  type="number"
                  value={formData.ingresos}
                  onChange={handleInputChange}
                  placeholder="50000"
                  className={validationErrors.ingresos ? 'border-red-500' : ''}
                />
                {validationErrors.ingresos && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.ingresos}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="zona">Zona de Formosa</Label>
                <Select value={formData.zona} onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, zona: value }))
                  validateField('zona', value)
                }}>
                  <SelectTrigger className={validationErrors.zona ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecciona una zona de Formosa" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMOSA_ZONES.map((zona) => (
                      <SelectItem key={zona} value={zona}>
                        {zona}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.zona && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.zona}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="producto">Producto</Label>
                <Input
                  id="producto"
                  name="producto"
                  value={formData.producto}
                  onChange={handleInputChange}
                  placeholder="Préstamo personal, hipotecario, etc."
                />
              </div>
              
              <div>
                <Label htmlFor="monto">Monto Solicitado</Label>
                <Input
                  id="monto"
                  name="monto"
                  type="number"
                  value={formData.monto}
                  onChange={handleInputChange}
                  placeholder="100000"
                />
              </div>
            </CardContent>
          </Card>
          {/* Información de Marketing */}
          <Card>
            <CardHeader>
              <CardTitle>Origen y Marketing</CardTitle>
              <CardDescription>Fuente y tracking del lead</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="origen">Origen</Label>
                <select
                  id="origen"
                  name="origen"
                  value={formData.origen}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar origen</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="comentario">Comentario</option>
                  <option value="web">Web</option>
                  <option value="ads">Ads</option>
                </select>
              </div>

              <div>
                <Label htmlFor="utmSource">UTM Source</Label>
                <Input
                  id="utmSource"
                  name="utmSource"
                  value={formData.utmSource}
                  onChange={handleInputChange}
                  placeholder="google, facebook, etc."
                />
              </div>

              <div>
                <Label htmlFor="agencia">Agencia</Label>
                <Input
                  id="agencia"
                  name="agencia"
                  value={formData.agencia}
                  onChange={handleInputChange}
                  placeholder="Nombre de la agencia"
                />
              </div>
            </CardContent>
          </Card>

          {/* Estado y Notas */}
          <Card>
            <CardHeader>
              <CardTitle>Estado y Observaciones</CardTitle>
              <CardDescription>Estado actual y notas adicionales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="estado">Estado</Label>
                <select
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="NUEVO">Nuevo</option>
                  <option value="EN_REVISION">En Revisión</option>
                  <option value="PREAPROBADO">Preaprobado</option>
                  <option value="RECHAZADO">Rechazado</option>
                  <option value="DOC_PENDIENTE">Doc. Pendiente</option>
                  <option value="DERIVADO">Derivado</option>
                </select>
              </div>

              <div>
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  name="notas"
                  value={formData.notas}
                  onChange={handleInputChange}
                  placeholder="Observaciones adicionales..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Botones */}
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href={`/leads/${leadId}`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Actualizar Lead
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
