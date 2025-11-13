# 📚 Documentación - CRM Phorencial

> **Centro de Documentación Técnica**  
> Toda la información que necesitas para trabajar con el CRM Phorencial

---

## 🎯 Inicio Rápido

### ¿Primera Vez Aquí?

**Sigue este orden:**

1. 📊 Lee [ESTADO-ACTUAL.md](./ESTADO-ACTUAL.md) para entender dónde estamos
2. 🚀 Sigue [SETUP-DESARROLLO.md](./SETUP-DESARROLLO.md) para configurar tu entorno
3. 🏗️ Revisa [ARQUITECTURA.md](./ARQUITECTURA.md) para comprender el sistema
4. 🎯 Consulta [PROXIMOS-PASOS.md](./PROXIMOS-PASOS.md) para saber qué trabajar

---

## 📖 Documentación Principal

### 🌟 Esenciales (Lectura Obligatoria)

| Documento | ⏱️ Lectura | Descripción |
|-----------|-----------|-------------|
| [📊 Estado Actual](./ESTADO-ACTUAL.md) | 10 min | Estado detallado del proyecto, progreso, métricas y problemas conocidos |
| [🚀 Setup de Desarrollo](./SETUP-DESARROLLO.md) | 30 min | Guía paso a paso para configurar el entorno de desarrollo |
| [🏗️ Arquitectura](./ARQUITECTURA.md) | 20 min | Arquitectura del sistema, stack tecnológico y decisiones de diseño |
| [🎯 Próximos Pasos](./PROXIMOS-PASOS.md) | 15 min | Roadmap priorizado, tareas pendientes y estimaciones |

### 🔧 Guías Técnicas

| Documento | ⏱️ Lectura | Descripción |
|-----------|-----------|-------------|
| [🔄 Migración Supabase](./MIGRACION-SUPABASE.md) | 20 min | Guía de migración Prisma → Supabase (80% completada) |
| [📡 API Reference](./API-REFERENCE.md) | Referencia | Documentación completa de todos los endpoints (39 APIs) |
| [🔧 Troubleshooting](./TROUBLESHOOTING.md) | Referencia | Solución de problemas comunes y debugging |

### 🤝 Contribución

| Documento | ⏱️ Lectura | Descripción |
|-----------|-----------|-------------|
| [🤝 Contributing](./CONTRIBUTING.md) | 15 min | Guía completa para contribuir al proyecto |

---

## 🗂️ Documentación por Tema

### 🏗️ Arquitectura y Diseño

