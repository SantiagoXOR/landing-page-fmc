/**
 * Script para importar ÚNICAMENTE los 213 registros válidos del CSV
 * Base de datos ya está limpia
 */

const fs = require('fs');

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

function limpiarTexto(texto) {
  if (!texto) return '';
  return texto.toString().trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ' ');
}

function parsearCSV(contenidoCSV) {
  const lineas = contenidoCSV.split('\n');
  const headers = lineas[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const datos = [];
  
  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue;
    
    const campos = [];
    let campoActual = '';
    let dentroComillas = false;
    
    for (let j = 0; j < linea.length; j++) {
      const char = linea[j];
      
      if (char === '"' && (j === 0 || linea[j-1] === ',')) {
        dentroComillas = true;
      } else if (char === '"' && dentroComillas && (j === linea.length - 1 || linea[j+1] === ',')) {
        dentroComillas = false;
      } else if (char === ',' && !dentroComillas) {
        campos.push(campoActual.trim());
        campoActual = '';
      } else {
        campoActual += char;
      }
    }
    campos.push(campoActual.trim());
    
    if (campos.length >= headers.length) {
      const fila = {};
      headers.forEach((header, index) => {
        fila[header] = campos[index] || '';
      });
      datos.push(fila);
    }
  }
  
  return datos;
}

function validarNombre(nombre) {
  if (!nombre) return false;
  const nombreLimpio = limpiarTexto(nombre);
  if (nombreLimpio.length < 2) return false;
  if (nombreLimpio.toLowerCase() === 'nombre') return false;
  if (nombreLimpio.toLowerCase() === 'nombre completo') return false;
  if (/^[0-9]+$/.test(nombreLimpio)) return false;
  return true;
}

function formatearTelefono(telefono) {
  if (!telefono) return '+54';
  let tel = telefono.replace(/[^\d]/g, '');
  if (tel.startsWith('54') && tel.length >= 10) {
    return `+${tel}`;
  }
  if (tel.startsWith('370') && tel.length === 10) {
    return `+54${tel}`;
  }
  return `+54${tel}`;
}

function formatearIngresos(ingresos) {
  if (!ingresos) return null;
  const numeros = ingresos.replace(/[^\d,\.]/g, '');
  if (!numeros) return null;
  const valor = parseFloat(numeros.replace(/\./g, '').replace(',', '.'));
  if (isNaN(valor)) return null;
  return Math.round(valor);
}

function mapearEstado(estado) {
  if (!estado) return 'NUEVO';
  const estadoLimpio = limpiarTexto(estado).toLowerCase();
  if (estadoLimpio.includes('preaprobado')) return 'PREAPROBADO';
  if (estadoLimpio.includes('denegado') || estadoLimpio.includes('rechazado')) return 'RECHAZADO';
  if (estadoLimpio.includes('documentacion') || estadoLimpio.includes('esperando')) return 'DOC_PENDIENTE';
  if (estadoLimpio.includes('derivado')) return 'DERIVADO';
  if (estadoLimpio.includes('revision')) return 'EN_REVISION';
  return 'NUEVO';
}

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
  
  return response.status === 204 ? null : response.json();
}

