import { z } from 'zod'
import { ArgentinianValidators } from './validation-middleware'

// Constantes para validaciones específicas de Formosa
export const FORMOSA_ZONES = [
  'Formosa Capital', 'Clorinda', 'Pirané', 'El Colorado',
  'Las Lomitas', 'Ingeniero Juárez', 'Ibarreta', 'Comandante Fontana',
  'Villa Dos Trece', 'General Güemes', 'Laguna Blanca', 'Pozo del Mortero',
  'Estanislao del Campo', 'Villa del Rosario', 'Namqom', 'La Nueva Formosa',
  'Solidaridad', 'San Antonio', 'Obrero', 'GUEMES'
] as const

export const FORMOSA_AREA_CODES = ['3704', '3705', '3711', '3718'] as const

export const LEAD_ESTADOS = [
  'NUEVO', 'EN_REVISION', 'PREAPROBADO', 'RECHAZADO',
  'DOC_PENDIENTE', 'DERIVADO', 'CONTACTADO', 'CALIFICADO',
  'PROPUESTA', 'NEGOCIACION', 'CERRADO_GANADO', 'CERRADO_PERDIDO'
] as const

export const LEAD_ORIGENES = [
  'whatsapp', 'instagram', 'facebook', 'comentario',
  'web', 'ads', 'telefono', 'referido', 'otro'
] as const

// Validaciones personalizadas mejoradas
const validateArgentinianDNI = (dni: string): boolean => {
  if (!dni) return true // Opcional
  return ArgentinianValidators.validateDNI(dni)
}

const validateFormosaPhone = (phone: string): boolean => {
  if (!phone) return true // Opcional

  const cleanPhone = phone.replace(/\D/g, '')

  // Formato internacional: +54 + código de área + número
  if (cleanPhone.startsWith('54')) {
    const areaCode = cleanPhone.substring(2, 6)
    return FORMOSA_AREA_CODES.includes(areaCode as any) && cleanPhone.length >= 12 && cleanPhone.length <= 15
  }

  // Formato nacional: 0 + código de área + número
  if (cleanPhone.startsWith('0')) {
    const areaCode = cleanPhone.substring(1, 5)
    return FORMOSA_AREA_CODES.includes(areaCode as any) && cleanPhone.length >= 11 && cleanPhone.length <= 14
  }

  // Formato local: código de área + número
  if (cleanPhone.length >= 10 && cleanPhone.length <= 13) {
    const areaCode = cleanPhone.substring(0, 4)
    return FORMOSA_AREA_CODES.includes(areaCode as any)
  }

  return false
}

const validateArgentinianEmail = (email: string): boolean => {
  if (!email) return true // Opcional

  // Validación básica de email más dominios argentinos comunes
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return false

  // Dominios argentinos comunes (opcional, para mejor UX)
  const argentinianDomains = [
    'gmail.com', 'hotmail.com', 'yahoo.com.ar', 'outlook.com',
    'live.com.ar', 'fibertel.com.ar', 'speedy.com.ar', 'arnet.com.ar'
  ]

  return true // Aceptamos todos los emails válidos
}

