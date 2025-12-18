# 🧪 Guía de Prueba: Envío de Mensajes Preaprobados a Instagram

## 📋 Resumen

Esta guía te ayudará a probar la funcionalidad de envío automático de mensajes preaprobados a Instagram desde el CRM.

---

## 🎯 Requisitos Previos

Antes de probar, asegúrate de tener:

1. ✅ Un lead de Instagram con `manychatId` válido
2. ✅ El subscriber en ManyChat debe tener campos de Instagram (`instagram_id`, `ig_id`, o `ig_username`)
3. ✅ ManyChat conectado a una cuenta de Instagram Business
4. ✅ API Key de ManyChat configurada correctamente
5. ✅ El servidor del CRM en ejecución

---

## 🔍 Paso 1: Verificar Leads Disponibles

### Opción A: Usar el Script de Verificación (Recomendado)

Ejecuta el script que busca leads de Instagram listos para probar:

```bash
node scripts/test-envio-instagram-preaprobado.js
```

Este script:
- Busca leads de Instagram con `manychatId` válido
- Verifica que el subscriber en ManyChat tenga campos de Instagram
- Muestra qué leads están listos para probar

**Ejemplo de salida:**
```
🔍 Buscando leads de Instagram...

✅ Encontrados 5 leads de Instagram con manychatId

📋 Verificando lead: Juan Pérez
   ID: clh1234567890
   Estado: EN_REVISION
   ManyChat ID: 123456789
   📱 Canal detectado: instagram
   ✅ Campos de Instagram: Sí
      - instagram_id: 17841405309211844
   ⚠️  Estado: EN_REVISION (necesita cambiar a PREAPROBADO)

✅ Leads válidos para prueba:
1. Juan Pérez
   - Lead ID: clh1234567890
   - Estado actual: EN_REVISION
   - ManyChat ID: 123456789
   - Canal: instagram
   - ✅ Listo para probar (cambiar a PREAPROBADO en el CRM)
```

### Opción B: Verificación Manual en la Base de Datos

Si prefieres verificar manualmente:

1. Abre tu cliente de base de datos (Supabase, pgAdmin, etc.)
2. Ejecuta esta consulta:

```sql
SELECT 
  id,
  nombre,
  telefono,
  email,
  origen,
  estado,
  "manychatId"
FROM leads
WHERE origen = 'instagram'
  AND "manychatId" IS NOT NULL
  AND estado != 'PREAPROBADO'
LIMIT 10;
```

3. Anota el `id` y `manychatId` de un lead que quieras probar

---

## 🧪 Paso 2: Probar el Envío Automático

### Método 1: Desde el CRM (Recomendado)

1. **Abre el CRM en tu navegador**
   - Ve a la sección de **Leads** o **Pipeline**

2. **Busca el lead que verificaste**
   - Puedes buscar por nombre, teléfono o ID

3. **Cambia el estado a PREAPROBADO**
   - En la página del lead, cambia el estado a `PREAPROBADO`
   - O arrastra el lead a la etapa "Preaprobado" en el Pipeline

4. **El mensaje se enviará automáticamente**
   - El sistema detectará que es Instagram
   - Asignará el tag `credito-preaprobado`
   - Enviará el mensaje directamente

### Método 2: Usando el Script con Envío Manual

Si quieres probar el envío directamente sin cambiar el estado:

```bash
node scripts/test-envio-instagram-preaprobado.js --send-test
```

⚠️ **Nota**: Esto enviará un mensaje de prueba directamente, pero no cambiará el estado del lead.

---

## ✅ Paso 3: Verificar el Envío

### 3.1 Verificar en los Logs del Servidor

Busca en los logs del servidor estos mensajes:

**Log de detección:**
```
"Detectado Instagram + credito-preaprobado, enviando mensaje directo"
```

**Log de éxito:**
```
"Mensaje de preaprobado enviado exitosamente a Instagram"
```

**Comandos útiles:**
```bash
# Si usas Vercel
vercel logs --follow

# Si usas Docker
docker logs <container-name> | grep "Instagram"

# Si tienes logs locales
tail -f logs/app.log | grep "Instagram"
```

### 3.2 Verificar en ManyChat

1. Ve a ManyChat → **Subscribers**
2. Busca el subscriber por ID o teléfono
3. Verifica en el **historial de mensajes** que el mensaje se envió
4. Verifica que el tag `credito-preaprobado` está asignado

**Qué buscar:**
- Mensaje: "¡Hola! 🎉 Tu crédito ya está preaprobado..."
- Timestamp: Debe ser reciente (justo después de cambiar el estado)
- Canal: Instagram

### 3.3 Verificar en Instagram

1. Abre Instagram Direct del usuario
2. Verifica que recibió el mensaje de preaprobación
3. Verifica que el enlace funciona: `https://www.formosafmc.com.ar/concesionarias`

---

