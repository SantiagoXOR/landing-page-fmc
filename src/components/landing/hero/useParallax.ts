import { useEffect, useRef } from "react";
import type { ParallaxOptions, ParallaxRefs } from "./types";

export function useParallax({ 
  bgSpeed = 0.15, 
  fgSpeed = 0.35 
}: ParallaxOptions = {}): ParallaxRefs {
  const bgRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<HTMLDivElement | null>(null);
  const ticking = useRef(false);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = typeof window !== "undefined" && 
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // If user prefers reduced motion, disable parallax
    if (prefersReducedMotion) {
      return;
    }

    // Asegurar que el contenedor foreground esté completamente estático desde el inicio
    if (fgRef.current) {
      fgRef.current.style.setProperty('transform', 'none', 'important');
      fgRef.current.style.setProperty('position', 'absolute', 'important');
      fgRef.current.style.setProperty('will-change', 'auto', 'important');
      fgRef.current.style.setProperty('top', '0', 'important');
      fgRef.current.style.setProperty('left', '0', 'important');
      fgRef.current.style.setProperty('right', '0', 'important');
      fgRef.current.style.setProperty('bottom', '0', 'important');
    }

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        
        if (bgRef.current) {
          bgRef.current.style.transform = `translateY(${y * bgSpeed}px)`;
        }
        
        // Foreground: Completamente estático - sin parallax ni transformaciones
        // Forzar que permanezca fijo sin importar el scroll
        if (fgRef.current) {
          fgRef.current.style.setProperty('transform', 'none', 'important');
          fgRef.current.style.setProperty('position', 'absolute', 'important');
          fgRef.current.style.setProperty('will-change', 'auto', 'important');
          fgRef.current.style.setProperty('top', '0', 'important');
          fgRef.current.style.setProperty('left', '0', 'important');
          fgRef.current.style.setProperty('right', '0', 'important');
          fgRef.current.style.setProperty('bottom', '0', 'important');
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