# Canal de mensajería: UChat activo, Manychat en desuso

**Última actualización:** abril 2026

## Resumen

| Canal | Estado en operación |
|--------|----------------------|
| **UChat** | **Integración activa.** Flujos, webhooks hacia/desde el CRM y WhatsApp (Meta) se documentan y configuran con UChat. |
| **Manychat** | **Desuso operativo.** No configurar nuevas cuentas ni flujos en Manychat para este CRM. Pueden quedar en el repo rutas bajo `manychat/`, servicios y documentos `MANYCHAT-*.md` solo como **referencia histórica** o migración de datos. |

## Documentación oficial (UChat)

1. **[UCHAT-SETUP.md](./UCHAT-SETUP.md)** — Configuración de UChat, Meta/WhatsApp, variables de entorno y checklist.
2. **[ARQUITECTURA-UCHAT-CRM.md](./ARQUITECTURA-UCHAT-CRM.md)** — Diagramas y flujo CRM ↔ UChat.
3. **[UCHAT-VS-CRM-CASOS-DE-USO.md](./UCHAT-VS-CRM-CASOS-DE-USO.md)** — Qué hace UChat vs qué hace el CRM.
4. **[UCHAT-MIGRACION-MANYCHAT.md](./UCHAT-MIGRACION-MANYCHAT.md)** — Orden técnico de migración desde Manychat.
5. **[MIGRACION-FLUJOS-MANYCHAT-A-UCHAT.md](./MIGRACION-FLUJOS-MANYCHAT-A-UCHAT.md)** — Flujos de negocio.
6. **[UCHAT-PIPELINE-PREAPROBADO-RECHAZADO.md](./UCHAT-PIPELINE-PREAPROBADO-RECHAZADO.md)** — Webhooks al mover etapas del pipeline.
7. **[WEBHOOK-WHATSAPP-CASOS-DE-USO-CRM.md](./WEBHOOK-WHATSAPP-CASOS-DE-USO-CRM.md)** — Webhook WhatsApp y casos de uso (incluye enlaces UChat).

## Punto de entrada en código

- Webhook entrante UChat → CRM: `POST /api/webhooks/uchat` (`src/app/api/webhooks/uchat/route.ts`).
- Servicio de procesamiento: `src/server/services/uchat-webhook-service.ts`.
- Tipos: `src/types/uchat.ts`.
- Los leads originados en UChat suelen guardarse con `manychatId` con prefijo `uchat_` (campo histórico reutilizado; ver servicio UChat).

## Manychat (legado)

Los archivos `docs/MANYCHAT-*.md`, plantillas y pantallas `(dashboard)/manychat/*` **no** son la guía para nuevas implementaciones. Si necesitas contexto histórico o comparar payloads, úsalos como archivo.

Para variables `MANYCHAT_*`, ver la sección de compatibilidad en [UCHAT-SETUP.md](./UCHAT-SETUP.md); en despliegues nuevos **priorizar solo variables UChat / WhatsApp** documentadas allí.
