import { useCallback, useRef } from 'react'

const MIN_WIDTH = 400
const MIN_HEIGHT = 300

interface UseResizeOptions {
  onResize: (width: number, height: number) => void
  onResizeStart?: () => void
}

export function useResize({ onResize, onResizeStart }: UseResizeOptions) {
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0 })

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      const rect = target.closest('[data-window]') as HTMLElement
      if (!rect) return

      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: rect.offsetWidth,
        h: rect.offsetHeight,
      }

      onResizeStart?.()

      const onMove = (ev: PointerEvent) => {
        const w = Math.max(MIN_WIDTH, startRef.current.w + (ev.clientX - startRef.current.x))
        const h = Math.max(MIN_HEIGHT, startRef.current.h + (ev.clientY - startRef.current.y))
        onResize(w, h)
      }

      const onUp = () => {
        target.removeEventListener('pointermove', onMove)
        target.removeEventListener('pointerup', onUp)
      }

      target.addEventListener('pointermove', onMove)
      target.addEventListener('pointerup', onUp)
    },
    [onResize, onResizeStart],
  )

  return { onPointerDown }
}
