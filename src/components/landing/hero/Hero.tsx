"use client";

import { useEffect, useState } from "react";
import { useParallax } from "./useParallax";
import { getHeroImages } from "@/lib/landing-images";
import type { HeroProps } from "./types";
import { Button } from "@/components/ui/button";

export default function Hero({ className = "" }: HeroProps) {
  const { bgRef, fgRef } = useParallax({ 
    bgSpeed: 0.12, 
    fgSpeed: 0.28 
  });

  // Evitar mismatch de hidratación: usar versión 1 por defecto en SSR y
  // decidir según dispositivo y versión aleatoria sólo después del montaje en el cliente.
  const [images, setImages] = useState({
    background: "/landing/hero/hero-bg-desktop-1.svg",
    foreground: "",
    titule: "/landing/hero/hero-titule-desktop.svg",
    text: "/landing/hero/hero-text-desktop.svg"
  });

  useEffect(() => {
    const nextImages = getHeroImages();
    // Mezclar con el estado previo para no perder 'titule' y 'text'
    setImages(prev => ({ ...prev, ...nextImages }));
  }, []);

  return (
    <section 
      className={`relative min-h-screen overflow-hidden pb-16 sm:pb-20 md:pb-0 pt-[60px] sm:pt-[70px] md:pt-[120px] lg:pt-[150px] ${className}`}
      style={{
        minHeight: 'calc(100vh - var(--header-offset, 72px))'
      }}
    >
      {/* Background Layer */}
      <div 
        ref={bgRef}
        className="absolute inset-0 will-change-transform"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <img
          src={images.background}
          alt=""
          className="w-full h-full object-cover md:object-cover md:object-right"
          loading="eager"
        />
      </div>

      {/* Overlay morado/gradiente para legibilidad - según mockups */}
      {/* Gradiente diagonal desde la parte inferior izquierda usando fmc-purple */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ 
          zIndex: 5,
          background: 'linear-gradient(to top right, rgba(91, 0, 234, 0.6) 0%, rgba(91, 0, 234, 0.4) 30%, rgba(91, 0, 234, 0.2) 50%, transparent 70%)'
        }}
        aria-hidden="true"
      />

      {/* Foreground Layer (deshabilitado: moto integrada en background) */}
      {images.foreground && (
        <div 
          ref={fgRef}
          className="absolute inset-0 pointer-events-none flex items-center justify-end transform translate-x-0 md:-translate-x-20 translate-y-8 sm:translate-y-10 md:translate-y-0"
          style={{
            zIndex: 10,
            paddingBottom: '15%'
          }}
          aria-hidden="true"
        >
          <img
            src={images.foreground}
            alt="Persona en motocicleta"
            className="object-contain object-right"
            style={{
              display: 'block',
              maxWidth: '85%',
              maxHeight: '90%',
              width: 'auto',
              height: 'auto'
            }}
            loading="eager"
          />
        </div>
      )}

      {/* Titule + Text Layer - Título y texto posicionados a la izquierda */}
      <div 
        className="absolute inset-0 pointer-events-none flex flex-col items-start justify-start"
        style={{ zIndex: 20 }}
        aria-hidden="true"
      >
        <div className="w-full sm:w-[85%] md:w-[50%] lg:w-[45%] max-w-[90%] sm:max-w-[80%] md:max-w-[55%] lg:max-w-[50%] px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 pt-6 sm:pt-12 md:pt-20 lg:pt-24 xl:pt-28">
          {/* Título principal */}
          <img
            src={images.titule}
            alt="Si cobrás tu sueldo en Banco Formosa, accedé al crédito inmediato"
            className="object-contain object-left-top w-full h-auto"
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: 'clamp(250px, 50vh, 600px)',
              width: 'auto',
              height: 'auto'
            }}
            loading="eager"
          />

          {/* Botones CTA - clickeables y ubicados antes de la caja blanca */}
          <div className="pointer-events-auto mt-6 sm:mt-8 md:mt-10 self-center">
            <div className="flex flex-col items-stretch gap-3 w-full max-w-[200px]">
              {/* Botón principal blanco con texto violeta (full width) */}
              <Button asChild size="lg" className="w-full font-acto-bold bg-white text-fmc-purple hover:bg-white/90 rounded-full">
                <a href="#solicitud">Solicitar crédito</a>
              </Button>
              {/* Botón WhatsApp verde (full width) */}
              <Button asChild size="lg" className="w-full font-acto-bold bg-fmc-green text-white hover:bg-fmc-green/90 rounded-full">
                <a href="https://wa.me/543704069592" target="_blank" rel="noopener noreferrer">WhatsApp</a>
              </Button>
            </div>
          </div>
          
          {/* Texto adicional debajo del título - más pequeño y más abajo */}
          <img
            src={images.text}
            alt="Pedí tu crédito en minutos y financiá el valor de tu vehículo sin complicaciones"
            className="object-contain object-left-top h-auto mt-[220px] sm:mt-[240px] md:mt-8 w-[60%] sm:w-[65%] md:w-auto"
            style={{
              display: 'block',
              maxHeight: 'clamp(120px, 25vh, 280px)',
              width: 'auto',
              height: 'auto'
            }}
            loading="eager"
          />
        </div>
      </div>

    </section>
  );
}