// Script para crear las tablas del pipeline en la base de datos de Phorencial
require('dotenv').config({ path: __dirname + '/.env' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Función para ejecutar SQL usando el cliente de Supabase
async function executeSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      throw new Error(`Error ejecutando SQL: ${error.message}`)
    }

    return data
  } catch (error) {
    // Si exec_sql no existe, intentar crear las tablas manualmente
    console.warn('⚠️ No se puede ejecutar SQL directo, creando tablas manualmente...')
    throw error
  }
}

// SQL para crear las tablas del pipeline
const createTablesSQL = `
-- 1. CREAR ENUM PARA ETAPAS DEL PIPELINE
DO $$ BEGIN
    CREATE TYPE pipeline_stage AS ENUM (
        'LEAD_NUEVO',
        'CONTACTO_INICIAL', 
        'CALIFICACION',
        'PRESENTACION',
        'PROPUESTA',
        'NEGOCIACION',
        'CIERRE_GANADO',
        'CIERRE_PERDIDO',
        'SEGUIMIENTO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CREAR ENUM PARA TIPOS DE TRANSICIÓN
DO $$ BEGIN
    CREATE TYPE transition_type AS ENUM ('MANUAL', 'AUTOMATIC', 'SCHEDULED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CREAR ENUM PARA MOTIVOS DE PÉRDIDA
DO $$ BEGIN
    CREATE TYPE loss_reason AS ENUM (
        'PRECIO',
        'COMPETENCIA', 
        'PRESUPUESTO',
        'TIMING',
        'NO_INTERES',
        'NO_CONTACTO',
        'OTRO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. TABLA DE CONFIGURACIÓN DE ETAPAS
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    stage_type pipeline_stage UNIQUE NOT NULL,
    description TEXT,
    order_position INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    target_duration_days INTEGER,
    conversion_target_percent DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLA DE TRANSICIONES PERMITIDAS
CREATE TABLE IF NOT EXISTS pipeline_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_stage pipeline_stage NOT NULL,
    to_stage pipeline_stage NOT NULL,
    transition_name VARCHAR(100) NOT NULL,
    is_allowed BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    auto_transition_days INTEGER,
    required_fields JSONB,
    validation_rules JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_stage, to_stage)
);

-- 6. TABLA PRINCIPAL DEL PIPELINE
CREATE TABLE IF NOT EXISTS lead_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
    current_stage pipeline_stage NOT NULL DEFAULT 'LEAD_NUEVO',
    stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    won BOOLEAN,
    loss_reason loss_reason,
    loss_notes TEXT,
    total_value DECIMAL(15,2),
    probability_percent INTEGER DEFAULT 10 CHECK (probability_percent >= 0 AND probability_percent <= 100),
    expected_close_date DATE,
    last_activity_date TIMESTAMP WITH TIME ZONE,
    next_follow_up_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lead_id)
);

-- 7. TABLA DE HISTORIAL DE TRANSICIONES
CREATE TABLE IF NOT EXISTS pipeline_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_pipeline_id UUID NOT NULL REFERENCES lead_pipeline(id) ON DELETE CASCADE,
    from_stage pipeline_stage,
    to_stage pipeline_stage NOT NULL,
    transition_type transition_type DEFAULT 'MANUAL',
    duration_in_stage_days INTEGER,
    notes TEXT,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- 8. TABLA DE ACTIVIDADES DEL PIPELINE
CREATE TABLE IF NOT EXISTS pipeline_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_pipeline_id UUID NOT NULL REFERENCES lead_pipeline(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    assigned_to UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- 9. ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_lead_id ON lead_pipeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_stage ON lead_pipeline(current_stage);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_assigned ON lead_pipeline(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_pipeline_id ON pipeline_history(lead_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_date ON pipeline_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_activities_pipeline_id ON pipeline_activities(lead_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_activities_due_date ON pipeline_activities(due_date);
`

// Función principal usando enfoque manual
async function createPipelineTables() {
  try {
    console.log('🚀 Creando tablas del pipeline en Phorencial...')

    // Crear las tablas manualmente usando el cliente de Supabase
    console.log('📝 Creando tablas manualmente...')

    // 1. Verificar si las tablas ya existen
    console.log('🔍 Verificando tablas existentes...')

    try {
      const { data: existingTables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['lead_pipeline', 'pipeline_stages', 'pipeline_transitions', 'pipeline_history'])

      if (existingTables && existingTables.length > 0) {
        console.log(`✅ Encontradas ${existingTables.length} tablas del pipeline ya existentes`)
        return
      }
    } catch (error) {
      console.log('📝 Las tablas del pipeline no existen, creándolas...')
    }

    // 2. Crear las tablas usando SQL directo a través de la API REST
    console.log('🔧 Creando tablas del pipeline...')

    // Como no podemos ejecutar SQL directo, vamos a crear un mensaje informativo
    console.log('⚠️ IMPORTANTE: Las tablas del pipeline deben crearse manualmente en Supabase.')
    console.log('📋 Por favor, ejecuta el siguiente SQL en el editor SQL de Supabase:')
    console.log('🔗 https://supabase.com/dashboard/project/aozysydpwvkkdvhfsvsu/sql')
    console.log('')
    console.log('-- SQL PARA CREAR TABLAS DEL PIPELINE:')
    console.log(createTablesSQL)
    console.log('')
    console.log('✅ Una vez ejecutado el SQL, ejecuta nuevamente el script de migración.')

  } catch (error) {
    console.error('❌ Error creando tablas del pipeline:', error.message)
    process.exit(1)
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  createPipelineTables()
    .then(() => {
      console.log('🎉 Proceso completado exitosamente!')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Error fatal:', error)
      process.exit(1)
    })
}

module.exports = { createPipelineTables }
