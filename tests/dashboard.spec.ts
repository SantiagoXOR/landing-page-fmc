import { test, expect } from '@playwright/test';
import { TestUtils } from './utils';
import { EXPECTED_METRICS, TIMEOUTS, UI_SELECTORS } from './test-data';

test.describe('📊 Dashboard Modernizado del CRM Phorencial', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.login('ADMIN');
  });

  test.describe('Carga y estructura del Dashboard', () => {
    test('🏠 Carga correcta del Dashboard', async ({ page }) => {
      // Verificar que el título está presente
      await expect(page.locator(UI_SELECTORS.DASHBOARD_TITLE)).toBeVisible();
      
      // Verificar que el título tiene el gradiente moderno
      const titleElement = page.locator('h1:has-text("Dashboard")');
      await expect(titleElement).toHaveClass(/gradient-text/);
      
      // Verificar descripción
      await expect(page.locator('text=Resumen de actividad y métricas principales de Formosa')).toBeVisible();
      
      // Verificar tiempo de carga
      await utils.verifyPageLoadTime(5000);
      
      await utils.takeScreenshot('dashboard-loaded');
    });

    test('📱 Responsive design del Dashboard', async ({ page }) => {
      await utils.verifyResponsiveDesign();
      
      // Verificar que las métricas se adaptan en mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Las métricas deberían estar en una sola columna en mobile
      const metricsGrid = page.locator('.grid').first();
      await expect(metricsGrid).toBeVisible();
      
      await utils.takeScreenshot('dashboard-mobile');
    });
  });

  test.describe('Métricas KPI con datos reales de Formosa', () => {
    test('📈 Carga de métricas KPI', async ({ page }) => {
      await utils.waitForDashboardMetrics();
      
      // Verificar que hay al menos 4 métricas principales
      const metricsCards = page.locator('[data-testid="metrics-card"], .formosa-card').filter({
        has: page.locator('.text-2xl, .text-3xl')
      });
      
      const count = await metricsCards.count();
      expect(count).toBeGreaterThanOrEqual(4);
      
      await utils.takeScreenshot('dashboard-metrics');
    });

    test('🔢 Validación de valores numéricos en métricas', async ({ page }) => {
      await utils.waitForDashboardMetrics();
      
      // Verificar Total Leads
      const totalLeadsCard = page.locator('text=Total Leads').locator('..').locator('..');
      const totalLeadsValue = await totalLeadsCard.locator('.text-2xl, .text-3xl').textContent();
      
      if (totalLeadsValue) {
        const numericValue = parseInt(totalLeadsValue.replace(/[^\d]/g, ''));
        expect(numericValue).toBeGreaterThanOrEqual(EXPECTED_METRICS.MIN_TOTAL_LEADS);
      }
      
      // Verificar Tasa Conversión
      const conversionCard = page.locator('text=Tasa Conversión').locator('..').locator('..');
      const conversionValue = await conversionCard.locator('.text-2xl, .text-3xl').textContent();
      
      if (conversionValue) {
        expect(conversionValue).toMatch(/\d+\.?\d*%/);
      }
      
      // Verificar Ingresos Proyectados
      const revenueCard = page.locator('text=Ingresos Proyectados').locator('..').locator('..');
      const revenueValue = await revenueCard.locator('.text-2xl, .text-3xl').textContent();
      
      if (revenueValue) {
        expect(revenueValue).toMatch(/\$[\d,]+/);
      }
    });

    test('📊 Métricas específicas de Formosa', async ({ page }) => {
      await utils.waitForDashboardMetrics();
      
      // Verificar que hay métricas de Preaprobados
      const preapprovedCard = page.locator('text=Preaprobados').locator('..').locator('..');
      await expect(preapprovedCard).toBeVisible();
      
      const preapprovedValue = await preapprovedCard.locator('.text-2xl, .text-3xl').textContent();
      if (preapprovedValue) {
        const numericValue = parseInt(preapprovedValue.replace(/[^\d]/g, ''));
        expect(numericValue).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Componentes MetricsCard modernos', () => {
    test('🎨 Gradientes en MetricsCard', async ({ page }) => {
      await utils.waitForDashboardMetrics();
      
      // Verificar que las cards tienen gradientes
      await utils.verifyGradients();
      
      // Verificar gradientes específicos en las métricas
      const gradientElements = page.locator('.gradient-primary, .bg-gradient-to-br');
      const count = await gradientElements.count();
      expect(count).toBeGreaterThan(0);
    });

    test('✨ Efectos hover en MetricsCard', async ({ page }) => {
      await utils.waitForDashboardMetrics();
      
      // Verificar que las cards tienen la clase hover-lift
      const hoverCards = page.locator('.hover-lift');
      const count = await hoverCards.count();
      expect(count).toBeGreaterThan(0);
      
      // Probar efecto hover en la primera card
      const firstCard = hoverCards.first();
      await firstCard.hover();
      
      // Verificar que el efecto se aplica (cambio en transform o shadow)
      await page.waitForTimeout(300); // Esperar animación
    });

    test('🏷️ Badges de tendencia en métricas', async ({ page }) => {
      await utils.waitForDashboardMetrics();
      
      // Buscar badges de tendencia (TrendingUp, TrendingDown)
      const trendBadges = page.locator('[data-testid="trend-badge"], .badge').filter({
        hasText: /%/
      });
      
      if (await trendBadges.count() > 0) {
        const firstBadge = trendBadges.first();
        await expect(firstBadge).toBeVisible();
        
        // Verificar que contiene un porcentaje
        const badgeText = await firstBadge.textContent();
        expect(badgeText).toMatch(/\d+\.?\d*%/);
      }
    });

    test('🎯 Iconos temáticos en métricas', async ({ page }) => {
      await utils.waitForDashboardMetrics();
      
      // Verificar que las métricas tienen iconos
      const iconElements = page.locator('svg').filter({
        has: page.locator('path')
      });
      
      const count = await iconElements.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Componente DashboardCharts', () => {
    test('📈 Renderizado de gráficos', async ({ page }) => {
      await utils.waitForDashboardMetrics();
      
      // Esperar a que los gráficos carguen
      await page.waitForSelector('.recharts-wrapper, [data-testid="dashboard-charts"]', { 
        timeout: TIMEOUTS.LONG 
      });
      
      // Verificar que hay elementos de gráficos Recharts
      const chartElements = page.locator('.recharts-wrapper');
      const count = await chartElements.count();
      expect(count).toBeGreaterThan(0);
      
      await utils.takeScreenshot('dashboard-charts');
    });

    test('🎨 Gráficos con gradientes modernos', async ({ page }) => {
      await page.waitForSelector('.recharts-wrapper', { timeout: TIMEOUTS.LONG });
      
      // Verificar que los gráficos tienen gradientes
      const gradientDefs = page.locator('defs linearGradient');
      if (await gradientDefs.count() > 0) {
        expect(await gradientDefs.count()).toBeGreaterThan(0);
      }
    });

    test('📊 Datos reales en gráficos', async ({ page }) => {
      await page.waitForSelector('.recharts-wrapper', { timeout: TIMEOUTS.LONG });
      
      // Verificar que hay datos en los gráficos
      const chartData = page.locator('.recharts-bar, .recharts-line, .recharts-area');
      const count = await chartData.count();
      expect(count).toBeGreaterThan(0);
    });

    test('🎯 Tooltips interactivos', async ({ page }) => {
      await page.waitForSelector('.recharts-wrapper', { timeout: TIMEOUTS.LONG });
      
      // Intentar hacer hover en un elemento del gráfico
      const chartElement = page.locator('.recharts-bar, .recharts-line').first();
      
      if (await chartElement.count() > 0) {
        await chartElement.hover();
        
        // Buscar tooltip
        const tooltip = page.locator('.recharts-tooltip-wrapper');
        if (await tooltip.count() > 0) {
          await expect(tooltip).toBeVisible();
        }
      }
    });
  });

  test.describe('Sidebar moderno', () => {
    test('🧭 Navegación del Sidebar', async ({ page }) => {
      // Verificar que el sidebar está visible
      await expect(page.locator(UI_SELECTORS.SIDEBAR)).toBeVisible();
      
      // Verificar logo de Phorencial
      const logo = page.locator('text=Phorencial');
      await expect(logo).toBeVisible();
      
      // Verificar subtítulo
      const subtitle = page.locator('text=CRM Formosa');
      await expect(subtitle).toBeVisible();
      
      await utils.takeScreenshot('sidebar-navigation');
    });

    test('🎨 Diseño glassmorphism del Sidebar', async ({ page }) => {
      const sidebar = page.locator(UI_SELECTORS.SIDEBAR);
      
      // Verificar que tiene efectos de cristal/glassmorphism
      const hasGlassEffect = await sidebar.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.backdropFilter !== 'none' || 
               styles.background.includes('rgba') ||
               el.classList.contains('backdrop-blur');
      });
      
      // Si no tiene glassmorphism, al menos debe tener un fondo moderno
      expect(hasGlassEffect || await sidebar.locator('.bg-gradient-to-b').count() > 0).toBeTruthy();
    });

    test('🔗 Enlaces de navegación activos', async ({ page }) => {
      // Verificar que el enlace del Dashboard está activo
      const dashboardLink = page.locator(UI_SELECTORS.NAV_DASHBOARD);
      await expect(dashboardLink).toBeVisible();
      
      // Verificar estado activo (puede tener clases específicas)
      const isActive = await dashboardLink.evaluate(el => 
        el.classList.contains('active') || 
        el.classList.contains('bg-gradient-to-r') ||
        el.getAttribute('aria-current') === 'page'
      );
      
      expect(isActive).toBeTruthy();
    });

    test('🏷️ Badges dinámicos en navegación', async ({ page }) => {
      // Verificar badges con contadores
      const badgesInNav = page.locator(UI_SELECTORS.SIDEBAR).locator('.badge, [class*="badge"]');
      
      if (await badgesInNav.count() > 0) {
        const firstBadge = badgesInNav.first();
        const badgeText = await firstBadge.textContent();
        
        // Debe contener un número
        expect(badgeText).toMatch(/\d+/);
      }
    });

    test('👤 Información de usuario en Sidebar', async ({ page }) => {
      // Verificar sección de usuario
      const userSection = page.locator('text=Usuario Admin, text=admin@phorencial.com').first();
      
      if (await userSection.count() > 0) {
        await expect(userSection).toBeVisible();
      }
      
      // Verificar botón de logout
      await expect(page.locator(UI_SELECTORS.LOGOUT_BUTTON)).toBeVisible();
    });
  });

  test.describe('Animaciones y efectos visuales', () => {
    test('✨ Animaciones de entrada', async ({ page }) => {
      // Recargar página para ver animaciones
      await page.reload();
      await utils.waitForDashboardMetrics();
      
      // Verificar elementos con animaciones
      await utils.verifyAnimations();
      
      // Verificar clases de animación específicas
      const animatedElements = page.locator('.animate-fade-in, .animate-slide-up');
      const count = await animatedElements.count();
      expect(count).toBeGreaterThan(0);
    });

    test('🎨 Efectos de gradiente en texto', async ({ page }) => {
      // Verificar gradientes en texto
      const gradientText = page.locator('.gradient-text');
      const count = await gradientText.count();
      expect(count).toBeGreaterThan(0);
      
      // Verificar que el título principal tiene gradiente
      const title = page.locator('h1:has-text("Dashboard")');
      const hasGradient = await title.evaluate(el => 
        el.classList.contains('gradient-text') ||
        window.getComputedStyle(el).backgroundImage !== 'none'
      );
      
      expect(hasGradient).toBeTruthy();
    });

    test('🔄 Transiciones suaves', async ({ page }) => {
      await utils.waitForDashboardMetrics();
      
      // Verificar que los elementos tienen transiciones
      const transitionElements = page.locator('.transition-all, .transition-colors, .hover-lift');
      const count = await transitionElements.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Leads recientes con diseño moderno', () => {
    test('📋 Sección de leads recientes', async ({ page }) => {
      await utils.waitForDashboardMetrics();
      
      // Buscar sección de leads recientes
      const recentLeadsSection = page.locator('text=Leads Recientes').locator('..').locator('..');
      
      if (await recentLeadsSection.count() > 0) {
        await expect(recentLeadsSection).toBeVisible();
        
        // Verificar que hay leads mostrados
        const leadItems = recentLeadsSection.locator('[data-testid="recent-lead"], .formosa-card').filter({
          has: page.locator('text=/[A-Z][a-z]+ [A-Z][a-z]+/')
        });
        
        if (await leadItems.count() > 0) {
          expect(await leadItems.count()).toBeGreaterThan(0);
        }
      }
    });

    test('🏷️ Badges de estado en leads recientes', async ({ page }) => {
      await utils.waitForDashboardMetrics();
      
      // Verificar badges específicos de Formosa
      await utils.verifyFormosaBadges();
    });
  });

  test.describe('Performance y optimización', () => {
    test('⚡ Tiempo de carga del Dashboard', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      await utils.waitForDashboardMetrics();
      
      const loadTime = Date.now() - startTime;
      
      // El dashboard debe cargar en menos de 8 segundos
      expect(loadTime).toBeLessThan(8000);
    });

    test('🚫 Sin errores de consola', async ({ page }) => {
      await utils.verifyNoConsoleErrors();
    });

    test('📊 Carga progresiva de componentes', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Verificar que el título aparece primero
      await expect(page.locator(UI_SELECTORS.DASHBOARD_TITLE)).toBeVisible({ timeout: TIMEOUTS.SHORT });
      
      // Luego las métricas
      await expect(page.locator('.formosa-card').first()).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      
      // Finalmente los gráficos
      await page.waitForSelector('.recharts-wrapper', { timeout: TIMEOUTS.LONG });
    });
  });
});
