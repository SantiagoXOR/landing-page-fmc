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

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    targetRef.current = e.target
    timeoutRef.current = setTimeout(() => {
      onLongPress(e)
    }, delay)
  }, [onLongPress, delay])

  const clear = useCallback((e: React.MouseEvent | React.TouchEvent, shouldTriggerClick = false) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (shouldTriggerClick && onClick && targetRef.current === e.target) {
      onClick(e)
    }
  }, [onClick])

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: (e: React.MouseEvent) => clear(e, true),
    onMouseLeave: clear,
    onTouchEnd: (e: React.TouchEvent) => clear(e, true),
  }
}

