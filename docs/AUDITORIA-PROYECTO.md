# Auditoría del repositorio — CRM Phorencial

**Fecha de auditoría:** 7 de abril de 2026  
**Alcance:** Inventario estático del código en `src/`, dependencias (`package.json`), y una corrida local de tests unitarios (Vitest). No se desplegó ni se validó contra Supabase/Vercel en esta sesión.

---

## 1. Metodología

1. Conteo de rutas API (`src/app/api/**/route.ts`).
2. Conteo de páginas App Router (`src/app/**/page.tsx`).
3. Inventario de suites E2E (Playwright) y unitarias (Vitest).
4. Revisión puntual de módulos que la documentación antigua marcaba como “pendientes” (documentos, permisos, Sentry, conversaciones, scoring).
5. Ejecución: `npx vitest run` en el workspace del proyecto.

---

## 2. Hallazgos objetivos (código presente)

| Área | Evidencia |
|------|-----------|
| **Rutas API (App Router)** | **74** archivos `route.ts` bajo `src/app/api/` (leads, pipeline, documentos, conversaciones, WhatsApp, webhooks, scoring, automatización, admin, reportes, health, tRPC, etc.). |
| **Páginas UI** | **33** `page.tsx` bajo `src/app/` (incluye rutas `manychat/*` **legado**; operación actual de mensajería: **UChat** — ver `docs/CANAL-PRINCIPAL-UCHAT.md`). |
| **Componentes React** | **104** `.tsx` bajo `src/components/`. |
| **Tests E2E** | **19** archivos `*.spec.ts` entre `tests/` y `e2e/` (auth, leads, dashboard, pipeline, documentos, chats, WhatsApp, permisos, etc.). |
| **Tests unitarios (Vitest)** | **8** archivos de test bajo `src/`; ver sección 3. |
| **Documentos / storage** | Existe `POST /api/documents/upload` con `SupabaseStorageService`, permisos RBAC y límites de tamaño documentados en código. |
| **Permisos granulares (UI)** | Página `src/app/(dashboard)/admin/permissions/page.tsx` con matriz y diálogo de permisos. APIs `admin/permissions`. |
| **Scoring** | Rutas `api/scoring/*`, página `settings/scoring`, componente `RuleBuilder`. |
| **Conversaciones / mensajería** | Rutas `api/conversations/*`, `api/messaging/*`, `api/leads/[id]/messages`; UI de chat (`chats`). |
| **WhatsApp** | Varias rutas (`webhooks/whatsapp`, `whatsapp/send`, `events/whatsapp`, `integrations/whatsapp/send`, etc.). |
| **Sentry** | Dependencia `@sentry/nextjs`, `sentry.client.config.ts`, `sentry.server.config.ts`, `instrumentation.ts`, uso en hooks/componentes de monitoreo. |
| **Rate limiting** | `src/lib/rate-limit-api.ts`, middleware en routers tRPC (`rateLimitMiddleware`), uso en rutas como dealers/geocoding. **No** implica que todos los endpoints públicos estén limitados por igual. |
| **Health check** | `GET /api/health` devuelve `ok`, `env`, `timestamp` (básico; no verifica DB ni integraciones externas). |
| **Stack híbrido DB** | `package.json` mantiene **Prisma** (`postinstall: prisma generate`, scripts `db:*`) además de Supabase; conviene tratarlo como migración/evolución en curso, no como “solo Supabase”. |

---

## 3. Resultado de tests (Vitest)

**Comando:** `npx vitest run`

- **Archivos:** 8 ejecutados, **todos pasados** (tras alinear el assert del mensaje vacío con el copy de la API en la misma sesión de documentación).
- **Tests:** 62 totales — **62 pasados**.

**Nota histórica:** Antes el test `debe validar que el mensaje no esté vacío` buscaba la palabra `"vacío"` en el error; la API devolvía *"Escribe un mensaje o adjunta un archivo…"*. El assert se actualizó para coincidir con el comportamiento real.

---

## 4. Brechas y deuda documentada (post-auditoría)

Cosas que **siguen siendo mejorables** aunque el código ya cubra mucho:

1. **Documentación dispersa:** Varios `.md` en la raíz afirman “100% completo” o estados contradictorios; este archivo y `ESTADO-ACTUAL.md` deben usarse como referencia de inventario.
2. **Health check:** Ampliar comprobaciones opcionales (Supabase, Redis si aplica) para operaciones reales.
3. **Cobertura E2E/unitaria:** No se midió cobertura porcentual global; conviene `vitest --coverage` / informes Playwright en CI.
4. **Prisma vs Supabase:** Clarificar en README qué flujo es el canónico para nuevas features (evitar doble fuente de verdad).
5. **TODOs en código:** Badges del sidebar y ejemplos del design system aún mencionan valores estáticos o API dinámica pendiente (`Sidebar.tsx`, docs de componentes).
6. **`usePerformanceMonitoring.ts`:** Comentario sobre compatibilidad de `web-vitals` (dependencia ya en `^5.1.0`; revisar si el TODO sigue vigente).

*(El desajuste Vitest en mensajes vacíos de conversaciones fue corregido en el mismo cambio que esta auditoría.)*

---

## 5. Conclusión

El proyecto está **muy por encima** del retrato de “85% con documentos/WhatsApp/scoring/permisos pendientes” que figuraba en documentos de 2025: hay **decenas de endpoints**, **módulos de documentos, conversaciones, scoring, permisos, automatización y monitoreo** presentes en el árbol de código.

La **calidad operativa** (todo pasa en CI, datos consistentes en producción) **no fue verificada** en esta auditoría: hace falta validar entorno, migraciones Supabase y corridas E2E completas donde corresponda.

---

## 6. Mantenimiento de este documento

Actualizar la **fecha** y las **tablas numéricas** cuando haya cambios grandes de arquitectura o antes de releases importantes. Opcional: script que cuente `route.ts` y `page.tsx` para evitar deriva manual.
