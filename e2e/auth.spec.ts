import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*auth.*signin/)
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Fill login form
    await page.fill('input[name="email"]', 'admin@phorencial.com')
    await page.fill('input[name="password"]', 'admin123')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Should show user info
    await expect(page.locator('text=Admin')).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Fill with invalid credentials
    await page.fill('input[name="email"]', 'invalid@email.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'admin@phorencial.com')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Click logout
    await page.click('button:has-text("Salir")')
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*auth.*signin/)
  })
})