export const LeadCreateSchema = z.object({
  nombre: z.string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(100, 'Nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.'-]+$/, 'Nombre solo puede contener letras, espacios, puntos, apostrofes y guiones')
    .transform(val => val.trim())
    .refine(val => val.split(' ').length >= 2, 'Debe incluir nombre y apellido'),

  telefono: z.string()
    .min(10, 'Teléfono debe tener al menos 10 dígitos')
    .max(20, 'Teléfono no puede exceder 20 caracteres')
    .refine(validateFormosaPhone, {
      message: 'Teléfono debe ser válido para Formosa. Formatos aceptados: +54 3704XXXXXXX, 0 3704XXXXXXX, 3704XXXXXXX'
    })
    .transform(val => val.replace(/\D/g, '')), // Limpiar formato

  email: z.string()
    .email('Email inválido')
    .max(255, 'Email no puede exceder 255 caracteres')
    .refine(validateArgentinianEmail, 'Email debe tener un formato válido')
    .transform(val => val.toLowerCase().trim())
    .optional()
    .or(z.literal('').transform(() => undefined)),

  dni: z.string()
    .max(10, 'DNI no puede exceder 10 caracteres')
    .refine(validateArgentinianDNI, 'DNI debe ser válido (7-8 dígitos con dígito verificador correcto)')
    .transform(val => val ? val.replace(/\D/g, '') : undefined)
    .optional()
    .or(z.literal('').transform(() => undefined)),

  ingresos: z.number()
    .positive('Ingresos deben ser positivos')
    .min(50000, 'Ingresos mínimos: $50,000 ARS')
    .max(1000000000, 'Ingresos máximos: $1,000,000,000 ARS')
    .optional()
    .nullable(),

  zona: z.enum(FORMOSA_ZONES, {
    errorMap: () => ({ message: 'Zona debe ser una zona válida de Formosa' })
  }).optional().or(z.literal('').transform(() => undefined)),

  producto: z.string()
    .max(200, 'Producto no puede exceder 200 caracteres')
    .optional()
    .or(z.literal('').transform(() => undefined)),

  monto: z.number()
    .positive('Monto debe ser positivo')
    .max(1000000000, 'Monto máximo: $1,000,000,000 ARS')
    .optional()
    .nullable(),

  origen: z.enum(LEAD_ORIGENES, {
    errorMap: () => ({ message: 'Origen debe ser válido' })
  }).optional().or(z.literal('').transform(() => undefined)),

  utmSource: z.string()
    .max(100, 'UTM Source no puede exceder 100 caracteres')
    .optional()
    .or(z.literal('').transform(() => undefined)),

  estado: z.enum(LEAD_ESTADOS, {
    errorMap: () => ({ message: 'Estado debe ser válido' })
  }).default('NUEVO'),

  agencia: z.string()
    .max(100, 'Agencia no puede exceder 100 caracteres')
    .optional()
    .or(z.literal('').transform(() => undefined)),

  notas: z.string()
    .max(1000, 'Notas no pueden exceder 1000 caracteres')
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export const LeadUpdateSchema = z.object({
  nombre: z.string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(100, 'Nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.'-]+$/, 'Nombre solo puede contener letras, espacios, puntos, apostrofes y guiones')
    .transform(val => val.trim())
    .refine(val => val.split(' ').length >= 2, 'Debe incluir nombre y apellido')
    .optional(),

  telefono: z.string()
    .min(10, 'Teléfono debe tener al menos 10 dígitos')
    .max(20, 'Teléfono no puede exceder 20 caracteres')
    .refine(validateFormosaPhone, {
      message: 'Teléfono debe ser válido para Formosa. Formatos aceptados: +54 3704XXXXXXX, 0 3704XXXXXXX, 3704XXXXXXX'
    })
    .transform(val => val.replace(/\D/g, ''))
    .optional(),

  email: z.string()
    .email('Email inválido')
    .max(255, 'Email no puede exceder 255 caracteres')
    .refine(validateArgentinianEmail, 'Email debe tener un formato válido')
    .transform(val => val.toLowerCase().trim())
    .optional()
    .or(z.literal('')),

  dni: z.string()
    .max(10, 'DNI no puede exceder 10 caracteres')
    .refine(validateArgentinianDNI, 'DNI debe ser válido (7-8 dígitos con dígito verificador correcto)')
    .transform(val => val ? val.replace(/\D/g, '') : undefined)
    .optional(),

  ingresos: z.number()
    .positive('Ingresos deben ser positivos')
    .min(50000, 'Ingresos mínimos: $50,000 ARS')
    .max(1000000000, 'Ingresos máximos: $1,000,000,000 ARS')
    .optional(),

  zona: z.enum(FORMOSA_ZONES, {
    errorMap: () => ({ message: 'Zona debe ser una zona válida de Formosa' })
  }).optional(),

  producto: z.string()
    .max(200, 'Producto no puede exceder 200 caracteres')
    .optional(),

  monto: z.number()
    .positive('Monto debe ser positivo')
    .max(1000000000, 'Monto máximo: $1,000,000,000 ARS')
    .optional(),

  origen: z.enum(LEAD_ORIGENES, {
    errorMap: () => ({ message: 'Origen debe ser válido' })
  }).optional(),

  utmSource: z.string()
    .max(100, 'UTM Source no puede exceder 100 caracteres')
    .optional(),

  estado: z.enum(LEAD_ESTADOS, {
    errorMap: () => ({ message: 'Estado debe ser válido' })
  }).optional(),

  agencia: z.string()
    .max(100, 'Agencia no puede exceder 100 caracteres')
    .optional(),

  notas: z.string()
    .max(1000, 'Notas no pueden exceder 1000 caracteres')
    .optional(),
})

