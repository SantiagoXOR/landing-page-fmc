import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Iniciando setup global para tests del CRM Phorencial...');
  
  const { baseURL } = config.projects[0].use;
  
  // Verificar que el servidor esté corriendo
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    const targetURL = baseURL || 'http://localhost:3000';
    console.log(`📡 Verificando conectividad con ${targetURL}...`);
    await page.goto(targetURL, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Verificar que la página principal carga correctamente
    await page.waitForSelector('body', { timeout: 10000 });
    console.log('✅ Servidor respondiendo correctamente');

    // Verificar que la base de datos esté accesible
    // Intentar acceder a la página de login (más tolerante)
    try {
      await page.goto(`${targetURL}/auth/signin`, { timeout: 10000 });
      await page.waitForSelector('body', { timeout: 5000 });
      console.log('✅ Página de autenticación accesible');
    } catch (authError) {
      // Si falla, solo advertir pero no fallar el setup
      console.log('⚠️  Página de autenticación no disponible, continuando...');
    }
    
  } catch (error) {
    console.error('❌ Error en setup global:', error);
    throw new Error(`Setup falló: ${error}`);
  } finally {
    await browser.close();
  }
  
  console.log('✅ Setup global completado exitosamente');
}

export default globalSetup;
