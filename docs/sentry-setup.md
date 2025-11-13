# Configuración de Sentry para Monitoreo de Performance

## Instalación

Las dependencias ya están instaladas:

```bash
npm install @sentry/nextjs @sentry/profiling-node web-vitals
```

## Configuración de Variables de Entorno

Agrega las siguientes variables a tu archivo `.env.local`:

```env
# Sentry Configuration
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="your-sentry-project"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"

# Performance Monitoring
NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
```

## Archivos de Configuración Creados

### 1. `sentry.client.config.ts`
Configuración para el cliente (browser)
- Captura errores del frontend
- Monitoreo de performance
- Session Replay para debugging

### 2. `sentry.server.config.ts`
Configuración para el servidor
- Captura errores de API routes
- Monitoreo de performance del servidor

### 3. `sentry.edge.config.ts`
Configuración para Edge Runtime
- Middleware y funciones edge

### 4. `instrumentation.ts`
Archivo de instrumentación que carga automáticamente Sentry

## Características Implementadas

### 1. Monitoreo de APIs

```typescript
// Uso del middleware de monitoreo
import { withMonitoring } from '@/lib/monitoring'

async function apiHandler(request: NextRequest) {
  // Tu lógica de API aquí
}

export const POST = withMonitoring(apiHandler, '/api/endpoint')
```

**Métricas capturadas:**
- Tiempo de respuesta de APIs
- Códigos de estado HTTP
- Errores de base de datos
- Información de usuario y request

### 2. Monitoreo de Performance Frontend

```typescript
// Hook para componentes
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring'

function MyComponent() {
  const { trackUserAction, trackApiCall } = usePerformanceMonitoring('MyComponent')
  
  const handleClick = () => {
    trackUserAction('button_click', { buttonId: 'submit' })
  }
  
  return <button onClick={handleClick}>Submit</button>
}
```

**Métricas capturadas:**
- Core Web Vitals (CLS, FID, FCP, LCP, TTFB)
- Tiempo de renderizado de componentes
- Acciones de usuario
- Llamadas a APIs desde el frontend

### 3. Error Boundary

```typescript
// Componente que captura errores de React
import { SentryErrorBoundary } from '@/components/monitoring/PerformanceWrapper'

function App() {
  return (
    <SentryErrorBoundary>
      <MyComponent />
    </SentryErrorBoundary>
  )
}
```

### 4. HOC para Monitoreo Automático

```typescript
// Envolver componentes automáticamente
import { withPerformanceMonitoring } from '@/components/monitoring/PerformanceWrapper'

const MonitoredComponent = withPerformanceMonitoring(MyComponent, 'MyComponent')
```

## Funciones de Utilidad

### Capturar Errores de Base de Datos

```typescript
import { captureDbError } from '@/lib/monitoring'

try {
  await db.query('SELECT * FROM users')
} catch (error) {
  captureDbError(error, 'SELECT', 'users')
  throw error
}
```

### Capturar Errores de Autenticación

```typescript
import { captureAuthError } from '@/lib/monitoring'

try {
  await signIn(credentials)
} catch (error) {
  captureAuthError(error, userId)
  throw error
}
```

### Métricas de Negocio

```typescript
import { captureBusinessMetric } from '@/lib/monitoring'

// Ejemplo: Número de leads creados
captureBusinessMetric('leads_created', 1, {
  source: 'whatsapp',
  campaign: 'summer_2024'
})
```

### Configurar Usuario en Sentry

```typescript
import { setSentryUser } from '@/lib/monitoring'

// En tu middleware de autenticación
setSentryUser(user.id, user.email, user.username)
```

## Alertas y Notificaciones

Sentry automáticamente alertará sobre:

1. **APIs Lentas**: > 5 segundos
2. **Renderizado Lento**: > 100ms
3. **Errores HTTP**: 4xx y 5xx
4. **Errores de JavaScript**: Excepciones no capturadas
5. **Errores de Base de Datos**: Fallos en queries

## Dashboard de Sentry

En tu dashboard de Sentry podrás ver:

- **Performance**: Tiempo de respuesta de APIs y componentes
- **Errors**: Stack traces completos con contexto
- **Releases**: Tracking de deployments
- **User Feedback**: Reportes de usuarios
- **Session Replay**: Grabaciones de sesiones con errores

## Configuración en Producción

1. Crea un proyecto en [sentry.io](https://sentry.io)
2. Obtén tu DSN del proyecto
3. Configura las variables de entorno en tu plataforma de deployment
4. Habilita source maps para mejor debugging:

```bash
# En tu CI/CD
export SENTRY_AUTH_TOKEN="your-token"
export SENTRY_ORG="your-org"
export SENTRY_PROJECT="your-project"
```

## Mejores Prácticas

1. **No logear información sensible**: Passwords, tokens, etc.
2. **Usar tags apropiados**: Para filtrar y organizar errores
3. **Configurar rate limiting**: Para evitar spam de errores
4. **Usar breadcrumbs**: Para contexto adicional
5. **Configurar releases**: Para tracking de versiones

## Troubleshooting

### Error: "Sentry DSN not configured"
- Verifica que `SENTRY_DSN` esté configurado correctamente
- Asegúrate de que el DSN sea válido

### Source maps no aparecen
- Verifica `SENTRY_AUTH_TOKEN`
- Confirma que `SENTRY_ORG` y `SENTRY_PROJECT` sean correctos

### Performance data no aparece
- Verifica que `tracesSampleRate` esté > 0
- Confirma que estés en un entorno donde Sentry esté habilitado