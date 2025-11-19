/**
 * Gemini Service
 * Servicio para interactuar con Google Gemini API
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

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

      // Obtener el asistente de la base de datos
      const assistant = await prisma.assistant.findUnique({
        where: { id: assistantId }
      })

      if (!assistant) {
        throw new Error(`Asistente no encontrado: ${assistantId}`)
      }

      if (!assistant.isActive) {
        throw new Error(`El asistente "${assistant.nombre}" está inactivo`)
      }

      // Obtener el modelo (usando gemini-pro por defecto)
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-pro' })

      // Construir el historial de conversación
      // Las instrucciones del asistente se usan como system prompt
      const systemInstruction = assistant.instrucciones || 'Eres un asistente virtual útil y amigable.'

      // Preparar el historial de mensajes
      // Gemini usa un formato diferente, necesitamos convertir los mensajes
      const history = messages
        .filter(msg => msg.role !== 'system') // Filtrar mensajes de sistema
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))

      // Crear el chat con historial
      const chat = model.startChat({
        history: history.slice(0, -1), // Todos excepto el último mensaje
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        systemInstruction: systemInstruction
      })

      // Obtener el último mensaje del usuario
      const lastMessage = messages[messages.length - 1]
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('El último mensaje debe ser del usuario')
      }

      // Enviar el mensaje y obtener respuesta
      const result = await chat.sendMessage(lastMessage.content)
      const response = await result.response
      const text = response.text()

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

      const model = this.genAI!.getGenerativeModel({ model: 'gemini-pro' })

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

