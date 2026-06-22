'use client'

import { useState } from 'react'
import Link from 'next/link'
import Pomodoro from '@/components/Pomodoro'
import { CandleIcon } from '@/components/CandleIcon'

export type ExamenRow = {
  id: string
  materia: string
  tipo: string | null
  fecha: string
  estado: string
  temas: { id: string }[]
  planes: { id: string; bloques: { id: string; completado: boolean }[] }[]
}

const TIPO_NAMES: Record<string, string> = {
  multiple_choice: 'Multiple choice',
  oral: 'Oral',
  desarrollo: 'Desarrollo',
  integrador: 'Integrador',
}

const DIA_LETRAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function tipoPills(tipo: string | null): string[] {
  if (!tipo) return []
  return tipo.split(',').map(t => TIPO_NAMES[t.trim()] ?? t.trim()).filter(Boolean)
}

function diasRestantes(fecha: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const [y, m, d] = fecha.split('-').map(Number)
  const exam = new Date(y, m - 1, d)
  return Math.round((exam.getTime() - hoy.getTime()) / 86400000)
}

function formatFecha(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function saludo() {
  const h = new Date().getHours()
  if (h >= 6 && h < 13) return 'Buenos días'
  if (h >= 13 && h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function progresoDe(examen: ExamenRow) {
  const bloques = examen.planes?.[0]?.bloques ?? []
  if (bloques.length === 0) return { pct: 0, hasBloques: false }
  const done = bloques.filter(b => b.completado).length
  return { pct: Math.round((done / bloques.length) * 100), hasBloques: true }
}

/* ── Racha strip ── */
function RachaStrip({ racha, ultimaActividad }: { racha: number; ultimaActividad: string | null }) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const dow = (hoy.getDay() + 6) % 7 // 0 = lunes

  // Último día activo dentro de la semana actual
  let lastIdx = -1
  if (ultimaActividad && racha > 0) {
    const [y, m, d] = ultimaActividad.split('-').map(Number)
    const ult = new Date(y, m - 1, d)
    const diff = Math.round((hoy.getTime() - ult.getTime()) / 86400000)
    if (diff <= 1) lastIdx = dow - diff
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      padding: '14px 18px', borderRadius: 12,
      background: 'var(--amber-dim)', border: '0.5px solid var(--border)',
      marginBottom: 40,
    }}>
      <CandleIcon size={13} />
      <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        {racha > 0
          ? <><strong style={{ color: 'var(--amber)', fontWeight: 600 }}>{racha} {racha === 1 ? 'día' : 'días'}</strong> estudiando seguidos</>
          : 'Tachá tu primer bloque hoy y arrancá la racha.'}
      </span>
      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
        {DIA_LETRAS.map((letra, i) => {
          const activo = lastIdx >= 0 && i <= lastIdx && (lastIdx - i) < racha
          const esHoy = i === dow
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: activo ? 'var(--amber)' : 'transparent',
                border: `0.5px solid ${activo ? 'var(--amber)' : esHoy ? 'var(--border-strong)' : 'var(--border-mid)'}`,
                transition: 'background 250ms var(--ease-out)',
              }} />
              <span style={{ fontSize: 8, color: activo ? 'var(--amber)' : 'var(--ink-faint)', letterSpacing: '0.05em' }}>{letra}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Card de examen activo ── */
function ExamenCard({ examen }: { examen: ExamenRow }) {
  const dias = diasRestantes(examen.fecha)
  const urgente = dias >= 0 && dias < 3
  const { pct } = progresoDe(examen)
  const planId = examen.planes?.[0]?.id ?? null
  const nTemas = examen.temas?.length ?? 0
  const pills = tipoPills(examen.tipo)

  const countdownLabel = dias < 0 ? 'Ya pasó' : dias === 0 ? 'Es hoy' : dias === 1 ? 'falta 1 día' : `faltan ${dias} días`
  const countdownNum = dias <= 0 ? (dias === 0 ? 'Hoy' : '—') : String(dias)

  return (
    <div className="card" style={{
      borderRadius: 12, padding: '20px 20px 16px', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 0, minHeight: 230,
    }}>
      {urgente && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--amber), var(--amber2))' }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-serif), serif', fontSize: '1.15rem', fontWeight: 400, color: 'var(--ink)', lineHeight: 1.25 }}>
          {examen.materia}
        </h3>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
          {pills.map(p => (
            <span key={p} style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 100,
              background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)',
              color: 'var(--amber)', letterSpacing: '0.04em', whiteSpace: 'nowrap',
            }}>{p}</span>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 14, textTransform: 'capitalize' }}>
        {formatFecha(examen.fecha)}
      </p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
        <span style={{
          fontFamily: 'var(--font-serif), serif', fontSize: '2.4rem', lineHeight: 1,
          color: urgente ? 'var(--amber)' : 'var(--ink)', letterSpacing: '-0.03em',
        }}>
          {countdownNum}
        </span>
        <span style={{ fontSize: 12, color: urgente ? 'var(--amber)' : 'var(--ink-muted)' }}>{countdownLabel}</span>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Progreso</span>
          <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 500 }}>{pct}%</span>
        </div>
        <div className="progress-bar" style={{ marginBottom: 14 }}>
          <div className="progress-fill" style={{ width: `${pct}%`, transition: 'width 600ms var(--ease-out)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '0.5px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{nTemas} {nTemas === 1 ? 'tema' : 'temas'}</span>
          {planId ? (
            <Link href={`/plan/${planId}`} style={{ fontSize: 12.5, color: 'var(--amber)', textDecoration: 'none', fontWeight: 500 }}>
              Ver plan →
            </Link>
          ) : (
            <Link href="/nuevo" style={{ fontSize: 12.5, color: 'var(--ink-muted)', textDecoration: 'none' }}>
              Sin plan todavía
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Card de examen completado ── */
function CompletadoCard({ examen }: { examen: ExamenRow }) {
  const nTemas = examen.temas?.length ?? 0
  const planId = examen.planes?.[0]?.id ?? null

  return (
    <div className="card" style={{ borderRadius: 12, padding: '20px 20px 16px', opacity: 0.55, display: 'flex', flexDirection: 'column', minHeight: 150 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-serif), serif', fontSize: '1.1rem', fontWeight: 400, color: 'var(--ink)' }}>
          {examen.materia}
        </h3>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap',
          background: 'var(--green-dim)', border: '0.5px solid rgba(90,158,120,0.3)', color: 'var(--green)',
        }}>
          Completado ✓
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 14, textTransform: 'capitalize' }}>
        {formatFecha(examen.fecha)}
      </p>
      <div style={{ marginTop: 'auto' }}>
        <div className="progress-bar" style={{ marginBottom: 12 }}>
          <div style={{ width: '100%', height: '100%', background: 'var(--green)', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{nTemas} {nTemas === 1 ? 'tema' : 'temas'}</span>
          {planId && (
            <Link href={`/plan/${planId}`} style={{ fontSize: 12.5, color: 'var(--ink-muted)', textDecoration: 'none' }}>
              Ver plan →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Estado vacío ── */
function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div style={{ display: 'inline-block', animation: 'floatUp 3s ease-in-out infinite', filter: 'drop-shadow(0 0 18px rgba(232,164,74,0.35))', marginBottom: 24 }}>
        <svg width="44" height="64" viewBox="0 0 56 80" fill="none" style={{ animation: 'flicker 2.5s ease-in-out infinite', transformOrigin: '50% 85%' }}>
          <path d="M28 4C28 4 44 22 44 36C44 46 37.2 55 28 55C18.8 55 12 46 12 36C12 22 28 4 28 4Z" fill="#E8A44A" opacity="0.88"/>
          <path d="M28 16C28 16 38 29 38 37C38 43 33.5 48 28 48C22.5 48 18 43 18 37C18 29 28 16 28 16Z" fill="#F5C97A"/>
          <path d="M28 30C28 30 32 35 32 38C32 40.2 30.2 42 28 42C25.8 42 24 40.2 24 38C24 35 28 30 28 30Z" fill="white" opacity="0.5"/>
          <rect x="21" y="55" width="14" height="18" rx="3" fill="#6B4226"/>
          <rect x="14" y="70" width="28" height="6" rx="3" fill="#3D2B1F"/>
        </svg>
      </div>
      <h2 style={{ fontFamily: 'var(--font-serif), serif', fontSize: '1.4rem', fontWeight: 400, color: 'var(--ink)', marginBottom: 8 }}>
        Todo tranquilo por acá.
      </h2>
      <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 28 }}>
        Sin exámenes todavía. Cargá el primero y Candil arma el plan.
      </p>
      <Link href="/nuevo" className="btn-primary">
        Cargar mi primer examen
      </Link>
    </div>
  )
}

/* ── Main ── */
export default function DashboardClient({ nombre, racha, ultimaActividad, examenes }: {
  nombre: string
  racha: number
  ultimaActividad: string | null
  examenes: ExamenRow[]
}) {
  const [showCompletados, setShowCompletados] = useState(false)

  const activos = examenes.filter(e => e.estado !== 'completado' && e.estado !== 'archivado')
  const completados = examenes.filter(e => e.estado === 'completado')
  const hayExamenes = examenes.length > 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{
        borderBottom: '0.5px solid var(--border)', padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: 'rgba(21,15,7,0.85)', backdropFilter: 'blur(12px)', zIndex: 50,
      }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <CandleIcon size={14} />
          <span style={{ fontFamily: 'var(--font-serif), serif', color: 'var(--ink)', fontSize: '1rem' }}>Candil</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/perfil" style={{ color: 'var(--ink-muted)', fontSize: 13, textDecoration: 'none', transition: 'color 200ms' }}>
            Mi perfil
          </Link>
          <form action="/auth/signout" method="post">
            <button style={{ color: 'var(--ink-muted)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color 200ms' }}>
              Salir
            </button>
          </form>
        </div>
      </nav>

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '48px 24px 120px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif), serif', color: 'var(--ink)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 6 }}>
              {saludo()}, {nombre}.
            </h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>
              {activos.length > 0
                ? `Tenés ${activos.length} ${activos.length === 1 ? 'examen activo' : 'exámenes activos'}.`
                : 'Sin exámenes activos por ahora.'}
            </p>
          </div>
          <Link href="/nuevo" className="btn-primary" style={{ padding: '11px 22px', fontSize: '0.9rem', borderRadius: 100 }}>
            + Nuevo examen
          </Link>
        </div>

        {hayExamenes ? (
          <>
            <RachaStrip racha={racha} ultimaActividad={ultimaActividad} />

            {/* Próximos */}
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>
                Próximos exámenes
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {activos.map(e => <ExamenCard key={e.id} examen={e} />)}
                <Link href="/nuevo" style={{
                  border: '0.5px dashed var(--border-mid)', borderRadius: 12, minHeight: 230,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  textDecoration: 'none', color: 'var(--ink-faint)',
                  transition: 'border-color 200ms var(--ease-out), color 200ms',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--amber)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--ink-faint)' }}
                >
                  <span style={{ fontSize: 28, lineHeight: 1, fontWeight: 300 }}>+</span>
                  <span style={{ fontSize: 13 }}>Nuevo examen</span>
                </Link>
              </div>
            </section>

            {/* Completados */}
            {completados.length > 0 && (
              <section>
                <button onClick={() => setShowCompletados(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0, marginBottom: 16, fontFamily: 'inherit',
                  }}>
                  <span style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                    Completados ({completados.length})
                  </span>
                  <span style={{
                    fontSize: 10, color: 'var(--ink-muted)', display: 'inline-block',
                    transform: showCompletados ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 250ms var(--ease-out)',
                  }}>▾</span>
                </button>
                {showCompletados && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14,
                    animation: 'fadeUp 350ms var(--ease-out) both',
                  }}>
                    {completados.map(e => <CompletadoCard key={e.id} examen={e} />)}
                  </div>
                )}
              </section>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </main>

      {/* FAB Modo foco + modal Pomodoro */}
      <Pomodoro />
    </div>
  )
}
