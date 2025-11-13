# Testing Guide - Phorencial CRM

Este documento describe la estrategia de testing implementada en el proyecto Phorencial CRM.

## 🧪 Tipos de Tests

### 1. **Tests Unitarios (Jest)**
- **Ubicación**: `src/**/__tests__/`
- **Framework**: Jest + TypeScript
- **Cobertura**: Servicios, utilidades, validaciones

### 2. **Tests E2E (Playwright)**
- **Ubicación**: `e2e/`
- **Framework**: Playwright
- **Cobertura**: Flujos completos de usuario

### 3. **Tests de Integración**
- **Ubicación**: `e2e/integration.spec.ts`
- **Cobertura**: Workflows completos entre componentes

## 🚀 Comandos de Testing

### Tests Unitarios
```bash
# Ejecutar tests unitarios
npm run test:jest

# Ejecutar en modo watch
npm run test:jest:watch

# Ejecutar con coverage
npm run test:jest:coverage

# Ejecutar para CI
npm run test:jest:ci
```

### Tests E2E
```bash
# Ejecutar tests E2E
npm run test:e2e

# Ejecutar con UI interactiva
npm run test:e2e:ui

# Ejecutar en modo headed (ver navegador)
npm run test:e2e:headed

# Ejecutar en modo debug
npm run test:e2e:debug
```

### Tests Completos
```bash
# Ejecutar todos los tests (sin E2E)
npm run test:all

# Ejecutar todos los tests incluyendo E2E
npm run test:all:e2e
```

## 📋 Estructura de Tests

### Tests Unitarios
```
src/
├── server/services/__tests__/
│   ├── supabase-lead-service.test.ts
│   └── whatsapp-service.test.ts
├── app/api/leads/__tests__/
│   └── route.test.ts
└── __tests__/
    └── basic.test.ts
```

### Tests E2E
```
e2e/
├── auth.spec.ts           # Autenticación
├── dashboard.spec.ts      # Dashboard principal
├── leads.spec.ts          # Gestión de leads
├── whatsapp.spec.ts       # Integración WhatsApp
├── integration.spec.ts    # Tests de integración
└── helpers/
    └── auth.ts           # Helpers y utilidades
```

## 🎯 Cobertura de Tests

### ✅ **Funcionalidades Cubiertas**

#### **Autenticación**
- Login con credenciales válidas
- Manejo de credenciales inválidas
- Logout
- Protección de rutas

#### **Dashboard**
- Visualización de métricas
- Gráficos interactivos
- Navegación
- Responsividad

#### **Gestión de Leads**
- Creación de leads
- Validación de formularios
- Listado y filtros
- Búsqueda
- Exportación CSV

#### **Integración WhatsApp**
- Componentes de envío
- Historial de conversaciones
- Validaciones
- Manejo de errores

#### **Servicios Backend**
- SupabaseLeadService
- WhatsAppService
- APIs REST
- Validaciones Zod

### 🔄 **Tests de Integración**
- Workflow completo de gestión de leads
- Navegación entre páginas
- Persistencia de datos
- Manejo de errores
- Responsividad

## 🛠️ Configuración

### Jest
- **Archivo**: `jest.config.js`
- **Setup**: `jest.setup.js`
- **Environment**: Node.js
- **Mocks**: Fetch, console, environment variables

### Playwright
- **Archivo**: `playwright.config.ts`
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Chrome Mobile, Safari Mobile
- **Features**: Screenshots, videos, traces

## 📊 Métricas de Calidad

### **Coverage Goals**
- **Servicios**: >80%
- **APIs**: >70%
- **Utilidades**: >90%

### **E2E Goals**
- **Flujos críticos**: 100%
- **Navegación**: 100%
- **Formularios**: 100%

## 🐛 Debugging

### Jest
```bash
# Debug específico test
npx jest --testNamePattern="test name" --verbose

# Debug con breakpoints
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright
```bash
# Debug mode
npm run test:e2e:debug

# Headed mode
npm run test:e2e:headed

# Specific test
npx playwright test auth.spec.ts --debug
```

## 🚨 CI/CD Integration

### GitHub Actions
```yaml
- name: Run Tests
  run: |
    npm run test:jest:ci
    npm run build
    npm run test:e2e
```

### Pre-commit Hooks
```bash
# Instalar husky
npm install --save-dev husky

# Configurar pre-commit
npx husky add .husky/pre-commit "npm run test:jest"
```

## 📝 Escribir Tests

### Test Unitario Ejemplo
```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    // Setup
  })

  it('should do something', async () => {
    // Arrange
    const input = 'test'
    
    // Act
    const result = await service.method(input)
    
    // Assert
    expect(result).toBe('expected')
  })
})
```

### Test E2E Ejemplo
```typescript
test('should complete user flow', async ({ page }) => {
  // Navigate
  await page.goto('/page')
  
  // Interact
  await page.fill('input[name="field"]', 'value')
  await page.click('button[type="submit"]')
  
  // Assert
  await expect(page).toHaveURL('/success')
})
```

## 🔧 Troubleshooting

### Problemas Comunes

1. **Tests fallan en CI**
   - Verificar variables de entorno
   - Revisar timeouts
   - Comprobar dependencias

2. **E2E tests lentos**
   - Usar `fullyParallel: true`
   - Optimizar selectores
   - Reducir waits innecesarios

3. **Mocks no funcionan**
   - Verificar orden de imports
   - Revisar configuración Jest
   - Comprobar paths

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Última actualización**: Agosto 2025  
**Versión**: 1.0.0
