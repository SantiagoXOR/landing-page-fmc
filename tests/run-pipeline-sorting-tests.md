# Ejecutar Tests de Ordenamiento del Pipeline

## ⚠️ Requisitos Previos

Antes de ejecutar los tests, asegúrate de:

1. **La aplicación esté corriendo:**
   ```bash
   npm run dev
   ```
   La aplicación debe estar disponible en `http://localhost:3000`

2. **Estado de autenticación creado:**
   ```bash
   npx playwright test tests/auth-setup.ts --project=chromium --headed
   ```
   Esto abrirá un navegador donde deberás iniciar sesión con Google manualmente. El estado se guardará automáticamente.

3. **Variables de entorno configuradas:**
   - `NEXT_PUBLIC_SUPABASE_URL` - URL de tu proyecto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key de Supabase
   - `PLAYWRIGHT_BASE_URL` (opcional) - URL base de la aplicación (default: http://localhost:3000)

## 🚀 Ejecutar Tests

### Opción 1: Ejecutar todos los tests de ordenamiento

```bash
npm run test:e2e:pipeline-sorting
```

### Opción 2: Ejecutar un test específico

```bash
# Test de una columna específica
npx playwright test tests/pipeline-sorting-e2e.spec.ts -g "Columna: Cliente Nuevo"

# Test de integración
npx playwright test tests/pipeline-sorting-e2e.spec.ts -g "Tests de Integración"
```

### Opción 3: Ejecutar en modo debug (con navegador visible)

```bash
npx playwright test tests/pipeline-sorting-e2e.spec.ts --debug
```

### Opción 4: Ejecutar en modo headed (ver el navegador)

```bash
npx playwright test tests/pipeline-sorting-e2e.spec.ts --headed
```

## 📊 Interpretar Resultados

### ✅ Tests Exitosos

Si todos los tests pasan, verás:
```
✓ 12 passed (30s)
```

Esto significa que el ordenamiento funciona correctamente en todas las columnas.

### ❌ Tests Fallidos

Si algún test falla, verás mensajes como:

```
✗ debería ordenar leads prioritarios con ventana de 24hs primero
  Error: Lead prioritario "Lead 1" debe aparecer antes que "Lead 2"
```

Esto indica qué columna tiene problemas de ordenamiento.

## 🔍 Troubleshooting

### Error: "ERR_CONNECTION_REFUSED"

**Solución:** Asegúrate de que la aplicación esté corriendo:
```bash
npm run dev
```

### Error: "Supabase configuration not found"

**Solución:** Configura las variables de entorno en `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### Tests fallan por timeout

**Solución:** Aumenta el timeout en `playwright.config.ts` o verifica que la aplicación responda rápidamente.

### Los leads de prueba no se crean

**Solución:** 
- Verifica que Supabase esté accesible
- Verifica que las credenciales sean correctas
- Revisa los logs de la consola para ver errores específicos

## 📝 Próximos Pasos

Una vez que los tests identifiquen problemas:

1. Revisa los errores reportados en la consola
2. Identifica qué columnas tienen problemas
3. Revisa el código del backend (`src/app/api/pipeline/leads/route.ts`)
4. Revisa el código del frontend (`src/hooks/usePipelineDragDrop.ts`)
5. Corrige los problemas
6. Ejecuta los tests nuevamente para verificar


