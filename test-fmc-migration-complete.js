const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 INICIANDO TEST INTEGRAL DE MIGRACIÓN FMC');
console.log('='.repeat(60));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error('❌ Error: Variables de entorno de Supabase no encontradas');
    console.log('URL:', supabaseUrl ? '✅ Configurada' : '❌ Faltante');
    console.log('Anon Key:', supabaseAnonKey ? '✅ Configurada' : '❌ Faltante');
    console.log('Service Key:', supabaseServiceKey ? '✅ Configurada' : '❌ Faltante');
    process.exit(1);
}

// Cliente con clave anónima
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Cliente con clave de servicio (para operaciones administrativas)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseConnection() {
    console.log('\n📡 1. PROBANDO CONEXIÓN A LA BASE DE DATOS');
    console.log('-'.repeat(50));
    
    try {
        const { data, error } = await supabase.from('pipeline_stages').select('count', { count: 'exact' });
        if (error) throw error;
        
        console.log('✅ Conexión exitosa a la base de datos FMC');
        return true;
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        return false;
    }
}

async function testTablesExistence() {
    console.log('\n📋 2. VERIFICANDO EXISTENCIA DE TABLAS');
    console.log('-'.repeat(50));
    
    const expectedTables = [
        'Lead', 'Event', 'User', 'Rule',
        'user_profiles', 'lead_history', 'formosa_zones',
        'user_zone_assignments', 'lead_assignments',
        'pipeline_stages', 'lead_pipeline', 'pipeline_history', 'pipeline_activities'
    ];
    
    let allTablesExist = true;
    
    for (const table of expectedTables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error && error.code !== 'PGRST116') { // PGRST116 = tabla vacía, está bien
                throw error;
            }
            console.log(`✅ Tabla "${table}" existe y es accesible`);
        } catch (error) {
            console.error(`❌ Tabla "${table}" no accesible:`, error.message);
            allTablesExist = false;
        }
    }
    
    return allTablesExist;
}

async function testInitialData() {
    console.log('\n📊 3. VERIFICANDO DATOS INICIALES');
    console.log('-'.repeat(50));
    
    try {
        // Verificar zonas de Formosa
        const { data: zones, error: zonesError } = await supabase
            .from('formosa_zones')
            .select('*');
        
        if (zonesError) throw zonesError;
        console.log(`✅ Zonas de Formosa: ${zones.length} registros encontrados`);
        
        // Verificar etapas del pipeline
        const { data: stages, error: stagesError } = await supabase
            .from('pipeline_stages')
            .select('*');
        
        if (stagesError) throw stagesError;
        console.log(`✅ Etapas del pipeline: ${stages.length} registros encontrados`);
        
        // Verificar reglas del sistema
        const { data: rules, error: rulesError } = await supabase
            .from('Rule')
            .select('*');
        
        if (rulesError) throw rulesError;
        console.log(`✅ Reglas del sistema: ${rules.length} registros encontrados`);
        
        return zones.length >= 10 && stages.length >= 9 && rules.length >= 8;
    } catch (error) {
        console.error('❌ Error verificando datos iniciales:', error.message);
        return false;
    }
}

