'use client'

import * as React from 'react'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Star, Smile, ThumbsUp } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Image from 'next/image'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import { AspectRatio } from '@/components/ui/aspect-ratio'

interface Testimonial {
  id: number
  name: string
  location: string
  rating: number
  comment: string
  motorcycle: string
  avatar?: string
  initials: string
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "María González",
    location: "Formosa Capital",
    rating: 5,
    comment: "Excelente atención y muy rápido el proceso. Conseguí mi Honda CB 190R en solo una semana. El equipo de Formosa Moto Crédito me ayudó en todo momento y las cuotas son muy accesibles.",
    motorcycle: "Honda CB 190R",
    avatar: "/landing/testimonios/maria.jpeg",
    initials: "MG"
  },
  {
    id: 2,
    name: "Carlos Rodríguez",
    location: "Clorinda",
    rating: 5,
    comment: "Increíble servicio. Tenía dudas sobre el financiamiento pero me explicaron todo muy claro. Ahora tengo mi Yamaha FZ25 y estoy súper contento. Recomiendo 100%.",
    motorcycle: "Yamaha FZ25",
    avatar: "/testimonios/carlos.jpeg",
    initials: "CR"
  },
  {
    id: 3,
    name: "Ana Martínez",
    location: "Pirané",
    rating: 5,
    comment: "La mejor decisión que tomé. El proceso fue súper fácil y transparente. Mi Corven Triax 150 llegó en perfectas condiciones. Gracias por hacer realidad mi sueño de tener mi propia moto.",
    motorcycle: "Corven Triax 150",
    avatar: "/testimonios/ana.jpeg",
    initials: "AM"
  },
  {
    id: 4,
    name: "Roberto Silva",
    location: "Laguna Blanca",
    rating: 5,
    comment: "Profesionales de primera. Me asesoraron perfectamente para elegir la moto ideal para mi trabajo. La Suzuki EN 125 es perfecta y las cuotas se adaptan a mi presupuesto.",
    motorcycle: "Suzuki EN 125",
    avatar: "/testimonios/roberto.jpeg",
    initials: "RS"
  },
  {
    id: 5,
    name: "Laura Fernández",
    location: "Ingeniero Juárez",
    rating: 5,
    comment: "Servicio excepcional desde el primer contacto. El equipo es muy amable y profesional. Mi Gilera Smash 110 es perfecta para la ciudad. Sin dudas volvería a elegirlos.",
    motorcycle: "Gilera Smash 110",
    avatar: "/testimonios/laura.jpeg",
    initials: "LF"
  },
  {
    id: 6,
    name: "Diego Morales",
    location: "Las Lomitas",
    rating: 5,
    comment: "Rápido, confiable y con las mejores condiciones del mercado. Mi Zanella ZR 150 superó todas mis expectativas. El proceso de financiamiento fue muy sencillo y transparente.",
    motorcycle: "Zanella ZR 150",
    avatar: "/testimonios/diego.jpeg",
    initials: "DM"
  }
]

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null)

  const nextTestimonial = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const prevTestimonial = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const goToTestimonial = (index: number) => {
    if (isAnimating || index === currentIndex) return
    setIsAnimating(true)
    setCurrentIndex(index)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))
  }

  const currentTestimonial = testimonials[currentIndex]

  // Autoplay del carrusel cada 1 segundo
  React.useEffect(() => {
    if (!carouselApi) return
    const id = setInterval(() => {
      carouselApi.scrollNext()
    }, 3000)
    return () => clearInterval(id)
  }, [carouselApi])

  return (
    <section className="py-16 bg-gradient-fmc-primary/10" data-aos="fade-up">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12" data-aos="fade-down">
          <h2 className="text-4xl md:text-5xl font-acto-extrabold tracking-tight mb-2 text-fmc-purple">
            Lo que dicen nuestros clientes
          </h2>
          <p className="text-lg text-fmc-purple/80 max-w-2xl mx-auto font-acto-regular">
            Miles de personas ya confiaron en nosotros para conseguir la moto de sus sueños.
            Conoce sus experiencias.
          </p>
        </div>
        {/* Carrusel de imágenes reales de clientes */}
        <div className="max-w-4xl mx-auto">
          <div className="mb-10 rounded-2xl overflow-hidden">
            <Carousel className="w-full" opts={{ loop: true }} setApi={setCarouselApi}>
              <CarouselContent>
                <CarouselItem data-aos="zoom-in">
                  <AspectRatio ratio={1} className="w-full rounded-2xl overflow-hidden bg-white shadow-md will-change-transform motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out hover:scale-[1.02]">
                    <Image
                      src="/landing/hero/testimonial1.png"
                      alt="Cliente retirando su moto gracias al crédito"
                      fill
                      className="object-contain rounded-2xl"
                      priority
                    />
                  </AspectRatio>
                </CarouselItem>
                <CarouselItem data-aos="zoom-in">
                  <AspectRatio ratio={1} className="w-full rounded-2xl overflow-hidden bg-white shadow-md will-change-transform motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out hover:scale-[1.02]">
                    <Image
                      src="/landing/hero/testimonial2.png"
                      alt="Entrega de moto en concesionaria con financiamiento"
                      fill
                      className="object-contain rounded-2xl"
                    />
                  </AspectRatio>
                </CarouselItem>
                <CarouselItem data-aos="zoom-in">
                  <AspectRatio ratio={1} className="w-full rounded-2xl overflow-hidden bg-white shadow-md will-change-transform motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out hover:scale-[1.02]">
                    <Image
                      src="/landing/hero/testimonial3.png"
                      alt="Nuevo propietario feliz tras aprobar crédito de moto"
                      fill
                      className="object-contain rounded-2xl"
                    />
                  </AspectRatio>
                </CarouselItem>
              </CarouselContent>
            </Carousel>
          </div>

          {/* Testimonial Principal */}
          <div className="relative">
            <Card className={`bg-white shadow-xl border-0 transition-all duration-300 will-change-transform motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-[1px] active:scale-[0.99] hover:shadow-lg ${
              isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
            }`}>
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                  {/* Avatar y datos del cliente */}
                  <div className="flex-shrink-0 text-center md:text-left">
                    <Avatar className="h-20 w-20 mx-auto md:mx-0 mb-4 ring-2 ring-fmc-purple/20 shadow-sm">
                      {currentTestimonial.avatar ? (
                        <AvatarImage src={currentTestimonial.avatar} />
                      ) : null}
                      <AvatarFallback className="bg-fmc-purple text-white text-lg font-semibold">
                        {currentTestimonial.initials}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {currentTestimonial.name}
                    </h3>
                    <p className="text-gray-600">{currentTestimonial.location}</p>
                    <p className="text-sm text-fmc-purple font-medium mt-1">
                      {currentTestimonial.motorcycle}
                    </p>
                  </div>

                  {/* Contenido del testimonio */}
                  <div className="flex-1">
                    <div className="flex items-center justify-center md:justify-start mb-4">
                      {renderStars(currentTestimonial.rating)}
                    </div>
                    
                    <div className="relative">
                      <blockquote className="text-lg text-gray-700 leading-relaxed pl-6 border-l-4 border-fmc-purple/20 italic">
                        "{currentTestimonial.comment}"
                      </blockquote>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Controles de navegación */}
            <div className="flex items-center justify-between mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={prevTestimonial}
                disabled={isAnimating}
                className="h-12 w-12 rounded-full border-2 border-fmc-purple/40 hover:border-fmc-purple hover:bg-fmc-purple/10 motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-[1px] active:scale-[0.98]"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              {/* Indicadores de puntos */}
              <div className="flex space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToTestimonial(index)}
                    disabled={isAnimating}
                    className={`h-3 w-3 rounded-full transition-all duration-200 ring-2 ring-white ${
                      index === currentIndex
                        ? 'bg-fmc-purple scale-125'
                        : 'bg-gray-300 hover:bg-fmc-purple/50'
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={nextTestimonial}
                disabled={isAnimating}
                className="h-12 w-12 rounded-full border-2 border-fmc-purple/40 hover:border-fmc-purple hover:bg-fmc-purple/10 motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-[1px] active:scale-[0.98]"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Eliminado: mini previews de testimonios para simplificar la sección */}

          {/* Bento Grid: Clientes satisfechos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {/* Card 1 */}
            <Card data-aos="fade-up" data-aos-delay="0" className="bg-white border-fmc-purple/20 shadow-sm hover:shadow-md transition-shadow will-change-transform motion-safe:transition-transform motion-safe:duration-300 hover:-translate-y-[2px] active:scale-[0.99]">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-fmc-purple/10 text-fmc-purple flex items-center justify-center mx-auto mb-3">
                  <Smile className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-acto-bold mb-1 text-fmc-purple">500+</h3>
                <p className="text-sm text-gray-600 font-acto-regular">Clientes Satisfechos</p>
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card data-aos="fade-up" data-aos-delay="100" className="bg-white border-fmc-purple/20 shadow-sm hover:shadow-md transition-shadow will-change-transform motion-safe:transition-transform motion-safe:duration-300 hover:-translate-y-[2px] active:scale-[0.99]">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-fmc-purple/10 text-fmc-purple flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-acto-bold mb-1 text-fmc-purple">4.9</h3>
                <p className="text-sm text-gray-600 font-acto-regular">Calificación Promedio</p>
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card data-aos="fade-up" data-aos-delay="200" className="bg-white border-fmc-purple/20 shadow-sm hover:shadow-md transition-shadow will-change-transform motion-safe:transition-transform motion-safe:duration-300 hover:-translate-y-[2px] active:scale-[0.99]">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-fmc-purple/10 text-fmc-purple flex items-center justify-center mx-auto mb-3">
                  <ThumbsUp className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-acto-bold mb-1 text-fmc-purple">98%</h3>
                <p className="text-sm text-gray-600 font-acto-regular">Recomendación</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}