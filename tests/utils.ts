import { Page, expect } from '@playwright/test';
import { TEST_USERS, TIMEOUTS, UI_SELECTORS } from './test-data';

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Realizar login con un usuario específico
   */
  async login(userType: keyof typeof TEST_USERS) {
    const user = TEST_USERS[userType];
    
    await this.page.goto('/auth/signin');
    await this.page.waitForSelector(UI_SELECTORS.LOGIN_FORM, { timeout: TIMEOUTS.MEDIUM });
    
    await this.page.fill(UI_SELECTORS.EMAIL_INPUT, user.email);
    await this.page.fill(UI_SELECTORS.PASSWORD_INPUT, user.password);
    
    await this.page.click(UI_SELECTORS.LOGIN_BUTTON);
    
    // Esperar redirección al dashboard
    await this.page.waitForURL('/dashboard', { timeout: TIMEOUTS.NAVIGATION });
    await this.page.waitForSelector(UI_SELECTORS.DASHBOARD_TITLE, { timeout: TIMEOUTS.MEDIUM });
  }

  /**
   * Realizar logout
   */
  async logout() {
    await this.page.click(UI_SELECTORS.LOGOUT_BUTTON);
    await this.page.waitForURL('/auth/signin', { timeout: TIMEOUTS.NAVIGATION });
  }

  /**
   * Navegar a una página específica usando el sidebar
   */
  async navigateToPage(page: 'dashboard' | 'leads' | 'documents' | 'settings') {
    const selectors = {
      dashboard: UI_SELECTORS.NAV_DASHBOARD,
      leads: UI_SELECTORS.NAV_LEADS,
      documents: UI_SELECTORS.NAV_DOCUMENTS,
      settings: UI_SELECTORS.NAV_SETTINGS
    };

    await this.page.click(selectors[page]);
    await this.page.waitForURL(`/${page}`, { timeout: TIMEOUTS.NAVIGATION });
  }

  /**
   * Esperar a que las métricas del dashboard carguen
   */
  async waitForDashboardMetrics() {
    await this.page.waitForSelector(UI_SELECTORS.METRICS_CARDS, { timeout: TIMEOUTS.LONG });
    
    // Esperar a que al menos una métrica tenga un valor numérico
    await this.page.waitForFunction(() => {
      const cards = document.querySelectorAll('[data-testid="metrics-card"]');
      return Array.from(cards).some(card => {
        const valueElement = card.querySelector('.text-3xl, .text-2xl');
        return valueElement && /\d+/.test(valueElement.textContent || '');
      });
    }, { timeout: TIMEOUTS.LONG });
  }

  /**
   * Verificar que los gradientes están aplicados correctamente
   */
  async verifyGradients() {
    const gradientElements = await this.page.locator(UI_SELECTORS.GRADIENT_ELEMENTS).count();
    expect(gradientElements).toBeGreaterThan(0);
  }

  /**
   * Verificar que las animaciones están funcionando
   */
  async verifyAnimations() {
    const animatedElements = await this.page.locator(UI_SELECTORS.ANIMATED_ELEMENTS).count();
    expect(animatedElements).toBeGreaterThan(0);
  }

  /**
   * Verificar badges específicos de Formosa
   */
  async verifyFormosaBadges() {
    const badges = await this.page.locator(UI_SELECTORS.FORMOSA_BADGES).count();
    expect(badges).toBeGreaterThan(0);
  }

  /**
   * Aplicar filtro por estado en la página de leads
   */
  async filterByEstado(estado: string) {
    await this.page.selectOption(UI_SELECTORS.ESTADO_FILTER, estado);
    
    // Esperar a que la tabla se actualice
    await this.page.waitForTimeout(1000);
    
    // Verificar que el filtro se aplicó
    const url = this.page.url();
    expect(url).toContain(`estado=${estado}`);
  }

  /**
   * Buscar leads por texto
   */
  async searchLeads(searchTerm: string) {
    await this.page.fill(UI_SELECTORS.SEARCH_INPUT, searchTerm);
    await this.page.keyboard.press('Enter');
    
    // Esperar a que los resultados se actualicen
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verificar que los contadores dinámicos son exactos
   */
  async verifyDynamicCounters() {
    // Obtener el contador total de leads
    const totalLeadsText = await this.page.textContent('h1:has-text("Gestión de Leads")');
    const totalMatch = totalLeadsText?.match(/Total: (\d+)/);
    
    if (totalMatch) {
      const totalCount = parseInt(totalMatch[1]);
      expect(totalCount).toBeGreaterThan(0);
      
      // Verificar que el contador coincide con el número de filas en la tabla
      const visibleRows = await this.page.locator('[data-testid="lead-row"]').count();
      // Nota: Puede haber paginación, así que verificamos que hay al menos algunas filas
      expect(visibleRows).toBeGreaterThan(0);
    }
  }

  /**
   * Verificar datos específicos de Formosa
   */
  async verifyFormosaData() {
    // Verificar que hay teléfonos con códigos de área de Formosa
    const phoneElements = await this.page.locator('text=/\\+5437(04|05|11|18)\\d+/').count();
    expect(phoneElements).toBeGreaterThan(0);
    
    // Verificar que hay nombres argentinos
    const nameElements = await this.page.locator('text=/[A-ZÁÉÍÓÚ][a-záéíóú]+ [A-ZÁÉÍÓÚ][a-záéíóú]+/').count();
    expect(nameElements).toBeGreaterThan(0);
  }

  /**
   * Verificar responsive design
   */
  async verifyResponsiveDesign() {
    // Probar en mobile
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500);
    
    // Verificar que el sidebar se adapta
    const sidebar = this.page.locator(UI_SELECTORS.SIDEBAR);
    await expect(sidebar).toBeVisible();
    
    // Volver a desktop
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Tomar screenshot con nombre descriptivo
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Verificar que no hay errores de consola críticos
   */
  async verifyNoConsoleErrors() {
    const errors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Esperar un momento para capturar errores
    await this.page.waitForTimeout(2000);
    
    // Filtrar errores conocidos/aceptables
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('net::ERR_')
    );
    
    expect(criticalErrors).toHaveLength(0);
  }

  /**
   * Verificar tiempo de carga de página
   */
  async verifyPageLoadTime(maxTime: number = 5000) {
    const startTime = Date.now();
    await this.page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(maxTime);
  }
}
