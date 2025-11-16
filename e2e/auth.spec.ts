import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*auth.*signin/)
  })

  test('should show Google sign-in button', async ({ page }) => {
    await page.goto('/auth/signin')
    await expect(page.locator('button:has-text("Iniciar sesión con Google")')).toBeVisible()
  })

  // El flujo real de Google OAuth no se prueba en E2E por depender de un tercero.
  // Se valida presencia del botón y redirecciones en tests de integración separados si aplica.

  test('should logout successfully', async ({ page }) => {
    // Este test asume sesión ya iniciada mediante bypass/mocking en entorno de prueba.
    // Si no hay sesión, solo verifica que redirige a login al hacer logout es redundante.
    
    // Click logout
    await page.click('button:has-text("Salir")')
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*auth.*signin/)
  })
})
