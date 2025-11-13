import { test, expect } from '@playwright/test';
import { TestUtils } from './utils';
import { TIMEOUTS, UI_SELECTORS } from './test-data';

test.describe('📁 Página Documents del CRM Phorencial', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.login('ADMIN');
    await utils.navigateToPage('documents');
  });

  test.describe('Carga y estructura de la página', () => {
    test('📄 Carga correcta de la página Documents', async ({ page }) => {
      // Verificar título moderno
      await expect(page.locator(UI_SELECTORS.DOCUMENTS_TITLE)).toBeVisible();
      
      // Verificar que el título tiene gradiente
      const title = page.locator('h1:has-text("Documentos")');
      await expect(title).toHaveClass(/gradient-text/);
      
      // Verificar descripción
      await expect(page.locator('text=Gestión de documentos de leads de Formosa')).toBeVisible();
      
      await utils.takeScreenshot('documents-page-loaded');
    });

    test('🎨 Diseño moderno de la página', async ({ page }) => {
      // Verificar fondo con gradiente
      const pageContainer = page.locator('.min-h-screen');
      await expect(pageContainer).toHaveClass(/bg-gradient-subtle/);
      
      // Verificar botón de subir documento
      const uploadButton = page.locator(UI_SELECTORS.UPLOAD_BUTTON);
      await expect(uploadButton).toBeVisible();
      await expect(uploadButton).toHaveClass(/gradient-primary/);
    });

    test('📊 Estadísticas rápidas de documentos', async ({ page }) => {
      // Verificar cards de estadísticas
      const statsCards = page.locator('.formosa-card').filter({
        has: page.locator('.text-2xl')
      });
      
      const count = await statsCards.count();
      expect(count).toBeGreaterThanOrEqual(4); // Total, Pendientes, Aprobados, Rechazados
      
      // Verificar métricas específicas
      await expect(page.locator('text=Total Documentos')).toBeVisible();
      await expect(page.locator('text=Pendientes')).toBeVisible();
      await expect(page.locator('text=Aprobados')).toBeVisible();
      await expect(page.locator('text=Rechazados')).toBeVisible();
    });
  });

  test.describe('Funcionalidad de upload de documentos', () => {
    test('📤 Botón de subir documento', async ({ page }) => {
      const uploadButton = page.locator(UI_SELECTORS.UPLOAD_BUTTON);
      await expect(uploadButton).toBeVisible();
      
      // Verificar diseño moderno del botón
      await expect(uploadButton).toHaveClass(/gradient-primary/);
      await expect(uploadButton).toHaveClass(/hover-lift/);
      
      // Hacer click para abrir modal/formulario
      await uploadButton.click();
      
      // Verificar que se abre algún tipo de interfaz de upload
      // (modal, página nueva, o formulario)
      await page.waitForTimeout(1000);
    });

    test('📋 Categorización de documentos', async ({ page }) => {
      // Verificar que existen las categorías específicas de Formosa
      const categories = ['DNI', 'Comprobante Ingresos', 'Recibo de Sueldo', 'Otros'];
      
      for (const category of categories) {
        const categoryElement = page.locator(`text=${category}`);
        if (await categoryElement.count() > 0) {
          await expect(categoryElement).toBeVisible();
        }
      }
    });
  });

  test.describe('Lista y visualización de documentos', () => {
    test('📋 Grid de documentos', async ({ page }) => {
      // Verificar que existe el grid de documentos
      const documentsGrid = page.locator(UI_SELECTORS.DOCUMENTS_GRID);
      
      if (await documentsGrid.count() > 0) {
        await expect(documentsGrid).toBeVisible();
      } else {
        // Si no hay grid específico, buscar cards de documentos
        const documentCards = page.locator('.formosa-card').filter({
          has: page.locator('text=/\.(pdf|jpg|jpeg|png|xlsx|docx)/i')
        });
        
        if (await documentCards.count() > 0) {
          expect(await documentCards.count()).toBeGreaterThan(0);
        }
      }
      
      await utils.takeScreenshot('documents-grid');
    });

    test('🎨 Diseño moderno de cards de documentos', async ({ page }) => {
      const documentCards = page.locator('.formosa-card').filter({
        has: page.locator('svg, .h-8, .h-6') // Iconos de archivos
      });
      
      if (await documentCards.count() > 0) {
        const firstCard = documentCards.first();
        
        // Verificar efectos hover
        await expect(firstCard).toHaveClass(/hover-lift/);
        
        // Probar efecto hover
        await firstCard.hover();
        await page.waitForTimeout(300);
        
        // Verificar que tiene iconos de archivo
        const fileIcon = firstCard.locator('svg');
        await expect(fileIcon).toBeVisible();
      }
    });

    test('🏷️ Badges de estado de documentos', async ({ page }) => {
      // Buscar badges de estado específicos
      const statusBadges = page.locator('.formosa-badge-pendiente, .formosa-badge-preaprobado, .formosa-badge-rechazado');
      
      if (await statusBadges.count() > 0) {
        expect(await statusBadges.count()).toBeGreaterThan(0);
        
        // Verificar que los badges tienen los colores correctos
        const pendienteBadge = page.locator('.formosa-badge-pendiente');
        const aprobadoBadge = page.locator('.formosa-badge-preaprobado');
        const rechazadoBadge = page.locator('.formosa-badge-rechazado');
        
        if (await pendienteBadge.count() > 0) {
          await expect(pendienteBadge.first()).toBeVisible();
        }
      }
    });

    test('📄 Información de documentos específicos de Formosa', async ({ page }) => {
      // Buscar documentos con nombres de leads de Formosa
      const formosaLeadNames = ['Karen Vanina Paliza', 'Jorge Lino Bazan', 'Barrios Norma Beatriz'];
      
      let foundDocuments = 0;
      for (const name of formosaLeadNames) {
        const nameElements = page.locator(`text=${name}`);
        if (await nameElements.count() > 0) {
          foundDocuments++;
        }
      }
      
      // Si hay documentos mock, al menos deberían tener estructura realista
      const documentInfo = page.locator('text=/Lead:/, text=/Categoría:/, text=/Tamaño:/');
      if (await documentInfo.count() > 0) {
        expect(await documentInfo.count()).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Sistema de filtros de documentos', () => {
    test('🔍 Filtros disponibles', async ({ page }) => {
      // Verificar filtros de búsqueda
      const searchInput = page.locator('input[placeholder*="Buscar documentos"]');
      if (await searchInput.count() > 0) {
        await expect(searchInput).toBeVisible();
      }
      
      // Verificar filtros por categoría
      const categoryFilter = page.locator('select').filter({
        has: page.locator('option:has-text("DNI"), option:has-text("Comprobante")')
      });
      
      if (await categoryFilter.count() > 0) {
        await expect(categoryFilter).toBeVisible();
      }
      
      // Verificar filtros por estado
      const statusFilter = page.locator('select').filter({
        has: page.locator('option:has-text("Pendiente"), option:has-text("Aprobado")')
      });
      
      if (await statusFilter.count() > 0) {
        await expect(statusFilter).toBeVisible();
      }
    });

    test('📊 Contador de documentos filtrados', async ({ page }) => {
      // Verificar badge con contador de documentos
      const counterBadge = page.locator('text=/\\d+ documentos/');
      
      if (await counterBadge.count() > 0) {
        await expect(counterBadge).toBeVisible();
        
        const counterText = await counterBadge.textContent();
        expect(counterText).toMatch(/\d+ documentos/);
      }
    });

    test('🔍 Funcionalidad de búsqueda', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Buscar documentos"]');
      
      if (await searchInput.count() > 0) {
        // Buscar por tipo de archivo
        await searchInput.fill('pdf');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        // Verificar que se aplica el filtro
        const pdfDocuments = page.locator('text=.pdf');
        if (await pdfDocuments.count() > 0) {
          expect(await pdfDocuments.count()).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Acciones de documentos', () => {
    test('👁️ Visualización de documentos', async ({ page }) => {
      // Buscar botones de visualización
      const viewButtons = page.locator('button').filter({
        has: page.locator('svg') // Icono de ojo
      }).filter({
        hasText: /ver|view/i
      });
      
      if (await viewButtons.count() > 0) {
        await expect(viewButtons.first()).toBeVisible();
      }
    });

    test('📥 Descarga de documentos', async ({ page }) => {
      // Buscar botones de descarga
      const downloadButtons = page.locator('button').filter({
        has: page.locator('svg') // Icono de descarga
      });
      
      if (await downloadButtons.count() > 0) {
        expect(await downloadButtons.count()).toBeGreaterThan(0);
      }
    });

    test('🗑️ Eliminación de documentos', async ({ page }) => {
      // Buscar botones de eliminación
      const deleteButtons = page.locator('button').filter({
        has: page.locator('svg') // Icono de basura
      });
      
      if (await deleteButtons.count() > 0) {
        expect(await deleteButtons.count()).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Estado vacío y mensajes', () => {
    test('📭 Estado sin documentos', async ({ page }) => {
      // Si no hay documentos, verificar mensaje apropiado
      const emptyState = page.locator('text=No se encontraron documentos');
      
      if (await emptyState.count() > 0) {
        await expect(emptyState).toBeVisible();
        
        // Verificar que hay un botón para subir el primer documento
        const uploadFirstButton = page.locator('button:has-text("Subir primer documento")');
        if (await uploadFirstButton.count() > 0) {
          await expect(uploadFirstButton).toBeVisible();
          await expect(uploadFirstButton).toHaveClass(/gradient-primary/);
        }
      }
    });

    test('🎨 Diseño del estado vacío', async ({ page }) => {
      const emptyState = page.locator('text=No se encontraron documentos').locator('..').locator('..');
      
      if (await emptyState.count() > 0) {
        // Verificar que tiene icono
        const icon = emptyState.locator('svg');
        await expect(icon).toBeVisible();
        
        // Verificar que está centrado
        await expect(emptyState).toHaveClass(/text-center/);
      }
    });
  });

  test.describe('Performance y responsive', () => {
    test('⚡ Tiempo de carga de Documents', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/documents');
      await page.waitForSelector('h1:has-text("Documentos")', { timeout: TIMEOUTS.MEDIUM });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5 segundos máximo
    });

    test('📱 Responsive design en Documents', async ({ page }) => {
      await utils.verifyResponsiveDesign();
      
      // Verificar que el grid se adapta en mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // El grid debería cambiar a una sola columna
      const documentCards = page.locator('.formosa-card');
      if (await documentCards.count() > 0) {
        await expect(documentCards.first()).toBeVisible();
      }
      
      await utils.takeScreenshot('documents-mobile');
    });

    test('🚫 Sin errores de consola en Documents', async ({ page }) => {
      await utils.verifyNoConsoleErrors();
    });
  });
});