- [Arquitectura General](./ARQUITECTURA.md#-visión-general)
- [Stack Tecnológico](./ARQUITECTURA.md#-stack-tecnológico-detallado)
- [Estructura de Carpetas](./ARQUITECTURA.md#-estructura-de-carpetas)
- [Flujo de Datos](./ARQUITECTURA.md#-flujo-de-datos)
- [Patrones de Diseño](./ARQUITECTURA.md#-patrones-de-diseño-utilizados)
- [Decisiones Arquitectónicas](./ARQUITECTURA.md#-decisiones-arquitectónicas)

### 💻 Desarrollo

- [Requisitos del Sistema](./SETUP-DESARROLLO.md#-requisitos-del-sistema)
- [Instalación](./SETUP-DESARROLLO.md#-instalación-paso-a-paso)
- [Configuración de Variables](./SETUP-DESARROLLO.md#-configuración-de-variables-de-entorno)
- [Setup de Supabase](./SETUP-DESARROLLO.md#-setup-de-supabase)
- [Comandos Útiles](./SETUP-DESARROLLO.md#-comandos-útiles)
- [Estándares de Código](./CONTRIBUTING.md#-estándares-de-código)

### 🗄️ Base de Datos

- [Migración a Supabase](./MIGRACION-SUPABASE.md)
- [Estado de la Migración](./MIGRACION-SUPABASE.md#-estado-de-la-migración)
- [Comparación Prisma vs Supabase](./MIGRACION-SUPABASE.md#-comparación-prisma-vs-supabase)
- [Scripts de Migración](./MIGRACION-SUPABASE.md#-scripts-disponibles)
- [Validación Post-Migración](./MIGRACION-SUPABASE.md#-validación-post-migración)
- [Problemas Conocidos](./MIGRACION-SUPABASE.md#-problemas-conocidos)

### 📡 APIs

- [Autenticación](./API-REFERENCE.md#-autenticación)
- [Endpoints de Leads](./API-REFERENCE.md#-leads)
- [Endpoints de Pipeline](./API-REFERENCE.md#-pipeline)
- [Endpoints de Dashboard](./API-REFERENCE.md#-dashboard)
- [Endpoints de Admin](./API-REFERENCE.md#-admin)
- [Webhooks](./API-REFERENCE.md#-webhooks)
- [Códigos de Error](./API-REFERENCE.md#-códigos-de-error)
- [Ejemplos de Uso](./API-REFERENCE.md#-ejemplos-completos)

### 🔧 Solución de Problemas

- [Problemas de Setup](./TROUBLESHOOTING.md#-problemas-de-setup)
- [Errores de Base de Datos](./TROUBLESHOOTING.md#-errores-de-base-de-datos)
- [Problemas de Autenticación](./TROUBLESHOOTING.md#-problemas-de-autenticación)
- [Errores del Pipeline](./TROUBLESHOOTING.md#-errores-del-pipeline)
- [Problemas de Tests](./TROUBLESHOOTING.md#-problemas-de-tests)
- [Errores de Deployment](./TROUBLESHOOTING.md#-errores-de-deployment)
- [Performance Issues](./TROUBLESHOOTING.md#-performance-issues)

### 🎯 Planificación

- [Tareas Críticas](./PROXIMOS-PASOS.md#-semana-1-2-crítico)
- [Alta Prioridad](./PROXIMOS-PASOS.md#-semana-3-4-alta-prioridad)
- [Media Prioridad](./PROXIMOS-PASOS.md#-mes-2-media-prioridad)
- [Mejoras Opcionales](./PROXIMOS-PASOS.md#-futuro-mejoras-opcionales)
- [Estimaciones de Tiempo](./PROXIMOS-PASOS.md#-estimaciones-de-tiempo)

### 🤝 Contribución

- [Código de Conducta](./CONTRIBUTING.md#-código-de-conducta)
- [Proceso de Desarrollo](./CONTRIBUTING.md#-proceso-de-desarrollo)
- [Estándares de Código](./CONTRIBUTING.md#-estándares-de-código)
- [Testing](./CONTRIBUTING.md#-testing)
- [Pull Requests](./CONTRIBUTING.md#-pull-requests)
- [Estructura de Commits](./CONTRIBUTING.md#-estructura-de-commits)

---

## 📊 Estado del Proyecto

### Progreso General: 85-90%

```
Infraestructura        ████████████████████ 100%
Autenticación          ███████████████████░  95%
Gestión de Leads       ██████████████████░░  90%
Dashboard              █████████████████░░░  85%
Migración Supabase     ████████████████░░░░  80%
Pipeline               ██████████████░░░░░░  70%
Testing                ███████████████░░░░░  75%
WhatsApp               ██████░░░░░░░░░░░░░░  30%
Documentación          ████████████████░░░░  80%
```

### Métricas Clave

- **Líneas de Código:** ~15,000 (TypeScript/JavaScript)
- **Tests:** 70+ (E2E + Unitarios)
- **APIs:** 39 endpoints
- **Componentes:** 58 componentes React
- **Leads:** 233+ registros reales
- **Cobertura:** ~75%

---

## 🔍 Búsqueda Rápida

### ¿Cómo hacer...?

| Tarea | Documento | Sección |
|-------|-----------|---------|
| Configurar el entorno | [Setup](./SETUP-DESARROLLO.md) | Instalación |
| Crear un lead | [API Reference](./API-REFERENCE.md) | Leads → Crear |
| Ejecutar tests | [Setup](./SETUP-DESARROLLO.md) | Comandos Útiles |
| Solucionar error de pipeline | [Troubleshooting](./TROUBLESHOOTING.md) | Pipeline |
| Contribuir código | [Contributing](./CONTRIBUTING.md) | Proceso |
| Migrar datos | [Migración](./MIGRACION-SUPABASE.md) | Pasos |
| Ver arquitectura | [Arquitectura](./ARQUITECTURA.md) | Visión General |
| Próximas tareas | [Próximos Pasos](./PROXIMOS-PASOS.md) | Crítico |

---

## 🚨 Problemas Comunes

### Top 5 Problemas y Soluciones

1. **Pipeline no se crea automáticamente**
   - 📖 [Solución](./TROUBLESHOOTING.md#pipeline-no-crea-automáticamente-)
   - ⏱️ 30 minutos

2. **Error de conexión a Supabase**
   - 📖 [Solución](./TROUBLESHOOTING.md#error-de-conexión-a-supabase)
   - ⏱️ 10 minutos

3. **NextAuth no funciona**
   - 📖 [Solución](./TROUBLESHOOTING.md#nextauth-error-oauth_callback_error)
   - ⏱️ 15 minutos

4. **Tests de Playwright fallan**
   - 📖 [Solución](./TROUBLESHOOTING.md#playwright-executable-doesnt-exist)
   - ⏱️ 5 minutos

5. **Variables de entorno no se cargan**
   - 📖 [Solución](./TROUBLESHOOTING.md#error-variables-de-entorno-no-se-cargan)
   - ⏱️ 5 minutos

---

## 📚 Documentación Externa

### Tecnologías Principales

| Tecnología | Documentación Oficial |
|------------|----------------------|
| Next.js | [nextjs.org/docs](https://nextjs.org/docs) |
| Supabase | [supabase.com/docs](https://supabase.com/docs) |
| NextAuth.js | [next-auth.js.org](https://next-auth.js.org) |
| Tailwind CSS | [tailwindcss.com/docs](https://tailwindcss.com/docs) |
| shadcn/ui | [ui.shadcn.com](https://ui.shadcn.com) |
| Playwright | [playwright.dev/docs](https://playwright.dev/docs) |
| React Query | [tanstack.com/query](https://tanstack.com/query/latest) |
| TypeScript | [typescriptlang.org/docs](https://www.typescriptlang.org/docs) |

---

## 🎓 Guías de Aprendizaje

### Para Nuevos Desarrolladores

**Día 1: Entender el Proyecto**
1. ✅ Leer [Estado Actual](./ESTADO-ACTUAL.md) (10 min)
2. ✅ Revisar [Arquitectura](./ARQUITECTURA.md) (20 min)
3. ✅ Explorar el código fuente (30 min)

**Día 2: Configurar Entorno**
1. ✅ Seguir [Setup de Desarrollo](./SETUP-DESARROLLO.md) (60 min)
2. ✅ Ejecutar la aplicación (15 min)
3. ✅ Ejecutar tests (15 min)

**Día 3: Primera Contribución**
1. ✅ Leer [Contributing](./CONTRIBUTING.md) (15 min)
2. ✅ Encontrar un `good first issue` (10 min)
3. ✅ Hacer tu primer PR (2-4 horas)

---

## 🔄 Actualizaciones

### Última Actualización
- **Fecha:** 22 de Octubre, 2025
- **Versión:** 0.9.0

### Cambios Recientes
- ✅ Documentación completa creada
- ✅ Estado del proyecto actualizado
- ✅ Guías de migración a Supabase
- ✅ API Reference completada
- ✅ Troubleshooting expandido

### Próximas Actualizaciones
- [ ] Ejemplos de código adicionales
- [ ] Videos tutoriales
- [ ] FAQ expandido
- [ ] Diagramas interactivos

---

## 💡 Tips y Consejos

### Para Desarrolladores

1. **Usa los scripts de verificación:**
   ```bash
   node test-supabase-connection.js
   node test-fmc-migration-complete.js
   ```

2. **Mantén tu entorno actualizado:**
   ```bash
   git fetch upstream
   git merge upstream/main
   npm install
   ```

3. **Ejecuta tests antes de hacer PR:**
   ```bash
   npm run lint
   npm run type-check
   npm run test:jest
   npm run build
   ```

4. **Usa las herramientas de debug:**
   - React DevTools
   - Chrome DevTools
   - Playwright Inspector

---

## 📞 Soporte

### ¿Necesitas Ayuda?

1. **Busca en la documentación** usando Ctrl+F
2. **Revisa [Troubleshooting](./TROUBLESHOOTING.md)**
3. **Busca en [Issues de GitHub](https://github.com/SantiagoXOR/phorencial-bot-crm/issues)**
4. **Crea un nuevo issue** con detalles

### Canales de Comunicación

- 💬 **GitHub Issues:** Para bugs y features
- 📧 **Email:** [contacto del proyecto]
- 💡 **Discussions:** Para preguntas y ideas

---

## 🏆 Contribuyentes

Gracias a todos los que han contribuido a este proyecto!

Ver lista completa en [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](../LICENSE) para más detalles.

---

**🎉 ¡Bienvenido al equipo de CRM Phorencial!**

Si tienes sugerencias para mejorar esta documentación, por favor abre un issue o PR.
