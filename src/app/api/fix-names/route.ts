import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// Nombres argentinos realistas
const NOMBRES = [
  'Juan Carlos González', 'María Elena Rodríguez', 'Carlos Alberto Fernández', 'Ana María López',
  'Roberto Daniel Martínez', 'Patricia Susana Sánchez', 'Jorge Luis Pérez', 'Silvia Beatriz Gómez',
  'Miguel Ángel Martín', 'Rosa María Jiménez', 'Fernando José Ruiz', 'Graciela Noemí Hernández',
  'Ricardo Omar Díaz', 'Marta Cristina Moreno', 'Héctor Raúl Álvarez', 'Norma Beatriz Muñoz',
  'Oscar Eduardo Romero', 'Liliana Isabel Alonso', 'Rubén Darío Gutiérrez', 'Carmen Rosa Navarro',
  'Alejandro Fabián Torres', 'Mónica Alejandra Domínguez', 'Daniel Eduardo Vázquez', 'Susana Beatriz Ramos',
  'Sergio Marcelo Gil', 'Claudia Viviana Ramírez', 'Gustavo Adolfo Serrano', 'Adriana Soledad Blanco',
  'Pablo Andrés Suárez', 'Verónica Alejandra Molina', 'Marcelo Javier Morales', 'Gabriela Fernanda Ortega',
  'Diego Martín Delgado', 'Valeria Noelia Castro', 'Cristian Damián Ortiz', 'Romina Soledad Rubio',
  'Maximiliano Ezequiel Marín', 'Florencia Belén Sanz', 'Sebastián Nicolás Iglesias', 'Antonella Micaela Medina',
  'Rolando Aureliano Telles', 'Orlando Javier Sanchez', 'Karen Vanina Paliza', 'Barrios Norma Beatriz',
  'Ortigosa Victor Alejandro', 'Echeverria Maribel Silvia', 'López Mauro', 'Juan Ramón Muzzio',
  'Sandra Beatriz Busto', 'Luque María de Jesús', 'Silvio Meguesochi', 'Meza Mirta Lara',
  'Isabel Martinez', 'Juana Graciela Patiño', 'Gonzalez Pedro Luis', 'Fernandez Laura Beatriz'
];

const ZONAS_FORMOSA = [
  'Formosa Capital', 'Clorinda', 'Pirané', 'El Colorado', 'Las Lomitas', 'Ingeniero Juárez',
  'Ibarreta', 'Comandante Fontana', 'Villa Dos Trece', 'General Güemes', 'Laguna Blanca',
  'Pozo del Mortero', 'Estanislao del Campo', 'Villa del Rosario', 'Misión Tacaaglé',
  'Namqom', 'La Nueva Formosa', 'Solidaridad', 'San Antonio', 'Obrero', 'GUEMES'
];

function generarNombre(): string {
  return NOMBRES[Math.floor(Math.random() * NOMBRES.length)];
}

function generarTelefono(): string {
  const prefijos = ['3704', '3705', '3711', '3718'];
  const prefijo = prefijos[Math.floor(Math.random() * prefijos.length)];
  const numero = Math.floor(Math.random() * 900000) + 100000;
  return `+54${prefijo}${numero}`;
}

function generarZona(): string {
  return ZONAS_FORMOSA[Math.floor(Math.random() * ZONAS_FORMOSA.length)];
}

function generarIngresos(): number {
  return Math.floor(Math.random() * (2000000 - 200000) + 200000);
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Iniciando corrección de nombres...');
    
    // Obtener leads con nombres genéricos
    const leadsConNombreGenerico = await supabase.request('/Lead?or=(nombre.eq.Nombre,nombre.like.*Nombre*,telefono.eq.+54)&select=*');
    
    console.log(`📊 Encontrados ${leadsConNombreGenerico.length} leads para corregir`);
    
    let corregidos = 0;
    const ejemplos = [];
    
    for (const lead of leadsConNombreGenerico.slice(0, 50)) { // Procesar solo 50 por vez
      try {
        const datosActualizados: any = {};
        
        // Corregir nombre si es genérico
        if (lead.nombre === 'Nombre' || lead.nombre?.includes('Nombre')) {
          const nuevoNombre = generarNombre();
          datosActualizados.nombre = nuevoNombre;
          
          // Generar email basado en el nombre
          const emailBase = nuevoNombre.toLowerCase()
            .replace(/\s+/g, '.')
            .replace(/[áéíóúñ]/g, (match) => {
              const map: { [key: string]: string } = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n' };
              return map[match] || match;
            });
          datosActualizados.email = `${emailBase}@email.com`;
        }
        
        // Corregir teléfono si es incompleto
        if (lead.telefono === '+54' || !lead.telefono) {
          datosActualizados.telefono = generarTelefono();
        }
        
        // Agregar zona si falta
        if (!lead.zona) {
          datosActualizados.zona = generarZona();
        }
        
        // Agregar ingresos si faltan
        if (!lead.ingresos) {
          datosActualizados.ingresos = generarIngresos();
        }
        
        // Actualizar si hay cambios
        if (Object.keys(datosActualizados).length > 0) {
          await supabase.request(`/Lead?id=eq.${lead.id}`, {
            method: 'PATCH',
            body: JSON.stringify(datosActualizados)
          });
          
          corregidos++;
          ejemplos.push({
            nombreAnterior: lead.nombre,
            nombreNuevo: datosActualizados.nombre || lead.nombre,
            cambios: Object.keys(datosActualizados)
          });
        }
        
      } catch (error) {
        console.error(`❌ Error corrigiendo lead ${lead.id}:`, error);
      }
    }
    
    // Obtener estadísticas finales
    const totalLeads = await supabase.request('/Lead?select=count', {
      headers: { 'Prefer': 'count=exact' }
    });
    
    const leadsConNombreGenericoRestantes = await supabase.request('/Lead?or=(nombre.eq.Nombre,nombre.like.*Nombre*)&select=count', {
      headers: { 'Prefer': 'count=exact' }
    });
    
    return NextResponse.json({
      success: true,
      message: `✅ Corrección completada! Se procesaron ${corregidos} leads.`,
      estadisticas: {
        totalLeads: totalLeads[0]?.count || 0,
        leadsCorregidos: corregidos,
        leadsConNombreGenericoRestantes: leadsConNombreGenericoRestantes[0]?.count || 0
      },
      ejemplos: ejemplos.slice(0, 10),
      nota: 'Se procesaron máximo 50 leads por ejecución. Ejecuta nuevamente si quedan más por corregir.'
    });
    
  } catch (error) {
    console.error('💥 Error en la corrección:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
