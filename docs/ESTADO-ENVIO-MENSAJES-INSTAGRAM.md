# 📱 Estado: Envío Directo de Mensajes Preaprobados a Instagram

## ✅ Implementación Completada

La funcionalidad de envío directo de mensajes preaprobados a Instagram desde el CRM está **completamente implementada** y lista para probar.

---

## 🔍 Ubicación del Código

### Archivo Principal
- **`src/lib/manychat-sync.ts`** (líneas 415-469)
  - Función: `syncPipelineToManychat()`
  - Sección: "8.6. Envío directo de mensaje para Instagram cuando se asigna tag credito-preaprobado"

### Servicios Utilizados
- **`src/server/services/manychat-service.ts`**
  - Método: `sendTextMessage()` (línea 1491)
  - Método: `sendMessage()` (línea 1325)
  - Método: `detectChannel()` (línea 445)

---

## 🎯 Cómo Funciona

### Flujo Completo

1. **Cambio de Estado en el CRM**
   - Un lead cambia a estado `PREAPROBADO` en el pipeline
   - Se dispara la sincronización con ManyChat

2. **Sincronización con ManyChat**
   - Se ejecuta `syncPipelineToManychat()` en `manychat-sync.ts`
   - Se asigna el tag `credito-preaprobado` al subscriber en ManyChat

3. **Detección de Canal**
   - Se obtiene el subscriber desde ManyChat usando `getManychatSubscriber()`
   - Se detecta el canal usando `ManychatService.detectChannel()`
   - La detección busca campos específicos de Instagram:
     - `instagram_id`
     - `ig_id`
     - `ig_username`

4. **Envío Condicional del Mensaje**
   - **Condición**: `detectedChannel === 'instagram' && newTag === 'credito-preaprobado'`
   - Si se cumple, se envía el mensaje automáticamente

5. **Envío del Mensaje**
   - Se convierte el `manychatId` a número si es string
   - Se valida que el ID sea válido (> 0)
   - Se llama a `ManychatService.sendTextMessage(manychatIdNumber, message)`
   - El mensaje se envía usando la API de ManyChat: `/fb/sending/sendContent`

---

## 📝 Mensaje Enviado

El mensaje que se envía automáticamente es:

```
¡Hola! 🎉 Tu crédito ya está preaprobado. ¡Visítanos en la concesionaria más cercana! 🚗✨
https://www.formosafmc.com.ar/concesionarias
```

---

## 🔧 Detalles Técnicos

### Detección de Canal Instagram

El método `detectChannel()` prioriza Instagram sobre otros canales:

```typescript
// Prioridad 1: Instagram
if (subscriber.instagram_id || subscriber.ig_id || subscriber.ig_username) {
  return 'instagram'
}
```

### Validaciones Implementadas

1. ✅ Validación de `manychatId` (debe ser número válido > 0)
2. ✅ Manejo de errores (no bloquea la sincronización si falla)
3. ✅ Logging detallado para debugging
4. ✅ Conversión de tipos (string a number)

### Manejo de Errores

- Si el envío falla, **NO bloquea** la sincronización del tag
- Los errores se registran en los logs con nivel `warn`
- Se continúa con el proceso normal de sincronización

---

## 🧪 Cómo Probar

### Prueba Manual

1. **Preparar un Lead de Instagram**
   - Asegúrate de tener un lead que:
     - Tenga `origen = 'instagram'` en la base de datos
     - Tenga un `manychatId` válido
     - El subscriber en ManyChat tenga campos de Instagram (`instagram_id`, `ig_id`, o `ig_username`)

2. **Cambiar Estado a PREAPROBADO**
   - En el CRM, cambiar el estado del lead a `PREAPROBADO`
   - Esto disparará automáticamente la sincronización

3. **Verificar el Envío**
   - Revisar los logs del servidor para ver:
     ```
     "Detectado Instagram + credito-preaprobado, enviando mensaje directo"
     "Mensaje de preaprobado enviado exitosamente a Instagram"
     ```
   - Verificar en ManyChat que el mensaje se envió
   - Verificar en Instagram que el usuario recibió el mensaje

### Verificación en Logs

Buscar en los logs del servidor:

```bash
# Logs de éxito
grep "Mensaje de preaprobado enviado exitosamente a Instagram" logs/*.log

# Logs de detección
grep "Detectado Instagram + credito-preaprobado" logs/*.log

# Logs de error (si hay problemas)
grep "No se pudo enviar mensaje a Instagram" logs/*.log
```

### Verificación en ManyChat

1. Ir a ManyChat → Subscribers
2. Buscar el subscriber por ID o teléfono
3. Verificar en el historial de mensajes que el mensaje se envió
4. Verificar que el tag `credito-preaprobado` está asignado

### Verificación en Instagram

1. Abrir Instagram Direct del usuario
2. Verificar que recibió el mensaje de preaprobación
3. Verificar que el enlace funciona correctamente

---

## ⚠️ Limitaciones y Consideraciones

### Ventana de 24 Horas de Instagram

**IMPORTANTE**: Instagram tiene una restricción de "ventana de 24 horas":
- Solo puedes enviar mensajes libres dentro de las 24 horas posteriores al último mensaje del usuario
- Fuera de esa ventana, necesitas usar templates aprobados por Meta

