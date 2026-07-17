'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import Pomodoro from '@/components/Pomodoro'
import { CandleIcon } from '@/components/CandleIcon'
import UserMenu from '@/components/UserMenu'
import OnboardingModal from '@/components/OnboardingModal'

export type ExamenRow = {
  id: string
  materia: string
  tipo: string | null
  fecha: string
  estado: string
  temas: { id: string }[]
  planes: { id: string; bloques: { id: string; completado: boolean; dia: string; tipo: string }[] }[]
}

export const DATE_LOCALES: Record<string, string> = { es: 'es-AR', en: 'en-US', pt: 'pt-BR' }

function diasRestantes(fecha: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const [y, m, d] = fecha.split('-').map(Number)
  const exam = new Date(y, m - 1, d)
  return Math.round((exam.getTime() - hoy.getTime()) / 86400000)
}

function formatFecha(fecha: string, dateLocale: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })
}

function saludoKey() {
  const h = new Date().getHours()
  if (h >= 6 && h < 13) return 'greeting_morning'
  if (h >= 13 && h < 20) return 'greeting_afternoon'
  return 'greeting_evening'
}

function progresoDe(examen: ExamenRow) {
  const bloques = (examen.planes?.[0]?.bloques ?? []).filter(b => b.tipo !== 'pausa')
  if (bloques.length === 0) return { pct: 0, hasBloques: false }
  const done = bloques.filter(b => b.completado).length
  return { pct: Math.round((done / bloques.length) * 100), hasBloques: true }
}

/* Escala emocional según días restantes: hoy > crítico (1-3) > pronto (4-7) > normal */
export type Urgencia = 'hoy' | 'critico' | 'pronto' | 'normal'
export function nivelUrgencia(dias: number): Urgencia {
  if (dias === 0) return 'hoy'
  if (dias <= 3) return 'critico'
  if (dias <= 7) return 'pronto'
  return 'normal'
}

const URGENCIA_GLOW: Record<Urgencia, string | undefined> = {
  hoy: '0 0 44px -10px rgba(232,164,74,0.45)',
  critico: '0 0 36px -12px rgba(232,164,74,0.3)',
  pronto: undefined,
  normal: undefined,
}

function bloquesHoyPendientes(examen: ExamenRow) {
  const hoy = new Date().toLocaleDateString('sv-SE')
  return (examen.planes?.[0]?.bloques ?? []).filter(b => b.dia === hoy && !b.completado && b.tipo !== 'pausa').length
}

/* ── Racha strip ── */
function RachaStrip({ racha, ultimaActividad }: { racha: number; ultimaActividad: string | null }) {
  const t = useTranslations('dashboard')
  const DIA_LETRAS = t('week_letters').split(',')
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
          ? t.rich('streak', { days: racha, strong: chunks => <strong style={{ color: 'var(--amber)', fontWeight: 600 }}>{chunks}</strong> })
          : t('streak_empty')}
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
              <span style={{ fontSize: 10, color: activo ? 'var(--amber)' : 'var(--ink-faint)', letterSpacing: '0.05em' }}>{letra}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Hero card: el examen más urgente ── */
