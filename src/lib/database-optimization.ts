/**
 * Optimizaciones de base de datos para el CRM Phorencial
 * Incluye scripts SQL para crear índices y optimizar consultas
 */

export const DATABASE_INDEXES = {
  // Índices para la tabla Lead
  LEAD_INDEXES: [
    {
      name: 'idx_lead_estado',
      sql: 'CREATE INDEX IF NOT EXISTS idx_lead_estado ON "Lead" (estado);',
      description: 'Índice para filtros por estado de lead'
    },
    {
      name: 'idx_lead_origen',
      sql: 'CREATE INDEX IF NOT EXISTS idx_lead_origen ON "Lead" (origen);',
      description: 'Índice para filtros por origen de lead'
    },
    {
      name: 'idx_lead_zona',
      sql: 'CREATE INDEX IF NOT EXISTS idx_lead_zona ON "Lead" (zona);',
      description: 'Índice para filtros por zona geográfica'
    },
    {
      name: 'idx_lead_created_at',
      sql: 'CREATE INDEX IF NOT EXISTS idx_lead_created_at ON "Lead" ("createdAt" DESC);',
      description: 'Índice para ordenamiento por fecha de creación'
    },
    {
      name: 'idx_lead_updated_at',
      sql: 'CREATE INDEX IF NOT EXISTS idx_lead_updated_at ON "Lead" ("updatedAt" DESC);',
      description: 'Índice para ordenamiento por fecha de actualización'
    },
    {
      name: 'idx_lead_ingresos',
      sql: 'CREATE INDEX IF NOT EXISTS idx_lead_ingresos ON "Lead" (ingresos) WHERE ingresos IS NOT NULL;',
      description: 'Índice para filtros por rango de ingresos'
    },
    {
      name: 'idx_lead_telefono',
      sql: 'CREATE INDEX IF NOT EXISTS idx_lead_telefono ON "Lead" (telefono);',
      description: 'Índice para búsquedas por teléfono'
    },
    {
      name: 'idx_lead_email',
      sql: 'CREATE INDEX IF NOT EXISTS idx_lead_email ON "Lead" (email) WHERE email IS NOT NULL;',
      description: 'Índice para búsquedas por email'
    },
    {
      name: 'idx_lead_dni',
      sql: 'CREATE INDEX IF NOT EXISTS idx_lead_dni ON "Lead" (dni) WHERE dni IS NOT NULL;',
      description: 'Índice para búsquedas por DNI'
    },
    {
      name: 'idx_lead_search_text',
      sql: `CREATE INDEX IF NOT EXISTS idx_lead_search_text ON "Lead" 
            USING gin(to_tsvector('spanish', COALESCE(nombre, '') || ' ' || COALESCE(telefono, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(dni, '')));`,
      description: 'Índice de texto completo para búsquedas'
    },
    {
      name: 'idx_lead_composite_filters',
      sql: 'CREATE INDEX IF NOT EXISTS idx_lead_composite_filters ON "Lead" (estado, origen, zona, "createdAt" DESC);',
      description: 'Índice compuesto para filtros múltiples'
    }
  ],

  // Índices para la tabla lead_pipeline
  PIPELINE_INDEXES: [
    {
      name: 'idx_pipeline_lead_id',
      sql: 'CREATE INDEX IF NOT EXISTS idx_pipeline_lead_id ON lead_pipeline (lead_id);',
      description: 'Índice para relación con leads'
    },
    {
      name: 'idx_pipeline_user_id',
      sql: 'CREATE INDEX IF NOT EXISTS idx_pipeline_user_id ON lead_pipeline (user_id);',
      description: 'Índice para filtros por usuario'
    },
    {
      name: 'idx_pipeline_stage',
      sql: 'CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON lead_pipeline (stage);',
      description: 'Índice para filtros por etapa del pipeline'
    },
    {
      name: 'idx_pipeline_updated_at',
      sql: 'CREATE INDEX IF NOT EXISTS idx_pipeline_updated_at ON lead_pipeline (updated_at DESC);',
      description: 'Índice para ordenamiento por última actualización'
    }
  ],

  // Índices para la tabla whatsapp_events
  WHATSAPP_INDEXES: [
    {
      name: 'idx_whatsapp_telefono',
      sql: 'CREATE INDEX IF NOT EXISTS idx_whatsapp_telefono ON whatsapp_events (telefono);',
      description: 'Índice para búsquedas por teléfono en eventos WhatsApp'
    },
    {
      name: 'idx_whatsapp_timestamp',
      sql: 'CREATE INDEX IF NOT EXISTS idx_whatsapp_timestamp ON whatsapp_events (timestamp DESC);',
      description: 'Índice para ordenamiento por timestamp'
    },
    {
      name: 'idx_whatsapp_type',
      sql: 'CREATE INDEX IF NOT EXISTS idx_whatsapp_type ON whatsapp_events (type);',
      description: 'Índice para filtros por tipo de evento'
    }
  ]
}

