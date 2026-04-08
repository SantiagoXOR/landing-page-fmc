# Roadmap — CRM Phorencial

> **Última revisión:** 7 de abril de 2026  
> Este archivo resume **prioridades** y enlaza el estado verificado del código. Los números exactos de rutas y tests están en [docs/AUDITORIA-PROYECTO.md](docs/AUDITORIA-PROYECTO.md).

---

## Estado resumido

El repositorio incluye, entre otras cosas: **Next.js 14**, **Supabase** (cliente y storage), **NextAuth**, **tRPC**, **Sentry**, rutas de **pipeline**, **documentos**, **conversaciones**, **WhatsApp**, **UChat** (mensajería operativa), código **Manychat** en **legado**, **scoring**, **automatización**, **reportes** y **administración de permisos**. Parte de la documentación histórica en la raíz del repo puede **sobreestimar o subestimar** el avance; usar siempre `docs/ESTADO-ACTUAL.md`, `docs/AUDITORIA-PROYECTO.md` y `docs/CANAL-PRINCIPAL-UCHAT.md` para mensajería.

---

## Prioridades recomendadas

### 1. Calidad y CI (alta)

- Ejecutar **Playwright** contra un entorno con variables reales y documentar el resultado.
- Integrar **Vitest** (y opcionalmente E2E) en pipeline de CI si aún no está.

### 2. Operaciones (alta)

- Ampliar **`GET /api/health`** si se requiere monitoreo serio (p. ej. ping a Supabase).
- Revisar **RLS y migraciones** en el proyecto Supabase activo (no comprobable solo desde git).

### 3. Producto y UX (media)

- Sustituir **badges estáticos** del sidebar por datos de API donde aplique.
- Profundizar **vinculación mensaje–lead** y flujos WhatsApp según reglas de negocio (validar en producción).

### 4. Arquitectura de datos (media)

- Documentar el flujo **canónico** para esquema y migraciones (**Prisma** vs SQL **Supabase**) para evitar doble fuente de verdad.

### 5. Infraestructura (baja a media, según negocio)

- Dominio personalizado, backups automatizados de BD, alertas (Sentry ya está en dependencias; revisar DSN y entornos).

---

## Obsoleto respecto a versiones anteriores de este ROADMAP

Las siguientes afirmaciones de ediciones antiguas **ya no son fiel reflejo del repo** y se archivan conceptualmente aquí:

- “Sentry pendiente de integrar” — el paquete y archivos de configuración existen.
- “API rate limiting pendiente en general” — hay rate limiting en **partes** del sistema (tRPC, rutas concretas).
- “Solo UI de documentos sin backend” — existe upload con Supabase Storage en `api/documents/upload`.
- “Permisos sin UI” — existe `/admin/permissions`.

---

## Enlaces

- [Estado por módulo](docs/ESTADO-ACTUAL.md)  
- [Auditoría con métricas](docs/AUDITORIA-PROYECTO.md)  
- [Próximos pasos detallados](docs/PROXIMOS-PASOS.md) (puede requerir revisión manual frente al código)
