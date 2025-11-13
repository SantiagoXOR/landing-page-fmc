const { PrismaClient } = require('@prisma/client');
const { importarLeadsDesdeHTML } = require('./import-leads-improved');

const prisma = new PrismaClient();

async function limpiarYReimportar() {
  try {
    console.log('🧹 Limpiando leads existentes...');
    
    // Eliminar todos los leads existentes
    const deleted = await prisma.lead.deleteMany({});
    console.log(`🗑️  Eliminados ${deleted.count} leads existentes`);
    
    console.log('📥 Iniciando importación mejorada...');
    
    // Importar con el script mejorado
    await importarLeadsDesdeHTML();
    
    console.log('✅ Proceso completado!');
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

limpiarYReimportar();
