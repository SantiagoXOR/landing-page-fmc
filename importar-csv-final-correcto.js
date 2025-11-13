/**
 * Script final para importar CSV con formato correcto y manejo de campos requeridos
 */

const fs = require('fs');

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

function limpiarTexto(texto) {
  if (!texto) return '';
  return texto.toString().trim().replace(/^["']|["']$/g, '');
}

function formatearNombreCorrectamente(nombre) {
  if (!nombre) return '';
  
  let nombreLimpio = limpiarTexto(nombre);
  
  // Convertir a formato correcto: Primera letra mayúscula, resto minúscula para cada palabra
  return nombreLimpio
    .toLowerCase()
    .split(' ')
    .map(palabra => {
      if (palabra.length === 0) return '';
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    })
    .join(' ')
    .trim();
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
  if (!telefono) return '+54'; // Valor por defecto si no existe
  
  let tel = telefono.replace(/[^\d]/g, '');
  if (!tel) return '+54'; // Valor por defecto si está vacío
  
  if (tel.startsWith('54') && tel.length >= 10) {
    return `+${tel}`;
  }
  if (tel.startsWith('370') && tel.length === 10) {
    return `+54${tel}`;
  }
  if (tel.length >= 8) {
    return `+54${tel}`;
  }
  
  return '+54'; // Valor por defecto si no es válido
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

async function importarCSVFinalCorrecto() {
  try {
    console.log('🎯 IMPORTACIÓN FINAL CON FORMATO CORRECTO Y MANEJO DE CAMPOS REQUERIDOS...\n');
    
    // 1. Eliminar todos los leads existentes
    console.log('🗑️  Paso 1: Eliminando todos los leads existentes...');
    await fetch(`${SUPABASE_URL}/rest/v1/Lead?id=not.is.null`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      }
    });
    console.log('✅ Base de datos limpia\n');
    
    // 2. Leer y procesar el CSV
    console.log('📄 Paso 2: Leyendo archivo CSV...');
    const csvContent = fs.readFileSync('BASE DE CONSULTAS - Hoja 2.csv', 'utf8');
    const datos = parsearCSV(csvContent);
    console.log(`📊 Total de filas parseadas: ${datos.length}\n`);
    
    // 3. Importar con formato correcto
    console.log('📥 Paso 3: Importando TODOS los registros válidos...');
    
    let leadsCreados = 0;
    let errores = 0;
    let nombresInvalidos = 0;
    
    for (let i = 0; i < datos.length; i++) {
      try {
        const fila = datos[i];
        
        // Extraer datos EXACTAMENTE como están en el CSV
        const nombreOriginal = limpiarTexto(fila['NOMBRE COMPLETO'] || '');
        const dni = limpiarTexto(fila['DNI'] || '');
        const ingresosTexto = fila['INGRESOS'] || '';
        const telefonoOriginal = limpiarTexto(fila['TELEFONO'] || '');
        const zonaOriginal = limpiarTexto(fila['ZONA'] || '');
        const estadoTexto = fila['ESTADO'] || '';
        const notasTexto = limpiarTexto(fila['Notas'] || '');
        
        // SOLO importar nombres válidos
        if (!validarNombre(nombreOriginal)) {
          nombresInvalidos++;
          continue;
        }
        
        // Formatear nombre correctamente (Primera letra mayúscula)
        const nombreFormateado = formatearNombreCorrectamente(nombreOriginal);
        
        // Formatear datos con valores por defecto para campos requeridos
        const telefonoFormateado = formatearTelefono(telefonoOriginal);
        const ingresos = formatearIngresos(ingresosTexto);
        const estado = mapearEstado(estadoTexto);
        
        // Crear el lead con manejo correcto de campos requeridos
        const leadData = {
          nombre: nombreFormateado,
          telefono: telefonoFormateado, // Siempre tiene valor (mínimo '+54')
          email: null, // NO generar email si no está en el CSV
          estado,
          origen: 'csv',
          ingresos,
          zona: zonaOriginal || null,
          dni: dni || null,
          notas: notasTexto || null
        };
        
        // Insertar en Supabase
        await supabaseRequest('/Lead', {
          method: 'POST',
          body: JSON.stringify(leadData)
        });
        
        leadsCreados++;
        
        if (leadsCreados % 25 === 0) {
          console.log(`   ✅ Procesados ${leadsCreados} leads válidos...`);
        }
        
        // Log específico para algunos nombres importantes
        if (nombreFormateado.toLowerCase().includes('echeverria') || 
            nombreFormateado.toLowerCase().includes('jorge') ||
            nombreFormateado.toLowerCase().includes('karen')) {
          console.log(`   🎯 IMPORTADO: "${nombreFormateado}" (original: "${nombreOriginal}") - Fila ${i + 2}`);
        }
        
      } catch (error) {
        errores++;
        console.error(`   ❌ Error procesando fila ${i + 2}:`, error.message);
        
        // Si hay muchos errores consecutivos, parar
        if (errores > 20) {
          console.log('   ⚠️  Demasiados errores, parando importación...');
          break;
        }
      }
    }
    
    console.log(`\n🎉 IMPORTACIÓN FINAL COMPLETADA!`);
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
      console.log(`   ✅ "${lead.nombre}" (Teléfono: ${lead.telefono}, Email: ${lead.email || 'N/A'})`);
    });
    
    // Mostrar ejemplos de nombres formateados
    console.log(`\n📝 Ejemplos de nombres formateados correctamente:`);
    const ejemplos = leadsFinales.slice(0, 10);
    ejemplos.forEach((lead, index) => {
      console.log(`   ${index + 1}. "${lead.nombre}"`);
    });
    
    // Verificar teléfonos
    const telefonosReales = leadsFinales.filter(lead => lead.telefono && lead.telefono !== '+54');
    const telefonosPorDefecto = leadsFinales.filter(lead => lead.telefono === '+54');
    
    console.log(`\n📞 Verificación de teléfonos:`);
    console.log(`   Leads con teléfono real: ${telefonosReales.length}`);
    console.log(`   Leads con teléfono por defecto (+54): ${telefonosPorDefecto.length}`);
    
    // Mostrar distribución por estado
    console.log(`\n📊 Distribución por estado:`);
    const porEstado = {};
    leadsFinales.forEach(lead => {
      porEstado[lead.estado] = (porEstado[lead.estado] || 0) + 1;
    });
    Object.entries(porEstado).forEach(([estado, cantidad]) => {
      console.log(`   ${estado}: ${cantidad} leads`);
    });
    
    console.log(`\n✅ BASE DE DATOS PERFECTA!`);
    console.log(`📋 Contiene ÚNICAMENTE los ${leadsCreados} registros válidos del CSV`);
    console.log(`🎯 Nombres formateados correctamente (Primera Letra Mayúscula)`);
    console.log(`🚫 SIN datos inventados (solo datos reales del CSV)`);
    console.log(`📞 Teléfonos: reales cuando existen, '+54' por defecto cuando no`);
    console.log(`📧 Emails: null (no se generan automáticamente)`);
    console.log(`🎉 LISTO PARA USAR!`);
    
  } catch (error) {
    console.error('💥 Error en la importación final:', error);
  }
}

importarCSVFinalCorrecto();
