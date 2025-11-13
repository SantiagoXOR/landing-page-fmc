#!/usr/bin/env node

/**
 * Standalone WebSocket server for development
 * Run this script to start the WebSocket server on port 3001
 */

const { startWebSocketServer } = require('../src/server/websocket-server')

async function main() {
  try {
    console.log('🚀 Starting WebSocket server...')
    await startWebSocketServer()
    console.log('✅ WebSocket server started successfully on port 3001')
    console.log('📡 WebSocket endpoint: ws://localhost:3001/ws')
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down WebSocket server...')
      const { stopWebSocketServer } = require('../src/server/websocket-server')
      await stopWebSocketServer()
      console.log('✅ WebSocket server stopped')
      process.exit(0)
    })
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down WebSocket server...')
      const { stopWebSocketServer } = require('../src/server/websocket-server')
      await stopWebSocketServer()
      console.log('✅ WebSocket server stopped')
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ Failed to start WebSocket server:', error)
    process.exit(1)
  }
}

main()
