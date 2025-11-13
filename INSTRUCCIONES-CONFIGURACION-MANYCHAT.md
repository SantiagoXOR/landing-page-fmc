# ✅ Instrucciones de Configuración - Manychat API

## Estado Actual

### ✅ Completado
1. **API Key obtenida** de Manychat: `3724482:1bf0d7525e7c87d854d087f44afae137`
2. **Schema de Prisma** ya incluye todos los campos necesarios:
   - `Lead.manychatId`
   - `Lead.tags`
   - `Lead.customFields`
   - Tabla `ManychatSync`
   - `Conversation.manychatData`

### 🔧 Pendiente de Tu Acción

## Paso 1: Configurar Variables de Entorno

Abre tu archivo `.env.local` y agrega estas líneas (copia del archivo `MANYCHAT-ENV-VARIABLES.txt`):

```env
# Manychat Configuration
MANYCHAT_API_KEY=3724482:1bf0d7525e7c87d854d087f44afae137
MANYCHAT_BASE_URL=https://api.manychat.com
MANYCHAT_WEBHOOK_SECRET=manychat-webhook-secret-temporal-2024-formosa-moto-credito

# WhatsApp (Información de referencia)
WHATSAPP_PHONE_NUMBER=5493704069592
```

## Paso 2: Verificar Credenciales de Supabase

Antes de ejecutar la migración, asegúrate de que las credenciales de Supabase en `.env.local` sean correctas:

```env
DATABASE_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
```

**Nota:** El error "Tenant or user not found" indica que las credenciales de Supabase no son válidas.

## Paso 3: Ejecutar Migración de Base de Datos

Una vez configuradas correctamente ambas (Manychat y Supabase):

```bash
npm run db:push
```

Esto creará/actualizará las tablas necesarias para Manychat.

## Paso 4: Probar la Integración

```bash
npm run manychat:test
```

## Paso 5: Configurar Webhook en Manychat (Manual)

1. Exponer tu servidor local:
   ```bash
   ngrok http 3000
   ```

2. En Manychat, ve a **Settings → API → Webhooks**

3. Click **"Add Webhook"**

4. Configurar:
   - **Webhook URL:** `https://tu-url-ngrok.ngrok.io/api/whatsapp/webhook`
   - **Verify Token:** `manychat-webhook-secret-temporal-2024-formosa-moto-credito`

5. Seleccionar eventos:
   - ✅ `new_subscriber`
   - ✅ `message_received`
   - ✅ `tag_added`
   - ✅ `tag_removed`
   - ✅ `custom_field_changed`

6. Click **"Verify"** y luego **"Save"**

## Paso 6: Crear Custom Fields en Manychat (Manual)

En Manychat: **Settings → Custom Fields → + New Field**

| Nombre | Tipo | Descripción |
|--------|------|-------------|
| `dni` | Text | Documento de identidad |
| `ingresos` | Number | Ingresos mensuales |
| `zona` | Text | Zona geográfica |
| `producto` | Text | Producto de interés |
| `monto` | Number | Monto solicitado |
| `origen` | Text | Canal de origen |
| `estado` | Text | Estado del lead |
| `agencia` | Text | Agencia asignada |

## Paso 7: Crear Tags en Manychat (Manual)

En Manychat: **Settings → Tags → + New Tag**

**Tags de Estado:**
- `lead-nuevo`
- `lead-calificado`
- `lead-contactado`
- `lead-interesado`
- `lead-no-interesado`

**Tags de Origen:**
- `origen-facebook`
- `origen-instagram`
- `origen-whatsapp`
- `origen-web`

**Tags de Producto:**
- `producto-prestamo-personal`
- `producto-prestamo-vehicular`

**Tags de Engagement:**
- `bot-activo`
- `agente-requerido`
- `conversacion-cerrada`

## Paso 8: Crear Flujo Básico (Manual)

En Manychat: **Automation → Flows → + New Flow**

**Nombre:** "Bienvenida CRM"  
**Trigger:** New Subscriber

**Flujo:**
1. Mensaje: "¡Hola! 👋 Bienvenido a Formosa Moto Crédito"
2. Pregunta: "¿En qué podemos ayudarte?"
   - Botón: "Solicitar Préstamo" → Tag: "interesado-prestamo"
   - Botón: "Solo Información" → Tag: "solo-info"
   - Botón: "Hablar con Agente" → Tag: "agente-requerido"
3. Action: Add Tag "lead-nuevo"
4. Webhook: Notificar al CRM

## Paso 9: Iniciar el Servidor

```bash
npm run dev
```

Accede a: `http://localhost:3000`

## Paso 10: Verificar en el CRM

1. Ve a **Settings → Manychat**
2. Verifica que el estado sea "Conectado" (verde)
3. Sincroniza un lead de prueba
4. Envía un mensaje desde WhatsApp al número: `+5493704069592`
5. Verifica que aparezca en el CRM

## 📚 Documentación de Referencia

- [MANYCHAT-QUICKSTART.md](MANYCHAT-QUICKSTART.md) - Guía rápida
- [docs/MANYCHAT-SETUP.md](docs/MANYCHAT-SETUP.md) - Setup completo
- [docs/MANYCHAT-INTEGRATION.md](docs/MANYCHAT-INTEGRATION.md) - Documentación técnica
- [MANYCHAT-CHECKLIST.md](MANYCHAT-CHECKLIST.md) - Checklist de verificación

## ⚠️ Notas Importantes

### Problema de Línea de Crédito

Según las imágenes que compartiste, tu cuenta de Manychat tiene:
- ⚠️ **Línea de crédito no compartida**

Esto es **temporal** según Manychat. Mientras tanto:
- ✅ Puedes usar la API para crear subscribers
- ✅ Puedes responder mensajes dentro de la ventana de 24 horas
- ❌ No podrás enviar plantillas de mensaje aprobadas
- ❌ No podrás enviar broadcasts

**Acción:** Si el problema dura más de 24 horas, contacta al soporte de Manychat.

### Verificación de Empresa

Tu cuenta muestra "Envío pendiente" para verificación de empresa. Esto no afecta el uso básico de la API pero puede limitar algunas funcionalidades avanzadas.

## 🎯 Próximos Pasos Después de Configurar

Una vez completados todos los pasos:

1. **Probar sincronización de leads**
2. **Enviar mensajes de prueba**
3. **Verificar webhooks funcionan**
4. **Crear flujos más complejos en Manychat**
5. **Monitorear métricas en el dashboard del CRM**

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs del servidor
2. Verifica las variables de entorno
3. Consulta la sección de Troubleshooting en [docs/MANYCHAT-SETUP.md](docs/MANYCHAT-SETUP.md)
4. Verifica los logs de webhook en Manychat: Settings → API → Webhooks → View Logs

