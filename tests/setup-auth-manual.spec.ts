import { test } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Test para crear estado de autenticación manualmente
 * Ejecuta: npx playwright test tests/setup-auth-manual.spec.ts --project=chromium --headed --timeout=300000
 */
test('Setup Authentication', async ({ page, context }) => {
  test.setTimeout(600000) // 10 minutos para dar tiempo a la autenticación manual
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
  
  console.log('🔐 Navegando a la aplicación...')
  await page.goto(baseURL)
  await page.waitForTimeout(2000)

  const currentUrl = page.url()
  
  // Verificar si realmente está autenticado (tiene cookie de sesión)
  const cookies = await context.cookies()
  const hasSessionCookie = cookies.some(c => c.name === 'next-auth.session-token' || c.name.includes('session'))
  
  if (currentUrl.includes('/auth/signin') || !hasSessionCookie) {
    if (currentUrl.includes('/auth/signin')) {
      console.log('')
      console.log('═══════════════════════════════════════════════════════════')
      console.log('📝 INSTRUCCIONES DE AUTENTICACIÓN')
      console.log('═══════════════════════════════════════════════════════════')
      console.log('1. El script hará clic automáticamente en "Iniciar sesión con Google"')
      console.log('2. En la página de Google que se abra, inicia sesión con:')
      console.log('   📧 Email: santiago@xor.com.ar')
      console.log('   🔑 Contraseña: SavoirFaire19$')
      console.log('3. Acepta los permisos si se solicitan')
      console.log('4. Espera a que te redirija al dashboard')
      console.log('═══════════════════════════════════════════════════════════')
      console.log('')
      
      // Intentar hacer clic automáticamente en el botón de Google
      try {
        const googleButton = page.locator('button:has-text("Iniciar sesión con Google"), button[aria-label*="Google"]').first()
        await googleButton.waitFor({ state: 'visible', timeout: 10000 })
        console.log('🖱️  Haciendo clic automáticamente en "Iniciar sesión con Google"...')
        await googleButton.click()
        await page.waitForTimeout(3000) // Esperar a que se abra la ventana de Google
        console.log('✅ Clic realizado. Completa la autenticación en la ventana de Google.')
      } catch (error) {
        console.warn('⚠️  No se pudo hacer clic automático. Por favor, haz clic manualmente en "Iniciar sesión con Google"')
      }
    } else {
      console.log('⚠️  Parece que no hay cookie de sesión válida. Por favor, autentícate.')
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      
      // Intentar hacer clic automáticamente
      try {
        const googleButton = page.locator('button:has-text("Iniciar sesión con Google"), button[aria-label*="Google"]').first()
        await googleButton.waitFor({ state: 'visible', timeout: 10000 })
        console.log('🖱️  Haciendo clic automáticamente en "Iniciar sesión con Google"...')
        await googleButton.click()
        await page.waitForTimeout(3000)
      } catch (error) {
        console.warn('⚠️  No se pudo hacer clic automático.')
      }
    }
    
    console.log('⏳ Esperando autenticación (máximo 10 minutos)...')
    
    // Esperar hasta que la URL cambie (indicando que se autenticó)
    // Usar polling para verificar tanto URL como cookies
    let authenticated = false
    const startTime = Date.now()
    const maxWait = 10 * 60 * 1000 // 10 minutos
    
    while (!authenticated && (Date.now() - startTime) < maxWait) {
      await page.waitForTimeout(2000) // Esperar 2 segundos entre verificaciones
      
      const currentUrl = page.url()
      const currentCookies = await context.cookies()
      
      // Verificar específicamente la cookie de sesión de NextAuth
      const hasSessionToken = currentCookies.some(c => c.name === 'next-auth.session-token')
      
      // También verificar que no estamos en la página de signin
      const notOnSignin = !currentUrl.includes('/auth/signin')
      
      // Verificar que estamos en una página autenticada (dashboard, pipeline, etc.)
      const onAuthenticatedPage = currentUrl.includes('/dashboard') || 
                                  currentUrl.includes('/pipeline') || 
                                  currentUrl.includes('/leads') ||
                                  currentUrl.includes('/chats')
      
      if (hasSessionToken && (notOnSignin || onAuthenticatedPage)) {
        authenticated = true
        break
      }
      
      // Mostrar progreso cada 15 segundos
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      if (elapsed % 15 === 0 && elapsed > 0) {
        console.log(`⏳ Esperando autenticación... (${Math.floor(elapsed / 60)}m ${elapsed % 60}s)`)
        console.log(`   URL actual: ${currentUrl}`)
        console.log(`   Cookie de sesión: ${hasSessionToken ? '✅' : '❌'}`)
      }
    }
    
    if (!authenticated) {
      throw new Error('Timeout esperando autenticación. Por favor, completa el proceso de login con Google.')
    }
    
    // Verificar que ahora sí hay cookie de sesión
    const finalCookies = await context.cookies()
    const hasSessionToken = finalCookies.some(c => c.name === 'next-auth.session-token')
    
    if (!hasSessionToken) {
      console.error('❌ Error: No se detectó la cookie de sesión de NextAuth después de la autenticación.')
      console.error('   Por favor, verifica que completaste el proceso de login correctamente.')
      throw new Error('Cookie de sesión de NextAuth no encontrada. La autenticación no se completó correctamente.')
    }
    
    console.log('✅ Autenticación completada! Cookie de sesión detectada.')
  } else {
    console.log('✅ Ya estás autenticado!')
  }

  // Guardar el estado de autenticación
  const authDir = path.join(__dirname, '../playwright/.auth')
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  await context.storageState({ path: path.join(authDir, 'user.json') })
  console.log('💾 Estado de autenticación guardado en playwright/.auth/user.json')
})


