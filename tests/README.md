# 🎭 Tests End-to-End - CRM Phorencial

Suite completa de tests end-to-end con Playwright para validar todas las funcionalidades del CRM Phorencial después de la migración selectiva.

## 📋 Suites de Tests

### 🔐 Autenticación (`auth.spec.ts`)
- Login con diferentes roles (ADMIN, ANALISTA, VENDEDOR)
- Logout y redirección correcta
- Validación de permisos por rol
- Seguridad y validaciones de formularios

### 📊 Dashboard Modernizado (`dashboard.spec.ts`)
- Carga correcta de métricas KPI con datos reales de Formosa
- Funcionamiento de componentes MetricsCard con gradientes
- Renderizado de gráficos DashboardCharts
- Navegación del Sidebar moderno
- Animaciones y efectos visuales

### 👥 Gestión de Leads (`leads.spec.ts`)
- Sistema de filtros avanzado con contadores dinámicos exactos
- Filtrado por estado (NUEVO, PREAPROBADO, RECHAZADO, etc.)
- Filtrado por zonas geográficas de Formosa
- Búsqueda por nombre, teléfono, email
- Paginación moderna
- Creación y visualización de leads

### 📁 Página Documents (`documents.spec.ts`)
- Upload y categorización de documentos
- Filtros por tipo y estado
- Gestión de documentos por lead
- UI moderna con efectos visuales

### ⚙️ Página Settings (`settings.spec.ts`)
- Configuración específica de Formosa
- Gestión de zonas geográficas
- Códigos de área locales
- Rangos de ingresos en pesos argentinos

### 🎨 UI Moderna y Responsive (`ui-modern.spec.ts`)
- Gradientes modernos en toda la aplicación
- Animaciones y efectos visuales
- Badges específicos de Formosa
- Responsive design en diferentes tamaños
- Accesibilidad visual

### 🇦🇷 Datos Específicos de Formosa (`formosa-data.spec.ts`)
- Validación de 1000+ leads reales preservados
- Nombres argentinos y teléfonos locales
- Códigos de área de Formosa (+543704, +543705, etc.)
- 20 zonas geográficas específicas
- Ingresos en pesos argentinos

## 🚀 Ejecución de Tests

### Scripts NPM Disponibles

```bash
# Ejecutar todos los tests
npm run test:e2e

# Tests específicos por suite
npm run test:e2e:auth          # Tests de autenticación
npm run test:e2e:dashboard     # Tests del dashboard
npm run test:e2e:leads         # Tests de gestión de leads
npm run test:e2e:documents     # Tests de documentos
npm run test:e2e:settings      # Tests de configuración
npm run test:e2e:ui            # Tests de UI moderna
npm run test:e2e:formosa       # Tests de datos de Formosa

# Tests por dispositivo
npm run test:e2e:mobile        # Tests en dispositivos móviles
npm run test:e2e:regression    # Tests de regresión

# Modos especiales
npm run test:e2e:ui            # Interfaz visual de Playwright
npm run test:e2e:headed        # Modo visible (no headless)
npm run test:e2e:debug         # Modo debug paso a paso

# Reportes
npm run test:e2e:report        # Abrir reporte HTML
```

### Script Personalizado

```bash
# Usar el script personalizado con opciones avanzadas
npm run test:runner -- --help

# Ejemplos
npm run test:runner -- --suite auth --browser chromium
npm run test:runner -- --mobile --headed
npm run test:runner -- --ui
npm run test:runner -- --debug --suite dashboard
```

## 🌐 Navegadores Soportados

- **Chromium** - Chrome/Edge moderno
- **Firefox** - Firefox estable
- **WebKit** - Safari (macOS/iOS)
- **Mobile Chrome** - Chrome en dispositivos móviles
- **Mobile Safari** - Safari en dispositivos móviles

## 📱 Viewports Testados

- **Desktop**: 1920x1080 (Full HD)
- **Tablet**: 768x1024 (iPad)
- **Mobile**: 375x667 (iPhone)
- **Ultra-wide**: 2560x1440

## 🔧 Configuración

