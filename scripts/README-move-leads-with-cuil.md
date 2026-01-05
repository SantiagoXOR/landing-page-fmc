# Script: Mover Leads con CUIL a Listo para Análisis

Script para procesar todos los leads existentes que tienen CUIL y moverlos automáticamente a la etapa "Listo para Análisis" si están en etapas iniciales.

## ¿Qué hace el script?

El script busca todos los leads que:
- ✅ Tienen CUIL válido (7+ caracteres, puede ser DNI o CUIL completo)
- ✅ Están en las etapas: `CLIENTE_NUEVO`, `CONSULTANDO_CREDITO`, `LEAD_NUEVO`, o `CONTACTO_INICIAL`
- ✅ O no tienen pipeline (se creará uno y se moverá directamente)

Y los mueve automáticamente a `LISTO_ANALISIS`.

## Uso

### Modo Dry-Run (recomendado primero)

Para ver qué leads se moverían sin hacer cambios:

```bash
node scripts/move-leads-with-cuil-to-analisis.js --dry-run
```

### Ejecutar el script

Para mover realmente los leads:

```bash
node scripts/move-leads-with-cuil-to-analisis.js
```

### Opciones

- `--dry-run`: Solo muestra qué leads se moverían sin hacer cambios
- `--limit N`: Procesa solo los primeros N leads (útil para pruebas)

### Ejemplos

```bash
# Ver qué se movería (sin cambios)
node scripts/move-leads-with-cuil-to-analisis.js --dry-run

# Procesar solo los primeros 10 leads (prueba)
node scripts/move-leads-with-cuil-to-analisis.js --limit 10

# Procesar todos los leads
node scripts/move-leads-with-cuil-to-analisis.js
```

## Validación de CUIL

El script acepta CUIL/DNI con:
- **7 dígitos**: DNI (algunas personas no saben su CUIL)
- **8 dígitos**: DNI completo
- **11 dígitos**: CUIL completo (formato XX-XXXXXXXX-X o sin guiones)

## Salida del Script

El script muestra:
1. **Búsqueda**: Cuántos leads tienen CUIL
2. **Filtrado**: Cuántos cumplen las condiciones
3. **Distribución**: Cuántos hay por cada etapa
4. **Progreso**: Cada lead procesado con su resultado
5. **Resumen final**: Total procesados, exitosos, errores

### Ejemplo de salida:

```
🚀 Script: Mover Leads con CUIL a Listo para Análisis

📋 Buscando leads con CUIL...
   Encontrados 150 leads con CUIL

📊 Obteniendo información de pipelines...
   45 leads cumplen las condiciones:

   - Tienen CUIL válido (7+ caracteres)
   - Están en: CLIENTE_NUEVO, CONSULTANDO_CREDITO, o sin pipeline

📊 Distribución por etapa:
   CLIENTE_NUEVO: 30 leads
   CONSULTANDO_CREDITO: 12 leads
   SIN_PIPELINE: 3 leads

🔄 Procesando leads...

   [1/45] ✅ Juan Pérez - Movido desde CLIENTE_NUEVO
   [2/45] ✅ María García - Movido desde CONSULTANDO_CREDITO
   ...

============================================================
📊 RESUMEN FINAL
============================================================
   Total procesados: 45
   ✅ Movidos exitosamente: 43
   ❌ Errores: 2
   ⚠️  No movidos: 0

✅ Script completado
```

## Seguridad

- ✅ El script usa transacciones seguras
- ✅ No bloquea si hay errores individuales
- ✅ Registra todos los movimientos en el historial del pipeline
- ✅ Usa modo dry-run por defecto para revisar antes de ejecutar

## Variables de Entorno Requeridas

- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio de Supabase (con permisos completos)

## Notas

- El script procesa los leads en lotes con pausas de 100ms entre cada uno para no sobrecargar la base de datos
- Los errores individuales no detienen el proceso completo
- Todos los movimientos se registran en `pipeline_history` con tipo `AUTOMATIC`
- El usuario del sistema se marca como `'system'` en el historial






