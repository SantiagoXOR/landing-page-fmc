/**
 * Servicio para mover automáticamente leads a "Listo para Análisis"
 * cuando tienen CUIL y están en etapas iniciales
 */

import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import { PipelineService, PipelineStage } from './pipeline-service'

export class PipelineAutoMoveService {
  /**
   * Verificar si un lead tiene CUIL y moverlo a LISTO_ANALISIS si está en etapas iniciales
   * @param leadId - ID del lead a verificar
   * @returns true si se movió el lead, false en caso contrario
   */
  static async checkAndMoveLeadWithCUIL(leadId: string): Promise<boolean> {
    try {
      if (!supabase.client) {
        logger.warn('Supabase client not available for auto-move check', { leadId })
        return false
      }

      // 1. Obtener el lead
      const { data: lead, error: leadError } = await supabase.client
        .from('Lead')
        .select('id, cuil, customFields')
        .eq('id', leadId)
        .single()

      if (leadError) {
        logger.warn('Error obteniendo lead para auto-move', {
          leadId,
          error: leadError.message
        })
        return false
      }

      if (!lead) {
        logger.warn('Lead no encontrado para auto-move', { leadId })
        return false
      }

      // 2. Extraer CUIL del lead
      const cuil = this.extractCUILFromLead(lead)

      if (!this.isValidCUIL(cuil)) {
        logger.debug('Lead no tiene CUIL válido, no se mueve automáticamente', {
          leadId,
          hasCuil: !!lead.cuil,
          hasCustomFields: !!lead.customFields
        })
        return false
      }

      // 3. Obtener pipeline actual del lead
      const { data: pipeline, error: pipelineError } = await supabase.client
        .from('lead_pipeline')
        .select('id, current_stage')
        .eq('lead_id', leadId)
        .single()

      if (pipelineError && pipelineError.code !== 'PGRST116') {
        // Error diferente a "no encontrado"
        logger.warn('Error obteniendo pipeline para auto-move', {
          leadId,
          error: pipelineError.message
        })
        return false
      }

      // 4. Verificar que esté en una etapa válida para mover
      const validStages: PipelineStage[] = ['CLIENTE_NUEVO', 'CONSULTANDO_CREDITO']
      const currentStage = pipeline?.current_stage as PipelineStage | undefined

      if (!currentStage) {
        // No hay pipeline, crear uno primero
        logger.info('No hay pipeline para el lead, creando uno en CLIENTE_NUEVO', {
          leadId,
          cuil: cuil?.substring(0, 5) + '***' // Ocultar CUIL completo en logs
        })

        const pipelineService = new PipelineService()
        await pipelineService.createLeadPipeline(leadId, 'system')

        // Ahora mover a LISTO_ANALISIS
        await pipelineService.moveLeadToStage(
          leadId,
          'LISTO_ANALISIS',
          'system',
          `Movido automáticamente: Lead tiene CUIL (${cuil?.substring(0, 5)}***)`
        )

        logger.info('✅ Lead movido automáticamente a LISTO_ANALISIS (pipeline creado)', {
          leadId,
          cuilPrefix: cuil?.substring(0, 5) + '***'
        })

        return true
      }

      // Verificar si está en una etapa válida
      if (!validStages.includes(currentStage)) {
        logger.debug('Lead no está en etapa válida para auto-move', {
          leadId,
          currentStage,
          validStages,
          cuilPrefix: cuil?.substring(0, 5) + '***'
        })
        return false
      }

      // 5. Verificar que no esté ya en LISTO_ANALISIS
      if (currentStage === 'LISTO_ANALISIS') {
        logger.debug('Lead ya está en LISTO_ANALISIS', { leadId })
        return false
      }

      // 6. Mover el lead a LISTO_ANALISIS
      const pipelineService = new PipelineService()
      await pipelineService.moveLeadToStage(
        leadId,
        'LISTO_ANALISIS',
        'system',
        `Movido automáticamente: Lead tiene CUIL (${cuil?.substring(0, 5)}***)`
      )

      logger.info('✅ Lead movido automáticamente a LISTO_ANALISIS', {
        leadId,
        fromStage: currentStage,
        toStage: 'LISTO_ANALISIS',
        cuilPrefix: cuil?.substring(0, 5) + '***'
      })

      return true
    } catch (error: any) {
      // No bloquear el flujo principal si falla
      logger.error('Error en checkAndMoveLeadWithCUIL (no crítico)', {
        leadId,
        error: error.message,
        stack: error.stack
      })
      return false
    }
  }

