'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { CandleIcon } from '@/components/CandleIcon'

type Periodo = 'mensual' | 'anual'
type PlanId = 'free' | 'pro' | 'plus'

const PRECIOS: Record<Periodo, { pro: string; plus: string }> = {
  mensual: { pro: '$4.99', plus: '$9.99' },
  anual: { pro: '$3.99', plus: '$7.99' },
}

const CARD_IDS: { id: PlanId; featured: boolean }[] = [
  { id: 'free', featured: false },
  { id: 'pro', featured: true },
  { id: 'plus', featured: false },
]

const TABLA: { key: string; free: string; pro: string; plus: string }[] = [
  { key: 'row_plans', free: 'val_per_month_5', pro: 'val_per_month_30', plus: 'val_unlimited' },
  { key: 'row_simultaneous', free: '1', pro: 'val_multiple', plus: 'val_multiple' },
  { key: 'row_visual', free: '✓', pro: '✓', plus: '✓' },
  { key: 'row_share', free: '✓', pro: '✓', plus: '✓' },
  { key: 'row_focus', free: '✓', pro: '✓', plus: '✓' },
  { key: 'row_streak', free: '✓', pro: '✓', plus: '✓' },
  { key: 'row_blocks', free: '—', pro: '✓', plus: '✓' },
  { key: 'row_chat_adjust', free: '—', pro: '✓', plus: '✓' },
  { key: 'row_upload', free: '—', pro: 'val_10mb', plus: 'val_50mb' },
  { key: 'row_storage', free: '—', pro: '500MB', plus: '5GB' },
  { key: 'row_practice', free: '—', pro: '✓', plus: '✓' },
  { key: 'row_mock', free: '—', pro: '✓', plus: '✓' },
  { key: 'row_audio', free: '—', pro: '—', plus: '✓' },
  { key: 'row_mindmap', free: '—', pro: '—', plus: '✓' },
  { key: 'row_notes_chat', free: '—', pro: '—', plus: '✓' },
  { key: 'row_groups', free: '—', pro: '—', plus: '✓' },
  { key: 'row_calendar', free: '—', pro: '—', plus: '✓' },
]

// Claves de pricing que son valores traducibles de la tabla
const VAL_KEYS = new Set(['val_per_month_5', 'val_per_month_30', 'val_unlimited', 'val_multiple', 'val_10mb', 'val_50mb'])

export default function PreciosPage() {
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('pricing')
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
      <nav style={{ display: 'flex', alignItems: 'center', padding: '1rem 2rem', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 50, background: 'var(--nav-bg)', backdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', color: 'var(--ink)', textDecoration: 'none' }}>
          <CandleIcon size={14} /> Candil
        </Link>
        <Link href="/dashboard" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-muted)', textDecoration: 'none' }}>
          {t('my_dashboard')}
        </Link>
      </nav>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '0.75rem' }}>
            {t.rich('title', {
              em: chunks => <em style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>{chunks}</em>,
              br: () => <br />,
            })}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)' }}>{t('subtitle')}</p>
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
                {p === 'mensual' ? t('monthly') : t('annual')}
              </button>
            ))}
          </div>
        </div>

        {/* ── CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: '4rem', alignItems: 'stretch' }}>
          {CARD_IDS.map(({ id, featured }) => {
            const precio = id === 'free' ? '$0' : PRECIOS[periodo][id]
            const cargando = loading === id
            const features = t(`features_${id}`).split('|')
            return (
              <div key={id} style={{
                position: 'relative', overflow: 'hidden',
                background: featured ? 'var(--surface)' : 'var(--bg2)',
                border: featured ? '1px solid var(--border-strong)' : '0.5px solid var(--border)',
                borderRadius: 14, padding: '28px 24px',
                display: 'flex', flexDirection: 'column',
              }}>
                {featured && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--amber), var(--amber2))' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: featured ? 'var(--amber)' : 'var(--ink-muted)' }}>
                    {t(`tier_${id}`)}
                  </span>
                  {featured && (
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 100, background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', color: 'var(--amber)', letterSpacing: '0.06em', fontWeight: 500 }}>
                      {t('most_popular')}
                    </span>
                  )}
                </div>
                <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.5rem', fontWeight: 500, marginBottom: 6 }}>{t(`name_${id}`)}</h2>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '2.2rem', letterSpacing: '-0.03em', color: featured ? 'var(--amber)' : 'var(--ink)' }}>
                    {precio}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    {t('per_month')}{periodo === 'anual' && id !== 'free' ? t('billed_annual') : ''}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55, marginBottom: 20 }}>{t(`desc_${id}`)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, color: 'var(--ink-soft)' }}>
                      <span style={{ color: 'var(--amber)', opacity: 0.6, fontSize: 9, flexShrink: 0 }}>✦</span>
                      {f}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 'auto' }}>
                  {id === 'free' ? (
                    <Link href="/registro" style={{
                      display: 'block', textAlign: 'center', padding: 13, borderRadius: 100,
                      background: 'transparent', border: '0.5px solid var(--border-mid)',
                      color: 'var(--ink-soft)', fontSize: 14, textDecoration: 'none', transition: 'all 200ms',
                    }}>
                      {t('btn_free')}
                    </Link>
                  ) : (
                    <button onClick={() => comprar(id)} disabled={loading !== null}
                      style={{
                        width: '100%', padding: 13, borderRadius: 100, fontFamily: 'inherit', fontSize: 14,
                        background: featured ? 'var(--amber)' : 'transparent',
                        border: featured ? 'none' : '0.5px solid var(--border-strong)',
                        color: featured ? 'var(--bg)' : 'var(--amber)',
                        fontWeight: featured ? 600 : 400,
                        cursor: loading !== null ? 'wait' : 'pointer',
                        opacity: loading !== null && !cargando ? 0.5 : 1,
                        transition: 'background 200ms, transform 150ms var(--ease-out)',
                      }}>
                      {cargando ? t('opening_checkout') : t(`btn_${id}`)}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--amber)', marginTop: '-2.5rem', marginBottom: '2.5rem' }}>
            {t('error')}
          </p>
        )}

        {/* ── TABLA COMPARATIVA (oculta en mobile) ── */}
        <div className="tabla-precios" style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16, textAlign: 'center' }}>
            {t('comparison')}
          </h2>
          <div style={{ border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 400, color: 'var(--ink-muted)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('feature_col')}</th>
                  {['Free', 'Pro', 'Plus'].map(col => (
                    <th key={col} style={{ textAlign: 'center', padding: '12px 18px', fontFamily: 'var(--font-geist-sans), sans-serif', fontWeight: 400, fontSize: 14, color: col === 'Pro' ? 'var(--amber)' : 'var(--ink)' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLA.map((row, i) => (
                  <tr key={row.key} style={{ borderTop: '0.5px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(232,164,74,0.02)' }}>
                    <td style={{ padding: '11px 18px', color: 'var(--ink-soft)' }}>{t(row.key)}</td>
                    {([row.free, row.pro, row.plus] as const).map((raw, j) => {
                      const val = VAL_KEYS.has(raw) ? t(raw) : raw
                      return (
                        <td key={j} style={{
                          padding: '11px 18px', textAlign: 'center',
                          color: raw === '—' ? 'var(--ink-faint)' : raw === '✓' ? 'var(--amber)' : 'var(--ink-soft)',
                          background: j === 1 ? 'var(--amber-dim)' : 'transparent',
                        }}>
                          {val}
                        </td>
                      )
                    })}
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
          <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.2rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>
            {t('guarantee_title')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
            {t('guarantee_body')}
          </p>
        </div>
      </main>
    </div>
  )
}
