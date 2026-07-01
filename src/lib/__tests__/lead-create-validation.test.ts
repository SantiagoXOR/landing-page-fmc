import { describe, it, expect } from 'vitest'
import { LeadCreateSchema, validateLeadPhone } from '@/lib/validators'

describe('LeadCreateSchema', () => {
  it('acepta móvil argentino de prueba', () => {
    const result = LeadCreateSchema.safeParse({
      nombre: 'Santiago Martinez',
      telefono: '5493547527070',
      estado: 'NUEVO',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.telefono).toBe('5493547527070')
    }
  })

  it('ignora campos opcionales enviados como null', () => {
    const result = LeadCreateSchema.safeParse({
      nombre: 'Santiago Martinez',
      telefono: '5493547527070',
      email: null,
      dni: null,
      zona: null,
      origen: null,
      ingresos: null,
      monto: null,
      estado: 'NUEVO',
    })
    expect(result.success).toBe(true)
  })

  it('acepta móvil local de 10 dígitos (3547531646)', () => {
    const result = LeadCreateSchema.safeParse({
      nombre: 'Lucas Martinez',
      telefono: '3547531646',
      estado: 'NUEVO',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.telefono).toBe('3547531646')
    }
  })

  it('rechaza DNI con dígito verificador inválido', () => {
    const result = LeadCreateSchema.safeParse({
      nombre: 'Santiago Martinez',
      telefono: '5493547527070',
      dni: '12345678',
      estado: 'NUEVO',
    })
    expect(result.success).toBe(false)
  })
})

describe('validateLeadPhone', () => {
  it('acepta Formosa y móvil 549', () => {
    expect(validateLeadPhone('37041234567')).toBe(true)
    expect(validateLeadPhone('5493547527070')).toBe(true)
    expect(validateLeadPhone('+54 9 354 7527070')).toBe(true)
    expect(validateLeadPhone('3547531646')).toBe(true)
  })
})
