# 🚀 CRM Phorencial - Sistema de Gestión de Leads para Formosa

## 📋 Descripción

**CRM Phorencial** es un sistema de gestión de leads específicamente diseñado para la provincia de Formosa, Argentina.

**Estado actual:** código muy completo (CRM, pipeline, mensajería vía **UChat** + WhatsApp, documentos, admin, scoring, reportes). La integración **Manychat está en desuso** operativo; ver [docs/CANAL-PRINCIPAL-UCHAT.md](docs/CANAL-PRINCIPAL-UCHAT.md). La **validación en tu entorno** (Supabase, webhooks, CI) sigue siendo obligatoria antes de producción.

- Ver **[docs/ESTADO-ACTUAL.md](docs/ESTADO-ACTUAL.md)** para el resumen por módulos.
- Ver **[docs/AUDITORIA-PROYECTO.md](docs/AUDITORIA-PROYECTO.md)** para inventario objetivo (rutas API, páginas, tests ejecutados en abril 2026).

**Nota:** El proyecto combina **Supabase** (cliente y storage) con **Prisma** aún presente en `package.json` (scripts y `postinstall`). Conviene leer la sección de arquitectura en la documentación antes de tocar el esquema de datos.

### ✨ Características Implementadas

#### **✅ Completamente Funcionales**

- 🏗️ **Arquitectura Moderna**: Next.js 14 + TypeScript + Supabase
- 🔐 **Autenticación**: Sistema de login con NextAuth.js
- 📊 **APIs**: CRUD de leads, dashboard, pipeline, documentos, conversaciones, reportes, admin y más (`src/app/api/`)
- 🎨 **Componentes UI**: shadcn/ui + componentes personalizados
- 📱 **Responsive Design**: Layout adaptativo básico

#### **Mejoras continuas (no “faltante de base”)**

- Filtros y widgets de dashboard más avanzados
- Health check y observabilidad más profundos (más allá de Sentry y `/api/health` básico)
- Cobertura de tests y CI alineados con el volumen de código

#### **Mensajería: UChat (activo)**

- **UChat + WhatsApp (Meta):** flujos en UChat, webhook CRM `POST /api/webhooks/uchat`, integración con pipeline e inbound webhooks (lead nuevo, solicitud de crédito, Carla, preaprobado/rechazado, etc.).
- **Documentación:** [docs/CANAL-PRINCIPAL-UCHAT.md](docs/CANAL-PRINCIPAL-UCHAT.md) (qué usar hoy) y [docs/UCHAT-SETUP.md](docs/UCHAT-SETUP.md) (setup completo).

#### **Manychat (legado — desuso operativo)**

- El código y las pantallas bajo `manychat/` o docs `MANYCHAT-*` **no** deben tomarse como guía para nuevas instalaciones.
- Referencia histórica y migración: [docs/UCHAT-MIGRACION-MANYCHAT.md](docs/UCHAT-MIGRACION-MANYCHAT.md).

## 🎨 Design System

### **Sistema de Diseño FMC**

El CRM implementa un sistema de diseño moderno inspirado en Prometheo con una paleta de colores púrpura como elemento principal.

#### **Documentación del Design System**

- 📖 **[Design System Completo](docs/DESIGN-SYSTEM.md)** - Paleta de colores, tipografía, espaciado y patrones
- 🧩 **[Guía de Componentes UI](docs/COMPONENTES-UI.md)** - Componentes personalizados y patrones de uso

#### **Características del Diseño**