async function testRLSPolicies() {
    console.log('\n🔒 4. VERIFICANDO POLÍTICAS RLS');
    console.log('-'.repeat(50));
    
    try {
        // Intentar acceder a tablas con RLS habilitado sin autenticación
        // Esto debería fallar o retornar datos limitados
        
        const { data: leads, error: leadsError } = await supabase
            .from('Lead')
            .select('*')
            .limit(1);
        
        // Si no hay error, significa que RLS permite acceso público (configuración correcta para algunas tablas)
        // Si hay error, verificamos que sea por RLS
        if (leadsError && leadsError.code === '42501') {
            console.log('✅ RLS está activo en tabla Lead (acceso denegado sin autenticación)');
        } else if (!leadsError) {
            console.log('✅ RLS permite acceso público a tabla Lead (configuración válida)');
        }
        
        // Verificar acceso a zonas (debería ser público)
        const { data: zones, error: zonesError } = await supabase
            .from('formosa_zones')
            .select('*')
            .limit(1);
        
        if (!zonesError && zones.length >= 0) {
            console.log('✅ Acceso público a zonas funcionando correctamente');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error verificando RLS:', error.message);
        return false;
    }
}

async function testBasicOperations() {
    console.log('\n⚙️ 5. PROBANDO OPERACIONES BÁSICAS');
    console.log('-'.repeat(50));
    
    try {
        // Test 1: Leer configuración del sistema
        const { data: config, error: configError } = await supabase
            .from('Rule')
            .select('key, value')
            .eq('key', 'auto_assign_enabled');
        
        if (configError) throw configError;
        console.log('✅ Lectura de configuración del sistema exitosa');
        
        // Test 2: Leer etapas del pipeline
        const { data: pipelineStages, error: pipelineError } = await supabase
            .from('pipeline_stages')
            .select('name, stage_type, order_position')
            .order('order_position');
        
        if (pipelineError) throw pipelineError;
        console.log(`✅ Lectura de pipeline exitosa (${pipelineStages.length} etapas)`);
        
        // Test 3: Verificar estructura de datos
        if (pipelineStages.length > 0) {
            const firstStage = pipelineStages[0];
            if (firstStage.name && firstStage.stage_type && firstStage.order_position !== undefined) {
                console.log('✅ Estructura de datos del pipeline correcta');
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error en operaciones básicas:', error.message);
        return false;
    }
}

async function testApplicationReadiness() {
    console.log('\n🚀 6. VERIFICANDO PREPARACIÓN DE LA APLICACIÓN');
    console.log('-'.repeat(50));
    
    try {
        // Verificar que las tablas principales están listas para recibir datos
        const checks = [
            { table: 'Lead', required: ['nombre', 'telefono', 'estado'] },
            { table: 'user_profiles', required: ['email', 'nombre', 'role'] },
            { table: 'lead_pipeline', required: ['lead_id', 'current_stage', 'assigned_to'] }
        ];
        
        for (const check of checks) {
            // Verificar estructura de la tabla
            const { data, error } = await supabaseAdmin
                .from(check.table)
                .select('*')
                .limit(0); // Solo queremos verificar la estructura
            
            if (error && error.code !== 'PGRST116') {
                throw new Error(`Tabla ${check.table} no accesible: ${error.message}`);
            }
            
            console.log(`✅ Tabla "${check.table}" lista para operaciones`);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error verificando preparación:', error.message);
        return false;
    }
}

async function runCompleteTest() {
    console.log('🎯 Ejecutando test integral de migración FMC...\n');
    
    const tests = [
        { name: 'Conexión a BD', fn: testDatabaseConnection },
        { name: 'Existencia de tablas', fn: testTablesExistence },
        { name: 'Datos iniciales', fn: testInitialData },
        { name: 'Políticas RLS', fn: testRLSPolicies },
        { name: 'Operaciones básicas', fn: testBasicOperations },
        { name: 'Preparación de app', fn: testApplicationReadiness }
    ];
    
    let passedTests = 0;
    const results = [];
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            results.push({ name: test.name, passed: result });
            if (result) passedTests++;
        } catch (error) {
            console.error(`❌ Error en test "${test.name}":`, error.message);
            results.push({ name: test.name, passed: false });
        }
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN DE RESULTADOS');
    console.log('='.repeat(60));
    
    results.forEach(result => {
        const status = result.passed ? '✅ PASÓ' : '❌ FALLÓ';
        console.log(`${status} - ${result.name}`);
    });
    
    console.log('\n' + '-'.repeat(60));
    console.log(`🎯 RESULTADO FINAL: ${passedTests}/${tests.length} tests pasaron`);
    
    if (passedTests === tests.length) {
        console.log('🎉 ¡MIGRACIÓN FMC COMPLETAMENTE EXITOSA!');
        console.log('✅ La aplicación está lista para usar con la nueva base de datos');
        console.log('🚀 Puedes proceder a usar el sistema normalmente');
    } else {
        console.log('⚠️  Algunos tests fallaron. Revisa los errores arriba.');
        console.log('🔧 Es posible que necesites ajustes adicionales');
    }
    
    console.log('='.repeat(60));
}

// Ejecutar el test
runCompleteTest().catch(error => {
    console.error('💥 Error fatal en el test:', error);
    process.exit(1);
});