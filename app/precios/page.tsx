'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CandleIcon } from '@/components/CandleIcon'

type Periodo = 'mensual' | 'anual'

const PRECIOS: Record<Periodo, { pro: string; plus: string }> = {
  mensual: { pro: '$4.99', plus: '$9.99' },
  anual: { pro: '$3.99', plus: '$7.99' },
}

const CARDS = [
  {
    id: 'free' as const, tier: 'Free', nombre: 'Gratis', featured: false,
    desc: 'Para empezar. El plan que necesitás, sin pagar nada.',
    features: ['Plan automático con IA', 'Plan visual tachable', 'Compartir plan como link', 'Modo foco (Pomodoro)', '1 examen a la vez'],
    btnText: 'Empezar gratis',
  },
  {
    id: 'pro' as const, tier: 'Más popular', nombre: 'Pro', featured: true,
    desc: 'Personalización real y estudio desde tus propios apuntes.',
    features: ['Todo lo de Free', 'Bloques horarios personalizados', 'Ajuste por chat con IA', 'Subir apuntes (PDF, foto)', 'Preguntas de práctica', 'Simulacro de examen', 'Múltiples exámenes'],
    btnText: 'Empezar Pro',
  },
  {
    id: 'plus' as const, tier: 'Plus', nombre: 'Plus', featured: false,
    desc: 'Social, colaborativo, sin límites.',
    features: ['Todo lo de Pro', 'Audio resumen de tus apuntes', 'Mapa mental visual', 'Chat con tus apuntes', 'Grupos de estudio', 'Google Calendar integrado'],
    btnText: 'Empezar Plus',
  },
]

const TABLA: { label: string; free: string; pro: string; plus: string }[] = [
  { label: 'Planes generados con IA', free: '5 / mes', pro: '30 / mes', plus: 'Ilimitados' },
  { label: 'Exámenes simultáneos', free: '1', pro: 'Múltiples', plus: 'Múltiples' },
  { label: 'Plan visual tachable', free: '✓', pro: '✓', plus: '✓' },
  { label: 'Compartir plan como link', free: '✓', pro: '✓', plus: '✓' },
  { label: 'Modo foco (Pomodoro)', free: '✓', pro: '✓', plus: '✓' },
  { label: 'Racha de días', free: '✓', pro: '✓', plus: '✓' },
  { label: 'Bloques horarios por día', free: '—', pro: '✓', plus: '✓' },
  { label: 'Ajuste por chat con IA', free: '—', pro: '✓', plus: '✓' },
  { label: 'Subir apuntes', free: '—', pro: '10MB / archivo', plus: '50MB / archivo' },
  { label: 'Almacenamiento total', free: '—', pro: '500MB', plus: '5GB' },
  { label: 'Preguntas de práctica', free: '—', pro: '✓', plus: '✓' },
  { label: 'Simulacro de examen', free: '—', pro: '✓', plus: '✓' },
  { label: 'Audio resumen', free: '—', pro: '—', plus: '✓' },
  { label: 'Mapa mental visual', free: '—', pro: '—', plus: '✓' },
  { label: 'Chat con tus apuntes', free: '—', pro: '—', plus: '✓' },
  { label: 'Grupos de estudio', free: '—', pro: '—', plus: '✓' },
  { label: 'Google Calendar', free: '—', pro: '—', plus: '✓' },
]

