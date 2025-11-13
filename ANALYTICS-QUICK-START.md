# ⚡ Inicio Rápido - Analytics

## 🚀 5 Minutos para Empezar

### Paso 1: Agregar Variables de Entorno (2 min)

Crea un archivo `.env.local` en la raíz del proyecto y agrega:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
```

**¿Dónde obtengo estos IDs?**

#### Google Analytics:
1. Ve a [analytics.google.com](https://analytics.google.com/)
2. Administrador → Flujos de datos → Selecciona tu sitio web
3. Copia el **ID de medición** (formato: `G-XXXXXXXXXX`)

#### Meta Pixel:
1. Ve a [business.facebook.com](https://business.facebook.com/)
2. Configuración del negocio → Orígenes de datos → Píxeles
3. Selecciona **Web** (como en la imagen que compartiste)
4. Copia el **ID del píxel** (solo números)

---

### Paso 2: Reiniciar el Servidor (30 seg)

```bash
# Ctrl+C para detener el servidor
npm run dev
```

---

### Paso 3: Verificar que Funciona (1 min)

1. Abre tu app en el navegador
2. Presiona F12 (DevTools)
3. Ve a la pestaña **Console**
4. No deberías ver errores relacionados con analytics

**Instala las extensiones del navegador para verificar:**
- [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
- [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)

---

### Paso 4: Usar en tu Código (1 min)

#### Opción A: Usar el Hook (Recomendado)

```typescript
'use client'
import { useAnalytics } from '@/hooks/useAnalytics'

export default function MiComponente() {
  const { trackLeadCreated } = useAnalytics()

  const handleClick = () => {
    trackLeadCreated({
      source: 'web',
      value: 100,
      leadId: '123',
    })
  }

  return <button onClick={handleClick}>Crear Lead</button>
}
```

#### Opción B: Usar Funciones Directas

```typescript
'use client'
import { trackEvent } from '@/components/analytics'

export default function MiComponente() {
  const handleClick = () => {
    trackEvent('mi_evento', { propiedad: 'valor' })
  }

  return <button onClick={handleClick}>Hacer algo</button>
}
```

---

## ✅ ¡Listo!

Ahora tu CRM está rastreando automáticamente:
- ✅ Visitas de página
- ✅ Eventos personalizados que agregues
- ✅ Conversiones

---

## 📚 Próximos Pasos

1. **Lee la documentación completa**: `CONFIGURACION-ANALYTICS.md`
2. **Ve ejemplos de código**: `EJEMPLOS-INTEGRACION-ANALYTICS.md`
3. **Implementa tracking en tus formularios** de leads
4. **Configura conversiones** en Meta Ads Manager
5. **Crea dashboards** en Google Analytics

---

## 🆘 ¿Problemas?

### No veo datos en Google Analytics
- ✅ Verifica que el ID empiece con `G-`
- ✅ Reiniciaste el servidor después de agregar las variables
- ✅ Espera 24-48h para datos históricos (tiempo real funciona de inmediato)

### No veo datos en Meta Pixel
- ✅ Verifica que el ID sean solo números
- ✅ Reiniciaste el servidor
- ✅ Usa la extensión Meta Pixel Helper para debuggear

### Los eventos no se rastrean
- ✅ Tu componente debe tener `'use client'` al inicio
- ✅ Verifica la consola del navegador (F12) para ver errores
- ✅ Asegúrate de que la función se ejecuta (agrega un `console.log`)

---

## 🎯 Eventos Más Comunes

```typescript
const { 
  trackLeadCreated,      // Cuando creas un lead
  trackLeadViewed,       // Cuando ves un lead
  trackPipelineStageChange, // Cuando mueves un lead en el pipeline
  trackSearch,           // Cuando buscas algo
  trackFormSubmit,       // Cuando envías un formulario
  trackError,            // Cuando ocurre un error
} = useAnalytics()
```

---

## 🎉 ¡Todo Listo!

Tu integración de analytics está completa y funcionando. Los datos comenzarán a fluir automáticamente a Google Analytics y Meta Pixel.

**¿Necesitas más ayuda?** Consulta la documentación completa en `CONFIGURACION-ANALYTICS.md`

