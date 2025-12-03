/**
 * Script para hacer scraping de TODOS los contactos de ManyChat usando Playwright
 * 
 * Este script automatiza el navegador para:
 * 1. Iniciar sesión en ManyChat
 * 2. Navegar a la sección de contactos
 * 3. Extraer todos los contactos con sus etiquetas
 * 4. Sincronizarlos al CRM
 * 
 * Uso:
 * npm run manychat:scrape-contacts
 * 
 * Requiere:
 * - Credenciales de ManyChat en variables de entorno o archivo .env
 * - MANYCHAT_EMAIL y MANYCHAT_PASSWORD
 */

require('dotenv').config()
const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function success(message) {
  log(`✓ ${message}`, 'green')
}

function error(message) {
  log(`✗ ${message}`, 'red')
}

function info(message) {
  log(`ℹ ${message}`, 'blue')
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow')
}

function section(message) {
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(message, 'cyan')
  log('='.repeat(60), 'cyan')
}

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const MANYCHAT_EMAIL = process.env.MANYCHAT_EMAIL
const MANYCHAT_PASSWORD = process.env.MANYCHAT_PASSWORD

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  error('Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

if (!MANYCHAT_EMAIL || !MANYCHAT_PASSWORD) {
  error('Error: Variables de entorno MANYCHAT_EMAIL y MANYCHAT_PASSWORD no configuradas')
  info('Agrega estas variables a tu archivo .env:')
  info('MANYCHAT_EMAIL=tu_email@ejemplo.com')
  info('MANYCHAT_PASSWORD=tu_contraseña')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Sincronizar subscriber de ManyChat al CRM
 */
async function syncSubscriberToCRM(subscriberData) {
  try {
    const phone = subscriberData.phone || subscriberData.whatsapp_phone || ''
    
    if (!phone && !subscriberData.id) {
      return { success: false, reason: 'no_phone_or_id' }
    }

    const nombre = subscriberData.name || subscriberData.first_name || 'Contacto Manychat'

    // Buscar lead existente por manychatId o teléfono
    let query = supabase.from('Lead').select('*')
    
    if (subscriberData.id) {
      query = query.eq('manychatId', String(subscriberData.id))
    }
    
    if (phone) {
      if (subscriberData.id) {
        query = query.or(`manychatId.eq.${subscriberData.id},telefono.eq.${phone}`)
      } else {
        query = query.eq('telefono', phone)
      }
    }
    
    const { data: existingLeads } = await query.limit(1)

    const tags = subscriberData.tags || []
    const customFields = subscriberData.customFields || {}

    const leadData = {
      nombre,
      telefono: phone || `manychat_${subscriberData.id}`,
      email: subscriberData.email || null,
      manychatId: String(subscriberData.id),
      dni: customFields.dni || null,
      cuil: customFields.cuit || customFields.cuil || null,
      ingresos: customFields.ingresos ?? null,
      zona: customFields.zona || null,
      producto: customFields.producto || null,
      monto: customFields.monto ?? null,
      origen: subscriberData.instagram_id ? 'instagram' : (customFields.origen || 'whatsapp'),
      estado: customFields.estado || 'NUEVO',
      agencia: customFields.agencia || null,
      banco: customFields.banco || null,
      trabajo_actual: customFields.trabajo_actual || null,
      tags: JSON.stringify(tags),
      customFields: JSON.stringify(customFields),
      updatedAt: new Date().toISOString(),
    }

    if (existingLeads && existingLeads.length > 0) {
      // Actualizar lead existente
      const { data: updatedLead, error: updateError } = await supabase
        .from('Lead')
        .update(leadData)
        .eq('id', existingLeads[0].id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }
      return { success: true, action: 'updated', leadId: updatedLead.id }
    } else {
      // Crear nuevo lead
      const { data: newLead, error: createError } = await supabase
        .from('Lead')
        .insert({
          ...leadData,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }
      return { success: true, action: 'created', leadId: newLead.id }
    }
  } catch (err) {
    return { success: false, reason: 'error', error: err.message }
  }
}

/**
 * Función principal de scraping
 */
async function scrapeManyChatContacts() {
  section('Scraping de Contactos de ManyChat con Playwright')
  
  info('Iniciando scraping...')
  info(`Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`)
  
  const browser = await chromium.launch({ 
    headless: false, // Mostrar navegador para debugging
    slowMo: 500, // Ralentizar acciones para mejor observación
    timeout: 120000 // Timeout de 2 minutos para operaciones del navegador
  })
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    // Desactivar detección de automatización
    ignoreHTTPSErrors: true
  })
  
  // Configurar timeout por defecto para todas las operaciones
  context.setDefaultTimeout(60000)
  context.setDefaultNavigationTimeout(90000)
  
  const page = await context.newPage()
  
  const stats = {
    total: 0,
    created: 0,
    updated: 0,
    errors: 0,
    errorDetails: []
  }
  
  try {
    // Paso 1: Iniciar sesión en ManyChat
    section('Paso 1: Iniciando sesión en ManyChat')
    info('Navegando a ManyChat...')
    
    // Intentar navegar con diferentes estrategias
    let navigationSuccess = false
    const navigationOptions = [
      { waitUntil: 'domcontentloaded', timeout: 60000 },
      { waitUntil: 'load', timeout: 60000 },
      { waitUntil: 'networkidle', timeout: 90000 }
    ]
    
    for (const options of navigationOptions) {
      try {
        await page.goto('https://manychat.com/login', options)
        navigationSuccess = true
        success('Navegación exitosa')
        break
      } catch (err) {
        warn(`Timeout con waitUntil: ${options.waitUntil}, intentando siguiente opción...`)
      }
    }
    
    if (!navigationSuccess) {
      warn('Navegación con timeout, continuando de todas formas...')
      try {
        await page.goto('https://manychat.com/login', { timeout: 120000, waitUntil: 'commit' })
      } catch (err) {
        error('No se pudo navegar a ManyChat. Verifica tu conexión a internet.')
        throw err
      }
    }
    
    // Esperar un poco para que cargue la página
    await page.waitForTimeout(3000)
    
    // Paso 1.5: Detectar y manejar Cloudflare Challenge
    section('Paso 1.5: Verificando Cloudflare Challenge')
    info('Verificando si hay challenge de Cloudflare...')
    
    // Función para verificar si el challenge pasó
    const checkChallengePassed = async () => {
      try {
        const currentUrl = page.url()
        const currentContent = await page.content()
        const title = await page.title().catch(() => '')
        
        // Indicadores de que el challenge pasó
        const passedIndicators = [
          currentUrl.includes('manychat.com/login') && !currentUrl.includes('challenge'),
          currentContent.includes('login') && !currentContent.includes('cloudflare'),
          currentContent.includes('password') || currentContent.includes('contraseña'),
          title.toLowerCase().includes('login') || title.toLowerCase().includes('manychat'),
          await page.$('input[type="email"]').then(el => el !== null).catch(() => false),
          await page.$('input[type="password"]').then(el => el !== null).catch(() => false)
        ]
        
        return passedIndicators.some(indicator => indicator === true)
      } catch (e) {
        return false
      }
    }
    
    const cloudflareIndicators = [
      'text=Verifique que usted es un ser humano',
      'text=Verify that you are a human',
      'text=CLOUDFLARE',
      '[data-ray]', // Atributo común de Cloudflare
      '.cf-browser-verification',
      '#challenge-form',
      'iframe[src*="challenges.cloudflare"]'
    ]
    
    let cloudflareDetected = false
    for (const indicator of cloudflareIndicators) {
      try {
        const element = await page.$(indicator)
        if (element) {
          cloudflareDetected = true
          warn(`Cloudflare challenge detectado: ${indicator}`)
          break
        }
      } catch (e) {
        // Continuar verificando
      }
    }
    
    // Verificar también por URL o contenido de la página
    const pageContent = await page.content()
    const pageUrl = page.url()
    
    if (pageContent.includes('cloudflare') || pageContent.includes('challenge') || 
        pageUrl.includes('challenge') || pageContent.includes('Verifique que usted es un ser humano')) {
      cloudflareDetected = true
      warn('Cloudflare challenge detectado por contenido de la página')
    }
    
    if (cloudflareDetected) {
      info('Cloudflare challenge detectado')
      info('Estrategia: Esperar a que se resuelva automáticamente o completar manualmente')
      
      // Tomar screenshot inicial
      await page.screenshot({ path: 'manychat-cloudflare-initial.png', fullPage: true })
      info('Screenshot inicial guardado: manychat-cloudflare-initial.png')
      
      // Esperar a que Cloudflare procese (a veces se resuelve solo)
      info('Esperando 5 segundos para que Cloudflare procese automáticamente...')
      await page.waitForTimeout(5000)
      
      // Verificar si ya pasó
      let challengePassed = await checkChallengePassed()
      
      if (!challengePassed) {
        info('Challenge aún presente. Intentando interacción automática...')
        
        // Intentar hacer click en el checkbox de verificación
        const checkboxSelectors = [
          'input[type="checkbox"]',
          '.cf-browser-verification input',
          '#challenge-form input[type="checkbox"]',
          'label:has-text("Verifica que eres un ser humano")',
          'label:has-text("Verify that you are a human")',
          '[role="checkbox"]',
          '.cb-lb'
        ]
        
        let checkboxClicked = false
        for (const selector of checkboxSelectors) {
          try {
            const checkbox = await page.$(selector)
            if (checkbox) {
              const isVisible = await checkbox.isVisible().catch(() => false)
              if (isVisible) {
                // Hacer scroll hasta el elemento
                await checkbox.scrollIntoViewIfNeeded()
                await page.waitForTimeout(500)
                
                // Hacer click
                await checkbox.click({ delay: 300 })
                checkboxClicked = true
                success(`Checkbox clickeado usando: ${selector}`)
                
                // Esperar después del click
                await page.waitForTimeout(3000)
                
                // Verificar si pasó después del click
                challengePassed = await checkChallengePassed()
                if (challengePassed) {
                  success('Challenge resuelto después del click automático')
                  break
                }
              }
            }
          } catch (e) {
            // Continuar con el siguiente selector
          }
        }
        
        if (!challengePassed) {
          // Esperar más tiempo para que Cloudflare procese (máximo 2 minutos)
          info('Esperando a que Cloudflare complete la verificación...')
          info('Esto puede tomar hasta 2 minutos. El navegador está visible para que puedas interactuar si es necesario.')
          
          const maxWaitTime = 120000 // 2 minutos
          const checkInterval = 3000 // Verificar cada 3 segundos
          const startTime = Date.now()
          
          while (Date.now() - startTime < maxWaitTime) {
            await page.waitForTimeout(checkInterval)
            
            // Verificar si el challenge pasó
            challengePassed = await checkChallengePassed()
            
            if (challengePassed) {
              success('Cloudflare challenge resuelto exitosamente')
              break
            }
            
            // Mostrar progreso cada 15 segundos
            const elapsed = Math.floor((Date.now() - startTime) / 1000)
            if (elapsed % 15 === 0) {
              info(`Esperando verificación de Cloudflare... ${elapsed}s/${maxWaitTime / 1000}s`)
              info('Si el challenge sigue apareciendo, puedes completarlo manualmente en el navegador')
            }
          }
        }
      } else {
        success('Cloudflare challenge ya resuelto automáticamente')
      }
      
      // Verificar una última vez
      if (!challengePassed) {
        challengePassed = await checkChallengePassed()
      }
      
      if (!challengePassed) {
        warn('Cloudflare challenge aún presente después de 2 minutos')
        warn('')
        warn('OPCIONES:')
        warn('1. Completa el challenge manualmente en el navegador que se abrió')
        warn('2. Espera a que Cloudflare lo resuelva automáticamente')
        warn('3. Presiona Enter cuando veas la página de login de ManyChat')
        warn('')
        
        // Tomar screenshot
        await page.screenshot({ path: 'manychat-cloudflare-challenge.png', fullPage: true })
        warn('Screenshot guardado: manychat-cloudflare-challenge.png')
        
        // Esperar input del usuario (pero también seguir verificando)
        info('Esperando interacción manual o resolución automática...')
        
        const waitForManual = async () => {
          return new Promise((resolve) => {
            // Verificar periódicamente si pasó
            const checkInterval = setInterval(async () => {
              const passed = await checkChallengePassed()
              if (passed) {
                clearInterval(checkInterval)
                resolve(true)
              }
            }, 2000)
            
            // También escuchar Enter del usuario
            process.stdin.once('data', () => {
              clearInterval(checkInterval)
              resolve(true)
            })
            
            // Timeout de 5 minutos máximo
            setTimeout(() => {
              clearInterval(checkInterval)
              resolve(false)
            }, 300000)
          })
        }
        
        const manualResult = await waitForManual()
        
        if (manualResult) {
          success('Continuando después de interacción manual...')
          await page.waitForTimeout(2000) // Esperar un poco más para que cargue
        } else {
          error('Timeout esperando resolución del challenge')
          throw new Error('Cloudflare challenge no se resolvió en el tiempo esperado')
        }
      }
    } else {
      success('No se detectó challenge de Cloudflare')
    }
    
    // Verificar una última vez que estamos en la página de login
    await page.waitForTimeout(2000)
    const finalCheck = await checkChallengePassed()
    if (!finalCheck) {
      warn('Advertencia: Puede que aún estemos en el challenge de Cloudflare')
      warn('Continuando de todas formas...')
    }
    
    // Tomar screenshot después del challenge
    await page.screenshot({ path: 'manychat-after-challenge.png', fullPage: true })
    info('Screenshot después del challenge guardado: manychat-after-challenge.png')
    
    // Esperar y llenar formulario de login
    info('Esperando formulario de login...')
    await page.waitForTimeout(3000) // Esperar a que cargue el JavaScript
    
    // Tomar screenshot para debugging
    await page.screenshot({ path: 'manychat-before-login.png', fullPage: true })
    info('Screenshot guardado: manychat-before-login.png')
    
    // Intentar encontrar el formulario con múltiples estrategias
    const loginSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="correo" i]',
      'input[type="text"]',
      'form input',
      '[data-testid*="email" i]',
      '[class*="email" i] input',
      'input[autocomplete="email"]'
    ]
    
    let formFound = false
    for (const selector of loginSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000, state: 'visible' })
        formFound = true
        info(`Formulario encontrado usando selector: ${selector}`)
        break
      } catch (e) {
        // Continuar con el siguiente selector
      }
    }
    
    if (!formFound) {
      warn('No se encontró el formulario automáticamente.')
      warn('Esto puede ser porque Cloudflare aún está procesando o ManyChat cambió su estructura.')
      warn('')
      warn('OPCIONES:')
      warn('1. Espera a que Cloudflare termine de procesar (puede tomar varios minutos)')
      warn('2. Completa el challenge manualmente en el navegador')
      warn('3. Presiona Enter cuando veas la página de login de ManyChat')
      warn('')
      
      try {
        await page.screenshot({ path: 'manychat-no-form.png', fullPage: true })
        warn('Screenshot guardado: manychat-no-form.png')
      } catch (e) {
        warn('No se pudo tomar screenshot (navegador puede estar cerrado)')
      }
      
      warn('Esperando interacción manual o resolución automática...')
      warn('Presiona Enter cuando veas el formulario de login...')
      
      // Esperar input del usuario o verificación automática
      const waitForForm = async () => {
        return new Promise((resolve) => {
          // Verificar periódicamente si apareció el formulario
          const checkInterval = setInterval(async () => {
            try {
              const emailField = await page.$('input[type="email"]').catch(() => null)
              const passwordField = await page.$('input[type="password"]').catch(() => null)
              if (emailField || passwordField) {
                clearInterval(checkInterval)
                resolve(true)
              }
            } catch (e) {
              // Navegador cerrado o error
            }
          }, 2000)
          
          // Escuchar Enter del usuario
          process.stdin.once('data', () => {
            clearInterval(checkInterval)
            resolve(true)
          })
          
          // Timeout de 5 minutos máximo
          setTimeout(() => {
            clearInterval(checkInterval)
            resolve(false)
          }, 300000)
        })
      }
      
      const formResult = await waitForForm()
      if (formResult) {
        success('Formulario detectado o usuario confirmó. Continuando...')
        await page.waitForTimeout(2000)
      } else {
        error('Timeout esperando formulario de login')
        throw new Error('No se pudo encontrar el formulario de login')
      }
    }
    
    // Intentar diferentes selectores para el email
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="correo" i]',
      'input[autocomplete="email"]',
      'input[type="text"]:first-of-type',
      'form input:first-of-type',
      '[data-testid*="email" i]',
      '[class*="email" i] input'
    ]
    
    let emailFilled = false
    for (const selector of emailSelectors) {
      try {
        const emailInput = await page.$(selector)
        if (emailInput) {
          const isVisible = await emailInput.isVisible()
          if (isVisible) {
            await emailInput.click({ delay: 100 })
            await emailInput.fill(MANYCHAT_EMAIL, { delay: 50 })
            emailFilled = true
            success(`Email ingresado usando selector: ${selector}`)
            break
          }
        }
      } catch (e) {
        // Continuar con el siguiente selector
      }
    }
    
    if (!emailFilled) {
      // Intentar escribir directamente en el body y luego buscar
      await page.keyboard.type(MANYCHAT_EMAIL, { delay: 100 })
      warn('Intentando escribir email directamente con teclado...')
      await page.waitForTimeout(1000)
      
      // Verificar si se escribió algo
      const pageContent = await page.content()
      if (pageContent.includes(MANYCHAT_EMAIL)) {
        emailFilled = true
        success('Email escrito usando teclado')
      } else {
        // Tomar screenshot para debugging
        await page.screenshot({ path: 'manychat-login-form.png', fullPage: true })
        warn('No se pudo encontrar el campo de email. Screenshot guardado: manychat-login-form.png')
        warn('El script esperará que ingreses el email manualmente...')
        warn('Presiona Enter cuando hayas ingresado el email y contraseña...')
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve())
        })
        emailFilled = true // Asumir que se ingresó manualmente
      }
    }
    
    // Esperar y llenar contraseña
    await page.waitForTimeout(1000)
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]'
    ]
    
    let passwordFilled = false
    for (const selector of passwordSelectors) {
      try {
        const passwordInput = await page.$(selector)
        if (passwordInput) {
          await passwordInput.fill(MANYCHAT_PASSWORD)
          passwordFilled = true
          success(`Contraseña ingresada usando selector: ${selector}`)
          break
        }
      } catch (e) {
        // Continuar con el siguiente selector
      }
    }
    
    // Hacer click en botón de login
    await page.waitForTimeout(1000)
    const loginButtonSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Iniciar sesión")',
      'button:has-text("Login")',
      'button.login',
      '[data-testid="login-button"]'
    ]
    
    let loginClicked = false
    for (const selector of loginButtonSelectors) {
      try {
        const loginButton = await page.$(selector)
        if (loginButton) {
          await loginButton.click()
          loginClicked = true
          success(`Click en botón de login usando selector: ${selector}`)
          break
        }
      } catch (e) {
        // Continuar con el siguiente selector
      }
    }
    
    if (!loginClicked) {
      // Intentar presionar Enter
      await page.keyboard.press('Enter')
      warn('Intentando login con Enter...')
    }
    
    // Esperar a que cargue el dashboard
    info('Esperando dashboard de ManyChat...')
    await page.waitForTimeout(5000)
    
    // Verificar si estamos logueados
    const currentUrl = page.url()
    if (currentUrl.includes('login')) {
      // Tomar screenshot para debugging
      await page.screenshot({ path: 'manychat-login-error.png', fullPage: true })
      error('No se pudo iniciar sesión. Screenshot guardado: manychat-login-error.png')
      error('Por favor, verifica las credenciales o inicia sesión manualmente')
      warn('El script continuará esperando que inicies sesión manualmente...')
      warn('Presiona Enter cuando hayas iniciado sesión...')
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve())
      })
    } else {
      success('Sesión iniciada exitosamente')
    }
    
    // Paso 2: Navegar a la sección de contactos
    section('Paso 2: Navegando a la sección de contactos')
    info('Buscando enlace de contactos...')
    
    // Intentar diferentes formas de navegar a contactos
    const contactsLinks = [
      'a[href*="contacts"]',
      'a:has-text("Contacts")',
      'a:has-text("Contactos")',
      '[data-testid="contacts"]',
      'nav a:has-text("Contacts")',
      'nav a:has-text("Contactos")'
    ]
    
    let contactsNavigated = false
    for (const selector of contactsLinks) {
      try {
        const contactsLink = await page.$(selector)
        if (contactsLink) {
          await contactsLink.click()
          contactsNavigated = true
          success(`Navegando a contactos usando selector: ${selector}`)
          break
        }
      } catch (e) {
        // Continuar con el siguiente selector
      }
    }
    
    if (!contactsNavigated) {
      // Intentar navegar directamente
      await page.goto('https://manychat.com/contacts', { waitUntil: 'networkidle' })
      info('Navegando directamente a /contacts')
    }
    
    await page.waitForTimeout(3000)
    
    // Paso 3: Extraer contactos
    section('Paso 3: Extrayendo contactos')
    info('Esperando que carguen los contactos...')
    
    // Intentar diferentes estrategias para extraer contactos
    // Estrategia 1: Buscar elementos de tabla o lista de contactos
    const contactSelectors = [
      'table tbody tr',
      '[data-testid="contact"]',
      '.contact-item',
      '.contact-row',
      '[class*="contact"]',
      'div[role="row"]'
    ]
    
    let contacts = []
    let contactsFound = false
    
    for (const selector of contactSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 })
        const contactElements = await page.$$(selector)
        
        if (contactElements.length > 0) {
          info(`Encontrados ${contactElements.length} contactos usando selector: ${selector}`)
          
          // Extraer datos de cada contacto
          for (let i = 0; i < contactElements.length; i++) {
            try {
              const contactData = await contactElements[i].evaluate((el) => {
                // Intentar extraer información del elemento
                const text = el.innerText
                const links = Array.from(el.querySelectorAll('a')).map(a => a.href)
                const inputs = Array.from(el.querySelectorAll('input')).map(i => i.value)
                
                return {
                  text,
                  links,
                  inputs
                }
              })
              
              contacts.push(contactData)
            } catch (e) {
              warn(`Error extrayendo contacto ${i}: ${e.message}`)
            }
          }
          
          contactsFound = true
          break
        }
      } catch (e) {
        // Continuar con el siguiente selector
      }
    }
    
    if (!contactsFound) {
      // Estrategia alternativa: Interceptar llamadas API
      info('No se encontraron contactos en el DOM. Intentando interceptar llamadas API...')
      
      const apiContacts = []
      
      page.on('response', async (response) => {
        const url = response.url()
        if (url.includes('subscriber') || url.includes('contact') || url.includes('api')) {
          try {
            const data = await response.json()
            if (data && (data.data || data.subscribers || data.contacts)) {
              apiContacts.push(data)
            }
          } catch (e) {
            // No es JSON o no se puede parsear
          }
        }
      })
      
      // Esperar un poco para capturar respuestas API
      await page.waitForTimeout(5000)
      
      if (apiContacts.length > 0) {
        info(`Encontrados datos de API: ${apiContacts.length} respuestas`)
        contacts = apiContacts
        contactsFound = true
      }
    }
    
    if (!contactsFound) {
      // Tomar screenshot para debugging
      await page.screenshot({ path: 'manychat-contacts-page.png', fullPage: true })
      warn('No se pudieron extraer contactos automáticamente')
      warn('Screenshot guardado: manychat-contacts-page.png')
      warn('Por favor, revisa el screenshot y ajusta los selectores si es necesario')
      
      // Ofrecer exportar manualmente
      info('\nAlternativa: Puedes exportar manualmente desde ManyChat:')
      info('1. Ve a Contacts en ManyChat')
      info('2. Selecciona todos los contactos')
      info('3. Exporta como CSV')
      info('4. Usa el script: npm run manychat:sync-by-ids')
    }
    
    // Paso 4: Sincronizar contactos al CRM
    if (contacts.length > 0) {
      section('Paso 4: Sincronizando contactos al CRM')
      info(`Procesando ${contacts.length} contactos...`)
      
      stats.total = contacts.length
      
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i]
        
        try {
          // Transformar datos extraídos al formato esperado
          const subscriberData = {
            id: contact.id || contact.subscriber_id || `scraped_${i}`,
            name: contact.name || contact.first_name || contact.text?.split('\n')[0] || 'Contacto Manychat',
            phone: contact.phone || contact.whatsapp_phone || contact.telefono,
            email: contact.email,
            tags: contact.tags || [],
            customFields: contact.custom_fields || {}
          }
          
          const result = await syncSubscriberToCRM(subscriberData)
          
          if (result.success) {
            if (result.action === 'created') {
              stats.created++
              success(`[${i + 1}/${contacts.length}] ${subscriberData.name}: CREADO`)
            } else {
              stats.updated++
              success(`[${i + 1}/${contacts.length}] ${subscriberData.id}: ACTUALIZADO`)
            }
          } else {
            stats.errors++
            stats.errorDetails.push({ contact: subscriberData.id, error: result.error || result.reason })
            warn(`[${i + 1}/${contacts.length}] ${subscriberData.id}: Error - ${result.error || result.reason}`)
          }
        } catch (err) {
          stats.errors++
          stats.errorDetails.push({ contact: i, error: err.message })
          error(`[${i + 1}/${contacts.length}]: Error - ${err.message}`)
        }
        
        // Delay para rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
  } catch (err) {
    error(`Error durante el scraping: ${err.message}`)
    console.error(err)
    
    // Tomar screenshot del error
    await page.screenshot({ path: 'manychat-error.png', fullPage: true })
    error('Screenshot del error guardado: manychat-error.png')
  } finally {
    // Cerrar navegador
    await browser.close()
  }
  
  // Resumen final
  section('Resumen de Scraping')
  success(`Total contactos procesados: ${stats.total}`)
  success(`Creados en CRM: ${stats.created}`)
  success(`Actualizados en CRM: ${stats.updated}`)
  
  if (stats.errors > 0) {
    warn(`Errores: ${stats.errors}`)
  }
  
  log('\n' + '='.repeat(60), 'cyan')
  
  if (stats.created > 0 || stats.updated > 0) {
    success(`¡Scraping completado! ${stats.created} creados, ${stats.updated} actualizados`)
  } else {
    warn('No se crearon ni actualizaron contactos')
    info('Revisa los screenshots generados para debugging')
  }
}

// Ejecutar script
scrapeManyChatContacts()
  .then(() => {
    log('\nScript finalizado', 'cyan')
    process.exit(0)
  })
  .catch((err) => {
    error(`Error ejecutando script: ${err.message}`)
    console.error(err)
    process.exit(1)
  })

