'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

type Card = { frente: string; dorso: string }

export default function FlashcardsSection({ examenId, esPro, onLocked, embedded = false }: {
  examenId: string
  esPro: boolean
  onLocked: () => void
  embedded?: boolean
}) {
  const t = useTranslations('flashcards')
  const [cards, setCards] = useState<Card[]>([])
  const [cola, setCola] = useState<number[]>([]) // índices de la ronda actual
  const [pos, setPos] = useState(0)
  const [volteada, setVolteada] = useState(false)
  const [falladas, setFalladas] = useState<number[]>([])
  const [sabidas, setSabidas] = useState(0)
  const [ronda, setRonda] = useState<'inicial' | 'repaso'>('inicial')
  // Score congelado de la primera ronda: el repaso de falladas no lo altera
  const [resultado, setResultado] = useState<{ sabidas: number; total: number } | null>(null)
  const [terminado, setTerminado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function generar() {
    if (!esPro) { onLocked(); return }
    setError(''); setCargando(true)
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examenId }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 403 && data?.code === 'pro_required') { onLocked(); return }
      if (!res.ok) throw new Error(data?.error ?? t('generic_error'))
      const nuevas = data.flashcards as Card[]
      setCards(nuevas)
      empezarRonda(nuevas.map((_, i) => i), 'inicial')
    } catch (e) { setError(e instanceof Error ? e.message : t('generic_error')) }
    finally { setCargando(false) }
  }

  function empezarRonda(indices: number[], tipo: 'inicial' | 'repaso') {
    setCola(indices)
    setPos(0)
    setVolteada(false)
    setFalladas([])
    setSabidas(0)
    setRonda(tipo)
    if (tipo === 'inicial') setResultado(null)
    setTerminado(false)
  }

  function responder(laSe: boolean) {
    const idx = cola[pos]
    const nuevasFalladas = !laSe && !falladas.includes(idx) ? [...falladas, idx] : falladas
    setFalladas(nuevasFalladas)
    const nuevasSabidas = laSe ? sabidas + 1 : sabidas
    setSabidas(nuevasSabidas)
    setVolteada(false)

    if (pos + 1 < cola.length) { setPos(pos + 1); return }

    // Fin de ronda: la inicial congela el score y, si hubo falladas,
    // encadena una ronda de repaso separada
    if (ronda === 'inicial') {
      setResultado({ sabidas: nuevasSabidas, total: cola.length })
      if (nuevasFalladas.length > 0) {
        empezarRonda(nuevasFalladas, 'repaso')
        return
      }
    }
    setTerminado(true)
  }

  const idxActual = cola[pos]
  const card = cards[idxActual]
  const total = cola.length

  const btnBase = { fontSize: 12.5, fontFamily: 'inherit', borderRadius: 100, padding: '9px 18px', cursor: 'pointer' } as const

  return (
    <section style={{ marginTop: embedded ? 0 : '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {!embedded && (
          <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.2rem', fontWeight: 500, color: 'var(--ink)' }}>
            {t('title')}
          </h2>
        )}
        {!esPro && !embedded && (
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 100, background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', color: 'var(--amber)', letterSpacing: '0.06em', fontWeight: 500 }}>PRO</span>
        )}
        {esPro && (
          <button onClick={generar} disabled={cargando}
            style={{ ...btnBase, marginLeft: 'auto', color: 'var(--amber)', background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', cursor: cargando ? 'wait' : 'pointer' }}>
            {cargando ? t('generating') : cards.length > 0 ? t('regenerate') : t('generate')}
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: 12, color: 'rgba(235,160,140,0.9)', marginBottom: 10 }}>{error}</p>}

      {!esPro && (
        <button onClick={onLocked}
          style={{ width: '100%', textAlign: 'center', padding: '1.75rem 1.5rem', border: '0.5px dashed var(--border-mid)', borderRadius: 10, background: 'transparent', color: 'var(--ink-muted)', fontSize: 13, lineHeight: 1.6, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('locked_pitch')}
          <span style={{ display: 'block', marginTop: 6, color: 'var(--amber)', fontSize: 12 }}>{t('unlock_pro')}</span>
        </button>
      )}

      {esPro && cards.length > 0 && !terminado && card && (
        <div style={{ animation: 'panelIn 300ms var(--ease-out) both' }}>
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center', marginBottom: 10 }}>
            {ronda === 'repaso'
              ? t('review_counter', { current: pos + 1, total })
              : t('counter', { current: pos + 1, total })}
          </p>

          {/* Card con flip */}
          <div onClick={() => setVolteada(v => !v)} style={{ perspective: 1000, cursor: 'pointer', maxWidth: 480, margin: '0 auto' }}>
            <div style={{
              position: 'relative', width: '100%', minHeight: 200,
              transformStyle: 'preserve-3d', transition: 'transform 450ms var(--ease-out)',
              transform: volteada ? 'rotateY(180deg)' : 'none',
            }}>
              {([false, true] as const).map(dorso => (
                <div key={String(dorso)} style={{
                  position: dorso ? 'absolute' : 'relative', inset: 0,
                  backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                  transform: dorso ? 'rotateY(180deg)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '2rem 1.75rem', minHeight: 200, borderRadius: 14,
                  background: dorso ? 'var(--amber-dim)' : 'var(--surface)',
                  border: '0.5px solid var(--border-strong)',
                }}>
                  <p style={{
                    textAlign: 'center', lineHeight: 1.55,
                    fontSize: dorso ? 14 : 17,
                    color: dorso ? 'var(--ink-soft)' : 'var(--ink)',
                    fontFamily: dorso ? 'inherit' : 'var(--font-geist-sans), sans-serif',
                  }}>
                    {dorso ? card.dorso : card.frente}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink-faint)', textAlign: 'center', marginTop: 8 }}>{t('tap_to_flip')}</p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 }}>
            <button onClick={() => responder(false)}
              style={{ ...btnBase, color: 'rgba(235,160,140,0.95)', background: 'rgba(220,120,100,0.08)', border: '0.5px solid rgba(220,120,100,0.4)' }}>
              {t('dont_know')}
            </button>
            <button onClick={() => responder(true)}
              style={{ ...btnBase, color: 'var(--green)', background: 'var(--green-dim)', border: '0.5px solid rgba(90,158,120,0.5)' }}>
              {t('know')}
            </button>
          </div>
        </div>
      )}

      {esPro && terminado && (
        <div style={{ textAlign: 'center', padding: '2rem 1.5rem', borderRadius: 14, background: 'var(--surface)', border: '0.5px solid var(--border)', animation: 'panelIn 300ms var(--ease-out) both' }}>
          <p style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.1rem', color: 'var(--ink)', marginBottom: 6 }}>{t('done_title')}</p>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
            {t('score', {
              known: resultado?.sabidas ?? sabidas,
              total: resultado?.total ?? cola.length,
            })}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {falladas.length > 0 && (
              <button onClick={() => empezarRonda(falladas, 'repaso')}
                style={{ ...btnBase, color: 'var(--amber)', background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)' }}>
                {t('repeat_failed', { count: falladas.length })}
              </button>
            )}
            <button onClick={() => empezarRonda(cards.map((_, i) => i), 'inicial')}
              style={{ ...btnBase, color: 'var(--ink-soft)', background: 'transparent', border: '0.5px solid var(--border-strong)' }}>
              {t('repeat_all')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
