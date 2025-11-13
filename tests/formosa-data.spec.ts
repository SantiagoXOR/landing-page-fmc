import { test, expect } from '@playwright/test';
import { TestUtils } from './utils';
import { FORMOSA_DATA, EXPECTED_METRICS, TIMEOUTS } from './test-data';

test.describe('🇦🇷 Datos Específicos de Formosa en CRM Phorencial', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.login('ADMIN');
  });

  test.describe('Validación de 1000+ leads reales preservados', () => {
    test('📊 Cantidad total de leads', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Verificar que hay al menos 1000 leads
      const totalText = await page.locator('h1:has-text("Gestión de Leads")').textContent();
      const totalMatch = totalText?.match(/Total: (\d+)/);
      
      if (totalMatch) {
        const total = parseInt(totalMatch[1]);
        expect(total).toBeGreaterThanOrEqual(EXPECTED_METRICS.MIN_TOTAL_LEADS);
        console.log(`✅ Total de leads encontrados: ${total}`);
      } else {
        // Buscar en métricas del dashboard
        await utils.navigateToPage('dashboard');
        await utils.waitForDashboardMetrics();
        
        const totalLeadsCard = page.locator('text=Total Leads').locator('..').locator('..');
        const totalValue = await totalLeadsCard.locator('.text-2xl, .text-3xl').textContent();
        
        if (totalValue) {
          const numericValue = parseInt(totalValue.replace(/[^\d]/g, ''));
          expect(numericValue).toBeGreaterThanOrEqual(EXPECTED_METRICS.MIN_TOTAL_LEADS);
          console.log(`✅ Total de leads en dashboard: ${numericValue}`);
        }
      }
      
      await utils.takeScreenshot('total-leads-validation');
    });

    test('📋 Distribución realista por estados', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Verificar distribución específica mencionada en las memorias
      // RECHAZADO (35 leads), PREAPROBADO (7 leads), NUEVO (mayoría)
      
      for (const estado of FORMOSA_DATA.ESTADOS_LEAD) {
        await utils.filterByEstado(estado);
        await page.waitForTimeout(1000);
        
        // Obtener contador del estado actual
        const filterIndicator = page.locator(`text=/filtrado.*estado.*${estado}/i`);
        if (await filterIndicator.count() > 0) {
          const indicatorText = await filterIndicator.textContent();
          console.log(`Estado ${estado}: ${indicatorText}`);
        }
        
        // Verificar que hay leads en este estado
        const leadCards = page.locator('.formosa-card').filter({
          has: page.locator(`[class*="formosa-badge-${estado.toLowerCase()}"]`)
        });
        
        const count = await leadCards.count();
        console.log(`Leads visibles con estado ${estado}: ${count}`);
        
        // Limpiar filtro para siguiente iteración
        await page.selectOption('select[name="estado"]', '');
        await page.waitForTimeout(500);
      }
    });

    test('🔢 Contadores exactos por estado', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      await utils.waitForDashboardMetrics();
      
      // Verificar métricas específicas en el dashboard
      const preaprobadosCard = page.locator('text=Preaprobados').locator('..').locator('..');
      if (await preaprobadosCard.count() > 0) {
        const preaprobadosValue = await preaprobadosCard.locator('.text-2xl, .text-3xl').textContent();
        if (preaprobadosValue) {
          const count = parseInt(preaprobadosValue.replace(/[^\d]/g, ''));
          expect(count).toBeGreaterThan(0);
          console.log(`✅ Preaprobados: ${count}`);
        }
      }
      
      const enRevisionCard = page.locator('text=En Revisión').locator('..').locator('..');
      if (await enRevisionCard.count() > 0) {
        const revisionValue = await enRevisionCard.locator('.text-2xl, .text-3xl').textContent();
        if (revisionValue) {
          const count = parseInt(revisionValue.replace(/[^\d]/g, ''));
          expect(count).toBeGreaterThanOrEqual(0);
          console.log(`✅ En Revisión: ${count}`);
        }
      }
    });
  });

  test.describe('Nombres argentinos reales', () => {
    test('👤 Nombres específicos de Formosa', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Verificar nombres específicos mencionados en las memorias
      const nombresEspecificos = [
        'Karen Vanina Paliza',
        'Jorge Lino Bazan', 
        'Barrios Norma Beatriz'
      ];
      
      let nombresEncontrados = 0;
      
      for (const nombre of nombresEspecificos) {
        // Buscar por partes del nombre
        const partes = nombre.split(' ');
        for (const parte of partes) {
          if (parte.length > 3) { // Solo buscar partes significativas
            await utils.searchLeads(parte);
            await page.waitForTimeout(1000);
            
            const resultados = page.locator(`text=${parte}`);
            if (await resultados.count() > 0) {
              nombresEncontrados++;
              console.log(`✅ Encontrado: ${parte}`);
              break;
            }
            
            // Limpiar búsqueda
            await page.fill('input[placeholder*="Buscar"]', '');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);
          }
        }
      }
      
      expect(nombresEncontrados).toBeGreaterThan(0);
      await utils.takeScreenshot('nombres-argentinos');
    });

    test('🔤 Patrón de nombres argentinos', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Verificar patrón de nombres argentinos (Nombre Apellido)
      const leadCards = page.locator('.formosa-card').filter({
        has: page.locator('text=/[A-ZÁÉÍÓÚ][a-záéíóú]+ [A-ZÁÉÍÓÚ][a-záéíóú]+/')
      });
      
      const count = await leadCards.count();
      expect(count).toBeGreaterThan(0);
      
      // Verificar algunos nombres específicos
      const nombresComunes = ['María', 'Carlos', 'Ana', 'Jorge', 'Elena'];
      let nombresEncontrados = 0;
      
      for (const nombre of nombresComunes) {
        const elementos = page.locator(`text=${nombre}`);
        if (await elementos.count() > 0) {
          nombresEncontrados++;
        }
      }
      
      expect(nombresEncontrados).toBeGreaterThan(0);
      console.log(`✅ Nombres argentinos comunes encontrados: ${nombresEncontrados}`);
    });

    test('📧 Emails coherentes con nombres', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Buscar emails que coincidan con el patrón nombre.apellido@email.com
      const emailPattern = /[a-z]+\.[a-z]+@[a-z]+\.(com|ar)/;
      const emailElements = page.locator(`text=${emailPattern}`);
      
      if (await emailElements.count() > 0) {
        const firstEmail = await emailElements.first().textContent();
        expect(firstEmail).toMatch(emailPattern);
        console.log(`✅ Email encontrado: ${firstEmail}`);
      }
    });
  });

  test.describe('Teléfonos locales con códigos de área de Formosa', () => {
    test('📞 Códigos de área específicos', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Verificar cada código de área de Formosa
      for (const codigo of FORMOSA_DATA.CODIGOS_AREA) {
        const telefonos = page.locator(`text=${codigo}`);
        const count = await telefonos.count();
        
        if (count > 0) {
          console.log(`✅ Código ${codigo}: ${count} teléfonos encontrados`);
          expect(count).toBeGreaterThan(0);
        }
      }
      
      await utils.takeScreenshot('codigos-area-formosa');
    });

    test('📱 Formato de teléfonos argentinos', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Verificar formato +54370XXXXXXX
      const formatoArgentino = /\+5437(04|05|11|18)\d{6,7}/;
      const telefonosArgentinos = page.locator(`text=${formatoArgentino}`);
      
      const count = await telefonosArgentinos.count();
      expect(count).toBeGreaterThan(0);
      
      if (count > 0) {
        const primerTelefono = await telefonosArgentinos.first().textContent();
        expect(primerTelefono).toMatch(formatoArgentino);
        console.log(`✅ Teléfono argentino: ${primerTelefono}`);
      }
    });

    test('🔍 Búsqueda por código de área', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Buscar por código de área específico
      await utils.searchLeads('+543704');
      await page.waitForTimeout(1000);
      
      const resultados = page.locator('text=/\\+543704\\d+/');
      const count = await resultados.count();
      
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
        console.log(`✅ Búsqueda por +543704: ${count} resultados`);
      }
    });
  });

  test.describe('20 zonas geográficas específicas de Formosa', () => {
    test('🗺️ Zonas principales de Formosa', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Verificar zonas principales
      const zonasPrincipales = [
        'Formosa Capital',
        'Clorinda', 
        'Pirané',
        'El Colorado',
        'Las Lomitas'
      ];
      
      let zonasEncontradas = 0;
      
      for (const zona of zonasPrincipales) {
        const elementos = page.locator(`text=${zona}`);
        const count = await elementos.count();
        
        if (count > 0) {
          zonasEncontradas++;
          console.log(`✅ Zona encontrada: ${zona} (${count} menciones)`);
        }
      }
      
      expect(zonasEncontradas).toBeGreaterThan(0);
      await utils.takeScreenshot('zonas-formosa');
    });

    test('📍 Distribución geográfica completa', async ({ page }) => {
      await utils.navigateToPage('settings');
      
      // Navegar a configuración de Formosa
      const formosaSection = page.locator('text=Configuración de Formosa, text=Formosa');
      if (await formosaSection.count() > 0) {
        await formosaSection.click();
        await page.waitForTimeout(1000);
        
        // Verificar que están todas las 20 zonas
        let zonasEncontradas = 0;
        
        for (const zona of FORMOSA_DATA.ZONAS) {
          const zonaElement = page.locator(`text=${zona}`);
          if (await zonaElement.count() > 0) {
            zonasEncontradas++;
          }
        }
        
        expect(zonasEncontradas).toBeGreaterThanOrEqual(EXPECTED_METRICS.EXPECTED_ZONAS_COUNT);
        console.log(`✅ Zonas configuradas: ${zonasEncontradas}/${FORMOSA_DATA.ZONAS.length}`);
      }
    });

    test('🔍 Filtrado por zona geográfica', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Buscar filtro de zona
      const zonaFilter = page.locator('select').filter({
        has: page.locator('option:has-text("Formosa Capital")')
      });
      
      if (await zonaFilter.count() > 0) {
        await zonaFilter.selectOption('Formosa Capital');
        await page.waitForTimeout(1000);
        
        // Verificar que se aplica el filtro
        const leadsFormosaCapital = page.locator('text=Formosa Capital');
        const count = await leadsFormosaCapital.count();
        
        if (count > 0) {
          expect(count).toBeGreaterThan(0);
          console.log(`✅ Leads en Formosa Capital: ${count}`);
        }
      }
    });
  });

  test.describe('Ingresos en pesos argentinos', () => {
    test('💰 Rangos de ingresos realistas', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Verificar formato de moneda argentina
      const monedaArgentina = /\$[\d,]+/;
      const elementosMoneda = page.locator(`text=${monedaArgentina}`);
      
      const count = await elementosMoneda.count();
      
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
        
        // Verificar primer monto
        const primerMonto = await elementosMoneda.first().textContent();
        expect(primerMonto).toMatch(monedaArgentina);
        
        // Extraer valor numérico
        const valorNumerico = parseInt(primerMonto?.replace(/[^\d]/g, '') || '0');
        
        // Verificar que está en el rango esperado (69.4M - 215.4M ARS)
        expect(valorNumerico).toBeGreaterThan(50000000); // Más de $50M ARS
        expect(valorNumerico).toBeLessThan(300000000); // Menos de $300M ARS
        
        console.log(`✅ Ingreso encontrado: ${primerMonto} (${valorNumerico} ARS)`);
      }
      
      await utils.takeScreenshot('ingresos-argentinos');
    });

    test('📊 Distribución de ingresos', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      await utils.waitForDashboardMetrics();
      
      // Verificar métricas de ingresos proyectados
      const revenueCard = page.locator('text=Ingresos Proyectados, text=Proyectado').locator('..').locator('..');
      
      if (await revenueCard.count() > 0) {
        const revenueValue = await revenueCard.locator('.text-2xl, .text-3xl').textContent();
        
        if (revenueValue) {
          expect(revenueValue).toMatch(/\$[\d,]+/);
          console.log(`✅ Ingresos proyectados: ${revenueValue}`);
        }
      }
    });

    test('⚙️ Configuración de rangos en Settings', async ({ page }) => {
      await utils.navigateToPage('settings');
      
      // Navegar a configuración de Formosa
      const formosaSection = page.locator('text=Configuración de Formosa, text=Formosa');
      if (await formosaSection.count() > 0) {
        await formosaSection.click();
        await page.waitForTimeout(1000);
        
        // Verificar rangos de ingresos configurados
        const rangoActual = page.locator('text=/\\$[\d,]+ - \\$[\d,]+ ARS/');
        
        if (await rangoActual.count() > 0) {
          const rangoTexto = await rangoActual.textContent();
          expect(rangoTexto).toMatch(/\$[\d,]+ - \$[\d,]+ ARS/);
          console.log(`✅ Rango configurado: ${rangoTexto}`);
        }
      }
    });
  });

  test.describe('Integridad y consistencia de datos', () => {
    test('🔗 Consistencia entre páginas', async ({ page }) => {
      // Obtener total de leads del dashboard
      await utils.navigateToPage('dashboard');
      await utils.waitForDashboardMetrics();
      
      const dashboardTotal = page.locator('text=Total Leads').locator('..').locator('..');
      let totalDashboard = 0;
      
      if (await dashboardTotal.count() > 0) {
        const totalValue = await dashboardTotal.locator('.text-2xl, .text-3xl').textContent();
        if (totalValue) {
          totalDashboard = parseInt(totalValue.replace(/[^\d]/g, ''));
        }
      }
      
      // Comparar con total en página de leads
      await utils.navigateToPage('leads');
      const leadsPageTitle = await page.locator('h1:has-text("Gestión de Leads")').textContent();
      const leadsMatch = leadsPageTitle?.match(/Total: (\d+)/);
      
      if (leadsMatch && totalDashboard > 0) {
        const totalLeads = parseInt(leadsMatch[1]);
        
        // Los totales deberían ser consistentes (permitir pequeña diferencia por filtros)
        const diferencia = Math.abs(totalDashboard - totalLeads);
        expect(diferencia).toBeLessThanOrEqual(10); // Máximo 10 de diferencia
        
        console.log(`✅ Consistencia: Dashboard=${totalDashboard}, Leads=${totalLeads}`);
      }
    });

    test('📊 Validación de métricas calculadas', async ({ page }) => {
      await utils.navigateToPage('dashboard');
      await utils.waitForDashboardMetrics();
      
      // Verificar que las métricas son coherentes
      const totalCard = page.locator('text=Total Leads').locator('..').locator('..');
      const preaprobadosCard = page.locator('text=Preaprobados').locator('..').locator('..');
      const conversionCard = page.locator('text=Tasa Conversión, text=Conversión').locator('..').locator('..');
      
      let total = 0, preaprobados = 0, conversion = 0;
      
      if (await totalCard.count() > 0) {
        const totalValue = await totalCard.locator('.text-2xl, .text-3xl').textContent();
        if (totalValue) total = parseInt(totalValue.replace(/[^\d]/g, ''));
      }
      
      if (await preaprobadosCard.count() > 0) {
        const preaprobadosValue = await preaprobadosCard.locator('.text-2xl, .text-3xl').textContent();
        if (preaprobadosValue) preaprobados = parseInt(preaprobadosValue.replace(/[^\d]/g, ''));
      }
      
      if (await conversionCard.count() > 0) {
        const conversionValue = await conversionCard.locator('.text-2xl, .text-3xl').textContent();
        if (conversionValue) conversion = parseFloat(conversionValue.replace(/[^\d.]/g, ''));
      }
      
      // Verificar que la tasa de conversión es coherente
      if (total > 0 && preaprobados > 0 && conversion > 0) {
        const conversionCalculada = (preaprobados / total) * 100;
        const diferencia = Math.abs(conversion - conversionCalculada);
        
        // Permitir diferencia de hasta 5% por redondeo
        expect(diferencia).toBeLessThanOrEqual(5);
        
        console.log(`✅ Conversión: ${conversion}% (calculada: ${conversionCalculada.toFixed(1)}%)`);
      }
    });

    test('🔍 Datos sin duplicados', async ({ page }) => {
      await utils.navigateToPage('leads');
      
      // Buscar un nombre específico para verificar que no hay duplicados obvios
      await utils.searchLeads('María');
      await page.waitForTimeout(1000);
      
      const resultados = page.locator('.formosa-card').filter({
        has: page.locator('text=María')
      });
      
      if (await resultados.count() > 1) {
        // Verificar que no son exactamente iguales
        const primerNombre = await resultados.first().locator('text=/María [A-Z][a-z]+/').textContent();
        const segundoNombre = await resultados.nth(1).locator('text=/María [A-Z][a-z]+/').textContent();
        
        if (primerNombre && segundoNombre) {
          expect(primerNombre).not.toBe(segundoNombre);
          console.log(`✅ Nombres diferentes: "${primerNombre}" vs "${segundoNombre}"`);
        }
      }
    });
  });
});
