'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function UserMenu({ nombre, email }: { nombre: string; email: string | null }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const inicial = (nombre?.trim()[0] ?? 'E').toUpperCase()

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const itemStyle: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
    borderRadius: 8, fontSize: 13, color: 'var(--ink-soft)', textDecoration: 'none',
    background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    transition: 'background 150ms, color 150ms',
  }

  function hoverOn(e: React.MouseEvent<HTMLElement>) {
    e.currentTarget.style.background = 'var(--amber-dim)'
    e.currentTarget.style.color = 'var(--ink)'
  }
  function hoverOff(e: React.MouseEvent<HTMLElement>) {
    e.currentTarget.style.background = 'transparent'
    e.currentTarget.style.color = 'var(--ink-soft)'
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Menú de usuario"
        style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'var(--amber-dim)', border: `0.5px solid ${open ? 'var(--amber)' : 'var(--border-strong)'}`,
          color: 'var(--amber)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'border-color 200ms var(--ease-out)',
        }}>
        {inicial}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 210,
          background: 'var(--bg2)', border: '0.5px solid var(--border-strong)',
          borderRadius: 12, padding: 8, zIndex: 100,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          animation: 'modalIn 200ms var(--ease-out)',
        }}>
          {email && (
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', padding: '6px 12px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </p>
          )}
          <hr className="divider" style={{ margin: '2px 4px 6px' }} />
          <Link href="/perfil" style={itemStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={() => setOpen(false)}>
            Mi perfil
          </Link>
          <Link href="/perfil#preferencias" style={itemStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={() => setOpen(false)}>
            Preferencias
          </Link>
          <hr className="divider" style={{ margin: '6px 4px' }} />
          <form action="/auth/signout" method="post" style={{ margin: 0 }}>
            <button type="submit" style={itemStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
