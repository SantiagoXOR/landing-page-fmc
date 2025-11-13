/**
 * WhatsApp Business API Client
 * Cliente robusto para la API de WhatsApp Business con retry logic y manejo de errores
 */

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string;
  baseUrl?: string;
}

export interface SendTextMessageParams {
  to: string;
  text: string;
  previewUrl?: boolean;
}

export interface SendMediaMessageParams {
  to: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  caption?: string;
  filename?: string;
}

export interface SendTemplateMessageParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Array<{
    type: string;
    parameters: Array<{
      type: string;
      text?: string;
      image?: { link: string };
      video?: { link: string };
      document?: { link: string };
    }>;
  }>;
}

export interface WhatsAppResponse {
  messaging_product: string;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
  }>;
}

export interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

export class WhatsAppBusinessAPI {
  private config: WhatsAppConfig;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 segundo

  constructor(config: WhatsAppConfig) {
    this.config = {
      apiVersion: 'v18.0',
      baseUrl: 'https://graph.facebook.com',
      ...config,
    };
  }

  /**
   * Verificar si el cliente está configurado correctamente
   */
  static isConfigured(): boolean {
    return !!(
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_ACCESS_TOKEN
    );
  }

  /**
   * Crear instancia desde variables de entorno
   */
  static fromEnv(): WhatsAppBusinessAPI | null {
    if (!this.isConfigured()) {
      console.warn('WhatsApp Business API not configured. Missing environment variables.');
      return null;
    }

    return new WhatsAppBusinessAPI({
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
    });
  }

  /**
   * Enviar mensaje de texto
   */
  async sendTextMessage(params: SendTextMessageParams): Promise<WhatsAppResponse> {
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhoneNumber(params.to),
      type: 'text',
      text: {
        preview_url: params.previewUrl || false,
        body: params.text,
      },
    };

    return this.sendRequest(body, 'sendTextMessage');
  }

  /**
   * Enviar mensaje con media (imagen, video, audio, documento)
   */
  async sendMediaMessage(params: SendMediaMessageParams): Promise<WhatsAppResponse> {
    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhoneNumber(params.to),
      type: params.type,
    };

    // Configurar el tipo de media específico
    body[params.type] = {
      link: params.url,
    };

    // Agregar caption si está disponible (solo para imagen y video)
    if (params.caption && (params.type === 'image' || params.type === 'video')) {
      body[params.type].caption = params.caption;
    }

    // Agregar filename para documentos
    if (params.filename && params.type === 'document') {
      body[params.type].filename = params.filename;
    }

    return this.sendRequest(body, `sendMediaMessage:${params.type}`);
  }

  /**
   * Enviar mensaje de template (plantilla aprobada)
   */
  async sendTemplateMessage(params: SendTemplateMessageParams): Promise<WhatsAppResponse> {
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhoneNumber(params.to),
      type: 'template',
      template: {
        name: params.templateName,
        language: {
          code: params.languageCode || 'es',
        },
        components: params.components || [],
      },
    };

    return this.sendRequest(body, 'sendTemplateMessage');
  }

  /**
   * Marcar mensaje como leído
   */
  async markAsRead(messageId: string): Promise<void> {
    const body = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };

    await this.sendRequest(body, 'markAsRead');
  }

  /**
   * Enviar request con retry logic
   */
  private async sendRequest(
    body: any,
    operation: string,
    attempt: number = 1
  ): Promise<WhatsAppResponse> {
    const url = `${this.config.baseUrl}/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;

    try {
      console.log(`[WhatsApp] ${operation} - Attempt ${attempt}/${this.maxRetries + 1}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new WhatsAppAPIError(data as WhatsAppError, response.status);
      }

      console.log(`[WhatsApp] ${operation} - Success:`, {
        messageId: data.messages?.[0]?.id,
        to: body.to,
      });

      return data;
    } catch (error) {
      console.error(`[WhatsApp] ${operation} - Error on attempt ${attempt}:`, error);

      // Si es un error de rate limit o error de red, reintentar
      if (this.shouldRetry(error) && attempt <= this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[WhatsApp] ${operation} - Retrying in ${delay}ms...`);
        
        await this.sleep(delay);
        return this.sendRequest(body, operation, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Determinar si se debe reintentar la solicitud
   */
  private shouldRetry(error: any): boolean {
    // Reintentar en errores de red
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // Reintentar en rate limits
    if (error instanceof WhatsAppAPIError) {
      const retryableStatusCodes = [429, 500, 502, 503, 504];
      return retryableStatusCodes.includes(error.statusCode);
    }

    return false;
  }

  /**
   * Normalizar número de teléfono al formato internacional
   */
  private normalizePhoneNumber(phone: string): string {
    // Remover espacios, guiones y paréntesis
    let normalized = phone.replace(/[\s\-\(\)]/g, '');

    // Si no empieza con +, agregarlo
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    return normalized;
  }

  /**
   * Sleep helper para retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Error personalizado para errores de la API de WhatsApp
 */
export class WhatsAppAPIError extends Error {
  public readonly errorData: WhatsAppError;
  public readonly statusCode: number;
  public readonly fbTraceId: string;

  constructor(errorData: WhatsAppError, statusCode: number) {
    super(errorData.error.message);
    this.name = 'WhatsAppAPIError';
    this.errorData = errorData;
    this.statusCode = statusCode;
    this.fbTraceId = errorData.error.fbtrace_id;

    // Mantener el stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WhatsAppAPIError);
    }
  }

  /**
   * Obtener detalles del error en formato legible
   */
  getDetails(): string {
    return `WhatsApp API Error [${this.statusCode}]: ${this.message} (Type: ${this.errorData.error.type}, Code: ${this.errorData.error.code}, Trace: ${this.fbTraceId})`;
  }

  /**
   * Verificar si es un error de rate limit
   */
  isRateLimitError(): boolean {
    return this.statusCode === 429 || this.errorData.error.code === 80007;
  }

  /**
   * Verificar si es un error de número inválido
   */
  isInvalidNumberError(): boolean {
    return this.errorData.error.code === 100 && this.message.includes('phone number');
  }

  /**
   * Verificar si es un error de template no encontrado
   */
  isTemplateNotFoundError(): boolean {
    return this.errorData.error.code === 132000;
  }
}

/**
 * Helper para validar número de WhatsApp
 */
export function isValidWhatsAppNumber(phone: string): boolean {
  // Remover caracteres no numéricos excepto +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Debe empezar con + y tener entre 10 y 15 dígitos
  const regex = /^\+\d{10,15}$/;
  return regex.test(cleaned);
}

/**
 * Helper para formatear número para WhatsApp
 */
export function formatWhatsAppNumber(phone: string): string {
  // Remover todos los caracteres excepto dígitos
  let cleaned = phone.replace(/\D/g, '');
  
  // Si es de Argentina y no tiene código de país, agregarlo
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '54' + cleaned;
  }
  
  return '+' + cleaned;
}

