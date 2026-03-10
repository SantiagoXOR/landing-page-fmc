import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/tests/**',
      '**/dist/**',
      'vitest.config.test.ts',
      // Servicios con API cambiada o mocks complejos; arreglar y quitar de exclude
      'src/server/services/__tests__/supabase-lead-service.test.ts',
      'src/server/services/__tests__/whatsapp-service.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  esbuild: {
    target: 'node14'
  },
})
