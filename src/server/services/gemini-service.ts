/**
 * Gemini Service
 * Servicio para interactuar con Google Gemini API
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  message: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

export class GeminiService {
  private static instance: GeminiService | null = null
  private genAI: GoogleGenerativeAI | null = null
  private isInitialized = false

  private constructor() {}

  /**
   * Obtener instancia singleton del servicio
   */
  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService()
    }
    return GeminiService.instance
  }

  /**
   * Inicializar el cliente de Gemini
   */
  async initialize(): Promise<boolean> {
    try {
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY

      if (!apiKey) {
        logger.warn('GOOGLE_GEMINI_API_KEY no está configurada')
        return false
      }

      this.genAI = new GoogleGenerativeAI(apiKey)
      this.isInitialized = true

      logger.info('Gemini Service initialized successfully')
      return true
    } catch (error: any) {
      logger.error('Error initializing Gemini Service', {
        error: error.message,
        stack: error.stack
      })
      this.isInitialized = false
      return false
    }
  }

  /**
   * Verificar si el servicio está inicializado
   */
  isReady(): boolean {
    return this.isInitialized && this.genAI !== null
  }

  /**
   * Enviar mensaje al asistente usando Gemini
   */
  async chat(
    assistantId: string,
    messages: ChatMessage[]
  ): Promise<ChatResponse> {
    try {
      if (!this.isReady()) {
        const initialized = await this.initialize()
        if (!initialized) {
          throw new Error('Gemini Service no está inicializado. Verifica que GOOGLE_GEMINI_API_KEY esté configurada.')
        }
      }

      // Obtener el asistente de la base de datos usando Supabase
      const assistants = await supabase.request(`/Assistant?id=eq.${assistantId}&select=*&limit=1`)
      
      if (!assistants || !Array.isArray(assistants) || assistants.length === 0) {
        throw new Error(`Asistente no encontrado: ${assistantId}`)
      }
      
      const assistant = assistants[0]

      if (!assistant.isActive) {
        throw new Error(`El asistente "${assistant.nombre}" está inactivo`)
      }

      // Obtener el modelo
      // Usar generateContent directamente en lugar de startChat para mejor compatibilidad
      // Usar gemini-2.0-flash que está disponible en v1beta según la documentación
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Construir el historial de conversación
      // Las instrucciones del asistente se usan como system prompt
      const systemInstruction = assistant.instrucciones || 'Eres un asistente virtual útil y amigable.'

      // Preparar el historial de mensajes
      // Gemini requiere pares user-model alternados y que comience con 'user'
      const filteredMessages = messages.filter(msg => msg.role !== 'system')
      const lastMessage = filteredMessages[filteredMessages.length - 1]
      
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('El último mensaje debe ser del usuario')
      }

      // Construir historial (todos excepto el último mensaje)
      let historyMessages = filteredMessages.slice(0, -1)
      
      logger.info('Building chat history', {
        assistantId,
        totalMessages: messages.length,
        historyMessagesCount: historyMessages.length,
        historyMessagesRoles: historyMessages.map(m => m.role)
      })
      
      // Si el historial comienza con un mensaje del asistente, eliminarlo
      // porque Gemini requiere que el historial comience con 'user'
      // Eliminar todos los mensajes del asistente al inicio hasta encontrar el primer usuario
      while (historyMessages.length > 0 && historyMessages[0].role !== 'user') {
        historyMessages = historyMessages.slice(1)
      }
      
      // Construir historial en formato Gemini con pares alternados user-model
      const history: Array<{ role: 'user' | 'model', parts: Array<{ text: string }> }> = []
      
      if (historyMessages.length > 0 && historyMessages[0].role === 'user') {
        for (let i = 0; i < historyMessages.length; i++) {
          const msg = historyMessages[i]
          const role = msg.role === 'user' ? 'user' : 'model'
          
          // Verificar que siga el patrón alternado
          const expectedRole = i % 2 === 0 ? 'user' : 'model'
          if (role === expectedRole) {
            history.push({
              role: role,
              parts: [{ text: msg.content }]
            })
          } else {
            // Si rompe el patrón, detener aquí
            logger.warn('History pattern broken', {
              index: i,
              expectedRole,
              actualRole: role,
              messageRole: msg.role
            })
            break
          }
        }
      }

      logger.info('Final chat history', {
        assistantId,
        historyLength: history.length,
        historyRoles: history.map(h => h.role),
        willIncludeHistory: history.length > 0 && history[0].role === 'user'
      })

      // Validación final: asegurar que el historial nunca comience con 'model'
      // Si por alguna razón el historial comienza con 'model', no incluirlo
      if (history.length > 0 && history[0].role !== 'user') {
        logger.warn('History starts with model role, discarding history', {
          assistantId,
          firstRole: history[0].role
        })
        history.length = 0 // Limpiar el historial
      }

      // Usar generateContent directamente en lugar de startChat para mejor compatibilidad
      // Construir el contenido completo con historial e instrucciones
      const contents: Array<{ role: 'user' | 'model', parts: Array<{ text: string }> }> = []
      
      // Agregar historial si existe
      if (history.length > 0 && history[0].role === 'user') {
        contents.push(...history)
        logger.info('Including chat history', {
          assistantId,
          historyLength: history.length
        })
      }
      
      // Preparar el mensaje del usuario con instrucciones del sistema si es el primer mensaje
      let userMessage = lastMessage.content
      if (history.length === 0) {
        // Incluir instrucciones del sistema en el primer mensaje cuando no hay historial
        userMessage = `Instrucciones del sistema:\n${systemInstruction}\n\n---\n\nUsuario: ${lastMessage.content}`
        logger.info('Including system instructions in first user message', { assistantId })
      }
      
      // Agregar el mensaje del usuario
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      })

      // Generar respuesta usando generateContent directamente
      // Manejar errores de modelo no disponible y probar con otros modelos
      let result
      let response
      let text
      
      try {
        result = await model.generateContent({
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
        response = await result.response
        text = response.text()
      } catch (error: any) {
        // Si el error es que el modelo no está disponible, intentar con otros modelos
        if (error.message && error.message.includes('404 Not Found') && error.message.includes('models/')) {
          logger.warn('Model not available, trying alternative models', { 
            error: error.message,
            assistantId 
          })
          
          // Probar con modelos alternativos (gemini-2.0-flash debería funcionar, pero por si acaso)
          const alternativeModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
          let success = false
          
          for (const altModelName of alternativeModels) {
            try {
              const altModel = this.genAI!.getGenerativeModel({ model: altModelName })
              logger.info(`Trying alternative model: ${altModelName}`, { assistantId })
              
              result = await altModel.generateContent({
                contents: contents,
                generationConfig: {
                  temperature: 0.7,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 1024,
                }
              })
              response = await result.response
              text = response.text()
              success = true
              logger.info(`Successfully used alternative model: ${altModelName}`, { assistantId })
              break
            } catch (altError: any) {
              logger.warn(`Alternative model ${altModelName} also failed`, { 
                error: altError.message,
                assistantId 
              })
              continue
            }
          }
          
          if (!success) {
            throw new Error(`No available Gemini models found. Last error: ${error.message}`)
          }
        } else {
          // Si es otro tipo de error, propagarlo
          throw error
        }
      }

      logger.info('Gemini chat response received', {
        assistantId,
        messageLength: lastMessage.content.length,
        responseLength: text.length
      })

      return {
        message: text,
        usage: {
          totalTokens: response.usageMetadata?.totalTokenCount
        }
      }
    } catch (error: any) {
      logger.error('Error in Gemini chat', {
        error: error.message,
        stack: error.stack,
        assistantId
      })
      throw error
    }
  }

  /**
   * Generar respuesta simple sin historial (para pruebas)
   */
  async generateSimpleResponse(
    prompt: string,
    systemInstruction?: string
  ): Promise<string> {
    try {
      if (!this.isReady()) {
        const initialized = await this.initialize()
        if (!initialized) {
          throw new Error('Gemini Service no está inicializado')
        }
      }

      const model = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-pro' })

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction
      })

      const response = await result.response
      return response.text()
    } catch (error: any) {
      logger.error('Error generating simple response', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }
}

// Exportar instancia singleton
export const geminiService = GeminiService.getInstance()

