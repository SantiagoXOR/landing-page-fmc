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

      {/* Foreground Layer (motorcycle/person) */}
      <div className="absolute bottom-0 w-[85vw] sm:w-[75vw] md:w-[55vw] lg:w-[50vw] xl:w-[35vw] will-change-transform pointer-events-auto 
                      right-[7.5vw] sm:right-[12.5vw] md:right-[2vw] lg:right-[5vw] xl:right-[18vw]
                      flex justify-center items-end md:justify-end group">
        <Image
          ref={fgRef}
          src={fgSrc}
          alt=""
          width={800}
          height={1200}
          className="w-full h-auto select-none object-contain max-h-[60vh] sm:max-h-[70vh] md:max-h-[90vh] lg:max-h-none
                     transition-all duration-700 ease-out
                     hover:scale-105 hover:brightness-110 hover:drop-shadow-2xl
                     group-hover:rotate-1"
          sizes="(max-width: 640px) 85vw, (max-width: 768px) 75vw, (max-width: 1024px) 55vw, (max-width: 1280px) 50vw, 35vw"
          quality={90}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 h-full flex items-start md:items-center justify-start md:justify-start md:pl-16 lg:pl-24 xl:pl-32 pt-20 md:pt-0">
        <div className="max-w-2xl md:max-w-lg lg:max-w-xl xl:max-w-2xl px-6 md:px-12 md:ml-8 lg:ml-12 xl:ml-16 text-left md:text-left">
          <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
            Si cobrás tu sueldo en{" "}
            <span className="text-emerald-400">Banco Formosa</span>, accedé
            al crédito inmediato para tu{" "}
            <span className="text-sky-300">0km</span>
          </h1>
          <p className="mt-4 text-white/90 md:text-lg">
            Pedí tu crédito en minutos y financiá el valor de tu vehículo sin complicaciones.
          </p>
          <a
            href="#concesionarios"
            className="mt-6 inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors duration-200"
          >
            SOLICITÁ TU CRÉDITO AHORA
          </a>
          {/* Rates info chips */}
          <div className="mt-4 flex flex-col gap-2 md:flex-row md:flex-wrap">
            <span className="inline-flex items-center rounded-md bg-white/10 border border-white/20 px-3 py-1 text-white text-sm md:text-base backdrop-blur-sm">
              Tasa fija 75%
            </span>
            <span className="inline-flex items-center rounded-md bg-white/10 border border-white/20 px-3 py-1 text-white text-sm md:text-base backdrop-blur-sm">
              Tasa UVA: 20% + UVAs
            </span>
            <span className="inline-flex items-center rounded-md bg-white/10 border border-white/20 px-3 py-1 text-white text-sm md:text-base backdrop-blur-sm">
              Financiación hasta $12.000.000
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}