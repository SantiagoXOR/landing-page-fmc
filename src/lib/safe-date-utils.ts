/**
 * Utilidades seguras para manejo de fechas
 * Previene errores "RangeError: Invalid time value"
 */

/**
 * Wrapper seguro para toLocaleDateString
 */
export function safeToLocaleDateString(
  date: Date | string | null | undefined,
  locale: string = 'es-AR',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return 'Fecha no disponible'
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    
    if (isNaN(dateObj.getTime())) {
      console.warn('safeToLocaleDateString: fecha inválida', date)
      return 'Fecha inválida'
    }
    
    return dateObj.toLocaleDateString(locale, options)
  } catch (error) {
    console.error('Error en safeToLocaleDateString:', error, date)
    return 'Fecha inválida'
  }
}

/**
 * Wrapper seguro para toLocaleTimeString
 */
export function safeToLocaleTimeString(
  date: Date | string | null | undefined,
  locale: string = 'es-AR',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return 'Hora no disponible'
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    
    if (isNaN(dateObj.getTime())) {
      console.warn('safeToLocaleTimeString: fecha inválida', date)
      return 'Hora inválida'
    }
    
    return dateObj.toLocaleTimeString(locale, options)
  } catch (error) {
    console.error('Error en safeToLocaleTimeString:', error, date)
    return 'Hora inválida'
  }
}

/**
 * Wrapper seguro para toLocaleString
 */
export function safeToLocaleString(
  date: Date | string | null | undefined,
  locale: string = 'es-AR',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return 'Fecha/hora no disponible'
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    
    if (isNaN(dateObj.getTime())) {
      console.warn('safeToLocaleString: fecha inválida', date)
      return 'Fecha/hora inválida'
    }
    
    return dateObj.toLocaleString(locale, options)
  } catch (error) {
    console.error('Error en safeToLocaleString:', error, date)
    return 'Fecha/hora inválida'
  }
}

/**
 * Valida y normaliza una fecha a ISO string
 */
export function toSafeISOString(date: Date | string | null | undefined): string | null {
  if (!date) return null
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    
    if (isNaN(dateObj.getTime())) {
      console.warn('toSafeISOString: fecha inválida', date)
      return null
    }
    
    return dateObj.toISOString()
  } catch (error) {
    console.error('Error en toSafeISOString:', error, date)
    return null
  }
}






















