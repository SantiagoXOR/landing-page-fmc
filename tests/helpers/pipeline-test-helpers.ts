/**
 * Helper functions para tests del pipeline
 * Usa la API REST de Supabase o endpoints de la aplicación para crear/limpiar datos de prueba
 */

// Tipo PipelineLead definido localmente para evitar problemas de importación en Playwright
export interface PipelineLead {
  id: string
  nombre: string
  telefono: string
  email?: string
  origen: string
  estado: string
  stageId: string
  stageEntryDate: Date | string
  lastActivity?: Date | string
  score?: number
  tags?: string[]
  customFields?: Record<string, any>
  activities?: any[]
  tasks?: any[]
  notes?: string
  assignedTo?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  value?: number
  probability?: number
  timeInStage?: number
  urgency?: 'low' | 'medium' | 'high' | 'critical'
  scoreColor?: string
  scoreLabel?: string
  cuil?: string
}

// Logging inicial de variables de entorno al cargar el módulo
console.log('[INIT] Variables de entorno Supabase al cargar módulo:')
console.log('[INIT] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 50)}...` : 'undefined')
console.log('[INIT] SUPABASE_URL:', process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.substring(0, 50)}...` : 'undefined')
console.log('[INIT] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` : 'undefined')
console.log('[INIT] SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? `${process.env.SUPABASE_SERVICE_KEY.substring(0, 20)}...` : 'undefined')
console.log('[INIT] NODE_ENV:', process.env.NODE_ENV)
console.log('[INIT] Todas las variables que contienen SUPABASE:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).map(k => `${k}=${process.env[k]?.substring(0, 30)}...`))

// URL correcta de Supabase (hardcodeada como fallback si las variables están mal configuradas)
const CORRECT_SUPABASE_URL = 'https://hvmenkhmyovfmwsnitab.supabase.co'

// Configuración de Supabase (leer dinámicamente para evitar problemas con dotenv)
function getSupabaseUrl(): string | undefined {
  const nextPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseUrl = process.env.SUPABASE_URL
  
  // Priorizar NEXT_PUBLIC_SUPABASE_URL, pero validar ambas
  let url = nextPublicUrl || supabaseUrl
  
  console.log('[DEBUG getSupabaseUrl]')
  console.log('  - NEXT_PUBLIC_SUPABASE_URL:', nextPublicUrl ? `${nextPublicUrl.substring(0, 50)}...` : 'undefined')
  console.log('  - SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 50)}...` : 'undefined')
  
  // Validar que la URL no sea la incorrecta
  if (url && url.includes('zmozfpxujgknqqgmsrpk')) {
    console.error('[ERROR] URL incorrecta detectada! zmozfpxujgknqqgmsrpk.supabase.co')
    console.error('  Hay una variable de entorno del sistema con URL incorrecta')
    console.error('  Usando URL correcta como fallback:', CORRECT_SUPABASE_URL)
    console.warn('  ⚠️  Para corregir permanentemente:')
    console.warn('     1. Verifica variables de entorno del sistema: echo %SUPABASE_URL%')
    console.warn('     2. Elimina o corrige la variable SUPABASE_URL del sistema')
    console.warn('     3. Asegúrate de que NEXT_PUBLIC_SUPABASE_URL esté en .env.local')
    url = CORRECT_SUPABASE_URL
  }
  
  // Si no hay URL y tenemos la correcta como fallback, usarla
  if (!url) {
    console.warn('[WARN] No se encontró URL de Supabase en variables de entorno')
    console.warn('  Usando URL correcta como fallback:', CORRECT_SUPABASE_URL)
    url = CORRECT_SUPABASE_URL
  }
  
  console.log('  - URL seleccionada:', url ? `${url.substring(0, 50)}...` : 'undefined')
  
  return url
}

function getSupabaseServiceKey(): string | undefined {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  const key = serviceRoleKey || serviceKey
  
  console.log('[DEBUG getSupabaseServiceKey]')
  console.log('  - SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? `${serviceRoleKey.substring(0, 20)}...` : 'undefined')
  console.log('  - SUPABASE_SERVICE_KEY:', serviceKey ? `${serviceKey.substring(0, 20)}...` : 'undefined')
  console.log('  - Key seleccionada:', key ? `${key.substring(0, 20)}...` : 'undefined')
  
  return key
}

// Mapeo de stageId a pipeline_stage de la base de datos
// NOTA: Solo usar valores del enum actualizado (según migración 002_update_pipeline_stages_manychat.sql)
const stageIdToPipelineStage: Record<string, string> = {
  'cliente-nuevo': 'CLIENTE_NUEVO',
  'consultando-credito': 'CONSULTANDO_CREDITO',
  'solicitando-docs': 'SOLICITANDO_DOCS',
  'listo-analisis': 'LISTO_ANALISIS',
  'preaprobado': 'PREAPROBADO',
  'aprobado': 'APROBADO',
  'rechazado': 'RECHAZADO',
  'en-seguimiento': 'EN_SEGUIMIENTO', // Cambiado de 'SEGUIMIENTO' a 'EN_SEGUIMIENTO'
  'cerrado-ganado': 'CERRADO_GANADO',
  'solicitar-referido': 'SOLICITAR_REFERIDO', // Agregado para completitud
}

export interface TestLeadData {
  nombre: string
  telefono: string
  email?: string
  createdAt: Date
  priority?: 'low' | 'medium' | 'high' | 'urgent' // Prioridad deseada (se usará para calcular stageEntryDate)
  stageId?: string
  estado?: string
  origen?: string
  zona?: string
  stageEntryDate?: Date // Fecha de entrada a la etapa (si no se proporciona, se calcula según priority)
}

/**
 * Crea un lead de prueba usando la API REST de Supabase o la API de la aplicación
 * @param data - Datos del lead de prueba
 * @param request - Contexto de request de Playwright (opcional, para usar cookies de sesión)
 */
export async function createTestLeadWithDate(
  data: TestLeadData,
  request?: any // APIRequestContext de Playwright
): Promise<string> {
  // Leer variables de entorno dinámicamente
  const SUPABASE_URL = getSupabaseUrl()
  const SUPABASE_SERVICE_KEY = getSupabaseServiceKey()
  
  // Si no hay Supabase, intentar usar la API de la aplicación
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    if (request) {
      // Usar el endpoint de test que no requiere permisos granulares
      try {
        const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
        
        // Preparar datos del lead (el endpoint de test es más permisivo)
        const leadData = {
          nombre: data.nombre.trim(),
          telefono: data.telefono.replace(/\D/g, ''), // Solo números
          email: data.email || `test-${Date.now()}@example.com`,
          estado: data.estado || 'NUEVO',
          origen: data.origen || 'web',
          notas: `Test lead creado el ${data.createdAt.toISOString()}`,
        }

        // Usar el endpoint de test que no requiere validación estricta ni permisos granulares
        const response = await request.post(`${baseURL}/api/test/create-lead`, {
          data: leadData,
        })

        if (!response.ok()) {
          const errorText = await response.text()
          console.error(`Error creating lead via test API (${response.status()}):`, errorText)
          throw new Error(`Failed to create lead via test API: ${response.status()} - ${errorText}`)
        }

        const result = await response.json()
        const leadId = result.lead?.id || result.id

        // Crear pipeline para el lead si se especificó stageId
        if (data.stageId && leadId) {
          let stageEntryDate = data.stageEntryDate
          
          if (!stageEntryDate && data.priority) {
            const now = new Date()
            if (data.priority === 'urgent') {
              stageEntryDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
            } else if (data.priority === 'high') {
              stageEntryDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
            } else {
              stageEntryDate = data.createdAt
            }
          } else if (!stageEntryDate) {
            stageEntryDate = data.createdAt
          }
          
          await createPipelineForLead(leadId, data.stageId, stageEntryDate, request)
        }

        return leadId
      } catch (error) {
        console.error('Error creating lead via API:', error)
        throw new Error('Supabase configuration not found and API creation failed. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
      }
    } else {
      console.warn('⚠️  Supabase configuration not found. Tests may fail.')
      console.warn('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
      throw new Error('Supabase configuration not found. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    }
  }

  const leadData = {
    nombre: data.nombre,
    telefono: data.telefono,
    email: data.email || `test-${Date.now()}@example.com`,
    estado: data.estado || 'NUEVO',
    origen: data.origen || 'web',
    zona: data.zona || 'Formosa Capital',
    createdAt: data.createdAt.toISOString(),
    updatedAt: new Date().toISOString(),
  }

  try {
    const fetchUrl = `${SUPABASE_URL}/rest/v1/Lead`
    console.log('[FETCH] Intentando crear lead en Supabase:')
    console.log('  - URL completa:', fetchUrl)
    console.log('  - SUPABASE_URL usado:', SUPABASE_URL)
    console.log('  - Tiene service key:', !!SUPABASE_SERVICE_KEY)
    
    if (fetchUrl.includes('zmozfpxujgknqqgmsrpk')) {
      console.error('[ERROR CRÍTICO] La URL contiene zmozfpxujgknqqgmsrpk!')
      console.error('  - Esto NO debería pasar. Verificar variables de entorno.')
      throw new Error(`URL incorrecta detectada: ${fetchUrl}. Verificar variables de entorno.`)
    }
    
    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(leadData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create lead: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    const leadId = Array.isArray(result) ? result[0].id : result.id

    // Crear pipeline para el lead si se especificó stageId
    if (data.stageId && leadId) {
      // Calcular stageEntryDate según la prioridad deseada
      let stageEntryDate = data.stageEntryDate
      
      if (!stageEntryDate && data.priority) {
        // Calcular stageEntryDate para lograr la prioridad deseada
        // Para high: necesita >7 días en etapa
        // Para urgent: necesita >14 días en etapa
        const now = new Date()
        if (data.priority === 'urgent') {
          // Crítico: más de 14 días
          stageEntryDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
        } else if (data.priority === 'high') {
          // Urgente: más de 7 días pero menos de 14
          stageEntryDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
        } else {
          // Para low/medium, usar fecha reciente
          stageEntryDate = data.createdAt
        }
      } else if (!stageEntryDate) {
        stageEntryDate = data.createdAt
      }
      
      await createPipelineForLead(leadId, data.stageId, stageEntryDate)
    }

    return leadId
  } catch (error) {
    console.error('Error creating test lead:', error)
    throw error
  }
}

/**
 * Crea un pipeline para un lead
 */
async function createPipelineForLead(
  leadId: string,
  stageId: string,
  stageEnteredAt: Date,
  request?: any // APIRequestContext de Playwright
): Promise<void> {
  // Leer variables de entorno dinámicamente
  const SUPABASE_URL = getSupabaseUrl()
  const SUPABASE_SERVICE_KEY = getSupabaseServiceKey()
  
  // Si no hay Supabase, intentar usar la API de la aplicación
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    if (request) {
      // Usar la API de la aplicación para mover el lead a la etapa
      try {
        const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
        const response = await request.post(`${baseURL}/api/pipeline/leads/${leadId}/move`, {
          data: {
            toStageId: stageId,
            stageEnteredAt: stageEnteredAt.toISOString(),
          },
        })
        
        if (!response.ok()) {
          console.warn(`Failed to create pipeline via API: ${response.status()}`)
        }
        return
      } catch (error) {
        console.warn('Error creating pipeline via API:', error)
        // Continuar de todas formas
        return
      }
    } else {
      throw new Error('Supabase configuration not found')
    }
  }

  const pipelineStage = stageIdToPipelineStage[stageId] || 'CLIENTE_NUEVO' // Cambiar fallback a valor válido del enum

  const pipelineData = {
    lead_id: leadId,
    current_stage: pipelineStage,
    stage_entered_at: stageEnteredAt.toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  console.log('[PIPELINE] Creando pipeline:', {
    leadId,
    stageId,
    pipelineStage,
    stageEnteredAt: stageEnteredAt.toISOString()
  })

  try {
    const fetchUrl = `${SUPABASE_URL}/rest/v1/lead_pipeline`
    console.log('[FETCH] Intentando crear pipeline en Supabase:')
    console.log('  - URL completa:', fetchUrl)
    console.log('  - SUPABASE_URL usado:', SUPABASE_URL)
    console.log('  - Pipeline data:', JSON.stringify(pipelineData, null, 2))
    
    if (fetchUrl.includes('zmozfpxujgknqqgmsrpk')) {
      console.error('[ERROR CRÍTICO] La URL contiene zmozfpxujgknqqgmsrpk!')
      throw new Error(`URL incorrecta detectada: ${fetchUrl}`)
    }
    
    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(pipelineData),
    })

    if (!response.ok && response.status !== 409) {
      // 409 = conflict (ya existe), está bien
      const errorText = await response.text()
      console.error('[PIPELINE] Error creando pipeline:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      throw new Error(`Failed to create pipeline: ${response.status} ${errorText}`)
    } else {
      console.log('[PIPELINE] Pipeline creado exitosamente:', {
        leadId,
        pipelineStage,
        status: response.status
      })
    }
  } catch (error) {
    console.error('Error creating pipeline:', error)
    throw error
  }
}

/**
 * Crea múltiples leads de prueba en batch
 * @param leadsData - Array de datos de leads
 * @param request - Contexto de request de Playwright (opcional, para usar cookies de sesión)
 */
export async function createTestLeadsBatch(
  leadsData: TestLeadData[],
  request?: any // APIRequestContext de Playwright
): Promise<string[]> {
  const leadIds: string[] = []

  for (const data of leadsData) {
    try {
      const leadId = await createTestLeadWithDate(data, request)
      leadIds.push(leadId)
    } catch (error) {
      console.error(`Error creating lead ${data.nombre}:`, error)
      // Continuar con los demás leads
    }
  }

  return leadIds
}

/**
 * Limpia leads de prueba de la base de datos
 */
export async function cleanupTestLeads(leadIds: string[]): Promise<void> {
  // Leer variables de entorno dinámicamente
  const SUPABASE_URL = getSupabaseUrl()
  const SUPABASE_SERVICE_KEY = getSupabaseServiceKey()
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || leadIds.length === 0) {
    return
  }

  // Los leads se eliminarán en cascada con sus pipelines
  for (const leadId of leadIds) {
    try {
      const fetchUrl = `${SUPABASE_URL}/rest/v1/Lead?id=eq.${leadId}`
      console.log('[FETCH] Intentando eliminar lead desde Supabase:')
      console.log('  - URL:', fetchUrl.substring(0, 80) + '...')
      console.log('  - SUPABASE_URL usado:', SUPABASE_URL)
      
      if (fetchUrl.includes('zmozfpxujgknqqgmsrpk')) {
        console.error('[ERROR CRÍTICO] La URL contiene zmozfpxujgknqqgmsrpk!')
        throw new Error(`URL incorrecta detectada`)
      }
      
      const response = await fetch(fetchUrl, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      })

      if (!response.ok && response.status !== 404) {
        console.warn(`Failed to delete lead ${leadId}: ${response.status}`)
      }
    } catch (error) {
      console.error(`Error deleting lead ${leadId}:`, error)
    }
  }
}

/**
 * Obtiene leads de una etapa específica desde la API
 * @param stageId - ID de la etapa
 * @param baseURL - URL base de la aplicación
 * @param request - Contexto de request de Playwright (opcional, para usar cookies de sesión)
 */
export async function getLeadsFromStage(
  stageId: string,
  baseURL: string = 'http://localhost:3000',
  request?: any // APIRequestContext de Playwright
): Promise<PipelineLead[]> {
  try {
    if (request) {
      // Usar el contexto de Playwright que incluye las cookies de sesión
      const response = await request.get(`${baseURL}/api/pipeline/stages/${stageId}/leads`)
      
      if (!response.ok()) {
        const errorText = await response.text()
        const status = response.status()
        
        // Mejorar mensaje de error para diagnóstico
        if (status === 500) {
          let errorDetails = errorText
          let errorMessage = 'Error interno del servidor'
          
          try {
            const errorJson = JSON.parse(errorText)
            errorDetails = errorJson.details || errorJson.message || errorText
            errorMessage = errorJson.message || errorMessage
          } catch {
            // Si no es JSON, usar el texto tal cual
          }
          
          // Verificar si es un error de conexión a Supabase
          if (errorDetails.includes('fetch failed') || errorDetails.includes('Error de conexión a Supabase')) {
            throw new Error(
              `❌ Error de conexión a Supabase desde el servidor Next.js.\n` +
              `\n` +
              `El servidor no puede conectarse a Supabase. Verifique:\n` +
              `1. ✅ El servidor Next.js está corriendo (npm run dev)\n` +
              `2. ✅ El servidor fue REINICIADO después de configurar las variables en .env.local\n` +
              `3. ✅ Las variables están en .env.local:\n` +
              `   - SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL\n` +
              `   - SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SERVICE_KEY\n` +
              `4. ✅ La URL de Supabase es accesible desde el servidor (verifique firewall/proxy)\n` +
              `\n` +
              `Detalles del error: ${errorMessage}\n` +
              `Stage: ${stageId}\n` +
              `Respuesta completa: ${errorDetails.substring(0, 500)}`
            )
          }
          
          throw new Error(
            `Error del servidor (500) al obtener leads de la etapa "${stageId}".\n` +
            `Mensaje: ${errorMessage}\n` +
            `Detalles: ${errorDetails.substring(0, 500)}`
          )
        }
        
        console.error(`Error getting leads from stage (${status}):`, errorText)
        throw new Error(`Failed to get leads: ${status} - ${errorText}`)
      }

      return await response.json()
    } else {
      // Fallback a fetch directo (sin cookies de sesión)
      const response = await fetch(`${baseURL}/api/pipeline/stages/${stageId}/leads`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get leads: ${response.status}`)
      }

      return await response.json()
    }
  } catch (error) {
    console.error('Error getting leads from stage:', error)
    throw error
  }
}

/**
 * Verifica que los leads están ordenados correctamente
 * - Leads prioritarios (high/urgent) con ventana de 24hs primero
 * - Dentro de los prioritarios, orden ascendente por createdAt
 * - Resto de leads después
 */
export function verifyLeadOrdering(
  leads: PipelineLead[],
  leadOriginalMap: Map<string, { createdAt: string }>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Separar leads en grupos
  const priorityLeadsWith24h: PipelineLead[] = []
  const otherLeads: PipelineLead[] = []

  for (const lead of leads) {
    const isPriority = lead.priority === 'high' || lead.priority === 'urgent'

    if (isPriority && lead.id) {
      const originalLead = leadOriginalMap.get(lead.id)
      if (originalLead?.createdAt) {
        const leadCreatedAt = new Date(originalLead.createdAt)
        if (leadCreatedAt >= twentyFourHoursAgo) {
          priorityLeadsWith24h.push(lead)
          continue
        }
      }
    }

    otherLeads.push(lead)
  }

  // Verificar que los prioritarios están primero
  const firstNonPriorityIndex = leads.findIndex(
    (lead) => !priorityLeadsWith24h.some((p) => p.id === lead.id)
  )

  if (firstNonPriorityIndex !== -1 && firstNonPriorityIndex < priorityLeadsWith24h.length) {
    errors.push(
      `Lead no prioritario encontrado en posición ${firstNonPriorityIndex}, antes de los prioritarios`
    )
  }

  // Verificar orden ascendente dentro de los prioritarios
  for (let i = 0; i < priorityLeadsWith24h.length - 1; i++) {
    const current = priorityLeadsWith24h[i]
    const next = priorityLeadsWith24h[i + 1]

    if (current.id && next.id) {
      const currentOriginal = leadOriginalMap.get(current.id)
      const nextOriginal = leadOriginalMap.get(next.id)

      if (currentOriginal?.createdAt && nextOriginal?.createdAt) {
        const currentDate = new Date(currentOriginal.createdAt).getTime()
        const nextDate = new Date(nextOriginal.createdAt).getTime()

        if (currentDate > nextDate) {
          errors.push(
            `Lead prioritario "${current.nombre}" (${new Date(currentOriginal.createdAt).toISOString()}) ` +
            `debe aparecer antes que "${next.nombre}" (${new Date(nextOriginal.createdAt).toISOString()})`
          )
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Crea un mapa de leads originales desde la API para verificación
 * @param leadIds - IDs de los leads
 * @param baseURL - URL base de la aplicación
 * @param request - Contexto de request de Playwright (opcional, para usar cookies de sesión)
 */
export async function createLeadOriginalMap(
  leadIds: string[],
  baseURL: string = 'http://localhost:3000',
  request?: any // APIRequestContext de Playwright
): Promise<Map<string, { createdAt: string }>> {
  // Leer variables de entorno dinámicamente
  const SUPABASE_URL = getSupabaseUrl()
  const SUPABASE_SERVICE_KEY = getSupabaseServiceKey()
  
  const map = new Map<string, { createdAt: string }>()

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    // Si no hay Supabase config, intentar desde la API
    try {
      if (request) {
        // Usar el contexto de Playwright que incluye las cookies de sesión
        const response = await request.get(`${baseURL}/api/leads?limit=10000`)
        
        if (response.ok()) {
          const data = await response.json()
          const leads = Array.isArray(data) ? data : data.leads || []

          for (const lead of leads) {
            if (lead.id && lead.createdAt) {
              map.set(lead.id, { createdAt: lead.createdAt })
            }
          }
        }
      } else {
        // Fallback a fetch directo (sin cookies de sesión)
        const response = await fetch(`${baseURL}/api/leads?limit=10000`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const leads = Array.isArray(data) ? data : data.leads || []

          for (const lead of leads) {
            if (lead.id && lead.createdAt) {
              map.set(lead.id, { createdAt: lead.createdAt })
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching leads from API:', error)
    }
    return map
  }

  // Usar Supabase directamente
  try {
    const idsFilter = leadIds.map((id) => `"${id}"`).join(',')
    const fetchUrl = `${SUPABASE_URL}/rest/v1/Lead?select=id,createdAt&id=in.(${idsFilter})`
    console.log('[FETCH] Intentando obtener leads desde Supabase:')
    console.log('  - URL completa:', fetchUrl.substring(0, 100) + '...')
    console.log('  - SUPABASE_URL usado:', SUPABASE_URL)
    
    if (fetchUrl.includes('zmozfpxujgknqqgmsrpk')) {
      console.error('[ERROR CRÍTICO] La URL contiene zmozfpxujgknqqgmsrpk!')
      throw new Error(`URL incorrecta detectada: ${fetchUrl.substring(0, 100)}`)
    }
    
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    })

    if (response.ok) {
      const leads = await response.json()
      for (const lead of leads) {
        if (lead.id && lead.createdAt) {
          map.set(lead.id, { createdAt: lead.createdAt })
        }
      }
    }
  } catch (error) {
    console.error('Error fetching leads from Supabase:', error)
  }

  return map
}

/**
 * Helper para crear fechas relativas (hace X horas)
 */
export function createDateHoursAgo(hoursAgo: number): Date {
  const now = new Date()
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
}

/**
 * Helper para crear fechas relativas (hace X días)
 */
export function createDateDaysAgo(daysAgo: number): Date {
  const now = new Date()
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
}


