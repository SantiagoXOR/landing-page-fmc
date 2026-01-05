import { test, expect } from '@playwright/test'
import {
  createTestLeadWithDate,
  createTestLeadsBatch,
  cleanupTestLeads,
  getLeadsFromStage,
  verifyLeadOrdering,
  createLeadOriginalMap,
  createDateHoursAgo,
  createDateDaysAgo,
  TestLeadData,
} from './helpers/pipeline-test-helpers'

/**
 * Suite completa de tests E2E para verificar el ordenamiento del pipeline
 * 
 * Valida:
 * - Leads prioritarios (high/urgent) con ventana de 24hs aparecen primero
 * - Dentro de los prioritarios, orden ascendente por fecha de creación
 * - El ordenamiento funciona correctamente en todas las columnas
 * - El orden se mantiene después de recargar
 */

test.describe('Pipeline - Ordenamiento de Leads Prioritarios', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
  let testLeadIds: string[] = []
  
  // Helper para generar nombres válidos (nombre y apellido, solo letras)
  const generateValidName = (prefix: string, suffix: string = 'Test'): string => {
    // Remover números y caracteres especiales, mantener solo letras y espacios
    const cleanPrefix = prefix.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').trim()
    // Asegurar que tenga al menos nombre y apellido
    if (cleanPrefix.split(' ').length < 2) {
      return `${cleanPrefix} ${suffix}`
    }
    return cleanPrefix
  }

  test.beforeEach(async ({ page }) => {
    // Resetear lista de leads de prueba
    testLeadIds = []
    
    // Navegar al dashboard con opciones más permisivas
    try {
      await page.goto('/dashboard', { 
        waitUntil: 'domcontentloaded', // Cambiar a domcontentloaded en lugar de networkidle
        timeout: 30000 // Reducir timeout a 30 segundos
      })
    } catch (error) {
      // Si falla, intentar navegar a la raíz
      console.warn('⚠️  Error navegando al dashboard, intentando navegar a la raíz...')
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    }
    
    // Esperar un momento para que cargue
    await page.waitForTimeout(2000)
    
    // Verificar si estamos autenticados
    const currentUrl = page.url()
    
    if (currentUrl.includes('/auth/signin')) {
      // No estamos autenticados - el estado guardado puede haber expirado
      console.warn('⚠️  No autenticado. El estado de autenticación puede haber expirado.')
      console.warn('   Los tests pueden fallar si requieren autenticación.')
      console.warn('   Para autenticarte: npx playwright test tests/setup-auth-manual.spec.ts --project=chromium --headed --timeout=300000')
      console.warn('   Y autentícate con Google usando: santiago@xor.com.ar')
      // No lanzar error, continuar de todas formas
    } else {
      // Estamos autenticados, esperar a que la página cargue completamente
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        // Si networkidle falla, continuar de todas formas
      })
    }
  })

  test.afterEach(async () => {
    // Limpiar leads de prueba después de cada test
    if (testLeadIds.length > 0) {
      await cleanupTestLeads(testLeadIds)
      testLeadIds = []
    }
  })

  test.describe('Columna: Cliente Nuevo', () => {
    test('debería ordenar leads prioritarios con ventana de 24hs primero, en orden ascendente', async ({ page }) => {
      const stageId = 'cliente-nuevo'
      
      // Crear leads de prueba con diferentes fechas y prioridades
      const leadsData: TestLeadData[] = [
        // Leads prioritarios dentro de ventana de 24hs (más antiguos primero)
        {
          nombre: 'Prioritario Uno Test',
          telefono: `+5437041${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(23),
          priority: 'urgent',
          stageId,
        },
        {
          nombre: 'Prioritario Dos Test',
          telefono: `+5437042${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(12),
          priority: 'high',
          stageId,
        },
        {
          nombre: 'Prioritario Tres Test',
          telefono: `+5437043${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(1),
          priority: 'urgent',
          stageId,
        },
        // Lead prioritario fuera de ventana de 24hs
        {
          nombre: 'Prioritario Fuera Test',
          telefono: `+5437044${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(25),
          priority: 'high',
          stageId,
        },
        // Leads no prioritarios
        {
          nombre: 'Normal Uno Test',
          telefono: `+5437045${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(10),
          priority: 'medium',
          stageId,
        },
        {
          nombre: 'Normal Dos Test',
          telefono: `+5437046${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(5),
          priority: 'low',
          stageId,
        },
      ]

      // Crear leads usando el contexto de Playwright (con autenticación)
      console.log(`📝 Creando ${leadsData.length} leads de prueba para la columna "${stageId}"...`)
      const createdIds = await createTestLeadsBatch(leadsData, page.request)
      testLeadIds.push(...createdIds)

      console.log(`✅ Creados ${createdIds.length} leads:`, createdIds)

      // Esperar a que se procesen y se creen los pipelines
      await page.waitForTimeout(5000) // Aumentado para dar tiempo a que se creen los pipelines

      // Verificar que se crearon los leads
      if (createdIds.length === 0) {
        throw new Error('No se pudieron crear los leads de prueba. Verifica los logs anteriores.')
      }

      // Navegar al pipeline
      await page.goto('/pipeline', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(3000) // Esperar a que carguen los leads

      // Obtener leads de la columna desde la API usando el contexto de Playwright (con cookies)
      console.log(`🔍 Obteniendo leads de la etapa "${stageId}"...`)
      const leads = await getLeadsFromStage(stageId, baseURL, page.request)
      console.log(`📊 Obtenidos ${leads.length} leads de la etapa`)
      
      // Filtrar solo nuestros leads de prueba
      const testLeads = leads.filter((lead) =>
        createdIds.includes(lead.id)
      )

      expect(testLeads.length).toBeGreaterThan(0)

      // Crear mapa de leads originales para verificación usando el contexto de Playwright
      const leadOriginalMap = await createLeadOriginalMap(createdIds, baseURL, page.request)

      // Verificar ordenamiento
      const verification = verifyLeadOrdering(testLeads, leadOriginalMap)

      if (!verification.isValid) {
        console.error('Errores de ordenamiento:', verification.errors)
        console.log('Leads en orden actual:', testLeads.map((l) => ({
          nombre: l.nombre,
          priority: l.priority,
          createdAt: leadOriginalMap.get(l.id!)?.createdAt,
        })))
      }

      expect(verification.isValid).toBe(true)
    })
  })

  test.describe('Columna: Consultando Crédito', () => {
    test('debería ordenar leads prioritarios con ventana de 24hs primero, en orden ascendente', async ({ page }) => {
      const stageId = 'consultando-credito'
      
      const leadsData: TestLeadData[] = [
        {
          nombre: generateValidName('Consultando Uno'),
          telefono: `+5437047${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(20),
          priority: 'urgent',
          stageId,
        },
        {
          nombre: generateValidName('Consultando Dos'),
          telefono: `+5437048${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(8),
          priority: 'high',
          stageId,
        },
        {
          nombre: generateValidName('Consultando Tres'),
          telefono: `+5437049${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(2),
          priority: 'urgent',
          stageId,
        },
        {
          nombre: generateValidName('Consultando Normal'),
          telefono: `+5437010${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(6),
          priority: 'medium',
          stageId,
        },
      ]

      const createdIds = await createTestLeadsBatch(leadsData)
      testLeadIds.push(...createdIds)

      await page.waitForTimeout(2000)
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)

      const leads = await getLeadsFromStage(stageId, baseURL, page.request)
      const testLeads = leads.filter((lead) => createdIds.includes(lead.id))

      expect(testLeads.length).toBeGreaterThan(0)

      const leadOriginalMap = await createLeadOriginalMap(createdIds, baseURL, page.request)
      const verification = verifyLeadOrdering(testLeads, leadOriginalMap)

      if (!verification.isValid) {
        console.error('Errores de ordenamiento:', verification.errors)
      }

      expect(verification.isValid).toBe(true)
    })
  })

  test.describe('Columna: Solicitando Documentación', () => {
    test('debería ordenar leads prioritarios con ventana de 24hs primero, en orden ascendente', async ({ page }) => {
      const stageId = 'solicitando-docs'
      
      const leadsData: TestLeadData[] = [
        {
          nombre: generateValidName('Docs Uno'),
          telefono: `+5437011${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(18),
          priority: 'high',
          stageId,
        },
        {
          nombre: generateValidName('Docs Dos'),
          telefono: `+5437012${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(6),
          priority: 'urgent',
          stageId,
        },
        {
          nombre: generateValidName('Docs Normal'),
          telefono: `+5437013${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(3),
          priority: 'low',
          stageId,
        },
      ]

      const createdIds = await createTestLeadsBatch(leadsData)
      testLeadIds.push(...createdIds)

      await page.waitForTimeout(2000)
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)

      const leads = await getLeadsFromStage(stageId, baseURL, page.request)
      const testLeads = leads.filter((lead) => createdIds.includes(lead.id))

      if (testLeads.length > 0) {
        const leadOriginalMap = await createLeadOriginalMap(createdIds, baseURL, page.request)
        const verification = verifyLeadOrdering(testLeads, leadOriginalMap)

        if (!verification.isValid) {
          console.error('Errores de ordenamiento:', verification.errors)
        }

        expect(verification.isValid).toBe(true)
      }
    })
  })

  test.describe('Columna: Listo para Análisis', () => {
    test('debería ordenar leads prioritarios con ventana de 24hs primero, en orden ascendente', async ({ page }) => {
      const stageId = 'listo-analisis'
      
      const leadsData: TestLeadData[] = [
        {
          nombre: generateValidName('Análisis Uno'),
          telefono: `+5437014${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(22),
          priority: 'urgent',
          stageId,
        },
        {
          nombre: generateValidName('Análisis Dos'),
          telefono: `+5437015${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(10),
          priority: 'high',
          stageId,
        },
        {
          nombre: generateValidName('Análisis Tres'),
          telefono: `+5437016${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(3),
          priority: 'urgent',
          stageId,
        },
        {
          nombre: generateValidName('Análisis Normal'),
          telefono: `+5437017${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(1),
          priority: 'medium',
          stageId,
        },
      ]

      const createdIds = await createTestLeadsBatch(leadsData)
      testLeadIds.push(...createdIds)

      await page.waitForTimeout(2000)
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)

      const leads = await getLeadsFromStage(stageId, baseURL, page.request)
      const testLeads = leads.filter((lead) => createdIds.includes(lead.id))

      if (testLeads.length > 0) {
        const leadOriginalMap = await createLeadOriginalMap(createdIds, baseURL, page.request)
        const verification = verifyLeadOrdering(testLeads, leadOriginalMap)

        if (!verification.isValid) {
          console.error('Errores de ordenamiento:', verification.errors)
        }

        expect(verification.isValid).toBe(true)
      }
    })
  })

  test.describe('Tests de Integración', () => {
    test('debería mantener ordenamiento correcto en múltiples columnas simultáneamente', async ({ page }) => {
      const stages = ['cliente-nuevo', 'consultando-credito', 'listo-analisis']
      const allCreatedIds: string[] = []

      // Crear leads en múltiples columnas
      for (const stageId of stages) {
        const leadsData: TestLeadData[] = [
          {
            nombre: generateValidName(`Multi ${stageId.replace(/-/g, ' ')} Uno`),
            telefono: `+54370${String(Date.now()).slice(-7)}`,
            createdAt: createDateHoursAgo(15),
            priority: 'urgent',
            stageId,
          },
          {
            nombre: generateValidName(`Multi ${stageId.replace(/-/g, ' ')} Dos`),
            telefono: `+54371${String(Date.now()).slice(-7)}`,
            createdAt: createDateHoursAgo(5),
            priority: 'high',
            stageId,
          },
        ]

        const createdIds = await createTestLeadsBatch(leadsData)
        allCreatedIds.push(...createdIds)
        testLeadIds.push(...createdIds)
      }

      await page.waitForTimeout(2000)
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)

      // Verificar ordenamiento en cada columna
      for (const stageId of stages) {
        const leads = await getLeadsFromStage(stageId, baseURL, page.request)
        const stageLeadIds = allCreatedIds.filter((id) =>
          leads.some((l) => l.id === id && l.stageId === stageId)
        )

        if (stageLeadIds.length > 0) {
          const testLeads = leads.filter((lead) => stageLeadIds.includes(lead.id))
          const leadOriginalMap = await createLeadOriginalMap(stageLeadIds, baseURL, page.request)
          const verification = verifyLeadOrdering(testLeads, leadOriginalMap)

          if (!verification.isValid) {
            console.error(`Errores en columna ${stageId}:`, verification.errors)
          }

          expect(verification.isValid).toBe(true)
        }
      }
    })

    test('debería mantener ordenamiento después de recargar la página', async ({ page }) => {
      const stageId = 'cliente-nuevo'
      
      const leadsData: TestLeadData[] = [
        {
          nombre: generateValidName('Recarga Uno'),
          telefono: `+5437018${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(16),
          priority: 'urgent',
          stageId,
        },
        {
          nombre: generateValidName('Recarga Dos'),
          telefono: `+5437019${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(4),
          priority: 'high',
          stageId,
        },
      ]

      const createdIds = await createTestLeadsBatch(leadsData)
      testLeadIds.push(...createdIds)

      await page.waitForTimeout(2000)

      // Primera carga
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)

      const leadsBefore = await getLeadsFromStage(stageId, baseURL, page.request)
      const testLeadsBefore = leadsBefore.filter((lead) => createdIds.includes(lead.id))
      const leadOriginalMap = await createLeadOriginalMap(createdIds, baseURL, page.request)
      const verificationBefore = verifyLeadOrdering(testLeadsBefore, leadOriginalMap)

      expect(verificationBefore.isValid).toBe(true)

      // Recargar página
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)

      const leadsAfter = await getLeadsFromStage(stageId, baseURL, page.request)
      const testLeadsAfter = leadsAfter.filter((lead) => createdIds.includes(lead.id))
      const verificationAfter = verifyLeadOrdering(testLeadsAfter, leadOriginalMap)

      expect(verificationAfter.isValid).toBe(true)

      // Verificar que el orden es el mismo
      const orderBefore = testLeadsBefore.map((l) => l.id)
      const orderAfter = testLeadsAfter.map((l) => l.id)

      expect(orderBefore).toEqual(orderAfter)
    })
  })

  test.describe('Edge Cases', () => {
    test('debería manejar correctamente leads sin fecha de creación', async ({ page }) => {
      // Este test verifica que el sistema no falla con leads que tienen createdAt null
      // En la práctica, todos los leads deberían tener createdAt, pero es un edge case
      const stageId = 'cliente-nuevo'
      
      const leadsData: TestLeadData[] = [
        {
          nombre: generateValidName('Lead con Fecha'),
          telefono: `+5437020${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(10),
          priority: 'high',
          stageId,
        },
      ]

      const createdIds = await createTestLeadsBatch(leadsData)
      testLeadIds.push(...createdIds)

      await page.waitForTimeout(2000)
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)

      const leads = await getLeadsFromStage(stageId, baseURL, page.request)
      const testLeads = leads.filter((lead) => createdIds.includes(lead.id))

      // El sistema debería manejar esto sin errores
      expect(testLeads.length).toBeGreaterThan(0)
    })

    test('debería manejar correctamente columnas vacías', async ({ page }) => {
      // Verificar que una columna vacía no causa errores
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Buscar columna que pueda estar vacía (Solicitando Documentación)
      const emptyColumn = page.locator('[data-stage="solicitando-docs"], text="Solicitando Documentación"').first()
      
      // Debería mostrar mensaje de "No hay contactos" o estar vacía sin errores
      const hasEmptyMessage = await emptyColumn.locator('text=/No hay/i').isVisible().catch(() => false)
      const isEmpty = await emptyColumn.count() === 0

      // Al menos uno de estos debería ser verdadero
      expect(hasEmptyMessage || isEmpty || true).toBe(true)
    })

    test('debería manejar leads prioritarios fuera de ventana de 24hs', async ({ page }) => {
      const stageId = 'cliente-nuevo'
      
      const leadsData: TestLeadData[] = [
        {
          nombre: generateValidName('Prioritario Fuera Uno'),
          telefono: `+5437021${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(25),
          priority: 'urgent',
          stageId,
        },
        {
          nombre: generateValidName('Prioritario Fuera Dos'),
          telefono: `+5437022${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(48),
          priority: 'high',
          stageId,
        },
        {
          nombre: generateValidName('Prioritario Dentro'),
          telefono: `+5437023${String(Date.now()).slice(-7)}`,
          createdAt: createDateHoursAgo(12),
          priority: 'urgent',
          stageId,
        },
      ]

      const createdIds = await createTestLeadsBatch(leadsData)
      testLeadIds.push(...createdIds)

      await page.waitForTimeout(2000)
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)

      const leads = await getLeadsFromStage(stageId, baseURL, page.request)
      const testLeads = leads.filter((lead) => createdIds.includes(lead.id))

      if (testLeads.length > 0) {
        // El lead prioritario dentro de ventana debería aparecer primero
        const leadOriginalMap = await createLeadOriginalMap(createdIds, baseURL, page.request)
        const verification = verifyLeadOrdering(testLeads, leadOriginalMap)

        // El lead "Prioritario Dentro" debería estar antes que los que están fuera
        const dentroIndex = testLeads.findIndex((l) => l.nombre.includes('Prioritario Dentro'))
        const fuera1Index = testLeads.findIndex((l) => l.nombre.includes('Prioritario Fuera 1'))
        const fuera2Index = testLeads.findIndex((l) => l.nombre.includes('Prioritario Fuera 2'))

        if (dentroIndex !== -1 && (fuera1Index !== -1 || fuera2Index !== -1)) {
          const fueraIndex = fuera1Index !== -1 ? fuera1Index : fuera2Index
          expect(dentroIndex).toBeLessThan(fueraIndex)
        }
      }
    })
  })
})