function HeroCard({ examen }: { examen: ExamenRow }) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const [hover, setHover] = useState(false)
  const dias = diasRestantes(examen.fecha)
  const urg = nivelUrgencia(dias)
  const urgente = urg === 'hoy' || urg === 'critico'
  const { pct } = progresoDe(examen)
  const planId = examen.planes?.[0]?.id ?? null
  const pendientesHoy = bloquesHoyPendientes(examen)

  return (
    <Link href={planId ? `/plan/${planId}` : '/nuevo'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        gridColumn: '1 / -1', display: 'flex', flexDirection: 'column',
        borderRadius: 14, padding: '28px 28px 24px',
        background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg2) 100%)',
        border: `0.5px solid ${urgente ? 'var(--border-strong)' : hover ? 'var(--border-strong)' : 'var(--border-mid)'}`,
        boxShadow: URGENCIA_GLOW[urg],
        textDecoration: 'none', color: 'inherit', cursor: 'pointer',
        transform: hover ? 'translateY(-1px)' : 'none',
        transition: 'border-color 200ms var(--ease-out), transform 200ms var(--ease-out), box-shadow 300ms var(--ease-out)',
        position: 'relative', overflow: 'hidden',
      }}>
      {urgente && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--amber), var(--amber2))', animation: urg === 'hoy' ? 'urgentPulse 1.8s ease-in-out infinite' : undefined }} />
      )}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.7, marginBottom: 8 }}>
            {t('hero_next')}
          </p>
          <h3 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.2, marginBottom: 6 }}>
            {examen.materia}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', textTransform: 'capitalize', marginBottom: 14 }}>
            {formatFecha(examen.fecha, DATE_LOCALES[locale] ?? 'es-AR')}
          </p>
          {pendientesHoy > 0 && (
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 4 }}>
              <span style={{ color: 'var(--amber)' }}>●</span> {t('hero_today_blocks', { count: pendientesHoy })}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0 }}>
          <span style={{
            fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '3rem', lineHeight: 1, fontWeight: 500,
            color: urgente ? 'var(--amber)' : urg === 'pronto' ? 'var(--amber2)' : 'var(--ink)', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums',
            animation: urg === 'hoy' ? 'urgentPulse 1.8s ease-in-out infinite' : undefined,
          }}>
            {dias === 0 ? t('today') : String(dias)}
          </span>
          {dias > 0 && (
            <span style={{ fontSize: 14, color: urgente ? 'var(--amber)' : 'var(--ink-muted)' }}>
              {dias === 1 ? t('day_left') : t('days_left')}
            </span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.15em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{t('progress')}</span>
          <span style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 500 }}>{pct}%</span>
        </div>
        <div style={{ height: 5, background: 'var(--border-mid)', borderRadius: 100, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--amber), var(--amber2))', borderRadius: 100, transition: 'width 600ms var(--ease-out)' }} />
        </div>
        <span className="btn-primary" style={{ display: 'inline-block', padding: '10px 22px', fontSize: '0.88rem', borderRadius: 100 }}>
          {planId ? t('go_to_plan') : t('no_plan')}
        </span>
      </div>
    </Link>
  )
}

/* ── Card secundaria compacta ── */
function ExamenCardMini({ examen }: { examen: ExamenRow }) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const [hover, setHover] = useState(false)
  const dias = diasRestantes(examen.fecha)
  const urg = nivelUrgencia(dias)
  const urgente = urg === 'hoy' || urg === 'critico'
  const { pct } = progresoDe(examen)
  const planId = examen.planes?.[0]?.id ?? null

  return (
    <Link href={planId ? `/plan/${planId}` : '/nuevo'} className="card"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 12, padding: '16px 18px 14px',
        display: 'flex', flexDirection: 'column', minHeight: 130,
        textDecoration: 'none', color: 'inherit', cursor: 'pointer',
        borderColor: urgente ? 'var(--border-strong)' : hover ? 'var(--border-strong)' : undefined,
        boxShadow: URGENCIA_GLOW[urg],
        transform: hover ? 'translateY(-1px)' : 'none',
        transition: 'border-color 200ms var(--ease-out), transform 200ms var(--ease-out)',
        position: 'relative', overflow: 'hidden',
      }}>
      {urgente && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--amber), var(--amber2))', animation: urg === 'hoy' ? 'urgentPulse 1.8s ease-in-out infinite' : undefined }} />
      )}
      <h3 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.98rem', fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)', lineHeight: 1.25, marginBottom: 4 }}>
        {examen.materia}
      </h3>
      <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 12, textTransform: 'capitalize' }}>
        {formatFecha(examen.fecha, DATE_LOCALES[locale] ?? 'es-AR')}
      </p>
      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.3rem', lineHeight: 1, color: urgente ? 'var(--amber)' : 'var(--ink)', letterSpacing: '-0.02em' }}>
              {dias === 0 ? t('today') : String(dias)}
            </span>
            {dias > 0 && <span style={{ fontSize: 11, color: urgente ? 'var(--amber)' : 'var(--ink-muted)' }}>{dias === 1 ? t('day_left') : t('days_left')}</span>}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--amber)', fontWeight: 500 }}>{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%`, transition: 'width 600ms var(--ease-out)' }} />
        </div>
      </div>
    </Link>
  )
}

