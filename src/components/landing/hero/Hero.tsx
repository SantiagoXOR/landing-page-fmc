"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useParallax } from "./useParallax";
import { getHeroImages } from "@/lib/landing-images";
import type { HeroProps } from "./types";

export default function Hero({ className = "" }: HeroProps) {
  const { bgRef, fgRef } = useParallax({ 
    bgSpeed: 0.12, 
    fgSpeed: 0.28 
  });

  // Evitar mismatch de hidratación: usar imágenes de escritorio en SSR y
  // decidir según dispositivo sólo después del montaje en el cliente.
  const [images, setImages] = useState({
    background: "/landing/hero/hero-bg-desktop.jpg",
    foreground: "/landing/hero/hero-fg-desktop.png",
  });
  const [bgObjectPosition, setBgObjectPosition] = useState<string>("center center")

  useEffect(() => {
    const nextImages = getHeroImages();
    setImages(nextImages);

    const updateBgPosition = () => {
      const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
      // Subimos el fondo en mobile para acercar la sombra
      setBgObjectPosition(isMobile ? 'center 0%' : 'center center')
    }
    updateBgPosition()
    window.addEventListener('resize', updateBgPosition)
    return () => window.removeEventListener('resize', updateBgPosition)
  }, []);

  return (
    <section className={`relative min-h-screen overflow-hidden pb-16 sm:pb-20 md:pb-0 ${className}`}>
      {/* Background Layer */}
      <div 
        ref={bgRef}
        className="absolute inset-0 will-change-transform z-0"
        aria-hidden="true"
      >
        <Image
          src={images.background}
          alt=""
          fill
          priority
          className="object-cover object-center"
          style={{
            objectPosition: bgObjectPosition,
            objectFit: 'cover'
          }}
          sizes="100vw"
          quality={85}
        />
      </div>

      {/* Overlay para legibilidad en móviles */}
      <div
        className="absolute inset-0 z-5 pointer-events-none bg-gradient-to-tr from-black/60 via-black/35 to-transparent sm:from-black/40 sm:via-black/25"
        aria-hidden="true"
      />

      <div className="relative flex flex-col md:contents">
      {/* Foreground Layer (motorcycle/person) - Arriba en mobile */}
      <div className="order-2 md:order-none static md:absolute md:bottom-0 will-change-transform pointer-events-auto z-20
                      w-[100vw] sm:w-[80vw] md:w-[55vw] lg:w-[50vw] xl:w-[35vw]
                       md:right-[2vw] lg:right-[5vw] xl:right-[18vw]
                      mx-auto md:mx-0 flex justify-center items-start md:items-end md:justify-end group pt-0 sm:pt-2 translate-y-[24px] sm:translate-y-[18px] md:translate-y-[28px] translate-x-[14px] sm:translate-x-[16px] md:translate-x-0">
        <Image
          ref={fgRef}
          src={images.foreground}
          alt=""
          width={800}
          height={1200}
          className="w-full h-auto select-none object-contain 
                     max-h-[64vh] sm:max-h-[56vh] md:max-h-[85vh] lg:max-h-none
                     transition-all duration-700 ease-out
                     hover:scale-105 hover:brightness-110 hover:drop-shadow-2xl
                     group-hover:rotate-1"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 80vw, (max-width: 1024px) 55vw, (max-width: 1280px) 50vw, 35vw"
          quality={90}
        />
      </div>

      {/* Botones Mobile bajo la moto */}
  <div className="order-3 md:hidden relative z-30 mb-10 sm:mb-12" data-aos="fade-up" data-aos-delay="120">
    <div className="max-w-[86vw] sm:max-w-[80vw] px-4 sm:px-6 mx-auto mt-2 sm:mt-3">
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4">
        <Button asChild variant="default" size="lg" className="font-acto-bold w-full sm:w-auto">
          <a href="#solicitar-credito">SOLICITÁ TU CRÉDITO AHORA</a>
        </Button>
        <Button asChild variant="outline" size="lg" className="font-acto-bold w-full sm:w-auto">
          <a href="https://wa.me/5493704069592" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
            HABLÁ CON UN ASESOR
          </a>
        </Button>
      </div>
    </div>
  </div>

      {/* Content Layer - Título en 4 líneas, bajada y botones */}
      <div
        className="order-1 md:order-none relative z-30 h-full flex items-start md:items-center justify-start md:pl-16 lg:pl-24 xl:pl-32"
        style={{ paddingTop: '0px' }}
      >
        <div className="max-w-[86vw] sm:max-w-[80vw] md:max-w-lg lg:max-w-xl xl:max-w-2xl 
                        px-4 sm:px-6 md:px-12 md:ml-8 lg:ml-12 xl:ml-16 text-left">
          
          {/* Título en 4 líneas con espaciado correcto y más prominente en mobile */}
          <h1 className="text-white font-acto-black tracking-tight
                         text-3xl sm:text-4xl md:text-4xl lg:text-5xl
                         leading-[1.15] md:leading-tight mb-4 sm:mb-6" data-aos="fade-right" data-aos-delay="100">
            Si cobrás tu sueldo en
            <br />
            <span className="text-emerald-400">Banco Formosa</span>, accedé
            <br />
            al crédito inmediato
            <br />
            para tu <span className="text-sky-300">0km</span>
          </h1>
          
          {/* Párrafo más prominente en mobile */}
          <p className="text-white/90 text-base sm:text-lg md:text-lg font-acto-regular
                        mb-6 sm:mb-8 max-w-[80vw] sm:max-w-none" data-aos="fade-right" data-aos-delay="160">
            Pedí tu crédito en minutos y financiá el valor de tu vehículo sin complicaciones.
          </p>
          
          {/* Botones optimizados para móvil (ocultos en mobile, visibles en desktop) */}
          <div className="hidden md:flex flex-col sm:flex-row gap-2.5 sm:gap-4 mt-2 sm:mt-3" data-aos="fade-up" data-aos-delay="180">
            <Button asChild variant="default" size="lg" className="font-acto-bold w-full sm:w-auto">
              <a href="#solicitar-credito">SOLICITÁ TU CRÉDITO AHORA</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="font-acto-bold w-full sm:w-auto">
              <a
              href="https://wa.me/5493704069592"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 
                         bg-fmc-green hover:bg-green-600 text-white font-acto-bold 
                         h-11 sm:h-12 px-5 sm:px-6 rounded-md shadow-md w-full sm:w-auto 
                         transition-colors duration-200 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              HABLÁ CON UN ASESOR
            </a>
            </Button>
          </div>
        </div>
      </div>

      </div>
    </section>
  );
}