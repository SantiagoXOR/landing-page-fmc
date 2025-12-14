// Datos de concesionarias compartidos
export type Dealer = {
  name: string
  address: string
  phone: string
  brands: string[]
  zone: 'Capital' | 'Interior'
  // Coordenadas geográficas (opcionales)
  latitude?: number
  longitude?: number
  // Información de Places API (opcionales)
  placeId?: string
  rating?: number
  photoUrl?: string
  openingHours?: {
    openNow?: boolean
    weekdayText?: string[]
  }
  website?: string
}

export const DEALERS: Dealer[] = [
  { name: 'GIULIANO MOTOS', address: 'Mitre esq, Av. Napoleón Uriburu S/N', phone: '*3704997344 y *3704628777', brands: ['CORVEN', 'MOTOMEL', 'SUZUKI', 'BAJAJ', 'MONDIAL'], zone: 'Capital' },
  { name: 'SAAVEDRA MOTORS', address: 'Saavedra 2125', phone: '0370-485-8982', brands: ['HONDA', 'YAMAHA', 'MOTOMEL', 'SUZUKI', 'ZANELLA', 'OKINOI'], zone: 'Capital' },
  { name: 'CRÉDITO GESTIÓN', address: 'Padre Pacifico Scozzina 445', phone: '0370-498-3866', brands: ['YAMAHA', 'ZANELLA', 'MOTOMEL', 'CORVEN', 'GILERA', 'KELLER', 'BRAVA', 'ROUSER', 'SIAM'], zone: 'Capital' },
  { name: 'MAQUIMOT', address: 'Julio A. Roca 610', phone: '0370-485-8840', brands: ['KELLER', 'CORVEN', 'ZANELLA', 'BAJAJ', 'MOTOMEL'], zone: 'Capital' },
  { name: 'MINIPRECIOS SRL', address: 'Rivadavia 770', phone: '0370-421-1957', brands: ['SIAM', 'KELLER'], zone: 'Capital' },
  { name: 'FORMOSA AUTOM. S&R', address: 'Masferrer 1415', phone: '0370-457-7915', brands: ['YAMAHA'], zone: 'Capital' },
  { name: 'TZT AUTOS', address: 'Av. Dr. N. Kirchner 4086', phone: '0370-457-0305', brands: ['HONDA', 'YAMAHA'], zone: 'Capital' },
  { name: 'MOTO SHOW', address: '9 de julio 1136', phone: '0370-400-3045', brands: ['HONDA'], zone: 'Capital' },
  { name: 'RIO BERMEJO S.A', address: 'Av. 25 de Mayo 1264', phone: '0370-426-4934', brands: ['HONDA', 'BAJAJ', 'TRIAX', 'KELLER'], zone: 'Capital' },
  { name: 'PEREZ AUTOMOTORES', address: 'Belgrano 97', phone: '0370-420-7298', brands: ['KAWASAKI'], zone: 'Capital' },
  { name: 'VERA MOTOS Y TRUCKS', address: 'Saavedra 828', phone: '0370-431-9538', brands: ['HONDA'], zone: 'Capital' },
  { name: 'NACER, YAMIL ANGEL', address: '*9 DE JULIO 444', phone: '0370-426-4561', brands: ['YAMAHA'], zone: 'Capital' },
  { name: 'MOTOLANDIA', address: 'Belgrano y Sarmiento', phone: '0371-841-3868', brands: ['GUERRERO'], zone: 'Interior' },
  { name: 'MAYANS SRL', address: 'Av. 12 de Octubre 1145', phone: '0371-844-4917', brands: ['HONDA'], zone: 'Interior' },
  { name: 'PUCARA MOTOS', address: 'Rivadavia 555', phone: '0370-427-6950', brands: ['KELLER', 'BAJAJ', 'MOTOMEL', 'MONDIAL'], zone: 'Capital' },
]

/**
 * Genera la URL de WhatsApp para una concesionaria
 */
export function getWhatsAppUrl(dealer: Dealer): string {
  const digits = dealer.phone.replace(/\D/g, '')
  const local = digits.startsWith('0') ? digits.slice(1) : digits
  const message = `Hola, me interesa consultar por ${dealer.name}`
  return `https://wa.me/54${local}?text=${encodeURIComponent(message)}`
}

/**
 * Obtiene todas las marcas únicas de todas las concesionarias
 */
export function getAllBrands(): string[] {
  const brandsSet = new Set<string>()
  DEALERS.forEach(dealer => {
    dealer.brands.forEach(brand => brandsSet.add(brand))
  })
  return Array.from(brandsSet).sort()
}
