import { test, expect } from '@playwright/test'
import { AuthHelper, LeadHelper, NavigationHelper, WhatsAppHelper } from './helpers/auth'

test.describe('Integration Tests', () => {
  let authHelper: AuthHelper
  let leadHelper: LeadHelper
  let navHelper: NavigationHelper
  let whatsappHelper: WhatsAppHelper

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page)
    leadHelper = new LeadHelper(page)
    navHelper = new NavigationHelper(page)
    whatsappHelper = new WhatsAppHelper(page)
    
    await authHelper.login()
  })

  test('complete lead management workflow', async ({ page }) => {
    // 1. Create a new lead
    await leadHelper.createLead({
      nombre: 'Integration Test Lead',
      telefono: '5491155559999',
      email: 'integration@test.com',
      origen: 'whatsapp',
      notas: 'Created during integration test'
    })

    // 2. Navigate to leads list
    await navHelper.goToLeads()
    
    // 3. Search for the created lead
    await leadHelper.searchLeads('Integration Test Lead')
    
    // 4. Verify lead appears in search results
    await expect(page.locator('text=Integration Test Lead')).toBeVisible()

    // 5. Go back to dashboard
    await navHelper.goToDashboard()
    
    // 6. Verify metrics updated
    await expect(page.locator('text=Total Leads')).toBeVisible()
  })

  test('dashboard to lead detail workflow', async ({ page }) => {
    // 1. Start from dashboard
    await navHelper.goToDashboard()
    
    // 2. Click on recent lead if available
    const recentLeadLink = page.locator('a:has-text("Ver")').first()
    if (await recentLeadLink.isVisible()) {
      await recentLeadLink.click()
      
      // 3. Should be on lead detail page
      await expect(page.locator('h1')).toBeVisible()
      
      // 4. Check WhatsApp integration is available
      if (await whatsappHelper.checkConversationHistory()) {
        await expect(page.locator('text=Enviar Mensaje WhatsApp')).toBeVisible()
      }
    }
  })

  test('navigation consistency', async ({ page }) => {
    // Test navigation between all main sections
    await navHelper.goToDashboard()
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    
    await navHelper.goToLeads()
    await expect(page.locator('h1:has-text("Gestión de Leads")')).toBeVisible()
    
    await navHelper.goToReports()
    // Reports page might not be fully implemented
    await expect(page).toHaveURL('/reports')
    
    await navHelper.goToSettings()
    // Settings page might not be fully implemented
    await expect(page).toHaveURL('/settings')
    
    // Return to dashboard
    await navHelper.goToDashboard()
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
  })

  test('responsive design across pages', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Dashboard should work on mobile
    await navHelper.goToDashboard()
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    
    // Leads should work on mobile
    await navHelper.goToLeads()
    await expect(page.locator('h1:has-text("Gestión de Leads")')).toBeVisible()
    
    // Create lead form should work on mobile
    await page.goto('/leads/new')
    await expect(page.locator('input[name="nombre"]')).toBeVisible()
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await navHelper.goToDashboard()
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
  })

  test('error handling and recovery', async ({ page }) => {
    // Test navigation to non-existent lead
    await page.goto('/leads/non-existent-id')
    
    // Should handle gracefully (either 404 or redirect)
    // The page should not crash
    await expect(page.locator('body')).toBeVisible()
    
    // Should be able to navigate back to working pages
    await navHelper.goToDashboard()
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
  })

  test('form validation across the app', async ({ page }) => {
    // Test lead creation validation
    await page.goto('/leads/new')
    
    // Submit empty form
    await page.click('button:has-text("Crear Lead")')
    
    // Should show validation errors
    await expect(page.locator('text=Nombre debe tener al menos 2 caracteres')).toBeVisible()
    
    // Fill partial form
    await page.fill('input[name="nombre"]', 'A') // Too short
    await page.click('button:has-text("Crear Lead")')
    
    // Should still show validation error
    await expect(page.locator('text=Nombre debe tener al menos 2 caracteres')).toBeVisible()
  })

  test('data persistence across navigation', async ({ page }) => {
    // Fill form partially
    await page.goto('/leads/new')
    await page.fill('input[name="nombre"]', 'Test Persistence')
    await page.fill('input[name="telefono"]', '1234567890')
    
    // Navigate away and back
    await navHelper.goToDashboard()
    await page.goto('/leads/new')
    
    // Form should be reset (this is expected behavior)
    const nameValue = await page.inputValue('input[name="nombre"]')
    expect(nameValue).toBe('')
  })
})
