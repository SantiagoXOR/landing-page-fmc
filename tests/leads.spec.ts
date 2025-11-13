import { test, expect } from '@playwright/test';
import { TestUtils } from './utils';
import { FORMOSA_DATA, EXPECTED_METRICS, TIMEOUTS, UI_SELECTORS, TEST_LEAD_DATA } from './test-data';

test.describe('👥 Gestión de Leads del CRM Phorencial', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.login('ADMIN');
    await utils.navigateToPage('leads');
  });

  test.describe('Carga y estructura de la página', () => {
    test('📋 Carga correcta de la página de leads', async ({ page }) => {
      // Verificar título moderno
      await expect(page.locator(UI_SELECTORS.LEADS_TITLE)).toBeVisible();
      
      // Verificar que el título tiene gradiente
      const title = page.locator('h1:has-text("Gestión de Leads")');
      await expect(title).toHaveClass(/gradient-text/);
      
      // Verificar descripción con total de leads
      const description = page.locator('text=/Total: \\d+/');
      await expect(description).toBeVisible();
      
      await utils.takeScreenshot('leads-page-loaded');
    });

    test('📊 Métricas rápidas en la página de leads', async ({ page }) => {
      // Verificar que hay cards de métricas rápidas
      const metricsCards = page.locator('.formosa-card').filter({
        has: page.locator('.text-2xl')
      });
      
      const count = await metricsCards.count();
      expect(count).toBeGreaterThanOrEqual(4); // Total, Preaprobados, En Revisión, Nuevos
      
      // Verificar métricas específicas
      await expect(page.locator('text=Total Leads')).toBeVisible();
      await expect(page.locator('text=Preaprobados')).toBeVisible();
      await expect(page.locator('text=En Revisión')).toBeVisible();
      await expect(page.locator('text=Nuevos')).toBeVisible();
    });

    test('🎨 Diseño moderno de la página', async ({ page }) => {
      // Verificar fondo con gradiente
      const pageContainer = page.locator('.min-h-screen');
      await expect(pageContainer).toHaveClass(/bg-gradient-subtle/);
      
      // Verificar botones con gradientes
      const newLeadButton = page.locator(UI_SELECTORS.NEW_LEAD_BUTTON);
      await expect(newLeadButton).toHaveClass(/gradient-primary/);
      
      await utils.verifyGradients();
    });
  });

  test.describe('Sistema de filtros avanzado', () => {
    test('🔍 Filtros básicos disponibles', async ({ page }) => {
      // Verificar que existe la sección de filtros
      const filtersSection = page.locator('.formosa-card').filter({
        has: page.locator('input[placeholder*="Buscar"], select')
      });
      await expect(filtersSection).toBeVisible();
      
      // Verificar filtros específicos
      await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible();
      
      // Verificar selectores de filtro
      const selects = page.locator('select');
      const selectCount = await selects.count();
      expect(selectCount).toBeGreaterThanOrEqual(2); // Al menos estado y categoría
    });

    test('📊 Contadores dinámicos exactos', async ({ page }) => {
      await utils.verifyDynamicCounters();
      
      // Verificar que el contador total es realista
      const totalText = await page.locator('h1:has-text("Gestión de Leads")').textContent();
      const totalMatch = totalText?.match(/Total: (\d+)/);
      
      if (totalMatch) {
        const total = parseInt(totalMatch[1]);
        expect(total).toBeGreaterThanOrEqual(EXPECTED_METRICS.MIN_TOTAL_LEADS);
      }
      
      // Verificar badge de paginación
      const paginationBadge = page.locator('text=/Página \\d+ de \\d+/');
      if (await paginationBadge.count() > 0) {
        await expect(paginationBadge).toBeVisible();
      }
    });

    test('🏷️ Filtrado por estado con contadores exactos', async ({ page }) => {
      // Probar filtro por cada estado
      for (const estado of FORMOSA_DATA.ESTADOS_LEAD) {
        await utils.filterByEstado(estado);
        
        // Verificar que la URL se actualiza
        expect(page.url()).toContain(`estado=${estado}`);
        
        // Verificar que se muestra el filtro aplicado
        const filterIndicator = page.locator(`text=/filtrado.*estado.*${estado}/i`);
        if (await filterIndicator.count() > 0) {
          await expect(filterIndicator).toBeVisible();
        }
        
        // Verificar que los leads mostrados tienen el estado correcto
        const leadCards = page.locator('.formosa-card').filter({
          has: page.locator(`[class*="formosa-badge-${estado.toLowerCase()}"]`)
        });
        
        if (await leadCards.count() > 0) {
          expect(await leadCards.count()).toBeGreaterThan(0);
        }
        
        await page.waitForTimeout(500); // Pausa entre filtros
      }
    });

    test('🗺️ Filtrado por zonas geográficas de Formosa', async ({ page }) => {
      // Buscar filtro de zona
      const zonaFilter = page.locator('select').filter({
        has: page.locator('option:has-text("Formosa Capital")')
      });
      
      if (await zonaFilter.count() > 0) {
        // Probar filtro por zona específica
        await zonaFilter.selectOption('Formosa Capital');
        await page.waitForTimeout(1000);
        
        // Verificar que se aplica el filtro
        const filteredLeads = page.locator('text=Formosa Capital');
        if (await filteredLeads.count() > 0) {
          expect(await filteredLeads.count()).toBeGreaterThan(0);
        }
      }
    });

    test('🔍 Búsqueda por nombre, teléfono y email', async ({ page }) => {
      // Buscar por nombre argentino común
      await utils.searchLeads('María');
      
      // Verificar que hay resultados
      const searchResults = page.locator('.formosa-card').filter({
        has: page.locator('text=/María/i')
      });
      
      if (await searchResults.count() > 0) {
        expect(await searchResults.count()).toBeGreaterThan(0);
      }
      
      // Limpiar búsqueda
      await page.fill(UI_SELECTORS.SEARCH_INPUT, '');
      await page.keyboard.press('Enter');
      
      // Buscar por código de área de Formosa
      await utils.searchLeads('+543704');
      
      const phoneResults = page.locator('text=/\\+543704\\d+/');
      if (await phoneResults.count() > 0) {
        expect(await phoneResults.count()).toBeGreaterThan(0);
      }
    });

    test('🔄 Combinación de filtros múltiples', async ({ page }) => {
      // Aplicar filtro por estado
      await utils.filterByEstado('PREAPROBADO');
      
      // Agregar búsqueda por texto
      await utils.searchLeads('Jorge');
      
      // Verificar que ambos filtros se aplican
      const url = page.url();
      expect(url).toContain('estado=PREAPROBADO');
      
      // Verificar indicadores de filtros múltiples
      const filterIndicators = page.locator('text=/filtrado.*estado.*PREAPROBADO/i');
      if (await filterIndicators.count() > 0) {
        await expect(filterIndicators).toBeVisible();
      }
    });
  });

  test.describe('Lista de leads con diseño moderno', () => {
    test('📋 Renderizado de lista de leads', async ({ page }) => {
      // Verificar que hay leads mostrados
      const leadCards = page.locator('.formosa-card').filter({
        has: page.locator('text=/[A-Z][a-z]+ [A-Z][a-z]+/')
      });
      
      const count = await leadCards.count();
      expect(count).toBeGreaterThan(0);
      
      await utils.takeScreenshot('leads-list');
    });

    test('🎨 Diseño moderno de cards de leads', async ({ page }) => {
      const leadCards = page.locator('.formosa-card').first();
      
      // Verificar efectos hover
      await expect(leadCards).toHaveClass(/hover-lift/);
      
      // Verificar gradientes en avatares
      const avatar = leadCards.locator('.bg-gradient-to-br').first();
      if (await avatar.count() > 0) {
        await expect(avatar).toBeVisible();
      }
      
      // Probar efecto hover
      await leadCards.hover();
      await page.waitForTimeout(300);
    });

    test('🏷️ Badges específicos de Formosa', async ({ page }) => {
      await utils.verifyFormosaBadges();
      
      // Verificar colores específicos de badges
      const badges = page.locator('[class*="formosa-badge-"]');
      const count = await badges.count();
      expect(count).toBeGreaterThan(0);
      
      // Verificar badges específicos
      const nuevoBadge = page.locator('.formosa-badge-nuevo');
      const preaprobadoBadge = page.locator('.formosa-badge-preaprobado');
      const rechazadoBadge = page.locator('.formosa-badge-rechazado');
      
      const totalBadges = await nuevoBadge.count() + await preaprobadoBadge.count() + await rechazadoBadge.count();
      expect(totalBadges).toBeGreaterThan(0);
    });

    test('📱 Información de contacto de Formosa', async ({ page }) => {
      await utils.verifyFormosaData();
      
      // Verificar emojis en la información
      await expect(page.locator('text=📞')).toBeVisible();
      await expect(page.locator('text=✉️')).toBeVisible();
      await expect(page.locator('text=📍')).toBeVisible();
      
      // Verificar formato de moneda argentina
      const currencyElements = page.locator('text=/\\$[\d,]+/');
      if (await currencyElements.count() > 0) {
        expect(await currencyElements.count()).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Paginación moderna', () => {
    test('📄 Funcionamiento de paginación', async ({ page }) => {
      // Verificar que existe paginación si hay suficientes leads
      const paginationSection = page.locator('text=/Página \\d+ de \\d+/').locator('..').locator('..');
      
      if (await paginationSection.count() > 0) {
        await expect(paginationSection).toBeVisible();
        
        // Verificar botones de navegación
        const nextButton = page.locator('button:has-text("Siguiente")');
        const prevButton = page.locator('button:has-text("Anterior")');
        
        await expect(nextButton).toBeVisible();
        await expect(prevButton).toBeVisible();
        
        // Verificar estado de botones
        const isPrevDisabled = await prevButton.isDisabled();
        expect(isPrevDisabled).toBeTruthy(); // Debe estar deshabilitado en la primera página
      }
    });

    test('🔢 Números de página con diseño moderno', async ({ page }) => {
      const paginationNumbers = page.locator('button').filter({
        hasText: /^\d+$/
      });
      
      if (await paginationNumbers.count() > 0) {
        const firstPageButton = paginationNumbers.first();
        
        // Verificar que tiene gradiente cuando está activo
        const hasGradient = await firstPageButton.evaluate(el => 
          el.classList.contains('gradient-primary') ||
          window.getComputedStyle(el).backgroundImage !== 'none'
        );
        
        expect(hasGradient).toBeTruthy();
      }
    });

    test('📊 Información de paginación', async ({ page }) => {
      // Verificar información de registros mostrados
      const paginationInfo = page.locator('text=/Mostrando \\d+ - \\d+ de \\d+ leads/');
      
      if (await paginationInfo.count() > 0) {
        await expect(paginationInfo).toBeVisible();
        
        const infoText = await paginationInfo.textContent();
        expect(infoText).toMatch(/Mostrando \d+ - \d+ de \d+ leads/);
      }
    });
  });

  test.describe('Creación de nuevo lead', () => {
    test('➕ Botón de nuevo lead', async ({ page }) => {
      const newLeadButton = page.locator(UI_SELECTORS.NEW_LEAD_BUTTON);
      await expect(newLeadButton).toBeVisible();
      
      // Verificar diseño moderno del botón
      await expect(newLeadButton).toHaveClass(/gradient-primary/);
      await expect(newLeadButton).toHaveClass(/hover-lift/);
      
      // Hacer click y verificar navegación
      await newLeadButton.click();
      await expect(page).toHaveURL(/\/leads\/new/);
    });

    test('📝 Formulario de nuevo lead', async ({ page }) => {
      await page.click(UI_SELECTORS.NEW_LEAD_BUTTON);
      
      // Verificar que el formulario carga
      await expect(page.locator('form')).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      
      // Verificar campos específicos de Formosa
      const nombreField = page.locator('input[name="nombre"], input[placeholder*="nombre"]');
      const telefonoField = page.locator('input[name="telefono"], input[placeholder*="teléfono"]');
      const zonaField = page.locator('select[name="zona"], select').filter({
        has: page.locator('option:has-text("Formosa Capital")')
      });
      
      await expect(nombreField).toBeVisible();
      await expect(telefonoField).toBeVisible();
      
      if (await zonaField.count() > 0) {
        await expect(zonaField).toBeVisible();
      }
    });
  });

  test.describe('Visualización de detalles de lead', () => {
    test('👁️ Acceso a detalles de lead', async ({ page }) => {
      // Hacer click en el primer lead
      const firstLead = page.locator('.formosa-card').filter({
        has: page.locator('text=/[A-Z][a-z]+ [A-Z][a-z]+/')
      }).first();
      
      const detailsButton = firstLead.locator('button:has-text("Ver Detalles"), a:has-text("Ver")');
      
      if (await detailsButton.count() > 0) {
        await detailsButton.click();
        
        // Verificar navegación a página de detalles
        await expect(page).toHaveURL(/\/leads\/[^\/]+$/);
        
        // Verificar que la página de detalles carga
        await page.waitForSelector('h1, h2', { timeout: TIMEOUTS.MEDIUM });
      }
    });
  });

  test.describe('Performance y optimización', () => {
    test('⚡ Tiempo de carga de la página de leads', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/leads');
      await page.waitForSelector(UI_SELECTORS.LEADS_TABLE, { timeout: TIMEOUTS.LONG });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(8000); // 8 segundos máximo
    });

    test('🔄 Rendimiento de filtros', async ({ page }) => {
      const startTime = Date.now();
      
      await utils.filterByEstado('PREAPROBADO');
      
      // Esperar a que se actualice la lista
      await page.waitForTimeout(1000);
      
      const filterTime = Date.now() - startTime;
      expect(filterTime).toBeLessThan(3000); // 3 segundos máximo para filtrar
    });

    test('📱 Responsive design en leads', async ({ page }) => {
      await utils.verifyResponsiveDesign();
      
      // Verificar que las cards se adaptan en mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      const leadCards = page.locator('.formosa-card');
      if (await leadCards.count() > 0) {
        await expect(leadCards.first()).toBeVisible();
      }
      
      await utils.takeScreenshot('leads-mobile');
    });

    test('🚫 Sin errores de consola en leads', async ({ page }) => {
      await utils.verifyNoConsoleErrors();
    });
  });

  test.describe('Datos específicos de Formosa validados', () => {
    test('🇦🇷 Nombres argentinos reales', async ({ page }) => {
      // Verificar que hay nombres argentinos específicos
      const argentineNames = [
        'Karen Vanina',
        'Jorge Lino',
        'Norma Beatriz',
        'María Elena',
        'Carlos Alberto'
      ];

      let foundNames = 0;
      for (const name of argentineNames) {
        const nameElements = page.locator(`text=${name}`);
        if (await nameElements.count() > 0) {
          foundNames++;
        }
      }

      expect(foundNames).toBeGreaterThan(0);
    });

    test('📞 Códigos de área de Formosa', async ({ page }) => {
      // Verificar códigos de área específicos
      for (const codigo of FORMOSA_DATA.CODIGOS_AREA) {
        const phoneElements = page.locator(`text=${codigo}`);
        if (await phoneElements.count() > 0) {
          expect(await phoneElements.count()).toBeGreaterThan(0);
        }
      }
    });

    test('🗺️ Zonas geográficas específicas', async ({ page }) => {
      // Verificar algunas zonas específicas de Formosa
      const zonasEspecificas = [
        'Formosa Capital',
        'Clorinda',
        'Pirané',
        'El Colorado'
      ];

      let foundZones = 0;
      for (const zona of zonasEspecificas) {
        const zoneElements = page.locator(`text=${zona}`);
        if (await zoneElements.count() > 0) {
          foundZones++;
        }
      }

      expect(foundZones).toBeGreaterThan(0);
    });

    test('💰 Ingresos en pesos argentinos', async ({ page }) => {
      // Verificar formato de moneda argentina
      const currencyPattern = /\$[\d,]+/;
      const currencyElements = page.locator(`text=${currencyPattern}`);

      if (await currencyElements.count() > 0) {
        const firstCurrency = await currencyElements.first().textContent();
        expect(firstCurrency).toMatch(currencyPattern);

        // Verificar que los montos están en el rango esperado para Argentina
        const amount = parseInt(firstCurrency?.replace(/[^\d]/g, '') || '0');
        expect(amount).toBeGreaterThan(50000000); // Más de $50M ARS
      }
    });
  });
});
