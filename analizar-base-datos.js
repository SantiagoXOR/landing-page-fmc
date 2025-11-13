/**
 * Script para analizar la composición completa de la base de datos
 */

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function analizarBaseDatos() {
  try {
    console.log('🔍 Analizando composición completa de la base de datos...\n');
    
    // Obtener todos los leads
    const leads = await supabaseRequest('/Lead?select=*&order=createdAt.desc');
    
    console.log(`📊 RESUMEN GENERAL:`);
    console.log(`   Total de leads: ${leads.length}`);
    console.log('');
    
    // Análisis por origen
    console.log(`📈 ANÁLISIS POR ORIGEN:`);
    const porOrigen = {};
    leads.forEach(lead => {
      const origen = lead.origen || 'sin_origen';
      porOrigen[origen] = (porOrigen[origen] || 0) + 1;
    });
    
    Object.entries(porOrigen).forEach(([origen, cantidad]) => {
      console.log(`   ${origen}: ${cantidad} leads`);
    });
    console.log('');
    
    // Análisis por estado
    console.log(`📊 ANÁLISIS POR ESTADO:`);
    const porEstado = {};
    leads.forEach(lead => {
      const estado = lead.estado || 'sin_estado';
      porEstado[estado] = (porEstado[estado] || 0) + 1;
    });
    
    Object.entries(porEstado).forEach(([estado, cantidad]) => {
      console.log(`   ${estado}: ${cantidad} leads`);
    });
    console.log('');
    
    // Análisis por fecha de creación
    console.log(`📅 ANÁLISIS POR FECHA DE CREACIÓN:`);
    const porFecha = {};
    leads.forEach(lead => {
      const fecha = lead.createdAt ? lead.createdAt.split('T')[0] : 'sin_fecha';
      porFecha[fecha] = (porFecha[fecha] || 0) + 1;
    });
    
    Object.entries(porFecha).sort().forEach(([fecha, cantidad]) => {
      console.log(`   ${fecha}: ${cantidad} leads`);
    });
    console.log('');
    
    // Verificar nombres del CSV vs nombres genéricos
    console.log(`👥 ANÁLISIS DE NOMBRES:`);
    let nombresRealesCSV = 0;
    let nombresGenericos = 0;
    let nombresVacios = 0;
    
    const ejemplosNombresReales = [];
    const ejemplosNombresGenericos = [];
    
    leads.forEach(lead => {
      const nombre = lead.nombre || '';
      
      if (!nombre || nombre.trim() === '') {
        nombresVacios++;
      } else if (nombre.toLowerCase() === 'nombre' || nombre.toLowerCase().includes('nombre')) {
        nombresGenericos++;
        if (ejemplosNombresGenericos.length < 5) {
          ejemplosNombresGenericos.push(nombre);
        }
      } else {
        nombresRealesCSV++;
        if (ejemplosNombresReales.length < 10) {
          ejemplosNombresReales.push(nombre);
        }
      }
    });
    
    console.log(`   Nombres reales del CSV: ${nombresRealesCSV}`);
    console.log(`   Nombres genéricos: ${nombresGenericos}`);
    console.log(`   Nombres vacíos: ${nombresVacios}`);
    console.log('');
    
    console.log(`📝 EJEMPLOS DE NOMBRES REALES (primeros 10):`);
    ejemplosNombresReales.forEach((nombre, index) => {
      console.log(`   ${index + 1}. "${nombre}"`);
    });
    console.log('');
    
    if (ejemplosNombresGenericos.length > 0) {
      console.log(`⚠️  EJEMPLOS DE NOMBRES GENÉRICOS:`);
      ejemplosNombresGenericos.forEach((nombre, index) => {
        console.log(`   ${index + 1}. "${nombre}"`);
      });
      console.log('');
    }
    
    // Verificar datos específicos del CSV
    console.log(`🎯 VERIFICACIÓN DE DATOS ESPECÍFICOS DEL CSV:`);
    
    // Buscar algunos nombres específicos que sabemos que están en el CSV
    const nombresEspecificos = [
      'echeverria maribel silvia',
      'jorge lino bazan',
      'Karen Vanina Paliza',
      'Barrios Norma Beatriz',
      'López mauro'
    ];
    
    for (const nombreBuscado of nombresEspecificos) {
      const encontrados = leads.filter(lead => 
        lead.nombre?.toLowerCase().includes(nombreBuscado.toLowerCase())
      );
      console.log(`   "${nombreBuscado}": ${encontrados.length} encontrado(s)`);
    }
    console.log('');
    
    // Análisis de teléfonos
    console.log(`📞 ANÁLISIS DE TELÉFONOS:`);
    let telefonosFormosa = 0;
    let telefonosOtros = 0;
    let telefonosVacios = 0;
    
    leads.forEach(lead => {
      const telefono = lead.telefono || '';
      
      if (!telefono || telefono.trim() === '' || telefono === '+54') {
        telefonosVacios++;
      } else if (telefono.includes('+5437')) {
        telefonosFormosa++;
      } else {
        telefonosOtros++;
      }
    });
    
    console.log(`   Teléfonos de Formosa (+5437XX): ${telefonosFormosa}`);
    console.log(`   Otros teléfonos: ${telefonosOtros}`);
    console.log(`   Teléfonos vacíos/inválidos: ${telefonosVacios}`);
    console.log('');
    
    // Análisis de zonas
    console.log(`📍 ANÁLISIS DE ZONAS (top 10):`);
    const porZona = {};
    leads.forEach(lead => {
      const zona = lead.zona || 'sin_zona';
      porZona[zona] = (porZona[zona] || 0) + 1;
    });
    
    const zonasOrdenadas = Object.entries(porZona)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    zonasOrdenadas.forEach(([zona, cantidad]) => {
      console.log(`   ${zona}: ${cantidad} leads`);
    });
    console.log('');
    
    // Resumen final
    console.log(`🎉 RESUMEN FINAL:`);
    console.log(`   ✅ Total de leads: ${leads.length}`);
    console.log(`   ✅ Nombres reales del CSV: ${nombresRealesCSV} (${((nombresRealesCSV/leads.length)*100).toFixed(1)}%)`);
    console.log(`   ✅ Teléfonos de Formosa: ${telefonosFormosa} (${((telefonosFormosa/leads.length)*100).toFixed(1)}%)`);
    console.log(`   ✅ Leads con estado definido: ${leads.filter(l => l.estado && l.estado !== 'sin_estado').length}`);
    console.log(`   ✅ Leads importados desde CSV: ${porOrigen.csv || 0}`);
    
    const porcentajeCSV = porOrigen.csv ? ((porOrigen.csv / leads.length) * 100).toFixed(1) : '0';
    console.log(`   📊 Porcentaje de datos del CSV: ${porcentajeCSV}%`);
    
  } catch (error) {
    console.error('❌ Error analizando la base de datos:', error.message);
  }
}

analizarBaseDatos();