### Variables de Entorno

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000  # URL base de la aplicación
CI=true                                    # Modo CI (opcional)
```

### Configuración de Playwright

El archivo `playwright.config.ts` incluye:
- Configuración para múltiples navegadores
- Setup y teardown globales
- Reportes en HTML, JSON y JUnit
- Screenshots y videos en caso de fallos
- Timeouts optimizados

## 📊 Reportes y Artefactos

### Reportes Generados

- **HTML Report**: Reporte interactivo con detalles de cada test
- **JSON Report**: Datos estructurados para integración
- **JUnit Report**: Compatible con sistemas CI/CD

### Artefactos en Fallos

- **Screenshots**: Capturas automáticas en fallos
- **Videos**: Grabación de la sesión completa
- **Traces**: Trazas detalladas para debugging

## 🔄 CI/CD con GitHub Actions

### Workflows Configurados

#### `playwright-tests.yml`
- Ejecuta en cada push y PR
- Tests en múltiples navegadores
- Tests mobile y performance
- Reportes automáticos

#### `regression-tests.yml`
- Ejecuta semanalmente
- Tests de regresión completos
- Validación de integridad de datos
- Tests de consistencia UI

### Triggers

- **Push/PR**: Tests básicos en chromium
- **Schedule**: Tests completos semanales
- **Manual**: Ejecución bajo demanda

## 🎯 Validaciones Específicas

### Migración Selectiva
- ✅ UI moderna del Formosa Leads Hub implementada
- ✅ Funcionalidad robusta del CRM Phorencial preservada
- ✅ 1000+ leads reales de Formosa mantenidos
- ✅ Sistema de filtros avanzado funcionando
- ✅ Páginas Documents y Settings agregadas

### Datos de Formosa
- ✅ Nombres argentinos reales preservados
- ✅ Códigos de área locales (+543704, +543705, +543711, +543718)
- ✅ 20 zonas geográficas específicas
- ✅ Ingresos en pesos argentinos (69.4M - 215.4M ARS)
- ✅ Distribución realista por estados

### UI Moderna
- ✅ Gradientes y efectos visuales funcionando
- ✅ Responsive design en todos los dispositivos
- ✅ Badges específicos de Formosa con colores correctos
- ✅ Animaciones y transiciones suaves
- ✅ Glassmorphism en sidebar

## 🐛 Debugging

### Modo Debug
```bash
npm run test:e2e:debug
```
- Pausa en cada acción
- Inspector de Playwright
- Consola interactiva

### Modo Headed
```bash
npm run test:e2e:headed
```
- Ejecuta con navegador visible
- Útil para ver qué está pasando

### UI Mode
```bash
npm run test:e2e:ui
```
- Interfaz gráfica de Playwright
- Ejecución paso a paso
- Timeline de acciones

## 📈 Performance

### Métricas Validadas
- **Tiempo de carga**: < 8 segundos para páginas principales
- **Renderizado visual**: < 3 segundos
- **Performance de filtros**: < 3 segundos
- **Responsive performance**: Adaptación fluida

### Optimizaciones
- Tests paralelos cuando es posible
- Reutilización de sesiones
- Timeouts optimizados
- Carga selectiva de recursos

## 🔍 Troubleshooting

### Problemas Comunes

1. **Tests fallan por timeout**
   - Verificar que el servidor esté corriendo
   - Aumentar timeouts en `playwright.config.ts`

2. **Navegadores no instalados**
   ```bash
   npx playwright install
   ```

3. **Base de datos sin datos**
   ```bash
   npm run db:seed
   ```

4. **Variables de entorno**
   - Verificar `.env.local`
   - Configurar `PLAYWRIGHT_BASE_URL`

### Logs y Debugging
- Usar `console.log()` en tests para debugging
- Revisar screenshots en `test-results/`
- Analizar traces con `npx playwright show-trace`

---

## 🎉 Resultado

Esta suite de tests valida que la **migración selectiva del CRM Phorencial** fue exitosa, combinando:
- **UI moderna** del Formosa Leads Hub
- **Funcionalidad robusta** preservada
- **Datos reales** específicos de Formosa
- **Performance** optimizada

**¡El CRM Phorencial está listo para producción!** 🚀
