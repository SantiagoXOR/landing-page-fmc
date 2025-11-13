const fs = require('fs');
const { JSDOM } = require('jsdom');

// Función para limpiar y normalizar texto
function cleanText(text) {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
}

// Función para extraer número de teléfono
function cleanPhone(phone) {
  if (!phone) return '';
  // Remover espacios y caracteres especiales, mantener solo números
  const cleaned = phone.replace(/[^\d]/g, '');
  // Si empieza con 54, es código de país argentino
  if (cleaned.startsWith('54')) {
    return '+' + cleaned;
  }
  // Si empieza con 370, es código de área de Formosa
  if (cleaned.startsWith('370')) {
    return '+54' + cleaned;
  }
  // Si es un número local, agregar código de país y área
  if (cleaned.length === 10) {
    return '+54' + cleaned;
  }
  return '+54' + cleaned;
}

// Función para extraer ingresos
function parseIngresos(ingresos) {
  if (!ingresos) return null;
  // Extraer números del texto, remover puntos y comas
  const match = ingresos.match(/[\d.,]+/);
  if (match) {
    const number = match[0].replace(/[.,]/g, '');
    return parseInt(number) || null;
  }
  return null;
}

// Función para mapear estado
function mapEstado(estado) {
  if (!estado) return 'NUEVO';
  
  const estadoLower = estado.toLowerCase();
  if (estadoLower.includes('preaprobado')) return 'PREAPROBADO';
  if (estadoLower.includes('denegado')) return 'RECHAZADO';
  if (estadoLower.includes('esperando') || estadoLower.includes('documentación')) return 'DOC_PENDIENTE';
  if (estadoLower.includes('contactado')) return 'CONTACTADO';
  if (estadoLower.includes('revisión')) return 'EN_REVISION';
  
  return 'NUEVO';
}

// Función para mapear zona
function mapZona(zona) {
  if (!zona) return 'Formosa';
  
  const zonaClean = cleanText(zona);
  // Mapear zonas conocidas de Formosa
  const zonaMap = {
    'ingeniero juarez': 'Ingeniero Juárez',
    'villa del rosario': 'Villa del Rosario',
    'la nueva formosa': 'La Nueva Formosa',
    'solidaridad': 'Solidaridad',
    'namqom': 'Namqom',
    'san antonio': 'San Antonio',
    'las lomitas': 'Las Lomitas'
  };
  
  const zonaKey = zonaClean.toLowerCase();
  return zonaMap[zonaKey] || zonaClean || 'Formosa';
}