  /**
   * Extraer CUIL del lead (del campo cuil o de customFields)
   * @param lead - Objeto lead con cuil y customFields
   * @returns CUIL extraído o null
   */
  static extractCUILFromLead(lead: any): string | null {
    try {
      // 1. Buscar en el campo directo cuil
      if (lead.cuil) {
        const extracted = this.extractCUILOrDNI(lead.cuil)
        if (extracted) return extracted
      }

      // 2. Buscar en customFields
      if (lead.customFields) {
        let customFields: any = {}
        
        try {
          customFields = typeof lead.customFields === 'string'
            ? JSON.parse(lead.customFields)
            : lead.customFields
        } catch (parseError) {
          logger.warn('Error parseando customFields para extraer CUIL', {
            leadId: lead.id,
            error: parseError
          })
          return null
        }

        // Buscar en claves conocidas
        const cuilValue = customFields.cuit || customFields.cuil || customFields.dni
        if (cuilValue) {
          const extracted = this.extractCUILOrDNI(cuilValue)
          if (extracted) return extracted
        }

        // Buscar en todos los valores de customFields por patrón
        for (const [key, value] of Object.entries(customFields)) {
          if (value === null || value === undefined) continue
          
          const extracted = this.extractCUILOrDNI(value)
          if (extracted) {
            logger.debug('CUIL encontrado en customField', {
              leadId: lead.id,
              customFieldKey: key,
              extracted
            })
            return extracted
          }
        }
      }

      return null
    } catch (error: any) {
      logger.error('Error extrayendo CUIL del lead', {
        leadId: lead.id,
        error: error.message
      })
      return null
    }
  }

  /**
   * Validar que el CUIL sea válido
   * @param cuil - CUIL a validar
   * @returns true si es válido (no vacío y al menos 7 caracteres - puede ser DNI de 7 dígitos)
   */
  static isValidCUIL(cuil: string | null): boolean {
    if (!cuil) return false
    
    // Remover espacios y guiones para validar longitud
    const cleanCuil = cuil.replace(/[\s-]/g, '')
    
    // Debe tener al menos 7 caracteres (puede ser DNI de 7 dígitos o CUIL completo de 8-11 dígitos)
    return cleanCuil.length >= 7
  }

  /**
   * Función helper para extraer CUIL/CUIT/DNI de un valor (puede estar dentro de texto)
   * @param value - Valor que puede contener CUIL/CUIT/DNI
   * @returns CUIL/CUIT/DNI extraído o null
   */
  private static extractCUILOrDNI(value: any): string | null {
    if (!value) return null
    
    const strValue = String(value)
    
    // Buscar patrón CUIL/CUIT con formato XX-XXXXXXXX-X
    const cuilWithDashes = strValue.match(/\b\d{2}-\d{8}-\d{1}\b/)
    if (cuilWithDashes) {
      return cuilWithDashes[0]
    }
    
    // Buscar patrón CUIL/CUIT sin guiones (11 dígitos consecutivos)
    const cuilWithoutDashes = strValue.match(/\b\d{11}\b/)
    if (cuilWithoutDashes) {
      const digits = cuilWithoutDashes[0]
      // Validar que tenga formato de CUIL/CUIT (XX-XXXXXXXX-X)
      if (/^\d{2}\d{8}\d{1}$/.test(digits)) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
      }
    }
    
    // Buscar DNI (8 dígitos) - solo si no encontramos CUIL/CUIT
    const dni = strValue.match(/\b\d{8}\b/)
    if (dni && !cuilWithDashes && !cuilWithoutDashes) {
      return dni[0]
    }
    
    // Si el valor completo parece ser un CUIL/DNI (solo números, 7-11 dígitos)
    // Aceptamos 7 porque algunas personas escriben su DNI que tiene 7 dígitos
    const onlyDigits = strValue.replace(/\D/g, '')
    if (onlyDigits.length >= 7 && onlyDigits.length <= 11) {
      return onlyDigits
    }
    
    return null
  }
}





