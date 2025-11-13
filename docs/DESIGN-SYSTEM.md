# Design System FMC CRM

## Introducción

Este documento define el sistema de diseño completo del CRM FMC (Formosa Moto Crédito), basado en un enfoque moderno inspirado en Prometheo con una paleta de colores púrpura como elemento principal.

## Paleta de Colores

### Colores Principales

#### Púrpura (Primary)
- **purple-500:** `#a855f7` - Color principal para estados activos
- **purple-600:** `#9333ea` - Color secundario para elementos destacados
- **purple-700:** `#7c3aed` - Color para gradientes y elementos de mayor contraste

**Uso:** Estados activos, botones primarios, iconos destacados, gráficos principales

#### Verde (Success)
- **green-500:** `#22c55e` - Color principal para estados positivos
- **green-600:** `#16a34a` - Color secundario para confirmaciones

**Uso:** Estados conectados, confirmaciones, métricas positivas, estados de éxito

### Colores Neutros

#### Escala de Grises
- **gray-50:** `#f9fafb` - Fondo del sidebar y página principal
- **gray-100:** `#f3f4f6` - Fondos de cards de usuario, estados hover
- **gray-200:** `#e5e7eb` - Bordes, badges inactivos, separadores
- **gray-300:** `#d1d5db` - Bordes sutiles, elementos deshabilitados
- **gray-500:** `#6b7280` - Iconos inactivos, texto secundario
- **gray-700:** `#374151` - Texto de navegación inactivo
- **gray-900:** `#111827` - Texto principal, títulos

### Gradientes

Definidos en `src/app/globals.css`:

```css
.gradient-primary {
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
}

.gradient-success {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.gradient-text {
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

## Tipografía

### Font Family
Sans-serif system font (default Tailwind) para máxima compatibilidad y rendimiento.

### Tamaños de Texto

| Clase | Tamaño | Uso |
|-------|--------|-----|
| `.text-xs` | 12px | Badges, timestamps, subtextos |
| `.text-sm` | 14px | Navegación, descripciones |
| `.text-base` | 16px | Texto regular |
| `.text-lg` | 18px | Títulos de sección |
| `.text-xl` | 20px | Títulos destacados |
| `.text-2xl` | 24px | Títulos de página principales |

### Pesos de Fuente

| Clase | Peso | Uso |
|-------|------|-----|
| `font-medium` | 500 | Navegación, labels |
| `font-semibold` | 600 | Subtítulos, headers de sección |
| `font-bold` | 700 | Títulos principales, valores numéricos grandes |

## Espaciado y Layout

### Espaciado del Sidebar

```css
/* Logo */
.logo-container {
  margin: -my-6; /* -24px para compactar */
}

/* Navegación */
.navigation {
  padding-x: 1rem; /* 16px lateral */
  space-y: 0.25rem; /* 4px entre items */
}

/* Items de navegación */
.nav-item {
  padding: 0.75rem 0.625rem; /* 12px vertical, 10px horizontal */
}
```

### Espaciado de Cards

```css
/* Padding base */
.card-padding {
  padding: 1rem; /* 16px */
}

.card-padding-large {
  padding: 1.5rem; /* 24px */
}

/* Gaps en grids */
.grid-gap {
  gap: 1.5rem; /* 24px */
}

/* Border radius */
.border-radius {
  border-radius: 0.5rem; /* 8px */
}
```

### Márgenes de Página

```css
/* Contenido principal */
.main-content {
  padding: 1.5rem; /* 24px */
}

/* Secciones */
.section-spacing {
  space-y: 2rem; /* 32px */
}
```

## Componentes UI

### Sidebar

#### Estructura Base
```tsx
<div className="bg-gray-50">
  {/* Logo */}
  <div className="flex justify-center -my-6">
    <FMCLogo variant="icon" size="lg" />
  </div>
  
  {/* Navegación */}
  <nav className="flex-1 px-4 space-y-1">
    {/* Items de navegación */}
  </nav>
