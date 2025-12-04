# Guía de Testing del Panel de Chats

## Descripción

Suite completa de tests E2E para el panel de chats (`/chats`) del CRM Phorencial usando Playwright. Los tests validan todas las funcionalidades principales del panel usando conversaciones existentes en la base de datos.

## Configuración Inicial

### 1. Autenticación

La aplicación usa Google OAuth para autenticación, por lo que es necesario crear un estado de autenticación persistente antes de ejecutar los tests.

#### Opción A: Script de Autenticación (Recomendado)

```bash
# Ejecutar el script de autenticación
npx playwright test tests/auth-setup.ts --project=chromium --headed
```

Este script:
- Abrirá un navegador
- Te permitirá autenticarte manualmente
- Guardará el estado de autenticación en `playwright/.auth/user.json`
- Los tests siguientes usarán automáticamente este estado

#### Opción B: Autenticación Manual

1. Asegúrate de que el servidor esté corriendo: `npm run dev`
2. Navega a `http://localhost:3000` en tu navegador
3. Autentícate con Google OAuth
4. Los tests se ejecutarán, pero se saltarán si no detectan autenticación

### 2. Instalar Dependencias de Playwright (si es necesario)

```bash
npx playwright install chromium
```

## Ejecutar los Tests

### Ejecutar todos los tests

```bash
npx playwright test tests/chats.spec.ts
```

### Ejecutar con configuración específica

```bash
# Solo Chromium, un worker a la vez (más lento pero más estable)
npx playwright test tests/chats.spec.ts --project=chromium --workers=1

# Modo headed (ver el navegador)
npx playwright test tests/chats.spec.ts --project=chromium --headed

# Ver reporte HTML después de ejecutar
npx playwright show-report
```

### Ejecutar tests específicos

```bash
# Solo tests de navegación
npx playwright test tests/chats.spec.ts -g "Navegación"

# Solo tests de búsqueda
npx playwright test tests/chats.spec.ts -g "Búsqueda"
```

## Estructura de los Tests

Los tests están organizados en las siguientes categorías:

### 1. Navegación y Carga Inicial
- Carga correcta de la página
- Visualización de paneles principales
- Estados de carga

### 2. Lista de Conversaciones
- Carga de conversaciones existentes
- Información de conversaciones (nombres, avatares, timestamps)
- Resaltado de conversación seleccionada

### 3. Búsqueda y Filtros
- Búsqueda por texto
- Filtros por plataforma (WhatsApp, Instagram, Todos)
- Estados vacíos

### 4. Ventana de Chat
- Visualización al seleccionar conversación
- Header con información del contacto
- Lista de mensajes
- Input y envío de mensajes

### 5. Sidebar de Detalles
- Información del contacto
- Estado de sincronización del chatbot
- Estado de la conversación
- Asignación de usuarios

### 6. Funcionalidades de Sincronización
- Botón de sincronizar
- Estados de sincronización
- Actualización de lista

### 7. Responsive Design
- Vista mobile
- Navegación entre vistas en mobile

### 8. Casos Edge
- Manejo de conversaciones vacías
- Conversaciones sin seleccionar
- Errores de consola

### 9. Integración con APIs
- Carga de conversaciones desde API
- Carga de detalles al seleccionar

## Comportamiento de los Tests

### Sin Autenticación

Si no hay estado de autenticación guardado:
- Los tests detectan automáticamente la falta de autenticación
- Se saltan con un mensaje informativo
- No fallan, simplemente se marcan como "skipped"

### Con Autenticación

Con estado de autenticación válido:
- Los tests se ejecutan normalmente
- Trabajan con datos reales de la base de datos
- Verifican funcionalidades con conversaciones existentes

## Solución de Problemas

### Error: "Autenticación requerida"

**Solución**: Ejecuta el script de autenticación:
```bash
npx playwright test tests/auth-setup.ts --project=chromium --headed
```

### Tests se saltan constantemente

**Causa**: No hay estado de autenticación guardado o expiró.

**Solución**: 
1. Verifica que existe `playwright/.auth/user.json`
2. Si no existe o expiró, ejecuta el script de autenticación nuevamente

### Error: "Storage state file not found"

**Solución**: El archivo de estado es opcional. Los tests funcionarán, pero se saltarán si no hay autenticación.

### Selectores no encuentran elementos

**Causa**: La estructura de la página cambió o los selectores necesitan actualización.

**Solución**: 
1. Revisa los selectores en `tests/test-data.ts`
2. Usa el inspector de Playwright: `npx playwright codegen http://localhost:3000/chats`

## Mantenimiento

### Actualizar Selectores

Los selectores están definidos en `tests/test-data.ts`. Si la estructura de la página cambia, actualiza los selectores correspondientes en el objeto `UI_SELECTORS`.

### Agregar Nuevos Tests

Los tests están organizados por funcionalidad. Para agregar nuevos tests:

1. Identifica la categoría apropiada en `tests/chats.spec.ts`
2. Agrega el nuevo test dentro del `test.describe` correspondiente
3. Usa los helpers de `TestUtils` cuando sea posible
4. Incluye verificación de autenticación: `if (!(await checkAuth(page))) test.skip();`

## Archivos Relacionados

- `tests/chats.spec.ts` - Suite principal de tests
- `tests/utils.ts` - Helpers y utilidades de testing
- `tests/test-data.ts` - Selectores UI y datos de prueba
- `tests/auth-setup.ts` - Script de autenticación
- `playwright.config.ts` - Configuración de Playwright

## Notas Importantes

- Los tests **NO crean datos de prueba**. Trabajan únicamente con datos existentes.
- Los tests son **idempotentes**: pueden ejecutarse múltiples veces sin efectos secundarios.
- Los tests manejan casos cuando no hay conversaciones (estado vacío).
- Los tests se adaptan automáticamente al contenido existente en la base de datos.











