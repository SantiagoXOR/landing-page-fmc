#!/usr/bin/env node

/**
 * Test simple para verificar autenticación
 */

const { chromium } = require('playwright');

async function testAuth() {
  console.log('🔍 Iniciando test simple de autenticación...');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
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
    console.log('📝 Llenando credenciales admin@phorencial.com...');
    await page.fill('input[data-testid="email-input"]', 'admin@phorencial.com');
    await page.fill('input[data-testid="password-input"]', 'admin123');
    
    // Tomar screenshot antes del click
    await page.screenshot({ path: 'auth-before-submit.png' });
    console.log('📸 Screenshot tomado: auth-before-submit.png');
    
    // Interceptar requests de red
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    });
    
    // Interceptar respuestas
    const responses = [];
    page.on('response', async response => {
      const responseData = {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      };

      // Capturar el cuerpo de la respuesta para el POST de signin
      if (response.url().includes('/auth/signin') && response.request().method() === 'POST') {
        try {
          const body = await response.text();
          responseData.body = body;
        } catch (e) {
          responseData.body = 'Error reading body';
        }
      }

      responses.push(responseData);
    });
    
    // Hacer click en el botón
    console.log('🖱️ Haciendo click en el botón de login...');
    await page.click('button[data-testid="login-button"]');
    
    // Esperar redirección al dashboard
    console.log('⏳ Esperando redirección al dashboard...');
    try {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('✅ Redirección detectada!');
    } catch (e) {
      console.log('⚠️ No se detectó redirección, esperando 3 segundos más...');
      await page.waitForTimeout(3000);
    }
    
    // Tomar screenshot después del click
    await page.screenshot({ path: 'auth-after-submit.png' });
    console.log('📸 Screenshot tomado: auth-after-submit.png');
    
    // Verificar URL actual
    const currentUrl = page.url();
    console.log(`📍 URL actual: ${currentUrl}`);
    
    // Mostrar requests interceptados
    console.log('\n📡 Requests interceptados:');
    requests.forEach((req, index) => {
      console.log(`  ${index + 1}. ${req.method} ${req.url}`);
    });
    
    // Mostrar respuestas interceptadas
    console.log('\n📨 Respuestas interceptadas:');
    responses.forEach((res, index) => {
      console.log(`  ${index + 1}. ${res.status} ${res.statusText} - ${res.url}`);
      if (res.body) {
        console.log(`      Body: ${res.body.substring(0, 200)}...`);
      }
    });
    
    // Verificar si hay errores en la consola
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    if (logs.length > 0) {
      console.log('\n📋 Logs de consola:');
      logs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log}`);
      });
    }
    
    // Verificar si llegamos al dashboard
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ ¡AUTENTICACIÓN EXITOSA! Redirigido al dashboard');
    } else if (currentUrl.includes('signin')) {
      console.log('❌ Autenticación falló - permanece en signin');
      
      // Verificar si hay mensajes de error
      const errorElements = await page.$$('.text-red-600, .text-red-500, [role="alert"]');
      if (errorElements.length > 0) {
        console.log('🚨 Mensajes de error encontrados:');
        for (const element of errorElements) {
          const text = await element.textContent();
          console.log(`   - ${text}`);
        }
      }
    } else {
      console.log(`⚠️ URL inesperada: ${currentUrl}`);
    }
    
  } catch (error) {
    console.log('❌ Error durante el test:', error.message);
  } finally {
    await browser.close();
  }
}

testAuth();
