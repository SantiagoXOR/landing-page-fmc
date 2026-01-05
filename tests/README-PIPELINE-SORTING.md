# Tests de Ordenamiento del Pipeline

Esta suite de tests E2E verifica que el ordenamiento de leads prioritarios con ventana de 24hs funciona correctamente en todas las columnas del pipeline.

## Objetivo

Validar que:
- Leads prioritarios (high/urgent) con ventana de 24hs activa aparecen primero
- Dentro de los prioritarios, están ordenados en forma ascendente por fecha de creación (más antiguos primero)
- El ordenamiento funciona correctamente en todas las columnas
- El orden se mantiene después de recargar la página

## Archivos

- `tests/pipeline-sorting-e2e.spec.ts` - Suite principal de tests
- `tests/helpers/pipeline-test-helpers.ts` - Funciones helper para crear/limpiar datos de prueba

## Configuración

### Variables de Entorno Requeridas

```bash
# URL base de la aplicación
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Configuración de Supabase (opcional, pero recomendado)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Instalación

Los tests usan Playwright que ya está configurado en el proyecto. Asegúrate de tener las dependencias instaladas:

```bash
npm install
```

### ⚠️ Autenticación Requerida

**IMPORTANTE:** Estos tests requieren autenticación. La aplicación actualmente solo tiene OAuth con Google configurado.

**Opción 1: Usar estado de autenticación guardado (Recomendado)**

1. Asegúrate de que la aplicación esté corriendo:
   ```bash
   npm run dev
   ```

2. En otra terminal, ejecuta:
   ```bash
   npx playwright test tests/auth-setup.ts --project=chromium --headed
   ```

3. Cuando se abra el navegador:
   - Inicia sesión con Google manualmente
   - Espera a que se complete la autenticación
   - El estado se guardará automáticamente en `playwright/.auth/user.json`

4. Una vez completado, puedes ejecutar los tests de ordenamiento normalmente.

**Opción 2: Agregar proveedor de credenciales (Requiere cambios en código)**

Si prefieres usar credenciales de email/password (ej: `santiago@xor.com.ar` / `SavoirFaire19$`), necesitas agregar un `CredentialsProvider` a `src/lib/auth.ts`. Consulta la documentación de NextAuth para más detalles.

## Ejecutar Tests

### Ejecutar todos los tests de ordenamiento

```bash
npm run test:e2e:pipeline-sorting
```

### Ejecutar un test específico

```bash
npx playwright test tests/pipeline-sorting-e2e.spec.ts -g "Columna: Cliente Nuevo"
```

### Ejecutar en modo debug

```bash
npx playwright test tests/pipeline-sorting-e2e.spec.ts --debug
```

### Ejecutar en modo headed (con navegador visible)

```bash
npx playwright test tests/pipeline-sorting-e2e.spec.ts --headed
```

## Estructura de Tests

### Tests por Columna

Cada columna del pipeline tiene su propio test que verifica:
- Ordenamiento de leads prioritarios con ventana de 24hs
- Orden ascendente dentro de los prioritarios
- Posicionamiento correcto de leads no prioritarios

**Columnas testeadas:**
- Cliente Nuevo
- Consultando Crédito
- Solicitando Documentación
- Listo para Análisis

### Tests de Integración

- **Ordenamiento global**: Verifica que el ordenamiento funciona en múltiples columnas simultáneamente
- **Persistencia**: Verifica que el orden se mantiene después de recargar la página

### Tests de Edge Cases

- Leads sin fecha de creación
- Columnas vacías
- Leads prioritarios fuera de ventana de 24hs

## Cómo Funciona

1. **Setup**: Cada test crea leads de prueba con diferentes fechas y prioridades usando la API REST de Supabase
2. **Verificación**: Los tests navegan al pipeline y verifican el orden de los leads
3. **Limpieza**: Después de cada test, se eliminan los leads de prueba

## Helper Functions

### `createTestLeadWithDate(data: TestLeadData)`
Crea un lead de prueba con fecha específica y prioridad.

### `createTestLeadsBatch(leadsData: TestLeadData[])`
Crea múltiples leads de prueba en batch.

### `cleanupTestLeads(leadIds: string[])`
Elimina leads de prueba de la base de datos.

### `getLeadsFromStage(stageId: string, baseURL?: string)`
Obtiene leads de una etapa específica desde la API.

### `verifyLeadOrdering(leads: PipelineLead[], leadOriginalMap: Map)`
Verifica que los leads están ordenados correctamente según las reglas.

### `createLeadOriginalMap(leadIds: string[], baseURL?: string)`
Crea un mapa de leads originales para verificación de fechas.

## Troubleshooting

### Error: "Supabase configuration not found"
- Asegúrate de tener las variables de entorno configuradas
- Los tests intentarán usar la API de la aplicación como fallback

### Error: "Failed to create lead"
- Verifica que Supabase esté accesible
- Verifica que las credenciales sean correctas
- Verifica que la tabla `Lead` exista en Supabase

### Tests fallan por timeout
- Aumenta el timeout en `playwright.config.ts`
- Verifica que la aplicación esté corriendo en `http://localhost:3000`

### El ordenamiento no se verifica correctamente
- Verifica que los leads de prueba se hayan creado correctamente
- Revisa los logs de la consola para ver errores de ordenamiento
- Verifica que el backend esté aplicando el ordenamiento correctamente

## Próximos Pasos

Una vez que los tests identifiquen problemas de ordenamiento:

1. Revisar los errores reportados en la consola
2. Corregir el código del backend/frontend según sea necesario
3. Ejecutar los tests nuevamente para verificar la corrección
4. Agregar tests de regresión para prevenir futuros problemas


