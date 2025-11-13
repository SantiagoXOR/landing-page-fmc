import { Page, expect } from '@playwright/test'

export class AuthHelper {
  constructor(private page: Page) {}

  async login(email: string = 'admin@phorencial.com', password: string = 'admin123') {
    await this.page.goto('/auth/signin')
    await this.page.fill('input[name="email"]', email)
    await this.page.fill('input[name="password"]', password)
    await this.page.click('button[type="submit"]')
    await expect(this.page).toHaveURL('/dashboard')
  }

  async logout() {
    await this.page.click('button:has-text("Salir")')
    await expect(this.page).toHaveURL(/.*auth.*signin/)
  }

  async ensureLoggedIn() {
    // Check if already logged in
    const currentUrl = this.page.url()
    if (currentUrl.includes('/auth/') || currentUrl === '/') {
      await this.login()
    }
  }
}

export class LeadHelper {
  constructor(private page: Page) {}

  async createLead(leadData: {
    nombre: string
    telefono: string
    email?: string
    origen?: string
    notas?: string
  }) {
    await this.page.goto('/leads/new')
    
    // Fill required fields
    await this.page.fill('input[name="nombre"]', leadData.nombre)
    await this.page.fill('input[name="telefono"]', leadData.telefono)
    
    // Fill optional fields
    if (leadData.email) {
      await this.page.fill('input[name="email"]', leadData.email)
    }
    
    if (leadData.origen) {
      await this.page.selectOption('select[name="origen"]', leadData.origen)
    }
    
    if (leadData.notas) {
      await this.page.fill('textarea[name="notas"]', leadData.notas)
    }
    
    // Submit form
    await this.page.click('button:has-text("Crear Lead")')
  }

  async goToFirstLead() {
    await this.page.goto('/leads')
    const firstLeadLink = this.page.locator('a:has-text("Ver")').first()
    if (await firstLeadLink.isVisible()) {
      await firstLeadLink.click()
      return true
    }
    return false
  }

  async searchLeads(query: string) {
    await this.page.goto('/leads')
    await this.page.fill('input[placeholder*="Buscar"]', query)
    await this.page.press('input[placeholder*="Buscar"]', 'Enter')
  }

  async filterByStatus(status: string) {
    await this.page.goto('/leads')
    await this.page.selectOption('select[name="estado"]', status)
  }
}

export class NavigationHelper {
  constructor(private page: Page) {}

  async goToDashboard() {
    await this.page.click('a:has-text("Dashboard")')
    await expect(this.page).toHaveURL('/dashboard')
  }

  async goToLeads() {
    await this.page.click('a:has-text("Leads")')
    await expect(this.page).toHaveURL('/leads')
  }

  async goToReports() {
    await this.page.click('a:has-text("Reportes")')
    await expect(this.page).toHaveURL('/reports')
  }

  async goToSettings() {
    await this.page.click('a:has-text("Configuración")')
    await expect(this.page).toHaveURL('/settings')
  }
}

export class WhatsAppHelper {
  constructor(private page: Page) {}

  async sendTextMessage(message: string) {
    await this.page.selectOption('select[name="messageType"]', 'text')
    await this.page.fill('textarea[placeholder*="mensaje"]', message)
    await this.page.click('button:has-text("Enviar")')
  }

  async sendTemplateMessage(template: string) {
    await this.page.selectOption('select[name="messageType"]', 'template')
    await this.page.selectOption('select[name="template"]', template)
    await this.page.click('button:has-text("Enviar")')
  }

  async checkConversationHistory() {
    return await this.page.locator('text=Historial de Conversaciones').isVisible()
  }
}
