require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Lista de todas las tablas a exportar
const TABLES_TO_EXPORT = [
  'User',
  'Lead', 
  'Event',
  'Rule',
  'lead_pipeline',
  'pipeline_stages',
  'pipeline_history',
  'pipeline_activities',
  'formosa_zones',
  'user_profiles',
  'user_zone_assignments',
  'lead_assignments',
  'lead_history'
];

async function exportTableData(tableName) {
  try {
    console.log(`📊 Exportando tabla: ${tableName}`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`❌ Error exportando ${tableName}:`, error.message);
      return { tableName, data: [], error: error.message };
    }
    
    console.log(`✅ ${tableName}: ${data?.length || 0} registros exportados`);
    return { tableName, data: data || [], error: null };
    
  } catch (err) {
    console.error(`❌ Error inesperado exportando ${tableName}:`, err.message);
    return { tableName, data: [], error: err.message };
  }
}

async function exportToJSON(exportData, outputDir) {
  const jsonPath = path.join(outputDir, 'database-export.json');
  
  const exportObject = {
    exportDate: new Date().toISOString(),
    supabaseUrl: supabaseUrl,
    tables: {}
  };
  
  exportData.forEach(({ tableName, data, error }) => {
    exportObject.tables[tableName] = {
      records: data,
      count: data.length,
      error: error
    };
  });
  
  fs.writeFileSync(jsonPath, JSON.stringify(exportObject, null, 2));
  console.log(`📄 Exportación JSON guardada en: ${jsonPath}`);
  return jsonPath;
}

async function exportToCSV(exportData, outputDir) {
  const csvDir = path.join(outputDir, 'csv-exports');
  if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir, { recursive: true });
  }
  
  const csvFiles = [];
  
  exportData.forEach(({ tableName, data, error }) => {
    if (data.length === 0) {
      console.log(`⚠️ Saltando ${tableName} - sin datos`);
      return;
    }
    
    const csvPath = path.join(csvDir, `${tableName}.csv`);
    
    // Obtener headers de la primera fila
    const headers = Object.keys(data[0]);
    let csvContent = headers.join(',') + '\n';
    
    // Agregar filas de datos
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvContent += values.join(',') + '\n';
    });
    
    fs.writeFileSync(csvPath, csvContent);
    csvFiles.push(csvPath);
    console.log(`📊 CSV de ${tableName} guardado en: ${csvPath}`);
  });
  
  return csvFiles;
}

async function exportToSQL(exportData, outputDir) {
  const sqlPath = path.join(outputDir, 'database-export.sql');
  
  let sqlContent = `-- Exportación completa de la base de datos Supabase\n`;
  sqlContent += `-- Fecha de exportación: ${new Date().toISOString()}\n`;
  sqlContent += `-- URL de Supabase: ${supabaseUrl}\n\n`;
  
  exportData.forEach(({ tableName, data, error }) => {
    sqlContent += `-- Tabla: ${tableName} (${data.length} registros)\n`;
    
    if (error) {
      sqlContent += `-- ERROR: ${error}\n\n`;
      return;
    }
    
    if (data.length === 0) {
      sqlContent += `-- Sin datos para exportar\n\n`;
      return;
    }
    
    // Generar INSERT statements
    const headers = Object.keys(data[0]);
    const columnNames = headers.map(h => `"${h}"`).join(', ');
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        if (value instanceof Date) return `'${value.toISOString()}'`;
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return value;
      });
      
      sqlContent += `INSERT INTO "${tableName}" (${columnNames}) VALUES (${values.join(', ')});\n`;
    });
    
    sqlContent += '\n';
  });
  
  fs.writeFileSync(sqlPath, sqlContent);
  console.log(`🗃️ Exportación SQL guardada en: ${sqlPath}`);
  return sqlPath;
}

