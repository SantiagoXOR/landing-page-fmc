/**
 * Scoring Service
 * Servicio para evaluar automáticamente leads según reglas configuradas
 */

import { supabase } from '@/lib/db'

interface ScoringRule {
  id: string
  name: string
  field: string
  operator: string
  value: any
  score_points: number
  is_active: boolean
  priority: number
}

interface LeadData {
  id: string
  edad?: number
  ingresos?: number
  zona?: string
  estado?: string
  origen?: string
  producto?: string
  email?: string
  telefono?: string
  dni?: string
}

interface ScoringResult {
  total_score: number
  rules_applied: string[]
  score_breakdown: Record<string, {
    rule_name: string
    points: number
    matched: boolean
    reason?: string
  }>
  recommendation: 'PREAPROBADO' | 'EN_REVISION' | 'RECHAZADO'
}

export class ScoringService {
  /**
   * Evaluar un lead según las reglas de scoring
   */
  static async evaluateLead(leadId: string, leadData?: LeadData): Promise<ScoringResult> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      // Si no se proporciona leadData, obtenerlo de la base de datos
      if (!leadData) {
        leadData = await supabase.findLeadById(leadId)
        if (!leadData) {
          throw new Error(`Lead not found: ${leadId}`)
        }
      }

      // Obtener reglas activas
      const { data: rules, error } = await supabase.client
        .from('scoring_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })

      if (error) throw error

      if (!rules || rules.length === 0) {
        console.warn('[Scoring] No active scoring rules found')
        return {
          total_score: 0,
          rules_applied: [],
          score_breakdown: {},
          recommendation: 'EN_REVISION'
        }
      }

      // Evaluar cada regla
      let totalScore = 0
      const rulesApplied: string[] = []
      const scoreBreakdown: ScoringResult['score_breakdown'] = {}

      for (const rule of rules) {
        const result = this.evaluateRule(rule, leadData)
        
        scoreBreakdown[rule.id] = {
          rule_name: rule.name,
          points: result.matched ? rule.score_points : 0,
          matched: result.matched,
          reason: result.reason
        }

        if (result.matched) {
          totalScore += rule.score_points
          rulesApplied.push(rule.id)
        }
      }

      // Determinar recomendación
      const recommendation = this.getRecommendation(totalScore)

      // Guardar resultado en la base de datos
      await this.saveScore(leadId, totalScore, rulesApplied, scoreBreakdown)

      console.log('[Scoring] Lead evaluated:', {
        leadId,
        totalScore,
        rulesApplied: rulesApplied.length,
        recommendation
      })

      return {
        total_score: totalScore,
        rules_applied: rulesApplied,
        score_breakdown: scoreBreakdown,
        recommendation
      }
    } catch (error) {
      console.error('[Scoring] Error evaluating lead:', error)
      throw error
    }
  }

  /**
   * Evaluar una regla individual contra los datos de un lead
   */
  private static evaluateRule(rule: ScoringRule, leadData: LeadData): { matched: boolean; reason?: string } {
    try {
      const fieldValue = leadData[rule.field as keyof LeadData]
      let ruleValue = rule.value

      // Parsear value si es JSON string
      if (typeof ruleValue === 'string') {
        try {
          ruleValue = JSON.parse(ruleValue)
        } catch {
          // Es un string simple, mantener como está
        }
      }

      // Evaluar según operador
      switch (rule.operator) {
        case 'equals':
          return {
            matched: fieldValue === ruleValue,
            reason: fieldValue === ruleValue ? undefined : `${fieldValue} ≠ ${ruleValue}`
          }

        case 'contains':
          return {
            matched: String(fieldValue || '').toLowerCase().includes(String(ruleValue).toLowerCase()),
            reason: undefined
          }

        case 'greater_than':
          const numValue = Number(fieldValue)
          const numRule = Number(ruleValue)
          return {
            matched: !isNaN(numValue) && numValue > numRule,
            reason: `${numValue} ${!isNaN(numValue) && numValue > numRule ? '>' : '≤'} ${numRule}`
          }

        case 'less_than':
          const numValue2 = Number(fieldValue)
          const numRule2 = Number(ruleValue)
          return {
            matched: !isNaN(numValue2) && numValue2 < numRule2,
            reason: `${numValue2} ${!isNaN(numValue2) && numValue2 < numRule2 ? '<' : '≥'} ${numRule2}`
          }

        case 'between':
          const num = Number(fieldValue)
          const min = Number(ruleValue.min)
          const max = Number(ruleValue.max)
          const inRange = !isNaN(num) && num >= min && num <= max
          return {
            matched: inRange,
            reason: `${num} ${inRange ? '∈' : '∉'} [${min}, ${max}]`
          }

        case 'in_list':
          const list = Array.isArray(ruleValue) ? ruleValue : []
          return {
            matched: list.includes(fieldValue),
            reason: undefined
          }

        default:
          console.warn('[Scoring] Unknown operator:', rule.operator)
          return { matched: false, reason: 'Operador desconocido' }
      }
    } catch (error) {
      console.error('[Scoring] Error evaluating rule:', error)
      return { matched: false, reason: 'Error en evaluación' }
    }
  }

  /**
   * Obtener recomendación basada en el puntaje
   */
  private static getRecommendation(score: number): 'PREAPROBADO' | 'EN_REVISION' | 'RECHAZADO' {
    if (score >= 70) return 'PREAPROBADO'
    if (score >= 40) return 'EN_REVISION'
    return 'RECHAZADO'
  }

  /**
   * Guardar puntaje de un lead
   */
  private static async saveScore(
    leadId: string,
    totalScore: number,
    rulesApplied: string[],
    scoreBreakdown: ScoringResult['score_breakdown']
  ): Promise<void> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { error } = await supabase.client
        .from('lead_scores')
        .insert({
          lead_id: leadId,
          total_score: totalScore,
          rules_applied: JSON.stringify(rulesApplied),
          score_breakdown: JSON.stringify(scoreBreakdown),
        })

      if (error) throw error
    } catch (error) {
      console.error('[Scoring] Error saving score:', error)
      // No lanzar error, es secundario
    }
  }

  /**
   * Obtener último score de un lead
   */
  static async getLeadScore(leadId: string): Promise<ScoringResult | null> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data, error } = await supabase.client
        .from('lead_scores')
        .select('*')
        .eq('lead_id', leadId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return {
        total_score: data.total_score,
        rules_applied: JSON.parse(data.rules_applied || '[]'),
        score_breakdown: JSON.parse(data.score_breakdown || '{}'),
        recommendation: this.getRecommendation(data.total_score)
      }
    } catch (error) {
      console.error('[Scoring] Error getting lead score:', error)
      return null
    }
  }

  /**
   * Calcular data completeness de un lead
   */
  static calculateDataCompleteness(leadData: LeadData): 'complete' | 'partial' | 'incomplete' {
    const requiredFields = ['email', 'telefono', 'dni']
    const completedFields = requiredFields.filter(field => {
      const value = leadData[field as keyof LeadData]
      return value && value !== ''
    })

    if (completedFields.length === requiredFields.length) return 'complete'
    if (completedFields.length > 0) return 'partial'
    return 'incomplete'
  }
}