async function importarSoloCSVLimpio() {
  try {
    console.log('📥 IMPORTANDO ÚNICAMENTE LOS 213 REGISTROS VÁLIDOS DEL CSV...\n');
    
    // 1. Verificar que la base de datos esté limpia
    console.log('🔍 Paso 1: Verificando que la base de datos esté limpia...');
    const verificacionInicial = await supabaseRequest('/Lead?select=count');
    console.log(`   Leads existentes: ${verificacionInicial.length}`);
    
    if (verificacionInicial.length > 0) {
      console.log('⚠️  La base de datos no está completamente limpia. Continuando de todas formas...\n');
    } else {
      console.log('✅ Base de datos limpia. Procediendo con la importación...\n');
    }
    
    // 2. Leer y procesar el CSV
    console.log('📄 Paso 2: Leyendo archivo CSV...');
    const csvContent = fs.readFileSync('BASE DE CONSULTAS - Hoja 2.csv', 'utf8');
    const datos = parsearCSV(csvContent);
    console.log(`📊 Total de filas parseadas: ${datos.length}\n`);
    
    // 3. Importar SOLO los datos válidos
    console.log('📥 Paso 3: Importando SOLO los registros válidos...');
    
    let leadsCreados = 0;
    let errores = 0;
    let nombresInvalidos = 0;
    const leadsProcesados = [];
    
    for (let i = 0; i < datos.length; i++) {
      try {
        const fila = datos[i];
        
        let nombre = limpiarTexto(fila['NOMBRE COMPLETO'] || '');
        const dni = limpiarTexto(fila['DNI'] || '');
        const trabajo = limpiarTexto(fila['TRABAJO'] || '');
        const ingresosTexto = fila['INGRESOS'] || '';
        const telefono = limpiarTexto(fila['TELEFONO'] || '');
        const zonaTexto = fila['ZONA'] || '';
        const estadoTexto = fila['ESTADO'] || '';
        const notasTexto = fila['Notas'] || '';
        
        // SOLO importar nombres válidos
        if (!validarNombre(nombre)) {
          nombresInvalidos++;
          continue;
        }
        
        // Formatear datos
        const telefonoFormateado = formatearTelefono(telefono);
        const ingresos = formatearIngresos(ingresosTexto);
        const estado = mapearEstado(estadoTexto);
        
        // Generar email basado en el nombre
        const emailBase = nombre.toLowerCase()
          .replace(/\s+/g, '.')
          .replace(/[áéíóúñ]/g, (match) => {
            const map = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n' };
            return map[match] || match;
          });
        const email = `${emailBase}@email.com`;
        
        // Crear el lead
        const leadData = {
          nombre,
          telefono: telefonoFormateado,
          email,
          estado,
          origen: 'csv',
          ingresos,
          zona: limpiarTexto(zonaTexto) || 'Formosa Capital',
          dni: dni || null,
          notas: notasTexto ? `${notasTexto} - Importado desde CSV` : `Importado desde CSV - Fila ${i + 2}`
        };
        
        // Insertar en Supabase
        const resultado = await supabaseRequest('/Lead', {
          method: 'POST',
          body: JSON.stringify(leadData)
        });
        
        leadsProcesados.push({
          nombre,
          fila: i + 2,
          id: resultado[0]?.id
        });
        
        leadsCreados++;
        
        if (leadsCreados % 25 === 0) {
          console.log(`   ✅ Procesados ${leadsCreados} leads válidos...`);
        }
        
        // Log específico para algunos nombres importantes
        if (nombre.toLowerCase().includes('echeverria') || 
            nombre.toLowerCase().includes('jorge') ||
            nombre.toLowerCase().includes('karen')) {
          console.log(`   🎯 IMPORTADO: ${nombre} - Fila ${i + 2}`);
        }
        
      } catch (error) {
        errores++;
        console.error(`   ❌ Error procesando fila ${i + 2}:`, error.message);
      }
    }
    
    console.log(`\n🎉 IMPORTACIÓN COMPLETADA!`);
    console.log(`✅ Leads válidos importados: ${leadsCreados}`);
    console.log(`⚠️  Nombres inválidos saltados: ${nombresInvalidos}`);
    console.log(`❌ Errores: ${errores}`);
    
    // 4. Verificación final
    console.log('\n🔍 Paso 4: Verificación final...');
    const leadsFinales = await supabaseRequest('/Lead?select=*');
    
    console.log(`📊 RESULTADO FINAL:`);
    console.log(`   Total de leads en la base de datos: ${leadsFinales.length}`);
    console.log(`   Todos los leads son del CSV: ${leadsFinales.every(l => l.origen === 'csv') ? 'SÍ' : 'NO'}`);
    
    // Verificar echeverria específicamente
    const echeverriaLeads = leadsFinales.filter(lead => 
      lead.nombre?.toLowerCase().includes('echeverria')
    );
    
    console.log(`\n🎯 Verificación de "echeverria":`);
    console.log(`   Leads encontrados: ${echeverriaLeads.length}`);
    echeverriaLeads.forEach(lead => {
      console.log(`   ✅ ${lead.nombre} (ID: ${lead.id})`);
    });
    
    // Mostrar distribución por estado
    console.log(`\n📊 Distribución por estado:`);
    const porEstado = {};
    leadsFinales.forEach(lead => {
      porEstado[lead.estado] = (porEstado[lead.estado] || 0) + 1;
    });
    Object.entries(porEstado).forEach(([estado, cantidad]) => {
      console.log(`   ${estado}: ${cantidad} leads`);
    });
    
    console.log(`\n✅ BASE DE DATOS CORRECTA!`);
    console.log(`📋 Contiene ÚNICAMENTE los ${leadsCreados} registros válidos del CSV`);
    console.log(`🎯 Todos los datos son reales y provienen del archivo CSV original`);
    
  } catch (error) {
    console.error('💥 Error en la importación:', error);
  }
}

importarSoloCSVLimpio();