- **Paleta Principal**: Púrpura (#a855f7) como color de marca
- **Tipografía**: Sans-serif system font para máxima compatibilidad
- **Layout**: Sidebar fijo con navegación jerárquica
- **Componentes**: Cards con hover effects y transiciones suaves
- **Responsive**: Mobile-first con breakpoints consistentes

## 🏗 Arquitectura Técnica

### **Stack Tecnológico**

- **Framework**: Next.js 14.2.15 + App Router + TypeScript 5
- **UI Library**: shadcn/ui + Tailwind CSS + Radix UI
- **Base de Datos**: Supabase (PostgreSQL); Prisma sigue en el repo para tooling/migraciones según scripts
- **Autenticación**: NextAuth.js 4.24 con JWT
- **Gráficos**: Recharts 3.1
- **Testing**: Playwright + Jest + Vitest
- **Deployment**: Vercel + Supabase Cloud

### **Componentes Principales**

```
src/
├── components/
│   ├── dashboard/
│   │   ├── MetricsCard.tsx          # Métricas modernas con gradientes
│   │   └── DashboardCharts.tsx      # Gráficos avanzados
│   ├── layout/
│   │   └── Sidebar.tsx              # Navegación moderna
│   └── ui/                          # Componentes shadcn/ui
├── app/(dashboard)/
│   ├── dashboard/                   # Dashboard principal
│   ├── leads/                       # Gestión de leads
│   ├── documents/                   # Gestión de documentos
│   └── settings/                    # Configuración del sistema
```

## 📊 Datos Específicos de Formosa

### **Zonas Geográficas (20 zonas)**

- Formosa Capital, Clorinda, Pirané, El Colorado
- Las Lomitas, Ingeniero Juárez, Ibarreta, Comandante Fontana
- Villa Dos Trece, General Güemes, Laguna Blanca, Pozo del Mortero
- Y más zonas específicas de la provincia

### **Códigos de Área Locales**

- `+543704` - Formosa Capital
- `+543705` - Clorinda
- `+543711` - Interior
- `+543718` - Zonas rurales

### **Estados de Leads**

- `NUEVO` - Leads recién ingresados
- `EN_REVISION` - En proceso de evaluación
- `PREAPROBADO` - Aprobados preliminarmente
- `RECHAZADO` - No califican
- `DOC_PENDIENTE` - Documentación pendiente
- `DERIVADO` - Derivados a otras áreas

## 🚀 Instalación y Desarrollo

### **Prerrequisitos**

- Node.js 20+ (recomendado)
- npm 10+
- Cuenta de Supabase (gratis)
- Git

### **Instalación Rápida**

```bash
# Clonar repositorio
git clone https://github.com/SantiagoXOR/phorencial-bot-crm.git
cd phorencial-bot-crm

# Instalar dependencias
npm install

# Configurar variables de entorno
# Crear .env.local y agregar tus credenciales de Supabase
touch .env.local

# Ejecutar en desarrollo
npm run dev
```

**📚 Para setup detallado, ver [SETUP-DESARROLLO.md](docs/SETUP-DESARROLLO.md)**

### **Variables de Entorno Esenciales**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIs..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..."
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@..."

# NextAuth
NEXTAUTH_SECRET="generar-con-openssl-rand-hex-32"
NEXTAUTH_URL="http://localhost:3000"
JWT_SECRET="otro-secret-diferente"

# Entorno
APP_ENV="development"
NODE_ENV="development"
```

**📚 Ver configuración completa en [SETUP-DESARROLLO.md](docs/SETUP-DESARROLLO.md)**

### **Configuración de UChat + WhatsApp (recomendado)**

Variables típicas (lista completa y checklist en [docs/UCHAT-SETUP.md](docs/UCHAT-SETUP.md)):

```env
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=...
UCHAT_WEBHOOK_SECRET=...
# Inbound webhooks de UChat (flujos):
UCHAT_INBOUND_WEBHOOK_LEAD_NUEVO_URL=...
UCHAT_INBOUND_WEBHOOK_SOLICITUD_CREDITO_URL=...
# ... ver UCHAT-SETUP.md para el resto
```

**Manychat:** en desuso; no añadir `MANYCHAT_*` en proyectos nuevos salvo mantenimiento legacy (ver [docs/CANAL-PRINCIPAL-UCHAT.md](docs/CANAL-PRINCIPAL-UCHAT.md)).

### 3. Configurar la base de datos

```bash
# Generar cliente Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# Poblar con datos iniciales
npm run db:seed
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 👥 Usuarios Demo

Después del seed, puedes usar estos usuarios:

| Email                   | Contraseña  | Rol      |
| ----------------------- | ----------- | -------- |
| admin@phorencial.com    | admin123    | ADMIN    |
| ludmila@phorencial.com  | ludmila123  | ANALISTA |
| facundo@phorencial.com  | facundo123  | ANALISTA |
| vendedor@phorencial.com | vendedor123 | VENDEDOR |

## 🚀 Deployment

### Vercel + Supabase

1. **Crear proyecto en Supabase**:

   - Ve a [supabase.com](https://supabase.com)
   - Crea un nuevo proyecto
   - Copia la URL de conexión de PostgreSQL

2. **Deploy en Vercel**:

   ```bash
   # Instalar Vercel CLI
   npm i -g vercel

   # Deploy
   vercel
   ```

3. **Configurar variables de entorno en Vercel**:

   - Ve al dashboard de Vercel
   - Configura todas las variables del `.env.example`
   - Redeploy el proyecto

4. **Ejecutar migraciones en producción**:
   ```bash
   # Desde tu máquina local con DATABASE_URL de producción
   DATABASE_URL="tu-url-de-supabase" npx prisma migrate deploy
   DATABASE_URL="tu-url-de-supabase" npm run db:seed
   ```

## 📡 API Endpoints

Hay **decenas** de rutas bajo `src/app/api/` (pipeline, documentos, conversaciones, **webhooks/uchat**, WhatsApp, admin, reportes, tRPC, etc.). Ejemplos:

### Leads

- `POST /api/leads` — Crear/actualizar lead (upsert)
- `GET /api/leads` — Listar leads con filtros
- `GET /api/leads/[id]` — Obtener lead
- `PATCH /api/leads/[id]` — Actualizar lead

### Otros (muestra)

- `POST /api/events/whatsapp` — Eventos WhatsApp
- `POST /api/scoring/eval` — Evaluación de scoring
- `GET/POST /api/rules` — Reglas
- `GET /api/health` — Estado mínimo de la app
- `GET /api/docs/swagger.json` — Spec Swagger cuando esté configurado

Referencia ampliada: [docs/API-REFERENCE.md](docs/API-REFERENCE.md) (puede estar desactualizada respecto al conteo total; la lista canónica es el árbol `src/app/api/`).

## 🔗 Integración con Activepieces

Ver documentación completa en [`docs/activepieces.md`](docs/activepieces.md)

### Configuración rápida:

1. **Crear cuenta en Activepieces Cloud**
2. **Configurar variables**:
   - `CRM_BASE_URL`: URL de tu app en Vercel
   - `WEBHOOK_TOKEN`: Mismo valor que `ALLOWED_WEBHOOK_TOKEN`
3. **Importar flows**:
   - Flow de ingreso de WhatsApp
   - Flow de reportes semanales

## 📊 Sistema de Scoring

### Reglas por defecto:

- **Edad**: 18-75 años (+20 puntos si cumple, -50 si no)
- **Ingresos**: Mínimo $200,000 (+25 puntos si cumple, -30 si no)
- **Zona**: CABA, GBA, Córdoba (+15 puntos si cumple, -20 si no)
- **Datos completos**: +10 puntos si tiene 3+ campos

### Decisiones:

- **≥50 puntos**: PREAPROBADO
- **0-49 puntos**: EN_REVISION
- **<0 puntos**: RECHAZADO

## 🔒 Seguridad

- **Autenticación**: JWT con NextAuth.js
- **Autorización**: RBAC con permisos granulares
- **Rate Limiting**: Presente en partes del sistema (p. ej. tRPC, rutas seleccionadas); no asumir en todos los endpoints
- **Validación**: Zod en todos los inputs
- **Sanitización**: Logs sin datos sensibles
- **Webhook Security**: Token compartido para Activepieces

## 📈 Monitoreo

- **Health Check**: `GET /api/health` (respuesta básica; ampliar si se requiere chequeo de DB)
- **Sentry**: `@sentry/nextjs` configurado en el proyecto
- **Métricas**: Dashboard y rutas de reportes en la app

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con UI
npm run test:ui

# Type checking
npm run type-check
```

## 📝 Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Build para producción
npm run start        # Servidor de producción
npm run lint         # Linting
npm run db:migrate   # Migraciones de DB
npm run db:seed      # Poblar DB con datos demo
npm run db:studio    # Prisma Studio (GUI para DB)
npm test             # Ejecutar tests
```

## 🔧 Configuración Avanzada

### Personalizar reglas de scoring

1. Ve a `/settings` como usuario ADMIN
2. Modifica las reglas existentes o agrega nuevas
3. Las reglas se evalúan automáticamente en `/api/scoring/eval`

### Agregar nuevos orígenes

Modifica el enum en `src/lib/validators.ts`:

```typescript
origen: z.enum([
  "whatsapp",
  "instagram",
  "facebook",
  "comentario",
  "web",
  "ads",
  "nuevo_origen",
]);
```

### Personalizar estados de lead

Modifica el enum en `prisma/schema.prisma`:

```prisma
enum LeadEstado {
  NUEVO
  EN_REVISION
  PREAPROBADO
  RECHAZADO
  DOC_PENDIENTE
  DERIVADO
  NUEVO_ESTADO
}
```

## 🐛 Troubleshooting

### Error de conexión a DB

- Verificar `DATABASE_URL` en variables de entorno
- Asegurar que la DB esté accesible desde tu IP

### Webhook no funciona

- Verificar `ALLOWED_WEBHOOK_TOKEN` en ambos sistemas
- Revisar logs en Activepieces y `/api/health`

### Problemas de autenticación

- Verificar `NEXTAUTH_SECRET` y `JWT_SECRET`
- Limpiar cookies del navegador

## 📞 Soporte

Para problemas técnicos:

1. Revisar logs en Vercel/Supabase
2. Verificar configuración de variables de entorno
3. Consultar documentación de Activepieces

## 🎨 Diseño y UI

### **Gradientes Modernos**

- `gradient-primary` - Azul a Púrpura
- `gradient-success` - Verde esmeralda
- `gradient-warning` - Amarillo a Naranja
- `gradient-danger` - Rojo a Rosa

### **Badges Específicos de Formosa**

- `formosa-badge-nuevo` - Azul para NUEVO
- `formosa-badge-preaprobado` - Verde para PREAPROBADO
- `formosa-badge-rechazado` - Rojo para RECHAZADO
- `formosa-badge-revision` - Amarillo para EN_REVISION

### **Animaciones**

- `animate-fade-in` - Aparición suave
- `animate-slide-up` - Deslizamiento hacia arriba
- `hover-lift` - Efecto de elevación al hover

## 📈 Datos del Sistema

Los volúmenes y distribuciones dependen del **entorno** (seed, importaciones CSV, producción). Use los scripts en `scripts/` y el panel de Supabase para números actuales.

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

**Santiago Martinez** - [@SantiagoXOR](https://github.com/SantiagoXOR)

---

## 🎉 Migración Selectiva Completada

Este proyecto es el resultado de una **migración selectiva exitosa** que combinó:

- **UI moderna** del Formosa Leads Hub
- **Funcionalidad robusta** del CRM Phorencial original
- **Datos reales** específicos de Formosa
- **Páginas nuevas** (Documents, Settings)

**Resultado**: Un CRM moderno, funcional y específicamente diseñado para las necesidades de Formosa. 🚀

---

## 📚 Documentación Completa

### **📖 Documentación Principal**

| Documento | Descripción |
|-----------|-------------|
| [📊 Estado Actual](docs/ESTADO-ACTUAL.md) | Estado del proyecto y módulos (actualizado abr. 2026) |
| [🔍 Auditoría del repo](docs/AUDITORIA-PROYECTO.md) | Inventario de rutas, tests y brechas conocidas |
| [💬 UChat activo / Manychat legado](docs/CANAL-PRINCIPAL-UCHAT.md) | Qué integración usar hoy y enlaces a setup UChat |
| [🚀 Setup de Desarrollo](docs/SETUP-DESARROLLO.md) | Guía completa de instalación y configuración |
| [🏗️ Arquitectura](docs/ARQUITECTURA.md) | Arquitectura del sistema y decisiones técnicas |
| [🔄 Migración Supabase](docs/MIGRACION-SUPABASE.md) | Historial/guía Prisma ↔ Supabase (convivencia actual: ver nota en README arriba) |
| [🎯 Próximos Pasos](docs/PROXIMOS-PASOS.md) | Roadmap priorizado y tareas pendientes |
| [📡 API Reference](docs/API-REFERENCE.md) | Referencia de APIs (verificar contra `src/app/api/`) |
| [🔧 Troubleshooting](docs/TROUBLESHOOTING.md) | Solución de problemas comunes |
| [🤝 Contribuir](docs/CONTRIBUTING.md) | Guía para nuevos contribuyentes |

### **📂 Ver Todas las Docs**

**[→ Índice Completo de Documentación](docs/README.md)**

### **🧪 Testing**

- [`TESTING.md`](TESTING.md) - Guía de testing (Playwright + Vitest/Jest según scripts)
- [`tests/README.md`](tests/README.md) - Tests de Playwright
- [`playwright.config.ts`](playwright.config.ts) - Configuración de tests

### **Estado del proyecto**

- Funcionalidades principales implementadas en código (ver [ESTADO-ACTUAL.md](docs/ESTADO-ACTUAL.md)).
- Inventario numérico y última corrida Vitest en [AUDITORIA-PROYECTO.md](docs/AUDITORIA-PROYECTO.md).
