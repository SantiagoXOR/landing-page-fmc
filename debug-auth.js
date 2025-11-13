#!/usr/bin/env node

/**
 * Script para debuggear el problema de autenticación
 */

const { chromium } = require('playwright');

async function debugAuth() {
  console.log('🔍 Iniciando debug de autenticación...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Ir a la página de login
    console.log('📍 Navegando a /auth/signin...');
    await page.goto('http://localhost:3000/auth/signin');
    
    // Esperar a que cargue el formulario
    console.log('⏳ Esperando formulario de login...');
    await page.waitForSelector('form[data-testid="login-form"]', { timeout: 10000 });
    
    // Llenar credenciales
    console.log('📝 Llenando credenciales...');
    await page.fill('input[data-testid="email-input"]', 'admin@phorencial.com');
    await page.fill('input[data-testid="password-input"]', 'admin123');
    
    // Tomar screenshot antes del click
    await page.screenshot({ path: 'debug-before-click.png' });
    console.log('📸 Screenshot tomado: debug-before-click.png');
    
    // Hacer click en el botón
    console.log('🖱️ Haciendo click en el botón de login...');
    await page.click('button[data-testid="login-button"]');
    
    // Esperar un poco para ver qué pasa
    console.log('⏳ Esperando respuesta...');
    await page.waitForTimeout(3000);
    
    // Tomar screenshot después del click
    await page.screenshot({ path: 'debug-after-click.png' });
    console.log('📸 Screenshot tomado: debug-after-click.png');
    
    // Verificar URL actual
    const currentUrl = page.url();
    console.log(`📍 URL actual: ${currentUrl}`);
    
    // Verificar si hay errores en la consola
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    // Verificar si el formulario tiene el event listener correcto
    const formHasSubmitHandler = await page.evaluate(() => {
      const form = document.querySelector('form[data-testid="login-form"]');
      return form && form.onsubmit !== null;
    });
    console.log(`📋 Formulario tiene handler de submit: ${formHasSubmitHandler}`);

    // Intentar enviar el formulario directamente
    console.log('🔄 Intentando enviar formulario directamente...');
    await page.evaluate(() => {
      const form = document.querySelector('form[data-testid="login-form"]');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    });

    await page.waitForTimeout(2000);

    // Esperar un poco más para ver si hay redirección
    try {
      await page.waitForURL('/dashboard', { timeout: 5000 });
      console.log('✅ Redirección exitosa al dashboard!');
    } catch (error) {
      console.log('❌ No hubo redirección al dashboard');
      console.log('📋 Logs de consola:', logs);
    }
    
    // Verificar si hay elementos de error
    const errorElements = await page.$$('.text-red-600, .text-red-500, [role="alert"]');
    if (errorElements.length > 0) {
      console.log('🚨 Elementos de error encontrados:');
      for (const element of errorElements) {
        const text = await element.textContent();
        console.log(`   - ${text}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error durante el debug:', error.message);
  } finally {
    await browser.close();
  }
}

debugAuth();
