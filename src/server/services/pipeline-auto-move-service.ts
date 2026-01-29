/**
 * Servicio para mover automáticamente leads a "Listo para Análisis"
 * cuando tienen CUIL o customFields completos, y no están en Preaprobado ni Rechazado
 */

import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getTagForStage } from '@/lib/manychat-sync'
import { PipelineService, PipelineStage } from './pipeline-service'
import { ManychatSyncService } from './manychat-sync-service'

/** Etapas en las que NO se mueve automáticamente a Listo para Análisis */
const STAGES_EXCLUDED_FROM_AUTO_MOVE: PipelineStage[] = ['PREAPROBADO', 'RECHAZADO', 'LISTO_ANALISIS']

export class PipelineAutoMoveService {
  /**
   * Verificar si un lead tiene CUIL o customFields completos y moverlo a LISTO_ANALISIS
   * si no está en Preaprobado, Rechazado ni ya en Listo para Análisis.
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

      // 2. Criterio: tiene CUIL válido O customFields completos
      const cuil = this.extractCUILFromLead(lead)
      const hasCuil = this.isValidCUIL(cuil)
      const hasCompleteCustomFields = this.hasCompleteCustomFields(lead)

      if (!hasCuil && !hasCompleteCustomFields) {
        logger.debug('Lead sin CUIL ni customFields completos, no se mueve automáticamente', {
          leadId,
          hasCuil,
          hasCompleteCustomFields
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
        logger.warn('Error obteniendo pipeline para auto-move', {
          leadId,
          error: pipelineError.message
        })
        return false
      }

      const currentStage = pipeline?.current_stage as PipelineStage | undefined

      // 4. No mover si ya está en Listo para Análisis, Preaprobado o Rechazado
      if (currentStage && STAGES_EXCLUDED_FROM_AUTO_MOVE.includes(currentStage)) {
        logger.debug('Lead en etapa excluida para auto-move', { leadId, currentStage })
        return false
      }

      const reason = hasCuil ? `Lead tiene CUIL (${cuil?.substring(0, 5)}***)` : 'Lead con customFields completos'

      if (!currentStage) {
        logger.info('No hay pipeline para el lead, creando uno en CLIENTE_NUEVO', { leadId })

        const pipelineService = new PipelineService()
        await pipelineService.createLeadPipeline(leadId, 'system')

        await pipelineService.moveLeadToStage(
          leadId,
          'LISTO_ANALISIS',
          'system',
          `Movido automáticamente: ${reason}`
        )

        logger.info('✅ Lead movido automáticamente a LISTO_ANALISIS (pipeline creado)', { leadId })
        await this.normalizeTagsListoAnalisis(leadId)
        return true
      }

      // 5. Mover el lead a LISTO_ANALISIS
      const pipelineService = new PipelineService()
      await pipelineService.moveLeadToStage(
        leadId,
        'LISTO_ANALISIS',
        'system',
        `Movido automáticamente: ${reason}`
      )

      logger.info('✅ Lead movido automáticamente a LISTO_ANALISIS', {
        leadId,
        fromStage: currentStage,
        toStage: 'LISTO_ANALISIS'
      })

      await this.normalizeTagsListoAnalisis(leadId)
      return true
    } catch (error: any) {
      logger.error('Error en checkAndMoveLeadWithCUIL (no crítico)', {
        leadId,
        error: error.message,
        stack: error.stack
      })
      return false
    }
  }

  /**
   * Considera customFields "completos" si tiene identificación (CUIL/DNI) + zona + producto o marca
   */
  static hasCompleteCustomFields(lead: any): boolean {
    try {
      const cf = lead?.customFields
      if (!cf) return false

      const parsed = typeof cf === 'string' ? (() => { try { return JSON.parse(cf) } catch { return {} } })() : cf
      if (!parsed || typeof parsed !== 'object') return false

      const hasId = !!(parsed.cuil || parsed.cuit || parsed.dni) && String(parsed.cuil ?? parsed.cuit ?? parsed.dni).trim().length >= 7
      const hasZona = !!(parsed.zona && String(parsed.zona).trim())
      const hasProductoOrMarca = !!(parsed.producto && String(parsed.producto).trim()) || !!(parsed.marca && String(parsed.marca).trim())

      return hasId && hasZona && hasProductoOrMarca
    } catch {
      return false
    }
  }

  /**
   * En "Listo para Análisis" el lead debe tener solo el tag solicitud-en-proceso.
   * Actualiza Lead.tags y sincroniza con ManyChat.
   */
  private static async normalizeTagsListoAnalisis(leadId: string): Promise<void> {
    try {
      const tag = await getTagForStage('LISTO_ANALISIS')
      if (!tag) return
      await ManychatSyncService.syncTagsToManychat(leadId, [tag])
    } catch (error: any) {
      logger.warn('Error normalizando tags para Listo para Análisis (no crítico)', {
        leadId,
        error: error.message
      })
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










