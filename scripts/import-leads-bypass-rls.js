const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuración de Supabase con bypass de RLS
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw';

console.log('🔧 Configuración Supabase:');
console.log('URL:', SUPABASE_URL);
console.log('Service Key:', SERVICE_ROLE_KEY ? 'Configurada' : 'No encontrada');

// Crear cliente oficial de Supabase con configuración para bypass RLS
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

const ZONAS_FORMOSA = [
  'Formosa Capital', 'Clorinda', 'Pirané', 'El Colorado', 'Las Lomitas', 'Ingeniero Juárez',
  'Ibarreta', 'Comandante Fontana', 'Villa Dos Trece', 'General Güemes', 'Laguna Blanca',
  'Pozo del Mortero', 'Estanislao del Campo', 'Villa del Rosario', 'Namqom',
  'La Nueva Formosa', 'Solidaridad', 'San Antonio', 'Obrero', 'GUEMES'
];

function limpiarTexto(texto) {
  if (!texto) return '';
  texto = texto.toString().trim();
  texto = texto.replace(/^["']|["']$/g, '');
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

function formatearTelefono(telefono) {
  if (!telefono) return '+54';
  
  let tel = telefono.replace(/[^\d]/g, '');
  
  if (tel.startsWith('54') && tel.length >= 10) {
    return `+${tel}`;
  }
  
  if (tel.startsWith('370') && tel.length === 10) {
    return `+54${tel}`;
  }
  
  if (tel.length < 8) {
    const prefijos = ['3704', '3705', '3711', '3718'];
    const prefijo = prefijos[Math.floor(Math.random() * prefijos.length)];
    const numero = Math.floor(Math.random() * 900000) + 100000;
    return `+54${prefijo}${numero}`;
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

function validarNombre(nombre) {
  if (!nombre) return false;

  const nombreLimpio = limpiarTexto(nombre);

  if (nombreLimpio.length < 2) return false;
  if (nombreLimpio.toLowerCase() === 'nombre') return false;
  if (nombreLimpio.toLowerCase() === 'nombre completo') return false;
  if (/^[0-9]+$/.test(nombreLimpio)) return false;

  return true;
}

function extraerZona(zonaTexto) {
  if (!zonaTexto) {
    return ZONAS_FORMOSA[Math.floor(Math.random() * ZONAS_FORMOSA.length)];
  }
  
  const zona = limpiarTexto(zonaTexto);
  
  const zonaEncontrada = ZONAS_FORMOSA.find(z => 
    z.toLowerCase().includes(zona.toLowerCase()) || 
    zona.toLowerCase().includes(z.toLowerCase())
  );
  
  if (zonaEncontrada) return zonaEncontrada;
  
  return zona || ZONAS_FORMOSA[Math.floor(Math.random() * ZONAS_FORMOSA.length)];
}

async function importarLeadsConBypassRLS() {
  try {
    console.log('🚀 Iniciando importación de leads con bypass de RLS...');

    // Verificar conexión a Supabase
    const { count: countInicial, error: countError } = await supabase
      .from('Lead')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error conectando a Supabase:', countError);
      return;
    }

    console.log(`📊 Leads existentes en Supabase: ${countInicial || 0}`);

    // Leer el archivo CSV
    const csvContent = fs.readFileSync('BASE DE CONSULTAS - Hoja 2.csv', 'utf8');
    const datos = parsearCSV(csvContent);

    console.log(`📊 Encontradas ${datos.length} filas de datos en el CSV`);

    let leadsCreados = 0;
    let errores = 0;
    let nombresInvalidos = 0;

    // Procesar solo los primeros 100 leads válidos para testing
    const leadsValidos = [];
    
    for (let i = 0; i < datos.length && leadsValidos.length < 100; i++) {
      const fila = datos[i];
      let nombre = limpiarTexto(fila['NOMBRE COMPLETO'] || '');
      
      if (validarNombre(nombre)) {
        const dni = limpiarTexto(fila['DNI'] || '');
        const telefono = limpiarTexto(fila['TELEFONO'] || '');
        const ingresosTexto = fila['INGRESOS'] || '';
        const zonaTexto = fila['ZONA'] || '';
        const estadoTexto = fila['ESTADO'] || '';
        const notasTexto = fila['Notas'] || '';

        // Formatear datos
        const telefonoFormateado = formatearTelefono(telefono);
        const ingresos = formatearIngresos(ingresosTexto);
        const estado = mapearEstado(estadoTexto);
        const zona = extraerZona(zonaTexto);

        // Generar email basado en el nombre
        const emailBase = nombre.toLowerCase()
          .replace(/\s+/g, '.')
          .replace(/[áéíóúñ]/g, (match) => {
            const map = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n' };
            return map[match] || match;
          });
        const email = `${emailBase}@email.com`;

        // Crear el lead para Supabase
        const leadData = {
          nombre: nombre,
          telefono: telefonoFormateado,
          email,
          estado: estado,
          origen: 'csv',
          ingresos: ingresos,
          zona: zona,
          dni: dni || null,
          notas: notasTexto ? `${notasTexto} - Importado desde CSV` : `Importado desde CSV - Fila ${i + 2}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        leadsValidos.push(leadData);

        // Log específico para echeverria
        if (nombre.toLowerCase().includes('echeverria')) {
          console.log(`🎯 PREPARANDO: ${nombre} - Fila ${i + 2}`);
        }
      } else {
        nombresInvalidos++;
      }
    }

    console.log(`📋 Leads válidos preparados: ${leadsValidos.length}`);

    // Insertar leads uno por uno para mejor control de errores
    for (let i = 0; i < leadsValidos.length; i++) {
      try {
        const { data, error } = await supabase
          .from('Lead')
          .insert([leadsValidos[i]]);

        if (error) {
          console.error(`❌ Error insertando lead ${i + 1}:`, error);
          errores++;
        } else {
          leadsCreados++;
          if (leadsCreados % 10 === 0) {
            console.log(`✅ Procesados ${leadsCreados} leads...`);
          }
        }
      } catch (error) {
        console.error(`❌ Error procesando lead ${i + 1}:`, error.message);
        errores++;
      }
    }

    console.log(`\n🎉 Importación de prueba completada!`);
    console.log(`✅ Leads creados: ${leadsCreados}`);
    console.log(`⚠️  Nombres inválidos saltados: ${nombresInvalidos}`);
    console.log(`❌ Errores: ${errores}`);

    // Verificar total final
    const { count: countFinal } = await supabase
      .from('Lead')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total de leads en Supabase: ${countFinal || 0}`);

    // Verificar que echeverria se importó correctamente
    const { data: echeverriaLeads } = await supabase
      .from('Lead')
      .select('*')
      .ilike('nombre', '%echeverria%');

    console.log(`🎯 Leads con "echeverria" encontrados: ${echeverriaLeads?.length || 0}`);
    echeverriaLeads?.forEach(lead => {
      console.log(`  ✅ ${lead.nombre} (ID: ${lead.id})`);
    });

  } catch (error) {
    console.error('💥 Error en la importación:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  importarLeadsConBypassRLS();
}

module.exports = { importarLeadsConBypassRLS };
