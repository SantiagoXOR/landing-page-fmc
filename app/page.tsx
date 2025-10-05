"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Phone, ExternalLink, CalendarClock, CheckCircle2, CreditCard, PiggyBank } from "lucide-react"
import { useEffect, useState } from "react"
import { CreditForm } from "@/components/credit-form"
import { Testimonials } from "@/components/testimonials"
import Hero from "@/src/components/hero/Hero"
import Image from "next/image"

export default function Home() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const initAOS = async () => {
      const AOS = (await import("aos")).default
      await import("aos/dist/aos.css")
      AOS.init({
        duration: 1500,
        easing: "ease",
        once: true,
        offset: 100,
      })
    }
    initAOS()
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Header Principal */}
      <header className="bg-fmc-purple text-white sticky top-0 z-50 shadow-lg">
        {/* Carrusel de Marcas */}
        <div className="bg-gradient-to-r from-fmc-purple via-fmc-blue to-fmc-green py-6 overflow-hidden">
          <div className="flex animate-scroll">
            {[
              { name: "BAJAJ", logo: "logos/logo-bajaj.png" },
              { name: "CORVEN", logo: "logos/logo-corven.png" },
              { name: "GILERA", logo: "logos/logo-gilera.png" },
              { name: "HONDA", logo: "logos/logo-honda.png" },
              { name: "KELLER", logo: "logos/logo-keller.png" },
              { name: "MONDIAL", logo: "logos/logo-mondial.png" },
              { name: "MOTOMEL", logo: "logos/logo-motomel.png" },
              { name: "SUZUKI", logo: "logos/logo-suzuki.png" },
              { name: "YAMAHA", logo: "logos/logo-yamaha.png" },
              { name: "ZANELLA", logo: "logos/logo-zanella.png" }
            ].concat([
              { name: "BAJAJ", logo: "logos/logo-bajaj.png" },
              { name: "CORVEN", logo: "logos/logo-corven.png" },
              { name: "GILERA", logo: "logos/logo-gilera.png" },
              { name: "HONDA", logo: "logos/logo-honda.png" },
              { name: "KELLER", logo: "logos/logo-keller.png" },
              { name: "MONDIAL", logo: "logos/logo-mondial.png" },
              { name: "MOTOMEL", logo: "logos/logo-motomel.png" },
              { name: "SUZUKI", logo: "logos/logo-suzuki.png" },
              { name: "YAMAHA", logo: "logos/logo-yamaha.png" },
              { name: "ZANELLA", logo: "logos/logo-zanella.png" }
            ]).map((brand, index) => (
              <div key={index} className="flex items-center justify-center mx-8 whitespace-nowrap flex-shrink-0">
                <div className="relative w-16 h-12 flex items-center justify-center">
                  <Image 
                    src={`/${brand.logo}`}
                    alt={`${brand.name} logo`} 
                    width={64}
                    height={48}
                    className="w-full h-full object-contain opacity-95 hover:opacity-100 transition-opacity duration-300" 
                    priority={index < 8}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navegación Principal */}
        <nav className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image
                src="/logofmc.svg"
                alt="Formosa Moto Crédito"
                width={140}
                height={45}
                className="h-12 w-auto"
                priority
              />
            </div>
            <div className="hidden md:flex items-center space-x-12 text-sm font-acto">
              <a href="#" className="hover:text-fmc-green transition-all duration-300 tracking-[0.12em] uppercase font-acto-semibold py-3 px-2 relative group">
                <span>Inicio</span>
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-fmc-green transition-all duration-300 group-hover:w-full"></div>
              </a>
              <a href="#" className="hover:text-fmc-green transition-all duration-300 tracking-[0.12em] uppercase font-acto-semibold py-3 px-2 relative group">
                <span>Nosotros</span>
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-fmc-green transition-all duration-300 group-hover:w-full"></div>
              </a>
              <a href="#" className="hover:text-fmc-green transition-all duration-300 tracking-[0.12em] uppercase font-acto-semibold py-3 px-2 relative group">
                <span>Concesionarios</span>
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-fmc-green transition-all duration-300 group-hover:w-full"></div>
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <a href="https://wa.me/543704069592" target="_blank" rel="noopener noreferrer" className="text-white hover:text-fmc-green transition-all duration-300 transform hover:scale-110">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/formosa.moto.credito/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-fmc-green transition-all duration-300 transform hover:scale-110">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section with Mobile-First Parallax */}
      <Hero />

      {/* Loan Rate Cards Section removed (duplicated info now in Hero) */}

      {/* Main Hero Section */}
      

      {/* Loan Rate Cards Section */}
      

      {/* Beneficios - Reimplementado con shadcn/ui y paleta FMC */}
      <section className="py-16 bg-gray-900 text-white relative">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Imagen lado izquierdo usando fondo local (bg2/bg5) */}
            <div className="relative fade-in-up rounded-2xl overflow-hidden shadow-xl">
              <div className="fmc-bg-2 md:fmc-bg-4 w-full h-[320px] md:h-[440px]"></div>
              <div className="absolute inset-0 fmc-bg-gradient"></div>
              <div className="absolute top-4 right-4 w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-fmc-primary shadow-md">
                <Image src="/logofmcsimple.svg" alt="FMC" width={32} height={32} className="w-8 h-8" />
              </div>
            </div>

            {/* Contenido de beneficios */}
            <div className="space-y-6 about__inner fade-in-up">
              <h2 className="text-3xl font-acto-bold leading-tight">
                Con los mejores créditos, <span className="text-fmc-blue">la moto de tus sueños</span>{" "}
                <span className="text-fmc-green">está a solo un paso.</span>
              </h2>
              <p className="text-xl text-fmc-green font-acto-semibold">¡Hacelo realidad hoy!</p>

              <Card className="bg-gray-800/60 border-gray-700">
                <CardContent className="p-4 space-y-3">
                  {/* Ítem 1 */}
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gradient-fmc-secondary text-white px-2 py-1 rounded-md">
                      <CalendarClock className="w-4 h-4" />
                    </Badge>
                    <p className="text-gray-300 font-acto-regular">
                      Financiá en hasta 36 meses (UVA o tasa fija)
                    </p>
                  </div>
                  {/* Ítem 2 */}
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gradient-fmc-secondary text-white px-2 py-1 rounded-md">
                      <CheckCircle2 className="w-4 h-4" />
                    </Badge>
                    <p className="text-gray-300 font-acto-regular">Obtené la aprobación en tan solo 24 horas</p>
                  </div>
                  {/* Ítem 3 */}
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gradient-fmc-secondary text-white px-2 py-1 rounded-md">
                      <CreditCard className="w-4 h-4" />
                    </Badge>
                    <p className="text-gray-300 font-acto-regular">
                      Pago cómodo con débito automático en tu caja de ahorro
                    </p>
                  </div>
                  {/* Ítem 4 */}
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gradient-fmc-secondary text-white px-2 py-1 rounded-md">
                      <PiggyBank className="w-4 h-4" />
                    </Badge>
                    <p className="text-gray-300 font-acto-regular">
                      Disfrutá de tu caja de ahorro sin costos de mantenimiento
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Elementos decorativos */}
        <div className="section__strock__line__animation absolute inset-0 pointer-events-none">
          <img
            className="ssla__animation ssl__img__1 absolute top-10 left-10 w-12 h-12 animate-float"
            src="https://phronencial.com/fmc/img/about/about__small__img__1.png"
            alt=""
          />
          <img
            className="ssla__animation ssl__img__2 absolute bottom-10 right-10 w-12 h-12 animate-float-delayed"
            src="https://phronencial.com/fmc/img/about/about__small__img__2.png"
            alt=""
          />
        </div>
      </section>

      {/* Brand Logos Section */}
      <section className="pt-8 pb-0 bg-fmc-purple/90 relative overflow-hidden">
        {/* Eliminado fondo de imagen entre sección 2 y formulario */}
        <div className="absolute inset-0 bg-gradient-to-tr from-fmc-purple/70 via-fmc-purple/40 to-transparent"></div>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center mb-0">
            <div className="text-center">
              <Image src="https://phronencial.com/fmc/img/logo-honda.png" alt="Honda" width={96} height={48} className="h-12 w-auto mx-auto" />
            </div>
            <div className="text-center">
              <Image src="https://phronencial.com/fmc/img/logo-yamaha.png" alt="Yamaha" width={96} height={48} className="h-12 w-auto mx-auto" />
            </div>
            <div className="text-center">
              <Image src="https://phronencial.com/fmc/img/logo-corven.png" alt="Corven" width={96} height={48} className="h-12 w-auto mx-auto" />
            </div>
            <div className="text-center">
              <Image src="https://phronencial.com/fmc/img/logo-keller.png" alt="Keller" width={96} height={48} className="h-12 w-auto mx-auto" />
            </div>
            <div className="text-center">
              <Image src="https://phronencial.com/fmc/img/logo-mondial.png" alt="Mondial" width={96} height={48} className="h-12 w-auto mx-auto" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center">
            <div className="text-center">
              <Image src="https://phronencial.com/fmc/img/logo-zanella.png" alt="Zanella" width={96} height={48} className="h-12 w-auto mx-auto" />
            </div>
            <div className="text-center">
              <Image src="https://phronencial.com/fmc/img/logo-suzuki.png" alt="Suzuki" width={96} height={48} className="h-12 w-auto mx-auto" />
            </div>
            <div className="text-center">
              <Image src="https://phronencial.com/fmc/img/logo-gilera.png" alt="Gilera" width={96} height={48} className="h-12 w-auto mx-auto" />
            </div>
            <div className="text-center">
              <Image src="https://phronencial.com/fmc/img/logo-bajaj.png" alt="Bajaj" width={96} height={48} className="h-12 w-auto mx-auto" />
            </div>
            <div className="text-center">
              <Image src="https://phronencial.com/fmc/img/logo-motomel.png" alt="Motomel" width={96} height={48} className="h-12 w-auto mx-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Credit Application Form */}
      <CreditForm />

      {/* Customer Testimonials */}
      <Testimonials />

      {/* Associated Dealers Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-acto-bold text-fmc-purple mb-4">CONCESIONARIOS ASOCIADOS</h2>
            <p className="text-fmc-purple/70 font-acto-regular">Los mejores concesionarios de Formosa para vos puedas elegir.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">GIULIANO MOTOS</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">Mitre esq, Av. Napoleón Uriburu S/N</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-gray-600 font-acto-regular">0370-452-9498</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium mb-4">CORVEN | MOTOMEL | SUZUKI</p>
                <p className="text-xs text-fmc-green font-acto-medium">BAJAJ | MONDIAL</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">SAAVEDRA MOTORS</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">Saavedra 2125</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-gray-600 font-acto-regular">0370-485-8982</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium mb-4">HONDA | YAMAHA | MOTOMEL</p>
                <p className="text-xs text-fmc-green font-acto-medium">SUZUKI | ZANELLA | OKINOI</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">CRÉDITO GESTIÓN</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">Padre Pacifico Scozzina 445</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-gray-600 font-acto-regular">0370-498-3866</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium mb-4">YAMAHA | ZANELLA | MOTOMEL | CORVEN</p>
                <p className="text-xs text-fmc-green font-acto-medium">GILERA | KELLER | BRAVA | ROUSER | SIAM</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">MAQUIMOT</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">Julio A. Roca 610</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-gray-600 font-acto-regular">0370-485-8840</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium mb-4">KELLER | CORVEN | ZANELLA</p>
                <p className="text-xs text-fmc-green font-acto-medium">BAJAJ | MOTOMEL</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">MINIPRECIOS SRL</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">Rivadavia 770</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-gray-600 font-acto-regular">0370-421-1957</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium">SIAM | KELLER</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">FORMOSA AUTOM. S&R</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">Masferrer 1415</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-gray-600 font-acto-regular">0370-457-7915</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium">YAMAHA</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">TZT AUTOS</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">Av. Dr. N. Kirchner 4086</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-gray-600 font-acto-regular">0370-457-0305</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium">HONDA | YAMAHA</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">MOTO SHOW</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">9 de julio 1136</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-gray-600 font-acto-regular">0370-400-3045</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium mb-4">HONDA</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">RIO BERMEJO S.A</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">Av. 25 de Mayo 1264</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-gray-600 font-acto-regular">0370-426-4934</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium mb-4">HONDA | BAJAJ | TRIAX | KELLER</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">PEREZ AUTOMOTORES</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">Belgrano 97</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-gray-600 font-acto-regular">0370-420-7298</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium">KAWASAKI</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">VERA MOTOS Y TRUCKS</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">Saavedra 828</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-gray-600 font-acto-regular">0370-431-9538</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium">HONDA</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">NACER, YAMIL ANGEL</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">9 de julio 0444</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-gray-600 font-acto-regular">0370-426-4561</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium">YAMAHA</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">MOTOLANDIA</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-gray-600 font-acto-regular">Belgrano y Sarmiento</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-fmc-purple font-acto-regular">0371-841-3868</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium">GUERRERO</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">MAYANS SRL</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-fmc-purple font-acto-regular">Av. 12 de Octubre 1145</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-fmc-purple font-acto-regular">0371-844-4917</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium">HONDA</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">PUCARA MOTOS</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-fmc-purple font-acto-regular">Rivadavia 555</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-fmc-purple font-acto-regular">0370-427-6950</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium mb-4">KELLER | BAJAJ | MOTOMEL | MONDIAL</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-white border border-fmc-purple/20 hover-lift">
              <CardContent className="p-6 text-center">
                <h3 className="font-acto-bold text-lg mb-2 text-fmc-purple">ZL MOTOS</h3>
                <div className="flex items-start justify-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-fmc-blue mt-1" />
                  <p className="text-sm text-fmc-purple font-acto-regular">J. M. Uriburu 946</p>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <p className="text-sm text-fmc-purple font-acto-regular">0370-479-4989</p>
                </div>
                <p className="text-xs text-fmc-green font-acto-medium">GILERA | KELLER | HERO</p>
                <div className="mt-4 flex justify-center">
                  <ExternalLink className="w-4 h-4 text-fmc-blue" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Bottom Hero Section with Person */}
      <section className="relative overflow-hidden bg-gradient-fmc-primary py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <img
                src="https://phronencial.com/fmc/img/team/team_left_bg.png"
                alt="Happy person giving thumbs up"
                className="max-w-md w-full h-auto"
              />
            </div>
            <div className="space-y-6 text-center lg:text-right">
              <div className="w-16 h-16 bg-gradient-fmc-secondary rounded-full flex items-center justify-center mx-auto lg:ml-auto lg:mr-0">
                <img
                  src="/logofmcsimple.svg"
                  alt="FMC"
                  className="h-8"
                />
              </div>
              <div>
                <div className="text-2xl font-acto-bold text-white mb-2">FORMOSA</div>
                <div className="text-lg font-acto-regular text-white">MOTO CRÉDITO</div>
              </div>
              <h1 className="text-4xl lg:text-5xl font-acto-bold leading-tight text-white">¿La moto de tus sueños?</h1>
              <p className="text-xl font-acto-regular text-white">
                ¡Ahora es más accesible que nunca con la tasa de crédito más baja del mercado!
              </p>
            </div>
          </div>
        </div>

        <div className="absolute top-20 right-20 w-32 h-32 border-4 border-fmc-green/30 rounded-full opacity-30"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 border-4 border-fmc-blue/30 rounded-full opacity-30"></div>
      </section>

      {/* Financing CTA */}
      <section className="py-16 bg-fmc-purple text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-acto-bold mb-4">Financia tu moto en pocos pasos...</h2>
          <h3 className="text-2xl font-acto-semibold text-fmc-green mb-8">¡Solicitá tu crédito ahora!</h3>
          <div className="w-16 h-16 bg-gradient-fmc-secondary rounded-full flex items-center justify-center mx-auto">
            <img
              src="/logofmcsimple.svg"
              alt="FMC"
              className="h-8"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-fmc-purple text-white py-16">
        <div className="container mx-auto px-4">
          

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <img
                  src="/logofmc.svg"
                  alt="Formosa Moto Crédito"
                  className="h-8"
                />
              </div>
              <div>
                <div className="text-2xl font-acto-bold">FORMOSA</div>
                <div className="text-lg font-acto-regular">MOTO CRÉDITO</div>
              </div>
              <div className="flex space-x-4 ml-8">
                <a
                  href="#"
                  className="w-10 h-10 bg-fmc-purple/70 rounded-full flex items-center justify-center hover:bg-fmc-purple/50"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-fmc-purple/70 rounded-full flex items-center justify-center hover:bg-fmc-purple/50"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-white/90 font-acto-regular leading-relaxed">
                Te brindamos la oportunidad de cumplir tu sueño de tener una moto propia a través de créditos rápidos y
                accesibles. Con un proceso simple y personalizado, te ayudamos a dar el primer paso hacia la libertad y
                la aventura. ¡No esperes más, tu moto te está esperando!
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-fmc-blue" />
                  <span className="text-lg font-acto-semibold">370 428-5453</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-fmc-green" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.367 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                  </svg>
                  <span className="text-lg font-acto-semibold">370 440-8312</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-white/70 max-w-4xl mx-auto leading-relaxed">
            <p className="mb-4 font-acto-regular">
              Los préstamos otorgados por Banco de Formosa S.A. a personas humanas con garantía prendaria en primer
              grado sobre moto vehículos 0 km están sujetos a disponibilidad de stock en las concesionarias y a la
              aprobación del riesgo crediticio. El monto y el plazo del financiamiento dependerán de la capacidad
              crediticia del solicitante, y las tasas de interés serán las vigentes al momento de la aprobación. El
              préstamo estará respaldado por la prenda del vehículo adquirido, que deberá estar asegurado durante el
              período del préstamo. Las promociones están sujetas a condiciones específicas y la disponibilidad de
              unidades en las concesionarias. Además, se aplicarán comisiones, cargos administrativos y otros costos
              adicionales según las políticas del banco, y los pagos deberán realizarse dentro de los plazos
              establecidos.
            </p>
            <div className="border-t border-white/20 pt-8">
              <p className="font-acto-semibold">Copyright © 2025 FORMOSA MOTO CRÉDITO.</p>
              <p className="mt-2 font-acto-regular">Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
