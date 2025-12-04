import {
  ManychatApiResponse,
  ManychatSubscriber,
  ManychatSubscriberResponse,
  ManychatTag,
  ManychatTagResponse,
  ManychatCustomFieldsResponse,
  ManychatSendMessageRequest,
  ManychatSendMessageResponse,
  ManychatMessage,
  ManychatBroadcastRequest,
  ManychatBroadcastResponse,
  ManychatFlowsResponse,
  ManychatRequestOptions,
  ManychatLeadData,
  ManychatWebhookMessage,
  ManychatChannel,
  ManychatSubscriberIdentifier,
} from '@/types/manychat'
import { logger } from '@/lib/logger'

/**
 * Servicio para interactuar con la API de Manychat
 * Documentación: https://api.manychat.com/
 */
export class ManychatService {
  private static readonly BASE_URL = process.env.MANYCHAT_BASE_URL || 'https://api.manychat.com'
  private static readonly API_KEY = process.env.MANYCHAT_API_KEY
  
  // Rate limiting
  private static requestQueue: Array<() => Promise<any>> = []
  private static isProcessingQueue = false
  private static readonly RATE_LIMIT_DELAY = 10 // ms entre requests (100 req/s)

  /**
   * Realizar petición HTTP a la API de Manychat
   */
  private static async makeRequest<T = any>(options: ManychatRequestOptions): Promise<ManychatApiResponse<T>> {
    if (!this.API_KEY) {
      throw new Error('MANYCHAT_API_KEY no configurado en variables de entorno')
    }

    const { method = 'GET', endpoint, body, params } = options

    // Construir URL con parámetros
    const url = new URL(`${this.BASE_URL}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }

    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.API_KEY}`,
      'Content-Type': 'application/json',
    }

    logger.info('Realizando petición a ManyChat API', {
      method,
      url: url.toString(),
      endpoint,
      body: body ? JSON.stringify(body) : undefined,
    })

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      // Siempre leer como texto primero para poder detectar HTML
      const responseText = await response.text()
      const contentType = response.headers.get('content-type') || ''
      const isJSONContentType = contentType.includes('application/json')
      
      let data: any
      
      // Intentar parsear como JSON
      try {
        data = JSON.parse(responseText)
      } catch (parseError: any) {
        // Si falla el parseo, probablemente es HTML o texto plano
        logger.error('ManyChat API devolvió respuesta no-JSON', {
          endpoint,
          url: url.toString(),
          status: response.status,
          statusText: response.statusText,
          contentType,
          responseText: responseText.substring(0, 2000), // Log primeros 2000 caracteres
          responseLength: responseText.length,
          body: body ? JSON.stringify(body) : undefined,
        })
        
        // Crear un error descriptivo con el HTML/texto completo
        const htmlError: any = new Error(`ManyChat API devolvió HTML/texto en lugar de JSON. HTTP ${response.status} ${response.statusText}`)
        htmlError.error_code = `HTTP_${response.status}_HTML_RESPONSE`
        htmlError.details = {
          contentType,
          responseText: responseText.substring(0, 5000), // Incluir más texto en el error
          url: url.toString(),
          endpoint,
          body: body ? JSON.stringify(body) : undefined,
        }
        htmlError.fullResponse = responseText
        throw htmlError
      }

      if (!response.ok) {
        logger.error('Manychat API Error (HTTP !ok)', {
          status: response.status,
          statusText: response.statusText,
          data,
          endpoint,
          url: url.toString(),
          contentType,
          body: body ? JSON.stringify(body) : undefined,
        })
        
        return {
          status: 'error',
          error: data.error || data.message || `HTTP ${response.status}: ${response.statusText}`,
          error_code: data.error_code || `HTTP_${response.status}`,
          details: data.details || data,
        }
      }

      return data
    } catch (error: any) {
      // Si el error ya tiene detalles de HTML, preservarlos
      if (error.fullResponse || (error.error_code && error.error_code.includes('HTML_RESPONSE'))) {
        logger.error('Error en petición a Manychat (HTML response)', {
          error: error.message,
          error_code: error.error_code,
          details: error.details,
          url: url.toString(),
          endpoint,
          body: body ? JSON.stringify(body) : undefined,
        })
        throw error
      }
      
      logger.error('Error en petición a Manychat', {
        error: error.message,
        stack: error.stack,
        endpoint,
        url: url.toString(),
        method,
        body: body ? JSON.stringify(body) : undefined,
      })
      throw error
    }
  }

  /**
   * Ejecutar request con rate limiting
   */
  private static async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      
      this.processQueue()
    })
  }

  /**
   * Procesar cola de requests con rate limiting
   */
  private static async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()
      if (request) {
        await request()
        // Delay para respetar rate limit
        if (this.requestQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY))
        }
      }
    }

    this.isProcessingQueue = false
  }

  // ============================================================================
  // SUBSCRIBERS (Contactos)
  // ============================================================================

  /**
   * Obtener información de un subscriber por ID
   * @param subscriberId - ID del subscriber (puede ser number o string para IDs grandes de Facebook)
   */
  static async getSubscriberById(subscriberId: number | string): Promise<ManychatSubscriber | null> {
    // Convertir a string para evitar problemas con números muy grandes (IDs de Facebook)
    const subscriberIdStr = String(subscriberId)
    
    // Validar que el ID no esté vacío
    if (!subscriberIdStr || subscriberIdStr === 'NaN' || subscriberIdStr === 'null' || subscriberIdStr === 'undefined') {
      logger.warn('ID de subscriber inválido', { subscriberId, subscriberIdStr })
      return null
    }

    logger.debug('Obteniendo información de subscriber desde Manychat', {
      subscriberId: subscriberIdStr,
      originalType: typeof subscriberId
    })

    const response = await this.executeWithRateLimit(() =>
      this.makeRequest<ManychatSubscriber>({
        endpoint: `/fb/subscriber/getInfo`,
        params: { subscriber_id: subscriberIdStr },
      })
    )

    if (response.status === 'success' && response.data) {
      return response.data
    }

    // Log detallado del error para debugging
    if (response.status === 'error') {
      logger.error('Error obteniendo subscriber desde Manychat', {
        subscriberId: subscriberIdStr,
        error: response.error,
        errorCode: response.error_code,
        details: response.details
      })
    }

    return null
  }

  /**
   * Obtener subscriber por teléfono (WhatsApp)
   */
  static async getSubscriberByPhone(phone: string): Promise<ManychatSubscriber | null> {
    if (!phone || typeof phone !== 'string') {
      logger.warn('Teléfono inválido para buscar subscriber', { phone })
      return null
    }

    // Normalizar teléfono antes de buscar
    let normalizedPhone: string
    try {
      normalizedPhone = this.validateAndNormalizePhone(phone)
    } catch (error: any) {
      logger.warn('Error normalizando teléfono para buscar subscriber', {
        phone: phone.substring(0, 5) + '***',
        error: error.message
      })
      return null
    }
    
    if (!normalizedPhone) {
      logger.warn('Teléfono normalizado está vacío', { phone: phone.substring(0, 5) + '***' })
      return null
    }

    logger.debug('Buscando subscriber por teléfono en Manychat', {
      originalPhone: phone,
      normalizedPhone: normalizedPhone.substring(0, 5) + '***' // Ocultar parte del teléfono en logs
    })

    // Manychat API requiere GET con params para findBySystemField
    // El formato debe ser: ?phone=... (solo phone o email, no ambos)
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest<ManychatSubscriber>({
        method: 'GET',
        endpoint: `/fb/subscriber/findBySystemField`,
        params: { 
          phone: normalizedPhone,
        },
      })
    )

    if (response.status === 'success' && response.data) {
      return response.data
    }

    // Log detallado del error para debugging
    if (response.status === 'error') {
      logger.error('Error buscando subscriber por teléfono en Manychat', {
        phone: normalizedPhone.substring(0, 5) + '***',
        error: response.error,
        errorCode: response.error_code,
        details: response.details
      })
    }

    return null
  }

  /**
   * Obtener subscriber por email (Instagram/Facebook)
   */
  static async getSubscriberByEmail(email: string): Promise<ManychatSubscriber | null> {
    if (!email || typeof email !== 'string') {
      logger.warn('Email inválido para buscar subscriber', { email })
      return null
    }

    // Validar formato básico de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      logger.warn('Formato de email inválido', { email })
      return null
    }

    logger.debug('Buscando subscriber por email en Manychat', {
      email: email.substring(0, 3) + '***' // Ocultar parte del email en logs
    })

    const response = await this.executeWithRateLimit(() =>
      this.makeRequest<ManychatSubscriber>({
        method: 'GET',
        endpoint: `/fb/subscriber/findBySystemField`,
        params: { 
          email: email.toLowerCase().trim(),
        },
      })
    )

    if (response.status === 'success' && response.data) {
      logger.info('Subscriber encontrado por email', {
        subscriberId: response.data.id,
        email: email.substring(0, 3) + '***'
      })
      return response.data
    }

    // Log detallado del error para debugging
    if (response.status === 'error') {
      logger.error('Error buscando subscriber por email en Manychat', {
        email: email.substring(0, 3) + '***',
        error: response.error,
        errorCode: response.error_code,
        details: response.details
      })
    }

    return null
  }

  /**
   * Obtener subscriber por múltiples identificadores
   * Intenta buscar usando phone, email o subscriberId
   */
  static async getSubscriberByIdentifier(
    identifier: ManychatSubscriberIdentifier
  ): Promise<ManychatSubscriber | null> {
    // Si ya tenemos el subscriber_id, usarlo directamente
    if (identifier.subscriberId) {
      logger.debug('Buscando subscriber por ID', {
        subscriberId: identifier.subscriberId
      })
      return await this.getSubscriberById(identifier.subscriberId)
    }

    // Intentar por teléfono primero (más común para WhatsApp)
    if (identifier.phone) {
      logger.debug('Intentando buscar subscriber por teléfono', {
        phone: identifier.phone.substring(0, 5) + '***'
      })
      const subscriberByPhone = await this.getSubscriberByPhone(identifier.phone)
      if (subscriberByPhone) {
        logger.info('Subscriber encontrado por teléfono', {
          subscriberId: subscriberByPhone.id
        })
        return subscriberByPhone
      }
    }

    // Intentar por email (Instagram/Facebook)
    if (identifier.email) {
      logger.debug('Intentando buscar subscriber por email', {
        email: identifier.email.substring(0, 3) + '***'
      })
      const subscriberByEmail = await this.getSubscriberByEmail(identifier.email)
      if (subscriberByEmail) {
        logger.info('Subscriber encontrado por email', {
          subscriberId: subscriberByEmail.id
        })
        return subscriberByEmail
      }
    }

    logger.warn('No se pudo encontrar subscriber con los identificadores proporcionados', {
      hasPhone: !!identifier.phone,
      hasEmail: !!identifier.email,
      hasSubscriberId: !!identifier.subscriberId
    })

    return null
  }

  /**
   * Detectar el canal principal de un subscriber
   * Basado en la información disponible del subscriber
   */
  static detectChannel(subscriber: ManychatSubscriber): ManychatChannel {
    // Prioridad 1: WhatsApp (si tiene whatsapp_phone o phone con formato E.164)
    if (subscriber.whatsapp_phone || (subscriber.phone && this.isWhatsAppPhone(subscriber.phone))) {
      logger.debug('Canal detectado: WhatsApp', {
        subscriberId: subscriber.id,
        phone: subscriber.whatsapp_phone || subscriber.phone
      })
      return 'whatsapp'
    }

    // Prioridad 2: Instagram (si tiene instagram_id)
    if (subscriber.instagram_id) {
      logger.debug('Canal detectado: Instagram', {
        subscriberId: subscriber.id,
        instagramId: subscriber.instagram_id
      })
      return 'instagram'
    }

    // Prioridad 3: Facebook Messenger (si tiene email o está asociado a página de Facebook)
    // Por defecto, si tiene page_id, probablemente es Facebook Messenger
    if (subscriber.page_id && subscriber.email) {
      logger.debug('Canal detectado: Facebook Messenger', {
        subscriberId: subscriber.id,
        pageId: subscriber.page_id,
        email: subscriber.email.substring(0, 3) + '***'
      })
      return 'facebook'
    }

    // Si solo tiene teléfono pero no está en formato WhatsApp, asumir WhatsApp
    if (subscriber.phone) {
      logger.debug('Canal asumido: WhatsApp (por teléfono)', {
        subscriberId: subscriber.id
      })
      return 'whatsapp'
    }

    // Si solo tiene email, asumir Facebook Messenger
    if (subscriber.email) {
      logger.debug('Canal asumido: Facebook Messenger (por email)', {
        subscriberId: subscriber.id
      })
      return 'facebook'
    }

    logger.warn('No se pudo detectar el canal del subscriber', {
      subscriberId: subscriber.id,
      hasPhone: !!subscriber.phone,
      hasEmail: !!subscriber.email,
      hasWhatsAppPhone: !!subscriber.whatsapp_phone,
      hasInstagramId: !!subscriber.instagram_id
    })

    return 'unknown'
  }

  /**
   * Verificar si un teléfono está en formato WhatsApp (E.164)
   */
  private static isWhatsAppPhone(phone: string): boolean {
    // Formato E.164: +[código país][número] (máximo 15 dígitos)
    const whatsappPhoneRegex = /^\+[1-9]\d{1,14}$/
    return whatsappPhoneRegex.test(phone)
  }

  /**
   * Obtener último mensaje conocido de un subscriber
   * Nota: ManyChat no tiene endpoint directo para historial completo,
   * pero podemos obtener el último mensaje desde la información del subscriber
   * cuando está disponible en el webhook o en la respuesta de getInfo
   */
  static getLastMessageFromSubscriber(subscriber: ManychatSubscriber): ManychatWebhookMessage | null {
    try {
      // ManyChat puede incluir last_input_text en algunos casos
      // pero no siempre está disponible cuando se obtiene con getInfo
      // Solo lo usamos si está disponible
      
      if (!subscriber.last_input_text) {
        return null
      }

      // Crear un mensaje basado en la información disponible
      const message: ManychatWebhookMessage = {
        id: `last_msg_${subscriber.id}_${Date.now()}`,
        type: 'text',
        text: subscriber.last_input_text,
        timestamp: subscriber.last_interaction 
          ? Math.floor(new Date(subscriber.last_interaction).getTime() / 1000)
          : Math.floor(Date.now() / 1000),
        direction: 'inbound',
        platform_msg_id: `manychat_last_${subscriber.id}`
      }

      return message
    } catch (error: any) {
      logger.error('Error obteniendo último mensaje del subscriber', {
        error: error.message,
        subscriberId: subscriber.id
      })
      return null
    }
  }

  /**
   * Obtener subscribers activos por tag
   * Nota: Manychat no tiene endpoint directo para listar todos los subscribers,
   * pero podemos usar una estrategia basada en obtener información de subscribers conocidos
   * o usar broadcasts para obtener subscriber IDs por tag
   */
  static async getSubscribersByTag(tagName: string, limit: number = 100): Promise<ManychatSubscriber[]> {
    try {
      // ManyChat no tiene endpoint directo para obtener subscribers por tag
      // Como alternativa, podemos usar el endpoint de broadcast que permite filtrar por tags
      // pero esto requiere crear un broadcast temporal, lo cual no es ideal
      
      // Por ahora, retornamos array vacío ya que ManyChat no proporciona esta funcionalidad directamente
      // La sincronización masiva se hará usando otras estrategias (por teléfono, por ID conocido, etc.)
      logger.warn('ManyChat no tiene endpoint directo para obtener subscribers por tag', { tagName })
      return []
    } catch (error: any) {
      logger.error('Error obteniendo subscribers por tag', { error: error.message, tagName })
      return []
    }
  }

  /**
   * Obtener subscribers por custom field
   * Útil para filtrar contactos por campos personalizados
   */
  static async getSubscribersByCustomField(
    fieldName: string,
    fieldValue: string,
    limit: number = 100
  ): Promise<ManychatSubscriber[]> {
    try {
      // ManyChat permite buscar por custom field usando findBySystemField
      // pero solo para campos del sistema, no custom fields directamente
      // Esta función está preparada para futuras implementaciones
      logger.warn('ManyChat no tiene endpoint directo para obtener subscribers por custom field', { fieldName })
      return []
    } catch (error: any) {
      logger.error('Error obteniendo subscribers por custom field', { error: error.message, fieldName })
      return []
    }
  }

  /**
   * Obtener información actualizada de múltiples subscribers
   * Útil para actualizar información de leads ya sincronizados
   */
  static async getSubscribersByIds(subscriberIds: number[]): Promise<ManychatSubscriber[]> {
    const subscribers: ManychatSubscriber[] = []
    
    // Obtener información de cada subscriber con rate limiting
    for (const id of subscriberIds) {
      try {
        const subscriber = await this.getSubscriberById(id)
        if (subscriber) {
          subscribers.push(subscriber)
        }
        // Pequeño delay para respetar rate limits
        await new Promise(resolve => setTimeout(resolve, 10))
      } catch (error: any) {
        // Error silencioso, continuar con el siguiente
      }
    }
    
    return subscribers
  }

  /**
   * Buscar múltiples subscribers por teléfono de forma eficiente
   * Útil para sincronizar leads que no tienen manychatId
   */
  static async getSubscribersByPhones(phones: string[]): Promise<Map<string, ManychatSubscriber>> {
    const subscribersMap = new Map<string, ManychatSubscriber>()
    
    // Procesar en lotes para evitar sobrecarga
    const batchSize = 10
    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize)
      
      // Procesar en paralelo con rate limiting
      const promises = batch.map(async (phone) => {
        try {
          const subscriber = await this.getSubscriberByPhone(phone)
          if (subscriber) {
            subscribersMap.set(phone, subscriber)
          }
          // Delay entre requests para respetar rate limits
          await new Promise(resolve => setTimeout(resolve, 50))
        } catch (error: any) {
          // Error silencioso, continuar con el siguiente
        }
      })
      
      await Promise.all(promises)
      
      // Delay entre lotes
      if (i + batchSize < phones.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return subscribersMap
  }

  /**
   * Validar y normalizar teléfono para ManyChat
   * ManyChat requiere formato internacional con código de país
   */
  private static validateAndNormalizePhone(phone: string): string {
    if (!phone) {
      throw new Error('Teléfono requerido para crear contacto en ManyChat')
    }

    // Remover espacios, guiones y paréntesis
    const cleaned = phone.replace(/\D/g, '')
    
    // Si ya tiene código de país (+54), mantenerlo
    if (phone.startsWith('+')) {
      return phone.replace(/\D/g, '').startsWith('54') 
        ? `+${phone.replace(/\D/g, '')}`
        : phone
    }

    // Normalizar formato argentino
    if (cleaned.startsWith('54')) {
      return `+${cleaned}`
    }
    
    if (cleaned.startsWith('9')) {
      return `+54${cleaned}`
    }
    
    if (cleaned.length === 10) {
      return `+549${cleaned}`
    }
    
    // Si tiene 11 dígitos y empieza con 54, agregar +
    if (cleaned.length === 11 && cleaned.startsWith('54')) {
      return `+${cleaned}`
    }
    
    // Por defecto, asumir formato argentino
    return `+54${cleaned}`
  }

  /**
   * Crear o actualizar subscriber
   * Si el contacto ya existe, intenta obtenerlo y actualizarlo
   */
  static async createOrUpdateSubscriber(data: ManychatLeadData): Promise<ManychatSubscriber | null> {
    try {
      // Validar y normalizar teléfono
      const normalizedPhone = this.validateAndNormalizePhone(data.phone || data.whatsapp_phone || '')
      const normalizedWhatsappPhone = data.whatsapp_phone 
        ? this.validateAndNormalizePhone(data.whatsapp_phone)
        : normalizedPhone

      const body: any = {
        phone: normalizedPhone,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        whatsapp_phone: normalizedWhatsappPhone,
        has_opt_in_sms: true,
      }

      // Agregar custom fields si existen
      if (data.custom_fields) {
        body.custom_fields = data.custom_fields
      }

      const response = await this.executeWithRateLimit(() =>
        this.makeRequest<ManychatSubscriber>({
          method: 'POST',
          endpoint: `/fb/subscriber/createSubscriber`,
          body,
        })
      )

      if (response.status === 'success' && response.data) {
        // Si hay tags, agregarlos
        if (data.tags && data.tags.length > 0 && response.data.id) {
          for (const tagName of data.tags) {
            await this.addTagToSubscriber(response.data.id, tagName)
          }
        }

        logger.info('Subscriber creado exitosamente en ManyChat', {
          subscriberId: response.data.id,
          phone: normalizedPhone
        })

        return response.data
      }

      // Si el error indica que el contacto ya existe, intentar obtenerlo
      if (response.error && (
        response.error.toLowerCase().includes('already exists') ||
        response.error.toLowerCase().includes('duplicate') ||
        response.error_code === 'subscriber_exists'
      )) {
        logger.info('Contacto ya existe en ManyChat, intentando obtenerlo', {
          phone: normalizedPhone
        })

        // Intentar obtener el subscriber existente por teléfono
        const existingSubscriber = await this.getSubscriberByPhone(normalizedPhone)
        
        if (existingSubscriber) {
          logger.info('Subscriber existente encontrado en ManyChat', {
            subscriberId: existingSubscriber.id,
            phone: normalizedPhone
          })

          // Actualizar custom fields si se proporcionaron
          if (data.custom_fields && existingSubscriber.id) {
            for (const [fieldName, fieldValue] of Object.entries(data.custom_fields)) {
              try {
                await this.setCustomField(existingSubscriber.id, fieldName, fieldValue)
              } catch (error: any) {
                logger.warn('Error actualizando custom field', {
                  subscriberId: existingSubscriber.id,
                  fieldName,
                  error: error.message
                })
              }
            }
          }

          // Agregar tags si se proporcionaron
          if (data.tags && data.tags.length > 0 && existingSubscriber.id) {
            for (const tagName of data.tags) {
              try {
                await this.addTagToSubscriber(existingSubscriber.id, tagName)
              } catch (error: any) {
                logger.warn('Error agregando tag', {
                  subscriberId: existingSubscriber.id,
                  tagName,
                  error: error.message
                })
              }
            }
          }

          return existingSubscriber
        }

        // Si no se pudo encontrar, intentar con whatsapp_phone
        if (normalizedWhatsappPhone !== normalizedPhone) {
          const existingByWhatsapp = await this.getSubscriberByPhone(normalizedWhatsappPhone)
          if (existingByWhatsapp) {
            logger.info('Subscriber existente encontrado por WhatsApp', {
              subscriberId: existingByWhatsapp.id,
              whatsappPhone: normalizedWhatsappPhone
            })
            return existingByWhatsapp
          }
        }
      }

      logger.error('Error creando subscriber en Manychat', {
        error: response.error,
        error_code: response.error_code,
        phone: normalizedPhone
      })

      return null
    } catch (error: any) {
      logger.error('Excepción al crear/actualizar subscriber en ManyChat', {
        error: error.message,
        stack: error.stack,
        phone: data.phone
      })
      return null
    }
  }

  /**
   * Crear contacto de WhatsApp específicamente
   * Optimizado para crear contactos de WhatsApp con validaciones adicionales
   */
  static async createWhatsAppSubscriber(data: {
    phone: string
    first_name?: string
    last_name?: string
    email?: string
    custom_fields?: Record<string, any>
    tags?: string[]
  }): Promise<ManychatSubscriber | null> {
    try {
      // Validar que el teléfono esté presente
      if (!data.phone) {
        throw new Error('Teléfono requerido para crear contacto de WhatsApp')
      }

      // Normalizar teléfono
      const normalizedPhone = this.validateAndNormalizePhone(data.phone)

      // Preparar datos específicos para WhatsApp
      const manychatData: ManychatLeadData = {
        phone: normalizedPhone,
        whatsapp_phone: normalizedPhone, // Para WhatsApp, ambos deben ser iguales
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        custom_fields: {
          ...data.custom_fields,
          origen: data.custom_fields?.origen || 'whatsapp',
        },
        tags: data.tags || [],
      }

      logger.info('Creando contacto de WhatsApp en ManyChat', {
        phone: normalizedPhone,
        firstName: data.first_name
      })

      return await this.createOrUpdateSubscriber(manychatData)
    } catch (error: any) {
      logger.error('Error creando contacto de WhatsApp en ManyChat', {
        error: error.message,
        phone: data.phone
      })
      return null
    }
  }

  /**
   * Actualizar custom field de un subscriber
   */
  static async setCustomField(
    subscriberId: number | string,
    fieldName: string,
    value: any
  ): Promise<boolean> {
    // Convertir a string para evitar problemas con números muy grandes
    const subscriberIdStr = String(subscriberId)
    
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest({
        method: 'POST',
        endpoint: `/fb/subscriber/setCustomField`,
        body: {
          subscriber_id: subscriberIdStr,
          field_name: fieldName,
          field_value: value,
        },
      })
    )

    return response.status === 'success'
  }

  // ============================================================================
  // TAGS
  // ============================================================================

  /**
   * Obtener todos los tags disponibles
   */
  static async getTags(): Promise<ManychatTag[]> {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest<ManychatTag[]>({
        endpoint: `/fb/page/getTags`,
      })
    )

    if (response.status === 'success' && response.data) {
      return response.data
    }

    return []
  }

  /**
   * Agregar tag a un subscriber
   * Nota: Manychat requiere tag_id, no tag_name, por lo que primero buscamos el ID del tag
   */
  static async addTagToSubscriber(subscriberId: number | string, tagName: string): Promise<boolean> {
    // Convertir a string para evitar problemas con números muy grandes
    const subscriberIdStr = String(subscriberId)
    
    // Validar que el tag name no esté vacío
    if (!tagName || tagName.trim() === '') {
      logger.warn('Intento de agregar tag vacío', { subscriberId: subscriberIdStr })
      return false
    }

    const trimmedTagName = tagName.trim()

    try {
      // Obtener todos los tags de Manychat para buscar el ID
      const allTags = await this.getTags()
      
      // Buscar tag de forma case-insensitive y sin espacios
      const normalizedTagName = trimmedTagName.toLowerCase().trim()
      const tag = allTags.find(t => 
        t.name.toLowerCase().trim() === normalizedTagName ||
        t.name.trim() === trimmedTagName
      )

      if (!tag) {
        logger.warn(`Tag "${trimmedTagName}" no encontrado en Manychat`, {
          subscriberId: subscriberIdStr,
          searchedTag: trimmedTagName,
          normalizedSearch: normalizedTagName,
          availableTags: allTags.slice(0, 20).map(t => ({ name: t.name, normalized: t.name.toLowerCase().trim() })), // Log primeros 20 para referencia
          totalTags: allTags.length
        })
        return false
      }
      
      logger.info(`Tag encontrado en ManyChat`, {
        searchedTag: trimmedTagName,
        foundTag: tag.name,
        tagId: tag.id,
        subscriberId: subscriberIdStr
      })

      // Verificar si el tag ya está asignado al subscriber
      try {
        const subscriber = await this.getSubscriberById(subscriberIdStr)
        if (subscriber?.tags?.some(t => t.id === tag.id || t.name.toLowerCase().trim() === normalizedTagName)) {
          logger.info(`Tag "${trimmedTagName}" ya está asignado al subscriber ${subscriberIdStr}`, {
            subscriberId: subscriberIdStr,
            tagName: trimmedTagName,
            tagId: tag.id
          })
          return true // Ya está asignado, consideramos éxito
        }
      } catch (checkError: any) {
        // Si no podemos verificar, continuar de todas formas
        logger.warn('No se pudo verificar tags existentes, continuando', {
          error: checkError.message,
          subscriberId: subscriberIdStr
        })
      }

      // Usar el endpoint addTag con tag_id (ManyChat requiere tag_id, no tag_name)
      const requestBody = {
        subscriber_id: subscriberIdStr,
        tag_id: tag.id, // ManyChat requiere tag_id según el error de validación
      }
      
      logger.info('Intentando agregar tag a subscriber en ManyChat', {
        subscriberId: subscriberIdStr,
        tagId: tag.id,
        tagName: trimmedTagName,
        tagNameExact: tag.name,
        endpoint: '/fb/subscriber/addTag',
        body: requestBody
      })
      
      const response = await this.executeWithRateLimit(() =>
        this.makeRequest({
          method: 'POST',
          endpoint: `/fb/subscriber/addTag`,
          body: requestBody,
        })
      )

      if (response.status === 'error') {
        const errorMessage = response.error || 'Error desconocido'
        const errorCode = response.error_code || 'UNKNOWN'
        
        logger.error('Error agregando tag a subscriber', {
          subscriberId: subscriberIdStr,
          tagName: trimmedTagName,
          tagId: tag.id,
          error: errorMessage,
          error_code: errorCode,
          details: response.details,
          fullResponse: JSON.stringify(response)
        })
        
        // Lanzar error con más detalles para que pueda ser capturado
        const detailedError = new Error(`ManyChat API error ${errorCode}: ${errorMessage}`)
        ;(detailedError as any).error_code = errorCode
        ;(detailedError as any).details = response.details
        ;(detailedError as any).fullResponse = response
        throw detailedError
      }

      // Verificar que la respuesta sea exitosa
      if (response.status !== 'success') {
        const unexpectedError = new Error(`Respuesta inesperada de ManyChat: ${response.status}`)
        logger.warn('Respuesta inesperada de ManyChat al agregar tag', {
          subscriberId: subscriberIdStr,
          tagName: trimmedTagName,
          tagId: tag.id,
          responseStatus: response.status,
          fullResponse: JSON.stringify(response)
        })
        throw unexpectedError
      }

      logger.info(`Tag "${trimmedTagName}" agregado exitosamente a subscriber ${subscriberIdStr}`, {
        subscriberId: subscriberIdStr,
        tagName: trimmedTagName,
        tagId: tag.id
      })

      return true
    } catch (error: any) {
      // Convertir fullResponse a string si existe y no es string
      const fullResponseStr = error.fullResponse 
        ? (typeof error.fullResponse === 'string' 
            ? error.fullResponse.substring(0, 500) 
            : JSON.stringify(error.fullResponse).substring(0, 500))
        : undefined
      
      logger.error('Error obteniendo tags de Manychat para agregar tag', {
        subscriberId: subscriberIdStr,
        tagName: trimmedTagName,
        error: error.message,
        error_code: error.error_code,
        details: error.details,
        fullResponse: fullResponseStr
      })
      
      // Si el error tiene fullResponse (HTML), propagarlo para diagnóstico detallado
      if (error.fullResponse || (error.error_code && error.error_code.includes('HTML_RESPONSE'))) {
        throw error
      }
      
      return false
    }
  }

  /**
   * Remover tag de un subscriber
   * Nota: ManyChat API usa tag_name en el endpoint /fb/subscriber/removeTag
   */
  static async removeTagFromSubscriber(subscriberId: number | string, tagName: string): Promise<boolean> {
    // Convertir a string para evitar problemas con números muy grandes
    const subscriberIdStr = String(subscriberId)
    
    // Validar que el tag name no esté vacío
    if (!tagName || tagName.trim() === '') {
      logger.warn('Intento de remover tag vacío', { subscriberId: subscriberIdStr })
      return false
    }

    const trimmedTagName = tagName.trim()

    try {
      // Obtener el tag para obtener su ID (ManyChat requiere tag_id)
      const allTags = await this.getTags()
      const normalizedTagName = trimmedTagName.toLowerCase().trim()
      const tag = allTags.find(t => 
        t.name.toLowerCase().trim() === normalizedTagName ||
        t.name.trim() === trimmedTagName
      )

      if (!tag) {
        logger.warn(`Tag "${trimmedTagName}" no encontrado en Manychat para remover`, {
          subscriberId: subscriberIdStr
        })
        return false
      }

      // Usar el endpoint removeTag con tag_id (ManyChat requiere tag_id)
      const response = await this.executeWithRateLimit(() =>
        this.makeRequest({
          method: 'POST',
          endpoint: `/fb/subscriber/removeTag`,
          body: {
            subscriber_id: subscriberIdStr,
            tag_id: tag.id,
          },
        })
      )

      if (response.status === 'error') {
        logger.error('Error removiendo tag de subscriber', {
          subscriberId: subscriberIdStr,
          tagName: trimmedTagName,
          error: response.error,
          details: response.details
        })
        return false
      }

      return response.status === 'success'
    } catch (error: any) {
      logger.error('Error obteniendo tags de Manychat para remover tag', {
        subscriberId: subscriberIdStr,
        tagName: trimmedTagName,
        error: error.message
      })
      return false
    }
  }

  /**
   * Agregar tag por ID
   * Nota: ManyChat API acepta tag_id en el endpoint /fb/subscriber/addTag
   */
  static async addTagByIdToSubscriber(subscriberId: number | string, tagId: number): Promise<boolean> {
    // Convertir a string para evitar problemas con números muy grandes
    const subscriberIdStr = String(subscriberId)
    
    // Intentar primero con tag_id, si falla obtendremos el tag y usaremos tag_name
    let response = await this.executeWithRateLimit(() =>
      this.makeRequest({
        method: 'POST',
        endpoint: `/fb/subscriber/addTag`,
        body: {
          subscriber_id: subscriberIdStr,
          tag_id: tagId,
        },
      })
    )
    
    // Si falla con tag_id, intentar obtener el tag y usar tag_name
    if (response.status === 'error') {
      try {
        const allTags = await this.getTags()
        const tag = allTags.find(t => t.id === tagId)
        if (tag) {
          response = await this.executeWithRateLimit(() =>
            this.makeRequest({
              method: 'POST',
              endpoint: `/fb/subscriber/addTag`,
              body: {
                subscriber_id: subscriberIdStr,
                tag_name: tag.name,
              },
            })
          )
        }
      } catch (fallbackError: any) {
        // Si falla el fallback, continuar con el error original
        logger.warn('Error en fallback de addTagByIdToSubscriber', {
          subscriberId: subscriberIdStr,
          tagId,
          error: fallbackError.message
        })
      }
    }

    if (response.status === 'error') {
      logger.error('Error agregando tag por ID a subscriber', {
        subscriberId: subscriberIdStr,
        tagId,
        error: response.error,
        details: response.details
      })
      return false
    }

    return response.status === 'success'
  }

  /**
   * Remover tag por ID
   * Nota: ManyChat API requiere tag_name, por lo que primero obtenemos el tag por ID
   */
  static async removeTagByIdFromSubscriber(subscriberId: number, tagId: number): Promise<boolean> {
    try {
      // Obtener el tag por ID para usar su nombre
      const allTags = await this.getTags()
      const tag = allTags.find(t => t.id === tagId)
      
      if (!tag) {
        logger.warn(`Tag con ID ${tagId} no encontrado en Manychat para remover`, {
          subscriberId
        })
        return false
      }
      
      // Usar el endpoint removeTag con tag_name
      const response = await this.executeWithRateLimit(() =>
        this.makeRequest({
          method: 'POST',
          endpoint: `/fb/subscriber/removeTag`,
          body: {
            subscriber_id: subscriberId,
            tag_name: tag.name,
          },
        })
      )

      return response.status === 'success'
    } catch (error: any) {
      logger.error('Error removiendo tag por ID de subscriber', {
        subscriberId,
        tagId,
        error: error.message
      })
      return false
    }
  }

  // ============================================================================
  // MENSAJES
  // ============================================================================

  /**
   * Enviar mensaje a un subscriber
   */
  static async sendMessage(
    subscriberId: number,
    messages: ManychatMessage[],
    tag?: string
  ): Promise<ManychatSendMessageResponse> {
    // Validar que subscriberId sea válido
    if (!subscriberId || subscriberId === 0 || isNaN(subscriberId)) {
      logger.error('Subscriber ID inválido para enviar mensaje', {
        subscriberId,
        messagesCount: messages.length
      })
      return {
        status: 'error',
        error: 'Subscriber ID inválido',
        error_code: 'INVALID_SUBSCRIBER_ID'
      }
    }

    // Validar que haya mensajes
    if (!messages || messages.length === 0) {
      logger.error('No hay mensajes para enviar', {
        subscriberId
      })
      return {
        status: 'error',
        error: 'No hay mensajes para enviar',
        error_code: 'NO_MESSAGES'
      }
    }

    // Log del request que se enviará a ManyChat
    logger.debug('Enviando mensaje a ManyChat API', {
      subscriberId,
      messagesCount: messages.length,
      messageTypes: messages.map(m => m.type),
      hasTag: !!tag
    })

    const response = await this.executeWithRateLimit(() =>
      this.makeRequest<ManychatSendMessageResponse>({
        method: 'POST',
        endpoint: `/fb/sending/sendContent`,
        body: {
          subscriber_id: subscriberId,
          data: {
            version: 'v2',
            messages,
            tag,
          },
        },
      })
    )

    // Log detallado de la respuesta
    if (response.status === 'error') {
      logger.error('Error en respuesta de ManyChat sendContent', {
        subscriberId,
        error: response.error,
        errorCode: response.error_code,
        details: response.details,
        messagesSent: messages.length
      })
    }

    return response as ManychatSendMessageResponse
  }

  /**
   * Enviar mensaje de texto simple
   */
  static async sendTextMessage(subscriberId: number, text: string, tag?: string): Promise<boolean> {
    const messages: ManychatMessage[] = [
      {
        type: 'text',
        text,
      },
    ]

    const response = await this.sendMessage(subscriberId, messages, tag)
    return response.status === 'success'
  }

  /**
   * Enviar mensaje con imagen
   */
  static async sendImageMessage(
    subscriberId: number,
    imageUrl: string,
    caption?: string,
    tag?: string
  ): Promise<boolean> {
    const messages: ManychatMessage[] = [
      {
        type: 'image',
        url: imageUrl,
        caption,
      },
    ]

    const response = await this.sendMessage(subscriberId, messages, tag)
    return response.status === 'success'
  }

  /**
   * Enviar mensaje con archivo
   */
  static async sendFileMessage(
    subscriberId: number,
    fileUrl: string,
    filename?: string,
    tag?: string
  ): Promise<boolean> {
    const messages: ManychatMessage[] = [
      {
        type: 'file',
        url: fileUrl,
        filename,
      },
    ]

    const response = await this.sendMessage(subscriberId, messages, tag)
    return response.status === 'success'
  }

  // ============================================================================
  // BROADCASTS
  // ============================================================================

  /**
   * Enviar broadcast a múltiples subscribers
   */
  static async sendBroadcast(
    name: string,
    messages: ManychatMessage[],
    options: {
      subscriberIds?: number[]
      tagIds?: number[]
      sendTime?: string
    } = {}
  ): Promise<ManychatBroadcastResponse> {
    const body: ManychatBroadcastRequest = {
      name,
      message: messages,
      subscribers: options.subscriberIds,
      tags: options.tagIds,
      send_time: options.sendTime,
    }

    const response = await this.executeWithRateLimit(() =>
      this.makeRequest<ManychatBroadcastResponse>({
        method: 'POST',
        endpoint: `/fb/broadcasting/sendBroadcast`,
        body,
      })
    )

    return response as ManychatBroadcastResponse
  }

  // ============================================================================
  // CUSTOM FIELDS
  // ============================================================================

  /**
   * Obtener todos los custom fields
   */
  static async getCustomFields() {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest({
        endpoint: `/fb/page/getCustomFields`,
      })
    )

    if (response.status === 'success' && response.data) {
      return response.data
    }

    return []
  }

  // ============================================================================
  // FLOWS
  // ============================================================================

  /**
   * Obtener flows disponibles
   */
  static async getFlows() {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest({
        endpoint: `/fb/page/getFlows`,
      })
    )

    if (response.status === 'success' && response.data) {
      return response.data
    }

    return []
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  /**
   * Verificar si la API está configurada
   */
  static isConfigured(): boolean {
    return !!this.API_KEY
  }

  /**
   * Verificar salud de la API
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest({
        endpoint: `/fb/page/getInfo`,
      })
      return response.status === 'success'
    } catch (error) {
      console.error('Manychat health check failed:', error)
      return false
    }
  }
}

