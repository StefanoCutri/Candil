'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { CandleIcon } from '@/components/CandleIcon'

export type PlanPublico = {
  contenido: {
    dias: {
      fecha: string
      dia_nombre: string
      bloques: {
        hora_inicio: string
        hora_fin: string
        tema: string
        tipo: string
        descripcion?: string
        duracion_minutos?: number
      }[]
    }[]
    resumen?: string
    consejo?: string
  }
  materia: string
  fecha: string | null
  tipo: string | null
  autor: string | null
}

const STRIPE: Record<string, string> = {
  estudio: 'var(--amber)',
  repaso: 'rgba(139,180,160,0.7)',
  pausa: 'var(--ink-faint)',
  simulacro: 'rgba(180,120,200,0.7)',
}

const TAG_BG: Record<string, string> = {
  estudio: 'var(--amber-dim)',
  repaso: 'var(--green-dim)',
  pausa: 'rgba(249,232,200,0.05)',
  simulacro: 'rgba(180,120,200,0.1)',
}

const TAG_COLOR: Record<string, string> = {
  estudio: 'rgba(232,164,74,0.9)',
  repaso: 'var(--green)',
  pausa: 'var(--ink-faint)',
  simulacro: 'rgba(200,150,220,0.8)',
}

const DATE_LOCALES: Record<string, string> = { es: 'es-AR', en: 'en-US', pt: 'pt-BR' }

function formatFechaDia(f: string, dateLocale: string) {
  const d = new Date(f + 'T12:00:00')
  return d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
}

function formatFechaLarga(f: string, dateLocale: string) {
  const d = new Date(f + 'T12:00:00')
  return d.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })
}

function iniciales(nombre: string) {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
}

