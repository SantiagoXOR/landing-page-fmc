import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Iniciando teardown global...');
  
  // Limpiar archivos temporales de test si es necesario
  // Cerrar conexiones de base de datos si las hay
  // Limpiar datos de test si es necesario
  
  console.log('✅ Teardown global completado');
}

export default globalTeardown;
