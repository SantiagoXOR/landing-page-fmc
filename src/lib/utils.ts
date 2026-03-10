import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePhone(phone: string): string {
  // Normalizar teléfono a formato +54...
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('54')) {
    return `+${cleaned}`
  }
  
  if (cleaned.startsWith('9')) {
    return `+54${cleaned}`
  }
  
  if (cleaned.length === 10) {
    return `+549${cleaned}`
  }
  
  return `+54${cleaned}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount)
}

/**
 * Valida si una fecha es válida
 */
function isValidDate(date: Date | string | null | undefined): boolean {
  if (!date) return false
  const dateObj = date instanceof Date ? date : new Date(date)
  return !isNaN(dateObj.getTime())
}

/**
 * Convierte cualquier formato de fecha a Date válido
 */
function toValidDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) return null
    return dateObj
  } catch {
    return null
  }
}

export function formatDate(date: Date | string | null | undefined): string {
  // Si no hay fecha, retornar mensaje por defecto
  if (!date) {
    return 'Fecha no disponible'
  }
  
  // Convertir a Date si es string
  const dateObj = toValidDate(date)
  
  // Validar que la fecha sea válida
  if (!dateObj) {
    return 'Fecha inválida'
  }
  
  try {
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj)
  } catch (error) {
    console.error('Error formateando fecha:', error, date)
    return 'Fecha inválida'
  }
}

/**
 * Formatea una fecha de forma segura usando toLocaleDateString
 */
export function safeLocaleDateString(
  date: Date | string | null | undefined,
  locale: string = 'es-AR',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = toValidDate(date)
  if (!dateObj) return 'Fecha inválida'
  
  try {
    return dateObj.toLocaleDateString(locale, options)
  } catch (error) {
    console.error('Error en toLocaleDateString:', error, date)
    return 'Fecha inválida'
  }
}

/**
 * Formatea una fecha de forma segura usando toLocaleTimeString
 */
export function safeLocaleTimeString(
  date: Date | string | null | undefined,
  locale: string = 'es-AR',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = toValidDate(date)
  if (!dateObj) return 'Fecha inválida'
  
  try {
    return dateObj.toLocaleTimeString(locale, options)
  } catch (error) {
    console.error('Error en toLocaleTimeString:', error, date)
    return 'Fecha inválida'
  }
}

// WhatsApp: una sola fuente de verdad en landing-utils
export { WHATSAPP_NUMBER_E164, getWhatsAppUrl } from '@/lib/landing-utils'