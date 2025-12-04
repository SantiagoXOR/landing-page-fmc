# Script de Sincronización de Contactos de ManyChat por Etiquetas

Este script sincroniza contactos de ManyChat al CRM usando las etiquetas como filtro.

## ⚠️ Limitación de ManyChat API

**Importante**: ManyChat NO tiene un endpoint directo para obtener todos los subscribers por etiqueta. Este script intenta usar broadcasts temporales como método alternativo, pero puede que no funcione completamente dependiendo de las limitaciones de la API de ManyChat.

## Estrategia del Script

1. **Obtiene todas las etiquetas** de ManyChat usando `/fb/page/getTags`
2. **Para cada etiqueta relevante**:
   - Crea un broadcast temporal programado para 1 año en el futuro (nunca se enviará)
   - Intenta obtener información del broadcast para extraer subscriber IDs
   - Sincroniza cada subscriber al CRM
   - Cancela el broadcast temporal

## Requisitos

1. Variables de entorno configuradas en `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL` o `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` o `SUPABASE_SERVICE_ROLE_KEY`
   - `MANYCHAT_API_KEY`
   - `MANYCHAT_BASE_URL` (opcional, por defecto: `https://api.manychat.com`)

## Uso

```bash
npm run manychat:sync-by-tags
```

## Etiquetas Procesadas

El script procesa automáticamente estas etiquetas (si existen):
- `lead-consultando`
- `solicitud-en-proceso`
- `credito-rechazado`
- `credito-preaprobado`
- `venta-concretada`
- `atencion-humana`
- `lead-nuevo`

Si no encuentra estas etiquetas específicas, procesará todas las etiquetas disponibles.

## Limitaciones Conocidas

1. **ManyChat API no expone subscriber IDs directamente**: El script intenta usar broadcasts como workaround, pero esto puede no funcionar si ManyChat no devuelve los subscriber IDs en la información del broadcast.

2. **Broadcasts temporales**: El script crea broadcasts programados muy lejos en el futuro para evitar que se envíen mensajes reales. Sin embargo, estos broadcasts pueden aparecer en tu cuenta de ManyChat.

3. **Rate Limiting**: El script respeta los límites de ManyChat (100 req/s) con delays apropiados.

## Alternativas si el Script No Funciona

Si el script no puede obtener los subscriber IDs desde broadcasts, considera estas alternativas:

### Opción 1: Exportar Manualmente desde ManyChat
1. Ve a ManyChat → Contacts
2. Filtra por cada etiqueta
3. Selecciona todos los contactos (436 para lead-consultando, etc.)
4. Usa "Exportar audiencia personalizada de FB" o "Exportar audiencia personalizada de IG"
5. Esto te dará los subscriber IDs que puedes usar con otro script

### Opción 2: Usar Webhooks
Configura webhooks en ManyChat para capturar nuevos contactos cuando se asignan etiquetas. Esto solo funciona para contactos futuros, no para los existentes.

### Opción 3: Script por Teléfono
Si tienes una lista de teléfonos, usa el script `sync-manychat-contacts-by-phone.js`:
1. Crea `scripts/phones.txt` con un teléfono por línea
2. Ejecuta: `npm run manychat:sync-by-phone` (si existe)

## Ejemplo de Salida

```
============================================================
Sincronización de Contactos de ManyChat por Etiquetas
============================================================
ℹ Iniciando sincronización...
ℹ Supabase URL: https://xxxxx.supabase.co...
ℹ ManyChat API: https://api.manychat.com

ℹ Obteniendo etiquetas de ManyChat...
ℹ Encontradas 7 etiquetas
ℹ Procesando 7 etiquetas relevantes...

ℹ Procesando etiqueta: lead-consultando (436 contactos según ManyChat)
  Broadcast temporal creado: 12345
  Encontrados 436 subscriber IDs en el broadcast
    ✓ Subscriber 123456: CREADO
    ✓ Subscriber 123457: ACTUALIZADO
  ...
  Broadcast 12345 cancelado

============================================================
Resumen de Sincronización
============================================================
✓ Etiquetas procesadas: 7
✓ Subscribers encontrados: 575
✓ Creados en CRM: 450
✓ Actualizados en CRM: 125
ℹ Broadcasts creados: 7
ℹ Broadcasts cancelados: 7
ℹ Tiempo total: 120.45s
```

## Troubleshooting

### "No se pudieron obtener subscriber IDs del broadcast"
- ManyChat puede no devolver los subscriber IDs en la información del broadcast
- Considera usar la exportación manual desde ManyChat

### "Error al crear broadcast"
- Verifica que tu cuenta de ManyChat tenga permisos para crear broadcasts
- Verifica que la API key tenga los permisos necesarios

### "Broadcast no se puede cancelar"
- No es crítico, el broadcast está programado para 1 año en el futuro
- Puedes cancelarlo manualmente desde ManyChat si es necesario

## Notas Importantes

- Los broadcasts temporales pueden aparecer en tu cuenta de ManyChat
- El script procesa en lotes para respetar rate limits
- Si un broadcast falla, el script continúa con la siguiente etiqueta
- Los errores se registran pero no detienen el proceso completo





