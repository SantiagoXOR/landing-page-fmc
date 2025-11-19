/**
 * Script para generar favicons desde el SVG base
 * 
 * Requiere: sharp (npm install sharp)
 * 
 * Uso: node scripts/generate-favicons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const faviconSvg = path.join(publicDir, 'favicon.svg');

// Verificar que existe el SVG
if (!fs.existsSync(faviconSvg)) {
  console.error('❌ No se encontró favicon.svg en public/');
  process.exit(1);
}

console.log('🎨 Generando favicons desde favicon.svg...\n');

// Tamaños de favicon
const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 96, name: 'favicon-96x96.png' },
  { size: 192, name: 'favicon-192x192.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

async function generateFavicons() {
  try {
    // Leer el SVG
    const svgBuffer = fs.readFileSync(faviconSvg);

    // Generar cada tamaño
    for (const { size, name } of sizes) {
      const outputPath = path.join(publicDir, name);
      
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generado: ${name} (${size}x${size}px)`);
    }

    // Generar favicon.ico desde el de 32x32
    const favicon32Path = path.join(publicDir, 'favicon-32x32.png');
    const faviconIcoPath = path.join(publicDir, 'favicon.ico');
    
    // Nota: sharp no puede generar .ico directamente, pero podemos copiar el PNG
    // Para un .ico real, usar una herramienta como jimp o convertir manualmente
    console.log('\n⚠️  favicon.ico debe generarse manualmente desde favicon-32x32.png');
    console.log('   Usar: https://realfavicongenerator.net/ o ImageMagick\n');

    console.log('✨ Favicons generados exitosamente!');
  } catch (error) {
    console.error('❌ Error generando favicons:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('\n💡 Instala sharp primero: npm install sharp');
    }
    process.exit(1);
  }
}

generateFavicons();