export default function PublicoClient({ plan }: { plan: PlanPublico }) {
  const t = useTranslations('public')
  const tPlan = useTranslations('plan')
  const locale = useLocale()
  const dateLocale = DATE_LOCALES[locale] ?? 'es-AR'
  const dias = plan.contenido?.dias ?? []
  const hoy = new Date().toISOString().split('T')[0]
  const hoyIdx = dias.findIndex(d => d.fecha === hoy)

  const [banner, setBanner] = useState(true)
  const [activeDayIdx, setActiveDayIdx] = useState(hoyIdx >= 0 ? hoyIdx : 0)

  const todosBloques = dias.flatMap(d => d.bloques)
  const sinPausa = todosBloques.filter(b => b.tipo !== 'pausa')
  const uniqueTemas = new Set(sinPausa.map(b => b.tema)).size
  const totalHoras = Math.round(todosBloques.reduce((s, b) => s + (b.duracion_minutos || 0), 0) / 60)

  const fechaExamen = plan.fecha ?? dias[dias.length - 1]?.fecha ?? null
  let diffLabel: string | null = null
  if (fechaExamen) {
    const [y, m, d] = fechaExamen.split('-').map(Number)
    const diff = Math.round((new Date(y, m - 1, d).getTime() - new Date(new Date().setHours(0, 0, 0, 0)).getTime()) / 86400000)
    diffLabel = diff < 0 ? tPlan('diff_passed') : diff === 0 ? tPlan('diff_today') : diff === 1 ? tPlan('diff_tomorrow') : tPlan('diff_days', { count: diff })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 300 }}>

      {/* ── BANNER STICKY ── */}
      {banner && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '9px 20px', background: 'var(--amber)', color: 'var(--bg)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {t('banner')}
          </span>
          <Link href="/registro" style={{
            fontSize: 12, fontWeight: 600, color: 'var(--amber)', background: 'var(--bg)',
            padding: '5px 14px', borderRadius: 100, textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            {t('start_free')}
          </Link>
          <button onClick={() => setBanner(false)} aria-label={t('close')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--bg)', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 4, opacity: 0.7 }}>
            ✕
          </button>
        </div>
      )}

      {/* ── NAV ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', padding: '1rem 2rem', borderBottom: '0.5px solid var(--border)',
        position: 'sticky', top: banner ? 42 : 0, zIndex: 50,
        background: 'var(--nav-bg)', backdropFilter: 'blur(12px)', transition: 'top 250ms var(--ease-out)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', color: 'var(--ink)', textDecoration: 'none' }}>
          <CandleIcon size={14} /> Candil
        </Link>
        <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginLeft: '1.5rem', paddingLeft: '1.5rem', borderLeft: '0.5px solid var(--border-mid)' }}>
          {t('shared_plan')}
        </span>
        <Link href="/registro" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--amber)', textDecoration: 'none', fontWeight: 500 }}>
          {t('create_account')}
        </Link>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          {plan.autor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'var(--surface2)', border: '0.5px solid var(--border-mid)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: 'var(--amber)', letterSpacing: '0.04em',
              }}>
                {iniciales(plan.autor)}
              </div>
              <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                {t.rich('shared_by', { autor: plan.autor, name: chunks => <span style={{ color: 'var(--ink-soft)' }}>{chunks}</span> })}
              </span>
            </div>
          )}
          {fechaExamen && (
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.65, marginBottom: '0.5rem' }}>
              {tPlan('exam_on')} · {formatFechaLarga(fechaExamen, dateLocale)}
            </p>
          )}
          <h1 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {plan.materia}
            {plan.tipo && <><br /><em style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>{plan.tipo}</em></>}
          </h1>
        </div>

        {/* ── STATS PILLS ── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {([
            ...(diffLabel ? [{ dot: 'var(--amber)', content: <>{tPlan('stat_remaining')} <span style={{ color: 'var(--ink)', fontWeight: 500 }}>&nbsp;{diffLabel}</span></> }] : []),
            { dot: 'var(--green)', content: <><span style={{ color: 'var(--ink)', fontWeight: 500 }}>{tPlan('stat_topics', { count: uniqueTemas })}</span>&nbsp;{tPlan('stat_to_study')}</> },
            { dot: 'var(--ink-faint)', content: <><span style={{ color: 'var(--ink)', fontWeight: 500 }}>{totalHoras} hs</span>&nbsp;{t('distributed')}</> },
          ]).map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 100, background: 'var(--surface)', border: '0.5px solid var(--border-mid)', fontSize: 12, color: 'var(--ink-soft)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
              {s.content}
            </div>
          ))}
        </div>

        {/* ── AVISO READONLY ── */}
        <div style={{ margin: '0 0 2rem', padding: '12px 18px', borderRadius: 10, borderLeft: '2px solid var(--border-strong)', background: 'var(--surface)', fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
          {t.rich('readonly_notice', { link: chunks => <Link href="/registro" style={{ color: 'var(--amber)', textDecoration: 'none' }}>{chunks}</Link> })}
        </div>

        {/* ── RESUMEN ── */}
        {plan.contenido?.resumen && (
          <div style={{ margin: '0 0 2rem', padding: '14px 18px', borderRadius: 10, borderLeft: '2px solid var(--amber)', background: 'var(--amber-dim)', fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', lineHeight: 1.6 }}>
            {plan.contenido.resumen}
          </div>
        )}

        {/* ── DAY TABS ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: 2 }}>
          {dias.map((dia, i) => {
            const esHoy = dia.fecha === hoy
            const isActive = activeDayIdx === i
            return (
              <button key={dia.fecha} onClick={() => setActiveDayIdx(i)}
                style={{
                  padding: '7px 16px', borderRadius: 100,
                  border: `0.5px solid ${esHoy ? 'var(--amber)' : isActive ? 'var(--border-strong)' : 'var(--border-mid)'}`,
                  background: isActive ? 'var(--surface2)' : 'transparent',
                  color: esHoy ? 'var(--amber)' : isActive ? 'var(--ink)' : 'var(--ink-muted)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 200ms var(--ease-out)', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                {dia.dia_nombre}
              </button>
            )
          })}
        </div>

        {/* ── DAY PANELS (solo lectura) ── */}
        {dias.map((dia, di) => {
          if (di !== activeDayIdx) return null
          return (
            <div key={dia.fecha} style={{ animation: 'panelIn 300ms var(--ease-out) forwards' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: '1.25rem' }}>
                <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.05rem', fontWeight: 500, letterSpacing: '-0.01em' }}>{dia.dia_nombre}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{formatFechaDia(dia.fecha, dateLocale)}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dia.bloques.map((bloque, bi) => {
                  const tipo = bloque.tipo
                  return (
                    <div key={bi} style={{
                      display: 'flex', alignItems: 'stretch',
                      borderRadius: 10, border: `0.5px solid ${tipo === 'pausa' ? 'var(--border-mid)' : 'var(--border)'}`,
                      background: tipo === 'pausa' ? 'transparent' : 'var(--surface)',
                      borderStyle: tipo === 'pausa' ? 'dashed' : 'solid',
                      overflow: 'hidden',
                    }}>
                      <div style={{ width: 3, flexShrink: 0, background: STRIPE[tipo] || STRIPE.estudio }} />
                      <div style={{ padding: '12px 14px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: 'var(--ink-muted)', letterSpacing: '0.04em', flexShrink: 0 }}>
                            {bloque.hora_inicio}–{bloque.hora_fin}
                          </span>
                          <span style={{ fontSize: 14, color: 'var(--ink)', flex: 1 }}>
                            {bloque.tema}
                          </span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: TAG_BG[tipo] || TAG_BG.estudio, color: TAG_COLOR[tipo] || TAG_COLOR.estudio, flexShrink: 0 }}>
                            {['estudio', 'repaso', 'pausa', 'simulacro'].includes(tipo) ? tPlan(`tag_${tipo}`) : tipo}
                          </span>
                        </div>
                        {bloque.descripcion && (
                          <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5 }}>{bloque.descripcion}</div>
                        )}
                        {(bloque.duracion_minutos ?? 0) > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>
                            {bloque.duracion_minutos! >= 60
                              ? `${(bloque.duracion_minutos! / 60).toFixed(bloque.duracion_minutos! % 60 === 0 ? 0 : 2)} hs`
                              : `${bloque.duracion_minutos} min`}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* ── CONSEJO ── */}
        {plan.contenido?.consejo && (
          <div style={{ marginTop: '2rem', padding: '14px 18px', borderRadius: 10, background: 'var(--bg2)', border: '0.5px solid var(--border)' }}>
            <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>{t('tip')}</p>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{plan.contenido.consejo}</p>
          </div>
        )}

        {/* ── CTA INFERIOR ── */}
        <div style={{ marginTop: '4rem', textAlign: 'center', padding: '3rem 1.5rem', borderRadius: 16, background: 'var(--bg2)', border: '0.5px solid var(--border)' }}>
          <div style={{ display: 'inline-block', animation: 'floatUp 3s ease-in-out infinite', filter: 'drop-shadow(0 0 16px rgba(232,164,74,0.35))', marginBottom: '1.25rem' }}>
            <svg width="36" height="52" viewBox="0 0 56 80" fill="none" style={{ animation: 'flicker 2.5s ease-in-out infinite', transformOrigin: '50% 85%' }}>
              <path d="M28 4C28 4 44 22 44 36C44 46 37.2 55 28 55C18.8 55 12 46 12 36C12 22 28 4 28 4Z" fill="#E8A44A" opacity="0.88"/>
              <path d="M28 16C28 16 38 29 38 37C38 43 33.5 48 28 48C22.5 48 18 43 18 37C18 29 28 16 28 16Z" fill="#F5C97A"/>
              <path d="M28 30C28 30 32 35 32 38C32 40.2 30.2 42 28 42C25.8 42 24 40.2 24 38C24 35 28 30 28 30Z" fill="white" opacity="0.5"/>
              <rect x="21" y="55" width="14" height="18" rx="3" fill="#6B4226"/>
              <rect x="14" y="70" width="28" height="6" rx="3" fill="#3D2B1F"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.5rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '1.5rem' }}>
            {t('cta_title')}
          </h2>
          <Link href="/registro" className="btn-primary" style={{ borderRadius: 100, padding: '13px 32px' }}>
            {t('start_free')}
          </Link>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 14 }}>
            {t('cta_note')}
          </p>
        </div>
      </div>
    </div>
  )
}
