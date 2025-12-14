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
  { name: 'GIULIANO MOTOS', address: 'Mitre esq, Av. Napoleón Uriburu S/N', phone: '*3704997344 y *3704628777', brands: ['CORVEN', 'MOTOMEL', 'SUZUKI', 'BAJAJ', 'MONDIAL'], zone: 'Capital',
  latitude: -26.192457,
  longitude: -58.1675046,
  placeId: 'EjtNaXRyZSAmIEF2ZW5pZGEgTmFwb2xlw7NuIFVyaWJ1cnUsIFAzNjAwIEZvcm1vc2EsIEFyZ2VudGluYSJmImQKFAoSCS36gCQLplyUEZ-yEvgs3qrMEhQKEgkt-oAkC6ZclBGfshL4LN6qzBoUChIJ56NsyualXJQRZ8FN5Xc40_AaFAoSCRVgUbgLplyUEfk7XIxqa9KCIgoNJllj8BXaV1Td'
},
  { name: 'SAAVEDRA MOTORS', address: 'Saavedra 2125', phone: '0370-485-8982', brands: ['HONDA', 'YAMAHA', 'MOTOMEL', 'SUZUKI', 'ZANELLA', 'OKINOI'], zone: 'Capital',
  latitude: -26.1875662,
  longitude: -58.1895527,
  placeId: 'ChIJ_7ZBJlavXJQRQYyCdCbBbmM'
},
  { name: 'CRÉDITO GESTIÓN', address: 'Padre Pacifico Scozzina 445', phone: '0370-498-3866', brands: ['YAMAHA', 'ZANELLA', 'MOTOMEL', 'CORVEN', 'GILERA', 'KELLER', 'BRAVA', 'ROUSER', 'SIAM'], zone: 'Capital',
  latitude: -26.1857768,
  longitude: -58.1755669,
  placeId: 'ChIJBU_PiOSlXJQRcq4bWubrygs',
  photoUrl: 'https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=AZLasHq2pMBdOdDwJdQQEJ_nzNFj-5VdI5UkZ1NEuIZs5086fW20N0MnerFVvuS3sEWdN6qZgcV0TO20sNZ1txVgvouKJCOxIQWf3euOkLXg_EogfPAYspLXCBxglh0b4v1lrMV8yTx0RmJP2AuXmal4KYXoQ4JtRyDHMgwpo8kBrdERFK6XJ5DOXoIWGeO5n8QUrNcqUV-Frz7eEECTxfVuGmsJlIEk3QB6UiIFbENhBsWikK2zP7XLlmYDXf8N2uoPgDysAQPQpLzjGRY9DzBJ9p-9TtuBR5-MeYbmwAf_CUiAzCt6nZdyn7qWh78Ee04MYI7DjRW4Kh6EuWjBC0GezY01-GCxYNY9qzWkP9cqnXA7cUTz0h_ECCVUNkhZnrY6IDGWeJeyJEMBCX7FQRT0wKSFObDJjkXj3nrGOKm3aa7g_A&key=AIzaSyBXMS9TANDsT6q60igtiBZOyIso-ugNo8k',
  website: 'http://www.formosa.gov.ar/',
},
  { name: 'MAQUIMOT', address: 'Julio A. Roca 610', phone: '0370-485-8840', brands: ['KELLER', 'CORVEN', 'ZANELLA', 'BAJAJ', 'MOTOMEL'], zone: 'Capital',
  latitude: -26.1838973,
  longitude: -58.1773126,
  placeId: 'EjVKdWxpbyBBcmdlbnRpbm8gUm9jYSA2MTAsIFAzNjAwTENWIEZvcm1vc2EsIEFyZ2VudGluYSIxEi8KFAoSCRVOm9HkpVyUESJ1LhKaT1MYEOIEKhQKEgm39qWm5KVclBEY8uEh-me98Q'
},
  { name: 'MINIPRECIOS SRL', address: 'Rivadavia 770', phone: '0370-421-1957', brands: ['SIAM', 'KELLER'], zone: 'Capital',
  latitude: -26.1822532,
  longitude: -58.1662905,
  placeId: 'ChIJMwgIi92lXJQRAo0Giv9QaZI'
},
  { name: 'FORMOSA AUTOM. S&R', address: 'Masferrer 1415', phone: '0370-457-7915', brands: ['YAMAHA'], zone: 'Capital',
  latitude: -26.166917,
  longitude: -58.18842900000001,
  placeId: 'ChIJQdz46ImlXJQRYvOoLpMLOxU'
},
  { name: 'TZT AUTOS', address: 'Av. Dr. N. Kirchner 4086', phone: '0370-457-0305', brands: ['HONDA', 'YAMAHA'], zone: 'Capital',
  latitude: -26.1877476,
  longitude: -58.20980770000001,
  placeId: 'ChIJFeTHt0evXJQRoH_BZFn05EA'
},
  { name: 'MOTO SHOW', address: '9 de julio 1136', phone: '0370-400-3045', brands: ['HONDA'], zone: 'Capital',
  latitude: -26.1887265,
  longitude: -58.17256469999999,
  placeId: 'ChIJA-zVJeKlXJQRaRCJnu-6q38'
},
  { name: 'RIO BERMEJO S.A', address: 'Av. 25 de Mayo 1264', phone: '0370-426-4934', brands: ['HONDA', 'BAJAJ', 'TRIAX', 'KELLER'], zone: 'Capital',
  latitude: -26.1869819,
  longitude: -58.1784137,
  placeId: 'ChIJN2shqfylXJQRB4SLNkkx7y8'
},
  { name: 'PEREZ AUTOMOTORES', address: 'Belgrano 97', phone: '0370-420-7298', brands: ['KAWASAKI'], zone: 'Capital',
  latitude: -26.1749983,
  longitude: -58.16829339999999,
  placeId: 'ChIJI9n_vemlXJQROmPK_7Ezod8'
},
  { name: 'VERA MOTOS Y TRUCKS', address: 'Saavedra 828', phone: '0370-431-9538', brands: ['HONDA'], zone: 'Capital',
  latitude: -26.1829058,
  longitude: -58.17424459999999,
  placeId: 'ChIJS4L0suWlXJQRHVLPP5RpCnk'
},
  { name: 'NACER, YAMIL ANGEL', address: '*9 DE JULIO 444', phone: '0370-426-4561', brands: ['YAMAHA'], zone: 'Capital',
  latitude: -26.1813572,
  longitude: -58.1754463,
  placeId: 'ChIJEa0HeuWlXJQReid5Sz2roBU'
},
  { name: 'MOTOLANDIA', address: 'Belgrano y Sarmiento', phone: '0371-841-3868', brands: ['GUERRERO'], zone: 'Interior',
  latitude: -26.1857768,
  longitude: -58.1755669,
  placeId: 'ChIJBU_PiOSlXJQRcq4bWubrygs',
  photoUrl: 'https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=AZLasHpWa1Jp2Pqg8H1qySBewNSRgL_rBNvqShpRtEmLLXhmATJzpDdXvYVWYZj3_-MrWhiRRc35RLLFCL4d1pS9S9AJLQjMi3pcfG4bcCccBFaLWl1M7FF6q5pR0PobrX7jgJVemHuNyvnJ4C36cy8w_7PJb88v6i4Er2thECBO_lOhQ9XsUhRv5bTFaO7OzlSYtAHgj-4-wZoEdfy0qpDQ2YEE2P1JxoajawoRisyDHkMz6osQI8pyJPhJAzo-gs4IkQM9QCL-bXzXObPT8M572muTRd8z7XER36rlIyqPAflRgecb1O7vbShmrmRrSLkGspAKBYQrlxf5t1wALTTdGbMcn95NFyrdmaBlS_izUKnxUhWopxTRh_g9sWubvXxU7ksYfUH4-TzzI5vd31RPnCRAHa_nz3OhdSZ-bhmjsqH6NQ&key=AIzaSyBXMS9TANDsT6q60igtiBZOyIso-ugNo8k',
  website: 'http://www.formosa.gov.ar/',
},
  { name: 'MAYANS SRL', address: 'Av. 12 de Octubre 1145', phone: '0371-844-4917', brands: ['HONDA'], zone: 'Interior',
  latitude: -25.2873409,
  longitude: -57.7157594,
  placeId: 'ChIJ45K7zNwIXZQRdsjNNwwe_PE'
},
  { name: 'PUCARA MOTOS', address: 'Rivadavia 555', phone: '0370-427-6950', brands: ['KELLER', 'BAJAJ', 'MOTOMEL', 'MONDIAL'], zone: 'Capital',
  latitude: -26.1801087,
  longitude: -58.16755859999999,
  placeId: 'ChIJF2xSk-elXJQRc4A47w9DT3g'
},
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