// Función para generar email basado en nombre
function generateEmail(nombre) {
  if (!nombre) return '';
  
  const parts = nombre.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(' ')
    .filter(part => part.length > 0);
  
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}@email.com`;
  } else if (parts.length === 1) {
    return `${parts[0]}@email.com`;
  }
  
  return '';
}

// Función principal para extraer datos del HTML
function extractDataFromHTML() {
  try {
    console.log('🔍 Leyendo archivo HTML...');
    const htmlContent = fs.readFileSync('Hoja 2.html', 'utf8');
    
    console.log('📊 Parseando HTML...');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Encontrar la tabla
    const table = document.querySelector('table.waffle');
    if (!table) {
      throw new Error('No se encontró la tabla en el HTML');
    }
    
    const rows = table.querySelectorAll('tbody tr');
    console.log(`📋 Encontradas ${rows.length} filas de datos`);
    
    const leads = [];
    
    // Procesar cada fila (saltear la primera que es header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('td');
      
      if (cells.length < 11) continue; // Asegurar que tiene todas las columnas
      
      // Extraer datos de cada celda
      const nombre = cleanText(cells[0]?.textContent);
      const dni = cleanText(cells[1]?.textContent);
      const trabajo = cleanText(cells[2]?.textContent);
      const ingresosText = cleanText(cells[3]?.textContent);
      const bdf = cells[4]?.querySelector('svg use')?.getAttribute('href')?.includes('checked');
      const telefono = cleanText(cells[5]?.textContent);
      const zona = cleanText(cells[6]?.textContent);
      const motoModelo = cleanText(cells[7]?.textContent);
      const estadoText = cleanText(cells[8]?.textContent);
      const agencia = cleanText(cells[9]?.textContent);
      const notas = cleanText(cells[10]?.textContent);

      // Debug para ver qué datos estamos extrayendo
      if (i <= 5) {
        console.log(`Fila ${i}: ${nombre} | ${telefono} | ${estadoText}`);
      }
      
      // Validar datos mínimos
      if (!nombre || !telefono) {
        console.log(`⚠️  Saltando fila ${i + 1}: faltan datos mínimos`);
        continue;
      }
      
      // Procesar y limpiar datos
      const lead = {
        nombre: nombre,
        dni: dni || null,
        telefono: cleanPhone(telefono),
        email: generateEmail(nombre),
        ingresos: parseIngresos(ingresosText),
        zona: mapZona(zona),
        producto: motoModelo || 'Moto 110cc',
        monto: 500000, // Monto estimado para motos
        origen: 'excel', // Origen de los datos
        utmSource: 'importacion_excel',
        estado: mapEstado(estadoText),
        agencia: agencia || null,
        notas: `${trabajo ? `Trabajo: ${trabajo}. ` : ''}${notas || ''}${bdf ? ' BDF: Sí' : ''}`.trim()
      };
      
      leads.push(lead);
      console.log(`✅ Procesado: ${lead.nombre} - ${lead.estado}`);
    }
    
    console.log(`\n📊 RESUMEN DE IMPORTACIÓN:`);
    console.log(`Total leads procesados: ${leads.length}`);
    
    // Estadísticas por estado
    const estadoStats = {};
    leads.forEach(lead => {
      estadoStats[lead.estado] = (estadoStats[lead.estado] || 0) + 1;
    });
    
    console.log('\n📈 Distribución por estado:');
    Object.entries(estadoStats).forEach(([estado, count]) => {
      console.log(`  ${estado}: ${count} leads`);
    });
    
    return leads;
    
  } catch (error) {
    console.error('❌ Error al procesar HTML:', error.message);
    throw error;
  }
}

// Función para generar SQL de inserción
function generateInsertSQL(leads) {
  console.log('\n🔧 Generando SQL de inserción...');
  
  const sqlStatements = [];
  
  leads.forEach((lead, index) => {
    const values = [
      `'${lead.nombre.replace(/'/g, "''")}'`, // Escapar comillas simples
      lead.dni ? `'${lead.dni}'` : 'NULL',
      `'${lead.telefono}'`,
      lead.email ? `'${lead.email}'` : 'NULL',
      lead.ingresos || 'NULL',
      lead.zona ? `'${lead.zona.replace(/'/g, "''")}'` : 'NULL',
      lead.producto ? `'${lead.producto.replace(/'/g, "''")}'` : 'NULL',
      lead.monto || 'NULL',
      `'${lead.origen}'`,
      lead.utmSource ? `'${lead.utmSource}'` : 'NULL',
      `'${lead.estado}'`,
      lead.agencia ? `'${lead.agencia.replace(/'/g, "''")}'` : 'NULL',
      lead.notas ? `'${lead.notas.replace(/'/g, "''")}'` : 'NULL'
    ];
    
    const sql = `INSERT INTO "Lead" (nombre, dni, telefono, email, ingresos, zona, producto, monto, origen, "utmSource", estado, agencia, notas) VALUES (${values.join(', ')});`;
    sqlStatements.push(sql);
  });
  
  return sqlStatements;
}

// Función principal
async function main() {
  try {
    console.log('🚀 Iniciando importación de datos desde Excel...\n');
    
    // Extraer datos del HTML
    const leads = extractDataFromHTML();
    
    if (leads.length === 0) {
      console.log('⚠️  No se encontraron leads para importar');
      return;
    }
    
    // Generar SQL
    const sqlStatements = generateInsertSQL(leads);
    
    // Guardar SQL en archivo
    const sqlContent = [
      '-- Script de importación de leads desde Excel',
      '-- Ejecutar este script en el SQL Editor de Supabase',
      '',
      '-- Limpiar datos existentes si es necesario (OPCIONAL)',
      '-- DELETE FROM "Lead" WHERE origen = \'excel\';',
      '',
      '-- Insertar nuevos leads',
      ...sqlStatements,
      '',
      '-- Verificar inserción',
      'SELECT COUNT(*) as total_leads FROM "Lead";',
      'SELECT estado, COUNT(*) as count FROM "Lead" GROUP BY estado ORDER BY estado;'
    ].join('\n');
    
    fs.writeFileSync('import-leads-from-excel.sql', sqlContent);
    
    console.log('\n✅ IMPORTACIÓN COMPLETADA');
    console.log(`📄 Archivo SQL generado: import-leads-from-excel.sql`);
    console.log(`📊 Total de leads: ${leads.length}`);
    console.log('\n🔧 PRÓXIMOS PASOS:');
    console.log('1. Revisar el archivo import-leads-from-excel.sql');
    console.log('2. Ejecutar el script en el SQL Editor de Supabase');
    console.log('3. Verificar que los datos se importaron correctamente');
    
  } catch (error) {
    console.error('\n❌ Error en la importación:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { extractDataFromHTML, generateInsertSQL };
