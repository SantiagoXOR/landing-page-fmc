# Guía de Componentes UI - FMC CRM

## Introducción

Esta guía documenta los componentes UI personalizados del CRM FMC, sus props, variantes y patrones de uso recomendados.

## Componentes de Layout

### Header

**Ubicación:** `src/components/layout/Header.tsx`

Componente de cabecera principal con título, subtítulo y acciones.

#### Props

```tsx
interface HeaderProps {
  title: string
  subtitle: string
  showDateFilter?: boolean
  showExportButton?: boolean
  showNewButton?: boolean
  newButtonText?: string
  newButtonHref?: string
}
```

#### Uso

```tsx
<Header
  title="Dashboard"
  subtitle="Resumen de actividad y métricas principales de FMC"
  showDateFilter={true}
  showExportButton={true}
  showNewButton={true}
  newButtonText="Nuevo Lead"
  newButtonHref="/leads/new"
/>
```

#### Características

- **Filtro de fecha:** Popover con calendario
- **Botón de exportar:** Con icono de descarga
- **Botón de acción:** Personalizable con texto y enlace
- **Información de usuario:** Avatar y dropdown de usuario
- **Notificaciones:** Centro de notificaciones integrado

### Sidebar

**Ubicación:** `src/components/layout/Sidebar.tsx`

Navegación lateral principal con logo FMC y menú de navegación.

#### Características

- **Logo FMC:** Grande y prominente en la parte superior
- **Navegación jerárquica:** Con separadores visuales
- **Estados activos:** Destacados con colores púrpura
- **Badges:** Contadores dinámicos para elementos
- **Submenús:** Expandibles con animaciones
- **Responsive:** Colapsable en móviles

#### Estructura de Navegación

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

## Componentes de Dashboard

### IndicatorCard

**Ubicación:** `src/components/dashboard/IndicatorCard.tsx`

Tarjeta para mostrar indicadores clave de rendimiento (KPIs).

#### Props

```tsx
interface IndicatorCardProps {
  title: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  icon: ReactNode
  className?: string
}
```

#### Uso

```tsx
<IndicatorCard
  title="Conversaciones"
  value="18"
  trend="up"
  trendValue="+12%"
  icon={<MessageSquare className="h-6 w-6 text-purple-600" />}
/>
```

#### Variantes

- **Con tendencia:** Muestra flecha y porcentaje
- **Sin tendencia:** Solo valor y título
- **Personalizable:** Clase CSS personalizable

### AddIndicatorCard

**Ubicación:** `src/components/dashboard/AddIndicatorCard.tsx`

Tarjeta placeholder para agregar nuevos indicadores.

#### Uso

```tsx
<AddIndicatorCard />
```

#### Características

- **Diseño placeholder:** Borde punteado
- **Botón de agregar:** Icono de plus
- **Hover effect:** Elevación sutil
- **Consistente:** Mismo tamaño que IndicatorCard

### ConversationsByChannel

**Ubicación:** `src/components/dashboard/ConversationsByChannel.tsx`

Gráfico de dona para mostrar conversaciones por canal.

#### Uso

```tsx
<ConversationsByChannel />
```

#### Características

- **Datos estáticos:** Configurables en el componente
- **Colores temáticos:** Púrpura para WhatsApp, variaciones para otros
- **Tooltip:** Información al hacer hover
- **Responsive:** Se adapta al contenedor

#### Configuración de Colores

```tsx
const chartConfig = {
  conversations: {
    label: 'Conversaciones',
  },
  whatsapp: {
    label: 'WhatsApp',
    color: 'hsl(262.1 83.3% 57.8%)', // Purple principal
  },
  instagram: {
    label: 'Instagram',
    color: 'hsl(280 80% 60%)', // Purple-pink
  },
  facebook: {
    label: 'Facebook',
    color: 'hsl(220 80% 60%)', // Blue-purple
  },
}
```

### WeeklyTrendChart

**Ubicación:** `src/components/dashboard/WeeklyTrendChart.tsx`

Gráfico de líneas para mostrar tendencias semanales.

#### Uso

```tsx
<WeeklyTrendChart />
```

#### Características

- **Datos semanales:** Lunes a domingo
- **Múltiples líneas:** Leads y conversiones
- **Grid personalizado:** Líneas punteadas sutiles
- **Leyenda:** Identificación de series
- **Responsive:** Altura fija, ancho adaptable

## Componentes de Integración

### ConnectionCard

**Ubicación:** `src/components/integrations/ConnectionCard.tsx`

Tarjeta para mostrar el estado de conexiones con plataformas externas.

#### Props

```tsx
interface ConnectionCardProps {
  platform: 'whatsapp' | 'instagram' | 'facebook'
  status: 'connected' | 'disconnected' | 'pending'
  accountName?: string
  lastActivity?: string
  onConnect?: () => void
  onDisconnect?: () => void
  onSettings?: () => void
}
```

#### Uso