export default function PreciosPage() {
  const router = useRouter()
  const supabase = createClient()
  const [periodo, setPeriodo] = useState<Periodo>('mensual')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState(false)

  async function comprar(planId: 'pro' | 'plus') {
    setError(false)
    setLoading(planId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/registro?plan=${planId}`)
        return
      }
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, periodo }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error()
      window.location.href = data.url
    } catch {
      setError(true)
      setLoading(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 300 }}>

      {/* ── NAV ── */}
      <nav style={{ display: 'flex', alignItems: 'center', padding: '1rem 2rem', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(21,15,7,0.92)', backdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-serif), serif', fontSize: '1rem', color: 'var(--ink)', textDecoration: 'none' }}>
          <CandleIcon size={14} /> Candil
        </Link>
        <Link href="/dashboard" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-muted)', textDecoration: 'none' }}>
          Mi dashboard →
        </Link>
      </nav>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-serif), serif', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: '0.75rem' }}>
            Simple.<br /><em style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>Como tiene que ser.</em>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)' }}>Empezá gratis. Pagá solo cuando necesitás más.</p>
        </div>

        {/* ── TOGGLE MENSUAL / ANUAL ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 100, background: 'var(--surface)', border: '0.5px solid var(--border-mid)' }}>
            {(['mensual', 'anual'] as Periodo[]).map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                style={{
                  padding: '8px 20px', borderRadius: 100, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13,
                  background: periodo === p ? 'var(--amber)' : 'transparent',
                  color: periodo === p ? 'var(--bg)' : 'var(--ink-muted)',
                  fontWeight: periodo === p ? 600 : 400,
                  transition: 'all 250ms var(--ease-out)',
                }}>
                {p === 'mensual' ? 'Mensual' : 'Anual −20%'}
              </button>
            ))}
          </div>
        </div>

        {/* ── CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: '4rem', alignItems: 'stretch' }}>
          {CARDS.map(card => {
            const precio = card.id === 'free' ? '$0' : PRECIOS[periodo][card.id]
            const cargando = loading === card.id
            return (
              <div key={card.id} style={{
                position: 'relative', overflow: 'hidden',
                background: card.featured ? 'var(--surface)' : 'var(--bg2)',
                border: card.featured ? '1px solid var(--border-strong)' : '0.5px solid var(--border)',
                borderRadius: 14, padding: '28px 24px',
                display: 'flex', flexDirection: 'column',
              }}>
                {card.featured && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--amber), var(--amber2))' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: card.featured ? 'var(--amber)' : 'var(--ink-muted)' }}>
                    {card.tier}
                  </span>
                  {card.featured && (
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 100, background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', color: 'var(--amber)', letterSpacing: '0.06em', fontWeight: 500 }}>
                      MÁS POPULAR
                    </span>
                  )}
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif), serif', fontSize: '1.5rem', fontWeight: 400, marginBottom: 6 }}>{card.nombre}</h2>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '2.2rem', letterSpacing: '-0.03em', color: card.featured ? 'var(--amber)' : 'var(--ink)' }}>
                    {precio}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    /mes{periodo === 'anual' && card.id !== 'free' ? ' · facturado anual' : ''}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55, marginBottom: 20 }}>{card.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {card.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, color: 'var(--ink-soft)' }}>
                      <span style={{ color: 'var(--amber)', opacity: 0.6, fontSize: 9, flexShrink: 0 }}>✦</span>
                      {f}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 'auto' }}>
                  {card.id === 'free' ? (
                    <Link href="/registro" style={{
                      display: 'block', textAlign: 'center', padding: 13, borderRadius: 100,
                      background: 'transparent', border: '0.5px solid var(--border-mid)',
                      color: 'var(--ink-soft)', fontSize: 14, textDecoration: 'none', transition: 'all 200ms',
                    }}>
                      {card.btnText}
                    </Link>
                  ) : (
                    <button onClick={() => comprar(card.id)} disabled={loading !== null}
                      style={{
                        width: '100%', padding: 13, borderRadius: 100, fontFamily: 'inherit', fontSize: 14,
                        background: card.featured ? 'var(--amber)' : 'transparent',
                        border: card.featured ? 'none' : '0.5px solid var(--border-strong)',
                        color: card.featured ? 'var(--bg)' : 'var(--amber)',
                        fontWeight: card.featured ? 600 : 400,
                        cursor: loading !== null ? 'wait' : 'pointer',
                        opacity: loading !== null && !cargando ? 0.5 : 1,
                        transition: 'background 200ms, transform 150ms var(--ease-out)',
                      }}>
                      {cargando ? 'Abriendo checkout…' : card.btnText}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--amber)', marginTop: '-2.5rem', marginBottom: '2.5rem' }}>
            Algo salió mal, intentá de nuevo.
          </p>
        )}

        {/* ── TABLA COMPARATIVA (oculta en mobile) ── */}
        <div className="tabla-precios" style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16, textAlign: 'center' }}>
            Comparación completa
          </h2>
          <div style={{ border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 400, color: 'var(--ink-muted)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Característica</th>
                  {['Free', 'Pro', 'Plus'].map(t => (
                    <th key={t} style={{ textAlign: 'center', padding: '12px 18px', fontFamily: 'var(--font-serif), serif', fontWeight: 400, fontSize: 14, color: t === 'Pro' ? 'var(--amber)' : 'var(--ink)' }}>
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLA.map((row, i) => (
                  <tr key={row.label} style={{ borderTop: '0.5px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(232,164,74,0.02)' }}>
                    <td style={{ padding: '11px 18px', color: 'var(--ink-soft)' }}>{row.label}</td>
                    {([row.free, row.pro, row.plus] as const).map((val, j) => (
                      <td key={j} style={{
                        padding: '11px 18px', textAlign: 'center',
                        color: val === '—' ? 'var(--ink-faint)' : val === '✓' ? 'var(--amber)' : 'var(--ink-soft)',
                        background: j === 1 ? 'var(--amber-dim)' : 'transparent',
                      }}>
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── GARANTÍA ── */}
        <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', borderRadius: 14, background: 'var(--bg2)', border: '0.5px solid var(--border)' }}>
          <div style={{ marginBottom: 12 }}>
            <CandleIcon size={14} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif), serif', fontSize: '1.2rem', fontWeight: 400, color: 'var(--ink)', marginBottom: 6 }}>
            Sin compromiso. Cancelás cuando quieras.
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
            Si Candil no te sirve, lo cancelás desde tu cuenta en dos clics. Sin preguntas, sin vueltas.
          </p>
        </div>
      </main>
    </div>
  )
}
