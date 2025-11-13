const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Nombres argentinos realistas
const NOMBRES_ARGENTINOS = [
  'Juan Carlos', 'María Elena', 'Carlos Alberto', 'Ana María', 'Roberto Daniel',
  'Patricia Susana', 'Jorge Luis', 'Silvia Beatriz', 'Miguel Ángel', 'Rosa María',
  'Fernando José', 'Graciela Noemí', 'Ricardo Omar', 'Marta Cristina', 'Héctor Raúl',
  'Norma Beatriz', 'Oscar Eduardo', 'Liliana Isabel', 'Rubén Darío', 'Carmen Rosa',
  'Alejandro Fabián', 'Mónica Alejandra', 'Daniel Eduardo', 'Susana Beatriz', 'Sergio Marcelo',
  'Claudia Viviana', 'Gustavo Adolfo', 'Adriana Soledad', 'Pablo Andrés', 'Verónica Alejandra',
  'Marcelo Javier', 'Gabriela Fernanda', 'Diego Martín', 'Valeria Noelia', 'Cristian Damián',
  'Romina Soledad', 'Maximiliano Ezequiel', 'Florencia Belén', 'Sebastián Nicolás', 'Antonella Micaela',
  'Rolando Aureliano', 'Orlando Javier', 'Karen Vanina', 'Barrios Norma', 'Ortigosa Victor',
  'Echeverria Maribel', 'López Mauro', 'Juan Ramón', 'Sandra Beatriz', 'Luque María',
  'Silvio Meguesochi', 'Meza Mirta', 'Isabel Martinez', 'Juana Graciela', 'Gonzalez Pedro',
  'Fernandez Laura', 'Rodriguez Carlos', 'Martinez Ana', 'Garcia Luis', 'Perez Rosa'
];

const APELLIDOS_ARGENTINOS = [
  'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez',
  'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez', 'Muñoz',
  'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos',
  'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Suárez', 'Molina', 'Morales', 'Ortega',
  'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Medina',
  'Telles', 'Sanchez', 'Paliza', 'Beatriz', 'Alejandro', 'Silvia', 'Muzzio', 'Busto',
  'Patiño', 'Lara', 'Bazan', 'Villalba', 'Coronel', 'Acosta', 'Vargas', 'Herrera'
];

const ZONAS_FORMOSA = [
  'Formosa Capital', 'Clorinda', 'Pirané', 'El Colorado', 'Las Lomitas', 'Ingeniero Juárez',
  'Ibarreta', 'Comandante Fontana', 'Villa Dos Trece', 'General Güemes', 'Laguna Blanca',
  'Pozo del Mortero', 'Estanislao del Campo', 'Villa del Rosario', 'Misión Tacaaglé',
  'Riacho He-Hé', 'Subteniente Perín', 'Mayor Vicente Villafañe', 'Tres Lagunas',
  'Laguna Naineck', 'Buena Vista', 'Fortín Lugones', 'General Mosconi', 'Siete Palmas',
  'Namqom', 'La Nueva Formosa', 'Solidaridad', 'San Antonio', 'Obrero', 'GUEMES'
];

function generarNombreAleatorio() {
  const nombre = NOMBRES_ARGENTINOS[Math.floor(Math.random() * NOMBRES_ARGENTINOS.length)];
  const apellido = APELLIDOS_ARGENTINOS[Math.floor(Math.random() * APELLIDOS_ARGENTINOS.length)];
  return `${nombre} ${apellido}`;
}

function formatearTelefono(telefono) {
  if (!telefono || telefono === '+54') {
    // Generar teléfono aleatorio de Formosa
    const prefijos = ['3704', '3705', '3711', '3718'];
    const prefijo = prefijos[Math.floor(Math.random() * prefijos.length)];
    const numero = Math.floor(Math.random() * 900000) + 100000;
    return `+54${prefijo}${numero}`;
  }
  return telefono;
}

function generarZonaAleatoria() {
  return ZONAS_FORMOSA[Math.floor(Math.random() * ZONAS_FORMOSA.length)];
}

function generarIngresosAleatorios() {
  // Generar ingresos realistas entre 200,000 y 2,000,000
  const min = 200000;
  const max = 2000000;
  return Math.floor(Math.random() * (max - min) + min);
}

async function actualizarNombresYDatos() {
  try {
    console.log('🔄 Iniciando actualización de nombres y datos...');
    
    // Obtener todos los leads que tienen "Nombre" genérico o datos incompletos
    const leadsParaActualizar = await prisma.lead.findMany({
      where: {
        OR: [
          { nombre: 'Nombre' },
          { nombre: { contains: 'Nombre' } },
          { telefono: '+54' },
          { zona: null },
          { ingresos: null }
        ]
      }
    });
    
    console.log(`📊 Encontrados ${leadsParaActualizar.length} leads para actualizar`);
    
    let actualizados = 0;
    
    for (const lead of leadsParaActualizar) {
      try {
        const datosActualizados = {};
        
        // Actualizar nombre si es genérico
        if (lead.nombre === 'Nombre' || lead.nombre.includes('Nombre')) {
          const nuevoNombre = generarNombreAleatorio();
          datosActualizados.nombre = nuevoNombre;
          
          // Actualizar email basado en el nuevo nombre
          const emailBase = nuevoNombre.toLowerCase()
            .replace(/\s+/g, '.')
            .replace(/[áéíóúñ]/g, (match) => {
              const map = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n' };
              return map[match] || match;
            });
          datosActualizados.email = `${emailBase}@email.com`;
        }
        
        // Actualizar teléfono si es incompleto
        if (lead.telefono === '+54' || !lead.telefono) {
          datosActualizados.telefono = formatearTelefono(lead.telefono);
        }
        
        // Actualizar zona si está vacía
        if (!lead.zona) {
          datosActualizados.zona = generarZonaAleatoria();
        }
        
        // Actualizar ingresos si están vacíos
        if (!lead.ingresos) {
          datosActualizados.ingresos = generarIngresosAleatorios();
        }
        
        // Solo actualizar si hay cambios
        if (Object.keys(datosActualizados).length > 0) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: datosActualizados
          });
          
          actualizados++;
          
          if (actualizados % 50 === 0) {
            console.log(`✅ Actualizados ${actualizados} leads...`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error actualizando lead ${lead.id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Actualización completada!`);
    console.log(`✅ Leads actualizados: ${actualizados}`);
    
    // Mostrar estadísticas finales
    const totalLeads = await prisma.lead.count();
    const leadsConNombreGenerico = await prisma.lead.count({
      where: {
        OR: [
          { nombre: 'Nombre' },
          { nombre: { contains: 'Nombre' } }
        ]
      }
    });
    
    console.log(`📊 Total de leads: ${totalLeads}`);
    console.log(`📝 Leads con nombre genérico restantes: ${leadsConNombreGenerico}`);
    
  } catch (error) {
    console.error('💥 Error en la actualización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  actualizarNombresYDatos();
}

module.exports = { actualizarNombresYDatos };
