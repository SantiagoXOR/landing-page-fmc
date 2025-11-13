'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { MapPin, Phone, ExternalLink } from 'lucide-react'

type Dealer = {
  name: string
  address: string
  phone: string
  brands: string[]
  zone: 'Capital' | 'Interior'
}

const DEALERS: Dealer[] = [
  { name: 'GIULIANO MOTOS', address: 'Mitre esq, Av. Napoleón Uriburu S/N', phone: '0370-452-9498', brands: ['CORVEN', 'MOTOMEL', 'SUZUKI', 'BAJAJ', 'MONDIAL'], zone: 'Capital' },
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
  { name: 'NACER, YAMIL ANGEL', address: '9 de julio 0444', phone: '0370-426-4561', brands: ['YAMAHA'], zone: 'Capital' },
  { name: 'MOTOLANDIA', address: 'Belgrano y Sarmiento', phone: '0371-841-3868', brands: ['GUERRERO'], zone: 'Interior' },
  { name: 'MAYANS SRL', address: 'Av. 12 de Octubre 1145', phone: '0371-844-4917', brands: ['HONDA'], zone: 'Interior' },
  { name: 'PUCARA MOTOS', address: 'Rivadavia 555', phone: '0370-427-6950', brands: ['KELLER', 'BAJAJ', 'MOTOMEL', 'MONDIAL'], zone: 'Capital' },
]

function DealerCard({ dealer }: { dealer: Dealer }) {
  const waUrl = (() => {
    const digits = dealer.phone.replace(/\D/g, '')
    const local = digits.startsWith('0') ? digits.slice(1) : digits
    const message = `Hola, me interesa consultar por ${dealer.name}`
    return `https://wa.me/54${local}?text=${encodeURIComponent(message)}`
  })()
  return (
    <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift will-change-transform motion-safe:transition-transform motion-safe:duration-300 hover:-translate-y-[2px] active:scale-[0.99]">
      <CardContent className="p-6 text-center">
        <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">{dealer.name}</h3>
        <div className="flex items-start justify-center space-x-2 mb-2">
          <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
          <p className="text-sm text-gray-600 font-acto-regular">{dealer.address}</p>
        </div>
        <div className="flex items-center justify-center space-x-2 mb-3">
          <Phone className="w-4 h-4 text-fmc-blue" />
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Contactar a ${dealer.name} por WhatsApp`}
            className="text-sm font-acto-regular text-fmc-blue hover:underline"
          >
            {dealer.phone}
          </a>
        </div>
        <p className="text-xs text-fmc-green font-acto-medium">{dealer.brands.join(' | ')}</p>
        <div className="mt-4 flex justify-center">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir WhatsApp para ${dealer.name}`}
            className="text-fmc-blue hover:text-fmc-purple transition-colors transform motion-safe:transition-transform motion-safe:duration-200 hover:scale-110"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

export function DealersSection() {
  // Sin filtrado por zonas: mostramos todos en un carrusel
  const allDealers = DEALERS

  return (
    <section className="py-20 bg-gray-50" data-aos="fade-up">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12" data-aos="fade-down">
          <h2 className="text-3xl font-acto-bold text-fmc-purple mb-2">CONCESIONARIOS ASOCIADOS</h2>
          <p className="text-fmc-purple/70 font-acto-regular">Los mejores concesionarios de Formosa para vos puedas elegir.</p>
        </div>

        {/* Carrusel con todos los concesionarios */}
        <div className="mt-10">
          <Carousel opts={{ align: 'start' }} className="w-full">
            <CarouselContent>
              {allDealers.map((dealer) => (
                <CarouselItem key={`${dealer.name}-${dealer.phone}`} data-aos="zoom-in" className="basis-3/4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                  <DealerCard dealer={dealer} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="border-fmc-purple/40 text-fmc-purple" />
            <CarouselNext className="border-fmc-purple/40 text-fmc-purple" />
          </Carousel>
        </div>
      </div>
    </section>
  )
}