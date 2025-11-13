# 📊 Configuración de Analytics - Meta Pixel y Google Analytics

## 🎯 Resumen

Este documento te guiará paso a paso para integrar **Meta Pixel (Facebook)** y **Google Analytics 4** en tu CRM Phorencial.

## ✅ ¿Qué se ha implementado?

Se han creado los siguientes componentes:

- ✅ **GoogleAnalytics.tsx** - Integración completa de Google Analytics 4
- ✅ **MetaPixel.tsx** - Integración completa del Pixel de Meta
- ✅ **Analytics (index.tsx)** - Componente unificado para gestionar ambos
- ✅ **Layout actualizado** - Los scripts se cargan automáticamente en todas las páginas

---

## 📝 PASO 1: Configurar las Variables de Entorno

### 1.1 Crear/Editar tu archivo `.env.local`

Crea un archivo llamado `.env.local` en la raíz de tu proyecto (al mismo nivel que `package.json`) y agrega:

```env
# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Meta Pixel (Facebook Pixel)
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
```

### 1.2 Obtener tu ID de Google Analytics

1. Ve a [Google Analytics](https://analytics.google.com/)
2. Crea una cuenta si no tienes una
3. Crea una propiedad GA4 (Google Analytics 4)
4. Ve a **Administrador** → **Flujos de datos** → Selecciona tu flujo de datos web
5. Copia el **ID de medición** (formato: `G-XXXXXXXXXX`)
6. Pégalo en tu `.env.local` reemplazando `G-XXXXXXXXXX`

### 1.3 Obtener tu Pixel ID de Meta

1. Ve a [Meta Business Suite](https://business.facebook.com/)
2. En el menú, selecciona **Configuración del negocio**
3. En **Orígenes de datos**, selecciona **Píxeles**
4. Si no tienes un píxel, créalo siguiendo el asistente (la imagen que compartiste)
5. Selecciona **Web** como origen de datos
6. Copia el **ID del píxel** (solo números, ej: `123456789012345`)
7. Pégalo en tu `.env.local`

**Nota importante**: En la interfaz de Meta que mostraste, selecciona **Web** y haz clic en **Siguiente** para completar la configuración.

---

## 🚀 PASO 2: Reiniciar el Servidor de Desarrollo

Después de agregar las variables de entorno, **debes reiniciar** tu servidor:

```bash
# Detén el servidor (Ctrl+C)
# Luego reinicia:
npm run dev
```

---

## 🧪 PASO 3: Verificar que Funciona

### 3.1 Verificar en el Navegador

1. Abre tu aplicación en el navegador
2. Abre las **Herramientas de Desarrollo** (F12)
3. Ve a la pestaña **Console**
4. Deberías ver que se cargan los scripts sin errores

### 3.2 Verificar Google Analytics

1. Instala la extensión [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
2. Actívala
3. Recarga tu página
4. Verifica en la consola que se envían eventos de GA4

### 3.3 Verificar Meta Pixel

1. Instala la extensión [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
2. Actívala
3. Recarga tu página
4. El ícono de la extensión debería mostrar que el pixel está activo (verde)
5. Haz clic en el ícono para ver los eventos que se están enviando

---

## 💻 PASO 4: Usar los Eventos Personalizados en tu Código

### 4.1 Ejemplo: Rastrear cuando un usuario crea un lead

```typescript
// En cualquier componente de tu aplicación
import { trackEvent } from '@/components/analytics/GoogleAnalytics'
import { MetaEvents } from '@/components/analytics/MetaPixel'

// Cuando se crea un lead exitosamente
const handleLeadCreated = async (leadData: any) => {
  try {
    // ... tu lógica para crear el lead ...
    
    // Rastrear en Google Analytics
    trackEvent('lead_created', {
      lead_source: leadData.source,
      lead_value: leadData.value,
    })
    
    // Rastrear en Meta Pixel
    MetaEvents.Lead({
      content_name: 'Nuevo Lead CRM',
      value: leadData.value,
      currency: 'ARS',
    })
    
    console.log('✅ Lead creado y rastreado en analytics')
  } catch (error) {
    console.error('Error al crear lead:', error)
  }
}
```

### 4.2 Ejemplo: Rastrear conversiones/compras

```typescript
import { trackConversion } from '@/components/analytics/GoogleAnalytics'
import { MetaEvents } from '@/components/analytics/MetaPixel'

const handlePurchase = (orderData: any) => {
  // Google Analytics
  trackConversion('purchase', {
    transaction_id: orderData.id,
    value: orderData.total,
    currency: 'ARS',
    items: orderData.items,
  })
  
  // Meta Pixel
  MetaEvents.Purchase({
    value: orderData.total,
    currency: 'ARS',
    content_type: 'product',
    contents: orderData.items,
  })
}
```

### 4.3 Ejemplo: Rastrear búsquedas

```typescript
import { trackEvent } from '@/components/analytics/GoogleAnalytics'
import { MetaEvents } from '@/components/analytics/MetaPixel'

const handleSearch = (searchTerm: string) => {
  // Google Analytics
  trackEvent('search', {
    search_term: searchTerm,
  })
  
  // Meta Pixel
  MetaEvents.Search({
    search_string: searchTerm,
  })
}
```

### 4.4 Ejemplo: Rastrear visualización de contenido

```typescript
import { MetaEvents } from '@/components/analytics/MetaPixel'

const handleViewLead = (leadId: string, leadValue: number) => {
  MetaEvents.ViewContent({
    content_name: `Lead ${leadId}`,
    value: leadValue,
    currency: 'ARS',
  })
}
```

---

## 📋 Eventos Disponibles

### Google Analytics

```typescript
import { trackEvent, trackConversion } from '@/components/analytics'

// Evento genérico
trackEvent('nombre_evento', { param1: 'valor1', param2: 'valor2' })

// Conversión
trackConversion('purchase', {
  value: 100,
  currency: 'ARS',
  transaction_id: '12345',
})
```

### Meta Pixel - Eventos Estándar

```typescript
import { MetaEvents } from '@/components/analytics'

// Lead generado
MetaEvents.Lead({ content_name: 'Formulario', value: 50 })

// Compra realizada
MetaEvents.Purchase({ value: 100, currency: 'ARS' })

// Registro completado
MetaEvents.CompleteRegistration({ status: 'success' })

// Inicio de checkout
MetaEvents.InitiateCheckout({ value: 100, currency: 'ARS' })

// Búsqueda
MetaEvents.Search({ search_string: 'término' })

// Agregar al carrito
MetaEvents.AddToCart({ content_name: 'Producto', value: 50 })

// Ver contenido
MetaEvents.ViewContent({ content_name: 'Página', value: 0 })

// Contacto
MetaEvents.Contact({ content_name: 'Formulario contacto' })
```

---

## 🔍 Lugares Sugeridos para Implementar Tracking

### En tu CRM, considera agregar tracking en:

1. **Creación de Leads** (`src/app/(dashboard)/leads/`)
   - Evento: `Lead` (Meta) y `lead_created` (GA)

2. **Formularios de Contacto**
   - Evento: `Contact` (Meta) y `form_submit` (GA)

3. **Pipeline - Cambio de Etapa**
   - Evento personalizado: `pipeline_stage_change`

4. **Búsquedas de Leads**
   - Evento: `Search` (Meta) y `search` (GA)

5. **Visualización de Detalles de Lead**
   - Evento: `ViewContent` (Meta) y `view_lead` (GA)

6. **Integraciones con ManyChat**
   - Evento personalizado: `manychat_sync`

---

## 🎨 Ejemplo Completo: Integración en Formulario de Lead

```typescript
'use client'

import { useState } from 'react'
import { trackEvent } from '@/components/analytics/GoogleAnalytics'
import { MetaEvents } from '@/components/analytics/MetaPixel'

export default function LeadForm() {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Crear el lead
      const response = await fetch('/api/leads', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        // ✅ TRACKING: Lead creado exitosamente
        
        // Google Analytics
        trackEvent('lead_created', {
          lead_source: 'web_form',
          form_name: 'contact_form',
        })
        
        // Meta Pixel
        MetaEvents.Lead({
          content_name: 'Formulario de Contacto',
          value: 0, // Puedes asignar un valor estimado del lead
          currency: 'ARS',
        })

        alert('¡Lead creado exitosamente!')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Tu formulario aquí */}
      <button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  )
}
```

---

## 🔒 Seguridad y Privacidad

### Variables de Entorno Públicas

Las variables que comienzan con `NEXT_PUBLIC_` son **públicas** y se incluyen en el código del cliente. Esto es correcto para:

- ✅ Google Analytics ID
- ✅ Meta Pixel ID

Estas IDs están diseñadas para ser públicas y no comprometen la seguridad.

### GDPR y Consentimiento

Si operas en Europa o tienes usuarios europeos, considera implementar un banner de consentimiento de cookies antes de activar los trackers. Puedes usar librerías como:

- [react-cookie-consent](https://www.npmjs.com/package/react-cookie-consent)
- [cookieyes](https://www.cookieyes.com/)

---

## 📊 Verificar Datos en las Plataformas

### Google Analytics

1. Ve a [Google Analytics](https://analytics.google.com/)
2. Selecciona tu propiedad
3. Ve a **Informes** → **Tiempo real**
4. Deberías ver tu visita activa
5. Ve a **Eventos** para ver los eventos personalizados

### Meta Pixel

1. Ve a [Meta Events Manager](https://business.facebook.com/events_manager/)
2. Selecciona tu píxel
3. Ve a la pestaña **Información general**
4. Deberías ver la actividad en tiempo real
5. Ve a **Probar eventos** para verificar que los eventos se están enviando correctamente

---

## 🐛 Solución de Problemas

### No veo datos en Google Analytics

1. ✅ Verifica que el ID comienza con `G-`
2. ✅ Verifica que reiniciaste el servidor después de agregar las variables
3. ✅ Espera 24-48 horas para que GA4 procese los datos (tiempo real funciona inmediatamente)
4. ✅ Instala la extensión Google Analytics Debugger

### No veo datos en Meta Pixel

1. ✅ Verifica que el ID es solo números (sin `G-` ni otros prefijos)
2. ✅ Verifica que reiniciaste el servidor
3. ✅ Instala la extensión Meta Pixel Helper
4. ✅ Verifica en la consola del navegador que no hay errores

### Los eventos personalizados no se rastrean

1. ✅ Verifica que importas correctamente las funciones
2. ✅ Asegúrate de que el código se ejecuta en el cliente (`'use client'`)
3. ✅ Verifica en la consola que no hay errores de JavaScript

---

## 📞 Soporte

Si tienes problemas:

1. Revisa la consola del navegador (F12) para ver errores
2. Verifica que las variables de entorno estén configuradas correctamente
3. Usa las extensiones del navegador mencionadas para debuggear

---

## 🎉 ¡Listo!

Ahora tienes una integración completa y profesional de analytics en tu CRM. Los datos comenzarán a fluir automáticamente y podrás tomar decisiones basadas en datos reales de tus usuarios.

**Próximos pasos recomendados:**

1. ✅ Configurar las variables de entorno
2. ✅ Verificar que funciona con las extensiones del navegador
3. ✅ Implementar tracking en los formularios de lead
4. ✅ Configurar conversiones personalizadas en Meta Ads Manager
5. ✅ Crear embudos y objetivos en Google Analytics

---

**¿Necesitas ayuda?** Consulta la documentación oficial:

- [Google Analytics 4 Docs](https://developers.google.com/analytics/devguides/collection/ga4)
- [Meta Pixel Docs](https://developers.facebook.com/docs/meta-pixel)

