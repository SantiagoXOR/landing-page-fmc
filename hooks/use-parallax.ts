"use client"

import { useEffect, useRef } from 'react'

export function useParallax() {
  const bgRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset
      const rate = scrolled * -0.5
      const rateFg = scrolled * -0.3

      if (bgRef.current) {
        bgRef.current.style.transform = `translate3d(0, ${rate}px, 0)`
      }
      
      if (fgRef.current) {
        fgRef.current.style.transform = `translate3d(0, ${rateFg}px, 0)`
      }
    }

    // Throttle scroll events for better performance
    let ticking = false
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', throttledHandleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll)
    }
  }, [])

  return { bgRef, fgRef }
}