/* ── Card de examen que pasó sin completar ── */
function PasadoCard({ examen, onArchivar, onEliminar }: {
  examen: ExamenRow
  onArchivar: (id: string) => void
  onEliminar: (id: string) => void
}) {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { pct } = progresoDe(examen)

  return (
    <div className="card" style={{ borderRadius: 12, padding: '16px 18px 14px', opacity: 0.7, display: 'flex', flexDirection: 'column', minHeight: 120 }}>
      <h3 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.98rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
        {examen.materia}
      </h3>
      <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 12, textTransform: 'capitalize' }}>
        {formatFecha(examen.fecha, DATE_LOCALES[locale] ?? 'es-AR')} · {pct}%
      </p>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <button onClick={() => onArchivar(examen.id)}
          style={{ fontFamily: 'inherit', fontSize: 12, padding: '6px 14px', borderRadius: 100, background: 'transparent', color: 'var(--ink-soft)', border: '0.5px solid var(--border-mid)', cursor: 'pointer' }}>
          {t('archive')}
        </button>
        <button onClick={() => onEliminar(examen.id)}
          style={{ fontFamily: 'inherit', fontSize: 12, padding: '6px 14px', borderRadius: 100, background: 'transparent', color: 'rgba(235,140,120,0.85)', border: '0.5px solid rgba(235,140,120,0.3)', cursor: 'pointer' }}>
          {tCommon('delete')}
        </button>
      </div>
    </div>
  )
}

/* ── Card de examen completado ── */
function CompletadoCard({ examen }: { examen: ExamenRow }) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const nTemas = examen.temas?.length ?? 0
  const planId = examen.planes?.[0]?.id ?? null

  return (
    <div className="card" style={{ borderRadius: 12, padding: '20px 20px 16px', opacity: 0.55, display: 'flex', flexDirection: 'column', minHeight: 150 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.05rem', fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
          {examen.materia}
        </h3>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap',
          background: 'var(--green-dim)', border: '0.5px solid rgba(90,158,120,0.3)', color: 'var(--green)',
        }}>
          {t('completed_badge')}
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 14, textTransform: 'capitalize' }}>
        {formatFecha(examen.fecha, DATE_LOCALES[locale] ?? 'es-AR')}
      </p>
      <div style={{ marginTop: 'auto' }}>
        <div className="progress-bar" style={{ marginBottom: 12 }}>
          <div style={{ width: '100%', height: '100%', background: 'var(--green)', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t('topics_count', { count: nTemas })}</span>
          {planId && (
            <Link href={`/plan/${planId}`} style={{ fontSize: 12.5, color: 'var(--ink-muted)', textDecoration: 'none' }}>
              {t('view_plan')}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Estado vacío ── */
function EmptyState() {
  const t = useTranslations('dashboard')
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
      <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.4rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
        {t('empty_title')}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 28 }}>
        {t('empty_sub')}
      </p>
      <Link href="/nuevo" className="btn-primary">
        {t('empty_cta')}
      </Link>
    </div>
  )
}

