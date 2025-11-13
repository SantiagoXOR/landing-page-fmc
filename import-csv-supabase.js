/**
 * Script para importar leads válidos desde CSV directamente a Supabase
 */

const fs = require('fs');

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

function limpiarTexto(texto) {
  if (!texto) return '';
  
  // Limpiar texto preservando nombres válidos
  texto = texto.toString().trim();
  
  // Remover comillas extra que pueden venir del CSV
  texto = texto.replace(/^["']|["']$/g, '');
  
  // Normalizar espacios múltiples pero preservar caracteres válidos
  texto = texto.replace(/\s+/g, ' ');
  
  return texto;
}

function parsearCSV(contenidoCSV) {
  const lineas = contenidoCSV.split('\n');
  const headers = lineas[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const datos = [];
  
  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue;
    
    // Parsear CSV respetando comillas
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
    campos.push(campoActual.trim()); // Agregar el último campo
    
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
  
  // Rechazar nombres claramente inválidos
  if (nombreLimpio.length < 2) return false;
  if (nombreLimpio.toLowerCase() === 'nombre') return false;
  if (nombreLimpio.toLowerCase() === 'nombre completo') return false;
  if (/^[0-9]+$/.test(nombreLimpio)) return false; // Solo números
  
  return true;
}

function formatearTelefono(telefono) {
  if (!telefono) return '+54';
  
  // Limpiar el teléfono
  let tel = telefono.replace(/[^\d]/g, '');
  
  // Si ya tiene código de país, mantenerlo
  if (tel.startsWith('54') && tel.length >= 10) {
    return `+${tel}`;
  }
  
  // Si es un número local de Formosa (370X), agregar código de país
  if (tel.startsWith('370') && tel.length === 10) {
    return `+54${tel}`;
  }
  
  return `+54${tel}`;
}

function formatearIngresos(ingresos) {
  if (!ingresos) return null;
  
  // Extraer números del texto
  const numeros = ingresos.replace(/[^\d,\.]/g, '');
  if (!numeros) return null;
  
  // Convertir a número
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

async function importarCSVASupabase() {
  try {
    console.log('🚀 Iniciando importación de CSV a Supabase...');
    
    // Leer el archivo CSV
    const csvContent = fs.readFileSync('BASE DE CONSULTAS - Hoja 2.csv', 'utf8');
    const datos = parsearCSV(csvContent);
    
    console.log(`📊 Total de filas parseadas: ${datos.length}`);
    
    let leadsCreados = 0;
    let errores = 0;
    let nombresInvalidos = 0;
    
    // Procesar cada fila de datos
    for (let i = 0; i < datos.length; i++) {
      try {
        const fila = datos[i];
        
        // Extraer datos usando los headers del CSV
        let nombre = limpiarTexto(fila['NOMBRE COMPLETO'] || '');
        const dni = limpiarTexto(fila['DNI'] || '');
        const trabajo = limpiarTexto(fila['TRABAJO'] || '');
        const ingresosTexto = fila['INGRESOS'] || '';
        const telefono = limpiarTexto(fila['TELEFONO'] || '');
        const zonaTexto = fila['ZONA'] || '';
        const estadoTexto = fila['ESTADO'] || '';
        const notasTexto = fila['Notas'] || '';
        
        // Validar nombre - CORREGIDO: No reemplazar nombres válidos
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
        await supabaseRequest('/Lead', {
          method: 'POST',
          body: JSON.stringify(leadData)
        });
        
        leadsCreados++;
        
        if (leadsCreados % 25 === 0) {
          console.log(`✅ Procesados ${leadsCreados} leads...`);
        }
        
        // Log específico para echeverria
        if (nombre.toLowerCase().includes('echeverria')) {
          console.log(`🎯 IMPORTADO: ${nombre} - Fila ${i + 2}`);
        }
        
      } catch (error) {
        errores++;
        console.error(`❌ Error procesando fila ${i + 2}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Importación desde CSV completada!`);
    console.log(`✅ Leads creados: ${leadsCreados}`);
    console.log(`⚠️  Nombres inválidos saltados: ${nombresInvalidos}`);
    console.log(`❌ Errores: ${errores}`);
    
    // Verificar que echeverria se importó correctamente
    console.log('\n🔍 Verificando importación de "echeverria"...');
    const leads = await supabaseRequest('/Lead?select=*');
    const echeverriaLeads = leads.filter(lead => 
      lead.nombre?.toLowerCase().includes('echeverria')
    );
    
    console.log(`🎯 Leads con "echeverria" encontrados: ${echeverriaLeads.length}`);
    echeverriaLeads.forEach(lead => {
      console.log(`  ✅ ${lead.nombre} (ID: ${lead.id})`);
    });
    
  } catch (error) {
    console.error('💥 Error en la importación:', error);
  }
}

importarCSVASupabase();
