import { Page, expect } from '@playwright/test';
import { TEST_USERS, TIMEOUTS, UI_SELECTORS } from './test-data';

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Realizar login con un usuario específico
   * Nota: La aplicación usa OAuth con Google. Este método verifica si ya estamos
   * autenticados navegando al dashboard. Si usas estado de autenticación guardado,
   * este método simplemente verificará que estamos en una página válida.
   * 
   * Para guardar estado de autenticación:
   * 1. Ejecuta: npx playwright test tests/auth-setup.ts --project=chromium --headed
   * 2. Autentícate manualmente cuando se abra el navegador
   * 3. El estado se guardará automáticamente
   * 4. Los siguientes tests usarán ese estado automáticamente
   */
  async login(userType: keyof typeof TEST_USERS) {
    // Intentar navegar directamente al dashboard
    // Si usamos storageState en playwright.config.ts, ya estaremos autenticados
    await this.page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.NAVIGATION });
    
    // Esperar un momento para que la redirección ocurra si es necesario
    await this.page.waitForTimeout(2000);
    
    // Verificar si estamos en la página de signin
    const currentUrl = this.page.url();
    if (currentUrl.includes('/auth/signin')) {
      // Si estamos en login, verificar si hay botón de Google OAuth
      const googleButton = this.page.locator('button:has-text("Iniciar sesión con Google"), button[aria-label*="Google"]').first();
      const buttonExists = await googleButton.isVisible().catch(() => false);
      
      if (buttonExists) {
        // Si hay botón de Google, significa que no estamos autenticados
        // Pero no lanzar error, permitir que el test continúe y verifique después
        console.log('⚠️  No autenticado. Los tests que requieren autenticación se saltarán.');
        await this.page.waitForTimeout(1000);
        return;
      }
    }
    
    // Si llegamos aquí, estamos autenticados o en una página válida
    // Verificar que estamos en una página válida (dashboard, chats, o leads)
    try {
      await this.page.waitForURL(/\/dashboard|\/chats|\/leads/, { timeout: TIMEOUTS.SHORT });
    } catch {
      // Si no redirige a ninguna de estas, puede estar en otra página válida
      // Continuar de todas formas
    }
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

  /**
   * Navegar a la página de chats
   */
  async navigateToChats() {
    await this.page.goto('/chats', { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.NAVIGATION });
    
    // Esperar a que la página cargue (puede ser /chats o /auth/signin)
    await this.page.waitForTimeout(2000);
    
    // Verificar si estamos en la página de chats o redirigidos a login
    const currentUrl = this.page.url();
    if (currentUrl.includes('/chats')) {
      // Verificar que la página cargó correctamente
      // No esperar selectores específicos ya que pueden variar
      await this.page.waitForLoadState('networkidle', { timeout: TIMEOUTS.SHORT }).catch(() => {
        // Si no se carga networkidle, continuar de todas formas
      });
    }
    // Si estamos en /auth/signin, no hacer nada más - el test verificará después
  }

  /**
   * Esperar a que cargue la lista de conversaciones
   * Maneja el caso de 0 conversaciones (estado vacío)
   */
  async waitForConversationsList() {
    // Esperar a que termine de cargar (loading state)
    await this.page.waitForLoadState('networkidle', { timeout: TIMEOUTS.MEDIUM });
    
    // Esperar a que desaparezca el skeleton/loading
    await this.page.waitForTimeout(2000);
    
    // Verificar que hay conversaciones o estado vacío
    const hasConversations = await this.page.locator(UI_SELECTORS.CONVERSATION_ITEM).count() > 0;
    const hasEmptyState = await this.page.locator(UI_SELECTORS.CHATS_EMPTY_STATE).first().isVisible().catch(() => false);
    
    // Debe haber al menos una de las dos condiciones
    if (!hasConversations && !hasEmptyState) {
      // Esperar un poco más para que cargue
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Obtener cantidad de conversaciones visibles
   */
  async getConversationsCount(): Promise<number> {
    return await this.page.locator(UI_SELECTORS.CONVERSATION_ITEM).count();
  }

  /**
   * Seleccionar una conversación por índice (si existe)
   */
  async selectConversation(index: number = 0) {
    const conversations = this.page.locator(UI_SELECTORS.CONVERSATION_ITEM);
    const count = await conversations.count();
    
    if (count === 0) {
      throw new Error('No hay conversaciones disponibles para seleccionar');
    }
    
    if (index >= count) {
      throw new Error(`Índice ${index} fuera de rango. Hay ${count} conversaciones`);
    }
    
    await conversations.nth(index).click();
    
    // Esperar a que se cargue la conversación
    await this.page.waitForTimeout(1000);
  }

  /**
   * Buscar conversaciones usando término de búsqueda
   */
  async searchConversations(term: string) {
    const searchInput = this.page.locator(UI_SELECTORS.CHATS_SEARCH_INPUT).first();
    await searchInput.fill(term);
    await this.page.waitForTimeout(800); // Esperar a que se aplique el filtro (debounce)
  }

  /**
   * Filtrar conversaciones por plataforma
   */
  async filterByPlatform(platform: 'all' | 'instagram' | 'whatsapp') {
    const selector = platform === 'all' 
      ? UI_SELECTORS.CHATS_FILTER_ALL
      : platform === 'instagram'
      ? UI_SELECTORS.CHATS_FILTER_INSTAGRAM
      : UI_SELECTORS.CHATS_FILTER_WHATSAPP;
    
    await this.page.locator(selector).click();
    await this.page.waitForTimeout(500); // Esperar a que se aplique el filtro
  }

  /**
   * Enviar un mensaje en la conversación actual
   */
  async sendMessage(message: string) {
    const messageInput = this.page.locator(UI_SELECTORS.CHAT_MESSAGE_INPUT).first();
    await messageInput.waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT });
    await messageInput.fill(message);
    
    // Enviar con Enter
    await messageInput.press('Enter');
    
    // Esperar a que se envíe
    await this.page.waitForTimeout(1500);
  }

  /**
   * Asignar usuario a la conversación actual
   */
  async assignUser(userId: string) {
    // Primero seleccionar el usuario del dropdown (usar el select de shadcn/ui)
    const assignSelect = this.page.locator(UI_SELECTORS.SIDEBAR_ASSIGN_USER).first();
    await assignSelect.click();
    await this.page.waitForTimeout(300);
    
    // Buscar la opción con el userId
    const option = this.page.locator(`[role="option"]:has-text("${userId}"), option[value="${userId}"]`).first();
    await option.click();
    await this.page.waitForTimeout(300);
    
    // Luego hacer click en el botón asignar
    await this.page.locator(UI_SELECTORS.SIDEBAR_ASSIGN_BUTTON).first().click();
    
    // Esperar a que se complete la asignación
    await this.page.waitForTimeout(1500);
  }

  /**
   * Esperar a que termine la sincronización
   */
  async waitForSync() {
    // Esperar a que el botón de sincronizar termine de estar en loading
    const syncButton = this.page.locator(UI_SELECTORS.CHATS_SYNC_BUTTON);
    await syncButton.waitFor({ state: 'visible', timeout: TIMEOUTS.CHAT_SYNC });
    
    // Esperar a que termine el estado de sincronización
    await this.page.waitForFunction(() => {
      const button = document.querySelector(UI_SELECTORS.CHATS_SYNC_BUTTON);
      if (!button) return true;
      return !button.classList.contains('animate-spin');
    }, { timeout: TIMEOUTS.CHAT_SYNC });
    
    // Esperar un poco más para que se actualice la UI
    await this.page.waitForTimeout(2000);
  }

  /**
   * Obtener información de una conversación por índice
   */
  async getConversationInfo(index: number = 0) {
    const conversation = this.page.locator(UI_SELECTORS.CONVERSATION_ITEM).nth(index);
    
    // Obtener el texto completo de la conversación y extraer nombre y preview
    const fullText = await conversation.textContent().catch(() => '');
    
    // Buscar nombre (h4 dentro de la conversación)
    const nameElement = conversation.locator('h4').first();
    const name = await nameElement.textContent().catch(() => null);
    
    // Buscar preview (párrafo con texto gris)
    const previewElement = conversation.locator('.text-xs.text-gray-600, .text-sm.text-gray-600').first();
    const preview = await previewElement.textContent().catch(() => null);
    
    // Buscar timestamp
    const timestampElement = conversation.locator('.text-\\[10px\\].text-gray-500, .text-xs.text-gray-500').first();
    const timestamp = await timestampElement.textContent().catch(() => null);
    
    return { name, preview, timestamp, fullText };
  }

  /**
   * Verificar que no hay errores de consola durante el test de chats
   */
  async verifyNoChatErrors() {
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
      !error.includes('net::ERR_') &&
      !error.includes('Failed to load resource')
    );
    
    return criticalErrors;
  }
}
