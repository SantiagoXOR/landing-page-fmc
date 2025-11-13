#!/usr/bin/env node

/**
 * Script para limpiar procesos y cache antes de iniciar el desarrollo
 * Uso: npm run dev:clean
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🧹 Limpiando entorno de desarrollo...')

// 1. Matar procesos Node.js que puedan estar usando el puerto 3000
console.log('1️⃣ Verificando procesos en puerto 3000...')
try {
  if (process.platform === 'win32') {
    // Windows
    const netstatOutput = execSync('netstat -ano | findstr :3000', { encoding: 'utf8' })
    if (netstatOutput) {
      console.log('   🔍 Procesos encontrados en puerto 3000')
      const lines = netstatOutput.split('\n').filter(line => line.includes('LISTENING'))
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/)
        const pid = parts[parts.length - 1]
        if (pid && !isNaN(pid)) {
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
            console.log(`   ✅ Proceso ${pid} terminado`)
          } catch (error) {
            console.log(`   ⚠️ No se pudo terminar proceso ${pid}`)
          }
        }
      })
    } else {
      console.log('   ✅ Puerto 3000 libre')
    }
  } else {
    // Unix/Linux/macOS
    try {
      const lsofOutput = execSync('lsof -ti:3000', { encoding: 'utf8' })
      if (lsofOutput) {
        const pids = lsofOutput.trim().split('\n')
        pids.forEach(pid => {
          if (pid) {
            try {
              execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
              console.log(`   ✅ Proceso ${pid} terminado`)
            } catch (error) {
              console.log(`   ⚠️ No se pudo terminar proceso ${pid}`)
            }
          }
        })
      } else {
        console.log('   ✅ Puerto 3000 libre')
      }
    } catch (error) {
      console.log('   ✅ Puerto 3000 libre')
    }
  }
} catch (error) {
  console.log('   ✅ Puerto 3000 libre')
}

// 2. Limpiar cache de Next.js
console.log('2️⃣ Limpiando cache de Next.js...')
const nextDir = path.join(process.cwd(), '.next')
if (fs.existsSync(nextDir)) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true })
    console.log('   ✅ Cache .next eliminado')
  } catch (error) {
    console.log('   ⚠️ Error eliminando cache .next:', error.message)
  }
} else {
  console.log('   ✅ No hay cache .next para limpiar')
}

// 3. Limpiar cache de npm (opcional)
console.log('3️⃣ Verificando cache de npm...')
try {
  execSync('npm cache verify', { stdio: 'ignore' })
  console.log('   ✅ Cache de npm verificado')
} catch (error) {
  console.log('   ⚠️ Error verificando cache de npm')
}

console.log('✨ Limpieza completada. Iniciando servidor de desarrollo...')
console.log('')

// 4. Iniciar el servidor de desarrollo
try {
  execSync('npm run dev', { stdio: 'inherit' })
} catch (error) {
  console.error('❌ Error iniciando servidor de desarrollo:', error.message)
  process.exit(1)
}
