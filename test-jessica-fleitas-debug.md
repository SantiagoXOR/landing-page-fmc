# Test de Debug para Jessica Fleitas

## Endpoint de Debug

Para probar el endpoint de debug con Jessica Fleitas, usa esta URL:

```
GET /api/debug/manychat-tag?subscriberId=1062181897&tagName=credito-preaprobado
```

## Información del Contacto

- **ManyChat ID**: 1062181897
- **Nombre**: Fleitas Yessica
- **WhatsApp**: 5493704587386
- **Tag esperado**: credito-preaprobado

## Posibles Causas de que no se Dispare la Automatización

1. **Automatizaciones Pausadas**: En el perfil de ManyChat aparece el botón "Pausar Automatizaciones", lo que sugiere que las automatizaciones podrían estar pausadas para este contacto.

2. **El Tag ya está Asignado**: Si el tag ya estaba asignado antes, ManyChat no dispara el flujo porque el evento "Tag Added" solo se dispara cuando se añade un tag nuevo.

3. **El Flujo no está Activo**: El flujo "CREDITO PREAPROBADO | Whatsapp" podría no estar activo en ManyChat.

4. **Condiciones del Flujo**: El flujo podría tener condiciones adicionales que no se cumplen para este contacto.

## Cómo Probar

1. Abre el navegador y ve a: `https://www.formosafmc.com.ar/api/debug/manychat-tag?subscriberId=1062181897&tagName=credito-preaprobado`
2. Asegúrate de estar autenticado en el sistema
3. Revisa la respuesta JSON para ver:
   - Si el subscriber existe
   - Si el tag existe
   - Si el tag ya está asignado
   - Si se pudo agregar el tag
   - Información adicional del subscriber

## Solución Temporal

Si ManyChat no dispara el flujo automáticamente, podemos implementar el envío directo del mensaje después de agregar el tag.