// Schemas para validaciones de parámetros de rutas
export const LeadParamsSchema = z.object({
  id: z.string().uuid('ID de lead debe ser un UUID válido'),
})

export const UserParamsSchema = z.object({
  id: z.string().uuid('ID de usuario debe ser un UUID válido'),
})

// Schemas para WhatsApp y eventos
export const WhatsAppEventSchema = z.object({
  telefono: z.string()
    .min(10, 'Teléfono debe tener al menos 10 dígitos')
    .refine(validateFormosaPhone, 'Teléfono debe ser válido para Formosa'),
  type: z.enum(['text', 'template', 'image', 'document', 'audio', 'video', 'status', 'delivery', 'read']),
  messageId: z.string().optional(),
  timestamp: z.number().positive('Timestamp debe ser positivo').optional(),
  payload: z.any().optional(),
  status: z.enum(['sent', 'delivered', 'read', 'failed']).optional(),
})

export const ScoringRequestSchema = z.object({
  leadId: z.string().uuid('ID de lead debe ser un UUID válido'),
  factors: z.object({
    ingresos: z.number().optional(),
    zona: z.string().optional(),
    origen: z.string().optional(),
    interacciones: z.number().optional(),
  }).optional(),
})

// Schema para autenticación
export const AuthSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email no puede exceder 255 caracteres')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .max(128, 'Contraseña no puede exceder 128 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Contraseña debe contener al menos una minúscula, una mayúscula y un número'),
})

// Schema para registro de usuarios
export const UserCreateSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email no puede exceder 255 caracteres')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .max(128, 'Contraseña no puede exceder 128 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Contraseña debe contener al menos una minúscula, una mayúscula y un número'),
  nombre: z.string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(100, 'Nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.'-]+$/, 'Nombre solo puede contener letras, espacios, puntos, apostrofes y guiones')
    .transform(val => val.trim()),
  rol: z.enum(['admin', 'agente', 'supervisor']).default('agente'),
})

export const LeadQuerySchema = z.object({
  estado: z.enum(LEAD_ESTADOS).optional(),
  origen: z.enum(LEAD_ORIGENES).optional(),
  zona: z.enum(FORMOSA_ZONES).optional(),
  q: z.string()
    .max(100, 'Búsqueda no puede exceder 100 caracteres')
    .optional(),
  from: z.string()
    .datetime('Fecha desde debe ser válida')
    .optional(),
  to: z.string()
    .datetime('Fecha hasta debe ser válida')
    .optional(),
  ingresoMin: z.string()
    .transform(val => val ? parseInt(val) : undefined)
    .refine(val => !val || val >= 0, 'Ingreso mínimo debe ser positivo')
    .optional(),
  ingresoMax: z.string()
    .transform(val => val ? parseInt(val) : undefined)
    .refine(val => !val || val >= 0, 'Ingreso máximo debe ser positivo')
    .optional(),
  fechaDesde: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe tener formato YYYY-MM-DD')
    .optional(),
  fechaHasta: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe tener formato YYYY-MM-DD')
    .optional(),
  page: z.string()
    .transform(val => Math.max(parseInt(val) || 1, 1))
    .optional(),
  limit: z.string()
    .transform(val => Math.min(Math.max(parseInt(val) || 10, 1), 100))
    .optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'nombre', 'ingresos', 'estado']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Tipos exportados
export type LeadCreate = z.infer<typeof LeadCreateSchema>
export type LeadUpdate = z.infer<typeof LeadUpdateSchema>
export type LeadParams = z.infer<typeof LeadParamsSchema>
export type UserParams = z.infer<typeof UserParamsSchema>
export type WhatsAppEvent = z.infer<typeof WhatsAppEventSchema>
export type ScoringRequest = z.infer<typeof ScoringRequestSchema>
export type LeadQuery = z.infer<typeof LeadQuerySchema>
export type Auth = z.infer<typeof AuthSchema>
export type UserCreate = z.infer<typeof UserCreateSchema>
