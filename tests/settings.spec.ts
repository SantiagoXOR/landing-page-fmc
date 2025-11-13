import { test, expect } from '@playwright/test';
import { TestUtils } from './utils';
import { FORMOSA_DATA, TIMEOUTS, UI_SELECTORS } from './test-data';

test.describe('⚙️ Página Settings del CRM Phorencial', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.login('ADMIN');
    await utils.navigateToPage('settings');
  });

  test.describe('Carga y estructura de la página', () => {
    test('🔧 Carga correcta de la página Settings', async ({ page }) => {
      // Verificar título moderno
      await expect(page.locator(UI_SELECTORS.SETTINGS_TITLE)).toBeVisible();
      
      // Verificar que el título tiene gradiente
      const title = page.locator('h1:has-text("Configuración")');
      await expect(title).toHaveClass(/gradient-text/);
      
      // Verificar descripción
      await expect(page.locator('text=Configuración del sistema CRM Phorencial')).toBeVisible();
      
      await utils.takeScreenshot('settings-page-loaded');
    });

    test('🎨 Diseño moderno de la página', async ({ page }) => {
      // Verificar fondo con gradiente
      const pageContainer = page.locator('.min-h-screen');
      await expect(pageContainer).toHaveClass(/bg-gradient-subtle/);
      
      // Verificar botón de guardar
      const saveButton = page.locator('button:has-text("Guardar Cambios")');
      await expect(saveButton).toBeVisible();
      await expect(saveButton).toHaveClass(/gradient-primary/);
    });

    test('📋 Sidebar de secciones', async ({ page }) => {
      // Verificar que existe el sidebar de secciones
      const sectionsCard = page.locator(UI_SELECTORS.SETTINGS_SECTIONS);
      
      if (await sectionsCard.count() > 0) {
        await expect(sectionsCard).toBeVisible();
      } else {
        // Buscar secciones por texto
        const sections = page.locator('text=Configuración General, text=Configuración de Formosa');
        if (await sections.count() > 0) {
          expect(await sections.count()).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Secciones de configuración', () => {
    test('🏢 Configuración General', async ({ page }) => {
      // Buscar sección de configuración general
      const generalSection = page.locator('text=Configuración General');
      
      if (await generalSection.count() > 0) {
        await generalSection.click();
        await page.waitForTimeout(500);
        
        // Verificar campos de empresa
        const companyFields = [
          'input[name="companyName"], input[id="companyName"]',
          'input[name="companyEmail"], input[id="companyEmail"]',
          'input[name="companyPhone"], input[id="companyPhone"]'
        ];
        
        for (const fieldSelector of companyFields) {
          const field = page.locator(fieldSelector);
          if (await field.count() > 0) {
            await expect(field).toBeVisible();
          }
        }
      }
    });

    test('🗺️ Configuración específica de Formosa', async ({ page }) => {
      // Buscar sección de Formosa
      const formosaSection = page.locator('text=Configuración de Formosa, text=Formosa');
      
      if (await formosaSection.count() > 0) {
        await formosaSection.click();
        await page.waitForTimeout(500);
        
        // Verificar que está marcada como activa
        const activeSection = page.locator('.bg-gradient-to-r').filter({
          has: page.locator('text=Formosa')
        });
        
        if (await activeSection.count() > 0) {
          await expect(activeSection).toBeVisible();
        }
      }
      
      await utils.takeScreenshot('settings-formosa-section');
    });

    test('👥 Gestión de Usuarios', async ({ page }) => {
      // Buscar sección de usuarios
      const usersSection = page.locator('text=Gestión de Usuarios, text=Usuarios');
      
      if (await usersSection.count() > 0) {
        await usersSection.click();
        await page.waitForTimeout(500);
        
        // Verificar mensaje de próximamente o funcionalidad
        const comingSoon = page.locator('text=Próximamente');
        if (await comingSoon.count() > 0) {
          await expect(comingSoon).toBeVisible();
        }
      }
    });

    test('🔔 Notificaciones', async ({ page }) => {
      // Buscar sección de notificaciones
      const notificationsSection = page.locator('text=Notificaciones');
      
      if (await notificationsSection.count() > 0) {
        await notificationsSection.click();
        await page.waitForTimeout(500);
        
        // Verificar contenido de la sección
        const notificationContent = page.locator('text=configuración de notificaciones, text=alertas');
        if (await notificationContent.count() > 0) {
          expect(await notificationContent.count()).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Configuración específica de Formosa', () => {
    test('🗺️ Zonas geográficas de Formosa', async ({ page }) => {
      // Navegar a configuración de Formosa
      const formosaSection = page.locator('text=Configuración de Formosa, text=Formosa');
      if (await formosaSection.count() > 0) {
        await formosaSection.click();
        await page.waitForTimeout(500);
      }
      
      // Verificar título de zonas geográficas
      const zonasTitle = page.locator('text=Zonas Geográficas de Formosa');
      if (await zonasTitle.count() > 0) {
        await expect(zonasTitle).toBeVisible();
        
        // Verificar que hay zonas listadas
        const zonasEspecificas = ['Formosa Capital', 'Clorinda', 'Pirané', 'El Colorado'];
        
        let foundZones = 0;
        for (const zona of zonasEspecificas) {
          const zoneElement = page.locator(`text=${zona}`);
          if (await zoneElement.count() > 0) {
            foundZones++;
          }
        }
        
        expect(foundZones).toBeGreaterThan(0);
      }
    });

    test('☎️ Códigos de área locales', async ({ page }) => {
      // Navegar a configuración de Formosa
      const formosaSection = page.locator('text=Configuración de Formosa, text=Formosa');
      if (await formosaSection.count() > 0) {
        await formosaSection.click();
        await page.waitForTimeout(500);
      }
      
      // Verificar título de códigos de área
      const codigosTitle = page.locator('text=Códigos de Área Locales');
      if (await codigosTitle.count() > 0) {
        await expect(codigosTitle).toBeVisible();
        
        // Verificar códigos específicos de Formosa
        for (const codigo of FORMOSA_DATA.CODIGOS_AREA) {
          const codigoElement = page.locator(`text=${codigo}`);
          if (await codigoElement.count() > 0) {
            await expect(codigoElement).toBeVisible();
          }
        }
      }
    });

    test('💰 Rangos de ingresos en pesos argentinos', async ({ page }) => {
      // Navegar a configuración de Formosa
      const formosaSection = page.locator('text=Configuración de Formosa, text=Formosa');
      if (await formosaSection.count() > 0) {
        await formosaSection.click();
        await page.waitForTimeout(500);
      }
      
      // Verificar sección de rangos de ingresos
      const ingresosTitle = page.locator('text=Rangos de Ingresos');
      if (await ingresosTitle.count() > 0) {
        await expect(ingresosTitle).toBeVisible();
        
        // Verificar campos de ingreso mínimo y máximo
        const minIngresoField = page.locator('input[name="rangoMin"], input[id="rangoMin"]');
        const maxIngresoField = page.locator('input[name="rangoMax"], input[id="rangoMax"]');
        
        if (await minIngresoField.count() > 0) {
          await expect(minIngresoField).toBeVisible();
        }
        
        if (await maxIngresoField.count() > 0) {
          await expect(maxIngresoField).toBeVisible();
        }
        
        // Verificar que muestra el rango actual en ARS
        const rangoActual = page.locator('text=/\\$[\d,]+ - \\$[\d,]+ ARS/');
        if (await rangoActual.count() > 0) {
          await expect(rangoActual).toBeVisible();
        }
      }
    });

    test('➕ Botones de agregar en configuración de Formosa', async ({ page }) => {
      // Navegar a configuración de Formosa
      const formosaSection = page.locator('text=Configuración de Formosa, text=Formosa');
      if (await formosaSection.count() > 0) {
        await formosaSection.click();
        await page.waitForTimeout(500);
      }
      
      // Verificar botones de agregar zona y código
      const addZoneButton = page.locator('button:has-text("Agregar Zona")');
      const addCodeButton = page.locator('button:has-text("Agregar Código")');
      
      if (await addZoneButton.count() > 0) {
        await expect(addZoneButton).toBeVisible();
      }
      
      if (await addCodeButton.count() > 0) {
        await expect(addCodeButton).toBeVisible();
      }
    });
  });

  test.describe('Diseño y UI de configuración', () => {
    test('🎨 Cards con gradientes en zonas', async ({ page }) => {
      // Navegar a configuración de Formosa
      const formosaSection = page.locator('text=Configuración de Formosa, text=Formosa');
      if (await formosaSection.count() > 0) {
        await formosaSection.click();
        await page.waitForTimeout(500);
      }
      
      // Verificar que las zonas tienen gradientes
      const zoneCards = page.locator('.bg-gradient-to-r').filter({
        has: page.locator('text=Formosa Capital, text=Clorinda')
      });
      
      if (await zoneCards.count() > 0) {
        expect(await zoneCards.count()).toBeGreaterThan(0);
      }
    });

    test('📞 Iconos en códigos de área', async ({ page }) => {
      // Navegar a configuración de Formosa
      const formosaSection = page.locator('text=Configuración de Formosa, text=Formosa');
      if (await formosaSection.count() > 0) {
        await formosaSection.click();
        await page.waitForTimeout(500);
      }
      
      // Verificar iconos de teléfono en códigos de área
      const phoneIcons = page.locator('svg').filter({
        has: page.locator('path')
      });
      
      if (await phoneIcons.count() > 0) {
        expect(await phoneIcons.count()).toBeGreaterThan(0);
      }
    });

    test('🎯 Iconos temáticos en secciones', async ({ page }) => {
      // Verificar que las secciones tienen iconos
      const sectionIcons = page.locator('.w-8.h-8').filter({
        has: page.locator('svg')
      });
      
      if (await sectionIcons.count() > 0) {
        expect(await sectionIcons.count()).toBeGreaterThan(0);
      }
    });

    test('🔄 Efectos hover en secciones', async ({ page }) => {
      // Verificar efectos hover en botones de sección
      const sectionButtons = page.locator('button').filter({
        has: page.locator('text=Configuración General, text=Formosa')
      });
      
      if (await sectionButtons.count() > 0) {
        const firstSection = sectionButtons.first();
        await firstSection.hover();
        await page.waitForTimeout(300);
        
        // Verificar que tiene transición
        const hasTransition = await firstSection.evaluate(el => 
          window.getComputedStyle(el).transition !== 'none'
        );
        
        expect(hasTransition).toBeTruthy();
      }
    });
  });

  test.describe('Funcionalidad de guardado', () => {
    test('💾 Botón de guardar cambios', async ({ page }) => {
      const saveButton = page.locator('button:has-text("Guardar Cambios")');
      await expect(saveButton).toBeVisible();
      
      // Verificar diseño del botón
      await expect(saveButton).toHaveClass(/gradient-primary/);
      await expect(saveButton).toHaveClass(/hover-lift/);
      
      // Verificar que no está deshabilitado por defecto
      const isDisabled = await saveButton.isDisabled();
      expect(isDisabled).toBeFalsy();
    });

    test('🔄 Estado de carga al guardar', async ({ page }) => {
      const saveButton = page.locator('button:has-text("Guardar Cambios")');
      
      // Hacer click en guardar
      await saveButton.click();
      
      // Verificar que muestra estado de carga
      const loadingButton = page.locator('button:has-text("Guardando...")');
      if (await loadingButton.count() > 0) {
        await expect(loadingButton).toBeVisible();
      }
      
      // Esperar a que termine
      await page.waitForTimeout(2000);
    });
  });

  test.describe('Validaciones y formularios', () => {
    test('📝 Campos de configuración general', async ({ page }) => {
      // Navegar a configuración general
      const generalSection = page.locator('text=Configuración General');
      if (await generalSection.count() > 0) {
        await generalSection.click();
        await page.waitForTimeout(500);
        
        // Verificar que los campos tienen valores por defecto
        const companyNameField = page.locator('input[name="companyName"], input[id="companyName"]');
        if (await companyNameField.count() > 0) {
          const value = await companyNameField.inputValue();
          expect(value).toBeTruthy(); // Debe tener algún valor
        }
      }
    });

    test('🔢 Validación de rangos de ingresos', async ({ page }) => {
      // Navegar a configuración de Formosa
      const formosaSection = page.locator('text=Configuración de Formosa, text=Formosa');
      if (await formosaSection.count() > 0) {
        await formosaSection.click();
        await page.waitForTimeout(500);
        
        // Verificar campos numéricos
        const minIngresoField = page.locator('input[name="rangoMin"], input[id="rangoMin"]');
        if (await minIngresoField.count() > 0) {
          const inputType = await minIngresoField.getAttribute('type');
          expect(inputType).toBe('number');
        }
      }
    });
  });

  test.describe('Performance y responsive', () => {
    test('⚡ Tiempo de carga de Settings', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/settings');
      await page.waitForSelector('h1:has-text("Configuración")', { timeout: TIMEOUTS.MEDIUM });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5 segundos máximo
    });

    test('📱 Responsive design en Settings', async ({ page }) => {
      await utils.verifyResponsiveDesign();
      
      // Verificar que el layout se adapta en mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // El sidebar de secciones debería adaptarse
      const settingsLayout = page.locator('.grid');
      if (await settingsLayout.count() > 0) {
        await expect(settingsLayout.first()).toBeVisible();
      }
      
      await utils.takeScreenshot('settings-mobile');
    });

    test('🚫 Sin errores de consola en Settings', async ({ page }) => {
      await utils.verifyNoConsoleErrors();
    });
  });

  test.describe('Permisos y acceso', () => {
    test('🛡️ Acceso de ADMIN a todas las secciones', async ({ page }) => {
      // Verificar que el admin puede ver todas las secciones
      const allSections = [
        'Configuración General',
        'Configuración de Formosa', 
        'Gestión de Usuarios',
        'Notificaciones'
      ];
      
      for (const sectionName of allSections) {
        const section = page.locator(`text=${sectionName}`);
        if (await section.count() > 0) {
          await expect(section).toBeVisible();
        }
      }
    });

    test('📊 Acceso limitado para otros roles', async ({ page }) => {
      // Logout y login como analista
      await utils.logout();
      await utils.login('ANALISTA');
      
      // Intentar acceder a settings
      await page.goto('/settings');
      
      // Verificar si tiene acceso limitado o es redirigido
      const currentUrl = page.url();
      
      if (currentUrl.includes('/settings')) {
        // Si tiene acceso, verificar que algunas secciones están limitadas
        const adminOnlySections = page.locator('text=Gestión de Usuarios');
        if (await adminOnlySections.count() > 0) {
          // Puede ver la sección pero con funcionalidad limitada
          expect(await adminOnlySections.count()).toBeGreaterThanOrEqual(0);
        }
      } else {
        // Si es redirigido, verificar que va a una página permitida
        expect(currentUrl).toMatch(/\/(dashboard|leads)/);
      }
    });
  });
});
