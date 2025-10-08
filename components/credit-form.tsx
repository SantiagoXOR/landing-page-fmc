'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Separator } from '@/components/ui/separator'
import { Loader2, Send, Phone, Car, Bike, ChevronRight, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  telefono: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  email: z.string().email('Email inválido'),
  dni: z.string().min(7, 'DNI/CUIT debe tener al menos 7 dígitos').max(11, 'DNI/CUIT debe tener máximo 11 dígitos'),
  ingresos: z.string().min(1, 'Los ingresos son requeridos'),
  tipoVehiculo: z.enum(['moto', 'auto'], { required_error: 'Selecciona el tipo de vehículo' }),
  marca: z.string().min(1, 'Selecciona una marca'),
  modelo: z.string().min(1, 'El modelo es requerido'),
  cuotas: z.string().min(1, 'Selecciona la cantidad de cuotas'),
  comentarios: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

// Marcas más vendidas en Argentina
const marcasMotos = [
  'Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Corven', 'Gilera', 
  'Zanella', 'Mondial', 'Keller', 'Bajaj', 'Motomel'
]

const marcasAutos = [
  'Toyota', 'Chevrolet', 'Ford', 'Volkswagen', 'Fiat', 'Renault',
  'Peugeot', 'Nissan', 'Hyundai', 'Citroën', 'Jeep', 'Kia'
]

const cuotasOptions = ['12', '18', '24', '36', '48', '60']

export function CreditForm() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      telefono: "",
      email: "",
      dni: "",
      ingresos: "",
      tipoVehiculo: "",
      marca: "",
      modelo: "",
      cuotas: "",
      comentarios: "",
    },
    mode: "onChange", // Validación en tiempo real
  })

  // Campos requeridos por paso
  const requiredKeys: Record<number, (keyof FormData)[]> = {
    1: ['nombre', 'apellido', 'dni', 'telefono', 'email', 'ingresos'],
    2: ['tipoVehiculo', 'marca', 'modelo', 'cuotas'],
    3: [], // Comentarios es opcional
  }

  // Campos por paso para validación
  const stepFields: Record<number, (keyof FormData)[]> = {
    1: ['nombre', 'apellido', 'dni', 'telefono', 'email', 'ingresos'],
    2: ['tipoVehiculo', 'marca', 'modelo', 'cuotas'],
    3: ['comentarios'],
  }

  // Obtener marcas disponibles según el tipo de vehículo
  const tipoVehiculo = form.watch('tipoVehiculo')
  const marcasDisponibles = tipoVehiculo === 'moto' ? marcasMotos : marcasAutos

  // Verificar si se puede proceder al siguiente paso
  const canProceed = () => {
    const requiredCurrentFields = requiredKeys[step] || []
    
    return requiredCurrentFields.every(field => {
      const value = form.getValues(field)
      return value !== undefined && value !== '' && value !== null
    })
  }

  const handleNext = async () => {
    const currentStepFields = stepFields[step] || []
    const isValid = await form.trigger(currentStepFields)
    
    if (isValid) {
      setStep(step + 1)
    } else {
      // Mostrar errores de validación
      toast.error('Por favor completa todos los campos requeridos correctamente')
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    
    try {
      const tipoVehiculoTexto = data.tipoVehiculo === 'moto' ? 'Moto' : 'Auto'
      
      const message = `🚗 *Nueva Solicitud de Crédito para ${tipoVehiculoTexto}*

👤 *Datos Personales:*
• Nombre: ${data.nombre} ${data.apellido}
• DNI/CUIT: ${data.dni}
• Teléfono: ${data.telefono}
• Email: ${data.email}
• Ingresos: $${data.ingresos}

🏍️ *${tipoVehiculoTexto} de Interés:*
• Marca: ${data.marca}
• Modelo: ${data.modelo}
• Cuotas: ${data.cuotas} meses

${data.comentarios ? `💬 *Comentarios:*\n${data.comentarios}` : ''}

¡Gracias por tu interés! Te contactaremos pronto.`

      const whatsappUrl = `https://wa.me/5493704056592?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')
      
      toast.success('¡Solicitud enviada correctamente!')
      
      // Reset form
      form.reset()
      setStep(1)
      
    } catch (error) {
      toast.error('Error al enviar la solicitud')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Estilos comunes para inputs
  const inputClasses = "font-acto-regular border-fmc-purple/30 focus-visible:outline-none focus:border-fmc-green focus:ring-2 focus:ring-fmc-green/40 placeholder:text-gray-400"

  // Calcular progreso
  const progress = (step / 3) * 100

  return (
    <section id="solicitar-credito" className="py-20 relative overflow-hidden">
      {/* Imagen de fondo */}
      <div className="absolute inset-0 fmc-bg-2 md:fmc-bg-4"></div>
      <div className="absolute inset-0 fmc-bg-gradient"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-acto-bold text-white mb-4">
            SOLICITAR CRÉDITO
          </h2>
          <p className="text-white/90 font-acto-regular max-w-2xl mx-auto">
            Completá el formulario y recibí tu propuesta de financiación personalizada en minutos
          </p>
        </div>
        
        <div className="w-full max-w-2xl mx-auto p-4">
          <Card className="shadow-xl border-fmc-purple/20">
            <CardHeader className="bg-gradient-to-r from-fmc-blue to-fmc-green text-white rounded-t-lg">
              <CardTitle className="text-2xl font-acto-bold text-center">
                Solicitar Crédito para Vehículo
              </CardTitle>
              <CardDescription className="text-center text-white/90 font-acto-regular">
                Completa el formulario y te contactaremos por WhatsApp para procesar tu solicitud
              </CardDescription>
            </CardHeader>
        
        <CardContent className="p-6">
          {/* Indicador de progreso mejorado */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-acto-semibold transition-all duration-300",
                    step >= stepNumber 
                      ? "bg-fmc-green text-white" 
                      : "bg-fmc-purple/20 text-fmc-purple/60"
                  )}>
                    {step > stepNumber ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  {stepNumber < 3 && (
                    <div className={cn(
                      "w-16 h-1 mx-2 rounded transition-all duration-300",
                      step > stepNumber ? "bg-fmc-green" : "bg-fmc-purple/20"
                    )} />
                  )}
                </div>
              ))}
            </div>
            
            <Progress value={progress} className="h-3 bg-fmc-purple/10" />
            
            <div className="flex justify-between text-xs text-fmc-purple/70 mt-2 font-acto-regular">
              <span>Datos Personales</span>
              <span>Vehículo</span>
              <span>Finalizar</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Paso 1: Datos Personales */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-acto-bold text-fmc-purple mb-2">Datos Personales</h3>
                    <p className="text-sm text-fmc-purple/70 font-acto-regular">
                      Ingresa tu información personal para procesar tu solicitud
                    </p>
                  </div>
                  
                  <Separator className="bg-fmc-purple/20" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-acto-semibold text-fmc-purple">Nombre *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Tu nombre" 
                              className={cn(inputClasses)} 
                              aria-invalid={!!form.formState.errors.nombre}
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-fmc-purple/70">
                            Como figura en tu DNI
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="apellido"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-acto-semibold text-fmc-purple">Apellido *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Tu apellido" 
                              className={cn(inputClasses)} 
                              aria-invalid={!!form.formState.errors.apellido}
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-fmc-purple/70">
                            Como figura en tu DNI
                          </FormDescription>
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
                          <FormLabel className="font-acto-semibold text-fmc-purple">DNI/CUIT *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="12345678" 
                              className={cn(inputClasses)} 
                              aria-invalid={!!form.formState.errors.dni}
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-fmc-purple/70">
                            Sin puntos ni espacios
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="telefono"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-acto-semibold text-fmc-purple">Teléfono *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="3704069592" 
                              className={cn(inputClasses)} 
                              aria-invalid={!!form.formState.errors.telefono}
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-fmc-purple/70">
                            WhatsApp o celular con código de área
                          </FormDescription>
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
                          <FormLabel className="font-acto-semibold text-fmc-purple">Email *</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="tu@email.com" 
                              className={cn(inputClasses)} 
                              aria-invalid={!!form.formState.errors.email}
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-fmc-purple/70">
                            Para enviarte tu propuesta
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ingresos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-acto-semibold text-fmc-purple">Ingresos Mensuales *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="500000" 
                              className={cn(inputClasses)} 
                              aria-invalid={!!form.formState.errors.ingresos}
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-fmc-purple/70">
                            Monto mensual aproximado
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Paso 2: Selección de Vehículo */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-acto-bold text-fmc-purple mb-2">Vehículo de Interés</h3>
                    <p className="text-sm text-fmc-purple/70 font-acto-regular">
                      Selecciona el tipo de vehículo y sus características
                    </p>
                  </div>
                  
                  <Separator className="bg-fmc-purple/20" />
                  
                  {/* Selector de tipo de vehículo */}
                  <FormField
                    control={form.control}
                    name="tipoVehiculo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-acto-semibold text-fmc-purple">Tipo de Vehículo *</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange('moto')
                                form.setValue('marca', '')
                                form.setValue('modelo', '')
                              }}
                              className={cn(
                                "p-6 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-3",
                                field.value === 'moto'
                                  ? "border-fmc-green bg-fmc-green/10 text-fmc-green"
                                  : "border-fmc-purple/30 hover:border-fmc-purple/50 text-fmc-purple/70"
                              )}
                            >
                              <Bike className="w-8 h-8" />
                              <span className="font-acto-semibold">Moto</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange('auto')
                                form.setValue('marca', '')
                                form.setValue('modelo', '')
                              }}
                              className={cn(
                                "p-6 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-3",
                                field.value === 'auto'
                                  ? "border-fmc-green bg-fmc-green/10 text-fmc-green"
                                  : "border-fmc-purple/30 hover:border-fmc-purple/50 text-fmc-purple/70"
                              )}
                            >
                              <Car className="w-8 h-8" />
                              <span className="font-acto-semibold">Auto</span>
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dropdowns dinámicos que aparecen solo después de seleccionar tipo */}
                  {tipoVehiculo && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="marca"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-acto-semibold text-fmc-purple">Marca *</FormLabel>
                              <Select onValueChange={(value) => {
                                field.onChange(value)
                                form.setValue("modelo", "")
                              }} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className={cn(inputClasses)}>
                                    <SelectValue placeholder="Selecciona una marca" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-60">
                                  {marcasDisponibles.map((marca) => (
                                    <SelectItem key={marca} value={marca} className="font-acto-regular">
                                      {marca}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs text-fmc-purple/70">
                                Marcas más vendidas en Argentina
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="modelo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-acto-semibold text-fmc-purple">Modelo *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={tipoVehiculo === 'moto' ? "Ej: CB 190R" : "Ej: Corolla"} 
                                  className={cn(inputClasses)} 
                                  aria-invalid={!!form.formState.errors.modelo}
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription className="text-xs text-fmc-purple/70">
                                Indica el modelo deseado
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="cuotas"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-acto-semibold text-fmc-purple">Cuotas Deseadas *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className={cn(inputClasses)}>
                                  <SelectValue placeholder="Selecciona cuotas" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {cuotasOptions.map((cuota) => (
                                  <SelectItem key={cuota} value={cuota} className="font-acto-regular">
                                    {cuota} cuotas
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs text-fmc-purple/70">
                              Elige el plazo que prefieras
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Paso 3: Comentarios */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-acto-bold text-fmc-purple mb-2">Información Adicional</h3>
                    <p className="text-sm text-fmc-purple/70 font-acto-regular">
                      Cuéntanos algo más sobre tu solicitud (opcional)
                    </p>
                  </div>
                  
                  <Separator className="bg-fmc-purple/20" />
                  
                  <FormField
                    control={form.control}
                    name="comentarios"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-acto-semibold text-fmc-purple">Comentarios</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Cuéntanos sobre tu experiencia previa con créditos, preferencias específicas, o cualquier información que consideres relevante..."
                            className={cn(
                              inputClasses,
                              "min-h-[120px] resize-none"
                            )}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-fmc-purple/70">
                          Esta información nos ayuda a personalizar tu propuesta
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Resumen de la solicitud */}
                  <div className="bg-fmc-purple/5 rounded-lg p-4 border border-fmc-purple/20">
                    <h4 className="font-acto-semibold text-fmc-purple mb-3">Resumen de tu solicitud:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-fmc-purple/70">Nombre:</span>
                        <span className="font-acto-medium text-fmc-purple">
                          {form.watch("nombre")} {form.watch("apellido")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fmc-purple/70">Vehículo:</span>
                        <span className="font-acto-medium text-fmc-purple">
                          {form.watch("tipoVehiculo") === "moto" ? "Moto" : "Auto"} - {form.watch("marca")} {form.watch("modelo")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fmc-purple/70">Cuotas:</span>
                        <span className="font-acto-medium text-fmc-purple">
                          {form.watch("cuotas")} cuotas
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fmc-purple/70">Contacto:</span>
                        <span className="font-acto-medium text-fmc-purple">
                          {form.watch("telefono")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de navegación */}
              <div className="flex justify-between pt-6 border-t border-fmc-purple/20">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="border-fmc-purple/30 text-fmc-purple hover:bg-fmc-purple/5 font-acto-medium"
                  >
                    Anterior
                  </Button>
                )}
                
                <div className="ml-auto">
                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="bg-fmc-green hover:bg-fmc-green/90 text-white font-acto-semibold px-6"
                    >
                      Siguiente
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting || !canProceed()}
                      className="bg-fmc-green hover:bg-fmc-green/90 text-white font-acto-semibold px-6"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 w-4 h-4" />
                          Enviar Solicitud
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
          
          {/* Información de contacto */}
          <div className="text-center pt-4 border-t border-fmc-purple/20">
            <div className="flex items-center justify-center gap-2 text-sm text-fmc-purple/70">
              <Phone className="w-4 h-4" />
              <span className="font-acto-regular">
                Te contactaremos al <strong className="font-acto-semibold">370 405-6592</strong>
              </span>
            </div>
          </div>
        </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}