# Cómo Exportar Network Requests como HAR para Extraer IDs

Dado que el browser MCP solo captura un subset de las network requests activas, necesitamos exportar manualmente las requests desde las DevTools del navegador.

## 🎯 Objetivo

Extraer **TODOS** los subscriber IDs (597 contactos) desde las network requests de ManyChat incluyendo:
- Facebook subscriber IDs (psid)
- Instagram subscriber IDs
- WhatsApp subscriber IDs  
- IDs en URLs /ava/ 
- IDs en respuestas API

## 📋 Pasos Detallados

### 1. Preparar ManyChat

1. Abre tu navegador (Chrome/Edge recomendado)
2. Ve a https://app.manychat.com/fb3724482/subscribers
3. **NO cierres esta pestaña**

### 2. Abrir DevTools

1. Presiona **F12** o clic derecho > "Inspeccionar"
2. Ve a la pestaña **"Network"** (o "Red")
3. **IMPORTANTE**: Asegúrate que esté grabando (botón rojo activo)

### 3. Cargar TODOS los Contactos

1. En la página de ManyChat, haz **scroll hasta el final**
2. Presiona el botón **"Cargar Más"** repetidamente
3. Continúa hasta que se carguen **TODOS** los 597 contactos
4. Espera a que todas las imágenes se carguen completamente

💡 **Tip**: Presiona "End" varias veces para hacer scroll rápido

### 4. Exportar las Network Requests

1. En la pestaña Network de DevTools:
   - **Clic derecho** en cualquier request de la lista
   - Selecciona **"Save all as HAR with content"**
   - Guarda el archivo como: `manychat-network.har`
   - **Ubicación**: `C:\Users\marti\Desktop\DESARROLLOSW\PHRONENCIAL-BOT-CRM\phorencial-bot-crm\scripts\`

📸 **Visual**:
```
Network Tab
│
├─ [Request 1]
├─ [Request 2] ← Clic derecho aquí
├─ [Request 3]      │
│                   ├─ Copy
│                   ├─ Copy all as HAR
│                   ├─ Save all as HAR ← Click!
│                   └─ Save all as HAR with content ✓ ESTE!
└─ [Request N]
```

### 5. Procesar el Archivo HAR

```bash
cd scripts
node extract-ids-from-har.js manychat-network.har
```

El script:
- ✅ Extraerá IDs de URLs (psid, /ava/, etc.)
- ✅ Extraerá IDs de respuestas JSON
- ✅ Combinará con IDs existentes
- ✅ Guardará todo en `subscriber-ids-extracted.csv`

## 🔍 ¿Qué Extrae el Script?

### Patrón 1: PSID en Profile Pictures
```
https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=32640609408919422
                                                              ↑ Extrae este ID
```

### Patrón 2: /ava/ Paths
```
https://app.manychat.com/ava/3724482/25662046176732568/8bf1e905fa8ddb1194e779de32c9acca
                                      ↑ Extrae este ID
```

### Patrón 3: API Subscribers
```
https://app.manychat.com/fb3724482/subscribers/25541058665519003
                                                ↑ Extrae este ID
```

### Patrón 4: Response JSON
```json
{
  "data": [
    {"id": "25541058665519003"},
    {"subscriber_id": "32640609408919422"},
    {"pageuid": "24664267479915356"}
  ]
}
↑ Extrae todos los IDs del JSON
```

## 📊 Resultado Esperado

Al final deberías ver algo como:

```
============================================================
Resumen Final
============================================================
✓ Total de IDs únicos: 597
✓ IDs nuevos agregados: 458
✓ IDs existentes: 139

Primeros 20 IDs:
  1. 1766949726
  2. 1767089711
  ... y 577 más

============================================================
Próximos Pasos
============================================================
ℹ Para sincronizar estos IDs al CRM, ejecuta:
ℹ npm run manychat:sync-by-ids
```

## 🚨 Troubleshooting

### El archivo HAR es muy grande (>100MB)

Esto es normal si capturasteall the resources. El script solo procesará las requests relevantes.

### No se exportó la opción "Save as HAR"

Asegúrate de:
- Estar en la pestaña "Network" de DevTools
- Haber grabado requests (botón rojo activo)
- Tener al menos una request en la lista

### El script no encuentra IDs

Verifica que:
- El archivo HAR esté en la carpeta `scripts/`
- El nombre del archivo sea correcto
- Hayas cargado todos los contactos antes de exportar

### Encontró menos de 597 IDs

Probablemente no se cargaron todos los contactos:
1. Vuelve a ManyChat
2. Haz más scroll / "Cargar Más"
3. Espera a que carguen todas las imágenes
4. Exporta el HAR nuevamente

## 💡 Tips

1. **Limpia el Network tab antes de empezar**: Clic en el botón de "Clear" (🚫)
2. **Filtra solo XHR/Fetch**: Para ver mejor las requests API relevantes
3. **Desactiva el throttling**: Para que cargue más rápido
4. **Maximiza la ventana**: Para ver más contactos a la vez

## 📁 Archivos Generados

- `manychat-network.har` - Archivo HAR con todas las requests (lo creates tú)
- `subscriber-ids-extracted.csv` - CSV actualizado con todos los IDs (lo genera el script)

## 🔄 Alternativa: Extracción Manual por Lotes

Si no puedes exportar HAR, también puedes:

1. Filtrar en Network por "subscribers/search"
2. Abrir cada response
3. Copiar los IDs manualmente
4. Agregarlos al CSV

Pero el método HAR es **mucho más eficiente**.

## 🎓 Ventajas del Método HAR

| Ventaja | Descripción |
|---------|-------------|
| ✅ Completo | Captura TODAS las 521+ requests |
| ✅ Incluye respuestas | Extrae IDs del JSON de respuesta |
| ✅ Multi-fuente | Facebook + Instagram + WhatsApp |
| ✅ Automático | No requiere copiar manualmente |
| ✅ Repetible | Puedes exportar varias veces |

## 📞 Soporte

Si tienes problemas:
1. Verifica que el archivo HAR se haya creado correctamente
2. Comprueba el tamaño del archivo (debería ser varios MB)
3. Asegúrate de haber cargado todos los contactos primero
4. Revisa que el archivo esté en la carpeta `scripts/`

## 🔗 Documentación Relacionada

- [Browser MCP Extraction](./README-extract-ids-browser-mcp.md)
- [Sincronizar IDs al CRM](./README-sync-by-tags.md)
- [Importar desde CSV](./README-import-csv.md)


