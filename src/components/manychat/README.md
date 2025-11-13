# Componentes de Manychat

Componentes UI para la integración híbrida de Manychat con el CRM.

## 📦 Componentes Disponibles

### Componentes Principales

#### `ManychatTagManager`
Gestión completa de tags de Manychat.

**Ubicación:** Detalle de lead (tab Tags), Chat sidebar

**Props:**
```typescript
{
  leadId: string
  initialTags?: string[]
  onTagsChange?: (tags: string[]) => void
  readonly?: boolean
}
```

**Características:**
- Agregar/remover tags
- Búsqueda de tags disponibles
- Color coding automático
- Indicador de sincronización
- Estados de carga

**Ejemplo:**
```tsx
<ManychatTagManager
  leadId="lead-123"
  initialTags={['cliente-vip', 'interesado']}
  onTagsChange={(tags) => console.log('Tags actualizados:', tags)}
/>
```

---

#### `ManychatSyncPanel`
Panel de estado y control de sincronización.

**Ubicación:** Detalle de lead (sidebar)

**Props:**
```typescript
{
  leadId: string
  onSyncComplete?: () => void
}
```

**Características:**
- Estado de sincronización en tiempo real
- Botón "Sincronizar ahora"
- Manychat ID visible
- Última fecha de sync
- Historial de logs (últimos 5)
- Mensajes de error claros

**Ejemplo:**
```tsx
<ManychatSyncPanel
  leadId="lead-123"
  onSyncComplete={() => refetchLead()}
/>
```

---

#### `ManychatMessageSender`
Envío avanzado de mensajes con soporte multimedia.

**Ubicación:** Detalle de lead (tab Enviar)

**Props:**
```typescript
{
  leadId: string
  telefono: string
  manychatId?: string
  onMessageSent?: (messageId: string) => void
}
```

**Características:**
- Tabs: Texto, Imagen, Video, Archivo
- Detección automática Manychat/Meta API
- Indicador de proveedor
- Estado de sincronización
- Atajos de teclado (Ctrl+Enter)
- Límites de caracteres

**Ejemplo:**
```tsx
<ManychatMessageSender
  leadId="lead-123"
  telefono="+51987654321"
  manychatId="12345"
  onMessageSent={(id) => console.log('Mensaje enviado:', id)}
/>
```

---

#### `ManychatCustomFields`
Editor de custom fields con sincronización.

**Ubicación:** Detalle de lead (tab adicional)

**Props:**
```typescript
{
  leadId: string
  manychatId?: string
}
```

**Características:**
- Lista de campos CRM ↔ Manychat
- Edición inline
- Indicador de sincronización por campo
- Botón "Sincronizar todo"
- Detección de cambios

**Ejemplo:**
```tsx
<ManychatCustomFields
  leadId="lead-123"
  manychatId="12345"
/>
```

---

#### `ManychatMetrics`
Dashboard de métricas y estadísticas.

**Ubicación:** /manychat/dashboard

**Props:**
```typescript
{
  className?: string
}
```

**Características:**
- 4 cards de métricas principales
- Gráficos de distribución
- Top flujos activos
- Top tags utilizados
- Comparativa bot vs agente
- Auto-refresh

**Ejemplo:**
```tsx
<ManychatMetrics className="my-6" />
```

---

#### `ManychatBroadcastPanel`
Panel para crear y enviar broadcasts.

**Ubicación:** /manychat/broadcasts

**Props:**
```typescript
{
  onBroadcastSent?: (broadcastId: number) => void
  className?: string
}
```

**Características:**
- Formulario completo
- Selector de destinatarios (tags/leads)
- Preview de mensaje
- Estimación de destinatarios
- Advertencias de compliance
- Estados de envío

**Ejemplo:**
```tsx
<ManychatBroadcastPanel
  onBroadcastSent={(id) => console.log('Broadcast enviado:', id)}
/>
```

---

### Componentes Visuales

#### `MessageTypeIndicator`
Badge diferenciador de mensajes bot/agente.

**Ubicación:** MessageBubble

**Props:**
```typescript
{
  isFromBot?: boolean
  flowName?: string
  messageType?: string
}
```

**Ejemplo:**
```tsx
<MessageTypeIndicator
  isFromBot={true}
  flowName="Bienvenida"
  messageType="text"
/>
```

---

#### `ManychatFlowIndicator`
Indicador de flujo activo.

**Ubicación:** ChatWindow header

**Props:**
```typescript
{
  flowName?: string
  flowNs?: string
  botActive?: boolean
  className?: string
}
```

**Ejemplo:**
```tsx
<ManychatFlowIndicator
  flowName="Calificación de Lead"
  botActive={true}
/>
```

---

#### `ManychatBadge`
Badge reutilizable con variantes.

**Props:**
```typescript
{
  variant?: 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}
```

**Ejemplo:**
```tsx
<ManychatBadge variant="success" size="md">
  Sincronizado
</ManychatBadge>
```

