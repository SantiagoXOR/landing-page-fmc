# 🎯 Ejemplos Prácticos de Integración de Analytics

## 📋 Ejemplos de uso del hook `useAnalytics`

### Ejemplo 1: Formulario de Creación de Lead

```typescript
'use client'

import { useState } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'

export default function CreateLeadForm() {
  const { trackLeadCreated, trackFormSubmit, trackError } = useAnalytics()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const data = Object.fromEntries(formData)

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const lead = await response.json()
        
        // ✅ Rastrear creación exitosa del lead
        trackLeadCreated({
          source: data.source as string,
          value: parseFloat(data.value as string) || 0,
          leadId: lead.id,
        })
        
        // ✅ Rastrear envío exitoso del formulario
        trackFormSubmit('create_lead_form', true)
        
        alert('¡Lead creado exitosamente!')
      } else {
        throw new Error('Error al crear lead')
      }
    } catch (error) {
      console.error('Error:', error)
      
      // ❌ Rastrear error
      trackError({
        error_type: 'lead_creation_failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        page: '/leads/new',
      })
      
      trackFormSubmit('create_lead_form', false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Nombre" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="source" placeholder="Fuente" />
      <input name="value" type="number" placeholder="Valor estimado" />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creando...' : 'Crear Lead'}
      </button>
    </form>
  )
}
```

---

### Ejemplo 2: Pipeline - Arrastrar y Soltar Leads

```typescript
'use client'

import { useAnalytics } from '@/hooks/useAnalytics'

export default function PipelineBoard() {
  const { trackPipelineStageChange } = useAnalytics()

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return

    const leadId = result.draggableId
    const fromStage = result.source.droppableId
    const toStage = result.destination.droppableId

    try {
      // Actualizar en la base de datos
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: toStage }),
      })

      // ✅ Rastrear cambio de etapa
      trackPipelineStageChange({
        leadId,
        fromStage,
        toStage,
        dealValue: 5000, // Obtener del lead
      })
    } catch (error) {
      console.error('Error al mover lead:', error)
    }
  }

  return (
    <div>
      {/* Tu componente de pipeline con drag & drop */}
    </div>
  )
}
```

---

### Ejemplo 3: Buscador de Leads

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useDebounce } from '@/hooks/useDebounce' // Asume que existe

export default function LeadSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const { trackSearch } = useAnalytics()
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  useEffect(() => {
    if (debouncedSearchTerm.length >= 3) {
      performSearch(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm])

  const performSearch = async (term: string) => {
    try {
      const response = await fetch(`/api/leads/search?q=${encodeURIComponent(term)}`)
      const data = await response.json()
      
      setResults(data)
      
      // ✅ Rastrear búsqueda
      trackSearch(term, data.length)
      
    } catch (error) {
      console.error('Error en búsqueda:', error)
    }
  }

  return (
    <div>
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar leads..."
      />
      
      <div>
        {results.map((lead: any) => (
          <div key={lead.id}>{lead.name}</div>
        ))}
      </div>
    </div>
  )
}
```

---

### Ejemplo 4: Ver Detalles de un Lead

```typescript
'use client'

import { useEffect } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'

export default function LeadDetails({ leadId }: { leadId: string }) {
  const { trackLeadViewed } = useAnalytics()

  useEffect(() => {
    // Rastrear cuando el usuario ve el lead
    trackLeadViewed({
      leadId,
      leadValue: 5000, // Obtener del lead real
    })
  }, [leadId, trackLeadViewed])

  return (
    <div>
      {/* Detalles del lead */}
    </div>
  )
}
```

---

### Ejemplo 5: Sincronización con ManyChat

```typescript
'use client'

import { useAnalytics } from '@/hooks/useAnalytics'

export default function ManyChatSyncButton({ leadId }: { leadId: string }) {
  const { trackManyChatSync } = useAnalytics()

  const handleSync = async () => {
    try {
      const response = await fetch('/api/manychat/sync', {
        method: 'POST',
        body: JSON.stringify({ leadId }),
      })

      const success = response.ok

      // ✅ Rastrear sincronización
      trackManyChatSync({
        action: 'sync',
        leadId,
        success,
      })

      if (success) {
        alert('¡Sincronizado con ManyChat!')
      } else {
        throw new Error('Error en la sincronización')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <button onClick={handleSync}>
      Sincronizar con ManyChat
    </button>
  )
}
```

---

### Ejemplo 6: Formulario de Registro de Usuario

```typescript
'use client'

import { useAnalytics } from '@/hooks/useAnalytics'
import { signIn } from 'next-auth/react'

export default function RegisterForm() {
  const { trackUserRegistration } = useAnalytics()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const user = await response.json()
        
        // ✅ Rastrear registro exitoso
        trackUserRegistration({
          method: 'email',
          userId: user.id,
        })
        
        // Iniciar sesión automáticamente
        await signIn('credentials', { email, password })
      }
    } catch (error) {
      console.error('Error en registro:', error)
    }
  }

  return (
    <form onSubmit={handleRegister}>
      {/* Campos del formulario */}
    </form>
  )
}
```

---

### Ejemplo 7: Tracking Global de Errores

Puedes crear un componente Error Boundary que rastree errores automáticamente:

```typescript
'use client'

