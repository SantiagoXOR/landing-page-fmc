import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Middleware de validación robusto para APIs
 * Proporciona validación consistente y manejo de errores
 */

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  success: boolean
  data?: any
  errors?: ValidationError[]
}

/**
 * Valida el cuerpo de la request con un schema Zod
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    
    if (!result.success) {
      const errors: ValidationError[] = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      
      return {
        success: false,
        errors
      }
    }
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'body',
        message: 'Invalid JSON format',
        code: 'invalid_json'
      }]
    }
  }
}

/**
 * Valida query parameters con un schema Zod
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): ValidationResult {
  try {
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())
    const result = schema.safeParse(params)
    
    if (!result.success) {
      const errors: ValidationError[] = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      
      return {
        success: false,
        errors
      }
    }
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'query',
        message: 'Invalid query parameters',
        code: 'invalid_query'
      }]
    }
  }
}

/**
 * Valida path parameters con un schema Zod
 */
export function validatePathParams<T>(
  params: any,
  schema: z.ZodSchema<T>
): ValidationResult {
  try {
    const result = schema.safeParse(params)
    
    if (!result.success) {
      const errors: ValidationError[] = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      
      return {
        success: false,
        errors
      }
    }
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'params',
        message: 'Invalid path parameters',
        code: 'invalid_params'
      }]
    }
  }
}

/**
 * Crea una respuesta de error de validación estandarizada
 */
export function createValidationErrorResponse(errors: ValidationError[]): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      message: 'Los datos proporcionados no son válidos',
      details: errors,
      timestamp: new Date().toISOString()
    },
    { status: 400 }
  )
}

/**
 * Wrapper para rutas API que incluye validación automática
 */
export function withValidation<TBody = any, TQuery = any, TParams = any>(
  handler: (
    request: NextRequest,
    context: {
      params?: TParams
      body?: TBody
      query?: TQuery
    }
  ) => Promise<NextResponse>,
  options: {
    bodySchema?: z.ZodSchema<TBody>
    querySchema?: z.ZodSchema<TQuery>
    paramsSchema?: z.ZodSchema<TParams>
  } = {}
) {
  return async (
    request: NextRequest,
    context: { params?: any } = {}
  ): Promise<NextResponse> => {
    try {
      const validatedData: any = {}
      
      // Validar body si se proporciona schema
      if (options.bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const bodyValidation = await validateRequestBody(request, options.bodySchema)
        if (!bodyValidation.success) {
          return createValidationErrorResponse(bodyValidation.errors!)
        }
        validatedData.body = bodyValidation.data
      }
      
      // Validar query parameters si se proporciona schema
      if (options.querySchema) {
        const queryValidation = validateQueryParams(request, options.querySchema)
        if (!queryValidation.success) {
          return createValidationErrorResponse(queryValidation.errors!)
        }
        validatedData.query = queryValidation.data
      }
      
      // Validar path parameters si se proporciona schema
      if (options.paramsSchema && context.params) {
        const paramsValidation = validatePathParams(context.params, options.paramsSchema)
        if (!paramsValidation.success) {
          return createValidationErrorResponse(paramsValidation.errors!)
        }
        validatedData.params = paramsValidation.data
      }
      
      // Ejecutar el handler con los datos validados
      return await handler(request, {
        params: validatedData.params || context.params,
        body: validatedData.body,
        query: validatedData.query
      })
      
    } catch (error) {
      console.error('Error in validation middleware:', error)
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Error interno del servidor',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Validaciones específicas para datos argentinos/Formosa
 */
export const ArgentinianValidators = {
  /**
   * Valida DNI argentino con dígito verificador
   */
  validateDNI: (dni: string): boolean => {
    const cleanDNI = dni.replace(/\D/g, '')
    
    // Debe tener 7-8 dígitos
    if (!/^\d{7,8}$/.test(cleanDNI)) {
      return false
    }
    
    // Validación del dígito verificador (algoritmo simplificado)
    const digits = cleanDNI.split('').map(Number)
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4]
    
    if (digits.length === 8) {
      let sum = 0
      for (let i = 0; i < 7; i++) {
        sum += digits[i] * multipliers[i + 1]
      }
      const remainder = sum % 11
      const checkDigit = remainder < 2 ? remainder : 11 - remainder
      return digits[7] === checkDigit
    }
    
    return true // Para DNIs de 7 dígitos, aceptamos sin validación de dígito
  },

  /**
   * Valida CUIL/CUIT argentino
   */
  validateCUIL: (cuil: string): boolean => {
    const cleanCUIL = cuil.replace(/\D/g, '')
    
    if (!/^\d{11}$/.test(cleanCUIL)) {
      return false
    }
    
    const digits = cleanCUIL.split('').map(Number)
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    
    let sum = 0
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * multipliers[i]
    }
    
    const remainder = sum % 11
    const checkDigit = remainder < 2 ? remainder : 11 - remainder
    
    return digits[10] === checkDigit
  },

  /**
   * Valida código postal argentino
   */
  validatePostalCode: (code: string): boolean => {
    // Formato argentino: 4 dígitos o letra + 4 dígitos
    return /^[A-Z]?\d{4}$/.test(code.toUpperCase())
  }
}
