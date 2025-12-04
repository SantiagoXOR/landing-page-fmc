# Script de Scraping de Contactos de ManyChat con Playwright

Este script automatiza el navegador usando Playwright para extraer todos los contactos de ManyChat y sincronizarlos al CRM.

## ⚠️ Limitaciones Importantes

**ManyChat no tiene un endpoint API para listar todos los subscribers**, por lo que este script intenta hacer scraping de la interfaz web. Sin embargo:

- La estructura HTML de ManyChat puede cambiar sin aviso
- El scraping puede ser bloqueado por medidas anti-bot
- Es más lento que usar la API directamente
- Requiere credenciales de ManyChat

## ✅ Solución Recomendada

**La mejor forma de obtener todos los contactos sigue siendo:**
1. Exportar manualmente desde ManyChat por etiquetas
2. Usar el script `npm run manychat:sync-by-ids` con los CSVs exportados

Este script de scraping es una alternativa experimental.

## Requisitos Previos

1. **Playwright instalado** (ya está en el proyecto)
2. **Credenciales de ManyChat** en variables de entorno:
   ```env
   MANYCHAT_EMAIL=tu_email@ejemplo.com
   MANYCHAT_PASSWORD=tu_contraseña
   ```
3. **Variables de Supabase** configuradas (ya deberías tenerlas)

## Uso

### 1. Configurar credenciales

Agrega estas variables a tu archivo `.env`:

```env
MANYCHAT_EMAIL=tu_email@manychat.com
MANYCHAT_PASSWORD=tu_contraseña_segura
```

### 2. Ejecutar el script

```bash
npm run manychat:scrape-contacts
```

## ¿Qué hace el script?

1. **Inicia sesión en ManyChat**
   - Abre el navegador (modo visible para debugging)
   - Navega a `https://manychat.com/login`
   - Llena el formulario de login automáticamente
   - Si falla, espera que inicies sesión manualmente

2. **Navega a la sección de contactos**
   - Busca el enlace de "Contacts" en el menú
   - Navega a la página de contactos

3. **Extrae contactos**
   - Intenta encontrar elementos de contactos en el DOM
   - Si no encuentra contactos en el DOM, intercepta llamadas API
   - Extrae información de cada contacto (nombre, teléfono, email, etiquetas)

4. **Sincroniza al CRM**
   - Para cada contacto extraído, lo sincroniza al CRM
   - Crea nuevos contactos o actualiza existentes
   - Guarda etiquetas y custom fields

## Troubleshooting

### "No se pudo encontrar el campo de email"

El script toma un screenshot (`manychat-login-form.png`) para debugging. Revisa el screenshot y ajusta los selectores en el script si es necesario.

**Solución manual:**
- El script esperará que inicies sesión manualmente
- Presiona Enter cuando hayas iniciado sesión
- El script continuará automáticamente

### "No se pudieron extraer contactos automáticamente"

El script toma un screenshot (`manychat-contacts-page.png`) para debugging.

**Alternativas:**
1. Exporta manualmente desde ManyChat:
   - Ve a Contacts
   - Selecciona todos los contactos
   - Exporta como CSV
   - Usa: `npm run manychat:sync-by-ids archivo.csv`

2. Revisa el screenshot y ajusta los selectores en el script

### "Error durante el scraping"

El script guarda un screenshot del error (`manychat-error.png`).

**Verifica:**
- Las credenciales son correctas
- ManyChat no ha cambiado su estructura HTML
- No hay medidas anti-bot activas
- Tu conexión a internet es estable

## Screenshots de Debugging

El script genera screenshots automáticamente cuando encuentra problemas:

- `manychat-login-form.png` - Formulario de login (si no encuentra campos)
- `manychat-login-error.png` - Error al iniciar sesión
- `manychat-contacts-page.png` - Página de contactos (si no encuentra contactos)
- `manychat-error.png` - Error general durante el scraping

## Configuración Avanzada

### Modo headless (sin mostrar navegador)

Edita `scripts/scrape-manychat-contacts.js` y cambia:

```javascript
const browser = await chromium.launch({ 
  headless: true, // Cambiar a true para modo headless
  slowMo: 500
})
```

### Ajustar velocidad

Cambia el valor de `slowMo`:

```javascript
slowMo: 1000 // Más lento (1000ms entre acciones)
slowMo: 100  // Más rápido (100ms entre acciones)
slowMo: 0    // Sin delay
```

### Ajustar selectores

Si ManyChat cambia su estructura HTML, edita los arrays de selectores en el script:

```javascript
const emailSelectors = [
  'input[type="email"]',
  'input[name="email"]',
  // Agregar nuevos selectores aquí
]
```

## Limitaciones Conocidas

1. **Estructura HTML cambiante**: ManyChat puede cambiar su HTML sin aviso
2. **Medidas anti-bot**: ManyChat puede detectar y bloquear automatización
3. **Rendimiento**: El scraping es más lento que usar la API
4. **Mantenimiento**: Requiere actualizar selectores si ManyChat cambia

## Alternativas Recomendadas

### Opción 1: Exportación Manual + Script (Recomendada)

```bash
# 1. Exporta desde ManyChat por etiquetas
# 2. Usa el script de sincronización
npm run manychat:sync-by-ids "ruta-al-archivo.csv"
```

**Ventajas:**
- ✅ Más confiable
- ✅ No depende de la estructura HTML
- ✅ Más rápido
- ✅ No requiere credenciales en el script

### Opción 2: Webhooks

Configura webhooks en ManyChat para capturar nuevos contactos automáticamente cuando se crean.

**Ventajas:**
- ✅ Automático en tiempo real
- ✅ No requiere scraping
- ✅ Más eficiente

## Notas de Seguridad

- ⚠️ **Nunca compartas tu archivo `.env`** con credenciales
- ⚠️ **No subas credenciales a Git**
- ⚠️ El script guarda screenshots que pueden contener información sensible
- ⚠️ Elimina los screenshots después de debugging

## Próximos Pasos

Después de ejecutar el script:

1. Verifica en el CRM que los contactos se hayan sincronizado
2. Ejecuta `npm run manychat:sync-tags` para sincronizar etiquetas de contactos existentes
3. Configura webhooks en ManyChat para sincronización automática futura




