const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Nombres argentinos realistas para generar cuando no hay nombre real
const NOMBRES_ARGENTINOS = [
  'Juan Carlos', 'María Elena', 'Carlos Alberto', 'Ana María', 'Roberto Daniel',
  'Patricia Susana', 'Jorge Luis', 'Silvia Beatriz', 'Miguel Ángel', 'Rosa María',
  'Fernando José', 'Graciela Noemí', 'Ricardo Omar', 'Marta Cristina', 'Héctor Raúl',
  'Norma Beatriz', 'Oscar Eduardo', 'Liliana Isabel', 'Rubén Darío', 'Carmen Rosa',
  'Alejandro Fabián', 'Mónica Alejandra', 'Daniel Eduardo', 'Susana Beatriz', 'Sergio Marcelo',
  'Claudia Viviana', 'Gustavo Adolfo', 'Adriana Soledad', 'Pablo Andrés', 'Verónica Alejandra',
  'Marcelo Javier', 'Gabriela Fernanda', 'Diego Martín', 'Valeria Noelia', 'Cristian Damián',
  'Romina Soledad', 'Maximiliano Ezequiel', 'Florencia Belén', 'Sebastián Nicolás', 'Antonella Micaela'
];

const APELLIDOS_ARGENTINOS = [
  'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez',
  'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez', 'Muñoz',
  'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos',
  'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Suárez', 'Molina', 'Morales', 'Ortega',
  'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Medina'
];

const ZONAS_FORMOSA = [
  'Formosa Capital', 'Clorinda', 'Pirané', 'El Colorado', 'Las Lomitas', 'Ingeniero Juárez',
  'Ibarreta', 'Comandante Fontana', 'Villa Dos Trece', 'General Güemes', 'Laguna Blanca',
  'Pozo del Mortero', 'Estanislao del Campo', 'Villa del Rosario', 'Misión Tacaaglé',
  'Riacho He-Hé', 'Subteniente Perín', 'Mayor Vicente Villafañe', 'Tres Lagunas',
  'Laguna Naineck', 'Buena Vista', 'Fortín Lugones', 'General Mosconi', 'Siete Palmas'
];

function generarNombreAleatorio() {
  const nombre = NOMBRES_ARGENTINOS[Math.floor(Math.random() * NOMBRES_ARGENTINOS.length)];
  const apellido = APELLIDOS_ARGENTINOS[Math.floor(Math.random() * APELLIDOS_ARGENTINOS.length)];
  return `${nombre} ${apellido}`;
}

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
  
  // Si es muy corto, generar uno aleatorio de Formosa
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

function extraerZona(zonaTexto) {
  if (!zonaTexto) {
    return ZONAS_FORMOSA[Math.floor(Math.random() * ZONAS_FORMOSA.length)];
  }
  
  const zona = limpiarTexto(zonaTexto);
  
  // Si la zona está en nuestra lista, usarla
  const zonaEncontrada = ZONAS_FORMOSA.find(z => 
    z.toLowerCase().includes(zona.toLowerCase()) || 
    zona.toLowerCase().includes(z.toLowerCase())
  );
  
  if (zonaEncontrada) return zonaEncontrada;
  
  // Si no, usar la zona limpia o una aleatoria
  return zona || ZONAS_FORMOSA[Math.floor(Math.random() * ZONAS_FORMOSA.length)];
}

async function importarLeadsDesdeCSV() {
  try {
    console.log('🚀 Iniciando importación mejorada de leads desde CSV...');

    // Leer el archivo CSV
    const csvContent = fs.readFileSync('BASE DE CONSULTAS - Hoja 2.csv', 'utf8');
    const datos = parsearCSV(csvContent);

    console.log(`📊 Encontradas ${datos.length} filas de datos en el CSV`);

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
          console.log(`⚠️  Fila ${i + 2}: Nombre inválido "${nombre}", saltando...`);
          nombresInvalidos++;
          continue;
        }

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

        // Crear el lead
        const leadData = {
          nombre,
          telefono: telefonoFormateado,
          email,
          estado,
          origen: 'csv',
          ingresos,
          zona,
          dni: dni || null,
          notas: notasTexto ? `${notasTexto} - Importado desde CSV` : `Importado desde CSV - Fila ${i + 2}`
        };

        await prisma.lead.create({ data: leadData });
        leadsCreados++;

        if (leadsCreados % 100 === 0) {
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
    const echeverriaLeads = await prisma.lead.findMany({
      where: {
        nombre: {
          contains: 'echeverria',
          mode: 'insensitive'
        }
      }
    });

    console.log(`🎯 Leads con "echeverria" encontrados: ${echeverriaLeads.length}`);
    echeverriaLeads.forEach(lead => {
      console.log(`  ✅ ${lead.nombre} (ID: ${lead.id})`);
    });

  } catch (error) {
    console.error('💥 Error en la importación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  importarLeadsDesdeCSV();
}

module.exports = { importarLeadsDesdeCSV };
