import { describe, it, expect } from 'vitest'
import {
  getInstallmentOptions,
  getRateForAuto,
  getRateForMoto,
  getSeoFinancingDescription,
  getLandingRateHighlights,
  qualifiesForMotoFullFinancing,
} from '../credit-rates'

describe('credit-rates', () => {
  describe('getInstallmentOptions', () => {
    it('ofrece plazos de moto solo hasta 24 meses', () => {
      const options = getInstallmentOptions('moto')
      expect(options).toContain('24')
      expect(options).not.toContain('36')
      expect(options).not.toContain('48')
      expect(options).not.toContain('60')
    })

    it('ofrece plazos de auto hasta 48 meses', () => {
      const options = getInstallmentOptions('auto')
      expect(options).toContain('48')
      expect(options).not.toContain('60')
    })
  })

  describe('getRateForMoto', () => {
    it('aplica 49% para motos 0km bancarizados', () => {
      expect(getRateForMoto()).toBe(49)
    })
  })

  describe('getRateForAuto', () => {
    it('aplica tasas por antigüedad del vehículo', () => {
      expect(getRateForAuto('0km')).toBe(45)
      expect(getRateForAuto('1-4')).toBe(48)
      expect(getRateForAuto('5-11')).toBe(52)
    })
  })

  describe('qualifiesForMotoFullFinancing', () => {
    it('permite financiar el 100% si el sueldo supera $1.500.000', () => {
      expect(qualifiesForMotoFullFinancing(1_500_001)).toBe(true)
      expect(qualifiesForMotoFullFinancing(1_500_000)).toBe(false)
    })
  })

  describe('getSeoFinancingDescription', () => {
    it('menciona plazos de moto y auto para redes y buscadores', () => {
      const description = getSeoFinancingDescription()
      expect(description).toMatch(/24 meses/i)
      expect(description).toMatch(/48 meses/i)
      expect(description).toMatch(/bancariz/i)
    })
  })

  describe('getLandingRateHighlights', () => {
    it('expone tasas vigentes para la sección de beneficios', () => {
      const highlights = getLandingRateHighlights()
      expect(highlights.motoRatePercent).toBe(49)
      expect(highlights.motoMaxMonths).toBe(24)
      expect(highlights.autoMaxMonths).toBe(48)
      expect(highlights.autoRates['0km']).toBe(45)
    })
  })
})
