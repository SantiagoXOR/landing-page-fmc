'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useFormOptimization } from '@/hooks/useFormOptimization'
import { OptimizedInput, OptimizedTextarea, OptimizedSelect, FormStatus } from '@/components/ui/optimized-form-field'
import { SelectItem } from '@/components/ui/select'
import { FORMOSA_ZONES } from '@/lib/validators'
import { z } from 'zod'
import { LoadingButton } from '@/components/ui/loading-states'
import { toast } from 'sonner'

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

// Schema específico para el formulario (todos los campos como strings)
const LeadFormSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  telefono: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  email: z.string().email('Email inválido').or(z.literal('')),
  dni: z.string().max(8, 'DNI no puede exceder 8 dígitos').or(z.literal('')),
  ingresos: z.string().or(z.literal('')),
  zona: z.string().or(z.literal('')),
  producto: z.string().or(z.literal('')),
  monto: z.string().or(z.literal('')),
  origen: z.string().or(z.literal('')),
  utmSource: z.string().or(z.literal('')),
  estado: z.string().min(1, 'Estado es requerido'),
  agencia: z.string().or(z.literal('')),
  notas: z.string().or(z.literal(''))
})

export default function NewLeadPage() {
  const router = useRouter()

  // Usar el hook de optimización de formularios
  const {
    data: formData,
    errors,
    touched,
    isValid,
    isDirty,
    isSubmitting,
    lastSaved,
    updateField,
    touchField,
    submitForm,
    getFieldProps
  } = useFormOptimization<LeadFormData>({
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
  }, {
    schema: LeadFormSchema,
    debounceMs: 300,
    autoSaveMs: 0, // Deshabilitado para formulario de creación
    validateOnChange: true,
    validateOnBlur: true,
    onValidationError: (errors) => {
      console.log('Errores de validación:', errors)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const success = await submitForm(async (data) => {
      // Preparar datos para envío
      const leadData = {
        ...data,
        telefono: data.telefono.replace(/[^\d]/g, ''), // Solo números
        ingresos: data.ingresos ? parseInt(data.ingresos) : null,
        monto: data.monto ? parseInt(data.monto) : null,
        // Limpiar campos vacíos
        email: data.email.trim() || null,
        dni: data.dni.trim() || null,
        zona: data.zona.trim() || null,
        producto: data.producto.trim() || null,
        origen: data.origen.trim() || null,
        utmSource: data.utmSource.trim() || null,
        agencia: data.agencia.trim() || null,
        notas: data.notas.trim() || null
      }

      console.log('Sending lead data:', leadData)

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(leadData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        throw new Error(errorData.error || 'Error al crear el lead')
      }

      const newLead = await response.json()

      toast.success('Lead creado exitosamente')

      // Redirigir al lead creado
      router.push(`/leads/${newLead.id}`)
    })

    if (!success) {
      toast.error('Error al crear el lead. Revisa los campos marcados.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/leads">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Leads
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Nuevo Lead</h1>
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
              <OptimizedInput
                label="Nombre"
                placeholder="Nombre completo"
                required
                maxLength={100}
                showValidation={touched.nombre}
                {...getFieldProps('nombre')}
              />

              <OptimizedInput
                label="Teléfono"
                type="tel"
                placeholder="+54 3704 123456"
                required
                hint="Formato: +54 3704 123456 (Formosa)"
                showValidation={touched.telefono}
                {...getFieldProps('telefono')}
              />

              <OptimizedInput
                label="Email"
                type="email"
                placeholder="email@ejemplo.com"
                showValidation={touched.email}
                {...getFieldProps('email')}
              />

              <OptimizedInput
                label="DNI"
                placeholder="12345678"
                hint="Solo números, sin puntos ni espacios"
                maxLength={8}
                showValidation={touched.dni}
                {...getFieldProps('dni')}
              />
            </CardContent>
          </Card>

          {/* Información Comercial */}
          <Card>
            <CardHeader>
              <CardTitle>Información Comercial</CardTitle>
              <CardDescription>Datos del negocio y producto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OptimizedInput
                label="Ingresos Mensuales"
                type="number"
                placeholder="50000"
                hint="Ingresos mensuales en pesos argentinos"
                showValidation={touched.ingresos}
                {...getFieldProps('ingresos')}
              />

              <OptimizedSelect
                label="Zona de Formosa"
                placeholder="Seleccionar zona"
                showValidation={touched.zona}
                value={formData.zona}
                onValueChange={(value) => updateField('zona', value)}
                onBlur={() => touchField('zona')}
              >
                {FORMOSA_ZONES.map((zona) => (
                  <SelectItem key={zona} value={zona}>
                    {zona}
                  </SelectItem>
                ))}
              </OptimizedSelect>

              <OptimizedInput
                label="Producto"
                placeholder="Préstamo personal, hipotecario, etc."
                showValidation={touched.producto}
                {...getFieldProps('producto')}
              />

              <OptimizedInput
                label="Monto Solicitado"
                type="number"
                placeholder="100000"
                hint="Monto en pesos argentinos"
                showValidation={touched.monto}
                {...getFieldProps('monto')}
              />
            </CardContent>
          </Card>

          {/* Información de Marketing */}
          <Card>
            <CardHeader>
              <CardTitle>Origen y Marketing</CardTitle>
              <CardDescription>Fuente y tracking del lead</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OptimizedSelect
                label="Origen"
                placeholder="Seleccionar origen"
                showValidation={touched.origen}
                value={formData.origen}
                onValueChange={(value) => updateField('origen', value)}
                onBlur={() => touchField('origen')}
              >
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="comentario">Comentario</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="ads">Ads</SelectItem>
              </OptimizedSelect>

              <OptimizedInput
                label="UTM Source"
                placeholder="google, facebook, etc."
                hint="Fuente de tráfico para tracking"
                showValidation={touched.utmSource}
                {...getFieldProps('utmSource')}
              />

              <OptimizedInput
                label="Agencia"
                placeholder="Nombre de la agencia"
                showValidation={touched.agencia}
                {...getFieldProps('agencia')}
              />
            </CardContent>
          </Card>

          {/* Estado y Notas */}
          <Card>
            <CardHeader>
              <CardTitle>Estado y Observaciones</CardTitle>
              <CardDescription>Estado actual y notas adicionales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OptimizedSelect
                label="Estado"
                placeholder="Seleccionar estado"
                showValidation={touched.estado}
                value={formData.estado}
                onValueChange={(value) => updateField('estado', value)}
                onBlur={() => touchField('estado')}
              >
                <SelectItem value="NUEVO">Nuevo</SelectItem>
                <SelectItem value="EN_REVISION">En Revisión</SelectItem>
                <SelectItem value="PREAPROBADO">Preaprobado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                <SelectItem value="DOC_PENDIENTE">Doc. Pendiente</SelectItem>
                <SelectItem value="DERIVADO">Derivado</SelectItem>
              </OptimizedSelect>

              <OptimizedTextarea
                label="Notas"
                placeholder="Observaciones adicionales..."
                rows={4}
                maxLength={500}
                hint="Información adicional sobre el lead"
                showValidation={touched.notas}
                {...getFieldProps('notas')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Estado del formulario */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <FormStatus
                isDirty={isDirty}
                isValid={isValid}
                lastSaved={lastSaved}
                autoSaveEnabled={false}
              />
              <div className="text-sm text-gray-500">
                {Object.keys(errors).length > 0 && (
                  <span className="text-red-500">
                    {Object.keys(errors).length} error{Object.keys(errors).length !== 1 ? 'es' : ''} encontrado{Object.keys(errors).length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/leads">Cancelar</Link>
          </Button>
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingText="Creando lead..."
            disabled={!isValid}
          >
            <Save className="w-4 h-4 mr-2" />
            Crear Lead
          </LoadingButton>
        </div>
      </form>
    </div>
  )
}
