'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Phone, ExternalLink, CalendarClock, CheckCircle2, CreditCard, PiggyBank, Percent, TrendingUp, Wallet, Menu, X, UserCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { CreditForm } from "@/components/landing/credit-form"
import { Testimonials } from "@/components/landing/testimonials"
import { DealersSection } from "@/components/landing/dealers"
import Hero from "@/components/landing/hero/Hero"
import Image from "next/image"
import Footer from "@/components/landing/footer"
import Link from "next/link"

export default function Home() {
  const [isClient, setIsClient] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)

  useEffect(() => {
    setIsClient(true)
    const initAOS = async () => {
      const AOS = (await import("aos")).default
      await import("aos/dist/aos.css")
      AOS.init({
        // Ajustes más sensibles y rápidos
        duration: 900,
        easing: "ease-out-quart",
        once: true,
        offset: 80,
      })
    }
    initAOS()

    // Calcular y mantener la altura del header fijo para evitar solapados en móvil
    const updateHeaderHeight = () => {
      const headerEl = document.querySelector('header') as HTMLElement | null
      if (headerEl) {
        const height = headerEl.getBoundingClientRect().height
        setHeaderHeight(height)
        // Exponer la altura del header como variable CSS para compensar scroll/anchors
        document.documentElement.style.setProperty('--header-offset', `${Math.round(height)}px`)
      }
    }
    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)
    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Header Mobile-First Optimizado */}
      <header className="bg-fmc-purple text-white fixed top-0 left-0 right-0 z-50 shadow-lg">
        {/* Carrusel de Marcas - Más Compacto y Responsivo */}
        <div className="bg-gradient-to-r from-fmc-purple via-fmc-blue to-fmc-green py-1.5 xs:py-2 md:py-3 overflow-hidden">
          <div className="flex animate-scroll">
            {[
              { name: "BAJAJ", logo: "landing/logos/logo-bajaj.png" },
              { name: "CORVEN", logo: "landing/logos/logo-corven.png" },
              { name: "GILERA", logo: "landing/logos/logo-gilera.png" },
              { name: "HONDA", logo: "landing/logos/logo-honda.png" },
              { name: "KELLER", logo: "landing/logos/logo-keller.png" },
              { name: "MONDIAL", logo: "landing/logos/logo-mondial.png" },
              { name: "MOTOMEL", logo: "landing/logos/logo-motomel.png" },
              { name: "SUZUKI", logo: "landing/logos/logo-suzuki.png" },
              { name: "YAMAHA", logo: "landing/logos/logo-yamaha.png" },
              { name: "ZANELLA", logo: "landing/logos/logo-zanella.png" }
            ].concat([
              { name: "BAJAJ", logo: "landing/logos/logo-bajaj.png" },
              { name: "CORVEN", logo: "landing/logos/logo-corven.png" },
              { name: "GILERA", logo: "landing/logos/logo-gilera.png" },
              { name: "HONDA", logo: "landing/logos/logo-honda.png" },
              { name: "KELLER", logo: "landing/logos/logo-keller.png" },
              { name: "MONDIAL", logo: "landing/logos/logo-mondial.png" },
              { name: "MOTOMEL", logo: "landing/logos/logo-motomel.png" },
              { name: "SUZUKI", logo: "landing/logos/logo-suzuki.png" },
              { name: "YAMAHA", logo: "landing/logos/logo-yamaha.png" },
              { name: "ZANELLA", logo: "landing/logos/logo-zanella.png" }
            ]).map((brand, index) => (
              <div key={index} className="flex items-center justify-center mx-2 xs:mx-3 md:mx-6 whitespace-nowrap flex-shrink-0">
                <div className="relative w-8 h-6 xs:w-10 xs:h-8 md:w-12 md:h-10 flex items-center justify-center">
                  <Image 
                    src={`/${brand.logo}`}
                    alt={`${brand.name} logo`} 
                    width={48}
                    height={32}
                    className="w-full h-full object-contain opacity-95 hover:opacity-100 transition-opacity duration-300" 
                    priority={index < 8}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navegación Principal - Mobile First Optimizada */}
        <nav className="container mx-auto px-3 xs:px-4 py-2.5 xs:py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo: símbolo + texto para tipografía consistente */}
            <div className="flex items-center gap-2">
              <Image
                src="/landing/logofmcsimple.svg"
                alt="FMC"
                width={36}
                height={36}
                className="h-6 w-6 xs:h-8 xs:w-8 md:h-10 md:w-10"
                priority
              />
              <span className="text-white font-acto-bold tracking-wide text-xs xs:text-sm md:text-base leading-tight">
                FORMOSA MOTO CRÉDITO
              </span>
            </div>

            {/* Desktop Navigation - solo accesos rápidos */}
            <div className="hidden lg:flex items-center space-x-2 text-sm font-acto" data-aos="fade-down" data-aos-delay="150">
              <div className="flex items-center gap-2">
                <a
                  href="#tasas"
                  className="inline-flex items-center rounded-full bg-white/10 border border-white/20 text-white px-4 py-2 shadow-sm hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/40 transition-transform duration-200 ease-out hover:-translate-y-[1px] active:scale-[0.98]"
                >
                  Tasas
                </a>
                <a
                  href="#solicitud"
                  className="inline-flex items-center rounded-full bg-fmc-green text-white px-4 py-2 shadow-lg hover:bg-fmc-green/90 focus-visible:ring-2 focus-visible:ring-fmc-green/40 transition-transform duration-200 ease-out hover:-translate-y-[1px] active:scale-[0.98]"
                >
                  Crédito
                </a>
                <a
                  href="#testimonios"
                  className="inline-flex items-center rounded-full bg-white/10 border border-white/20 text-white px-4 py-2 shadow-sm hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/40 transition-transform duration-200 ease-out hover:-translate-y-[1px] active:scale-[0.98]"
                >
                  Testimonios
                </a>
              </div>
            </div>

            {/* Mobile User Icon - Visible only on mobile/tablet */}
            <div className="flex lg:hidden items-center gap-2">
              <Link 
                href="/auth/signin"
                className="text-white hover:text-fmc-green transition-colors duration-300 p-2"
                aria-label="Iniciar sesión"
              >
                <UserCircle className="w-6 h-6" />
              </Link>
            </div>

            {/* Desktop Social Icons */}
            <div className="hidden md:flex items-center space-x-3">
              <Link 
                href="/auth/signin"
                className="text-white hover:text-fmc-green transition-all duration-300 transform hover:scale-110"
                aria-label="Iniciar sesión"
              >
                <UserCircle className="w-4 h-4 md:w-5 md:h-5" />
              </Link>
              <a href="https://wa.me/543704069592" target="_blank" rel="noopener noreferrer" className="text-white hover:text-fmc-green transition-all duration-300 transform hover:scale-110">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/formosa.moto.credito/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-fmc-green transition-all duration-300 transform hover:scale-110">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-white hover:text-fmc-green transition-colors duration-300 p-1.5 xs:p-2"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 xs:w-6 xs:h-6" /> : <Menu className="w-5 h-5 xs:w-6 xs:h-6" />}
            </button>
          </div>

          {/* Mobile Menu Dropdown - Optimizado */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-3 xs:mt-4 pb-3 xs:pb-4 border-t border-white/20">
              <div className="flex flex-col space-y-3 xs:space-y-4 pt-3 xs:pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <a href="#tasas" className="text-white bg-white/10 border border-white/20 rounded-md py-2 text-center hover:bg-white/20">Tasas</a>
                  <a href="#solicitud" className="text-white bg-fmc-green rounded-md py-2 text-center hover:bg-fmc-green/90">Crédito</a>
                  <a href="#testimonios" className="text-white bg-white/10 border border-white/20 rounded-md py-2 text-center hover:bg-white/20">Testimonios</a>
                  <Link href="/auth/signin" className="text-white bg-white/10 border border-white/20 rounded-md py-2 text-center hover:bg-white/20 inline-flex items-center justify-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Iniciar Sesión
                  </Link>
                </div>
                <div className="flex items-center space-x-4 pt-2 md:hidden">
                  <a href="https://wa.me/543704069592" target="_blank" rel="noopener noreferrer" className="text-white hover:text-fmc-green transition-all duration-300">
                    <svg className="w-5 h-5 xs:w-6 xs:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516z"/>
                    </svg>
                  </a>
                  <a href="https://www.instagram.com/formosa.moto.credito/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-fmc-green transition-all duration-300">
                    <svg className="w-5 h-5 xs:w-6 xs:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Separador para compensar el header fijo y evitar solapado en el Hero */}
      <div aria-hidden="true" style={{ height: headerHeight || 72 }} />

      {/* Hero Section Optimizado */}
      <Hero />

      {/* Beneficios - Optimizado para móvil */}
      <section id="nosotros" className="py-12 xs:py-16 md:py-20 bg-gray-900 text-white relative scroll-mt-24">
        <div id="tasas" className="absolute -top-24 h-0" aria-hidden="true" />
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 xs:gap-12 items-center">
            {/* Imagen lado izquierdo - Optimizada para móvil */}
            <div className="relative fade-in-up rounded-2xl overflow-hidden shadow-xl order-2 lg:order-1">
              <div className="fmc-bg-2 md:fmc-bg-4 w-full h-[280px] xs:h-[320px] md:h-[440px]"></div>
              <div className="absolute inset-0 fmc-bg-gradient"></div>
              <div className="absolute top-3 xs:top-4 right-3 xs:right-4 w-12 h-12 xs:w-16 xs:h-16 rounded-2xl flex items-center justify-center bg-gradient-fmc-primary shadow-md">
                <Image src="/landing/logofmcsimple.svg" alt="FMC" width={32} height={32} className="w-6 h-6 xs:w-8 xs:h-8" />
              </div>
              
              {/* Bento Grid con información de financiación - Optimizado */}
              <div className="absolute inset-3 xs:inset-4 flex flex-col gap-2 xs:gap-3">
                <div className="grid grid-cols-2 gap-2 xs:gap-3 h-full">
                  {/* Tasa fija */}
                  <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all duration-300">
                    <CardContent className="p-2 xs:p-3 md:p-4 flex flex-col justify-center items-center text-center h-full">
                      <Percent className="w-4 h-4 xs:w-5 xs:h-5 md:w-6 md:h-6 text-white mb-1 xs:mb-2" />
                      <h3 className="text-white font-acto-bold text-xs xs:text-sm">Tasa fija</h3>
                      <p className="text-white/90 font-acto-semibold text-sm xs:text-base md:text-lg">75%</p>
                    </CardContent>
                  </Card>
                  
                  {/* Tasa UVA */}
                  <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all duration-300">
                    <CardContent className="p-2 xs:p-3 md:p-4 flex flex-col justify-center items-center text-center h-full">
                      <TrendingUp className="w-4 h-4 xs:w-5 xs:h-5 md:w-6 md:h-6 text-white mb-1 xs:mb-2" />
                      <h3 className="text-white font-acto-bold text-xs xs:text-sm">Tasa UVA:</h3>
                      <p className="text-white/90 font-acto-semibold text-xs xs:text-sm">20% + UVAs</p>
                    </CardContent>
                  </Card>
                  
                  {/* Financiación */}
                  <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all duration-300 col-span-2">
                    <CardContent className="p-2 xs:p-3 md:p-4 flex items-center justify-center text-center h-full">
                      <Wallet className="w-4 h-4 xs:w-5 xs:h-5 md:w-6 md:h-6 text-white mr-2 xs:mr-3" />
                      <div>
                        <h3 className="text-white font-acto-bold text-xs xs:text-sm">Financiación</h3>
                        <p className="text-white/90 font-acto-semibold text-sm xs:text-base">hasta $12.000.000</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Contenido de beneficios - Optimizado */}
            <div className="space-y-4 xs:space-y-6 about__inner fade-in-up order-1 lg:order-2">
              <h2 className="text-2xl xs:text-3xl font-acto-bold leading-tight">
                Con los mejores créditos, <span className="text-fmc-blue">la moto de tus sueños</span>{" "}
                <span className="text-fmc-green">está a solo un paso.</span>
              </h2>
              <p className="text-lg xs:text-xl text-fmc-green font-acto-semibold">¡Hacelo realidad hoy!</p>

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
      </section>

      {/* Credit Application Form */}
      <div id="solicitud" className="scroll-mt-24">
        <CreditForm />
      </div>

      {/* Customer Testimonials */}
      <div id="testimonios" className="scroll-mt-24">
        <Testimonials />
      </div>

      {/* Associated Dealers Section (con filtro y carrusel) */}
      <div id="concesionarios" className="scroll-mt-24">
        <DealersSection />
      </div>

      {/* CTA Final (compacto) */}
      <section
        className="relative overflow-hidden fmc-bg-3 py-20"
        style={{ backgroundPosition: 'center 22%' }}
        data-aos="fade-up"
        data-aos-delay="100"
      >
        {/* Overlay para legibilidad */}
        <div className="absolute inset-0 fmc-bg-gradient" aria-hidden="true" />
        <div className="relative container mx-auto px-4">
          <div className="grid grid-cols-1 gap-12 place-items-center">
            {/* Contenido: cierre de CTA */}
            <div className="space-y-5 text-center" data-aos="zoom-in" data-aos-delay="150">
              <div className="flex items-center justify-center mx-auto">
                <img src="/landing/logofmcsimple.svg" alt="FMC" className="h-10 w-auto" />
              </div>
              <h2 className="text-4xl lg:text-5xl font-acto-bold leading-tight text-white">¿Listo para tu moto?</h2>
              <p className="text-lg lg:text-xl font-acto-regular text-white/95">
                Tasas competitivas y aprobación rápida. Empezá hoy y llevate tu 0km.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button asChild variant="default" size="lg" className="font-acto-bold bg-fmc-green hover:bg-fmc-green/90">
                  <a href="#solicitud">Solicitar crédito</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="font-acto-bold border-white text-white hover:bg-white hover:text-fmc-purple">
                  <a href="https://wa.me/543704069592" target="_blank" rel="noopener noreferrer">Hablar por WhatsApp</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
