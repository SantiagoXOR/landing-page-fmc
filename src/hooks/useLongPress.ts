import { useRef, useCallback } from 'react'

interface UseLongPressOptions {
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void
  delay?: number
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500
}: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const targetRef = useRef<EventTarget>()
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const hasMovedRef = useRef(false)

  // Función para cancelar el long press manualmente
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
    startPosRef.current = null
    hasMovedRef.current = false
  }, [])

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    targetRef.current = e.target
    hasMovedRef.current = false
    
    // Guardar posición inicial
    if ('clientX' in e) {
      startPosRef.current = { x: e.clientX, y: e.clientY }
    } else if (e.touches && e.touches.length > 0) {
      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    
    timeoutRef.current = setTimeout(() => {
      if (!hasMovedRef.current) {
        onLongPress(e)
      }
    }, delay)
  }, [onLongPress, delay])

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!startPosRef.current) return
    
    let currentX = 0
    let currentY = 0
    
    if ('clientX' in e) {
      currentX = e.clientX
      currentY = e.clientY
    } else if (e.touches && e.touches.length > 0) {
      currentX = e.touches[0].clientX
      currentY = e.touches[0].clientY
    }
    
    // Si se movió más de 5px, considerar que es un drag
    const distance = Math.sqrt(
      Math.pow(currentX - startPosRef.current.x, 2) + 
      Math.pow(currentY - startPosRef.current.y, 2)
    )
    
    if (distance > 5) {
      hasMovedRef.current = true
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const clear = useCallback((e: React.MouseEvent | React.TouchEvent, shouldTriggerClick = false) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (shouldTriggerClick && onClick && targetRef.current === e.target && !hasMovedRef.current) {
      onClick(e)
    }
    startPosRef.current = null
    hasMovedRef.current = false
  }, [onClick])

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseMove: handleMove,
    onTouchMove: handleMove,
    onMouseUp: (e: React.MouseEvent) => clear(e, true),
    onMouseLeave: clear,
    onTouchEnd: (e: React.TouchEvent) => clear(e, true),
    cancel, // Exponer función para cancelar manualmente
  }
}

