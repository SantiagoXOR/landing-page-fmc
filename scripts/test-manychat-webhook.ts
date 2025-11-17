/**
 * Script de prueba para simular webhooks de Manychat
 * Ejecutar con: npx tsx scripts/test-manychat-webhook.ts
 * 
 * NOTA: Este script usa fetch nativo de Node.js 18+
 * Si usas Node.js < 18, instala node-fetch: npm install node-fetch
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/manychat'
const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY

// Ejemplo de webhook de mensaje recibido
const testMessageReceived = {
  event_type: 'message_received',
  subscriber_id: 123456789,
  subscriber: {
    id: 123456789,
    first_name: 'Juan',
    last_name: 'Pérez',
    phone: '+543701234567',
    custom_fields: [
      { id: 1, name: 'email', value: 'juan@example.com' },
      { id: 2, name: 'dni', value: '12345678' }
    ],
    tags: [
      { id: 1, name: 'interesado' }
    ]
  },
  message: {
    id: 'msg_123456',
    type: 'text',
    text: 'Hola, quiero información sobre el producto',
    timestamp: Date.now(),
    direction: 'inbound',
    platform_msg_id: 'whatsapp_msg_123456'
  },
  timestamp: Date.now()
}

// Ejemplo de webhook de nuevo subscriber
const testNewSubscriber = {
  event_type: 'new_subscriber',
  subscriber_id: 987654321,
  subscriber: {
    id: 987654321,
    first_name: 'María',
    last_name: 'González',
    phone: '+543709876543',
    custom_fields: [],
    tags: []
  },
  timestamp: Date.now()
}

// Ejemplo de webhook de mensaje enviado
const testMessageSent = {
  event_type: 'message_sent',
  subscriber_id: 123456789,
  subscriber: {
    id: 123456789,
    first_name: 'Juan',
    last_name: 'Pérez',
    phone: '+543701234567'
  },
  message: {
    id: 'msg_789012',
    type: 'text',
    text: 'Gracias por contactarnos',
    timestamp: Date.now(),
    direction: 'outbound',
    platform_msg_id: 'whatsapp_msg_789012'
  },
  timestamp: Date.now()
}

async function testWebhook(event: any, eventName: string) {
  console.log(`\n🧪 Probando webhook: ${eventName}`)
  console.log('📤 Enviando evento:', JSON.stringify(event, null, 2))
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(MANYCHAT_API_KEY && { 'Authorization': `Bearer ${MANYCHAT_API_KEY}` })
      },
      body: JSON.stringify(event)
    })

    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }

    console.log(`📥 Respuesta (${response.status}):`, JSON.stringify(responseData, null, 2))

    if (response.ok) {
      console.log('✅ Webhook procesado correctamente')
    } else {
      console.log('❌ Error en el webhook')
    }
  } catch (error: any) {
    console.error('❌ Error al enviar webhook:', error.message)
  }
}

async function main() {
  console.log('🚀 Iniciando pruebas de webhooks de Manychat')
  console.log(`📍 URL del webhook: ${WEBHOOK_URL}`)
  
  // Probar diferentes tipos de eventos
  await testWebhook(testNewSubscriber, 'new_subscriber')
  await new Promise(resolve => setTimeout(resolve, 1000)) // Esperar 1 segundo
  
  await testWebhook(testMessageReceived, 'message_received')
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  await testWebhook(testMessageSent, 'message_sent')
  
  console.log('\n✅ Pruebas completadas')
  console.log('\n💡 Siguiente paso: Verificar en la base de datos que se crearon:')
  console.log('   - Leads con manychatId')
  console.log('   - Conversaciones asociadas')
  console.log('   - Mensajes guardados')
}

main().catch(console.error)

