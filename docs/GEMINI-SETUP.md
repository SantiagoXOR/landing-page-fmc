# Configuración de Google Gemini para Asistentes

## Resumen

Se ha implementado un sistema completo de gestión de asistentes virtuales con integración de Google Gemini API. Los usuarios pueden crear, editar y probar asistentes mediante un playroom interactivo.

## Variables de Entorno

### Producción (Vercel)
Ya configurada: `GOOGLE_GEMINI_API_KEY`

### Desarrollo Local
Agregar al archivo `.env.local`:
```env
GOOGLE_GEMINI_API_KEY=tu_api_key_aqui
```

## Migración de Base de Datos

Ejecutar la migración para crear la tabla `assistants`:

```bash
npx prisma db push
```

O si prefieres crear una migración con nombre:
```bash
npx prisma migrate dev --name add_assistants_table
```

## Estructura Implementada

### Modelo de Base de Datos
- **Tabla**: `Assistant`
- **Campos**: id, nombre, descripcion, instrucciones, isDefault, isActive, createdBy, createdAt, updatedAt

### API Endpoints
- `GET /api/assistants` - Listar todos los asistentes
- `POST /api/assistants` - Crear nuevo asistente
- `GET /api/assistants/[id]` - Obtener asistente por ID
- `PUT /api/assistants/[id]` - Actualizar asistente
- `DELETE /api/assistants/[id]` - Eliminar asistente
- `POST /api/assistants/[id]/chat` - Enviar mensaje al asistente (Gemini)

### Componentes
- `AssistantPlayroom` - Componente de chat interactivo para probar asistentes
- Página `/asistentes` - Gestión completa de asistentes con CRUD

## Uso

1. **Crear un asistente**:
   - Ir a `/asistentes`
   - Clic en "Crear nuevo"
   - Completar nombre, descripción e instrucciones
   - Las instrucciones se usan como system prompt para Gemini

2. **Probar un asistente**:
   - En la tabla de asistentes, clic en el menú de acciones (⋮)
   - Seleccionar "Probar"
   - Se abre el playroom donde puedes chatear con el asistente

3. **Editar/Eliminar**:
   - Usar el menú de acciones en cada fila de la tabla

## Características

- ✅ Creación y edición de asistentes
- ✅ Instrucciones personalizadas como system prompt
- ✅ Playroom interactivo con Gemini API
- ✅ Historial de conversación en memoria (temporal)
- ✅ Marcado de asistente predeterminado
- ✅ Activación/desactivación de asistentes
- ✅ Autenticación y permisos requeridos

## Notas Técnicas

- El servicio Gemini usa el modelo `gemini-pro` por defecto
- Las conversaciones del playroom son temporales (no se guardan)
- Los asistentes se guardan en la base de datos
- Se requiere autenticación para todas las operaciones
- Los permisos se verifican mediante RBAC