**Solución Implementada**: 
- El mensaje se envía directamente desde el CRM usando la API de ManyChat
- ManyChat maneja automáticamente si el mensaje está dentro o fuera de la ventana
- Si está fuera de la ventana, ManyChat puede usar un template aprobado (si está configurado)

### Requisitos para que Funcione

1. ✅ El lead debe tener un `manychatId` válido
2. ✅ El subscriber en ManyChat debe tener campos de Instagram (`instagram_id`, `ig_id`, o `ig_username`)
3. ✅ ManyChat debe estar conectado a una cuenta de Instagram Business
4. ✅ La API Key de ManyChat debe estar configurada correctamente
5. ✅ El lead debe cambiar a estado `PREAPROBADO` (lo que asigna el tag `credito-preaprobado`)

---

## 📊 Logging y Monitoreo

### Logs Generados

La implementación genera logs detallados:

1. **Detección del caso**:
   ```json
   {
     "level": "info",
     "message": "Detectado Instagram + credito-preaprobado, enviando mensaje directo",
     "leadId": "...",
     "manychatId": 123456,
     "channel": "instagram",
     "tag": "credito-preaprobado"
   }
   ```

2. **Éxito en el envío**:
   ```json
   {
     "level": "info",
     "message": "Mensaje de preaprobado enviado exitosamente a Instagram",
     "leadId": "...",
     "manychatId": 123456,
     "channel": "instagram",
     "messageLength": 120
   }
   ```

3. **Error en el envío**:
   ```json
   {
     "level": "warn",
     "message": "No se pudo enviar mensaje a Instagram (ManyChat retornó false)",
     "leadId": "...",
     "manychatId": 123456,
     "channel": "instagram"
   }
   ```

---

## 🔄 Flujo Completo Visual

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario cambia lead a estado PREAPROBADO en el CRM       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Se dispara syncPipelineToManychat()                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Se obtiene subscriber desde ManyChat                     │
│    - getManychatSubscriber(manychatId)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Se detecta el canal                                      │
│    - ManychatService.detectChannel(subscriber)              │
│    - Busca: instagram_id, ig_id, ig_username                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ¿Es Instagram Y tag es credito-preaprobado?              │
│    if (detectedChannel === 'instagram' &&                   │
│        newTag === 'credito-preaprobado')                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
          SÍ                     NO
            │                     │
            ▼                     ▼
┌───────────────────┐   ┌──────────────────────────────┐
│ 6. Enviar mensaje │   │ Continuar con sincronización │
│    directo        │   │ normal (solo tags)           │
│                   │   └──────────────────────────────┘
│ - Validar ID      │
│ - Enviar mensaje  │
│ - Log resultado   │
└───────────────────┘
```

---

## 🐛 Troubleshooting

### El mensaje no se envía

**Posibles causas:**

1. **manychatId inválido**
   - Verificar que el lead tenga un `manychatId` válido
   - Verificar que sea un número > 0

2. **Canal no detectado como Instagram**
   - Verificar que el subscriber en ManyChat tenga campos de Instagram
   - Revisar los logs para ver qué canal se detectó

3. **API Key de ManyChat incorrecta**
   - Verificar la variable de entorno `MANYCHAT_API_KEY`
   - Verificar que la API Key tenga permisos de envío

4. **Subscriber no encontrado en ManyChat**
   - Verificar que el `manychatId` existe en ManyChat
   - Verificar que el subscriber esté activo

5. **Fuera de ventana de 24 horas**
   - Si el usuario no ha enviado un mensaje en las últimas 24 horas
   - ManyChat puede requerir un template aprobado

### Verificar Detección de Canal

Para verificar qué canal se detectó, revisar los logs:

```bash
grep "Canal detectado" logs/*.log
```

O agregar un log temporal en el código:

```typescript
logger.info('Canal detectado para lead', {
  leadId,
  manychatId,
  detectedChannel,
  subscriberHasInstagramId: !!subscriber.instagram_id,
  subscriberHasIgId: !!subscriber.ig_id,
  subscriberHasIgUsername: !!subscriber.ig_username
})
```

---

## 📚 Referencias

- **Documentación ManyChat API**: `/docs/ENVIAR-MENSAJES-MANYCHAT-DESDE-CRM.md`
- **Servicio ManyChat**: `src/server/services/manychat-service.ts`
- **Sincronización**: `src/lib/manychat-sync.ts`

---

## ✅ Checklist de Prueba

- [ ] Tener un lead de Instagram con `manychatId` válido
- [ ] Verificar que el subscriber en ManyChat tiene campos de Instagram
- [ ] Cambiar el lead a estado `PREAPROBADO` en el CRM
- [ ] Verificar en logs que se detectó Instagram
- [ ] Verificar en logs que se envió el mensaje
- [ ] Verificar en ManyChat que el mensaje aparece en el historial
- [ ] Verificar en Instagram que el usuario recibió el mensaje
- [ ] Verificar que el enlace funciona correctamente

---

## 🎉 Estado Final

**✅ IMPLEMENTACIÓN COMPLETA Y LISTA PARA PROBAR**

La funcionalidad está completamente implementada con:
- ✅ Detección automática de canal Instagram
- ✅ Envío condicional cuando se asigna tag `credito-preaprobado`
- ✅ Manejo de errores robusto
- ✅ Logging detallado para debugging
- ✅ Validaciones de seguridad

**Siguiente paso**: Realizar pruebas con leads reales de Instagram para validar el funcionamiento end-to-end.
