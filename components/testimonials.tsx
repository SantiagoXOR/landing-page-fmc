'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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
    initials: "MG"
  },
  {
    id: 2,
    name: "Carlos Rodríguez",
    location: "Clorinda",
    rating: 5,
    comment: "Increíble servicio. Tenía dudas sobre el financiamiento pero me explicaron todo muy claro. Ahora tengo mi Yamaha FZ25 y estoy súper contento. Recomiendo 100%.",
    motorcycle: "Yamaha FZ25",
    initials: "CR"
  },
  {
    id: 3,
    name: "Ana Martínez",
    location: "Pirané",
    rating: 5,
    comment: "La mejor decisión que tomé. El proceso fue súper fácil y transparente. Mi Corven Triax 150 llegó en perfectas condiciones. Gracias por hacer realidad mi sueño de tener mi propia moto.",
    motorcycle: "Corven Triax 150",
    initials: "AM"
  },
  {
    id: 4,
    name: "Roberto Silva",
    location: "Laguna Blanca",
    rating: 5,
    comment: "Profesionales de primera. Me asesoraron perfectamente para elegir la moto ideal para mi trabajo. La Suzuki EN 125 es perfecta y las cuotas se adaptan a mi presupuesto.",
    motorcycle: "Suzuki EN 125",
    initials: "RS"
  },
  {
    id: 5,
    name: "Laura Fernández",
    location: "Ingeniero Juárez",
    rating: 5,
    comment: "Servicio excepcional desde el primer contacto. El equipo es muy amable y profesional. Mi Gilera Smash 110 es perfecta para la ciudad. Sin dudas volvería a elegirlos.",
    motorcycle: "Gilera Smash 110",
    initials: "LF"
  },
  {
    id: 6,
    name: "Diego Morales",
    location: "Las Lomitas",
    rating: 5,
    comment: "Rápido, confiable y con las mejores condiciones del mercado. Mi Zanella ZR 150 superó todas mis expectativas. El proceso de financiamiento fue muy sencillo y transparente.",
    motorcycle: "Zanella ZR 150",
    initials: "DM"
  }
]

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

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

  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Lo que dicen nuestros clientes
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Miles de personas ya confiaron en nosotros para conseguir la moto de sus sueños. 
            Conoce sus experiencias.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Testimonial Principal */}
          <div className="relative">
            <Card className={`bg-white shadow-xl border-0 transition-all duration-300 ${
              isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
            }`}>
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                  {/* Avatar y datos del cliente */}
                  <div className="flex-shrink-0 text-center md:text-left">
                    <Avatar className="h-20 w-20 mx-auto md:mx-0 mb-4">
                      <AvatarImage src={currentTestimonial.avatar} />
                      <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                        {currentTestimonial.initials}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {currentTestimonial.name}
                    </h3>
                    <p className="text-gray-600">{currentTestimonial.location}</p>
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      {currentTestimonial.motorcycle}
                    </p>
                  </div>

                  {/* Contenido del testimonio */}
                  <div className="flex-1">
                    <div className="flex items-center justify-center md:justify-start mb-4">
                      {renderStars(currentTestimonial.rating)}
                    </div>
                    
                    <div className="relative">
                      <Quote className="absolute -top-2 -left-2 h-8 w-8 text-blue-200" />
                      <blockquote className="text-lg text-gray-700 leading-relaxed pl-6">
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
                className="h-12 w-12 rounded-full border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
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
                    className={`h-3 w-3 rounded-full transition-all duration-200 ${
                      index === currentIndex
                        ? 'bg-blue-600 scale-125'
                        : 'bg-blue-200 hover:bg-blue-300'
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={nextTestimonial}
                disabled={isAnimating}
                className="h-12 w-12 rounded-full border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Testimonios en miniatura (solo en desktop) */}
          <div className="hidden lg:grid grid-cols-3 gap-4 mt-12">
            {testimonials.slice(0, 3).map((testimonial, index) => {
              const actualIndex = (currentIndex + index) % testimonials.length
              const displayTestimonial = testimonials[actualIndex]
              
              return (
                <Card
                  key={displayTestimonial.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    actualIndex === currentIndex ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => goToTestimonial(actualIndex)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-600 text-white text-sm">
                          {displayTestimonial.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-sm">{displayTestimonial.name}</h4>
                        <p className="text-xs text-gray-600">{displayTestimonial.location}</p>
                      </div>
                    </div>
                    <div className="flex mb-2">
                      {renderStars(displayTestimonial.rating)}
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      "{displayTestimonial.comment}"
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
              <div className="text-gray-600">Clientes Satisfechos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">4.9</div>
              <div className="text-gray-600">Calificación Promedio</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">98%</div>
              <div className="text-gray-600">Recomendación</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}