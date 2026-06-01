export type VehicleType = 'moto' | 'auto'
export type AutoAgeBracket = '0km' | '1-4' | '5-11'

const ALL_INSTALLMENT_OPTIONS = ['12', '18', '24', '36', '48', '60'] as const

const MAX_MONTHS: Record<VehicleType, number> = {
  moto: 24,
  auto: 48,
}

const MOTO_RATE_PERCENT = 49
const AUTO_RATES_PERCENT: Record<AutoAgeBracket, number> = {
  '0km': 45,
  '1-4': 48,
  '5-11': 52,
}
const MOTO_FULL_FINANCING_MIN_SALARY = 1_500_000

export function getInstallmentOptions(vehicleType: VehicleType): string[] {
  const maxMonths = MAX_MONTHS[vehicleType]
  return ALL_INSTALLMENT_OPTIONS.filter((months) => Number(months) <= maxMonths)
}

export function getRateForMoto(): number {
  return MOTO_RATE_PERCENT
}

export function getRateForAuto(ageBracket: AutoAgeBracket): number {
  return AUTO_RATES_PERCENT[ageBracket]
}

export function qualifiesForMotoFullFinancing(monthlyIncome: number): boolean {
  return monthlyIncome > MOTO_FULL_FINANCING_MIN_SALARY
}

export function getMaxInstallmentMonths(vehicleType: VehicleType): number {
  return MAX_MONTHS[vehicleType]
}

export function getSeoFinancingDescription(): string {
  return (
    'Créditos prendarios para bancarizados en Formosa. Motos 0km desde 49% hasta 24 meses. ' +
    'Autos 0km desde 45% hasta 48 meses. Aprobación en minutos.'
  )
}

export function getLandingRateHighlights() {
  return {
    bancarizadoOnly: true,
    motoRatePercent: MOTO_RATE_PERCENT,
    motoMaxMonths: MAX_MONTHS.moto,
    autoMaxMonths: MAX_MONTHS.auto,
    autoRates: { ...AUTO_RATES_PERCENT },
    motoFullFinancingMinSalary: MOTO_FULL_FINANCING_MIN_SALARY,
  }
}