</div>
```

#### Estados de Navegación

**Item Activo:**
```tsx
className="bg-purple-100 text-purple-700 border border-purple-200"
```

**Item Inactivo:**
```tsx
className="text-gray-700 hover:bg-gray-100"
```

**Iconos:**
- Activo: `text-purple-600`
- Inactivo: `text-gray-500`
- Hover: `group-hover:text-gray-700`

**Badges:**
- Activo: `bg-purple-200 text-purple-800`
- Inactivo: `bg-gray-200 text-gray-600`

### Headers de Sección

```tsx
<div className="my-4">
  <Separator className="my-2" />
  <div className="px-3 py-2">
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {sectionName}
    </h3>
  </div>
</div>
```

### Cards

#### Estructura Base
```tsx
<div className="bg-white border-gray-200 shadow-sm rounded-lg hover-lift">
  <div className="p-6">
    {/* Contenido */}
  </div>
</div>
```

#### Headers de Card
```tsx
<h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
  {title}
</h3>
```

### Badges

#### Estados de Conexión
```css
.status-connected {
  @apply bg-green-100 text-green-800 border-green-200;
}

.status-disconnected {
  @apply bg-gray-100 text-gray-800 border-gray-200;
}

.status-pending {
  @apply bg-yellow-100 text-yellow-800 border-yellow-200;
}
```

### Botones

#### Primario
```tsx
<Button className="gradient-primary text-white">
  {text}
</Button>
```

#### Outline
```tsx
<Button variant="outline" className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100">
  {text}
</Button>
```

#### Ghost
```tsx
<Button variant="ghost" className="bg-transparent text-gray-600 hover:bg-gray-100">
  {text}
</Button>
```

## Logo FMC

### Componente
Ubicado en: `src/components/branding/FMCLogo.tsx`

### Variantes

#### Icon (Solo logo)
```tsx
<FMCLogo variant="icon" size="lg" />
```

#### Compact (Logo + texto)
```tsx
<FMCLogo variant="compact" size="md" />
```

#### Full (Logo + texto completo)
```tsx
<FMCLogo variant="full" size="sm" />
```

### Tamaños

| Tamaño | Dimensiones | Uso |
|--------|-------------|-----|
| `sm` | 64x64px | Uso general |
| `md` | 80x80px | Headers |
| `lg` | 160x160px | Sidebar principal |

## Animaciones

### Clases Utilitarias

```css
/* Fade in suave */
.animate-fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

/* Slide desde abajo */
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

/* Scale desde 95% */
.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}

/* Elevación en hover */
.hover-lift {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}
```

### Transiciones

```css
/* Navegación */
.nav-transition {
  transition: all 0.2s ease-in-out;
}

/* Iconos */
.icon-transition {
  transition: color 0.2s ease-in-out;
}

/* Hover effects */
.hover-transition {
  transition: transform 0.2s ease-in-out;
}
```

## Estados de Navegación

### Patrón de Navegación Activa

```tsx
const navItemClasses = cn(
  "group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
  active
    ? "bg-purple-100 text-purple-700 border border-purple-200"
    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
)
```

### Iconos con Estado

```tsx
{item.icon && (
  <item.icon className={cn(
    "h-5 w-5 transition-colors",
    active ? "text-purple-600" : "text-gray-500 group-hover:text-gray-700"
  )} />
)}
```

## Gráficos y Visualizaciones

### Colores de Gráficos

```css
/* Línea principal */
.chart-primary {
  color: hsl(262.1 83.3% 57.8%); /* purple */
}

/* Línea secundaria */
.chart-secondary {
  color: hsl(142.1 76.2% 36.3%); /* green */
}

/* Grid */
.chart-grid {
  color: hsl(var(--muted));
  stroke-dasharray: 3 3;
}
```

### Donut Charts

```css
/* WhatsApp */
.chart-whatsapp {
  color: hsl(262.1 83.3% 57.8%); /* purple principal */
}

/* Instagram */
.chart-instagram {
  color: hsl(280 80% 60%); /* purple-pink */
}

