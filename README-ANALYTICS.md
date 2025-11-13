# 📊 Integración de Analytics - Pixel de Meta y Google Analytics

## 🎯 Resumen Ejecutivo

Se ha implementado una integración completa y profesional de **Google Analytics 4** y **Meta Pixel (Facebook Pixel)** en tu CRM Phorencial. Esta implementación te permite:

- ✅ Rastrear todas las páginas visitadas automáticamente
- ✅ Rastrear eventos personalizados (leads, conversiones, búsquedas, etc.)
- ✅ Medir el rendimiento de tus campañas publicitarias
- ✅ Tomar decisiones basadas en datos reales
- ✅ Optimizar tus embudos de conversión

---

## 📁 Archivos Creados

### Componentes de Analytics

```
src/components/analytics/
├── GoogleAnalytics.tsx      # Integración de Google Analytics 4
├── MetaPixel.tsx            # Integración de Meta Pixel
├── index.tsx                # Componente unificado
└── AnalyticsTestPanel.tsx   # Panel de prueba interactivo
```

### Hooks y Utilidades

```
src/hooks/
└── useAnalytics.ts          # Hook personalizado con funciones de tracking
```

### Páginas de Prueba

```
src/app/(dashboard)/
└── analytics-test/
    └── page.tsx             # Página para probar la integración
```

### Documentación

```
├── CONFIGURACION-ANALYTICS.md           # Documentación completa
├── EJEMPLOS-INTEGRACION-ANALYTICS.md    # Ejemplos de código
├── ANALYTICS-QUICK-START.md             # Guía de inicio rápido
└── README-ANALYTICS.md                  # Este archivo
```

### Archivos Modificados

```
src/app/
└── layout.tsx               # Se agregó el componente Analytics
```

---

## 🚀 Inicio Rápido (5 minutos)

### 1. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Meta Pixel
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
```

### 2. Obtener tus IDs

#### **Google Analytics:**
1. Ve a [analytics.google.com](https://analytics.google.com/)
2. Administrador → Flujos de datos → Tu sitio web
3. Copia el **ID de medición** (formato: `G-XXXXXXXXXX`)

#### **Meta Pixel:**
1. Ve a [business.facebook.com](https://business.facebook.com/)
2. Configuración → Orígenes de datos → Píxeles
3. Selecciona **Web** (como en la interfaz que mostraste)
4. Copia el **ID del píxel** (solo números)

### 3. Reiniciar el Servidor

```bash
npm run dev
```

### 4. Probar la Integración

Visita: `http://localhost:3000/analytics-test`

Esta página te permite probar que todo funciona correctamente con un panel interactivo.

---

## 💻 Uso en tu Código

### Opción 1: Hook `useAnalytics` (Recomendado)

```typescript
'use client'

import { useAnalytics } from '@/hooks/useAnalytics'

export default function LeadForm() {
  const { trackLeadCreated } = useAnalytics()

  const handleSubmit = async (data) => {
    // ... crear lead ...
    
    // Rastrear evento
    trackLeadCreated({
      source: 'web_form',
      value: data.estimatedValue,
      leadId: result.id,
    })
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### Opción 2: Funciones Directas

```typescript
'use client'

import { trackEvent } from '@/components/analytics/GoogleAnalytics'
import { MetaEvents } from '@/components/analytics/MetaPixel'

export default function MiComponente() {
  const handleClick = () => {
    // Google Analytics
    trackEvent('button_clicked', { button_name: 'contact' })
    
    // Meta Pixel
    MetaEvents.Lead({ content_name: 'Contact Form' })
  }

  return <button onClick={handleClick}>Contactar</button>
}
```

---

## 🎯 Eventos Disponibles en el Hook

El hook `useAnalytics` proporciona funciones predefinidas para eventos comunes:

```typescript
const {
  // Leads
  trackLeadCreated,        // Cuando se crea un lead
  trackLeadUpdated,        // Cuando se edita un lead
  trackLeadDeleted,        // Cuando se elimina un lead
  trackLeadViewed,         // Cuando se visualiza un lead
  
  // Pipeline
  trackPipelineStageChange, // Cuando cambia la etapa de un lead
  
  // Búsqueda
  trackSearch,             // Cuando se busca algo
  
  // ManyChat
  trackManyChatSync,       // Cuando se sincroniza con ManyChat
  
  // Formularios
  trackFormSubmit,         // Cuando se envía un formulario
  
  // Usuarios
  trackUserRegistration,   // Cuando se registra un usuario
  
  // Errores
  trackError,              // Cuando ocurre un error
  
  // Personalizados
  trackCustomEvent,        // Evento personalizado GA
  trackCustomMetaEvent,    // Evento personalizado Meta
  
} = useAnalytics()
```

---

## 📊 Verificar que Funciona

### 1. Extensiones del Navegador

Instala estas extensiones para verificar que los eventos se están enviando:

- [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
- [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)

### 2. Página de Prueba

Visita: `http://localhost:3000/analytics-test`