export const PERFORMANCE_QUERIES = {
  // Consultas optimizadas para casos de uso comunes
  GET_LEADS_BY_ESTADO: `
    SELECT * FROM "Lead" 
    WHERE estado = $1 
    ORDER BY "createdAt" DESC 
    LIMIT $2 OFFSET $3;
  `,

  GET_LEADS_COUNT_BY_ESTADO: `
    SELECT COUNT(*) FROM "Lead" 
    WHERE estado = $1;
  `,

  GET_LEADS_WITH_FILTERS: `
    SELECT * FROM "Lead" 
    WHERE ($1::text IS NULL OR estado = $1)
      AND ($2::text IS NULL OR origen = $2)
      AND ($3::text IS NULL OR zona = $3)
      AND ($4::integer IS NULL OR ingresos >= $4)
      AND ($5::integer IS NULL OR ingresos <= $5)
      AND ($6::timestamp IS NULL OR "createdAt" >= $6)
      AND ($7::timestamp IS NULL OR "createdAt" <= $7)
      AND ($8::text IS NULL OR (
        nombre ILIKE '%' || $8 || '%' OR
        telefono ILIKE '%' || $8 || '%' OR
        email ILIKE '%' || $8 || '%' OR
        dni ILIKE '%' || $8 || '%'
      ))
    ORDER BY "createdAt" DESC
    LIMIT $9 OFFSET $10;
  `,

  GET_PIPELINE_STATS: `
    SELECT 
      stage,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_days_in_stage
    FROM lead_pipeline 
    WHERE created_at >= $1
    GROUP BY stage
    ORDER BY stage;
  `,

  GET_CONVERSION_FUNNEL: `
    WITH lead_stages AS (
      SELECT 
        l.id,
        l.estado,
        l."createdAt",
        p.stage as pipeline_stage,
        p.updated_at as stage_updated_at
      FROM "Lead" l
      LEFT JOIN lead_pipeline p ON l.id = p.lead_id
      WHERE l."createdAt" >= $1
    )
    SELECT 
      estado,
      COUNT(*) as total_leads,
      COUNT(CASE WHEN pipeline_stage IS NOT NULL THEN 1 END) as leads_in_pipeline,
      ROUND(
        COUNT(CASE WHEN pipeline_stage IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 
        2
      ) as conversion_rate
    FROM lead_stages
    GROUP BY estado
    ORDER BY total_leads DESC;
  `
}

export const CACHE_STRATEGIES = {
  // Estrategias de cache para diferentes tipos de consultas
  LEAD_FILTERS: {
    ttl: 300, // 5 minutos
    key: (filters: any) => `leads:filters:${JSON.stringify(filters)}`,
    description: 'Cache para consultas de leads con filtros'
  },

  LEAD_COUNT: {
    ttl: 600, // 10 minutos
    key: (filters: any) => `leads:count:${JSON.stringify(filters)}`,
    description: 'Cache para conteos de leads'
  },

  PIPELINE_STATS: {
    ttl: 1800, // 30 minutos
    key: (dateFrom: string) => `pipeline:stats:${dateFrom}`,
    description: 'Cache para estadísticas del pipeline'
  },

  CONVERSION_FUNNEL: {
    ttl: 3600, // 1 hora
    key: (dateFrom: string) => `conversion:funnel:${dateFrom}`,
    description: 'Cache para datos del embudo de conversión'
  },

  LEAD_DETAIL: {
    ttl: 900, // 15 minutos
    key: (leadId: string) => `lead:detail:${leadId}`,
    description: 'Cache para detalles de lead individual'
  }
}

/**
 * Función para ejecutar la creación de índices
 */
export async function createDatabaseIndexes(supabaseClient: any) {
  const results = []
  
  // Crear índices para leads
  for (const index of DATABASE_INDEXES.LEAD_INDEXES) {
    try {
      await supabaseClient.rpc('execute_sql', { sql: index.sql })
      results.push({ name: index.name, status: 'success', description: index.description })
    } catch (error: any) {
      results.push({ name: index.name, status: 'error', error: error.message })
    }
  }
  
  // Crear índices para pipeline
  for (const index of DATABASE_INDEXES.PIPELINE_INDEXES) {
    try {
      await supabaseClient.rpc('execute_sql', { sql: index.sql })
      results.push({ name: index.name, status: 'success', description: index.description })
    } catch (error: any) {
      results.push({ name: index.name, status: 'error', error: error.message })
    }
  }

  // Crear índices para WhatsApp
  for (const index of DATABASE_INDEXES.WHATSAPP_INDEXES) {
    try {
      await supabaseClient.rpc('execute_sql', { sql: index.sql })
      results.push({ name: index.name, status: 'success', description: index.description })
    } catch (error: any) {
      results.push({ name: index.name, status: 'error', error: error.message })
    }
  }
  
  return results
}

/**
 * Función para analizar el rendimiento de consultas
 */
export function analyzeQueryPerformance(queryTime: number, resultCount: number, filters: any) {
  const analysis = {
    performance: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
    recommendations: [] as string[],
    metrics: {
      queryTime,
      resultCount,
      filterCount: Object.keys(filters).length
    }
  }
  
  // Analizar tiempo de respuesta
  if (queryTime > 2000) {
    analysis.performance = 'poor'
    analysis.recommendations.push('Considerar agregar más índices o optimizar la consulta')
  } else if (queryTime > 1000) {
    analysis.performance = 'fair'
    analysis.recommendations.push('Revisar índices para mejorar rendimiento')
  } else if (queryTime < 200) {
    analysis.performance = 'excellent'
  }
  
  // Analizar cantidad de resultados
  if (resultCount > 1000) {
    analysis.recommendations.push('Considerar implementar paginación más agresiva')
  }
  
  // Analizar complejidad de filtros
  if (analysis.metrics.filterCount > 5) {
    analysis.recommendations.push('Considerar usar índices compuestos para filtros múltiples')
  }
  
  return analysis
}