/* Facebook */
.chart-facebook {
  color: hsl(220 80% 60%); /* blue-purple */
}
```

## Patrones de Diseño

### Jerarquía Visual

1. **Logo FMC** - Elemento más prominente en el sidebar
2. **Navegación activa** - Destacada con fondo púrpura
3. **Títulos de sección** - Headers con separadores
4. **Cards** - Contenedores con sombra sutil
5. **Badges** - Indicadores de estado pequeños

### Consistencia

- **Espaciado:** Uso consistente de la escala de Tailwind
- **Colores:** Paleta limitada con púrpura como color principal
- **Tipografía:** Jerarquía clara con pesos y tamaños definidos
- **Interacciones:** Transiciones suaves y hover effects consistentes

### Accesibilidad

- **Contraste:** Colores con suficiente contraste para legibilidad
- **Tamaños:** Elementos táctiles de al menos 44px
- **Estados:** Estados hover y focus claramente definidos
- **Navegación:** Estructura lógica y predecible

## Navegación del Sidebar

### Estructura de Navegación

```tsx
const createNavigation = (leadsCount: number): NavigationItem[] => [
  // Sección Principal
  {
    name: "Inicio",
    href: "/dashboard",
    icon: Home
  },
  {
    name: "Chats",
    href: "/chats",
    icon: MessageSquare,
    badge: "18" // TODO: hacer dinámico desde API
  },
  {
    name: "Conexiones",
    href: "/conexiones",
    icon: Layers
  },
  
  // Separador - Entrenamiento
  {
    name: "Entrenamiento",
    href: "#",
    icon: null,
    isHeader: true
  },
  {
    name: "Asistentes",
    href: "/asistentes",
    icon: Bot
  },
  {
    name: "Testing",
    href: "/testing",
    icon: Sparkles
  },
  
  // Separador - CRM
  {
    name: "CRM",
    href: "#",
    icon: null,
    isHeader: true
  },
  {
    name: "Smart Tags",
    href: "/tags",
    icon: Tag
  },
  {
    name: "Contactos",
    href: "/leads",
    icon: Users,
    badge: leadsCount.toLocaleString()
  },
  {
    name: "Pipeline",
    href: "/pipeline",
    icon: TrendingUp
  },
  {
    name: "Automatizaciones",
    href: "/automation",
    icon: Zap
  },
  {
    name: "Documentos",
    href: "/documents",
    icon: FileText,
    badge: "12" // TODO: hacer dinámico desde API
  },
  {
    name: "Reportes",
    href: "/reports",
    icon: BarChart3
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings
  },
  {
    name: "Admin",
    href: "/admin",
    icon: Shield,
    children: [
      {
        name: "Usuarios",
        href: "/admin/users",
        icon: Users
      },
      {
        name: "Roles y Permisos",
        href: "/admin/roles",
        icon: Shield
      }
    ]
  }
]
```

### Organización por Secciones

**Sección Principal:**
- Inicio (Dashboard)
- Chats (con badge dinámico)
- Conexiones (integraciones)

**Sección Entrenamiento:**
- Asistentes (gestión de IA)
- Testing (pruebas de asistentes)

**Sección CRM:**
- Smart Tags (clasificación automática)
- Contactos (gestión de leads)
- Pipeline (proceso de ventas)
- Automatizaciones (flujos automáticos)
- Documentos (archivos y contratos)
- Reportes (análisis y métricas)

**Sección Inferior:**
- Settings (configuración)
- Admin (gestión de usuarios y permisos)

## Implementación

### Archivos de Configuración

- **`tailwind.config.ts`** - Paleta de colores personalizada
- **`src/app/globals.css`** - Utilidades y animaciones
- **`src/components/branding/FMCLogo.tsx`** - Componente de logo
- **`src/components/layout/Sidebar.tsx`** - Patrones de navegación

### Uso en Componentes

```tsx
import { FMCLogo } from '@/components/branding/FMCLogo'
import { cn } from '@/lib/utils'

// Ejemplo de uso
<div className={cn(
  "bg-white border-gray-200 shadow-sm rounded-lg",
  "hover-lift transition-all duration-200"
)}>
  <FMCLogo variant="icon" size="lg" />
</div>
```

---

*Este design system está en constante evolución. Para actualizaciones y mejoras, consulta el repositorio del proyecto.*