Esta página incluye:
- ✅ Estado de configuración de GA y Meta
- ✅ Panel interactivo para probar eventos
- ✅ Log de eventos enviados
- ✅ Instrucciones paso a paso

### 3. Consola del Navegador

Abre DevTools (F12) → Console para ver los eventos que se están enviando.

---

## 🎨 Lugares Recomendados para Implementar

### 1. Formulario de Leads

**Archivo:** `src/components/leads/trpc-lead-form.tsx`

```typescript
import { useAnalytics } from '@/hooks/useAnalytics'

const { trackLeadCreated, trackError } = useAnalytics()

// Al crear lead
trackLeadCreated({ source: 'form', value: 1000, leadId: lead.id })

// Si hay error
trackError({ error_type: 'lead_creation_failed', error_message: error.message })
```

### 2. Pipeline

**Archivo:** `src/app/(dashboard)/pipeline/page.tsx`

```typescript
const { trackPipelineStageChange } = useAnalytics()

// Al mover lead entre etapas
trackPipelineStageChange({
  leadId: lead.id,
  fromStage: 'nuevo',
  toStage: 'contactado',
  dealValue: lead.value,
})
```

### 3. Búsqueda

**Archivo:** `src/components/leads/AdvancedSearch.tsx`

```typescript
const { trackSearch } = useAnalytics()

// Al buscar
trackSearch(searchTerm, results.length)
```

### 4. Vista de Lead

**Archivo:** `src/app/leads/[id]/page.tsx`

```typescript
const { trackLeadViewed } = useAnalytics()

useEffect(() => {
  trackLeadViewed({ leadId: params.id, leadValue: lead.value })
}, [params.id])
```

### 5. Integración ManyChat

**Archivo:** `src/components/manychat/*`

```typescript
const { trackManyChatSync } = useAnalytics()

// Al sincronizar
trackManyChatSync({ action: 'sync', leadId: lead.id, success: true })
```

---

## 📚 Documentación Completa

### Para Configuración Detallada
👉 Lee: `CONFIGURACION-ANALYTICS.md`

Incluye:
- Paso a paso de configuración
- Cómo obtener las IDs
- Eventos estándar de Meta
- Configuración de GDPR/cookies
- Verificación en las plataformas
- Solución de problemas

### Para Ejemplos de Código
👉 Lee: `EJEMPLOS-INTEGRACION-ANALYTICS.md`

Incluye:
- 8 ejemplos prácticos completos
- Mejores prácticas
- Error handling
- Tracking server-side
- Integración con componentes existentes

### Para Inicio Rápido
👉 Lee: `ANALYTICS-QUICK-START.md`

Incluye:
- Guía de 5 minutos
- Comandos esenciales
- Eventos más comunes
- Solución de problemas rápida

---

## 🔒 Seguridad y Privacidad

### Variables Públicas

Las variables `NEXT_PUBLIC_*` son **públicas** por diseño:

- ✅ `NEXT_PUBLIC_GA_MEASUREMENT_ID` - Seguro
- ✅ `NEXT_PUBLIC_META_PIXEL_ID` - Seguro

Estas IDs están diseñadas para ser públicas y no comprometen la seguridad.

### GDPR / Consentimiento de Cookies

Si tienes usuarios en Europa, considera implementar un banner de consentimiento antes de activar los trackers. Puedes usar:

- [react-cookie-consent](https://www.npmjs.com/package/react-cookie-consent)
- [CookieYes](https://www.cookieyes.com/)

### Datos Sensibles

**NUNCA** rastrees:
- ❌ Contraseñas
- ❌ Tokens de autenticación
- ❌ Información de tarjetas de crédito
- ❌ Datos personales sensibles (SSN, DNI, etc.)

---

## 📈 Próximos Pasos

### 1. Configurar Conversiones en Meta

1. Ve a [Meta Events Manager](https://business.facebook.com/events_manager/)
2. Selecciona tu píxel
3. Ve a **Configuración** → **Agregar eventos**
4. Configura eventos personalizados como objetivos

### 2. Crear Dashboards en Google Analytics

1. Ve a [Google Analytics](https://analytics.google.com/)
2. **Explorar** → **Crear nueva exploración**
3. Crea dashboards para:
   - Adquisición de leads
   - Funnel de conversión
   - Rendimiento del pipeline

### 3. Configurar Audiencias Personalizadas

Usa los eventos rastreados para crear audiencias personalizadas en Meta:
- Usuarios que vieron leads
- Usuarios que buscaron
- Usuarios que completaron formularios

### 4. Implementar Tracking en más Lugares

- Formularios de registro
- Cambios en configuración
- Descargas de documentos
- Exportaciones de datos
- Envíos de reportes

---

## 🐛 Solución de Problemas

### No veo datos en Google Analytics

1. ✅ Verifica que el ID comienza con `G-`
2. ✅ Reinicia el servidor después de agregar variables
3. ✅ Espera 24-48h para datos históricos (tiempo real funciona inmediatamente)
4. ✅ Usa Google Analytics Debugger para verificar

### No veo datos en Meta Pixel

1. ✅ Verifica que el ID sean solo números
2. ✅ Reinicia el servidor
3. ✅ Usa Meta Pixel Helper para verificar
4. ✅ Verifica la consola del navegador (F12)

### Los eventos no se rastrean

1. ✅ El componente debe tener `'use client'`
2. ✅ Verifica que la función se ejecuta (usa `console.log`)
3. ✅ Revisa la consola del navegador para errores
4. ✅ Verifica que las IDs estén configuradas

### La página de prueba no carga

1. ✅ Asegúrate de estar en desarrollo (`npm run dev`)
2. ✅ Visita: `http://localhost:3000/analytics-test`
3. ✅ Verifica que no haya errores en la consola
4. ✅ Reinicia el servidor si acabas de crear los archivos

---

## 🎉 Conclusión

Ahora tienes una integración completa y profesional de analytics en tu CRM. Esta implementación te permite:

- 📊 **Medir**: Todas las interacciones de los usuarios
- 🎯 **Optimizar**: Tus embudos de conversión
- 💰 **Monetizar**: Mejorando el ROI de tus campañas
- 📈 **Escalar**: Con datos concretos para tomar decisiones

---

## 📞 Recursos Adicionales

### Documentación Oficial

- [Google Analytics 4 Docs](https://developers.google.com/analytics/devguides/collection/ga4)
- [Meta Pixel Docs](https://developers.facebook.com/docs/meta-pixel)
- [Meta Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api)

### Tutoriales

- [GA4 Tutorial](https://analytics.google.com/analytics/academy/)
- [Meta Blueprint](https://www.facebook.com/business/learn)

### Soporte

- [Google Analytics Community](https://support.google.com/analytics/community)
- [Meta Business Help](https://www.facebook.com/business/help)

---

## ✅ Checklist de Implementación

- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Servidor reiniciado
- [ ] Extensiones del navegador instaladas
- [ ] Página de prueba verificada (`/analytics-test`)
- [ ] Eventos visibles en extensiones
- [ ] Tracking implementado en formulario de leads
- [ ] Tracking implementado en pipeline
- [ ] Tracking implementado en búsquedas
- [ ] Conversiones configuradas en Meta Ads Manager
- [ ] Objetivos configurados en Google Analytics
- [ ] Dashboards creados en GA4
- [ ] Audiencias personalizadas creadas en Meta

---

**🚀 ¡Tu CRM ahora tiene analytics de nivel empresarial!**

Para cualquier duda, consulta la documentación completa en `CONFIGURACION-ANALYTICS.md` o los ejemplos en `EJEMPLOS-INTEGRACION-ANALYTICS.md`.

