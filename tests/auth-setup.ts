import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para autenticarse y guardar el estado de sesión
 * Ejecuta: npx playwright test tests/auth-setup.ts --project=chromium --headed
 */
async function setupAuth(config: FullConfig) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔐 Navegando a la aplicación...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('📝 Por favor, inicia sesión manualmente en el navegador...');
      console.log('⏳ Esperando autenticación (máximo 5 minutos)...');
      
      // Esperar hasta que la URL cambie (indicando que se autenticó)
      await page.waitForURL(/\/dashboard|\/chats|\/leads/, { 
        timeout: 5 * 60 * 1000 // 5 minutos
      });
      
      console.log('✅ Autenticación completada!');
    } else {
      console.log('✅ Ya estás autenticado!');
    }

    // Guardar el estado de autenticación
    const authDir = path.join(__dirname, '../playwright/.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await context.storageState({ path: path.join(authDir, 'user.json') });
    console.log('💾 Estado de autenticación guardado en playwright/.auth/user.json');

  } catch (error) {
    console.error('❌ Error durante la autenticación:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default setupAuth;


