# Favicons para Formosa FMC

## Archivos necesarios

Para completar la configuración de favicons, se necesitan los siguientes archivos PNG generados desde el logo de Formosa FMC:

### Tamaños requeridos:
- `favicon.ico` - 16x16px (formato ICO)
- `favicon-16x16.png` - 16x16px
- `favicon-32x32.png` - 32x32px
- `favicon-96x96.png` - 96x96px
- `favicon-192x192.png` - 192x192px
- `apple-touch-icon.png` - 180x180px

## Generación de favicons

### Opción 1: Usar herramienta online
1. Visitar https://realfavicongenerator.net/
2. Subir el archivo `public/landing/logofmcsimple.svg` o `public/favicon.svg`
3. Configurar opciones según necesidad
4. Descargar y colocar los archivos en `public/`

### Opción 2: Usar ImageMagick (línea de comandos)
```bash
# Convertir SVG a PNG en diferentes tamaños
convert public/favicon.svg -resize 16x16 public/favicon-16x16.png
convert public/favicon.svg -resize 32x32 public/favicon-32x32.png
convert public/favicon.svg -resize 96x96 public/favicon-96x96.png
convert public/favicon.svg -resize 192x192 public/favicon-192x192.png
convert public/favicon.svg -resize 180x180 public/apple-touch-icon.png

# Crear favicon.ico desde el PNG de 32x32
convert public/favicon-32x32.png public/favicon.ico
```

### Opción 3: Usar Node.js con sharp
```javascript
const sharp = require('sharp');
const fs = require('fs');

const sizes = [16, 32, 96, 192, 180];
const svgBuffer = fs.readFileSync('public/favicon.svg');

sizes.forEach(size => {
  sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(`public/favicon-${size}x${size}.png`);
});

// Apple touch icon
sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile('public/apple-touch-icon.png');
```

## Estado actual

- ✅ `favicon.svg` - Creado (compatible con navegadores modernos)
- ⏳ `favicon.ico` - Pendiente de generar
- ⏳ `favicon-*.png` - Pendientes de generar
- ⏳ `apple-touch-icon.png` - Pendiente de generar

El favicon SVG funcionará en navegadores modernos mientras se generan los archivos PNG.







