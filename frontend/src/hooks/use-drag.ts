import { useCallback, useRef } from 'react'

interface UseDragOptions {
  onDrag: (x: number, y: number) => void
  onDragStart?: () => void
}

export function useDrag({ onDrag, onDragStart }: UseDragOptions) {
  const offsetRef = useRef({ x: 0, y: 0 })

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Don't capture drag when clicking buttons or interactive elements
      const target = e.target as HTMLElement
      if (target.closest('button, input, select, a')) return

      e.preventDefault()
      const bar = e.currentTarget as HTMLElement
      bar.setPointerCapture(e.pointerId)

      const rect = bar.closest('[data-window]') as HTMLElement
      if (!rect) return

      offsetRef.current = {
        x: e.clientX - rect.offsetLeft,
        y: e.clientY - rect.offsetTop,
      }

      onDragStart?.()

      const onMove = (ev: PointerEvent) => {
        const x = Math.max(0, ev.clientX - offsetRef.current.x)
        const y = Math.max(0, ev.clientY - offsetRef.current.y)
        onDrag(x, y)
      }

      const onUp = () => {
        bar.removeEventListener('pointermove', onMove)
        bar.removeEventListener('pointerup', onUp)
      }

      bar.addEventListener('pointermove', onMove)
      bar.addEventListener('pointerup', onUp)
    },
    [onDrag, onDragStart],
  )

  return { onPointerDown }
}
