import { test, expect, Page } from '@playwright/test'

// Helper function to login
async function login(page: Page) {
  await page.goto('/auth/signin')
  await page.fill('input[name="email"]', 'admin@phorencial.com')
  await page.fill('input[name="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display dashboard metrics', async ({ page }) => {
    // Check main heading
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    
    // Check KPI cards
    await expect(page.locator('text=Total Leads')).toBeVisible()
    await expect(page.locator('text=Nuevos Hoy')).toBeVisible()
    await expect(page.locator('text=Tasa Conversión')).toBeVisible()
    await expect(page.locator('text=En Revisión')).toBeVisible()
    
    // Check that metrics have values
    const totalLeads = page.locator('[data-testid="total-leads-value"]')
    await expect(totalLeads).toBeVisible()
  })

  test('should display recent leads section', async ({ page }) => {
    await expect(page.locator('text=Leads Recientes')).toBeVisible()
    
    // Should have "Ver todos los leads" link
    await expect(page.locator('a:has-text("Ver todos los leads")')).toBeVisible()
  })

  test('should display charts', async ({ page }) => {
    // Check trend chart
    await expect(page.locator('text=Tendencia de Leads')).toBeVisible()
    
    // Check distribution chart
    await expect(page.locator('text=Distribución por Estado')).toBeVisible()
  })

  test('should navigate to create new lead', async ({ page }) => {
    await page.click('a:has-text("Nuevo Lead")')
    
    await expect(page).toHaveURL('/leads/new')
    await expect(page.locator('h1:has-text("Nuevo Lead")')).toBeVisible()
  })

  test('should navigate to leads list', async ({ page }) => {
    await page.click('a:has-text("Ver todos los leads")')
    
    await expect(page).toHaveURL('/leads')
    await expect(page.locator('h1:has-text("Gestión de Leads")')).toBeVisible()
  })

  test('should have working navigation', async ({ page }) => {
    // Test navigation links
    await page.click('a:has-text("Leads")')
    await expect(page).toHaveURL('/leads')
    
    await page.click('a:has-text("Dashboard")')
    await expect(page).toHaveURL('/dashboard')
    
    await page.click('a:has-text("Reportes")')
    await expect(page).toHaveURL('/reports')
    
    await page.click('a:has-text("Configuración")')
    await expect(page).toHaveURL('/settings')
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Dashboard should still be accessible
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    
    // Navigation should work on mobile
    await expect(page.locator('nav')).toBeVisible()
  })
})