import { Component, ReactNode } from 'react'
import { trackEvent } from '@/components/analytics/GoogleAnalytics'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundaryWithTracking extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // ❌ Rastrear error en analytics
    trackEvent('javascript_error', {
      error_message: error.message,
      error_stack: error.stack?.substring(0, 500),
      component_stack: errorInfo.componentStack?.substring(0, 500),
      page: window.location.pathname,
    })

    console.error('Error capturado:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Algo salió mal</h1>
          <p>El error ha sido reportado automáticamente.</p>
        </div>
      )
    }

    return this.props.children
  }
}
```

---

### Ejemplo 8: Tracking en API Routes (Server-Side)

Para eventos del servidor, puedes usar el API de Meta Conversions y GA4 Measurement Protocol:

```typescript
// src/app/api/leads/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Crear lead en la base de datos
    const lead = await createLead(data)
    
    // 📊 Rastrear en Meta Pixel (server-side)
    if (process.env.META_PIXEL_ID) {
      await fetch(
        `https://graph.facebook.com/v18.0/${process.env.META_PIXEL_ID}/events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: [{
              event_name: 'Lead',
              event_time: Math.floor(Date.now() / 1000),
              user_data: {
                em: data.email ? hashEmail(data.email) : undefined,
                ph: data.phone ? hashPhone(data.phone) : undefined,
              },
              custom_data: {
                content_name: 'API Lead Creation',
                value: data.value || 0,
                currency: 'ARS',
              },
            }],
            access_token: process.env.META_PIXEL_ACCESS_TOKEN,
          }),
        }
      )
    }
    
    return NextResponse.json(lead)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating lead' },
      { status: 500 }
    )
  }
}

// Función para hashear email (requerido por Meta)
function hashEmail(email: string): string {
  const crypto = require('crypto')
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex')
}
```

---

## 🎨 Integración con tu CRM Actual

### Archivo sugerido: `src/components/leads/trpc-lead-form.tsx`

Si tienes un formulario de leads existente, añade el tracking así:

```typescript
// Añadir al inicio del archivo
import { useAnalytics } from '@/hooks/useAnalytics'

// Dentro del componente
export function LeadForm() {
  const { trackLeadCreated, trackError } = useAnalytics()
  
  // En tu función de submit existente, añade:
  const onSubmit = async (data: any) => {
    try {
      const result = await createLead(data)
      
      // ✅ AÑADE ESTO
      trackLeadCreated({
        source: data.source,
        value: data.estimatedValue,
        leadId: result.id,
      })
      
      toast.success('Lead creado!')
    } catch (error) {
      // ❌ AÑADE ESTO
      trackError({
        error_type: 'lead_creation_failed',
        error_message: error.message,
      })
      
      toast.error('Error al crear lead')
    }
  }
  
  // ... resto del componente
}
```

---

## 📊 Eventos Recomendados por Sección del CRM

### Dashboard (`src/app/(dashboard)/dashboard/page.tsx`)
```typescript
useEffect(() => {
  trackEvent('dashboard_viewed', {
    user_role: user.role,
  })
}, [])
```

### Pipeline (`src/app/(dashboard)/pipeline/page.tsx`)
```typescript
const { trackPipelineStageChange } = useAnalytics()

// Al mover un lead
trackPipelineStageChange({
  leadId: lead.id,
  fromStage: 'contactado',
  toStage: 'calificado',
  dealValue: lead.value,
})
```

### ManyChat Integration (`src/app/(dashboard)/manychat/`)
```typescript
const { trackManyChatSync } = useAnalytics()

// Al sincronizar
trackManyChatSync({
  action: 'sync',
  leadId: lead.id,
  success: true,
})
```

### Reports (`src/app/(dashboard)/reports/`)
```typescript
const { trackCustomEvent } = useAnalytics()

// Al generar reporte
trackCustomEvent('report_generated', {
  report_type: 'sales',
  date_range: '30_days',
})
```

---

## 🚀 Mejores Prácticas

### 1. **No rastrear información sensible**
```typescript
// ❌ MAL
trackEvent('user_action', {
  password: user.password, // ¡NUNCA!
  credit_card: user.cc,    // ¡NUNCA!
})

// ✅ BIEN
trackEvent('user_action', {
  user_id: user.id,
  action_type: 'profile_update',
})
```

### 2. **Usar nombres consistentes de eventos**
```typescript
// ✅ BIEN - Usa snake_case y nombres descriptivos
trackEvent('lead_created')
trackEvent('pipeline_stage_changed')
trackEvent('manychat_message_sent')

// ❌ MAL - Inconsistente
trackEvent('LeadCreated')
trackEvent('pipelineChange')
trackEvent('MC_MSG')
```

### 3. **Agrupar eventos relacionados**
```typescript
// ✅ BIEN
trackEvent('form_interaction', { action: 'focus', field: 'email' })
trackEvent('form_interaction', { action: 'blur', field: 'email' })
trackEvent('form_interaction', { action: 'submit' })
```

### 4. **Incluir contexto relevante**
```typescript
trackEvent('lead_created', {
  source: 'web_form',
  has_phone: true,
  has_email: true,
  estimated_value: 1000,
  lead_score: 85,
})
```

---

## 🎯 Objetivos y Conversiones en Meta

Después de implementar el tracking, configura objetivos en Meta Ads Manager:

1. Ve a **Meta Events Manager**
2. Selecciona tu píxel
3. Ve a **Configuración** → **Agregar eventos**
4. Crea eventos personalizados basados en los que estás rastreando
5. Asígnalos como objetivos de conversión en tus campañas

---

## 📈 Dashboard de Analytics Recomendado

Crea un dashboard en Google Analytics con:

1. **Adquisición de Leads**
   - Total de leads creados
   - Fuente de leads (web_form, api, import)
   - Tasa de conversión

2. **Pipeline**
   - Movimientos entre etapas
   - Tiempo en cada etapa
   - Tasa de cierre

3. **Engagement**
   - Páginas más visitadas
   - Tiempo en sitio
   - Búsquedas realizadas

4. **Integraciones**
   - Sincronizaciones con ManyChat
   - Mensajes enviados
   - Tasa de éxito

---

## ✅ Checklist de Implementación

- [ ] Variables de entorno configuradas
- [ ] Servidor reiniciado
- [ ] Extensiones del navegador instaladas
- [ ] Tracking verificado en tiempo real
- [ ] Hook `useAnalytics` implementado en formularios
- [ ] Tracking de pipeline implementado
- [ ] Tracking de búsquedas implementado
- [ ] Error tracking implementado
- [ ] Conversiones configuradas en Meta
- [ ] Objetivos configurados en GA4

---

¡Ahora tienes todos los ejemplos necesarios para implementar analytics completo en tu CRM! 🎉

