'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Send, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  telefono: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  email: z.string().email('Email inválido'),
  dni: z.string().min(7, 'DNI/CUIT debe tener al menos 7 dígitos').max(11, 'DNI/CUIT debe tener máximo 11 dígitos'),
  ingresos: z.string().min(1, 'Los ingresos son requeridos'),
  marca: z.string().min(1, 'Selecciona una marca'),
  modelo: z.string().min(1, 'El modelo es requerido'),
  precio: z.string().min(1, 'El precio es requerido'),
  cuotas: z.string().min(1, 'Selecciona la cantidad de cuotas'),
  comentarios: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

const marcas = [
  'Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Corven', 'Gilera', 
  'Zanella', 'Mondial', 'Keller', 'Otra'
]

const cuotasOptions = ['12', '18', '24', '36', '48', '60']

export function CreditForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(1)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      telefono: '',
      email: '',
      dni: '',
      ingresos: '',
      marca: '',
      modelo: '',
      precio: '',
      cuotas: '',
      comentarios: '',
    },
  })

  // Progreso del formulario y clases consistentes
  const values = useWatch({ control: form.control }) as Partial<FormData>
  const requiredKeys: (keyof FormData)[] = ['nombre','apellido','telefono','email','dni','ingresos','marca','modelo','precio','cuotas']
  const filledCount = requiredKeys.filter((k) => (values?.[k] ?? '').toString().trim().length > 0).length
  const progress = Math.round((filledCount / requiredKeys.length) * 100)
  const inputClasses = 'font-acto-regular border-fmc-purple/30 focus-visible:outline-none focus:border-fmc-green focus:ring-2 focus:ring-fmc-green/40 placeholder:text-gray-400'

  const stepFields: Record<number, (keyof FormData)[]> = {
    1: ['nombre','apellido','dni','telefono','email'],
    2: ['ingresos','marca','modelo','precio','cuotas'],
    3: ['comentarios'],
  }

  const nextStep = async () => {
    const fields = stepFields[step]
    const valid = await form.trigger(fields as any)
    if (!valid) return
    setStep((s) => Math.min(3, s + 1))
  }

  const prevStep = () => setStep((s) => Math.max(1, s - 1))

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    
    try {
      // Formatear el mensaje para WhatsApp
      const mensaje = `🏍️ *SOLICITUD DE CRÉDITO MOTO*

👤 *DATOS PERSONALES:*
• Nombre: ${data.nombre} ${data.apellido}
• DNI: ${data.dni}
• Teléfono: ${data.telefono}
• Email: ${data.email}
• Ingresos: $${data.ingresos}

🏍️ *MOTO DE INTERÉS:*
• Marca: ${data.marca}
• Modelo: ${data.modelo}
• Precio: $${data.precio}
• Cuotas deseadas: ${data.cuotas} meses

${data.comentarios ? `💬 *COMENTARIOS:*\n${data.comentarios}` : ''}

---
Enviado desde FormosaMotoCredito.com`

      // Codificar el mensaje para URL
      const mensajeCodificado = encodeURIComponent(mensaje)
      const numeroWhatsApp = '5493704069592' // Formato internacional
      const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`
      
      // Abrir WhatsApp
      window.open(urlWhatsApp, '_blank')
      
      // Mostrar mensaje de éxito
      toast.success('¡Formulario enviado! Te redirigimos a WhatsApp para completar tu solicitud.')
      
      // Limpiar formulario
      form.reset()
      
    } catch (error) {
      console.error('Error al enviar formulario:', error)
      toast.error('Error al enviar el formulario. Por favor, intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fmc-bg-4 bg-cover bg-center p-4 md:p-8 rounded-xl -mt-8">
      <Card className="w-full max-w-2xl mx-auto bg-white border-fmc-purple/20 shadow-lg">
      <CardHeader className="text-center bg-gradient-fmc-secondary">
        <div className="flex items-center justify-center gap-2">
          <Badge className="bg-white text-fmc-purple border-fmc-purple/30">Atención personalizada</Badge>
        </div>
        <CardTitle className="text-2xl font-acto-bold text-white">
          Solicitar Crédito para Moto
        </CardTitle>
        <CardDescription className="text-white/90 font-acto-regular">
          Completa el formulario y te contactaremos por WhatsApp para procesar tu solicitud
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-acto-medium text-fmc-purple">Progreso del formulario</span>
            <span className="text-sm font-acto-regular text-fmc-purple/80">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-fmc-purple/10" />
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Datos Personales */}
            {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-acto-semibold text-fmc-purple">Datos Personales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-acto-medium text-fmc-purple">Nombre *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Tu nombre" 
                          className={cn(inputClasses)} 
                          aria-invalid={!!form.formState.errors.nombre}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-fmc-purple/70">Como figura en tu DNI</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apellido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-acto-medium text-fmc-purple">Apellido *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Tu apellido" 
                          className={cn(inputClasses)} 
                          aria-invalid={!!form.formState.errors.apellido}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-fmc-purple/70">Como figura en tu DNI</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-acto-medium text-fmc-purple">DNI/CUIT *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="12345678" 
                          className={cn(inputClasses)} 
                          aria-invalid={!!form.formState.errors.dni}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-fmc-purple/70">Sin puntos ni espacios</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-acto-medium text-fmc-purple">Teléfono *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="3704069592" 
                          className={cn(inputClasses)} 
                          aria-invalid={!!form.formState.errors.telefono}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-fmc-purple/70">WhatsApp o celular con código de área</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-acto-medium text-fmc-purple">Email *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="tu@email.com" 
                          className={cn(inputClasses)} 
                          aria-invalid={!!form.formState.errors.email}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-fmc-purple/70">Usaremos este correo para enviarte tu propuesta</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ingresos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-acto-medium text-fmc-purple">Ingresos Mensuales *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="500000" 
                          className={cn(inputClasses)} 
                          aria-invalid={!!form.formState.errors.ingresos}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-fmc-purple/70">Monto mensual aproximado</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            )}

            {/* Datos de la Moto */}
            {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-acto-semibold text-fmc-purple">Moto de Interés</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="marca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-acto-medium text-fmc-purple">Marca *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(inputClasses)}>
                            <SelectValue placeholder="Selecciona una marca" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {marcas.map((marca) => (
                            <SelectItem key={marca} value={marca} className="font-acto-regular">
                              {marca}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-fmc-purple/70">Elige tu marca preferida</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modelo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-acto-medium text-fmc-purple">Modelo *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej: CB 190R" 
                          className={cn(inputClasses)} 
                          aria-invalid={!!form.formState.errors.modelo}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-fmc-purple/70">Indica el modelo deseado</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="precio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-acto-medium text-fmc-purple">Precio Aproximado *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="2500000" 
                          className={cn(inputClasses)} 
                          aria-invalid={!!form.formState.errors.precio}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-fmc-purple/70">Precio de referencia de la moto</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cuotas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-acto-medium text-fmc-purple">Cuotas Deseadas *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(inputClasses)}>
                            <SelectValue placeholder="Selecciona cuotas" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cuotasOptions.map((cuota) => (
                            <SelectItem key={cuota} value={cuota} className="font-acto-regular">
                              {cuota} meses
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-fmc-purple/70">Elige el plazo que prefieras</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            )}

            {/* Comentarios */}
            {step === 3 && (
            <FormField
              control={form.control}
              name="comentarios"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-acto-medium text-fmc-purple">Comentarios Adicionales</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Cuéntanos más sobre tu solicitud..."
                      className={cn('min-h-[100px]', 'font-acto-regular border-fmc-purple/30 focus-visible:outline-none focus:border-fmc-green focus:ring-2 focus:ring-fmc-green/40 placeholder:text-gray-400')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-fmc-purple/70">Opcional: detalles que quieras contarnos</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {/* Navegación del wizard y envío */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                {step > 1 && (
                  <Button type="button" variant="outline" className="font-acto-medium" onClick={prevStep}>Anterior</Button>
                )}
                {step < 3 && (
                  <Button type="button" className="bg-fmc-green text-fmc-purple font-acto-semibold" onClick={nextStep}>Siguiente</Button>
                )}
                {step === 3 && (
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-fmc-blue to-fmc-green hover:opacity-90 text-white font-acto-semibold py-3 shadow-md"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Solicitud por WhatsApp
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-center space-x-2 text-sm text-fmc-purple font-acto-regular">
                <Phone className="h-4 w-4" />
                <span>Te contactaremos al: 370 406-9592</span>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    </div>
  )
}