```tsx
<ConnectionCard
  platform="whatsapp"
  status="connected"
  accountName="WhatsApp Business API"
  lastActivity="Hace 5 minutos"
  onConnect={() => handleConnect('whatsapp')}
  onDisconnect={() => handleDisconnect('whatsapp')}
  onSettings={() => handleSettings('whatsapp')}
/>
```

#### Características

- **Iconos de plataforma:** Específicos para cada servicio
- **Estados visuales:** Colores según el estado de conexión
- **Acciones contextuales:** Botones según el estado
- **Hover effects:** Elevación y transiciones suaves

#### Estados de Conexión

```tsx
const statusBadgeClass = cn(
  'text-xs font-medium',
  {
    'bg-green-100 text-green-800 border-green-200': isConnected,
    'bg-gray-100 text-gray-800 border-gray-200': status === 'disconnected',
    'bg-yellow-100 text-yellow-800 border-yellow-200': status === 'pending',
  }
)
```

## Componentes de Branding

### FMCLogo

**Ubicación:** `src/components/branding/FMCLogo.tsx`

Componente del logo FMC con múltiples variantes.

#### Props

```tsx
interface FMCLogoProps {
  variant?: 'full' | 'compact' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}
```

#### Variantes

##### Icon (Solo logo)
```tsx
<FMCLogo variant="icon" size="lg" />
```
- Solo el logo SVG sin texto
- Usado en el sidebar principal

##### Compact (Logo + texto)
```tsx
<FMCLogo variant="compact" size="md" />
```
- Logo + texto "FMC"
- Usado en headers compactos

##### Full (Logo + texto completo)
```tsx
<FMCLogo variant="full" size="sm" />
```
- Logo + "FMC" + "FORMOSA MOTO CREDITO"
- Usado en páginas de login o marketing

#### Tamaños

| Tamaño | Dimensiones | Uso Recomendado |
|--------|-------------|-----------------|
| `sm` | 64x64px | Headers, navegación |
| `md` | 80x80px | Páginas principales |
| `lg` | 160x160px | Sidebar principal |

## Patrones de Uso

### Grid de Indicadores

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  <IndicatorCard
    title="Conversaciones"
    value="18"
    icon={<MessageSquare className="h-6 w-6 text-purple-600" />}
  />
  <AddIndicatorCard />
  <AddIndicatorCard />
  <AddIndicatorCard />
</div>
```

### Layout de Dashboard

```tsx
<div className="min-h-screen bg-gray-50">
  <Header
    title="Dashboard"
    subtitle="Resumen de actividad y métricas principales de FMC"
    showDateFilter={true}
    showExportButton={true}
    showNewButton={true}
    newButtonText="Nuevo Lead"
    newButtonHref="/leads/new"
  />
  
  <div className="p-6 space-y-8">
    {/* Sección de Indicadores */}
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Indicadores</h2>
      {/* Grid de indicadores */}
    </div>
    
    {/* Gráficos */}
    <WeeklyTrendChart />
    <ConversationsByChannel />
  </div>
</div>
```

### Página de Conexiones

```tsx
<div className="min-h-screen bg-gray-50">
  <Header
    title="Conexiones"
    subtitle="Gestiona tus integraciones con plataformas de mensajería"
  />
  
  <div className="p-6 space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ConnectionCard
        platform="whatsapp"
        status={whatsappStatus}
        onConnect={() => handleConnect('whatsapp')}
        onDisconnect={() => handleDisconnect('whatsapp')}
        onSettings={() => handleSettings('whatsapp')}
      />
      {/* Más conexiones */}
    </div>
  </div>
</div>
```

## Mejores Prácticas

### Consistencia Visual

1. **Usar el sistema de colores:** Siempre usar las clases de color definidas
2. **Mantener espaciado:** Usar la escala de Tailwind consistente
3. **Aplicar hover effects:** Usar `.hover-lift` en cards interactivas
4. **Transiciones suaves:** Aplicar `transition-all duration-200`

### Accesibilidad

1. **Contraste adecuado:** Verificar que los colores cumplan WCAG AA
2. **Estados focus:** Asegurar que los elementos sean navegables por teclado
3. **Labels descriptivos:** Usar texto claro y descriptivo
4. **Iconos con texto:** Combinar iconos con texto cuando sea posible

### Performance

1. **Lazy loading:** Cargar componentes pesados solo cuando sea necesario
2. **Memoización:** Usar `React.memo` para componentes que no cambian frecuentemente
3. **Optimización de imágenes:** Usar `next/image` para el logo FMC
4. **Bundle splitting:** Separar componentes de dashboard en chunks

### Responsive Design

1. **Mobile first:** Diseñar primero para móviles
2. **Breakpoints consistentes:** Usar los breakpoints de Tailwind
3. **Grid adaptativo:** Usar `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
4. **Sidebar colapsable:** Implementar toggle en móviles

---

*Para más información sobre el sistema de diseño, consulta [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)*
