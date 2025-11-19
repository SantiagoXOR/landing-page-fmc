/**
 * Script para generar imágenes SEO (Open Graph y Twitter) desde SVG
 * 
 * Requiere: sharp (npm install sharp)
 * 
 * Uso: node scripts/generate-seo-images.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const seoDir = path.join(publicDir, 'landing', 'seo');

// Verificar que existe el directorio
if (!fs.existsSync(seoDir)) {
  fs.mkdirSync(seoDir, { recursive: true });
}

const images = [
  {
    input: path.join(seoDir, 'og-image.svg'),
    output: path.join(seoDir, 'og-image.png'),
    width: 1200,
    height: 630,
    name: 'Open Graph Image'
  },
  {
    input: path.join(seoDir, 'twitter-image.svg'),
    output: path.join(seoDir, 'twitter-image.png'),
    width: 1200,
    height: 600,
    name: 'Twitter Card Image'
  }
];

async function generateSEOImages() {
  console.log('🎨 Generando imágenes SEO...\n');

  for (const image of images) {
    try {
      if (!fs.existsSync(image.input)) {
        console.warn(`⚠️  No se encontró: ${image.input}`);
        continue;
      }

      await sharp(image.input)
        .resize(image.width, image.height, {
          fit: 'cover'
        })
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(image.output);

      console.log(`✅ Generado: ${image.name} (${image.width}x${image.height}px)`);
      console.log(`   Archivo: ${image.output}\n`);
    } catch (error) {
      console.error(`❌ Error generando ${image.name}:`, error.message);
    }
  }

  console.log('✨ Imágenes SEO generadas exitosamente!');
  console.log('\n💡 Nota: Los SVG son placeholders. Para mejores resultados,');
  console.log('   crea las imágenes finales con diseño profesional usando');
  console.log('   el logo real de Formosa FMC y los colores de marca.');
}

generateSEOImages();






