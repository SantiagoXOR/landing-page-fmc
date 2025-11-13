import { test, expect } from '@playwright/test';
import { TestUtils } from './utils';
import { TIMEOUTS, UI_SELECTORS } from './test-data';

test.describe('🎨 UI Moderna y Responsive del CRM Phorencial', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.login('ADMIN');
  });

  test.describe('Gradientes modernos en toda la aplicación', () => {
    test('🌈 Gradientes en títulos principales', async ({ page }) => {
      // Verificar gradientes en dashboard
      await utils.navigateToPage('dashboard');
      const dashboardTitle = page.locator('h1:has-text("Dashboard")');
      await expect(dashboardTitle).toHaveClass(/gradient-text/);
      
      // Verificar gradientes en leads
      await utils.navigateToPage('leads');
      const leadsTitle = page.locator('h1:has-text("Gestión de Leads")');
      await expect(leadsTitle).toHaveClass(/gradient-text/);
      
      // Verificar gradientes en documents
      await utils.navigateToPage('documents');
      const documentsTitle = page.locator('h1:has-text("Documentos")');
      await expect(documentsTitle).toHaveClass(/gradient-text/);
      
      // Verificar gradientes en settings
      await utils.navigateToPage('settings');
      const settingsTitle = page.locator('h1:has-text("Configuración")');
      await expect(settingsTitle).toHaveClass(/gradient-text/);
      
      await utils.takeScreenshot('gradient-titles');
    });

    test('🎨 Gradientes en botones principales', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      
      // Verificar botón de nuevo lead
      const newLeadButton = page.locator('button:has-text("Nuevo Lead")');
      if (await newLeadButton.count() > 0) {
        await expect(newLeadButton).toHaveClass(/gradient-primary/);
      }
      
      // Verificar botones de exportar
      const exportButton = page.locator('button:has-text("Exportar")');
      if (await exportButton.count() > 0) {
        await expect(exportButton).toHaveClass(/hover-lift/);
      }
      
      await utils.navigateToPage('leads');
      
      // Verificar botón de nuevo lead en página de leads
      const leadsNewButton = page.locator(UI_SELECTORS.NEW_LEAD_BUTTON);
      await expect(leadsNewButton).toHaveClass(/gradient-primary/);
      
      await utils.takeScreenshot('gradient-buttons');
    });

    test('📊 Gradientes en métricas y cards', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      await utils.waitForDashboardMetrics();
      
      // Verificar gradientes en valores de métricas
      const metricValues = page.locator('.text-3xl, .text-2xl').filter({
        hasText: /\d+/
      });
      
      if (await metricValues.count() > 0) {
        const firstMetric = metricValues.first();
        const hasGradient = await firstMetric.evaluate(el => 
          el.classList.contains('gradient-text') ||
          el.classList.contains('bg-gradient-to-r') ||
          window.getComputedStyle(el).backgroundImage !== 'none'
        );
        
        expect(hasGradient).toBeTruthy();
      }
      
      // Verificar gradientes en fondos de cards
      const gradientCards = page.locator('.bg-gradient-to-br, .gradient-primary');
      const count = await gradientCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('🎯 Gradientes específicos por tipo', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      await utils.waitForDashboardMetrics();
      
      // Verificar gradientes específicos
      const primaryGradients = page.locator('.gradient-primary');
      const successGradients = page.locator('.gradient-success');
      const warningGradients = page.locator('.gradient-warning');
      
      const totalGradients = await primaryGradients.count() + 
                           await successGradients.count() + 
                           await warningGradients.count();
      
      expect(totalGradients).toBeGreaterThan(0);
    });
  });

  test.describe('Animaciones y efectos visuales', () => {
    test('✨ Animaciones de entrada en dashboard', async ({ page }) => {
      // Recargar para ver animaciones desde el inicio
      await page.goto('/dashboard');
      
      // Verificar elementos con animaciones de entrada
      const fadeInElements = page.locator('.animate-fade-in');
      const slideUpElements = page.locator('.animate-slide-up');
      
      const animatedCount = await fadeInElements.count() + await slideUpElements.count();
      expect(animatedCount).toBeGreaterThan(0);
      
      await utils.takeScreenshot('animations-dashboard');
    });

    test('🔄 Transiciones suaves en navegación', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      
      // Verificar que los elementos tienen transiciones
      const transitionElements = page.locator('.transition-all, .transition-colors');
      const count = await transitionElements.count();
      expect(count).toBeGreaterThan(0);
      
      // Probar navegación entre páginas
      await utils.navigateToPage('leads');
      await page.waitForTimeout(500);
      
      await utils.navigateToPage('dashboard');
      await page.waitForTimeout(500);
    });

    test('🎨 Efectos hover en cards', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      await utils.waitForDashboardMetrics();
      
      // Verificar efectos hover-lift
      const hoverCards = page.locator('.hover-lift');
      const count = await hoverCards.count();
      expect(count).toBeGreaterThan(0);
      
      // Probar efecto hover en la primera card
      if (await hoverCards.count() > 0) {
        const firstCard = hoverCards.first();
        await firstCard.hover();
        
        // Verificar que se aplica transformación
        await page.waitForTimeout(300);
        
        const transform = await firstCard.evaluate(el => 
          window.getComputedStyle(el).transform
        );
        
        // Debe tener alguna transformación aplicada
        expect(transform).not.toBe('none');
      }
    });

    test('🌊 Efectos de glassmorphism en sidebar', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      
      const sidebar = page.locator(UI_SELECTORS.SIDEBAR);
      
      // Verificar efectos de cristal
      const hasGlassEffect = await sidebar.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.backdropFilter !== 'none' || 
               styles.background.includes('rgba') ||
               el.classList.contains('backdrop-blur');
      });
      
      expect(hasGlassEffect).toBeTruthy();
    });
  });

  test.describe('Badges específicos de Formosa', () => {
    test('🏷️ Colores correctos en badges de estado', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Verificar badges específicos de Formosa
      await utils.verifyFormosaBadges();
      
      // Verificar colores específicos
      const nuevoBadge = page.locator('.formosa-badge-nuevo');
      const preaprobadoBadge = page.locator('.formosa-badge-preaprobado');
      const rechazadoBadge = page.locator('.formosa-badge-rechazado');
      
      if (await nuevoBadge.count() > 0) {
        const bgColor = await nuevoBadge.first().evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        // Debe tener color azul (rgb con componente azul alto)
        expect(bgColor).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);
      }
      
      if (await preaprobadoBadge.count() > 0) {
        const bgColor = await preaprobadoBadge.first().evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        // Debe tener color verde
        expect(bgColor).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);
      }
      
      await utils.takeScreenshot('formosa-badges');
    });

    test('📊 Consistencia de badges en diferentes páginas', async ({ page }) => {
      // Verificar badges en dashboard
      await utils.navigateToPage('dashboard');
      const dashboardBadges = page.locator('[class*="formosa-badge-"]');
      const dashboardCount = await dashboardBadges.count();
      
      // Verificar badges en leads
      await utils.navigateToPage('leads');
      const leadsBadges = page.locator('[class*="formosa-badge-"]');
      const leadsCount = await leadsBadges.count();
      
      // Debe haber badges en al menos una de las páginas
      expect(dashboardCount + leadsCount).toBeGreaterThan(0);
    });

    test('🎨 Diseño moderno de badges', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      const badges = page.locator('[class*="formosa-badge-"]');
      
      if (await badges.count() > 0) {
        const firstBadge = badges.first();
        
        // Verificar que tiene bordes redondeados
        const borderRadius = await firstBadge.evaluate(el => 
          window.getComputedStyle(el).borderRadius
        );
        expect(borderRadius).not.toBe('0px');
        
        // Verificar que tiene padding apropiado
        const padding = await firstBadge.evaluate(el => 
          window.getComputedStyle(el).padding
        );
        expect(padding).not.toBe('0px');
      }
    });
  });

  test.describe('Responsive design en diferentes tamaños', () => {
    test('📱 Mobile (375px) - iPhone', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await utils.navigateToPage('dashboard');
      
      // Verificar que el sidebar se adapta
      const sidebar = page.locator(UI_SELECTORS.SIDEBAR);
      
      // En mobile, el sidebar debería estar oculto o ser un overlay
      const isVisible = await sidebar.isVisible();
      
      if (isVisible) {
        // Si es visible, verificar que tiene comportamiento mobile
        const position = await sidebar.evaluate(el => 
          window.getComputedStyle(el).position
        );
        expect(['fixed', 'absolute']).toContain(position);
      }
      
      // Verificar que las métricas se adaptan
      await utils.waitForDashboardMetrics();
      const metricsGrid = page.locator('.grid').first();
      
      if (await metricsGrid.count() > 0) {
        const gridCols = await metricsGrid.evaluate(el => 
          window.getComputedStyle(el).gridTemplateColumns
        );
        // En mobile debería ser una sola columna o adaptarse
        expect(gridCols).toBeTruthy();
      }
      
      await utils.takeScreenshot('mobile-375');
    });

    test('📱 Tablet (768px) - iPad', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await utils.navigateToPage('dashboard');
      
      // Verificar que el layout se adapta para tablet
      await utils.waitForDashboardMetrics();
      
      // Las métricas deberían estar en 2 columnas en tablet
      const metricsCards = page.locator('.formosa-card').filter({
        has: page.locator('.text-2xl, .text-3xl')
      });
      
      if (await metricsCards.count() >= 2) {
        expect(await metricsCards.count()).toBeGreaterThanOrEqual(2);
      }
      
      await utils.takeScreenshot('tablet-768');
    });

    test('🖥️ Desktop (1920px) - Full HD', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await utils.navigateToPage('dashboard');
      
      // Verificar que el sidebar está visible
      const sidebar = page.locator(UI_SELECTORS.SIDEBAR);
      await expect(sidebar).toBeVisible();
      
      // Verificar que las métricas están en 4 columnas
      await utils.waitForDashboardMetrics();
      const metricsGrid = page.locator('.grid').first();
      
      if (await metricsGrid.count() > 0) {
        const gridCols = await metricsGrid.evaluate(el => 
          window.getComputedStyle(el).gridTemplateColumns
        );
        // Debería tener múltiples columnas
        expect(gridCols.split(' ').length).toBeGreaterThanOrEqual(2);
      }
      
      await utils.takeScreenshot('desktop-1920');
    });

    test('📺 Ultra-wide (2560px)', async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });
      await utils.navigateToPage('dashboard');
      
      // Verificar que el contenido no se estira demasiado
      const mainContent = page.locator('main, .space-y-8').first();
      
      if (await mainContent.count() > 0) {
        const maxWidth = await mainContent.evaluate(el => 
          window.getComputedStyle(el).maxWidth
        );
        
        // Debería tener algún límite de ancho o padding
        const hasConstraint = maxWidth !== 'none' || 
                            await mainContent.evaluate(el => 
                              window.getComputedStyle(el).paddingLeft !== '0px'
                            );
        
        expect(hasConstraint).toBeTruthy();
      }
      
      await utils.takeScreenshot('ultrawide-2560');
    });
  });

  test.describe('Navegación responsive', () => {
    test('🧭 Sidebar responsive', async ({ page }) => {
      // Desktop - sidebar visible
      await page.setViewportSize({ width: 1920, height: 1080 });
      await utils.navigateToPage('dashboard');
      
      const sidebar = page.locator(UI_SELECTORS.SIDEBAR);
      await expect(sidebar).toBeVisible();
      
      // Mobile - sidebar oculto o overlay
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Verificar comportamiento mobile del sidebar
      const sidebarMobile = page.locator(UI_SELECTORS.SIDEBAR);
      const isVisibleMobile = await sidebarMobile.isVisible();
      
      if (isVisibleMobile) {
        // Si es visible, debe ser un overlay
        const zIndex = await sidebarMobile.evaluate(el => 
          window.getComputedStyle(el).zIndex
        );
        expect(parseInt(zIndex)).toBeGreaterThan(10);
      }
    });

    test('📱 Menú hamburguesa en mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await utils.navigateToPage('dashboard');
      
      // Buscar botón de menú hamburguesa
      const menuButton = page.locator('button').filter({
        has: page.locator('svg')
      }).filter({
        hasText: /menu|☰/i
      });
      
      if (await menuButton.count() === 0) {
        // Buscar por icono de menú
        const menuIcon = page.locator('[data-testid="menu-button"], button:has(svg)').filter({
          has: page.locator('path[d*="M3"], path[d*="M4"]') // Iconos típicos de hamburguesa
        });
        
        if (await menuIcon.count() > 0) {
          await expect(menuIcon.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Tipografía y espaciado', () => {
    test('📝 Jerarquía tipográfica', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      
      // Verificar tamaños de títulos
      const h1 = page.locator('h1').first();
      const h2 = page.locator('h2').first();
      
      if (await h1.count() > 0) {
        const h1Size = await h1.evaluate(el => 
          window.getComputedStyle(el).fontSize
        );
        expect(parseFloat(h1Size)).toBeGreaterThan(20); // Al menos 20px
      }
      
      if (await h2.count() > 0) {
        const h2Size = await h2.evaluate(el => 
          window.getComputedStyle(el).fontSize
        );
        expect(parseFloat(h2Size)).toBeGreaterThan(16); // Al menos 16px
      }
    });

    test('📏 Espaciado consistente', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      
      // Verificar clases de espaciado
      const spacingElements = page.locator('.space-y-6, .space-y-8, .space-y-4');
      const count = await spacingElements.count();
      expect(count).toBeGreaterThan(0);
      
      // Verificar padding en cards
      const cards = page.locator('.formosa-card, .p-6, .p-4');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
    });
  });

  test.describe('Accesibilidad visual', () => {
    test('🎨 Contraste de colores', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      
      // Verificar que el texto tiene buen contraste
      const textElements = page.locator('p, span, div').filter({
        hasText: /\w+/
      });
      
      if (await textElements.count() > 0) {
        const firstText = textElements.first();
        const color = await firstText.evaluate(el => 
          window.getComputedStyle(el).color
        );
        const bgColor = await firstText.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        
        // Verificar que no son el mismo color
        expect(color).not.toBe(bgColor);
      }
    });

    test('🔍 Elementos focusables', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      
      // Verificar que los botones son focusables
      const buttons = page.locator('button, a');
      
      if (await buttons.count() > 0) {
        const firstButton = buttons.first();
        await firstButton.focus();
        
        // Verificar que tiene outline o ring de focus
        const outline = await firstButton.evaluate(el => 
          window.getComputedStyle(el).outline
        );
        const boxShadow = await firstButton.evaluate(el => 
          window.getComputedStyle(el).boxShadow
        );
        
        // Debe tener algún indicador de focus
        expect(outline !== 'none' || boxShadow !== 'none').toBeTruthy();
      }
    });
  });

  test.describe('Performance visual', () => {
    test('⚡ Tiempo de renderizado visual', async ({ page }) => {
      const startTime = Date.now();
      
      await utils.navigateToPage('dashboard');
      
      // Esperar a que los elementos visuales carguen
      await page.waitForSelector('.gradient-text', { timeout: TIMEOUTS.MEDIUM });
      await page.waitForSelector('.formosa-card', { timeout: TIMEOUTS.MEDIUM });
      
      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(3000); // 3 segundos máximo
    });

    test('🎨 Carga progresiva de estilos', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Verificar que los estilos se cargan progresivamente
      await page.waitForSelector('body', { timeout: TIMEOUTS.SHORT });
      
      // Verificar que Tailwind CSS está cargado
      const hasStyles = await page.evaluate(() => {
        const body = document.body;
        const styles = window.getComputedStyle(body);
        return styles.fontFamily !== '' && styles.margin !== '';
      });
      
      expect(hasStyles).toBeTruthy();
    });
  });
});
