'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

/* ── Types ─────────────────────────────────────────────────────────── */
type Tema = {
  id: string
  nombre: string
  ya_lo_se: boolean
  peso: number | null
}

type Disponibilidad = {
  dia: string
  horas: number
  bloqueado: boolean
}

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

const TIPOS_EXAMEN = [
  { value: 'multiple_choice', label: 'Multiple choice', desc: 'Opciones predefinidas' },
  { value: 'oral', label: 'Oral', desc: 'Con el docente' },
  { value: 'desarrollo', label: 'Desarrollo', desc: 'Respuestas escritas' },
  { value: 'integrador', label: 'Integrador', desc: 'Varios formatos' }
]

/* ── Step indicator ────────────────────────────────────────────────── */
function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            flex: 1,
            height: 3,
            background: i < step ? 'var(--amber)' : 'var(--surface)',
            borderRadius: 2,
            marginRight: i < total - 1 ? 6 : 0,
            transition: 'background 0.3s cubic-bezier(0.23,1,0.32,1)'
          }} />
        ))}
      </div>
      <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
        Paso {step} de {total}
      </p>
    </div>
  )
}

/* ── Main wizard ───────────────────────────────────────────────────── */
export default function NuevoExamenPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [generando, setGenerando] = useState(false)

  // Step 1
  const [materia, setMateria] = useState('')
  const [tipo, setTipo] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')

  // Step 2
  const [temas, setTemas] = useState<Tema[]>([])
  const [nuevoTema, setNuevoTema] = useState('')

  // Step 3
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>(
    DIAS.map(dia => ({ dia, horas: 2, bloqueado: false }))
  )
  const [preferencia, setPreferencia] = useState<'manana' | 'tarde' | 'noche'>('tarde')

  function agregarTema() {
    if (!nuevoTema.trim()) return
    setTemas(prev => [...prev, {
      id: crypto.randomUUID(),
      nombre: nuevoTema.trim(),
      ya_lo_se: false,
      peso: null
    }])
    setNuevoTema('')
  }

  function removeTema(id: string) {
    setTemas(prev => prev.filter(t => t.id !== id))
  }

  function updateTema(id: string, field: Partial<Tema>) {
    setTemas(prev => prev.map(t => t.id === id ? { ...t, ...field } : t))
  }

  function updateDia(dia: string, field: Partial<Disponibilidad>) {
    setDisponibilidad(prev => prev.map(d => d.dia === dia ? { ...d, ...field } : d))
  }

  async function handleGenerar() {
    setGenerando(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Crear examen
      const { data: examen, error: examError } = await supabase
        .from('examenes')
        .insert({
          user_id: user.id,
          materia,
          tipo,
          fecha,
          hora: hora || null,
          preferencia_horario: preferencia,
          estado: 'activo'
        })
        .select()
        .single()

      if (examError || !examen) throw examError

      // Insertar temas
      if (temas.length > 0) {
        await supabase.from('temas').insert(
          temas.map((t, i) => ({
            examen_id: examen.id,
            nombre: t.nombre,
            ya_lo_se: t.ya_lo_se,
            peso: t.peso,
            orden: i
          }))
        )
      }

      // Insertar disponibilidad
      await supabase.from('disponibilidad').insert(
        disponibilidad.map(d => ({
          examen_id: examen.id,
          dia: d.dia,
          horas: d.horas,
          bloqueado: d.bloqueado
        }))
      )

      // Generar plan con IA
      const response = await fetch('/api/generar-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examenId: examen.id })
      })

      if (!response.ok) throw new Error('Error generando plan')

      const { planId } = await response.json()
      router.push(`/plan/${planId}`)

    } catch {
      setGenerando(false)
      alert('Algo salió mal. Intentá de nuevo.')
    }
  }

  const canNext1 = materia.trim() && tipo && fecha
  const canNext2 = temas.length > 0

  if (generando) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
        <div style={{ animation: 'candleSway 4s ease-in-out infinite', transformOrigin: 'bottom center' }}>
          <svg width="60" height="90" viewBox="0 0 80 120" fill="none">
            <defs>
              <radialGradient id="gf" cx="50%" cy="75%" r="55%">
                <stop offset="0%" stopColor="#F5C97A" />
                <stop offset="45%" stopColor="#E8A44A" />
                <stop offset="100%" stopColor="#C45E0A" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="if" cx="50%" cy="65%" r="45%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#F5C97A" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path d="M40 8 C30 22 18 40 20 62 C22 74 30 84 40 90 C50 84 58 74 60 62 C62 40 50 22 40 8Z" fill="url(#gf)" className="flame-outer" />
            <path d="M40 30 C35 40 31 52 33 64 C35 72 38 79 40 83 C42 79 45 72 47 64 C49 52 45 40 40 30Z" fill="url(#if)" className="flame-inner" />
            <line x1="40" y1="83" x2="40" y2="92" stroke="#3D2B1F" strokeWidth="1.5" />
            <rect x="26" y="91" width="28" height="26" rx="2" fill="#3D2B1F" />
          </svg>
        </div>
        <h2 style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', fontSize: '1.4rem' }}>
          Candil está armando tu plan...
        </h2>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem' }}>
          Estamos distribuyendo los temas según tu tiempo.
        </p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ color: 'var(--ink-muted)', textDecoration: 'none', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Volver
        </Link>
        <span style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--amber)', fontWeight: 700 }}>Candil</span>
        <div style={{ width: 60 }} />
      </nav>

      <main style={{ maxWidth: 580, margin: '0 auto', padding: '48px 24px' }}>

        <StepBar step={step} total={4} />

        {/* ── STEP 1: Examen ───────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', fontSize: '1.6rem', marginBottom: 6 }}>
              El examen
            </h1>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem', marginBottom: 32 }}>
              Contanos de qué se trata.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 6 }}>
                  Nombre de la materia
                </label>
                <input
                  className="input"
                  value={materia}
                  onChange={e => setMateria(e.target.value)}
                  placeholder="Ej: Cálculo I, Historia del Arte..."
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 10 }}>
                  Tipo de examen
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {TIPOS_EXAMEN.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTipo(t.value)}
                      style={{
                        padding: '14px 16px',
                        background: tipo === t.value ? 'rgba(232,164,74,0.15)' : 'var(--bg2)',
                        border: `0.5px solid ${tipo === t.value ? 'var(--amber)' : 'var(--border)'}`,
                        borderRadius: 8,
                        color: tipo === t.value ? 'var(--amber)' : 'var(--ink-soft)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s'
                      }}
                    >
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{t.label}</p>
                      <p style={{ fontSize: '0.78rem', opacity: 0.7 }}>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 6 }}>
                    Fecha del examen
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 6 }}>
                    Hora (opcional)
                  </label>
                  <input
                    type="time"
                    className="input"
                    value={hora}
                    onChange={e => setHora(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Temas ────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', fontSize: '1.6rem', marginBottom: 6 }}>
              El contenido
            </h1>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem', marginBottom: 32 }}>
              ¿Qué temas entran en el examen?
            </p>

            {/* Add tema */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input
                className="input"
                value={nuevoTema}
                onChange={e => setNuevoTema(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && agregarTema()}
                placeholder="Nombre del tema..."
              />
              <button
                onClick={agregarTema}
                className="btn-primary"
                style={{ flexShrink: 0, padding: '11px 20px' }}
                disabled={!nuevoTema.trim()}
              >
                Agregar
              </button>
            </div>

            {/* Temas list */}
            {temas.length === 0 ? (
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '24px 0' }}>
                Agregá al menos un tema para continuar.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {temas.map(tema => (
                  <div key={tema.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        className="check-block"
                        checked={tema.ya_lo_se}
                        onChange={e => updateTema(tema.id, { ya_lo_se: e.target.checked })}
                      />
                      <span style={{ color: 'var(--ink)', fontSize: '0.92rem', textDecoration: tema.ya_lo_se ? 'line-through' : 'none', opacity: tema.ya_lo_se ? 0.5 : 1 }}>
                        {tema.nombre}
                      </span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        value={tema.peso ?? ''}
                        onChange={e => updateTema(tema.id, { peso: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Peso %"
                        min={0}
                        max={100}
                        style={{ width: 76, padding: '6px 10px', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--ink)', fontSize: '0.82rem', outline: 'none' }}
                      />
                      <button
                        onClick={() => removeTema(tema.id)}
                        style={{ color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '1.1rem', lineHeight: 1, opacity: 0.6 }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {temas.some(t => t.ya_lo_se) && (
              <p style={{ marginTop: 12, color: 'var(--ink-muted)', fontSize: '0.82rem' }}>
                Los temas marcados solo necesitarán un repaso breve al final.
              </p>
            )}
          </div>
        )}

        {/* ── STEP 3: Disponibilidad ───────────────────────────────── */}
        {step === 3 && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', fontSize: '1.6rem', marginBottom: 6 }}>
              Tu tiempo disponible
            </h1>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem', marginBottom: 32 }}>
              Cuántas horas podés estudiar cada día.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {disponibilidad.map(d => (
                <div key={d.dia} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{
                    width: 90, color: d.bloqueado ? 'var(--ink-muted)' : 'var(--ink)',
                    fontSize: '0.9rem', textTransform: 'capitalize', opacity: d.bloqueado ? 0.5 : 1
                  }}>
                    {d.dia}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    value={d.horas}
                    disabled={d.bloqueado}
                    onChange={e => updateDia(d.dia, { horas: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: 'var(--amber)', opacity: d.bloqueado ? 0.3 : 1 }}
                  />
                  <span style={{ width: 32, textAlign: 'right', color: d.bloqueado ? 'var(--ink-muted)' : 'var(--amber)', fontSize: '0.88rem', fontWeight: 500 }}>
                    {d.bloqueado ? '–' : `${d.horas}h`}
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.78rem', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={d.bloqueado}
                      onChange={e => updateDia(d.dia, { bloqueado: e.target.checked })}
                      style={{ accentColor: 'var(--amber)' }}
                    />
                    No puedo
                  </label>
                </div>
              ))}
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 10 }}>
                ¿Cuándo preferís estudiar?
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['manana', 'tarde', 'noche'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPreferencia(p)}
                    style={{
                      flex: 1, padding: '12px',
                      background: preferencia === p ? 'rgba(232,164,74,0.15)' : 'var(--bg2)',
                      border: `0.5px solid ${preferencia === p ? 'var(--amber)' : 'var(--border)'}`,
                      borderRadius: 8, color: preferencia === p ? 'var(--amber)' : 'var(--ink-soft)',
                      cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500, transition: 'all 0.2s'
                    }}
                  >
                    {p === 'manana' ? '☀️ Mañana' : p === 'tarde' ? '🌤 Tarde' : '🌙 Noche'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Confirmación ─────────────────────────────────── */}
        {step === 4 && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', fontSize: '1.6rem', marginBottom: 6 }}>
              Todo listo.
            </h1>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem', marginBottom: 32 }}>
              Revisá los datos antes de generar tu plan.
            </p>

            {/* Summary card */}
            <div className="card" style={{ padding: '22px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Materia</p>
                <p style={{ color: 'var(--ink)', fontWeight: 600 }}>{materia}</p>
              </div>
              <hr className="divider" />
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Tipo</p>
                  <p style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>{TIPOS_EXAMEN.find(t => t.value === tipo)?.label}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Fecha</p>
                  <p style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>{new Date(fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Preferencia</p>
                  <p style={{ color: 'var(--ink)', fontSize: '0.9rem', textTransform: 'capitalize' }}>{preferencia === 'manana' ? 'Mañana' : preferencia === 'tarde' ? 'Tarde' : 'Noche'}</p>
                </div>
              </div>
              <hr className="divider" />
              <div>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Temas ({temas.length})</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {temas.map(t => (
                    <span key={t.id} style={{ fontSize: '0.82rem', padding: '3px 10px', background: t.ya_lo_se ? 'var(--bg)' : 'rgba(232,164,74,0.1)', border: '0.5px solid var(--border)', borderRadius: 4, color: t.ya_lo_se ? 'var(--ink-muted)' : 'var(--ink-soft)', textDecoration: t.ya_lo_se ? 'line-through' : 'none' }}>
                      {t.nombre}
                    </span>
                  ))}
                </div>
              </div>
              <hr className="divider" />
              <div>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Horas disponibles</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {disponibilidad.filter(d => !d.bloqueado && d.horas > 0).map(d => (
                    <span key={d.dia} style={{ fontSize: '0.82rem', padding: '3px 10px', background: 'rgba(232,164,74,0.1)', border: '0.5px solid var(--border)', borderRadius: 4, color: 'var(--ink-soft)', textTransform: 'capitalize' }}>
                      {d.dia} {d.horas}h
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerar}
              disabled={loading || generando}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '1.05rem', padding: '14px' }}
            >
              Generar mi plan
            </button>
            <p style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.82rem', marginTop: 10 }}>
              Esto puede tomar unos segundos.
            </p>
          </div>
        )}

        {/* ── Navigation buttons ───────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="btn-secondary"
            >
              ← Anterior
            </button>
          ) : <div />}

          {step < 4 && (
            <button
              onClick={() => setStep(s => s + 1)}
              className="btn-primary"
              disabled={
                (step === 1 && !canNext1) ||
                (step === 2 && !canNext2)
              }
            >
              Siguiente →
            </button>
          )}
        </div>

      </main>
    </div>
  )
}
