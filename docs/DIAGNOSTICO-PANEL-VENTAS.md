# Diagnóstico del panel de ventas (Pipeline)

**Fecha:** 15/03/2026

## Resumen

Se revisó la coherencia entre las **métricas del panel** (Total Leads, Preaprobados, Rechazados, Leads Urgentes, Leads Estancados) y los datos mostrados en el **Pipeline Kanban**. Se detectó una inconsistencia en "Leads Urgentes" y "Leads Estancados" y se corrigió en código.

---

## Hallazgos

### 1. Inconsistencia corregida: Leads Urgentes (0 vs 856)

- **Qué pasaba:** El panel mostraba **Leads Urgentes: 0** mientras que en la etapa "Cliente Nuevo" el tablero mostraba **856 urgentes**.
- **Causa:** En `src/app/api/pipeline/metrics/route.ts`, los urgentes (y estancados) se calculaban solo sobre **leads creados en el período** (`periodLeads` = creados en el último mes). El Kanban, en cambio, cuenta todos los leads del pipeline con prioridad high/urgent según su tiempo en etapa.
- **Consecuencia:** Cualquier lead creado hace más de un mes no entraba en el período y no se contaba como urgente, aunque siguiera en "Cliente Nuevo" y por tiempo en etapa fuera urgente.
- **Corrección:** Urgentes y estancados pasan a calcularse sobre **todos los leads con pipeline** (`allLeads`), igual que Total Leads, Preaprobados y Rechazados. Así las métricas coinciden con lo que ve el usuario en el tablero.

### 2. Métricas que ya eran correctas

- **Total Leads:** Se calcula sobre todos los leads (`allLeads`). Coherente con el total del pipeline.
- **Preaprobados:** Cuenta leads en etapa `PREAPROBADO` (y tags de preaprobado). Correcto.
- **Rechazados:** Cuenta por etapa `RECHAZADO`/`CIERRE_PERDIDO` y tags de rechazo. Correcto.

### 3. Definiciones de “urgente” y “estancado”

- **Urgente:** `calculateTimeBasedScore()` devuelve `urgency === 'high'` o `'critical'` según días en etapa y umbrales por etapa (ej. en "nuevo": >7 días warning, >14 crítico).
- **Estancado:** Mismo servicio: `daysInStage >= 15`.

Ambas métricas usan la misma lógica que el Kanban (prioridad y tiempo en etapa).

---

## Revisión con MCP Supabase (tools del proyecto)

Se usaron las tools MCP **user-supabase-fmc**: `list_tables` (esquema) y `execute_sql` (consultas). Resultados reales en Supabase:

### Conteos en base de datos

| Métrica | SQL / tabla | Valor en DB |
|--------|-------------|-------------|
| **Total leads** | `SELECT COUNT(*) FROM "Lead"` | **1.485** |
| **En pipeline** | `SELECT COUNT(*) FROM lead_pipeline` | **476** |
| **Por etapa** | `lead_pipeline.current_stage` | CLIENTE_NUEVO 214, RECHAZADO 155, LISTO_ANALISIS 94, PREAPROBADO 9, APROBADO 2, CERRADO_GANADO 1, CONSULTANDO_CREDITO 1 |
| **Preaprobados** | `current_stage = 'PREAPROBADO'` | **9** |
| **Rechazados** | `current_stage = 'RECHAZADO'` | **155** |
| **Urgentes (Cliente Nuevo >7d)** | `CLIENTE_NUEVO` y `(NOW() - stage_entered_at) > 7 days` | **214** (todos los de Cliente Nuevo llevan >7 días) |
| **Estancados (15+ días, sin cerrados)** | `(NOW() - stage_entered_at) >= 15 days` excl. CERRADO_GANADO/RECHAZADO | **319** |

### Comparación con lo que puede mostrar el panel

- **Total Leads:** Si el panel muestra 1.000 puede deberse a un límite de la API o de Supabase (p. ej. 1.000 filas por request). En DB hay 1.485.
- **Preaprobados:** En DB hay **9**; si el panel muestra 0, revisar que `getLeads` + `getLeadPipelines` incluyan a esos 9 (orden, límite, RLS).
- **Rechazados:** En DB hay **155**; si el panel muestra 45, puede que solo se cuenten los que además tienen tag o que el conjunto de leads cargados esté limitado.
- **Leads Urgentes:** Con la corrección en código, la API debería acercarse a **214** (todos los de Cliente Nuevo con >7 días). El 856 de la captura correspondería a otro momento o a otro criterio de “urgente” en front.
- **Leads Estancados:** En DB hay **319**; tras la corrección, la API debería reflejar un valor coherente con esta lógica.

### Herramientas MCP usadas

- **list_tables** (schemas: `["public"]`, verbose: true): listado de tablas con columnas y FKs.
- **execute_sql** (query: string): ejecución de SQL de solo lectura para conteos y validación.

---

## Recomendaciones

1. **Cache del front:** El pipeline usa caché en `sessionStorage` (5 min). Si actualizas datos en BD, puede que el tablero no refleje cambios hasta refrescar o pasar el TTL.
2. **Tendencia de urgentes/estancados:** Al calcular ahora sobre todos los leads, el “período anterior” usa el mismo conjunto; la comparación mes a mes puede quedar estable hasta tener histórico de estados (ej. snapshot por día).
3. **Cuello de botella:** 863/1000 leads en "Cliente Nuevo" y 856 urgentes sugiere mucho volumen en la primera etapa; revisar capacidad de contacto y reglas de priorización.

---

## Archivos modificados

- `src/app/api/pipeline/metrics/route.ts`: cálculo de `urgentLeads` y `stalledLeads` (y tiempo en etapa) sobre `allLeads` en lugar de `periodLeads`.
