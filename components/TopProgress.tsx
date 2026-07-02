'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Barra fina de progreso (2px, ámbar) arriba de la pantalla.
 * Arranca cuando el usuario clickea un link interno y termina
 * cuando cambia el pathname (la nueva pantalla ya montó).
 */
export default function TopProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stop() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement).closest('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || !href.startsWith('/') || a.target === '_blank') return
      // Navegación al mismo path no dispara cambio de pathname
      if (href.split('#')[0].split('?')[0] === window.location.pathname) return

      stop()
      setVisible(true)
      setWidth(12)
      timerRef.current = setInterval(() => {
        // Avanza rápido al principio y se frena cerca del final
        setWidth(w => (w >= 90 ? w : w + Math.max(0.5, (90 - w) * 0.08)))
      }, 120)
    }
    document.addEventListener('click', onClick)
    return () => { document.removeEventListener('click', onClick); stop() }
  }, [])

  // Cuando cambia la ruta, completar y desvanecer
  useEffect(() => {
    if (!visible) return
    stop()
    setWidth(100)
    const t = setTimeout(() => { setVisible(false); setWidth(0) }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <div aria-hidden style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 9999,
      pointerEvents: 'none', opacity: visible ? 1 : 0, transition: 'opacity 250ms ease',
    }}>
      <div style={{
        height: '100%', width: `${width}%`,
        background: 'linear-gradient(90deg, var(--amber), var(--amber2))',
        boxShadow: '0 0 8px rgba(232,164,74,0.6)',
        transition: 'width 200ms ease-out',
      }} />
    </div>
  )
}