/* ── Main ── */
export default function DashboardClient({ nombre, email, racha, ultimaActividad, examenes }: {
  nombre: string
  email: string | null
  racha: number
  ultimaActividad: string | null
  examenes: ExamenRow[]
}) {
  const t = useTranslations('dashboard')
  const tNav = useTranslations('nav')
  const supabase = createClient()
  const [showCompletados, setShowCompletados] = useState(false)
  const [showPasados, setShowPasados] = useState(false)
  const [showTodos, setShowTodos] = useState(false)
  const [lista, setLista] = useState(examenes)

  const noArchivados = lista.filter(e => e.estado !== 'completado' && e.estado !== 'archivado')
  // Los que ya pasaron sin completar no se mezclan con los activos
  const activos = noArchivados
    .filter(e => diasRestantes(e.fecha) >= 0)
    .sort((a, b) => diasRestantes(a.fecha) - diasRestantes(b.fecha))
  const pasados = noArchivados.filter(e => diasRestantes(e.fecha) < 0)
  const completados = lista.filter(e => e.estado === 'completado')
  const hayExamenes = lista.length > 0

  const hero = activos[0] ?? null
  const resto = activos.slice(1)
  const restoVisible = showTodos || activos.length <= 6 ? resto : resto.slice(0, 5)
  const ocultos = resto.length - restoVisible.length

  async function archivarPasado(id: string) {
    setLista(prev => prev.map(e => e.id === id ? { ...e, estado: 'archivado' } : e))
    await supabase.from('examenes').update({ estado: 'archivado' }).eq('id', id)
  }

  async function eliminarPasado(id: string) {
    setLista(prev => prev.filter(e => e.id !== id))
    await supabase.from('examenes').delete().eq('id', id)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{
        borderBottom: '0.5px solid var(--border)', padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: 'var(--nav-bg)', backdropFilter: 'blur(12px)', zIndex: 50,
      }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <CandleIcon size={14} />
          <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', color: 'var(--ink)', fontSize: '1rem' }}>Candil</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/grupos" style={{ color: 'var(--ink-muted)', fontSize: 13, textDecoration: 'none', transition: 'color 200ms' }}>
            {tNav('groups')}
          </Link>
          <UserMenu nombre={nombre} email={email} />
        </div>
      </nav>

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '48px 24px 120px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', color: 'var(--ink)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 6 }}>
              {t(saludoKey())}, {nombre}.
            </h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>
              {activos.length > 0 ? t('active_exams', { count: activos.length }) : t('no_active_exams')}
            </p>
          </div>
          <Link href="/nuevo" className="btn-primary" style={{ padding: '11px 22px', fontSize: '0.9rem', borderRadius: 100 }}>
            {t('new_exam')}
          </Link>
        </div>

        {hayExamenes ? (
          <>
            <RachaStrip racha={racha} ultimaActividad={ultimaActividad} />

            {/* Próximos */}
            {activos.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
                  {hero && <HeroCard examen={hero} />}
                  {restoVisible.map(e => <ExamenCardMini key={e.id} examen={e} />)}
                  <Link href="/nuevo" style={{
                    border: '0.5px dashed var(--border-mid)', borderRadius: 12, minHeight: 130,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                    textDecoration: 'none', color: 'var(--ink-faint)',
                    transition: 'border-color 200ms var(--ease-out), color 200ms',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--amber)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--ink-faint)' }}
                  >
                    <span style={{ fontSize: 24, lineHeight: 1, fontWeight: 300 }}>+</span>
                    <span style={{ fontSize: 13 }}>{t('new_exam_card')}</span>
                  </Link>
                </div>
                {ocultos > 0 && (
                  <button onClick={() => setShowTodos(true)}
                    style={{ marginTop: 16, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13, color: 'var(--amber)', cursor: 'pointer', padding: 0 }}>
                    {t('show_all', { count: activos.length })}
                  </button>
                )}
              </section>
            )}
            {activos.length === 0 && pasados.length === 0 && <EmptyState />}

            {/* Pasados sin completar */}
            {pasados.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <button onClick={() => setShowPasados(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0, marginBottom: 16, fontFamily: 'inherit',
                  }}>
                  <span style={{ fontSize: 11, letterSpacing: '0.15em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                    {t('past_pending')} ({pasados.length})
                  </span>
                  <span style={{
                    fontSize: 10, color: 'var(--ink-muted)', display: 'inline-block',
                    transform: showPasados ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 250ms var(--ease-out)',
                  }}>▾</span>
                </button>
                {showPasados && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14,
                    animation: 'fadeUp 350ms var(--ease-out) both',
                  }}>
                    {pasados.map(e => <PasadoCard key={e.id} examen={e} onArchivar={archivarPasado} onEliminar={eliminarPasado} />)}
                  </div>
                )}
              </section>
            )}

            {/* Completados */}
            {completados.length > 0 && (
              <section>
                <button onClick={() => setShowCompletados(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0, marginBottom: 16, fontFamily: 'inherit',
                  }}>
                  <span style={{ fontSize: 11, letterSpacing: '0.15em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                    {t('completed')} ({completados.length})
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

      {/* Onboarding para usuarios nuevos */}
      {!hayExamenes && <OnboardingModal />}

      {/* FAB Modo foco + modal Pomodoro */}
      <Pomodoro />
    </div>
  )
}
