import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// WhatsApp helpers (unificación de número y URL)
export const WHATSAPP_NUMBER_E164 = '5493704069592'

export function getWhatsAppUrl(message?: string) {
  const base = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER_E164}`
  return message ? `${base}&text=${encodeURIComponent(message)}` : `https://wa.me/${WHATSAPP_NUMBER_E164}`
}
