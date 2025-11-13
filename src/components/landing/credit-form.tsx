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
import { cn, getWhatsAppUrl } from '@/lib/landing-utils'

// Zonas de Formosa (principales localidades)
const zonasFormosa = [
  'Formosa Capital',
  'Clorinda',
  'Pirané',
  'El Colorado',
  'Las Lomitas',
  'Ibarreta',
  'Comandante Fontana',
  'Ingeniero Juárez',
  'Laguna Blanca',
  'Herradura',
  'Otra'
] as const

const formSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  telefono: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  email: z.string().email('Email inválido'),
  dni: z.string().min(7, 'DNI/CUIT debe tener al menos 7 dígitos').max(11, 'DNI/CUIT debe tener máximo 11 dígitos'),
  ingresos: z.string().min(1, 'Los ingresos son requeridos'),
  zona: z.enum(zonasFormosa, { required_error: 'Selecciona tu zona' }),
  zonaOtra: z.string().optional(),
  tipoVehiculo: z.enum(['moto', 'auto'], { required_error: 'Selecciona el tipo de vehículo' }),
  marca: z.string().min(1, 'Selecciona una marca'),
  marcaOtra: z.string().optional(),
  modelo: z.string().min(1, 'El modelo es requerido'),
  cuotas: z.string().min(1, 'Selecciona la cantidad de cuotas'),
  comentarios: z.string().optional(),
}).refine((data) => data.zona !== 'Otra' || (data.zonaOtra && data.zonaOtra.trim().length > 0), {
  message: 'Ingresa tu zona específica',
  path: ['zonaOtra'],
}).refine((data) => data.marca !== 'Otra' || (data.marcaOtra && data.marcaOtra.trim().length > 0), {
  message: 'Ingresa la marca específica',
  path: ['marcaOtra'],
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
      zona: undefined,
      zonaOtra: "",
      tipoVehiculo: undefined,
      marca: "",
      marcaOtra: "",
      modelo: "",
      cuotas: "",
      comentarios: "",
    },
    mode: "onChange", // Validación en tiempo real
  })

  // Campos requeridos por paso
  const requiredKeys: Record<number, (keyof FormData)[]> = {
    1: ['nombre', 'apellido', 'dni', 'telefono', 'email', 'ingresos', 'zona'],
    2: ['tipoVehiculo', 'marca', 'modelo', 'cuotas'],
    3: [], // Comentarios es opcional
  }

  // Campos por paso para validación
  const stepFields: Record<number, (keyof FormData)[]> = {
    1: ['nombre', 'apellido', 'dni', 'telefono', 'email', 'ingresos', 'zona'],
    2: ['tipoVehiculo', 'marca', 'modelo', 'cuotas'],
    3: ['comentarios'],
  }

  // Obtener marcas disponibles según el tipo de vehículo
  const tipoVehiculo = form.watch('tipoVehiculo')
  const zonaSeleccionada = form.watch('zona')
  const marcaSeleccionada = form.watch('marca')
  const marcasDisponibles = tipoVehiculo === 'moto' ? marcasMotos : marcasAutos

  // Verificar si se puede proceder al siguiente paso
  const canProceed = () => {
    const requiredCurrentFields = requiredKeys[step] || []
    const baseValid = requiredCurrentFields.every(field => {
      const value = form.getValues(field)
      if (field === 'tipoVehiculo') {
        return value === 'moto' || value === 'auto'
      }
      return value !== undefined && value !== '' && value !== null
    })

    if (step === 1) {
      const zona = form.getValues('zona')
      if (zona === 'Otra') {
        const zonaOtra = form.getValues('zonaOtra')
        return baseValid && !!zonaOtra && zonaOtra.trim() !== ''
      }
    }
    if (step === 2) {
      const marca = form.getValues('marca')
      if (marca === 'Otra') {
        const marcaOtra = form.getValues('marcaOtra')
        return baseValid && !!marcaOtra && marcaOtra.trim() !== ''
      }
    }
    return baseValid
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
      
      // Formatear ingresos con separadores para mejorar legibilidad
      const formatCurrency = (value: string) => {
        const num = Number(String(value).replace(/[^\d]/g, ''))
        if (isNaN(num)) return value
        return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(num)
      }

      // Emoji dinámico según tipo de vehículo
      const vehiculoEmoji = data.tipoVehiculo === 'moto' ? '🏍️' : '🚗'

      // Sanitizar caracteres que pueden romperse en algunos clientes (VS16, ZWJ)
      const sanitizeForWhatsApp = (text: string) => text.replace(/[\uFE0F\u200D]/g, '')

      // Mensaje con emojis y copy más humano
      const zonaTexto = data.zona === 'Otra' && data.zonaOtra?.trim() ? data.zonaOtra : data.zona
      const marcaTexto = data.marca === 'Otra' && data.marcaOtra?.trim() ? data.marcaOtra : data.marca

      const message = [
        `✨ *Solicitud de Crédito – ${tipoVehiculoTexto}* ${vehiculoEmoji}`,
        '',
        `*👤 Datos Personales:*`,
        `• Nombre: ${data.nombre} ${data.apellido}`,
        `• DNI/CUIT: ${data.dni}`,
        `• Teléfono: 📞 ${data.telefono}`,
        `• Email: ✉️ ${data.email}`,
        `• Ingresos: 💸 $${formatCurrency(data.ingresos)}`,
        `• Zona: 📍 ${zonaTexto}`,
        '',
        `*${vehiculoEmoji} ${tipoVehiculoTexto} de Interés:*`,
        `• Marca: ${marcaTexto}`,
        `• Modelo: ${data.modelo}`,
        `• Cuotas: ⏱️ ${data.cuotas} meses`,
        '',
        ...(data.comentarios
          ? [`*📝 Comentarios:*`, `${data.comentarios}`, '']
          : []),
        `✅ Gracias por tu interés. 📲 Nuestro equipo te contactará en las próximas horas.`,
      ].join('\n')

      const safeMessage = sanitizeForWhatsApp(message)

      // Número de WhatsApp corregido: +54 9 3704 06-9592 -> 5493704069592
      // Usar API clásica mejora compatibilidad de emojis en Web y móviles
      const whatsappUrl = getWhatsAppUrl(safeMessage)
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

  // Estilos comunes para inputs (añadimos transición suave)
  const inputClasses = "font-acto-regular border-fmc-purple/30 focus-visible:outline-none focus:border-fmc-green focus:ring-2 focus:ring-fmc-green/40 placeholder:text-gray-400 motion-safe:transition-all motion-safe:duration-200"

  // Calcular progreso
  const progress = (step / 3) * 100

  return (
    <section id="solicitar-credito" className="py-8 relative overflow-hidden" data-aos="fade-up" style={{ scrollMarginTop: 'var(--header-offset, 72px)' }}>
      {/* Imagen de fondo */}
      <div className="absolute inset-0 fmc-bg-2 md:fmc-bg-4"></div>
      <div className="absolute inset-0 fmc-bg-gradient"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12" data-aos="fade-down">
          <h2 className="text-3xl md:text-4xl font-acto-bold text-white mb-4">
            SOLICITAR CRÉDITO
          </h2>
          <p className="text-white/90 font-acto-regular max-w-2xl mx-auto">
            Completá el formulario y recibí tu propuesta de financiación personalizada en minutos
          </p>
        </div>
        
        <div className="w-full max-w-2xl mx-auto px-4 pt-0" data-aos="fade-up" data-aos-delay="100">
          <Card className="shadow-xl border-fmc-purple/20 py-0 will-change-transform motion-safe:transition-transform motion-safe:duration-300 hover:-translate-y-[1px] active:scale-[0.99] hover:shadow-lg">
            <CardHeader className="hidden" />
        
        <CardContent className="p-4 pt-0">
          {/* Indicador de progreso mejorado */}
          <div className="mb-5" data-aos="fade-up" data-aos-delay="150">
              <div className="flex items-center justify-between mb-3">
                {[1, 2, 3].map((stepNumber) => (
                  <div key={stepNumber} className="flex items-center">
                    <div className={cn(
                      "w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-acto-bold shadow-sm transition-all duration-300",
                      step >= stepNumber 
                        ? "bg-fmc-purple text-white ring-2 ring-fmc-purple/40" 
                        : "bg-white border border-fmc-purple/40 text-fmc-purple/80"
                    )}>
                      {step > stepNumber ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        stepNumber
                      )}
                    </div>
                    {stepNumber < 3 && (
                      <div className={cn(
                        "w-14 md:w-16 h-1 mx-2 rounded transition-all duration-300",
                        step > stepNumber ? "bg-fmc-purple" : "bg-fmc-purple/20"
                      )} />
                    )}
                  </div>
                ))}
              </div>
            
            <Progress value={progress} className="h-2 bg-fmc-purple/10" />
            
            <div className="flex justify-between text-[11px] md:text-xs text-fmc-purple/90 mt-2 font-acto-semibold tracking-wide uppercase">
              <span>DATOS PERSONALES</span>
              <span>VEHÍCULO</span>
              <span>FINALIZAR</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Paso 1: Datos Personales */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center" data-aos="fade-up">
                    <h3 className="text-xl font-acto-bold text-fmc-purple mb-2">DATOS PERSONALES</h3>
                    <p className="text-sm text-fmc-purple/70 font-acto-regular">
                      Ingresa tu información personal para procesar tu solicitud
                    </p>
                  </div>
                  
                  <Separator className="bg-fmc-purple/20" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-aos="fade-up" data-aos-delay="50">
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-aos="fade-up" data-aos-delay="100">
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-aos="fade-up" data-aos-delay="150">
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

                  {/* Zona de Formosa */}
                  <div className="grid grid-cols-1 gap-4" data-aos="fade-up" data-aos-delay="200">
                    <FormField
                      control={form.control}
                      name="zona"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-acto-semibold text-fmc-purple">Zona *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className={cn(inputClasses)}>
                              <SelectValue placeholder="Seleccioná tu zona" />
                            </SelectTrigger>
                            <SelectContent>
                              {zonasFormosa.map((z) => (
                                <SelectItem key={z} value={z}>{z}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs text-fmc-purple/70">
                            Localidad o zona principal dentro de la provincia de Formosa
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {zonaSeleccionada === 'Otra' && (
                      <FormField
                        control={form.control}
                        name="zonaOtra"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-acto-semibold text-fmc-purple">Especificá tu zona *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ej: Barrio San Miguel, Misión Laishí, etc."
                                className={cn(inputClasses)}
                                aria-invalid={!!form.formState.errors.zonaOtra}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-fmc-purple/70">
                              Completa este campo si seleccionaste "Otra"
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Paso 2: Selección de Vehículo */}
              {step === 2 && (
                <div className="space-y-6" data-aos="fade-up">
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
                              "p-6 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-3 will-change-transform motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-[2px] active:scale-[0.99] hover:shadow-md",
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
                              "p-6 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-3 will-change-transform motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-[2px] active:scale-[0.99] hover:shadow-md",
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
                                  <SelectItem value="Otra" className="font-acto-regular">Otra</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs text-fmc-purple/70">
                                Marcas más vendidas en Argentina
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {marcaSeleccionada === 'Otra' && (
                          <FormField
                            control={form.control}
                            name="marcaOtra"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-acto-semibold text-fmc-purple">Especificá la marca *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ej: Otra marca"
                                    className={cn(inputClasses)}
                                    aria-invalid={!!form.formState.errors.marcaOtra}
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs text-fmc-purple/70">
                                  Completa este campo si seleccionaste "Otra"
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
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
          

        </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}