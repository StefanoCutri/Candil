'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CandleIcon } from '@/components/CandleIcon'
import UpgradeModal from '@/components/UpgradeModal'
import { useTranslations, useLocale } from 'next-intl'

/* ── Types ── */
type TipoExamen = 'multiple_choice' | 'oral' | 'desarrollo' | 'integrador'
type Preferencia = 'manana' | 'tarde' | 'noche'
type Tema = { id: string; nombre: string; yaloSe: boolean }
type DiaDisp = { dia: string; diaNombre: string; horas: number; bloqueado: boolean; bloques: { inicio: string; fin: string }[] }

/* ── Constants ── */
// key = valor guardado en la DB · slug = clave de traducción (sin acentos)
const DIAS: { key: string; slug: string }[] = [
  { key: 'lunes', slug: 'lunes' },
  { key: 'martes', slug: 'martes' },
  { key: 'miércoles', slug: 'miercoles' },
  { key: 'jueves', slug: 'jueves' },
  { key: 'viernes', slug: 'viernes' },
  { key: 'sábado', slug: 'sabado' },
  { key: 'domingo', slug: 'domingo' },
]

const TIPOS: { value: TipoExamen; icon: string }[] = [
  { value: 'multiple_choice', icon: '⊡' },
  { value: 'oral', icon: '◎' },
  { value: 'desarrollo', icon: '≡' },
  { value: 'integrador', icon: '⊕' },
]

const PREFS: { value: Preferencia; icon: string }[] = [
  { value: 'manana', icon: '🌅' },
  { value: 'tarde', icon: '☀️' },
  { value: 'noche', icon: '🌙' },
]

const DATE_LOCALES: Record<string, string> = { es: 'es-AR', en: 'en-US', pt: 'pt-BR' }

