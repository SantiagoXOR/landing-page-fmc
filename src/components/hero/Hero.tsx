"use client";

import Image from "next/image";
import { useParallax } from "./useParallax";
import { getHeroImages } from "../../lib/images";
import type { HeroProps } from "./types";

export default function Hero({ className = "" }: HeroProps) {
  const { bgRef, fgRef } = useParallax({ 
    bgSpeed: 0.12, 
    fgSpeed: 0.28 
  });

  const { background: bgSrc, foreground: fgSrc } = getHeroImages();

  return (
    <section className={`relative h-screen overflow-hidden ${className}`}>
      {/* Background Layer */}
      <div 
        ref={bgRef}
        className="absolute inset-0 will-change-transform"
        aria-hidden="true"
      >
        <Image
          src={bgSrc}
          alt=""
          fill
          priority
          className="object-cover object-center"
          style={{
            objectPosition: 'center center',
            objectFit: 'cover'
          }}
          sizes="100vw"
          quality={85}
        />
      </div>

      {/* Foreground Layer (motorcycle/person) - Optimizado para móvil */}
      <div className="absolute bottom-0 will-change-transform pointer-events-auto 
                      w-[85vw] sm:w-[75vw] md:w-[55vw] lg:w-[50vw] xl:w-[35vw]
                      right-[7.5vw] sm:right-[12.5vw] md:right-[2vw] lg:right-[5vw] xl:right-[18vw]
                      flex justify-center items-end md:justify-end group">
        <Image
          ref={fgRef}
          src={fgSrc}
          alt=""
          width={800}
          height={1200}
          className="w-full h-auto select-none object-contain 
                     max-h-[50vh] sm:max-h-[60vh] md:max-h-[85vh] lg:max-h-none
                     transition-all duration-700 ease-out
                     hover:scale-105 hover:brightness-110 hover:drop-shadow-2xl
                     group-hover:rotate-1"
          sizes="(max-width: 640px) 85vw, (max-width: 768px) 75vw, (max-width: 1024px) 55vw, (max-width: 1280px) 50vw, 35vw"
          quality={90}
        />
      </div>

      {/* Content Layer - Optimizado para móvil */}
      <div className="relative z-10 h-full flex items-start md:items-center justify-start 
                      pt-16 sm:pt-20 md:pt-20 md:pl-16 lg:pl-24 xl:pl-32">
        <div className="max-w-[88vw] sm:max-w-[82vw] md:max-w-lg lg:max-w-xl xl:max-w-2xl 
                        px-3 sm:px-5 md:px-12 md:ml-8 lg:ml-12 xl:ml-16 text-left">
          
          {/* Título optimizado para móvil */}
          <h1 className="text-white font-extrabold leading-[1.05] md:leading-tight
                         text-2xl sm:text-3xl md:text-5xl lg:text-6xl
                         mb-3 sm:mb-5">
            Si cobrás tu sueldo en{" "}
            <span className="text-emerald-400">Banco Formosa</span>, accedé
            al crédito inmediato para tu{" "}
            <span className="text-sky-300">0km</span>
          </h1>
          
          {/* Párrafo optimizado */}
          <p className="text-white/90 text-sm sm:text-base md:text-xl
                        mb-5 sm:mb-7 max-w-[82vw] sm:max-w-none">
            Pedí tu crédito en minutos y financiá el valor de tu vehículo sin complicaciones.
          </p>
          
          {/* Botones optimizados para móvil */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <a
              href="#concesionarios"
              className="inline-block bg-fmc-blue hover:bg-blue-600 text-white font-semibold 
                         px-5 sm:px-8 py-2.5 sm:py-4 rounded-lg shadow-lg 
                         transition-colors duration-200 text-center text-xs sm:text-base
                         min-w-[260px] sm:min-w-auto"
            >
              SOLICITÁ TU CRÉDITO AHORA
            </a>
            <a
              href="https://wa.me/543704123456"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 
                         bg-fmc-green hover:bg-green-600 text-white font-semibold 
                         px-5 sm:px-8 py-2.5 sm:py-4 rounded-lg shadow-lg 
                         transition-colors duration-200 text-xs sm:text-base
                         min-w-[260px] sm:min-w-auto"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              HABLÁ CON UN ASESOR
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}