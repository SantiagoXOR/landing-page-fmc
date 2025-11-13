import { test, expect, Page } from '@playwright/test'

// Helper function to login
async function login(page: Page) {
  await page.goto('/auth/signin')
  await page.fill('input[name="email"]', 'admin@phorencial.com')
  await page.fill('input[name="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
}

test.describe('WhatsApp Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display WhatsApp components in lead detail', async ({ page }) => {
    // Navigate to a lead detail page (assuming lead exists)
    await page.goto('/leads')
    
    // Click on first lead if exists
    const firstLeadLink = page.locator('a:has-text("Ver")').first()
    if (await firstLeadLink.isVisible()) {
      await firstLeadLink.click()
      
      // Should show WhatsApp components
      await expect(page.locator('text=Enviar Mensaje WhatsApp')).toBeVisible()
      await expect(page.locator('text=Historial de Conversaciones')).toBeVisible()
    }
  })

  test('should show WhatsApp sender form', async ({ page }) => {
    // Go to leads and try to access a lead detail
    await page.goto('/leads')
    
    const firstLeadLink = page.locator('a:has-text("Ver")').first()
    if (await firstLeadLink.isVisible()) {
      await firstLeadLink.click()
      
      // Check WhatsApp sender form elements
      await expect(page.locator('select[name="messageType"]')).toBeVisible()
      await expect(page.locator('textarea[placeholder*="mensaje"]')).toBeVisible()
      await expect(page.locator('button:has-text("Enviar")')).toBeVisible()
    }
  })

  test('should validate WhatsApp message form', async ({ page }) => {
    await page.goto('/leads')
    
    const firstLeadLink = page.locator('a:has-text("Ver")').first()
    if (await firstLeadLink.isVisible()) {
      await firstLeadLink.click()
      
      // Try to send empty message
      await page.click('button:has-text("Enviar")')
      
      // Should show validation error
      await expect(page.locator('text=El mensaje es requerido')).toBeVisible()
    }
  })

  test('should switch between message types', async ({ page }) => {
    await page.goto('/leads')
    
    const firstLeadLink = page.locator('a:has-text("Ver")').first()
    if (await firstLeadLink.isVisible()) {
      await firstLeadLink.click()
      
      // Switch to template message
      await page.selectOption('select[name="messageType"]', 'template')
      
      // Should show template selector
      await expect(page.locator('select[name="template"]')).toBeVisible()
      
      // Switch back to text
      await page.selectOption('select[name="messageType"]', 'text')
      
      // Should show text area
      await expect(page.locator('textarea[placeholder*="mensaje"]')).toBeVisible()
    }
  })

  test('should display conversation history', async ({ page }) => {
    await page.goto('/leads')
    
    const firstLeadLink = page.locator('a:has-text("Ver")').first()
    if (await firstLeadLink.isVisible()) {
      await firstLeadLink.click()
      
      // Check conversation history section
      await expect(page.locator('text=Historial de Conversaciones')).toBeVisible()
      
      // Should have conversation container
      const conversationContainer = page.locator('[data-testid="conversation-history"]')
      if (await conversationContainer.isVisible()) {
        // If there are messages, they should be displayed
        const messages = page.locator('.message-item')
        if (await messages.count() > 0) {
          await expect(messages.first()).toBeVisible()
        }
      }
    }
  })

  test('should handle WhatsApp API errors gracefully', async ({ page }) => {
    await page.goto('/leads')
    
    const firstLeadLink = page.locator('a:has-text("Ver")').first()
    if (await firstLeadLink.isVisible()) {
      await firstLeadLink.click()
      
      // Fill message form
      await page.fill('textarea[placeholder*="mensaje"]', 'Test message')
      
      // Try to send (will likely fail due to API configuration)
      await page.click('button:has-text("Enviar")')
      
      // Should handle error gracefully (not crash the page)
      // The page should still be functional
      await expect(page.locator('h1')).toBeVisible()
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/leads')
    
    const firstLeadLink = page.locator('a:has-text("Ver")').first()
    if (await firstLeadLink.isVisible()) {
      await firstLeadLink.click()
      
      // WhatsApp components should work on mobile
      await expect(page.locator('text=Enviar Mensaje WhatsApp')).toBeVisible()
      await expect(page.locator('textarea[placeholder*="mensaje"]')).toBeVisible()
    }
  })
})
