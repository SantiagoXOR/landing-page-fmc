# Script de Sincronización de Etiquetas de ManyChat

Este script sincroniza las etiquetas de todos los contactos que tienen `manychatId` desde ManyChat hacia el CRM.

## ¿Cuándo usar este script?

- Cuando las etiquetas asignadas en ManyChat no se reflejan en el CRM
- Después de asignar etiquetas masivamente en ManyChat
- Para actualizar las etiquetas de contactos existentes que ya tienen `manychatId`
- Cuando los webhooks de ManyChat no están funcionando correctamente

## Requisitos

1. Variables de entorno configuradas en `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL` o `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` o `SUPABASE_SERVICE_ROLE_KEY`
   - `MANYCHAT_API_KEY`
   - `MANYCHAT_BASE_URL` (opcional, por defecto: `https://api.manychat.com`)

## Uso

### Opción 1: Usando npm script (recomendado)

```bash
npm run manychat:sync-tags
```

### Opción 2: Ejecutar directamente con Node.js

```bash
node -r dotenv/config scripts/sync-manychat-tags.js
```

### Opción 3: Ejecutar directamente (si las variables de entorno ya están configuradas)

```bash
node scripts/sync-manychat-tags.js
```

## ¿Qué hace el script?

1. **Obtiene todos los leads** que tienen `manychatId` desde la base de datos
2. **Para cada lead**:
   - Obtiene la información del subscriber desde ManyChat usando el `manychatId`
   - Extrae las etiquetas del subscriber
   - Actualiza el campo `tags` del lead en el CRM con las etiquetas de ManyChat
3. **Muestra un resumen** con:
   - Total de contactos procesados
   - Cantidad sincronizados exitosamente
   - Errores encontrados (si los hay)
   - Tiempo total de ejecución

## Ejemplo de salida

```
============================================================
Sincronización de Etiquetas de ManyChat al CRM
============================================================
ℹ Iniciando sincronización...
ℹ Supabase URL: https://xxxxx.supabase.co...
ℹ ManyChat API: https://api.manychat.com

ℹ Obteniendo leads con manychatId...
ℹ Encontrados 575 leads con manychatId
ℹ Procesando en 58 lotes de 10 contactos...

ℹ Procesando lote 1/58...
✓ Lead abc123 (Juan Pérez): 2 etiquetas - [lead-consultando, solicitud-en-proceso]
✓ Lead def456 (María García): 1 etiquetas - [credito-preaprobado]
...

============================================================
Resumen de Sincronización
============================================================
✓ Total procesados: 575
✓ Sincronizados exitosamente: 570
⚠ Fallidos: 5

Desglose de errores:
  ⚠ Subscriber no encontrado: 3
  ⚠ Otros errores: 2

ℹ Tiempo total: 45.23s
ℹ Promedio: 0.08s por contacto

============================================================
⚠ Sincronización completada con 5 errores
```

## Rate Limiting

El script respeta los límites de rate limiting de ManyChat (100 requests por segundo):
- Delay de 50ms entre cada contacto
- Delay de 200ms entre cada lote de 10 contactos

## Errores comunes

### "manychatId inválido"
- El lead tiene un `manychatId` que no es válido (null, undefined, NaN, etc.)
- **Solución**: Verificar el lead en la base de datos y corregir el `manychatId`

### "Subscriber no encontrado"
- El `manychatId` existe pero el subscriber ya no existe en ManyChat
- **Solución**: Puede ser normal si el contacto fue eliminado de ManyChat

### "Error de API"
- Problema de conexión o autenticación con ManyChat
- **Solución**: Verificar que `MANYCHAT_API_KEY` esté correctamente configurada

## Notas importantes

- El script solo sincroniza contactos que **ya tienen `manychatId`**
- Si un contacto no tiene `manychatId`, no será procesado por este script
- Para sincronizar contactos nuevos desde ManyChat, usar la sincronización masiva completa
- El script **no elimina** etiquetas del CRM que no existen en ManyChat, solo las actualiza con las de ManyChat
- Las etiquetas se guardan como JSON en el campo `tags` de la tabla `Lead`

## Siguientes pasos

Después de ejecutar el script:
1. Verificar en el CRM que las etiquetas se hayan actualizado correctamente
2. Si hay errores, revisar los logs para identificar contactos problemáticos
3. Para contactos con errores, verificar manualmente en ManyChat











