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

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// WhatsApp configuration
export const WHATSAPP_NUMBER_E164 = '+5493704285453'

export function getWhatsAppUrl(message?: string): string {
  const defaultMessage = 'Hola, me interesa obtener más información sobre los créditos para motos.'
  const encodedMessage = encodeURIComponent(message || defaultMessage)
  return `https://wa.me/5493704285453?text=${encodedMessage}`
}