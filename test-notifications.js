/**
 * Script de prueba para verificar que las notificaciones funcionan correctamente
 * 
 * Uso:
 * node test-notifications.js
 */

const { sendCustomNotification } = require('./src/lib/notification-helpers')

// Simular una notificación de prueba
console.log('🧪 Probando sistema de notificaciones...')

try {
  sendCustomNotification(
    'system_alert',
    'Prueba de Notificación',
    'Esta es una notificación de prueba para verificar que el sistema funciona correctamente',
    {
      priority: 'medium'
    }
  )
  
  console.log('✅ Notificación enviada correctamente')
  console.log('📱 Verifica el botón de notificaciones en el CRM para ver si aparece')
} catch (error) {
  console.error('❌ Error enviando notificación:', error)
  process.exit(1)
}

