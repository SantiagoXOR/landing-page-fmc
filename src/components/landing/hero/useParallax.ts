import { useEffect, useRef } from "react";
import type { ParallaxOptions, ParallaxRefs } from "./types";

export function useParallax({ 
  bgSpeed = 0.15, 
  fgSpeed = 0.35 
}: ParallaxOptions = {}): ParallaxRefs {
  const bgRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<HTMLImageElement | null>(null);
  const ticking = useRef(false);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = typeof window !== "undefined" && 
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // If user prefers reduced motion, disable parallax
    if (prefersReducedMotion) {
      return;
    }

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        
        if (bgRef.current) {
          bgRef.current.style.transform = `translateY(${y * bgSpeed}px)`;
        }
        
        if (fgRef.current) {
          // Para el foreground, aplicamos efectos sutiles sin desplazamiento vertical
          const scrollProgress = Math.min(y / window.innerHeight, 1);
          const scaleEffect = 1 + (scrollProgress * 0.05); // Escala sutil del 0% al 5%
          const rotateEffect = scrollProgress * 2; // Rotación sutil de 0 a 2 grados
          const brightnessEffect = 1 + (scrollProgress * 0.1); // Brillo sutil del 100% al 110%
          
          fgRef.current.style.transform = `scale(${scaleEffect}) rotate(${rotateEffect}deg)`;
          fgRef.current.style.filter = `brightness(${brightnessEffect})`;
        }
        
        ticking.current = false;
      });
    };

    // Initial call
    onScroll();
    
    // Add passive listener for better performance
    window.addEventListener("scroll", onScroll, { passive: true });
    
    return () => window.removeEventListener("scroll", onScroll);
  }, [bgSpeed, fgSpeed]);

  return { bgRef, fgRef };
}