async function generateSummaryReport(exportData, outputDir) {
  const reportPath = path.join(outputDir, 'export-summary.md');
  
  let report = `# Resumen de Exportación de Base de Datos\n\n`;
  report += `**Fecha de exportación:** ${new Date().toISOString()}\n`;
  report += `**URL de Supabase:** ${supabaseUrl}\n\n`;
  
  report += `## Resumen por Tabla\n\n`;
  report += `| Tabla | Registros | Estado |\n`;
  report += `|-------|-----------|--------|\n`;
  
  let totalRecords = 0;
  let tablesWithData = 0;
  let tablesWithErrors = 0;
  
  exportData.forEach(({ tableName, data, error }) => {
    const recordCount = data.length;
    totalRecords += recordCount;
    
    if (recordCount > 0) tablesWithData++;
    if (error) tablesWithErrors++;
    
    const status = error ? '❌ Error' : recordCount > 0 ? '✅ Con datos' : '⚪ Vacía';
    report += `| ${tableName} | ${recordCount} | ${status} |\n`;
  });
  
  report += `\n## Estadísticas Generales\n\n`;
  report += `- **Total de registros exportados:** ${totalRecords}\n`;
  report += `- **Tablas con datos:** ${tablesWithData}\n`;
  report += `- **Tablas vacías:** ${exportData.length - tablesWithData - tablesWithErrors}\n`;
  report += `- **Tablas con errores:** ${tablesWithErrors}\n`;
  
  if (tablesWithErrors > 0) {
    report += `\n## Errores Encontrados\n\n`;
    exportData.forEach(({ tableName, error }) => {
      if (error) {
        report += `- **${tableName}:** ${error}\n`;
      }
    });
  }
  
  report += `\n## Archivos Generados\n\n`;
  report += `- \`database-export.json\` - Exportación completa en formato JSON\n`;
  report += `- \`database-export.sql\` - Exportación completa en formato SQL\n`;
  report += `- \`csv-exports/\` - Carpeta con archivos CSV individuales por tabla\n`;
  report += `- \`export-summary.md\` - Este resumen\n`;
  
  fs.writeFileSync(reportPath, report);
  console.log(`📋 Resumen guardado en: ${reportPath}`);
  return reportPath;
}

async function main() {
  console.log('🚀 Iniciando exportación completa de la base de datos...\n');
  
  // Crear directorio de exportación
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const outputDir = path.join(__dirname, '..', 'database-exports', `export-${timestamp}`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`📁 Directorio de exportación: ${outputDir}\n`);
  
  // Exportar todas las tablas
  const exportPromises = TABLES_TO_EXPORT.map(tableName => exportTableData(tableName));
  const exportData = await Promise.all(exportPromises);
  
  console.log('\n📊 Resumen de exportación:');
  exportData.forEach(({ tableName, data, error }) => {
    const status = error ? '❌' : data.length > 0 ? '✅' : '⚪';
    console.log(`${status} ${tableName}: ${data.length} registros${error ? ` (Error: ${error})` : ''}`);
  });
  
  console.log('\n🔄 Generando archivos de exportación...\n');
  
  // Generar exportaciones en diferentes formatos
  const [jsonPath, csvFiles, sqlPath, reportPath] = await Promise.all([
    exportToJSON(exportData, outputDir),
    exportToCSV(exportData, outputDir),
    exportToSQL(exportData, outputDir),
    generateSummaryReport(exportData, outputDir)
  ]);
  
  console.log('\n✅ Exportación completa finalizada!');
  console.log('\n📁 Archivos generados:');
  console.log(`   📄 JSON: ${jsonPath}`);
  console.log(`   🗃️ SQL: ${sqlPath}`);
  console.log(`   📊 CSVs: ${csvFiles.length} archivos en csv-exports/`);
  console.log(`   📋 Resumen: ${reportPath}`);
  
  // Calcular estadísticas finales
  const totalRecords = exportData.reduce((sum, { data }) => sum + data.length, 0);
  const tablesWithData = exportData.filter(({ data }) => data.length > 0).length;
  
  console.log('\n📈 Estadísticas finales:');
  console.log(`   📊 Total de registros: ${totalRecords}`);
  console.log(`   📋 Tablas con datos: ${tablesWithData}/${TABLES_TO_EXPORT.length}`);
  console.log(`   📁 Directorio: ${outputDir}`);
}

// Ejecutar exportación
main().catch(error => {
  console.error('❌ Error durante la exportación:', error);
  process.exit(1);
});