## 🐛 Troubleshooting

### El mensaje no se envía

#### Problema 1: manychatId inválido

**Síntomas:**
- Log: `"manychatId inválido para enviar mensaje a Instagram"`
- El lead no tiene `manychatId` o es inválido

**Solución:**
1. Verifica que el lead tenga un `manychatId` válido
2. Sincroniza el lead con ManyChat si no tiene ID

#### Problema 2: Canal no detectado como Instagram

**Síntomas:**
- El mensaje no se envía
- El log no muestra "Detectado Instagram + credito-preaprobado"

**Solución:**
1. Verifica que el subscriber en ManyChat tenga campos de Instagram:
   - `instagram_id`
   - `ig_id`
   - `ig_username`
2. Usa el script de verificación para ver qué canal se detecta:
   ```bash
   node scripts/test-envio-instagram-preaprobado.js
   ```

#### Problema 3: Fuera de ventana de 24 horas

**Síntomas:**
- ManyChat retorna error o no envía el mensaje
- El usuario no ha enviado un mensaje en las últimas 24 horas

**Solución:**
- Instagram solo permite mensajes libres dentro de las 24 horas posteriores al último mensaje
- Si está fuera de la ventana, necesitas un template aprobado por Meta
- Verifica en ManyChat si hay templates configurados para este caso

#### Problema 4: API Key incorrecta

**Síntomas:**
- Error 401 o 403 en los logs
- "Unauthorized" o "Forbidden"

**Solución:**
1. Verifica la variable de entorno `MANYCHAT_API_KEY`
2. Asegúrate de que la API Key tenga permisos de envío
3. Verifica que la API Key no haya expirado

### El mensaje se envía pero no llega a Instagram

1. **Verifica la conexión de ManyChat con Instagram**
   - Ve a ManyChat → Settings → Integrations
   - Verifica que Instagram Business esté conectado

2. **Verifica que el subscriber esté activo**
   - En ManyChat, verifica que el subscriber no esté bloqueado o inactivo

3. **Verifica la ventana de 24 horas**
   - Si el usuario no ha enviado un mensaje recientemente, puede estar fuera de la ventana

---

## 📊 Checklist de Prueba Completa

Usa este checklist para asegurarte de que todo funciona:

- [ ] **Preparación**
  - [ ] Tener un lead de Instagram con `manychatId` válido
  - [ ] Verificar que el subscriber en ManyChat tiene campos de Instagram
  - [ ] Verificar que ManyChat está conectado a Instagram Business
  - [ ] Verificar que la API Key de ManyChat está configurada

- [ ] **Prueba**
  - [ ] Cambiar el lead a estado `PREAPROBADO` en el CRM
  - [ ] Verificar en logs que se detectó Instagram
  - [ ] Verificar en logs que se envió el mensaje

- [ ] **Verificación**
  - [ ] Verificar en ManyChat que el mensaje aparece en el historial
  - [ ] Verificar en ManyChat que el tag `credito-preaprobado` está asignado
  - [ ] Verificar en Instagram que el usuario recibió el mensaje
  - [ ] Verificar que el enlace funciona correctamente

---

## 🎯 Próximos Pasos

Una vez que hayas probado exitosamente:

1. **Monitorear en producción**
   - Revisa los logs regularmente para verificar que los mensajes se envían
   - Monitorea la tasa de éxito de envíos

2. **Optimizar el mensaje**
   - Si es necesario, ajusta el mensaje en `src/lib/manychat-sync.ts` (línea 428)
   - Considera personalizar el mensaje según el lead

3. **Configurar templates para fuera de ventana**
   - Si muchos usuarios están fuera de la ventana de 24 horas
   - Configura templates aprobados en Meta para enviar mensajes fuera de ventana

---

## 📚 Referencias

- **Documentación del estado**: `/docs/ESTADO-ENVIO-MENSAJES-INSTAGRAM.md`
- **Código de implementación**: `src/lib/manychat-sync.ts` (líneas 415-469)
- **Servicio ManyChat**: `src/server/services/manychat-service.ts`
- **Documentación ManyChat API**: `/docs/ENVIAR-MENSAJES-MANYCHAT-DESDE-CRM.md`

---

## 💡 Tips

1. **Prueba con un lead de prueba primero**
   - Usa un lead de prueba antes de probar con leads reales
   - Esto te permite verificar que todo funciona sin afectar clientes reales

2. **Monitorea los logs en tiempo real**
   - Usa `tail -f` o el dashboard de logs para ver los mensajes en tiempo real
   - Esto te ayuda a detectar problemas inmediatamente

3. **Verifica la ventana de 24 horas**
   - Si el usuario no ha enviado un mensaje recientemente, el mensaje puede no enviarse
   - Considera enviar un mensaje de prueba desde Instagram primero para abrir la ventana

---

¡Buena suerte con las pruebas! 🚀