---

#### `TagPill`
Pill visual para tags con color coding.

**Props:**
```typescript
{
  tag: string
  onRemove?: () => void
  readonly?: boolean
  color?: string
  className?: string
}
```

**Ejemplo:**
```tsx
<TagPill
  tag="cliente-vip"
  onRemove={() => removeTag('cliente-vip')}
/>
```

---

#### `SyncStatusIndicator`
Indicador de estado de sincronización.

**Props:**
```typescript
{
  status: 'idle' | 'syncing' | 'success' | 'error'
  lastSyncAt?: Date
  error?: string
  onClick?: () => void
  className?: string
}
```

**Ejemplo:**
```tsx
<SyncStatusIndicator
  status="syncing"
  lastSyncAt={new Date()}
  onClick={() => showLogs()}
/>
```

---

#### `ManychatConnectionStatus`
Widget de estado de conexión.

**Props:**
```typescript
{
  className?: string
  showDetails?: boolean
}
```

**Modos:**
- **Compacto** (`showDetails={false}`): Badge clickeable con popover
- **Expandido** (`showDetails={true}`): Card completa con detalles

**Ejemplo:**
```tsx
{/* En header */}
<ManychatConnectionStatus />

{/* En settings */}
<ManychatConnectionStatus showDetails />
```

---

## 🪝 Hooks Personalizados

### `useManychatSync`

**Uso:**
```typescript
const {
  isSynced,
  isManychatConfigured,
  syncNow,
  syncStatus,
  lastSyncAt,
  logs,
  loading,
  error,
} = useManychatSync(leadId)
```

**Características:**
- Auto-detección de configuración
- Auto-fetch de estado al montar
- Sincronización manual con syncNow()
- Estados visuales
- Logging automático

---

### `useManychatTags`

**Uso:**
```typescript
const {
  availableTags,
  leadTags,
  addTag,
  removeTag,
  loading,
  error,
  refreshTags,
} = useManychatTags(leadId)
```

**Características:**
- Fetch automático de tags disponibles
- Tags del lead parseados
- Funciones async para agregar/remover
- Auto-refresh después de cambios
- Manejo de errores

---

### `useManychatMetrics`

**Uso:**
```typescript
const {
  totalSubscribers,
  syncedLeads,
  unsyncedLeads,
  botMessages,
  agentMessages,
  activeFlows,
  topTags,
  messagesPerDay,
  loading,
  error,
  refresh,
} = useManychatMetrics()
```

**Características:**
- Métricas calculadas automáticamente
- Auto-fetch al montar
- Función refresh manual
- Datos listos para visualización

---

## 🎨 Guía de Estilos

### Colores de Manychat
- **Primary**: Blue-600 (#2563eb)
- **Success**: Green-600 (#16a34a)
- **Warning**: Yellow-600 (#ca8a04)
- **Error**: Red-600 (#dc2626)
- **Bot**: Blue-50 background, Blue-900 text

### Iconos Usados
- Bot - Robot/automation
- Tag - Tags/labels
- RefreshCw - Sincronización
- CheckCircle2 - Éxito
- XCircle - Error
- Radio - Broadcast
- Workflow - Flujos
- Settings - Configuración

### Animaciones
- `animate-spin` - Sincronización en proceso
- `animate-pulse` - Bot activo
- `animate-bounce` - Bot escribiendo
- Transiciones suaves con `transition-all`

---

## 🔧 Integración con Componentes Existentes

### ChatWindow
```tsx
<ChatWindow
  conversation={conversation}
  onSendMessage={handleSend}
  onTakeControl={() => pauseBot()}
  onReleaseControl={() => resumeBot()}
/>
```

### ChatSidebar
Automáticamente muestra sección de Manychat si conversation.lead tiene datos de Manychat.

### MessageBubble
Automáticamente muestra indicador si message.isFromBot es true.

---

## 📝 Notas de Desarrollo

### TypeScript
- Todos los componentes son type-safe
- Interfaces en `src/types/manychat-ui.ts`
- Props validadas en tiempo de compilación

### Performance
- Hooks con memoization
- Fetch solo cuando necesario
- Lazy evaluation de tags
- Cache de tags disponibles

### Error Handling
- Try-catch en todas las async functions
- Estados de error visuales
- Toasts para feedback
- Fallbacks apropiados

### Testing
- Componentes testeable con props
- Mocks disponibles para desarrollo
- Estados visuales para cada caso

---

## 🚀 Próximas Mejoras (Opcionales)

- Drag & drop para ordenar tags
- Templates de mensajes guardados
- Quick replies predefinidos
- A/B testing de mensajes
- Analytics más detallados
- Export de reportes
- WebSockets para real-time

---

**Versión:** 3.0.0  
**Última Actualización:** 22 de Octubre, 2025  
**Estado:** ✅ Producción Ready

