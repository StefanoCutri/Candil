'use client'

import { useEffect, useRef } from 'react'

const COLORES = ['#E8A44A', '#F5C97A', '#FFE3B0', '#8BB4A0', '#C896DC']

type Particula = {
  x: number; y: number
  vx: number; vy: number
  rot: number; vrot: number
  w: number; h: number
  color: string
  vida: number
}

/**
 * Confetti liviano en canvas, sin dependencias. Se dispara una vez al montar
 * y se limpia solo cuando terminan las partículas.
 */
export default function Confetti({ cantidad = 90, duracionMs = 2600 }: { cantidad?: number; duracionMs?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    // Dos ráfagas desde abajo, a los costados del centro
    const particulas: Particula[] = []
    for (let i = 0; i < cantidad; i++) {
      const izquierda = i % 2 === 0
      const origenX = W * (izquierda ? 0.32 : 0.68)
      const ang = (izquierda ? -65 : -115) * (Math.PI / 180) + (Math.random() - 0.5) * 0.9
      const vel = 9 + Math.random() * 8
      particulas.push({
        x: origenX + (Math.random() - 0.5) * 40,
        y: H * 0.75,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
        w: 5 + Math.random() * 5,
        h: 8 + Math.random() * 6,
        color: COLORES[i % COLORES.length],
        vida: 1,
      })
    }

    const inicio = performance.now()
    let raf = 0

    function frame(now: number) {
      const t = (now - inicio) / duracionMs
      ctx!.clearRect(0, 0, W, H)
      if (t >= 1) return

      for (const p of particulas) {
        p.vy += 0.28
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vrot
        p.vida = Math.max(0, 1 - t * 1.1)
        if (p.vida <= 0) continue

        ctx!.save()
        ctx!.translate(p.x, p.y)
        ctx!.rotate(p.rot)
        ctx!.globalAlpha = p.vida
        ctx!.fillStyle = p.color
        // El coseno simula el giro 3D de la tirita de papel
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)))
        ctx!.restore()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [cantidad, duracionMs])

  return (
    <canvas ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 400 }} />
  )
}
