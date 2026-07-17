'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

type Pregunta = {
  tema?: string
  pregunta: string
  opciones: string[] | null
  respuesta: string
  explicacion?: string
}
type Practica = { titulo: string; duracion_min?: number; preguntas: Pregunta[] }
type Modo = 'preguntas' | 'simulacro'

export default function PracticaSection({ examenId, esPro, onLocked, embedded = false }: {
  examenId: string
  esPro: boolean
  onLocked: () => void
  embedded?: boolean
}) {
  const t = useTranslations('practica')
  const [cargando, setCargando] = useState<Modo | null>(null)
  const [error, setError] = useState('')
  const [practica, setPractica] = useState<Practica | null>(null)
  const [modo, setModo] = useState<Modo>('preguntas')
  const [elegidas, setElegidas] = useState<Record<number, string>>({})
  const [reveladas, setReveladas] = useState<Set<number>>(new Set())

  async function generar(m: Modo) {
    if (!esPro) { onLocked(); return }
    setError('')
    setCargando(m)
    setPractica(null)
    setElegidas({})
    setReveladas(new Set())
    try {
      const res = await fetch('/api/practica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examenId, modo: m }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 403 && data?.code === 'pro_required') { onLocked(); return }
      if (!res.ok) throw new Error(data?.error ?? t('generic_error'))
      setPractica(data.practica as Practica)
      setModo(m)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('generic_error'))
    } finally {
      setCargando(null)
    }
  }

  function elegir(i: number, opcion: string, correcta: string) {
    if (reveladas.has(i)) return
    setElegidas(prev => ({ ...prev, [i]: opcion }))
    setReveladas(prev => new Set(prev).add(i))
  }

  function revelar(i: number) {
    setReveladas(prev => new Set(prev).add(i))
  }

  const aciertos = practica
    ? practica.preguntas.filter((p, i) => p.opciones && elegidas[i] === p.respuesta).length
    : 0
  const conOpciones = practica ? practica.preguntas.filter(p => p.opciones).length : 0

  return (
    <section style={{ marginTop: embedded ? 0 : '3rem' }}>
      {!embedded && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.2rem', fontWeight: 500, color: 'var(--ink)' }}>
            {t('title')}
          </h2>
          {!esPro && (
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 100, background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', color: 'var(--amber)', letterSpacing: '0.06em', fontWeight: 500 }}>PRO</span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => generar('preguntas')} disabled={cargando !== null}
          style={{ fontSize: 12.5, fontFamily: 'inherit', color: 'var(--amber)', background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', borderRadius: 100, padding: '9px 16px', cursor: cargando ? 'wait' : 'pointer', opacity: cargando && cargando !== 'preguntas' ? 0.5 : 1 }}>
          {cargando === 'preguntas' ? t('thinking') : t('questions_btn')}
        </button>
        <button onClick={() => generar('simulacro')} disabled={cargando !== null}
          style={{ fontSize: 12.5, fontFamily: 'inherit', color: 'var(--amber)', background: 'transparent', border: '0.5px solid var(--border-strong)', borderRadius: 100, padding: '9px 16px', cursor: cargando ? 'wait' : 'pointer', opacity: cargando && cargando !== 'simulacro' ? 0.5 : 1 }}>
          {cargando === 'simulacro' ? t('building_mock') : t('mock_btn')}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, border: '0.5px solid rgba(220,120,100,0.4)', background: 'rgba(220,120,100,0.08)', fontSize: 12, color: 'rgba(235,160,140,0.9)', marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      {!esPro && !error && (
        <button onClick={onLocked}
          style={{ width: '100%', textAlign: 'center', padding: '1.75rem 1.5rem', border: '0.5px dashed var(--border-mid)', borderRadius: 10, background: 'transparent', color: 'var(--ink-muted)', fontSize: 13, lineHeight: 1.6, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('locked_pitch')}
          <span style={{ display: 'block', marginTop: 6, color: 'var(--amber)', fontSize: 12 }}>{t('unlock_pro')}</span>
        </button>
      )}

      {practica && (
        <div style={{ animation: 'panelIn 300ms var(--ease-out) both' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', color: 'var(--amber)', fontStyle: 'italic' }}>{practica.titulo}</span>
            {practica.duracion_min ? <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>≈ {practica.duracion_min} min</span> : null}
            {conOpciones > 0 && reveladas.size > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-soft)' }}>{aciertos}/{conOpciones} {t('correct')}</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {practica.preguntas.map((p, i) => {
              const revelada = reveladas.has(i)
              const elegida = elegidas[i]
              return (
                <div key={i} style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--surface)', border: '0.5px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-faint)', flexShrink: 0 }}>{i + 1}.</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5 }}>{p.pregunta}</p>
                      {p.tema && <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{p.tema}</span>}
                    </div>
                  </div>

                  {p.opciones ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginLeft: 20 }}>
                      {p.opciones.map((op, j) => {
                        const esCorrecta = op === p.respuesta
                        const esElegida = op === elegida
                        let bg = 'transparent', bc = 'var(--border-mid)', col = 'var(--ink-soft)'
                        if (revelada && esCorrecta) { bg = 'var(--green-dim)'; bc = 'rgba(90,158,120,0.5)'; col = 'var(--green)' }
                        else if (revelada && esElegida && !esCorrecta) { bg = 'rgba(220,120,100,0.08)'; bc = 'rgba(220,120,100,0.4)'; col = 'rgba(235,160,140,0.9)' }
                        return (
                          <button key={j} onClick={() => elegir(i, op, p.respuesta)} disabled={revelada}
                            style={{ textAlign: 'left', fontSize: 12.5, fontFamily: 'inherit', padding: '8px 12px', borderRadius: 8, background: bg, border: `0.5px solid ${bc}`, color: col, cursor: revelada ? 'default' : 'pointer', transition: 'all 150ms var(--ease-out)' }}>
                            {op}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ marginLeft: 20 }}>
                      {!revelada ? (
                        <button onClick={() => revelar(i)}
                          style={{ fontSize: 12, fontFamily: 'inherit', color: 'var(--amber)', background: 'none', border: '0.5px solid var(--border-mid)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
                          {t('show_answer')}
                        </button>
                      ) : (
                        <div style={{ fontSize: 12.5, color: 'var(--ink)', padding: '8px 12px', borderRadius: 8, background: 'var(--green-dim)', border: '0.5px solid rgba(90,158,120,0.3)' }}>
                          {p.respuesta}
                        </div>
                      )}
                    </div>
                  )}

                  {revelada && p.explicacion && (
                    <p style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5, marginTop: 10, marginLeft: 20, fontStyle: 'italic' }}>
                      {p.explicacion}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={() => generar(modo)} disabled={cargando !== null}
            style={{ marginTop: 14, fontSize: 12, fontFamily: 'inherit', color: 'var(--ink-muted)', background: 'none', border: '0.5px solid var(--border-mid)', borderRadius: 100, padding: '8px 16px', cursor: 'pointer' }}>
            {t('another_round')}
          </button>
        </div>
      )}
    </section>
  )
}
