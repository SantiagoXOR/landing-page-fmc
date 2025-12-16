# Script de Importación desde CSV de ManyChat

Este script importa contactos desde un archivo CSV exportado de ManyChat al CRM.

## ✅ Solución Recomendada

Dado que ManyChat **NO tiene un endpoint API** para obtener todos los subscribers por etiqueta, la mejor solución es:

1. **Exportar manualmente desde ManyChat** (solo una vez)
2. **Importar usando este script** (automático)

## Pasos para Exportar desde ManyChat

### Opción 1: Exportar por Etiqueta (Recomendado)

1. Ve a ManyChat → **Contacts**
2. En el panel izquierdo, haz clic en la etiqueta que quieres exportar (ej: `lead-consultando`)
3. Esto filtrará los contactos con esa etiqueta
4. Selecciona todos los contactos (botón "Seleccionar todos" o `Ctrl+A`)
5. Haz clic en **"Acciones Masivas"** (Massive Actions)
6. Busca la opción **"Exportar audiencia personalizada de FB"** o **"Exportar audiencia personalizada de IG"**
7. Esto descargará un archivo CSV con los subscriber IDs

### Opción 2: Exportar Todos los Contactos

1. Ve a ManyChat → **Contacts**
2. Selecciona todos los contactos
3. Usa **"Acciones Masivas"** → **"Exportar audiencia personalizada"**
4. Esto exportará todos los contactos

## Formato del CSV Esperado

El script busca estas columnas en el CSV (no todas son requeridas):

**Columnas principales:**
- `Subscriber ID` o `subscriber_id` o `ID` o `PSID` (manychatId)
- `Phone` o `phone` o `WhatsApp Phone` o `Teléfono` (teléfono)
- `First Name` o `first_name` o `Nombre` (nombre)
- `Last Name` o `last_name` o `Apellido` (apellido)
- `Email` o `email` o `Correo` (email)

**Columnas de etiquetas:**
- `tags` o `tag` o `etiquetas` (puede ser JSON array o separado por comas)

**Columnas de custom fields:**
- `DNI` o `dni`
- `Ingresos` o `ingresos`
- `Zona` o `zona`
- `Producto` o `producto`
- `Monto` o `monto`
- `Estado` o `estado`
- `Agencia` o `agencia`
- `Banco` o `banco`
- `Trabajo Actual` o `trabajo_actual`
- `CUIT` o `cuit` o `CUIL` o `cuil`

## Uso del Script

### 1. Preparar el archivo CSV

- Guarda el CSV exportado de ManyChat como `manychat-export.csv`
- Colócalo en la carpeta `scripts/` del proyecto

**Ubicaciones donde el script busca el archivo:**
- `scripts/manychat-export.csv`
- `scripts/manychat-contacts.csv`
- `manychat-export.csv` (raíz del proyecto)
- `manychat-contacts.csv` (raíz del proyecto)

### 2. Ejecutar el script

```bash
npm run manychat:import-csv
```

## Ejemplo de Salida

```
============================================================
Importación de Contactos desde CSV de ManyChat
============================================================
ℹ Iniciando importación...
ℹ Supabase URL: https://xxxxx.supabase.co...
ℹ Archivo encontrado: scripts/manychat-export.csv
ℹ Leyendo archivo CSV...
ℹ Encontradas 597 filas en el CSV
ℹ Columnas encontradas: Subscriber ID, Phone, First Name, Last Name, Email, Tags
ℹ Procesando 597 contactos...

✓ [1/597] Juan Pérez: CREADO
✓ [2/597]: ACTUALIZADO
...
ℹ Progreso: 10/597 (2%)
...

============================================================
Resumen de Importación
============================================================
✓ Total procesados: 597
✓ Creados en CRM: 450
✓ Actualizados en CRM: 147
ℹ Tiempo total: 45.23s
ℹ Promedio: 0.08s por contacto

============================================================
✓ ¡Importación completada! 450 creados, 147 actualizados
```

## Características del Script

- ✅ **Detección automática de delimitadores** (coma o punto y coma)
- ✅ **Mapeo flexible de columnas** (busca múltiples nombres posibles)
- ✅ **Normalización de teléfonos** (agrega código de país si falta)
- ✅ **Extracción de etiquetas** (desde JSON o separado por comas)
- ✅ **Manejo de custom fields** (mapea automáticamente campos comunes)
- ✅ **Actualización inteligente** (busca por manychatId o teléfono)
- ✅ **Manejo de errores** (continúa aunque falle algún contacto)

## Troubleshooting

### "No se encontró archivo CSV"
- Verifica que el archivo esté en una de las ubicaciones mencionadas
- Verifica que el nombre del archivo sea correcto
- Verifica que el archivo tenga extensión `.csv`

### "El archivo CSV está vacío o no tiene formato válido"
- Abre el CSV en un editor de texto y verifica que tenga contenido
- Verifica que tenga al menos una fila de encabezados
- Verifica que use comas (`,`) o punto y coma (`;`) como delimitador

### "Omitido - no_phone_or_id"
- El contacto no tiene teléfono ni subscriber ID
- Estos contactos se omiten automáticamente
- Puedes agregarlos manualmente después si es necesario

### "Error al crear/actualizar lead"
- Verifica que las variables de entorno de Supabase estén configuradas
- Verifica que tengas permisos para escribir en la tabla Lead
- Revisa los logs para más detalles del error

## Notas Importantes

- El script **no elimina** contactos existentes, solo crea o actualiza
- Si un contacto ya existe (por teléfono o manychatId), se actualiza con los datos del CSV
- Las etiquetas se guardan como JSON en el campo `tags`
- Los custom fields se guardan como JSON en el campo `customFields`
- El script procesa todos los contactos del CSV, incluso si ya existen en el CRM

## Próximos Pasos

Después de importar:
1. Ejecuta `npm run manychat:sync-tags` para sincronizar etiquetas de contactos existentes
2. Verifica en el CRM que los contactos se hayan importado correctamente
3. Configura webhooks en ManyChat para sincronización automática futura













