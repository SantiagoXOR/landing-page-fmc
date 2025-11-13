# Guía de Solución de Problemas de Desarrollo

## Errores Comunes y Soluciones

### 1. Error ERR_ABORTED durante Fast Refresh

**Síntomas:**

- `net::ERR_ABORTED http://localhost:3000/?_rsc=...`
- `net::ERR_ABORTED http://localhost:3000/auth/signin?_rsc=...`
- Errores durante hot reload/fast refresh
- Requests abortados en el navegador
- Páginas de autenticación no cargan

**Causas Comunes:**

- Conflicto de puertos (otro proceso usando puerto 3000)
- Cache de Next.js corrupto
- Middleware interceptando requests internos de Next.js (especialmente RSC requests)
- Middleware no reconociendo parámetros `_rsc` en query strings

**Soluciones:**

#### Opción 1: Script de Limpieza Automática

```bash
npm run dev:clean
```

#### Opción 2: Limpieza Manual

```bash
# 1. Verificar procesos en puerto 3000
netstat -ano | findstr :3000

# 2. Terminar proceso si existe
taskkill /PID [PID_NUMBER] /F

# 3. Limpiar cache de Next.js
Remove-Item -Recurse -Force .next

# 4. Reiniciar servidor
npm run dev
```

### 2. Errores de Permisos (EPERM)

**Síntomas:**

- `Error: EPERM: operation not permitted, open '.next/trace'`
- Errores de acceso a archivos en directorio .next

**Solución:**

```bash
# Eliminar directorio .next completamente
Remove-Item -Recurse -Force .next
npm run dev
```

### 3. Conflictos de Middleware

**Síntomas:**

- Requests internos de Next.js interceptados
- Errores 401/403 en requests del sistema
- Fast refresh no funciona

**Solución:**
El middleware ya está configurado para excluir requests internos:

- `/_next/*` - Assets estáticos
- `_rsc=*` - React Server Components
- `/monitoring` - Túnel de Sentry
- `__nextjs_original-stack-frame` - Error boundaries

### 4. Problemas de WebSocket

**Síntomas:**

- "Máximo número de intentos de reconexión alcanzado"
- Errores de conexión WebSocket

**Solución:**

```bash
# Iniciar servidor WebSocket por separado
npm run dev:ws

# O iniciar ambos servidores
npm run dev:full
```

### 5. Errores de Sentry

**Síntomas:**

- Warnings sobre global error handler
- Deprecation warnings sobre archivos de configuración

**Solución:**

- ✅ Global error handler ya configurado en `src/app/global-error.tsx`
- ✅ Warning suprimido con `SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1`

## Scripts Útiles

### Desarrollo

```bash
npm run dev              # Servidor normal
npm run dev:clean        # Limpieza + servidor
npm run dev:ws           # Solo WebSocket
npm run dev:full         # Next.js + WebSocket
```

### Diagnóstico

```bash
npm run type-check       # Verificar TypeScript
npm run lint            # Verificar ESLint
npm run test:auth        # Probar rutas de autenticación
```

### Base de Datos

```bash
npm run db:push         # Sincronizar schema
npm run db:seed         # Poblar datos
npm run db:studio       # Abrir Prisma Studio
```

## Prevención

### 1. Siempre usar scripts de limpieza

- Usar `npm run dev:clean` cuando hay problemas
- No iniciar múltiples servidores manualmente

### 2. Verificar puertos antes de desarrollo

```bash
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

### 3. Mantener cache limpio

- Limpiar `.next` regularmente
- Verificar permisos de archivos

### 4. Monitorear logs

- Revisar console del navegador
- Verificar logs del servidor en terminal

## Contacto

Si los problemas persisten:

1. Verificar que todas las dependencias están instaladas
2. Revisar variables de entorno en `.env.local`
3. Consultar logs completos del servidor
4. Verificar versiones de Node.js y npm
