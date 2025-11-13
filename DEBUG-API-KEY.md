# 🔍 Debug de API Key de Manychat

## Problema Actual

La API key está dando error **401 "Wrong token"**

**API Key actual:** `3724482:1794c641bf42...`

## Formatos Posibles de API Key

### Formato 1: API Token Estándar (Esperado)
```
Formato: XXXXXXXX:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Ejemplo: 3724482:1bf0d7525e7c87d854d087f44afae137
```

Este es el formato que tienes. Es similar al formato de tokens de bot de Telegram.

### Formato 2: API Key con Prefijo
```
Formato: MCAPIKey-XXXXXXXXXXXXXXXXXXXX
```

Algunas APIs de Manychat usan este prefijo.

## Verificación en Manychat

### Paso 1: Ir a la Configuración de API

1. Abre Manychat en tu navegador
2. Click en **Settings** (⚙️) en la barra lateral izquierda
3. En el menú de Settings, busca y click en **API**

### Paso 2: Verificar la Sección "API Key"

Deberías ver una sección que dice **"Obtener clave de API"** o **"API Key"**

**IMPORTANTE:** Verifica lo siguiente:

#### ¿Qué ves en esa sección?

- [ ] Un campo de texto con una key visible (copiar esa)
- [ ] Un botón "Regenerar Clave De API" (click para generar nueva)
- [ ] Un botón "Generate API Key" (click para generar primera vez)
- [ ] La key está oculta con asteriscos ******* (necesitas regenerar)

### Paso 3: Copiar la Key Correctamente

**Si ves la key visible:**
1. Selecciona TODO el texto de la key
2. Copia (Ctrl+C)
3. Pega en un editor de texto primero para verificar
4. NO debe tener espacios al inicio o final
5. NO debe tener saltos de línea

**Si necesitas regenerar:**
1. Click en "Regenerar Clave De API"
2. Aparecerá un diálogo de confirmación
3. Confirma que quieres regenerar
4. Copia la NUEVA key que aparece
5. ⚠️ La anterior dejará de funcionar

### Paso 4: Verificar en Pantalla de Manychat

Toma una captura de pantalla de la sección de API en Manychat y verifica:

1. ¿La key mostrada en Manychat coincide con la que tienes en .env.local?
2. ¿Hay algún mensaje de error o advertencia en esa página?
3. ¿Tu cuenta de Manychat está activa y no suspendida?

## Posibles Causas del Error 401

### 1. Key No Coincide
La key en .env.local no es la misma que está activa en Manychat.

**Solución:** Copia exactamente la key de Manychat.

### 2. Key Revocada/Expirada
La key fue regenerada o revocada.

**Solución:** Genera una nueva key en Manychat.

### 3. Cuenta No Autorizada
Tu cuenta de Manychat no tiene permisos para usar la API.

**Solución:** Verifica el plan de Manychat (puede requerir plan PRO).

### 4. Formato Incorrecto
La key tiene espacios, saltos de línea o caracteres extra.

**Solución:** Limpia la key, asegúrate que sea una sola línea.

### 5. Problema de Autenticación
El header de autorización no se está enviando correctamente.

**Solución:** Esto sería un problema del código (pero el código ya está probado).

## Test Manual

Puedes probar la API key manualmente con curl:

```bash
curl -X GET "https://api.manychat.com/fb/page/getInfo" \
  -H "Authorization: Bearer TU_API_KEY_AQUI" \
  -H "Content-Type: application/json"
```

**Reemplaza `TU_API_KEY_AQUI` con tu key real.**

**Respuesta esperada si funciona:**
```json
{
  "status": "success",
  "data": {
    "id": "...",
    "name": "Formosa Moto Crédito",
    ...
  }
}
```

**Respuesta si falla:**
```json
{
  "status": "error",
  "error": "Wrong token"
}
```

## Verificación del .env.local

Tu archivo `.env.local` debe tener exactamente esto (sin espacios extra):

```env
MANYCHAT_API_KEY=3724482:1bf0d7525e7c87d854d087f44afae137
MANYCHAT_BASE_URL=https://api.manychat.com
MANYCHAT_WEBHOOK_SECRET=manychat-webhook-secret-temporal-2024-formosa-moto-credito
```

## Método Alternativo: Usar API Token de WhatsApp Direct

Si Manychat API no funciona, existe la opción de usar **WhatsApp Business API directa** (Meta):

1. Obtener credenciales de Meta Business
2. Usar `WHATSAPP_ACCESS_TOKEN` en lugar de Manychat
3. El código ya soporta fallback automático

Ver: [Meta WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/business-management-api)

## Siguiente Paso

1. **Ve a Manychat → Settings → API**
2. **Toma una captura de pantalla** de esa página
3. **Verifica** que la key en la imagen coincida con tu .env.local
4. Si NO coincide, **copia la correcta**
5. Si necesitas regenerar, hazlo y **copia la nueva**

Luego ejecuta de nuevo:
```bash
node test-manychat-simple.js
```

---

## ¿Necesitas Ayuda?

Si sigues teniendo problemas:
1. Comparte la captura de la página de API de Manychat (oculta la key completa)
2. Verifica tu plan de Manychat (¿es Free, Pro, Premium?)
3. Verifica si hay mensajes de error en tu cuenta de Manychat

