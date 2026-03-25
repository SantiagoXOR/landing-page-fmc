import { describe, it, expect } from 'vitest'
import {
  buildLeadSearchOrParts,
  buildMessageContentSearchPattern,
  buildWhatsAppPlatformIdSearchPattern,
  sanitizeIlikeTerm,
} from '../chat-search-utils'

describe('chat-search-utils', () => {
  describe('sanitizeIlikeTerm', () => {
    it('elimina comodines % y _', () => {
      expect(sanitizeIlikeTerm('50%_off')).toBe('50off')
    })
  })

  describe('buildLeadSearchOrParts', () => {
    it('incluye teléfono por dígitos aunque el usuario omita prefijo +54', () => {
      const parts = buildLeadSearchOrParts('3547527070')
      expect(parts.some((p) => p.includes('3547527070'))).toBe(true)
      expect(parts.some((p) => p.startsWith('nombre.'))).toBe(true)
      expect(parts.some((p) => p.startsWith('telefono.'))).toBe(true)
    })

    it('normaliza entrada con guiones y espacios para coincidir solo dígitos', () => {
      const parts = buildLeadSearchOrParts('3547-527070')
      expect(parts.some((p) => p.includes('3547527070'))).toBe(true)
    })

    it('no agrega condición por dígitos si hay menos de 5', () => {
      const parts = buildLeadSearchOrParts('1234')
      expect(parts.every((p) => !p.includes('3547527070'))).toBe(true)
      expect(parts.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('buildMessageContentSearchPattern', () => {
    it('usa término saneado para contenido', () => {
      expect(buildMessageContentSearchPattern('  hola  ')).toBe('hola')
    })
  })

  describe('buildWhatsAppPlatformIdSearchPattern', () => {
    it('prioriza dígitos para coincidir +549… almacenado con platform_id', () => {
      expect(buildWhatsAppPlatformIdSearchPattern('3547527070')).toBe('3547527070')
    })

    it('devuelve null si no hay patrón útil', () => {
      expect(buildWhatsAppPlatformIdSearchPattern('')).toBe(null)
      expect(buildWhatsAppPlatformIdSearchPattern('123')).toBe(null)
    })
  })
})