function formatFecha(f: string, dateLocale: string) {
  if (!f) return '—'
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ── Main ── */
export default function NuevoExamenPage() {
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('wizard')
  const tTypes = useTranslations('types')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const dateLocale = DATE_LOCALES[locale] ?? 'es-AR'

  const [step, setStep] = useState(1)
  const [generando, setGenerando] = useState(false)
  const [showModal, setShowModal] = useState(false)
  // 'bloque': abierto desde "+ Bloque" (solo cerrar) · 'next': abierto desde "Siguiente" (ofrece continuar sin bloques)
  const [modalCtx, setModalCtx] = useState<'bloque' | 'next'>('bloque')
  const [userPlan, setUserPlan] = useState<string>('free')
  const [limiteMsg, setLimiteMsg] = useState<string | null>(null)
  const esPro = userPlan === 'pro' || userPlan === 'plus'

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('plan').eq('id', user.id).single()
        .then(({ data }) => { if (data?.plan) setUserPlan(data.plan) })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Step 1
  const [materia, setMateria] = useState('')
  const [tipos, setTipos] = useState<TipoExamen[]>([])
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const [fecha, setFecha] = useState(tomorrow.toISOString().split('T')[0])
  const [hora, setHora] = useState('09:00')

  // Step 2
  const [temas, setTemas] = useState<Tema[]>([])
  const [nuevoTema, setNuevoTema] = useState('')
  const temaInputRef = useRef<HTMLInputElement>(null)

  // Step 3
  const [disponibilidad, setDisponibilidad] = useState<DiaDisp[]>(
    DIAS.map(d => ({ dia: d.key, diaNombre: d.slug, horas: d.key === 'sábado' || d.key === 'domingo' ? 4 : 2, bloqueado: false, bloques: [] }))
  )
  const [preferencia, setPreferencia] = useState<Preferencia>('manana')

  const hoyStr = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD local
  const fechaPasada = !!fecha && fecha < hoyStr
  const paso1Invalido = !materia.trim() || !fecha || fechaPasada
  const sinHoras = !disponibilidad.some(d => !d.bloqueado && d.horas > 0)

  /* ── Tipo toggle ── */
  function toggleTipo(t: TipoExamen) {
    setTipos(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  /* ── Temas ── */
  function agregarTema() {
    const nombre = nuevoTema.trim()
    if (!nombre) return
    setTemas(prev => [...prev, { id: crypto.randomUUID(), nombre, yaloSe: false }])
    setNuevoTema('')
    temaInputRef.current?.focus()
  }

  function deleteTema(id: string) {
    setTemas(prev => prev.filter(t => t.id !== id))
  }

  function toggleYaLoSe(id: string) {
    setTemas(prev => prev.map(t => t.id === id ? { ...t, yaloSe: !t.yaloSe } : t))
  }

  /* ── Disponibilidad ── */
  function updateDia(dia: string, field: Partial<DiaDisp>) {
    setDisponibilidad(prev => prev.map(d => d.dia === dia ? { ...d, ...field } : d))
  }

  function toggleDia(dia: string) {
    setDisponibilidad(prev => prev.map(d => d.dia === dia ? { ...d, bloqueado: !d.bloqueado } : d))
  }

  /* ── Bloques horarios (Pro) ── */
  function handleAddBloque(dia: string) {
    if (!esPro) {
      setModalCtx('bloque')
      setShowModal(true)
      return
    }
    setDisponibilidad(prev => prev.map(d =>
      d.dia === dia ? { ...d, bloques: [...d.bloques, { inicio: '09:00', fin: '11:00' }] } : d
    ))
  }

  function updateBloque(dia: string, idx: number, campo: 'inicio' | 'fin', valor: string) {
    setDisponibilidad(prev => prev.map(d =>
      d.dia === dia ? { ...d, bloques: d.bloques.map((b, i) => i === idx ? { ...b, [campo]: valor } : b) } : d
    ))
  }

  function removeBloque(dia: string, idx: number) {
    setDisponibilidad(prev => prev.map(d =>
      d.dia === dia ? { ...d, bloques: d.bloques.filter((_, i) => i !== idx) } : d
    ))
  }

  /* ── Navigation ── */
  function goTo(n: number) {
    setStep(n)
  }

  function handleNext3() {
    const hasProBloques = disponibilidad.some(d => d.bloques.length > 0)
    if (hasProBloques && !esPro) {
      setModalCtx('next')
      setShowModal(true)
      return
    }
    goTo(4)
  }

  function continuarSinPro() {
    setShowModal(false)
    if (modalCtx === 'next') {
      setDisponibilidad(prev => prev.map(d => ({ ...d, bloques: [] })))
      goTo(4)
    }
  }

  /* ── Generate plan ── */
  async function handleGenerar() {
    setGenerando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: examen, error: examError } = await supabase
        .from('examenes')
        .insert({
          user_id: user.id,
          materia,
          tipo: tipos.join(', '),
          fecha,
          hora: hora || null,
          preferencia_horario: preferencia,
          estado: 'activo',
        })
        .select()
        .single()

      if (examError || !examen) throw examError

      if (temas.length > 0) {
        const { data: temasInsertados, error: temasError } = await supabase
          .from('temas')
          .insert(
            temas.map((t, i) => ({
              examen_id: examen.id,
              nombre: t.nombre,
              ya_lo_se: t.yaloSe,
              peso: null,
              orden: i,
            }))
          )
          .select()
        console.log('[nuevo] Temas insertados:', temasInsertados?.length ?? 0, 'de', temas.length, 'para examen_id', examen.id)
        if (temasError) {
          console.error('[nuevo] Error insertando temas:', temasError)
          throw temasError
        }
      }

      const hayBloques = esPro && disponibilidad.some(d => d.bloques.length > 0)
      const { error: dispError } = await supabase.from('disponibilidad').insert(
        disponibilidad.map(d => ({
          examen_id: examen.id,
          dia: d.dia,
          horas: d.horas,
          bloqueado: d.bloqueado,
          ...(hayBloques ? { bloques_horarios: d.bloques } : {}),
        }))
      )
      if (dispError) throw dispError

      const response = await fetch('/api/generar-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examenId: examen.id }),
      })

      if (response.status === 429) {
        const data = await response.json().catch(() => null)
        setGenerando(false)
        setLimiteMsg(data?.error ?? t('limit_reached'))
        return
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? '')
      }
      const { planId } = await response.json()
      router.push(`/plan/${planId}`)
    } catch (e) {
      setGenerando(false)
      console.error('[nuevo] Error generando plan:', e)
      // Los errores de Supabase (PostgrestError) no son instanceof Error pero traen .message
      const msg = e instanceof Error ? e.message : ''
      // Solo mostramos mensajes que ya vienen humanizados de la API (ej: límite de tier)
      const esHumano = msg && !/supabase|postgrest|pgrst|column|relation|violates|jwt/i.test(msg)
      alert(esHumano ? msg : t('generate_error'))
    }
  }

  /* ── Resumen data ── */
  const totalHoras = disponibilidad.filter(d => !d.bloqueado).reduce((s, d) => s + d.horas, 0)
  const temasSabe = temas.filter(t => t.yaloSe).length
  const temasEstudiar = temas.length - temasSabe
  const tiposLabel = tipos.map(v => tTypes(v)).join(' + ') || '—'

  const resumenRows = [
    [t('subject'), materia || '—'],
    [t('exam_type'), tiposLabel],
    [t('summary_exam'), fecha ? `${formatFecha(fecha, dateLocale)} · ${hora}` : '—'],
    [t('summary_topics'), temasEstudiar > 0
      ? `${t('topics_to_study', { count: temasEstudiar })}${temasSabe ? ` · ${t('topics_known', { count: temasSabe })}` : ''}`
      : temas.length > 0 ? t('topics_known', { count: temasSabe }) : '—'],
    [t('summary_time'), t('summary_time_value', { hours: totalHoras, pref: t(`pref_${preferencia}`).toLowerCase() })],
  ]

  /* ── Loading state ── */
  if (generando) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 0 }}>
        <div style={{ animation: 'floatUp 3s ease-in-out infinite', filter: 'drop-shadow(0 0 20px rgba(232,164,74,0.4))', marginBottom: '1.5rem' }}>
          <svg width="56" height="80" viewBox="0 0 56 80" fill="none" style={{ animation: 'flicker 2.5s ease-in-out infinite', transformOrigin: '50% 85%' }}>
            <path d="M28 4C28 4 44 22 44 36C44 46 37.2 55 28 55C18.8 55 12 46 12 36C12 22 28 4 28 4Z" fill="#E8A44A" opacity="0.88"/>
            <path d="M28 16C28 16 38 29 38 37C38 43 33.5 48 28 48C22.5 48 18 43 18 37C18 29 28 16 28 16Z" fill="#F5C97A"/>
            <path d="M28 30C28 30 32 35 32 38C32 40.2 30.2 42 28 42C25.8 42 24 40.2 24 38C24 35 28 30 28 30Z" fill="white" opacity="0.5"/>
            <rect x="21" y="55" width="14" height="18" rx="3" fill="#6B4226"/>
            <rect x="14" y="70" width="28" height="6" rx="3" fill="#3D2B1F"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
          {t('generating')}
          <span style={{ display: 'inline-flex', gap: 4, marginLeft: 2 }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--amber)', animation: `flameDot 1.2s ease-in-out ${delay}s infinite`, opacity: 0.3, display: 'inline-block' }} />
            ))}
          </span>
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{t('generating_sub')}</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', display: 'flex', flexDirection: 'column', fontWeight: 300 }}>

      {/* ── NAV ── */}
      <nav style={{ display: 'flex', alignItems: 'center', padding: '1.25rem 2rem', borderBottom: '0.5px solid var(--border)', flexShrink: 0, position: 'relative', background: 'var(--bg)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', color: 'var(--ink)', textDecoration: 'none' }}>
          <CandleIcon size={14} /> Candil
        </Link>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {[1, 2, 3, 4].map((n, i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 500, border: '0.5px solid',
                borderColor: step === n ? 'var(--amber)' : step > n ? 'var(--border-strong)' : 'var(--border-mid)',
                background: step === n ? 'var(--amber)' : step > n ? 'var(--surface2)' : 'transparent',
                color: step === n ? 'var(--bg)' : step > n ? 'var(--amber)' : 'var(--ink-muted)',
                transition: 'all 250ms var(--ease-out)', zIndex: 1,
              }}>{n}</div>
              {i < 3 && (
                <div style={{ width: 40, height: 0.5, background: step > n ? 'var(--border-strong)' : 'var(--border-mid)', transition: 'background 300ms var(--ease-out)' }} />
              )}
            </div>
          ))}
        </div>

        <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--ink-muted)', textDecoration: 'none', letterSpacing: '0.04em', marginLeft: 'auto', transition: 'color 200ms' }}>
          {tCommon('cancel')}
        </Link>
      </nav>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 560, animation: 'stepIn 350ms var(--ease-out) forwards' }} key={step}>

          {/* ── PASO 1 ── */}
          {step === 1 && (
            <>
              <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.65, marginBottom: '0.75rem' }}>{t('step', { current: 1, total: 4 })}</p>
              <h1 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
                {t.rich('step1_title', { em: chunks => <em style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>{chunks}</em>, br: () => <br /> })}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: '2.5rem', lineHeight: 1.5 }}>{t('step1_sub')}</p>

              {/* Materia */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '0.6rem' }}>{t('subject')}</label>
                <input className="input" value={materia} onChange={e => setMateria(e.target.value)} placeholder={t('subject_placeholder')} />
              </div>

              {/* Tipo */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '0.6rem' }}>{t('exam_type')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '0.5rem' }}>
                  {TIPOS.map(t => {
                    const sel = tipos.includes(t.value)
                    return (
                      <button key={t.value} onClick={() => toggleTipo(t.value)}
                        style={{
                          border: `0.5px solid ${sel ? 'var(--border-strong)' : 'var(--border-mid)'}`,
                          borderRadius: 10, padding: '16px 14px',
                          cursor: 'pointer', background: sel ? 'var(--surface2)' : 'var(--surface)',
                          textAlign: 'left', position: 'relative', overflow: 'hidden',
                          transition: 'border-color 200ms var(--ease-out), background 200ms, transform 150ms var(--ease-out)',
                          userSelect: 'none',
                        }}
                        onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                        onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = 'var(--border-mid)' }}
                      >
                        {/* Checkmark */}
                        <div style={{
                          position: 'absolute', top: 10, right: 10, width: 16, height: 16, borderRadius: 4,
                          border: `0.5px solid ${sel ? 'var(--amber)' : 'var(--border-mid)'}`,
                          background: sel ? 'var(--amber)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 200ms var(--ease-out)',
                        }}>
                          {sel && <span style={{ display: 'block', width: 7, height: 4, borderLeft: '1.5px solid #150F07', borderBottom: '1.5px solid #150F07', transform: 'rotate(-45deg) translateY(-1px)' }} />}
                        </div>
                        <span style={{ fontSize: 18, marginBottom: 8, display: 'block' }}>{t.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', display: 'block', marginBottom: 3 }}>{tTypes(t.value)}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{tTypes(`${t.value}_desc`)}</span>
                      </button>
                    )
                  })}
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t('multi_select_hint')}</p>
              </div>

              {/* Fecha + Hora */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '0.6rem' }}>{t('exam_date')}</label>
                  <input className="input" type="date" min={hoyStr} value={fecha} onChange={e => setFecha(e.target.value)} />
                  {fechaPasada && (
                    <p style={{ fontSize: 12, color: 'rgba(235,140,120,0.9)', marginTop: 6 }}>{t('date_past_error')}</p>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '0.6rem' }}>{t('time')}</label>
                  <input className="input" type="time" value={hora} onChange={e => setHora(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2rem' }}>
                <span />
                <button onClick={() => goTo(2)} disabled={paso1Invalido}
                  style={{ fontFamily: 'inherit', fontSize: 14, padding: '13px 28px', borderRadius: 100, background: 'var(--amber)', color: 'var(--bg)', border: 'none', cursor: paso1Invalido ? 'not-allowed' : 'pointer', opacity: paso1Invalido ? 0.5 : 1, transition: 'background 200ms, transform 150ms var(--ease-out)' }}>
                  {tCommon('next')} →
                </button>
              </div>
            </>
          )}

          {/* ── PASO 2 ── */}
          {step === 2 && (
            <>
              <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.65, marginBottom: '0.75rem' }}>{t('step', { current: 2, total: 4 })}</p>
              <h1 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
                {t.rich('step2_title', { em: chunks => <em style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>{chunks}</em>, br: () => <br /> })}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: '2.5rem', lineHeight: 1.5 }}>{t('step2_sub')}</p>

              {/* Add tema */}
              <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                <input ref={temaInputRef} className="input" style={{ flex: 1 }} value={nuevoTema} onChange={e => setNuevoTema(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregarTema()} placeholder={t('topic_placeholder')} />
                <button onClick={agregarTema}
                  style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', color: 'var(--amber)', fontSize: 13, cursor: 'pointer', transition: 'all 200ms var(--ease-out)', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  {t('add')}
                </button>
              </div>

              {/* Temas list or empty */}
              {temas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', border: '0.5px dashed var(--border-mid)', borderRadius: 10, color: 'var(--ink-faint)', fontSize: 13, marginBottom: '1.25rem' }}>
                  {t.rich('no_topics_yet', { br: () => <br /> })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1.25rem', maxHeight: 260, overflowY: 'auto' }}>
                  {temas.map((tema, i) => (
                    <div key={tema.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--surface)', border: '0.5px solid var(--border)', animation: 'itemIn 250ms var(--ease-out) forwards' }}>
                      <span style={{ color: 'var(--ink-faint)', fontSize: 14, flexShrink: 0 }}>⠿</span>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{tema.nombre}</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={tema.yaloSe} onChange={() => toggleYaLoSe(tema.id)}
                          style={{ width: 14, height: 14, borderRadius: 3, border: '0.5px solid var(--border-mid)', background: 'transparent', cursor: 'pointer', accentColor: 'var(--amber)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t('already_know')}</span>
                      </label>
                      <button onClick={() => deleteTema(tema.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1, fontFamily: 'monospace', flexShrink: 0 }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button onClick={() => goTo(1)} style={{ fontSize: 13, color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', fontFamily: 'inherit' }}>← {tCommon('back')}</button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <button onClick={() => goTo(3)} disabled={temas.length === 0}
                    style={{ fontFamily: 'inherit', fontSize: 14, padding: '13px 28px', borderRadius: 100, background: 'var(--amber)', color: 'var(--bg)', border: 'none', cursor: temas.length === 0 ? 'not-allowed' : 'pointer', opacity: temas.length === 0 ? 0.5 : 1, transition: 'background 200ms' }}>
                    {tCommon('next')} →
                  </button>
                  {temas.length === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t('min_one_topic')}</span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── PASO 3 ── */}
          {step === 3 && (
            <>
              <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.65, marginBottom: '0.75rem' }}>{t('step', { current: 3, total: 4 })}</p>
              <h1 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
                {t.rich('step3_title', { em: chunks => <em style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>{chunks}</em>, br: () => <br /> })}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: '2.5rem', lineHeight: 1.5 }}>{t('step3_sub')}</p>

              {/* Days */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.5rem' }}>
                {disponibilidad.map(d => (
                  <div key={d.dia} style={{
                    background: 'var(--surface)', border: '0.5px solid var(--border)',
                    borderRadius: 10, overflow: 'hidden',
                    opacity: d.bloqueado ? 0.4 : 1, transition: 'opacity 200ms, border-color 200ms',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' }}>
                      <span style={{ fontSize: 13, color: 'var(--ink-soft)', width: 82, flexShrink: 0 }}>{t(`day_${d.diaNombre}`)}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <input type="number" min={0} max={16} value={d.horas} disabled={d.bloqueado}
                          onChange={e => updateDia(d.dia, { horas: parseFloat(e.target.value) || 0 })}
                          style={{ width: 44, padding: '5px 6px', borderRadius: 6, background: 'var(--bg)', border: '0.5px solid var(--border-mid)', color: 'var(--ink)', fontSize: 13, textAlign: 'center', fontFamily: 'inherit', outline: 'none', WebkitAppearance: 'none' }} />
                        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t('hours')}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                        {/* PRO bloque button */}
                        <button onClick={() => handleAddBloque(d.dia)} disabled={d.bloqueado}
                          style={{ fontSize: 11, color: 'var(--amber)', background: 'none', border: '0.5px solid var(--border-mid)', borderRadius: 100, padding: '3px 10px', cursor: d.bloqueado ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                          {t('add_block')}
                        </button>
                        {!esPro && (
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 100, background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', color: 'var(--amber)', letterSpacing: '0.06em', fontWeight: 500 }}>PRO</span>
                        )}
                        {/* Toggle bloqueado */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                          <button onClick={() => toggleDia(d.dia)}
                            style={{
                              width: 30, height: 17, borderRadius: 100,
                              background: d.bloqueado ? 'rgba(232,164,74,0.25)' : 'var(--border-mid)',
                              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 200ms var(--ease-out)', flexShrink: 0, padding: 0,
                            }}>
                            <span style={{
                              position: 'absolute', top: 2.5, left: 2.5,
                              width: 12, height: 12, borderRadius: '50%',
                              background: d.bloqueado ? 'var(--amber)' : 'var(--ink-muted)',
                              transform: d.bloqueado ? 'translateX(13px)' : 'translateX(0)',
                              transition: 'transform 200ms var(--ease-out), background 200ms',
                              display: 'block',
                            }} />
                          </button>
                          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t('cant_this_day')}</span>
                        </label>
                      </div>
                    </div>

                    {/* Bloques horarios (Pro) */}
                    {d.bloques.length > 0 && !d.bloqueado && (
                      <div style={{ padding: '0 14px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {d.bloques.map((b, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--amber-dim)', border: '0.5px solid var(--border)', animation: 'itemIn 250ms var(--ease-out) forwards' }}>
                            <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.7, flexShrink: 0 }}>{t('block_label')}</span>
                            <input type="time" value={b.inicio} onChange={e => updateBloque(d.dia, idx, 'inicio', e.target.value)}
                              style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg)', border: '0.5px solid var(--border-mid)', color: 'var(--ink)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                            <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>–</span>
                            <input type="time" value={b.fin} onChange={e => updateBloque(d.dia, idx, 'fin', e.target.value)}
                              style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg)', border: '0.5px solid var(--border-mid)', color: 'var(--ink)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                            <button onClick={() => removeBloque(d.dia, idx)}
                              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', fontFamily: 'monospace' }}>
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Preferencia */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '0.6rem' }}>{t('best_time')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {PREFS.map(p => {
                    const sel = preferencia === p.value
                    return (
                      <button key={p.value} onClick={() => setPreferencia(p.value)}
                        style={{
                          border: `0.5px solid ${sel ? 'var(--border-strong)' : 'var(--border-mid)'}`,
                          borderRadius: 8, padding: '14px 10px', textAlign: 'center',
                          cursor: 'pointer', background: sel ? 'var(--surface2)' : 'var(--surface)',
                          transition: 'all 200ms var(--ease-out)',
                        }}>
                        <span style={{ fontSize: 20, marginBottom: 6, display: 'block' }}>{p.icon}</span>
                        <span style={{ fontSize: 12, color: sel ? 'var(--amber)' : 'var(--ink-soft)' }}>{t(`pref_${p.value}`)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button onClick={() => goTo(2)} style={{ fontSize: 13, color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', fontFamily: 'inherit' }}>← {tCommon('back')}</button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <button onClick={handleNext3} disabled={sinHoras}
                    style={{ fontFamily: 'inherit', fontSize: 14, padding: '13px 28px', borderRadius: 100, background: 'var(--amber)', color: 'var(--bg)', border: 'none', cursor: sinHoras ? 'not-allowed' : 'pointer', opacity: sinHoras ? 0.5 : 1, transition: 'background 200ms' }}>
                    {tCommon('next')} →
                  </button>
                  {sinHoras && (
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t('min_hours')}</span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── PASO 4 ── */}
          {step === 4 && (
            <>
              <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.65, marginBottom: '0.75rem' }}>{t('step', { current: 4, total: 4 })}</p>
              <h1 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
                {t.rich('step4_title', { em: chunks => <em style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>{chunks}</em>, br: () => <br /> })}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: '2.5rem', lineHeight: 1.5 }}>{t('step4_sub')}</p>

              {/* Resumen grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '2rem' }}>
                {resumenRows.map(([label, val], i) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '12px 16px', borderRadius: 8, background: 'var(--surface)', border: '0.5px solid var(--border)', animation: `itemIn 300ms var(--ease-out) ${i * 60}ms both` }}>
                    <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)', width: 90, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: val }} />
                  </div>
                ))}
              </div>

              <button onClick={handleGenerar}
                style={{ width: '100%', fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', fontStyle: 'italic', padding: '16px 28px', borderRadius: 100, background: 'var(--amber)', color: 'var(--bg)', border: 'none', cursor: 'pointer', transition: 'background 200ms, transform 150ms var(--ease-out)' }}>
                {t('generate')}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                <button onClick={() => goTo(3)} style={{ fontSize: 13, color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', fontFamily: 'inherit' }}>← {tCommon('back')}</button>
                <span />
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── UPGRADE MODAL (límite de tier) ── */}
      {limiteMsg && (
        <UpgradeModal
          descripcion={limiteMsg}
          onClose={() => setLimiteMsg(null)}
          onContinueFree={() => setLimiteMsg(null)}
        />
      )}

      {/* ── UPGRADE MODAL ── */}
      {showModal && (
        <UpgradeModal
          descripcion={t('blocks_upsell')}
          onClose={() => setShowModal(false)}
          onContinueFree={continuarSinPro}
          continueLabel={modalCtx === 'next' ? t('continue_no_blocks') : t('continue_free')}
        />
      )}
    </div>
  )
}
