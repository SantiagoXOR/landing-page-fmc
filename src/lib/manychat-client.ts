/**
 * Cliente API de ManyChat
 * 
 * Este módulo proporciona funciones para interactuar con la API de ManyChat,
 * incluyendo obtener información de subscribers y gestionar tags.
 */

import { logger } from './logger'

// Configuración de ManyChat API
const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY
const MANYCHAT_BASE_URL = process.env.MANYCHAT_BASE_URL || 'https://api.manychat.com'

// Tipos para ManyChat
export interface ManychatSubscriber {
  id: string
  key: string
  page_id: string
  status: string
  first_name?: string
  last_name?: string
  name?: string
  gender?: string
  profile_pic?: string
  locale?: string
  language?: string
  timezone?: string
  phone?: string
  email?: string
  subscribed?: boolean
  last_interaction?: string
  last_seen?: string
  opted_in?: boolean
  tags?: string[]
  custom_fields?: Record<string, any>
}

export interface ManychatApiError {
  status: string
  message: string
  details?: any
}

/**
 * Realizar petición a ManyChat API con manejo de errores y retry
 */
async function manychatRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any,
  retries = 3
): Promise<T> {
  if (!MANYCHAT_API_KEY) {
    throw new Error('MANYCHAT_API_KEY no está configurada')
  }

  const url = `${MANYCHAT_BASE_URL}${endpoint}`
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
      'Content-Type': 'application/json',
    },
  }

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      logger.info(`ManyChat API: ${method} ${endpoint} (attempt ${attempt + 1}/${retries})`)
      
      const response = await fetch(url, options)
      
      // Si la respuesta es exitosa
      if (response.ok) {
        const data = await response.json()
        logger.info(`ManyChat API: Success ${method} ${endpoint}`)
        return data as T
      }

      // Manejar errores específicos
      const errorText = await response.text()
      let errorData: ManychatApiError
      
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = {
          status: 'error',
          message: errorText || `HTTP ${response.status}`
        }
      }

      // 404: Subscriber no encontrado (no reintentarretry)
      if (response.status === 404) {
        logger.warn(`ManyChat API: Subscriber not found`)
        throw new Error(`Subscriber not found: ${errorData.message}`)
      }

      // 429: Rate limit (esperar y reintentar)
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10)
        logger.warn(`ManyChat API: Rate limit, waiting ${retryAfter}s`)
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
        continue
      }

      // 401/403: Autenticación (no reintentar)
      if (response.status === 401 || response.status === 403) {
        logger.error(`ManyChat API: Authentication error`)
        throw new Error(`Authentication error: ${errorData.message}`)
      }

      // Otros errores: crear error para reintentar
      lastError = new Error(`ManyChat API error ${response.status}: ${errorData.message}`)
      logger.warn(`ManyChat API: Error ${response.status}, will retry`)

      // Esperar antes de reintentar (backoff exponencial)
      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }

    } catch (error: any) {
      lastError = error
      logger.error(`ManyChat API: Request failed`, { error: error.message })

      // Si es un error de red, reintentar
      if (attempt < retries - 1 && error.message.includes('fetch')) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // Otros errores, lanzar inmediatamente
      if (!error.message.includes('fetch')) {
        throw error
      }
    }
  }

  // Si llegamos aquí, se agotaron los reintentos
  throw lastError || new Error('ManyChat API: All retries failed')
}

/**
 * Obtener información completa de un subscriber
 */
export async function getManychatSubscriber(
  subscriberId: string
): Promise<ManychatSubscriber> {
  try {
    const data = await manychatRequest<{ data: ManychatSubscriber }>(
      `/fb/subscriber/getInfo?subscriber_id=${subscriberId}`,
      'GET'
    )
    
    return data.data
  } catch (error: any) {
    logger.error(`Failed to get ManyChat subscriber ${subscriberId}`, { error: error.message })
    throw error
  }
}

/**
 * Agregar un tag a un subscriber
 */
