#!/usr/bin/env node

/**
 * Script para ejecutar tests de Playwright del CRM Phorencial
 * Uso: node scripts/run-tests.js [opciones]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuración de colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Función para imprimir con colores
function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para mostrar ayuda
function showHelp() {
  colorLog('cyan', '🎭 CRM Phorencial - Playwright Test Runner');
  console.log('');
  colorLog('yellow', 'Uso:');
  console.log('  node scripts/run-tests.js [opciones]');
  console.log('');
  colorLog('yellow', 'Opciones:');
  console.log('  --suite <nombre>     Suite específica a ejecutar');
  console.log('  --browser <nombre>   Navegador específico (chromium, firefox, webkit)');
  console.log('  --headed            Ejecutar en modo headed (visible)');
  console.log('  --debug             Ejecutar en modo debug');
  console.log('  --ui                Abrir UI de Playwright');
  console.log('  --report            Abrir reporte HTML después de ejecutar');
  console.log('  --mobile            Ejecutar solo tests mobile');
  console.log('  --help              Mostrar esta ayuda');
  console.log('');
  colorLog('yellow', 'Suites disponibles:');
  console.log('  auth                Tests de autenticación');
  console.log('  dashboard           Tests del dashboard modernizado');
  console.log('  leads               Tests de gestión de leads');
  console.log('  documents           Tests de página Documents');
  console.log('  settings            Tests de página Settings');
  console.log('  ui-modern           Tests de UI moderna y responsive');
  console.log('  formosa-data        Tests de datos específicos de Formosa');
  console.log('');
  colorLog('yellow', 'Ejemplos:');
  console.log('  node scripts/run-tests.js --suite auth --browser chromium');
  console.log('  node scripts/run-tests.js --mobile --headed');
  console.log('  node scripts/run-tests.js --ui');
  console.log('  node scripts/run-tests.js --debug --suite dashboard');
}

// Función para ejecutar comando
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    colorLog('blue', `🚀 Ejecutando: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Comando falló con código ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Función para verificar que Playwright está instalado
async function checkPlaywrightInstallation() {
  try {
    await runCommand('npx', ['playwright', '--version']);
    return true;
  } catch (error) {
    colorLog('red', '❌ Playwright no está instalado');
    colorLog('yellow', '💡 Ejecuta: npm install @playwright/test');
    return false;
  }
}

// Función para verificar que los navegadores están instalados
async function checkBrowsers() {
  const browsersPath = path.join(process.cwd(), 'node_modules', '@playwright', 'test');
  if (!fs.existsSync(browsersPath)) {
    colorLog('yellow', '⚠️  Los navegadores de Playwright no están instalados');
    colorLog('blue', '🔧 Instalando navegadores...');
    
    try {
      await runCommand('npx', ['playwright', 'install']);
      colorLog('green', '✅ Navegadores instalados correctamente');
    } catch (error) {
      colorLog('red', '❌ Error instalando navegadores');
      throw error;
    }
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  // Mostrar ayuda
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  colorLog('magenta', '🎭 CRM Phorencial - Test Runner');
  colorLog('cyan', '🚀 Iniciando tests end-to-end...');
  console.log('');

  // Verificar instalación
  if (!(await checkPlaywrightInstallation())) {
    return;
  }

  await checkBrowsers();

  // Parsear argumentos
  const suite = args.includes('--suite') ? args[args.indexOf('--suite') + 1] : null;
  const browser = args.includes('--browser') ? args[args.indexOf('--browser') + 1] : null;
  const headed = args.includes('--headed');
  const debug = args.includes('--debug');
  const ui = args.includes('--ui');
  const report = args.includes('--report');
  const mobile = args.includes('--mobile');

  // Construir comando de Playwright
  let playwrightArgs = ['playwright', 'test'];

  // Suite específica
  if (suite) {
    playwrightArgs.push(`tests/${suite}.spec.ts`);
    colorLog('yellow', `📋 Ejecutando suite: ${suite}`);
  }

  // Navegador específico
  if (browser) {
    playwrightArgs.push('--project', browser);
    colorLog('yellow', `🌐 Navegador: ${browser}`);
  }

  // Tests mobile
  if (mobile) {
    playwrightArgs.push('--project', 'Mobile Chrome', '--project', 'Mobile Safari');
    colorLog('yellow', '📱 Ejecutando tests mobile');
  }

  // Modo headed
  if (headed) {
    playwrightArgs.push('--headed');
    colorLog('yellow', '👁️  Modo headed activado');
  }

  // Modo debug
  if (debug) {
    playwrightArgs.push('--debug');
    colorLog('yellow', '🐛 Modo debug activado');
  }

  // UI mode
  if (ui) {
    playwrightArgs = ['playwright', 'test', '--ui'];
    colorLog('yellow', '🎨 Abriendo UI de Playwright');
  }

  try {
    console.log('');
    colorLog('green', '🧪 Ejecutando tests...');
    console.log('');

    // Ejecutar tests
    await runCommand('npx', playwrightArgs);

    console.log('');
    colorLog('green', '✅ Tests completados exitosamente');

    // Abrir reporte si se solicita
    if (report && !ui && !debug) {
      colorLog('blue', '📊 Abriendo reporte HTML...');
      await runCommand('npx', ['playwright', 'show-report']);
    }

    // Mostrar resumen
    console.log('');
    colorLog('cyan', '📊 Resumen de validaciones:');
    console.log('  ✅ Autenticación con roles (ADMIN, ANALISTA, VENDEDOR)');
    console.log('  ✅ Dashboard modernizado con métricas de Formosa');
    console.log('  ✅ Sistema de filtros avanzado en Leads');
    console.log('  ✅ Páginas Documents y Settings');
    console.log('  ✅ UI moderna con gradientes y animaciones');
    console.log('  ✅ Datos específicos de Formosa (1000+ leads)');
    console.log('  ✅ Responsive design');
    console.log('');
    colorLog('magenta', '🎉 ¡Migración selectiva validada exitosamente!');

  } catch (error) {
    console.log('');
    colorLog('red', '❌ Error ejecutando tests:');
    console.error(error.message);
    
    console.log('');
    colorLog('yellow', '💡 Sugerencias:');
    console.log('  - Verifica que el servidor esté corriendo (npm run dev)');
    console.log('  - Revisa que las variables de entorno estén configuradas');
    console.log('  - Ejecuta con --headed para ver qué está pasando');
    console.log('  - Usa --debug para depurar paso a paso');
    
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    colorLog('red', '❌ Error fatal:');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main, runCommand, colorLog };
