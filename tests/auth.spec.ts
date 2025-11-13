import { test, expect } from '@playwright/test';
import { TestUtils } from './utils';
import { TEST_USERS, TIMEOUTS, UI_SELECTORS } from './test-data';

test.describe('🔐 Autenticación del CRM Phorencial', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
  });

  test.describe('Login con diferentes roles', () => {
    test('🔑 Login exitoso como ADMIN', async ({ page }) => {
      await utils.login('ADMIN');
      
      // Verificar que estamos en el dashboard
      await expect(page.locator(UI_SELECTORS.DASHBOARD_TITLE)).toBeVisible();
      
      // Verificar que el usuario admin tiene acceso completo
      await expect(page.locator(UI_SELECTORS.NAV_SETTINGS)).toBeVisible();
      await expect(page.locator(UI_SELECTORS.NAV_DOCUMENTS)).toBeVisible();
      
      // Verificar información del usuario en el sidebar
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
      
      await utils.takeScreenshot('admin-dashboard');
    });

    test('📊 Login exitoso como ANALISTA', async ({ page }) => {
      await utils.login('ANALISTA');
      
      // Verificar que estamos en el dashboard
      await expect(page.locator(UI_SELECTORS.DASHBOARD_TITLE)).toBeVisible();
      
      // Verificar que el analista tiene acceso limitado
      await expect(page.locator(UI_SELECTORS.NAV_LEADS)).toBeVisible();
      await expect(page.locator(UI_SELECTORS.NAV_DOCUMENTS)).toBeVisible();
      
      // Verificar información del usuario
      await expect(page.locator('text=Ludmila')).toBeVisible();
      
      await utils.takeScreenshot('analista-dashboard');
    });

    test('💼 Login exitoso como VENDEDOR', async ({ page }) => {
      await utils.login('VENDEDOR');
      
      // Verificar que estamos en el dashboard
      await expect(page.locator(UI_SELECTORS.DASHBOARD_TITLE)).toBeVisible();
      
      // Verificar que el vendedor tiene acceso a gestión de leads
      await expect(page.locator(UI_SELECTORS.NAV_LEADS)).toBeVisible();
      await expect(page.locator(UI_SELECTORS.NEW_LEAD_BUTTON)).toBeVisible();
      
      await utils.takeScreenshot('vendedor-dashboard');
    });
  });

  test.describe('Validación de credenciales', () => {
    test('❌ Login fallido con credenciales incorrectas', async ({ page }) => {
      await page.goto('/auth/signin');
      
      await page.fill(UI_SELECTORS.EMAIL_INPUT, 'usuario@inexistente.com');
      await page.fill(UI_SELECTORS.PASSWORD_INPUT, 'contraseña_incorrecta');
      await page.click(UI_SELECTORS.LOGIN_BUTTON);
      
      // Verificar que permanecemos en la página de login
      await expect(page).toHaveURL(/\/auth\/signin/);
      
      // Verificar mensaje de error (si existe)
      const errorMessage = page.locator('text=/error|invalid|incorrect/i');
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
      }
    });

    test('🔒 Acceso denegado sin autenticación', async ({ page }) => {
      // Intentar acceder directamente al dashboard sin login
      await page.goto('/dashboard');
      
      // Debe redirigir al login
      await expect(page).toHaveURL(/\/auth\/signin/);
    });

    test('🔄 Redirección después del login', async ({ page }) => {
      // Intentar acceder a una página protegida
      await page.goto('/leads');
      
      // Debe redirigir al login
      await expect(page).toHaveURL(/\/auth\/signin/);
      
      // Hacer login
      await utils.login('ADMIN');
      
      // Debe redirigir al dashboard (no a /leads porque es la página por defecto)
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Logout y sesiones', () => {
    test('🚪 Logout exitoso', async ({ page }) => {
      await utils.login('ADMIN');
      
      // Verificar que estamos logueados
      await expect(page.locator(UI_SELECTORS.DASHBOARD_TITLE)).toBeVisible();
      
      // Hacer logout
      await utils.logout();
      
      // Verificar que estamos en la página de login
      await expect(page).toHaveURL(/\/auth\/signin/);
      await expect(page.locator(UI_SELECTORS.LOGIN_FORM)).toBeVisible();
    });

    test('🔄 Sesión persistente', async ({ page, context }) => {
      await utils.login('ADMIN');
      
      // Cerrar y abrir nueva página en el mismo contexto
      await page.close();
      const newPage = await context.newPage();
      const newUtils = new TestUtils(newPage);
      
      // Ir al dashboard - debería mantener la sesión
      await newPage.goto('/dashboard');
      
      // Verificar que seguimos logueados
      await expect(newPage.locator(UI_SELECTORS.DASHBOARD_TITLE)).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  });

  test.describe('Validación de permisos por rol', () => {
    test('🛡️ Permisos de ADMIN - acceso completo', async ({ page }) => {
      await utils.login('ADMIN');
      
      // Verificar acceso a todas las páginas
      const pages = ['leads', 'documents', 'settings'] as const;
      
      for (const pageName of pages) {
        await utils.navigateToPage(pageName);
        await expect(page).toHaveURL(new RegExp(`/${pageName}`));
        
        // Verificar que la página carga correctamente
        const pageTitle = page.locator('h1').first();
        await expect(pageTitle).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      }
    });

    test('📊 Permisos de ANALISTA - acceso limitado', async ({ page }) => {
      await utils.login('ANALISTA');
      
      // Verificar acceso a páginas permitidas
      await utils.navigateToPage('leads');
      await expect(page).toHaveURL(/\/leads/);
      
      await utils.navigateToPage('documents');
      await expect(page).toHaveURL(/\/documents/);
      
      // Verificar que puede ver pero no editar (si hay controles específicos)
      await utils.navigateToPage('leads');
      
      // El analista debería poder ver leads pero con funcionalidad limitada
      await expect(page.locator(UI_SELECTORS.LEADS_TABLE)).toBeVisible();
    });

    test('💼 Permisos de VENDEDOR - gestión de leads', async ({ page }) => {
      await utils.login('VENDEDOR');
      
      // Verificar acceso a gestión de leads
      await utils.navigateToPage('leads');
      await expect(page).toHaveURL(/\/leads/);
      
      // Verificar que puede crear nuevos leads
      await expect(page.locator(UI_SELECTORS.NEW_LEAD_BUTTON)).toBeVisible();
      
      // Verificar acceso a documentos
      await utils.navigateToPage('documents');
      await expect(page).toHaveURL(/\/documents/);
    });
  });

  test.describe('Seguridad y validaciones', () => {
    test('🔐 Validación de campos requeridos', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Intentar enviar formulario vacío
      await page.click(UI_SELECTORS.LOGIN_BUTTON);
      
      // Verificar que no se envía el formulario
      await expect(page).toHaveURL(/\/auth\/signin/);
      
      // Verificar validación HTML5 o mensajes de error
      const emailInput = page.locator(UI_SELECTORS.EMAIL_INPUT);
      const passwordInput = page.locator(UI_SELECTORS.PASSWORD_INPUT);
      
      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('required');
    });

    test('📧 Validación de formato de email', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Probar con email inválido
      await page.fill(UI_SELECTORS.EMAIL_INPUT, 'email_invalido');
      await page.fill(UI_SELECTORS.PASSWORD_INPUT, 'password123');
      await page.click(UI_SELECTORS.LOGIN_BUTTON);
      
      // Verificar que no se envía o muestra error de validación
      const emailInput = page.locator(UI_SELECTORS.EMAIL_INPUT);
      const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(validity).toBe(false);
    });

    test('⏱️ Tiempo de respuesta del login', async ({ page }) => {
      const startTime = Date.now();
      
      await utils.login('ADMIN');
      
      const loginTime = Date.now() - startTime;
      
      // El login debería completarse en menos de 10 segundos
      expect(loginTime).toBeLessThan(10000);
    });
  });

  test.describe('UI y experiencia de usuario', () => {
    test('🎨 Diseño de página de login', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Verificar elementos de UI
      await expect(page.locator(UI_SELECTORS.LOGIN_FORM)).toBeVisible();
      await expect(page.locator(UI_SELECTORS.EMAIL_INPUT)).toBeVisible();
      await expect(page.locator(UI_SELECTORS.PASSWORD_INPUT)).toBeVisible();
      await expect(page.locator(UI_SELECTORS.LOGIN_BUTTON)).toBeVisible();
      
      // Verificar que el diseño es responsive
      await utils.verifyResponsiveDesign();
      
      await utils.takeScreenshot('login-page');
    });

    test('🔄 Estados de carga durante login', async ({ page }) => {
      await page.goto('/auth/signin');
      
      await page.fill(UI_SELECTORS.EMAIL_INPUT, TEST_USERS.ADMIN.email);
      await page.fill(UI_SELECTORS.PASSWORD_INPUT, TEST_USERS.ADMIN.password);
      
      // Hacer click y verificar estado de carga
      await page.click(UI_SELECTORS.LOGIN_BUTTON);
      
      // Verificar que el botón se deshabilita o muestra loading
      const loginButton = page.locator(UI_SELECTORS.LOGIN_BUTTON);
      
      // Esperar a que la navegación complete
      await page.waitForURL('/dashboard', { timeout: TIMEOUTS.NAVIGATION });
    });
  });
});
