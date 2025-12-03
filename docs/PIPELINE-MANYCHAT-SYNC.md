# Sincronización Pipeline CRM ↔ ManyChat

Sistema de sincronización bidireccional entre el pipeline de ventas del CRM y ManyChat para activar automatizaciones basadas en el movimiento de leads.

## 🎯 Objetivo

Cuando un lead se mueve entre etapas del pipeline en el CRM:
1. Se actualiza su tag en ManyChat
2. Se remueve el tag de la etapa anterior
3. Se mantienen los tags de negocio (atencion-humana, etc.)
4. Se activa la automatización correspondiente en ManyChat

## 📋 Flujo del Pipeline

### Etapas del Pipeline

| Orden | Etapa CRM | Tag ManyChat | Descripción |
|-------|-----------|--------------|-------------|
| 1 | Cliente Nuevo | `lead-nuevo` | Cliente nuevo ingresado al sistema |
| 2 | Consultando Crédito | `lead-consultando` | Cliente consultando opciones |
| 3 | Solicitando Documentación | `solicitando-documentos` | Solicitando documentación |
| 4 | Listo para Análisis | `solicitud-en-proceso` | Documentación completa |
| 5 | Preaprobado | `credito-preaprobado` | Crédito preaprobado |
| 6 | Aprobado | `credito-aprobado` | Crédito aprobado finalmente |
| 7 | En Seguimiento | `en-seguimiento` | Seguimiento post-aprobación |
| 8 | Cerrado Ganado | `venta-cerrada` | Venta cerrada exitosamente |
| 9 | Encuesta Satisfacción | `encuesta-pendiente` | Pendiente encuesta |
| **Path Rechazado** | Rechazado | `credito-rechazado` | Crédito rechazado |
| **Path Referido** | Solicitar Referido | `solicitar-referido` | Solicitar referidos |

### Tags de Negocio (se mantienen)

- `atencion-humana` - Cliente requiere atención inmediata
- `venta-concretada` - Alias de venta-cerrada (histórico)

## 🚀 Instalación y Configuración

### 1. Ejecutar Migración de Base de Datos

La migración actualiza el enum `pipeline_stage` y crea la tabla `pipeline_stage_tags`:

```bash
# Opción A: Usando Supabase CLI (recomendado)
cd scripts/migrations
psql -h your-host -U postgres -d your-database < 002_update_pipeline_stages_manychat.sql

# Opción B: Desde Supabase Dashboard
# 1. Ve a SQL Editor en Supabase Dashboard
# 2. Copia el contenido de scripts/migrations/002_update_pipeline_stages_manychat.sql
# 3. Ejecuta el script
```

### 2. Poblar Tabla de Mapeo

Ejecuta el script de seed para insertar el mapeo de etapas:

```bash
node scripts/seed-pipeline-stage-tags.js
```

Esto creará 11 registros en `pipeline_stage_tags` con el mapeo de etapas a tags.

### 3. Crear Tags en ManyChat

Asegúrate de tener estos tags creados en ManyChat:

```bash
✓ lead-nuevo
✓ lead-consultando
✓ solicitando-documentos
✓ solicitud-en-proceso
✓ credito-preaprobado
✓ credito-aprobado
✓ en-seguimiento
✓ venta-cerrada
✓ encuesta-pendiente
✓ credito-rechazado
✓ solicitar-referido
```

Los tags de negocio:
```bash
✓ atencion-humana
✓ venta-concretada
```

### 4. Configurar Variables de Entorno

Asegúrate de tener estas variables en tu `.env`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# ManyChat
MANYCHAT_API_KEY=your-api-key
MANYCHAT_BASE_URL=https://api.manychat.com
```

## 🔄 Uso

### Mover Leads en el Pipeline

Simplemente arrastra y suelta leads entre columnas en la interfaz del pipeline. El sistema:

1. ✅ Actualiza la etapa en la base de datos
2. ✅ Obtiene el tag correspondiente a la nueva etapa
3. ✅ Remueve el tag de la etapa anterior en ManyChat
4. ✅ Agrega el nuevo tag en ManyChat
5. ✅ Mantiene los tags de negocio
6. ✅ Muestra un toast con el resultado
7. ✅ Registra la operación en `ManychatSync`

### Sincronización Automática

El sistema incluye retry automático para sincronizaciones fallidas:

```bash
# Procesar manualmente las sincronizaciones pendientes
node scripts/process-pending-manychat-syncs.js

# Configurar como cron job (cada 5 minutos)
*/5 * * * * cd /path/to/project && node scripts/process-pending-manychat-syncs.js
```

## 📊 Monitoreo

### Ver Sincronizaciones Pendientes

```sql
SELECT 
  id,
  "leadId",
  "syncType",
  status,
  "retryCount",
  error,
  "createdAt"
FROM "ManychatSync"
WHERE status IN ('pending', 'failed')
AND "retryCount" < 3
ORDER BY "createdAt" DESC;
```

### Estadísticas de Sincronización

```sql
SELECT 
  status,
  COUNT(*) as cantidad,
  AVG("retryCount") as promedio_reintentos
FROM "ManychatSync"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### Logs de la Aplicación

Los logs incluyen detalles de cada sincronización:

```javascript
// Ver logs en tiempo real
logger.info('Syncing pipeline to ManyChat', {
  leadId,
  manychatId,
  previousStage,
  newStage
})
```

## 🧪 Testing

### Ejecutar Tests Unitarios

```bash
# Todos los tests
npm test

# Tests específicos de sincronización
npm test manychat-sync.test.ts
npm test pipeline-move-endpoint.test.ts
```

### Test Manual

1. En el CRM, abre el pipeline
2. Arrastra un lead de "Cliente Nuevo" a "Consultando Crédito"
3. Verifica en ManyChat que:
   - El tag `lead-nuevo` fue removido
   - El tag `lead-consultando` fue agregado
   - Los tags de negocio se mantuvieron
4. Verifica que la automatización se activó en ManyChat

## 🔧 Troubleshooting

### Problema: Lead no se sincroniza con ManyChat

**Causa**: El lead no tiene `manychatId`

**Solución**:
```sql
-- Verificar si el lead tiene manychatId
SELECT id, nombre, "manychatId" 
FROM "Lead" 
WHERE id = 'lead-id';

-- Si no tiene, sincronizar desde ManyChat primero
npm run manychat:sync-by-ids
```

### Problema: Tag no se encuentra en ManyChat

**Causa**: El tag no existe o tiene nombre diferente

**Solución**:
1. Verificar que el tag existe en ManyChat
2. Verificar el mapeo en `pipeline_stage_tags`:

```sql
SELECT stage, manychat_tag 
FROM pipeline_stage_tags 
WHERE stage = 'CLIENTE_NUEVO';
```

### Problema: Sincronizaciones pendientes acumuladas

**Causa**: Rate limiting de ManyChat o errores temporales

**Solución**:
```bash
# Procesar todas las pendientes
node scripts/process-pending-manychat-syncs.js

# Ver detalles de las fallidas
SELECT * FROM "ManychatSync" 
WHERE status = 'failed' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### Problema: Error "Subscriber does not exist"

**Causa**: El subscriber fue eliminado de ManyChat

**Solución**:
1. Verificar si el contacto existe en ManyChat
2. Si fue eliminado, limpiar el `manychatId` del lead:

```sql
UPDATE "Lead" 
SET "manychatId" = NULL 
WHERE "manychatId" = 'subscriber-id-eliminado';
```

## 🔐 Seguridad

### Validaciones Implementadas

1. ✅ Autenticación de sesión requerida
2. ✅ Verificación de permisos (pipeline:write)
3. ✅ Validación de datos de entrada con Zod
4. ✅ Rate limiting en cliente ManyChat (3 reintentos con backoff exponencial)
5. ✅ Logging completo de operaciones

### Manejo de Errores

- Si falla ManyChat, el movimiento del lead en el CRM **NO se bloquea**
- La sincronización fallida se registra en `ManychatSync` para retry posterior
- Se muestra warning al usuario pero no se impide la operación

## 📚 Arquitectura

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │ Drag & Drop
       ▼
┌─────────────────────────────────────┐
│  PipelineBoardAdvanced (Frontend)  │
│  - usePipelineDragDrop hook         │
│  - Toast notifications              │
└──────────┬──────────────────────────┘
           │ POST /api/pipeline/leads/:id/move
           ▼
┌─────────────────────────────────────┐
│   Move Endpoint (Backend)           │
│   1. Validar permisos               │
│   2. Actualizar BD (pipeline)       │
│   3. Sincronizar ManyChat           │
└──────────┬──────────────────────────┘
           │
           ├──────────────┐
           ▼              ▼
┌────────────────┐  ┌──────────────────────┐
│  Supabase DB   │  │ manychat-sync.ts     │
│  - Lead        │  │ 1. Get current tags  │
│  - pipeline    │  │ 2. Filter tags       │
│  - history     │  │ 3. Update ManyChat   │
└────────────────┘  └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  manychat-client.ts  │
                    │  - API calls         │
                    │  - Retry logic       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   ManyChat API       │
                    │   - Add/Remove tags  │
                    │   - Trigger flows    │
                    └──────────────────────┘
```

## 🎓 Mejores Prácticas

1. **Siempre crear tags en ManyChat primero** antes de usarlas en el CRM
2. **Configurar el cron job** para procesar sincronizaciones pendientes
3. **Monitorear logs** regularmente para detectar problemas
4. **Mantener actualizado** el mapeo de etapas en `pipeline_stage_tags`
5. **Limpiar syncs antiguos** periódicamente (script incluido)

## 🔄 Próximos Pasos Recomendados

1. **Configurar Webhooks de ManyChat → CRM** para sincronización bidireccional
2. **Implementar notificaciones** cuando falla una sincronización importante
3. **Dashboard de monitoreo** para ver estado de sincronizaciones en tiempo real
4. **Automatizaciones avanzadas** basadas en combinaciones de tags
5. **A/B testing** de mensajes de ManyChat según etapa del pipeline

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs en la consola del servidor
2. Consulta la tabla `ManychatSync` para errores específicos
3. Verifica que los tags existan en ManyChat
4. Ejecuta el script de procesamiento de pendientes
5. Revisa este documento para troubleshooting

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2025  
**Mantenedor**: Equipo de Desarrollo FMC

