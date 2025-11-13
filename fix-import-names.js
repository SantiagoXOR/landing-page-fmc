/**
 * Script corregido para importar nombres reales desde Hoja 2.html
 */

const fs = require('fs');
const { JSDOM } = require('jsdom');

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

function limpiarTexto(texto) {
  if (!texto) return '';
  
  // Remover HTML tags
  texto = texto.replace(/<[^>]*>/g, '');
  
  // Remover caracteres especiales pero mantener acentos y espacios
  texto = texto.replace(/[^\w\s\-\.@áéíóúñÁÉÍÓÚÑ]/g, '');
  texto = texto.trim();
  texto = texto.replace(/\s+/g, ' ');
  
  return texto;
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

async function limpiarYReimportarLeads() {
  try {
    console.log('🚀 Iniciando corrección de importación de leads...');
    
    // 1. Eliminar todos los leads existentes
    console.log('🗑️  Eliminando leads existentes...');
    await fetch(`${SUPABASE_URL}/rest/v1/Lead`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      }
    });
    
    console.log('✅ Leads eliminados');
    
    // 2. Leer el archivo HTML
    const htmlContent = fs.readFileSync('Hoja 2.html', 'utf8');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // 3. Encontrar todas las filas de la tabla
    const filas = document.querySelectorAll('tr');
    console.log(`📊 Encontradas ${filas.length} filas en total`);
    
    let leadsCreados = 0;
    let errores = 0;
    
    // 4. Procesar cada fila (empezar desde la fila 2 para saltar headers)
    for (let i = 2; i < filas.length; i++) {
      try {
        const fila = filas[i];
        const celdas = fila.querySelectorAll('td');
        
        if (celdas.length < 8) {
          console.log(`⚠️  Fila ${i} tiene pocas celdas, saltando...`);
          continue;
        }
        
        // Extraer datos de cada celda
        let nombre = limpiarTexto(celdas[0]?.textContent || '');
        const dni = limpiarTexto(celdas[1]?.textContent || '');
        const trabajo = limpiarTexto(celdas[2]?.textContent || '');
        const ingresosTexto = celdas[3]?.textContent || '';
        const telefono = limpiarTexto(celdas[5]?.textContent || '');
        const zonaTexto = celdas[6]?.textContent || '';
        const estadoTexto = celdas[8]?.textContent || '';
        
        // CORRECCIÓN: No reemplazar nombres válidos
        if (!nombre || nombre.length < 2) {
          console.log(`⚠️  Fila ${i}: Nombre vacío o muy corto, saltando...`);
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
          origen: 'excel',
          ingresos,
          zona: limpiarTexto(zonaTexto) || 'Formosa Capital',
          dni: dni || null,
          notas: `Importado desde Excel - Fila ${i}`
        };
        
        // Insertar en Supabase
        await supabaseRequest('/Lead', {
          method: 'POST',
          body: JSON.stringify(leadData)
        });
        
        leadsCreados++;
        
        if (leadsCreados % 50 === 0) {
          console.log(`✅ Procesados ${leadsCreados} leads...`);
        }
        
        // Log específico para echeverria
        if (nombre.toLowerCase().includes('echeverria')) {
          console.log(`🎯 ENCONTRADO: ${nombre} - Fila ${i}`);
        }
        
      } catch (error) {
        errores++;
        console.error(`❌ Error procesando fila ${i}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Corrección completada!`);
    console.log(`✅ Leads creados: ${leadsCreados}`);
    console.log(`❌ Errores: ${errores}`);
    
    // 5. Verificar que echeverria se importó correctamente
    console.log('\n🔍 Verificando importación de "echeverria"...');
    const leads = await supabaseRequest('/Lead?select=*');
    const echeverriaLeads = leads.filter(lead => 
      lead.nombre?.toLowerCase().includes('echeverria')
    );
    
    console.log(`🎯 Leads con "echeverria" encontrados: ${echeverriaLeads.length}`);
    if (echeverriaLeads.length > 0) {
      echeverriaLeads.forEach(lead => {
        console.log(`  ✅ ${lead.nombre} (ID: ${lead.id})`);
      });
    }
    
  } catch (error) {
    console.error('💥 Error en la corrección:', error);
  }
}

// Ejecutar
limpiarYReimportarLeads();
