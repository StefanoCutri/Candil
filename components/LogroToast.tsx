'use client'

// Toast global de "logro desbloqueado". Escucha los eventos que emite
// lib/logrosClient.ts y muestra los logros de a uno, 4 segundos cada uno.
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Logro } from '@/lib/logros'
import { LOGRO_EVENT } from '@/lib/logrosClient'

export default function LogroToast() {
  const t = useTranslations('logros')
  const [actual, setActual] = useState<Logro | null>(null)
  const [visible, setVisible] = useState(false)
  const cola = useRef<Logro[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    function onLogro(e: Event) {
      cola.current.push((e as CustomEvent<Logro>).detail)
      siguiente()
    }
    window.addEventListener(LOGRO_EVENT, onLogro)
    return () => {
      window.removeEventListener(LOGRO_EVENT, onLogro)
      timers.current.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function siguiente() {
    setActual(prev => {
      if (prev) return prev // ya hay uno mostrándose; la cola sigue después
      const next = cola.current.shift() ?? null
      if (next) {
        requestAnimationFrame(() => setVisible(true))
        timers.current.push(setTimeout(cerrar, 4000))
      }
      return next
    })
  }

  function cerrar() {
    setVisible(false)
    timers.current.push(setTimeout(() => {
      setActual(null)
      timers.current.push(setTimeout(() => {
        if (cola.current.length > 0) siguiente()
      }, 200))
    }, 300))
  }

  if (!actual) return null

  const nombre = t.has(`${actual.id}_nombre`) ? t(`${actual.id}_nombre`) : actual.nombre

  return (
    <div style={{
      position: 'fixed', bottom: '2rem', left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : 40}px)`,
      opacity: visible ? 1 : 0,
      transition: 'all 300ms var(--ease-out)',
      background: 'var(--surface2)', border: '0.5px solid var(--border-strong)',
      borderRadius: 14, padding: '14px 18px', zIndex: 400,
      display: 'flex', alignItems: 'center', gap: 14,
      maxWidth: 'calc(100vw - 2rem)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>{actual.icon}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 2 }}>
          {t('unlocked')}
        </p>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {nombre} <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 400 }}>+{actual.xp} XP</span>
        </p>
      </div>
      <button onClick={cerrar} aria-label="Cerrar"
        style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', fontSize: 16, cursor: 'pointer', padding: 4, lineHeight: 1, flexShrink: 0, fontFamily: 'inherit' }}>
        ×
      </button>
    </div>
  )
}