export async function addManychatTag(
  subscriberId: string,
  tagName: string
): Promise<boolean> {
  try {
    await manychatRequest(
      `/fb/subscriber/addTag`,
      'POST',
      {
        subscriber_id: subscriberId,
        tag_name: tagName
      }
    )
    
    logger.info(`Added tag '${tagName}' to subscriber ${subscriberId}`)
    return true
  } catch (error: any) {
    logger.error(`Failed to add tag to subscriber ${subscriberId}`, { 
      tag: tagName,
      error: error.message 
    })
    throw error
  }
}

/**
 * Remover un tag de un subscriber
 */
export async function removeManychatTag(
  subscriberId: string,
  tagName: string
): Promise<boolean> {
  try {
    await manychatRequest(
      `/fb/subscriber/removeTag`,
      'POST',
      {
        subscriber_id: subscriberId,
        tag_name: tagName
      }
    )
    
    logger.info(`Removed tag '${tagName}' from subscriber ${subscriberId}`)
    return true
  } catch (error: any) {
    logger.error(`Failed to remove tag from subscriber ${subscriberId}`, {
      tag: tagName,
      error: error.message
    })
    throw error
  }
}

/**
 * Actualizar múltiples tags de un subscriber
 * Esta función maneja la lógica de agregar/remover tags de forma atómica
 */
export async function updateManychatTags(
  subscriberId: string,
  tagsToAdd: string[],
  tagsToRemove: string[]
): Promise<boolean> {
  try {
    logger.info(`Updating tags for subscriber ${subscriberId}`, {
      add: tagsToAdd,
      remove: tagsToRemove
    })

    // Remover tags primero (para evitar conflictos)
    for (const tag of tagsToRemove) {
      try {
        await removeManychatTag(subscriberId, tag)
      } catch (error: any) {
        // Si el tag no existe, ignorar el error
        if (!error.message.includes('not found') && !error.message.includes('does not exist')) {
          throw error
        }
        logger.warn(`Tag '${tag}' not found, skipping removal`)
      }
    }

    // Agregar nuevos tags
    for (const tag of tagsToAdd) {
      await addManychatTag(subscriberId, tag)
    }

    logger.info(`Successfully updated tags for subscriber ${subscriberId}`)
    return true

  } catch (error: any) {
    logger.error(`Failed to update tags for subscriber ${subscriberId}`, { 
      error: error.message 
    })
    throw error
  }
}

/**
 * Actualizar un custom field
 */
export async function updateManychatCustomField(
  subscriberId: string,
  fieldName: string,
  fieldValue: any
): Promise<boolean> {
  try {
    await manychatRequest(
      `/fb/subscriber/setCustomField`,
      'POST',
      {
        subscriber_id: subscriberId,
        field_name: fieldName,
        field_value: fieldValue
      }
    )
    
    logger.info(`Updated custom field '${fieldName}' for subscriber ${subscriberId}`)
    return true
  } catch (error: any) {
    logger.error(`Failed to update custom field for subscriber ${subscriberId}`, {
      field: fieldName,
      error: error.message
    })
    throw error
  }
}

/**
 * Enviar un mensaje directo a un subscriber
 */
export async function sendManychatMessage(
  subscriberId: string,
  message: string
): Promise<boolean> {
  try {
    await manychatRequest(
      `/fb/sending/sendContent`,
      'POST',
      {
        subscriber_id: subscriberId,
        data: {
          version: 'v2',
          content: {
            messages: [
              {
                type: 'text',
                text: message
              }
            ]
          }
        }
      }
    )
    
    logger.info(`Sent message to subscriber ${subscriberId}`)
    return true
  } catch (error: any) {
    logger.error(`Failed to send message to subscriber ${subscriberId}`, {
      error: error.message
    })
    throw error
  }
}

/**
 * Verificar si un subscriber existe
 */
export async function subscriberExists(subscriberId: string): Promise<boolean> {
  try {
    await getManychatSubscriber(subscriberId)
    return true
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return false
    }
    throw error
  }
}

/**
 * Obtener todos los tags de un subscriber
 */
export async function getSubscriberTags(subscriberId: string): Promise<string[]> {
  try {
    const subscriber = await getManychatSubscriber(subscriberId)
    return subscriber.tags || []
  } catch (error: any) {
    logger.error(`Failed to get tags for subscriber ${subscriberId}`, {
      error: error.message
    })
    return []
  }
}

