'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { MapPin, Phone, ExternalLink } from 'lucide-react'
import { DEALERS, type Dealer, getWhatsAppUrl } from '@/lib/dealers-data'

function DealerCard({ dealer }: { dealer: Dealer }) {
  const waUrl = getWhatsAppUrl(dealer)
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