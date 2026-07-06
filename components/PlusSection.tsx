'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

type Rama = { titulo: string; nodos: string[] }
type Mapa = { centro: string; ramas: Rama[] }
type Msg = { role: 'user' | 'assistant'; content: string }

const card = { padding: '20px', borderRadius: 12, background: 'var(--surface)', border: '0.5px solid var(--border)' } as const
const btn = { fontSize: 12.5, fontFamily: 'inherit', color: 'var(--amber)', background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', borderRadius: 100, padding: '9px 16px', cursor: 'pointer' } as const

export default function PlusSection({ examenId, esPlus, onLocked }: {
  examenId: string
  esPlus: boolean
  onLocked: () => void
}) {
  const t = useTranslations('plus')
  return (
    <section style={{ marginTop: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.2rem', fontWeight: 500, color: 'var(--ink)' }}>{t('title')}</h2>
        {!esPlus && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 100, background: 'rgba(180,120,200,0.12)', border: '0.5px solid rgba(180,120,200,0.3)', color: 'rgba(200,150,220,0.9)', letterSpacing: '0.06em', fontWeight: 500 }}>PLUS</span>}
      </div>

      {!esPlus ? (
        <button onClick={onLocked}
          style={{ width: '100%', textAlign: 'center', padding: '1.75rem 1.5rem', border: '0.5px dashed var(--border-mid)', borderRadius: 10, background: 'transparent', color: 'var(--ink-muted)', fontSize: 13, lineHeight: 1.6, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('locked_pitch')}
          <span style={{ display: 'block', marginTop: 6, color: 'var(--amber)', fontSize: 12 }}>{t('unlock_plus')}</span>
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <MapaMental examenId={examenId} />
          <ChatApuntes examenId={examenId} />
          <AudioResumen examenId={examenId} />
        </div>
      )}
    </section>
  )
}

/* ── Mapa mental ── */
function MapaMental({ examenId }: { examenId: string }) {
  const t = useTranslations('plus')
  const [mapa, setMapa] = useState<Mapa | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function generar() {
    setError(''); setCargando(true)
    try {
      const res = await fetch('/api/mapa-mental', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ examenId }) })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? t('generic_error'))
      setMapa(data.mapa as Mapa)
    } catch (e) { setError(e instanceof Error ? e.message : t('generic_error')) }
    finally { setCargando(false) }
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: mapa ? 16 : 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{t('mindmap_title')}</span>
        <button onClick={generar} disabled={cargando} style={{ ...btn, marginLeft: 'auto', cursor: cargando ? 'wait' : 'pointer' }}>
          {cargando ? t('building') : mapa ? t('regenerate') : t('generate_map')}
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: 'rgba(235,160,140,0.9)' }}>{error}</p>}
      {mapa && (
        <div style={{ animation: 'panelIn 300ms var(--ease-out) both' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 100, background: 'var(--amber)', color: 'var(--bg)', fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem' }}>{mapa.centro}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {mapa.ramas.map((r, i) => (
              <div key={i} style={{ borderTop: '2px solid var(--border-strong)', paddingTop: 10 }}>
                <p style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 500, marginBottom: 8 }}>{r.titulo}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {r.nodos.map((n, j) => (
                    <span key={j} style={{ fontSize: 12, color: 'var(--ink-soft)', padding: '6px 10px', borderRadius: 8, background: 'var(--bg2)', border: '0.5px solid var(--border)' }}>{n}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Chat con apuntes ── */
function ChatApuntes({ examenId }: { examenId: string }) {
  const t = useTranslations('plus')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  async function enviar() {
    const texto = input.trim()
    if (!texto || cargando) return
    setError('')
    const nuevoHist = [...msgs, { role: 'user' as const, content: texto }]
    setMsgs(nuevoHist)
    setInput('')
    setCargando(true)
    try {
      const res = await fetch('/api/chat-apuntes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examenId, mensaje: texto, historial: msgs }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? t('generic_error'))
      setMsgs([...nuevoHist, { role: 'assistant', content: data.respuesta }])
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50)
    } catch (e) { setError(e instanceof Error ? e.message : t('generic_error')) }
    finally { setCargando(false) }
  }

  return (
    <div style={card}>
      <p style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, marginBottom: 12 }}>{t('chat_title')}</p>
      {msgs.length > 0 && (
        <div ref={scrollRef} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%',
              fontSize: 12.5, lineHeight: 1.5, padding: '9px 13px', borderRadius: 12,
              background: m.role === 'user' ? 'var(--surface2)' : 'var(--amber-dim)',
              color: m.role === 'user' ? 'var(--ink)' : 'var(--ink-soft)',
              border: '0.5px solid var(--border)', whiteSpace: 'pre-wrap',
            }}>{m.content}</div>
          ))}
          {cargando && <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontStyle: 'italic' }}>{t('reading_notes')}</span>}
        </div>
      )}
      {error && <p style={{ fontSize: 12, color: 'rgba(235,160,140,0.9)', marginBottom: 8 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar()}
          placeholder={t('chat_placeholder')} style={{ flex: 1 }} />
        <button onClick={enviar} disabled={cargando || !input.trim()} style={{ ...btn, opacity: cargando || !input.trim() ? 0.5 : 1 }}>{t('send')}</button>
      </div>
    </div>
  )
}

/* ── Audio resumen ── */
function AudioResumen({ examenId }: { examenId: string }) {
  const t = useTranslations('plus')
  const [cargando, setCargando] = useState(false)
  const [audio, setAudio] = useState<string | null>(null)
  const [guion, setGuion] = useState('')
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')

  async function generar() {
    setError(''); setAviso(''); setAudio(null); setGuion(''); setCargando(true)
    try {
      const res = await fetch('/api/audio-resumen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ examenId }) })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? t('generic_error'))
      setGuion(data.guion ?? '')
      setAudio(data.audio ?? null)
      if (data.aviso) setAviso(data.aviso)
    } catch (e) { setError(e instanceof Error ? e.message : t('generic_error')) }
    finally { setCargando(false) }
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: guion ? 14 : 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{t('audio_title')}</span>
        <button onClick={generar} disabled={cargando} style={{ ...btn, marginLeft: 'auto', cursor: cargando ? 'wait' : 'pointer' }}>
          {cargando ? t('generating') : guion ? t('regenerate') : t('generate_audio')}
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: 'rgba(235,160,140,0.9)' }}>{error}</p>}
      {aviso && <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 10 }}>{aviso}</p>}
      {audio && <audio controls src={audio} style={{ width: '100%', marginBottom: 12 }} />}
      {guion && <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6, fontStyle: 'italic' }}>{guion}</p>}
    </div>
  )
}
