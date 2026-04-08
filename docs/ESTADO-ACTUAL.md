# Estado actual del proyecto — CRM Phorencial

> **Última actualización:** 7 de abril de 2026  
> **Versión declarada en `package.json`:** 0.1.0  
> **Estado general:** Producto maduro en código; validación de entorno y CI debe hacerse por quien despliega.

La foto **cuantitativa y verificable** del repositorio está en **[AUDITORIA-PROYECTO.md](./AUDITORIA-PROYECTO.md)** (inventario de rutas, tests ejecutados, brechas). Este documento resume **qué hay implementado** y **qué sigue mejorándose**.

---

## Resumen ejecutivo

- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind, Supabase (`@supabase/supabase-js`), NextAuth, tRPC, Prisma aún presente en tooling (`postinstall` y scripts `db:*`).
- **APIs:** Más de **70** rutas `route.ts` bajo `src/app/api/` (no solo “CRUD básico”).
- **UI:** Dashboard, leads, pipeline, chats, documentos, reportes, administración (usuarios y **permisos**), scoring, asistentes; rutas **Manychat** en el árbol como **legado** (desuso operativo).
- **Integraciones (mensajería):** **UChat** como canal principal ([CANAL-PRINCIPAL-UCHAT.md](./CANAL-PRINCIPAL-UCHAT.md)), más WhatsApp/Meta (webhooks y envío). Manychat solo referencia histórica.
- **Observabilidad:** Sentry (`@sentry/nextjs`) e instrumentación presentes; health check en `/api/health` es **mínimo** (no comprueba DB).
- **Tests:** Playwright en `tests/` y `e2e/`; Vitest en `src/**/__tests__`. Última corrida documentada de Vitest: **62/62 OK** (abril 2026; ver auditoría).

**Completitud funcional (estimación honesta):** el núcleo CRM + pipeline + mensajería + admin está **implementado en código**; el trabajo restante es sobre todo **endurecimiento** (health, cobertura, coherencia Prisma/Supabase, pulido UX, alinear docs históricos).

---

## Progreso por módulo (alineado al código)

### Autenticación y seguridad — ~95%

- NextAuth, middleware, roles (ADMIN, MANAGER, ANALISTA, VENDEDOR, VIEWER).
- RBAC y APIs de permisos; **UI de permisos** en `/admin/permissions`.

### Gestión de leads — ~90%

- CRUD, validación Zod, filtros y búsqueda (incluye componentes de búsqueda avanzada en código).
- Webhooks y rutas de eventos según integraciones.

### Pipeline — ~90%

- APIs de etapas, movimiento de leads, métricas, historial; UI avanzada (`PipelineBoardAdvanced`, etc.).  
- Cualquier incidencia puntual de RLS o datos depende del **estado de la base Supabase** en cada entorno (no auditable solo desde el repo).

### Dashboard y reportes — ~85%

- Métricas, gráficos, páginas bajo `reports/`, exportes vía API.

### Documentos — ~80%

- Upload con **Supabase Storage** y permisos granulares en `documents/upload`; límites de plataforma (p. ej. Vercel) documentados en el propio route.

### Conversaciones y WhatsApp — ~75–85%

- Rutas de conversaciones, mensajes, envío; UI de chats.  
- La **experiencia end-to-end** (webhooks en producción, enlace automático mensaje–lead en todos los casos) debe validarse en el entorno real.

### UChat + WhatsApp — ~85% (operativo objetivo)

- Webhook `POST /api/webhooks/uchat`, servicio `uchat-webhook-service`, variables `UCHAT_*` e integración con pipeline documentadas en **UCHAT-SETUP.md** y enlaces en **CANAL-PRINCIPAL-UCHAT.md**.

### Manychat — legado (desuso operativo)

- Páginas y APIs relacionadas pueden seguir en el repo; **no** es la integración a configurar en nuevos despliegues. Ver **CANAL-PRINCIPAL-UCHAT.md**.

### Scoring y reglas — ~75%

- APIs `scoring`, UI `settings/scoring`, constructores de reglas en componentes.

### Automatización — ~70%

- Rutas y UI relacionadas (`automation`); profundidad según reglas de negocio concretas.

### Testing — en evolución

- **Vitest:** 8 archivos de test; última corrida local **62/62** (abril 2026).  
- **Playwright:** múltiples especificaciones; no se ejecutaron en esta actualización de documentación.

---

## Problemas conocidos (actualizados)

### Críticos (entorno / datos)

1. **Base de datos:** Sin conexión activa en la auditoría, no se puede afirmar que migraciones RLS o triggers estén aplicados en producción. Revisar panel Supabase y scripts de migración del proyecto.
2. **Prisma + Supabase:** Riesgo de confusión para nuevos desarrolladores; documentar flujo recomendado (ver README).

### Importantes (producto / calidad)

3. **Health check:** Solo confirma que la app responde; ampliar si se requiere monitoreo serio.
4. **Rate limiting:** Existe en partes del sistema (tRPC, algunas rutas); no uniforme en toda la API.

### Menores

5. **Badges del sidebar / design system:** Algunos ejemplos y el sidebar usan contadores estáticos o TODOs de “conectar a API”.
6. **Documentación histórica en la raíz:** Archivos como `ESTADO-FINAL-CRM.md` pueden contradecir el estado real; priorizar `docs/ESTADO-ACTUAL.md` y `docs/AUDITORIA-PROYECTO.md`.

---

## Métricas aproximadas del repositorio

| Concepto | Orden de magnitud (abr 2026) |
|----------|-------------------------------|
| Rutas API (`route.ts`) | ~74 |
| Páginas (`page.tsx` en `src/app`) | ~33 |
| Componentes `.tsx` en `src/components` | ~104 |
| Archivos E2E `*.spec.ts` | ~19 |
| Archivos de test Vitest bajo `src/` | ~8 |

Los números exactos pueden cambiar con cada commit; la auditoría detalla cómo se contaron.

---

## Próximos hitos sugeridos

1. Añadir Vitest (y E2E) a CI si aún no están en el pipeline.
2. Ejecutar suite Playwright contra un entorno de staging con variables reales.
3. Extender `/api/health` (opcional: Supabase ping, Redis).
4. Unificar narrativa: archivar o actualizar markdowns de la raíz que declaran “100%” sin criterios.
5. Definir guía “fuente de verdad” para esquema de datos (Prisma vs migraciones SQL Supabase).

---

## Stack tecnológico (referencia rápida)

- **Frontend:** Next.js 14, React 18, Tailwind, shadcn/Radix, Recharts, TanStack Query, tRPC.
- **Backend:** Route Handlers, servicios en `src/server`, validación Zod.
- **Datos:** Supabase cliente; Prisma en proyecto para generación/migraciones según scripts.
- **Auth:** NextAuth.js.
- **Tests:** Vitest, Jest (scripts), Playwright.
- **Observabilidad:** Sentry, componentes de performance.

---

## Enlaces

- [Auditoría detallada](./AUDITORIA-PROYECTO.md)
- [Canal mensajería: UChat vs Manychat](./CANAL-PRINCIPAL-UCHAT.md)
- [Índice de documentación](./README.md)
- [Setup de desarrollo](./SETUP-DESARROLLO.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
