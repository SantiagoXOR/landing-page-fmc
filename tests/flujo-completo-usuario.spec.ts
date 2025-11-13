import { test, expect } from '@playwright/test';

test.describe('Flujo Completo de Usuario - CRM Phorencial', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navegar a la página principal
    await page.goto('/');
    
    // Esperar a que la página cargue completamente
    await page.waitForLoadState('networkidle');
  });

  test('Flujo completo: Login → Dashboard → Crear Lead → Pipeline → Editar → Eliminar', async ({ page }) => {
    console.log('🧪 Iniciando flujo completo de usuario...');

    // 1. VERIFICAR DASHBOARD
    console.log('1️⃣ Verificando Dashboard...');
    await expect(page.locator('h1')).toContainText(['Dashboard', 'Leads', 'Phorencial']);
    
    // Verificar métricas del dashboard
    await expect(page.locator('[data-testid="total-leads"]')).toBeVisible();
    
    // 2. NAVEGAR A LEADS
    console.log('2️⃣ Navegando a sección Leads...');
    await page.click('[href="/leads"]');
    await page.waitForLoadState('networkidle');
    
    // Verificar que estamos en la página de leads
    await expect(page.locator('h1')).toContainText('Leads');
    
    // Verificar que hay leads en la lista
    const leadsCount = await page.locator('[data-testid="lead-item"]').count();
    console.log(`   📊 Leads encontrados: ${leadsCount}`);
    
    // 3. PROBAR FILTROS
    console.log('3️⃣ Probando sistema de filtros...');
    
    // Filtrar por estado NUEVO
    await page.selectOption('[data-testid="filter-estado"]', 'NUEVO');
    await page.waitForTimeout(1000);
    
    // Verificar que el filtro se aplicó
    await expect(page.locator('text=filtrado por estado')).toBeVisible();
    
    // 4. CREAR NUEVO LEAD
    console.log('4️⃣ Creando nuevo lead...');
    
    await page.click('[data-testid="create-lead-button"]');
    await page.waitForSelector('[data-testid="lead-form"]');
    
    // Llenar formulario de nuevo lead
    const testLeadData = {
      nombre: 'Test Usuario',
      apellido: 'Playwright',
      email: 'test.playwright@example.com',
      telefono: '+543704999999',
      zona: 'Formosa Capital',
      ingresos: '150000000',
      notas: 'Lead creado por test automatizado'
    };
    
    await page.fill('[data-testid="nombre-input"]', testLeadData.nombre);
    await page.fill('[data-testid="apellido-input"]', testLeadData.apellido);
    await page.fill('[data-testid="email-input"]', testLeadData.email);
    await page.fill('[data-testid="telefono-input"]', testLeadData.telefono);
    await page.selectOption('[data-testid="zona-select"]', testLeadData.zona);
    await page.fill('[data-testid="ingresos-input"]', testLeadData.ingresos);
    await page.fill('[data-testid="notas-textarea"]', testLeadData.notas);
    
    // Enviar formulario
    await page.click('[data-testid="submit-lead-button"]');
    
    // Esperar confirmación
    await expect(page.locator('.toast-success, .alert-success')).toBeVisible();
    
    // 5. VERIFICAR PIPELINE CREADO
    console.log('5️⃣ Verificando creación de pipeline...');
    
    // Navegar a pipeline
    await page.click('[href="/pipeline"]');
    await page.waitForLoadState('networkidle');
    
    // Verificar que no hay errores de pipeline
    const pipelineErrors = await page.locator('text=No se pudo crear el pipeline').count();
    if (pipelineErrors > 0) {
      console.log(`❌ Errores de pipeline encontrados: ${pipelineErrors}`);
    }
    
    // Verificar etapas del pipeline
    const stages = ['Lead Nuevo', 'Contacto Inicial', 'Calificación', 'Presentación'];
    for (const stage of stages) {
      await expect(page.locator(`text=${stage}`)).toBeVisible();
    }
    
    // 6. MOVER LEAD EN PIPELINE
    console.log('6️⃣ Probando movimiento en pipeline...');
    
    // Buscar el lead recién creado en la etapa "Lead Nuevo"
    const leadInPipeline = page.locator('[data-testid="pipeline-lead"]').filter({ hasText: testLeadData.nombre });
    
    if (await leadInPipeline.count() > 0) {
      // Mover a siguiente etapa
      await leadInPipeline.locator('[data-testid="move-to-next-stage"]').click();
      await page.waitForTimeout(1000);
      
      // Verificar que se movió
      await expect(page.locator('text=Lead movido exitosamente')).toBeVisible();
    }
    
    // 7. VOLVER A LEADS Y EDITAR
    console.log('7️⃣ Editando lead...');
    
    await page.click('[href="/leads"]');
    await page.waitForLoadState('networkidle');
    
    // Buscar el lead creado
    const createdLead = page.locator('[data-testid="lead-item"]').filter({ hasText: testLeadData.email });
    
    if (await createdLead.count() > 0) {
      // Hacer clic en editar
      await createdLead.locator('[data-testid="edit-lead-button"]').click();
      await page.waitForSelector('[data-testid="edit-lead-form"]');
      
      // Cambiar las notas
      await page.fill('[data-testid="notas-textarea"]', 'Lead editado por test automatizado');
      
      // Guardar cambios
      await page.click('[data-testid="save-lead-button"]');
      
      // Verificar confirmación
      await expect(page.locator('.toast-success, .alert-success')).toBeVisible();
    }
    
    // 8. ELIMINAR LEAD DE PRUEBA
    console.log('8️⃣ Eliminando lead de prueba...');
    
    if (await createdLead.count() > 0) {
      // Hacer clic en eliminar
      await createdLead.locator('[data-testid="delete-lead-button"]').click();
      
      // Confirmar eliminación
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Verificar confirmación
      await expect(page.locator('text=Lead eliminado exitosamente')).toBeVisible();
    }
    
    // 9. VERIFICAR OTRAS PÁGINAS
    console.log('9️⃣ Verificando otras páginas...');
    
    // Documents
    await page.click('[href="/documents"]');
    await expect(page.locator('h1')).toContainText('Documents');
    
    // Reports
    await page.click('[href="/reports"]');
    await expect(page.locator('h1')).toContainText('Reportes');
    
    // Settings
    await page.click('[href="/settings"]');
    await expect(page.locator('h1')).toContainText('Settings');
    
    console.log('✅ Flujo completo de usuario completado exitosamente');
  });

  test('Verificar errores específicos del pipeline', async ({ page }) => {
    console.log('🔍 Verificando errores específicos del pipeline...');

    // Capturar errores en consola desde el inicio
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`🔴 Console Error: ${msg.text()}`);
      }
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} - ${response.url()}`);
        console.log(`🔴 Network Error: ${response.status()} - ${response.url()}`);
      }
    });

    // Ir a la página de diagnóstico primero
    await page.goto('/debug');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Capturar el estado del diagnóstico
    const diagnosticData = await page.evaluate(() => {
      const pre = document.querySelector('pre');
      return pre ? pre.textContent : null;
    });

    if (diagnosticData) {
      console.log('📊 Datos de diagnóstico:', diagnosticData);
    }

    // Ir a la página de pipeline
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    // Buscar mensajes de error específicos en la página
    const errorMessages = await page.locator('text=Error').count();
    const pipelineErrorMessages = await page.locator('text=No se pudo crear el pipeline').count();

    console.log(`📊 Mensajes de error encontrados: ${errorMessages}`);
    console.log(`📊 Errores de pipeline específicos: ${pipelineErrorMessages}`);

    // Verificar si hay leads en la página
    const leadItems = await page.locator('[data-testid="lead-item"], .lead-item, [class*="lead"]').count();
    console.log(`📊 Items de leads encontrados: ${leadItems}`);

    // Esperar un momento para capturar más errores
    await page.waitForTimeout(3000);

    // Reportar errores encontrados
    if (consoleErrors.length > 0) {
      console.log('❌ Errores de consola encontrados:');
      consoleErrors.forEach(error => console.log(`   - ${error}`));
    }

    if (networkErrors.length > 0) {
      console.log('❌ Errores de red encontrados:');
      networkErrors.forEach(error => console.log(`   - ${error}`));
    }

    // Verificar que la página cargó correctamente
    await expect(page.locator('h1, [role="heading"]')).toBeVisible({ timeout: 10000 });
  });
});
