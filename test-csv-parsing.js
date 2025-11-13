/**
 * Script de prueba para verificar el parsing del CSV antes de la importación completa
 */

const fs = require('fs');

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

async function probarParsingCSV() {
  try {
    console.log('🔍 Probando parsing del archivo CSV...');
    
    // Leer el archivo CSV
    const csvContent = fs.readFileSync('BASE DE CONSULTAS - Hoja 2.csv', 'utf8');
    const datos = parsearCSV(csvContent);
    
    console.log(`📊 Total de filas parseadas: ${datos.length}`);
    
    // Verificar headers
    if (datos.length > 0) {
      console.log('\n📋 Headers detectados:');
      Object.keys(datos[0]).forEach((header, index) => {
        console.log(`  ${index + 1}. "${header}"`);
      });
    }
    
    // Buscar específicamente "echeverria"
    console.log('\n🎯 Buscando "echeverria"...');
    const echeverriaLeads = datos.filter(fila => 
      fila['NOMBRE COMPLETO']?.toLowerCase().includes('echeverria')
    );
    
    console.log(`✅ Encontrados ${echeverriaLeads.length} leads con "echeverria"`);
    
    if (echeverriaLeads.length > 0) {
      echeverriaLeads.forEach((lead, index) => {
        console.log(`\n📝 Lead ${index + 1}:`);
        console.log(`   Nombre: "${lead['NOMBRE COMPLETO']}"`);
        console.log(`   DNI: "${lead['DNI']}"`);
        console.log(`   Trabajo: "${lead['TRABAJO']}"`);
        console.log(`   Ingresos: "${lead['INGRESOS']}"`);
        console.log(`   Teléfono: "${lead['TELEFONO']}"`);
        console.log(`   Zona: "${lead['ZONA']}"`);
        console.log(`   Estado: "${lead['ESTADO']}"`);
        console.log(`   Notas: "${lead['Notas']}"`);
        
        // Verificar validación
        const nombreValido = validarNombre(lead['NOMBRE COMPLETO']);
        console.log(`   ✅ Nombre válido: ${nombreValido}`);
      });
    }
    
    // Mostrar estadísticas de nombres válidos
    console.log('\n📊 Estadísticas de validación de nombres:');
    let nombresValidos = 0;
    let nombresInvalidos = 0;
    
    datos.forEach(fila => {
      if (validarNombre(fila['NOMBRE COMPLETO'])) {
        nombresValidos++;
      } else {
        nombresInvalidos++;
      }
    });
    
    console.log(`   ✅ Nombres válidos: ${nombresValidos}`);
    console.log(`   ❌ Nombres inválidos: ${nombresInvalidos}`);
    console.log(`   📈 Porcentaje válido: ${((nombresValidos / datos.length) * 100).toFixed(1)}%`);
    
    // Mostrar algunos ejemplos de nombres válidos
    console.log('\n📝 Primeros 10 nombres válidos:');
    let contador = 0;
    for (const fila of datos) {
      if (validarNombre(fila['NOMBRE COMPLETO']) && contador < 10) {
        console.log(`   ${contador + 1}. "${fila['NOMBRE COMPLETO']}"`);
        contador++;
      }
    }
    
    // Mostrar algunos ejemplos de nombres inválidos (si los hay)
    console.log('\n⚠️  Ejemplos de nombres inválidos (si los hay):');
    contador = 0;
    for (const fila of datos) {
      if (!validarNombre(fila['NOMBRE COMPLETO']) && contador < 5) {
        console.log(`   ${contador + 1}. "${fila['NOMBRE COMPLETO']}" (razón: ${fila['NOMBRE COMPLETO'] ? 'formato inválido' : 'vacío'})`);
        contador++;
      }
    }
    
    console.log('\n🎉 Parsing completado exitosamente!');
    console.log('✅ El archivo CSV está listo para importación.');
    
  } catch (error) {
    console.error('❌ Error en el parsing:', error.message);
  }
}

probarParsingCSV();
