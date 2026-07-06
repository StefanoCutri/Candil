'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Pomodoro from '@/components/Pomodoro'
import AjustePanel from '@/components/AjustePanel'
import ApuntesSection from '@/components/ApuntesSection'
import PracticaSection from '@/components/PracticaSection'
import PlusSection from '@/components/PlusSection'
import UpgradeModal from '@/components/UpgradeModal'
import { CandleIcon } from '@/components/CandleIcon'
import { useTranslations, useLocale } from 'next-intl'

/* ── Types ── */
type Bloque = {
  id: string
  hora_inicio: string
  hora_fin: string
  tema: string
  tipo: 'estudio' | 'repaso' | 'pausa' | 'simulacro'
  completado: boolean
  orden: number
  dia: string
  descripcion?: string
  duracion_minutos?: number
}

type DiaContenido = {
  fecha: string
  dia_nombre: string
  bloques: {
    hora_inicio: string
    hora_fin: string
    tema: string
    tipo: string
    descripcion: string
    duracion_minutos: number
  }[]
}

type Plan = {
  id: string
  token_publico: string
  examen_id: string
  contenido: {
    dias: DiaContenido[]
    resumen: string
    consejo: string
  }
  examenes: {
    id: string
    materia: string
    fecha: string
    hora: string | null
    tipo: string
    preferencia_horario: string | null
  }
}

/* ── Helpers ── */
function diffDias(fecha: string) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const [y, m, d] = fecha.split('-').map(Number)
  const exam = new Date(y, m - 1, d)
  return Math.round((exam.getTime() - hoy.getTime()) / 86400000)
}

const DATE_LOCALES: Record<string, string> = { es: 'es-AR', en: 'en-US', pt: 'pt-BR' }

function formatFechaDia(f: string, dateLocale: string) {
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
}

function formatFechaLarga(f: string, dateLocale: string) {
  if (!f) return ''
  const d = new Date(f + 'T12:00:00')
  return d.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })
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

const MSGS = [
  { min: 0, max: 1, key: 'motiv_0' },
  { min: 1, max: 20, key: 'motiv_1' },
  { min: 20, max: 40, key: 'motiv_2' },
  { min: 40, max: 60, key: 'motiv_3' },
  { min: 60, max: 80, key: 'motiv_4' },
  { min: 80, max: 99, key: 'motiv_5' },
  { min: 99, max: 101, key: 'motiv_6' },
]

/* ── Helpers de matching contenido ↔ bloques DB ── */
const horaKey = (h: string | null | undefined) => (h ?? '').slice(0, 5)
const bloqueKey = (fecha: string, hora: string | null | undefined, tema: string) =>
  `${fecha}|${horaKey(hora)}|${tema}`

/* ── Main ── */
export default function PlanPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('plan')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const dateLocale = DATE_LOCALES[locale] ?? 'es-AR'

  const [plan, setPlan] = useState<Plan | null>(null)
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDayIdx, setActiveDayIdx] = useState(0)
  const [copiado, setCopiado] = useState(false)
  const [showDiaDone, setShowDiaDone] = useState<{ nombre: string; idx: number } | null>(null)
  const [motivMsg, setMotivMsg] = useState('')
  const [toast, setToast] = useState(false)
  const [esPro, setEsPro] = useState(false)
  const [esPlus, setEsPlus] = useState(false)
  const [ajusteOpen, setAjusteOpen] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set())
  const [archivando, setArchivando] = useState(false)
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [errorBorrar, setErrorBorrar] = useState('')
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [bannerAtrasoOculto, setBannerAtrasoOculto] = useState(true)
  const [reorganizando, setReorganizando] = useState(false)
  const [errorReorganizar, setErrorReorganizar] = useState('')

  useEffect(() => {
    try { setBannerAtrasoOculto(sessionStorage.getItem(`candil-atraso-dismissed-${id}`) === '1') } catch { setBannerAtrasoOculto(false) }
  }, [id])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single()
        setEsPro(profile?.plan === 'pro' || profile?.plan === 'plus')
        setEsPlus(profile?.plan === 'plus')
      }

      const { data: planData } = await supabase
        .from('planes')
        .select('id, token_publico, examen_id, contenido, examenes(id, materia, fecha, hora, tipo, preferencia_horario)')
        .eq('id', id)
        .single()

      if (!planData) { router.push('/dashboard'); return }
      setPlan(planData as unknown as Plan)

      const { data: bloquesData } = await supabase
        .from('bloques')
        .select('*')
        .eq('plan_id', id)
        .order('orden')

      const bl = (bloquesData ?? []) as Bloque[]
      setBloques(bl)

      // Active day: today or first
      const dias = (planData as unknown as Plan).contenido?.dias ?? []
      const hoy = new Date().toISOString().split('T')[0]
      const hoyIdx = dias.findIndex(d => d.fecha === hoy)
      setActiveDayIdx(hoyIdx >= 0 ? hoyIdx : 0)

      // Initial motivational message
      const sinPausa = bl.filter(b => b.tipo !== 'pausa')
      const done = sinPausa.filter(b => b.completado).length
      const pct = sinPausa.length > 0 ? Math.round(done / sinPausa.length * 100) : 0
      const motivKey = MSGS.find(m => pct >= m.min && pct < m.max)?.key
      setMotivMsg(motivKey ? t(motivKey) : (planData as unknown as Plan).contenido?.consejo ?? '')

      setLoading(false)
    }
    load()
  }, [id])

  async function toggleBloque(bloqueId: string, diIdx: number) {
    const actual = bloques.find(b => b.id === bloqueId)
    if (!actual) {
      console.warn('[plan] toggleBloque: no encontré el bloque en state', { bloqueId })
      return
    }
    const nuevo = !actual.completado
    console.log('[plan] toggleBloque', { bloqueId, tema: actual.tema, completado: nuevo })

    const next = bloques.map(b => b.id === bloqueId ? { ...b, completado: nuevo } : b)
    setBloques(next)
    const { error: updError } = await supabase.from('bloques').update({ completado: nuevo }).eq('id', bloqueId)
    if (updError) {
      // Revertir el optimismo si el UPDATE no entró (p. ej. RLS)
      console.error('[plan] Error actualizando bloque en Supabase:', updError)
      setBloques(bloques)
      return
    }

    // Al completar un bloque, registrar actividad del día para la racha (best-effort)
    if (nuevo) {
      fetch('/api/update-racha', { method: 'POST' }).catch(() => {})
    }

    // Update progress message
    const sinPausa = next.filter(b => b.tipo !== 'pausa')
    const done = sinPausa.filter(b => b.completado).length
    const pct = sinPausa.length > 0 ? Math.round(done / sinPausa.length * 100) : 0
    const msg = MSGS.find(m => pct >= m.min && pct < m.max)
    if (msg) setMotivMsg(t(msg.key))

    // Check dia completado
    const dias = plan?.contenido?.dias ?? []
    const dia = dias[diIdx]
    if (!dia) return
    const bloquesDelDia = next.filter(b => b.dia === dia.fecha)
    const realesDia = bloquesDelDia.filter(b => b.tipo !== 'pausa')
    if (realesDia.length > 0 && realesDia.every(b => b.completado) && nuevo) {
      setTimeout(() => setShowDiaDone({ nombre: dia.dia_nombre, idx: diIdx }), 300)
    }
  }

  // Refrescar plan + bloques después de un ajuste por chat; flashea los bloques nuevos/cambiados
  async function refetchPlan() {
    const oldKeys = new Set(
      (plan?.contenido?.dias ?? []).flatMap(d => d.bloques.map(b => bloqueKey(d.fecha, b.hora_inicio, b.tema)))
    )

    const { data: planData } = await supabase
      .from('planes')
      .select('id, token_publico, examen_id, contenido, examenes(id, materia, fecha, hora, tipo, preferencia_horario)')
      .eq('id', id)
      .single()
    if (!planData) return
    const nuevo = planData as unknown as Plan
    setPlan(nuevo)

    const { data: bloquesData } = await supabase
      .from('bloques')
      .select('*')
      .eq('plan_id', id)
      .order('orden')
    setBloques((bloquesData ?? []) as Bloque[])

    setActiveDayIdx(i => Math.min(i, Math.max(0, (nuevo.contenido?.dias?.length ?? 1) - 1)))

    const cambiados = new Set(
      (nuevo.contenido?.dias ?? [])
        .flatMap(d => d.bloques.map(b => bloqueKey(d.fecha, b.hora_inicio, b.tema)))
        .filter(k => !oldKeys.has(k))
    )
    if (cambiados.size > 0) {
      setFlashKeys(cambiados)
      setTimeout(() => setFlashKeys(new Set()), 1600)
    }
  }

  async function archivarExamen() {
    if (!plan) return
    setArchivando(true)
    const { error } = await supabase.from('examenes').update({ estado: 'completado' }).eq('id', plan.examen_id)
    setArchivando(false)
    if (error) {
      console.error('[plan] Error archivando examen:', error)
      return
    }
    router.push('/dashboard')
  }

  async function eliminarExamen() {
    if (!plan) return
    setBorrando(true); setErrorBorrar('')
    const { error } = await supabase.from('examenes').delete().eq('id', plan.examen_id)
    setBorrando(false)
    if (error) {
      console.error('[plan] Error eliminando examen:', error)
      setErrorBorrar(t('delete_error'))
      return
    }
    router.push('/dashboard')
  }

  function descartarBannerAtraso() {
    setBannerAtrasoOculto(true)
    try { sessionStorage.setItem(`candil-atraso-dismissed-${id}`, '1') } catch {}
  }

  async function reorganizarPlan() {
    if (!plan || reorganizando) return
    if (!esPro) { setShowUpgrade(true); return }
    setReorganizando(true)
    setErrorReorganizar('')
    try {
      const res = await fetch('/api/regenerar-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examenId: plan.examen_id }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 403 && data?.error === 'upgrade_required') {
        setShowUpgrade(true)
        return
      }
      if (!res.ok) throw new Error(data?.error ?? t('regen_error'))
      await refetchPlan()
      descartarBannerAtraso()
    } catch (e) {
      console.error('[plan] Error reorganizando:', e)
      setErrorReorganizar(e instanceof Error ? e.message : t('regen_error'))
    } finally {
      setReorganizando(false)
    }
  }

  async function descargarPdf() {
    if (!plan || generandoPdf) return
    setGenerandoPdf(true)
    try {
      const { exportPlanPdf } = await import('@/lib/exportPdf')
      exportPlanPdf({
        materia: plan.examenes.materia,
        tipo: plan.examenes.tipo,
        fecha: plan.examenes.fecha,
        hora: plan.examenes.hora,
        dias: (plan.contenido?.dias ?? []).map(d => ({
          fecha: d.fecha,
          dia_nombre: d.dia_nombre,
          bloques: d.bloques.map(b => ({
            hora_inicio: b.hora_inicio,
            hora_fin: b.hora_fin,
            tema: b.tema,
            tipo: ['estudio', 'repaso', 'pausa', 'simulacro'].includes(b.tipo) ? t(`tag_${b.tipo}`) : b.tipo,
            duracion_minutos: b.duracion_minutos,
          })),
        })),
        labels: {
          titulo: t('pdf_title'),
          tipoExamen: t('config_type'),
          fecha: t('pdf_date'),
          hora: t('pdf_time'),
          colHora: t('pdf_col_time'),
          colTema: t('pdf_col_topic'),
          colTipo: t('pdf_col_type'),
          colDuracion: t('pdf_col_duration'),
          footer: t('pdf_footer'),
        },
        dateLocale,
      })
    } catch (e) {
      console.error('[plan] Error generando PDF:', e)
    } finally {
      setGenerandoPdf(false)
    }
  }

  function compartir() {
    if (!plan) return
    const url = `${window.location.origin}/p/${plan.token_publico}`
    navigator.clipboard.writeText(url).catch(() => {})
    setToast(true)
    setTimeout(() => setToast(false), 2500)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-geist-sans), sans-serif' }}>{t('loading')}</p>
      </div>
    )
  }

  if (!plan) return null

  const dias = plan.contenido?.dias ?? []
  const sinPausa = bloques.filter(b => b.tipo !== 'pausa')
  const totalBloques = sinPausa.length
  const completados = sinPausa.filter(b => b.completado).length
  const progreso = totalBloques > 0 ? Math.round(completados / totalBloques * 100) : 0
  const diasNum = diffDias(plan.examenes.fecha)
  const diffLabel = diasNum < 0 ? t('diff_passed') : diasNum === 0 ? t('diff_today') : diasNum === 1 ? t('diff_tomorrow') : t('diff_days', { count: diasNum })
  const totalHoras = Math.round(dias.flatMap(d => d.bloques).reduce((s, b) => s + (b.duracion_minutos || 0), 0) / 60)
  const uniqueTemas = new Set(sinPausa.map(b => b.tema)).size

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 300 }}>

      {/* Contenido del plan — se oscurece cuando el panel de ajuste está abierto */}
      <div style={{ filter: ajusteOpen ? 'brightness(0.45)' : 'none', transition: 'filter 400ms var(--ease-out)', pointerEvents: ajusteOpen ? 'none' : 'auto' }}>

      {/* ── NAV ── */}
      <nav style={{ display: 'flex', alignItems: 'center', padding: '1rem 2rem', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 50, background: 'var(--nav-bg)', backdropFilter: 'blur(12px)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', color: 'var(--ink)', textDecoration: 'none' }}>
          <CandleIcon size={14} /> Candil
        </Link>
        <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontWeight: 500, fontSize: '0.95rem', color: 'var(--ink-soft)', marginLeft: '1.5rem', paddingLeft: '1.5rem', borderLeft: '0.5px solid var(--border-mid)' }}>
          {plan.examenes.materia}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <button onClick={descargarPdf} disabled={generandoPdf}
            style={{ background: 'none', border: '0.5px solid var(--border-mid)', borderRadius: 8, padding: '7px 12px', color: 'var(--ink-muted)', fontSize: 12, cursor: generandoPdf ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 200ms var(--ease-out)', opacity: generandoPdf ? 0.6 : 1 }}>
            <span>↓</span> {generandoPdf ? t('pdf_generating') : t('download_pdf')}
          </button>
          <button onClick={compartir}
            style={{ background: 'none', border: '0.5px solid var(--border-mid)', borderRadius: 8, padding: '7px 12px', color: 'var(--ink-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 200ms var(--ease-out)' }}>
            <span>↗</span> {t('share')}
          </button>
          <button onClick={() => esPro ? setAjusteOpen(true) : setShowUpgrade(true)}
            style={{ background: 'var(--amber-dim)', border: '0.5px solid var(--border-strong)', color: 'var(--amber)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 200ms var(--ease-out)' }}>
            ✦ {t('adjust')}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 2rem 8rem' }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.65, marginBottom: '0.5rem' }}>
            {t('exam_on')} · {formatFechaLarga(plan.examenes.fecha, dateLocale)}
          </p>
          <h1 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '1.5rem' }}>
            {plan.examenes.materia}<br />
            <em style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>{plan.examenes.tipo} · {plan.examenes.fecha ? new Date(plan.examenes.fecha + 'T12:00:00').toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }) : ''}</em>
          </h1>
        </div>

        {/* ── COUNTDOWN ── */}
        <div style={{ marginBottom: '2rem' }}>
          {diasNum > 0 && (
            <p style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: 500, letterSpacing: '-0.02em', color: diasNum < 3 ? 'var(--amber)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {t('days_left_big', { count: diasNum })}
            </p>
          )}
          {diasNum === 0 && (
            <p style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--amber)' }}>
              {t('today')}
            </p>
          )}
          {diasNum < 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--ink-muted)' }}>
                {t('passed', { count: Math.abs(diasNum) })}
              </p>
              <button onClick={archivarExamen} disabled={archivando}
                style={{ fontFamily: 'inherit', fontSize: 12, padding: '6px 14px', borderRadius: 100, background: 'transparent', color: 'var(--ink-soft)', border: '0.5px solid var(--border-mid)', cursor: archivando ? 'wait' : 'pointer' }}>
                {archivando ? t('archiving') : t('archive')}
              </button>
            </div>
          )}
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '2rem' }}>
          {([
            { dot: 'var(--amber)', content: <>{t('stat_remaining')} <span style={{ color: 'var(--ink)', fontWeight: 500 }}>&nbsp;{diffLabel}</span></> },
            { dot: 'var(--green)', content: <><span style={{ color: 'var(--ink)', fontWeight: 500 }}>{t('stat_topics', { count: uniqueTemas })}</span>&nbsp;{t('stat_to_study')}</> },
            { dot: 'var(--ink-faint)', content: <><span style={{ color: 'var(--ink)', fontWeight: 500 }}>{totalHoras} hs</span>&nbsp;{t('stat_available')}</> },
          ] as const).map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 100, background: 'var(--surface)', border: '0.5px solid var(--border-mid)', fontSize: 12, color: 'var(--ink-soft)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
              {s.content}
            </div>
          ))}
        </div>

        {/* ── PROGRESS BAR ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t('progress')}</span>
            <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontWeight: 500, fontSize: '1rem', color: 'var(--amber)' }}>{progreso}%</span>
          </div>
          <div style={{ height: 3, background: 'var(--border-mid)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--amber)', borderRadius: 100, width: `${progreso}%`, transition: 'width 600ms var(--ease-out)' }} />
          </div>
        </div>

        {/* ── MENSAJE MOTIVACIONAL ── */}
        {motivMsg && (
          <div style={{ margin: '1.5rem 0', padding: '14px 18px', borderRadius: 10, borderLeft: '2px solid var(--amber)', background: 'var(--amber-dim)', fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', lineHeight: 1.6 }}>
            {motivMsg}
          </div>
        )}

        {/* ── BANNER ATRASO ── */}
        {(() => {
          const hoyLocal = new Date().toLocaleDateString('sv-SE')
          const hayAtraso = bloques.some(b => b.dia < hoyLocal && !b.completado && b.tipo !== 'pausa')
          const examenNoPaso = plan.examenes.fecha >= hoyLocal
          if (!hayAtraso || !examenNoPaso || bannerAtrasoOculto) return null
          return (
            <div style={{ margin: '1.5rem 0', padding: '14px 18px', borderRadius: 10, borderLeft: '2px solid var(--amber)', background: 'var(--amber-dim)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, flex: 1, minWidth: 200 }}>
                {t('behind_banner')}
              </p>
              <button onClick={reorganizarPlan} disabled={reorganizando}
                style={{ fontFamily: 'inherit', fontSize: 12.5, padding: '7px 14px', borderRadius: 100, background: 'transparent', color: 'var(--amber)', border: '0.5px solid var(--border-strong)', cursor: reorganizando ? 'wait' : 'pointer', flexShrink: 0, transition: 'all 200ms var(--ease-out)' }}>
                {t('regen_button')}
              </button>
              <button onClick={descartarBannerAtraso} aria-label="Cerrar"
                style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', fontSize: 16, cursor: 'pointer', padding: 4, lineHeight: 1, flexShrink: 0, fontFamily: 'inherit' }}>
                ×
              </button>
              {errorReorganizar && <p style={{ fontSize: 12, color: 'rgba(235,140,120,0.95)', width: '100%' }}>{errorReorganizar}</p>}
            </div>
          )
        })()}

        {/* ── DAY TABS ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: 2 }}>
          {dias.map((dia, i) => {
            const bloquesDb = bloques.filter(b => b.dia === dia.fecha)
            const reales = bloquesDb.filter(b => b.tipo !== 'pausa')
            const todosCompletos = reales.length > 0 && reales.every(b => b.completado)
            const hoyLocal = new Date().toLocaleDateString('sv-SE')
            const esHoy = dia.fecha === hoyLocal
            const esPasado = dia.fecha < hoyLocal
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
                  opacity: (esPasado && !todosCompletos && !isActive) ? 0.5 : 1,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                {dia.dia_nombre}
                {esHoy && (
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 100, background: 'var(--amber)', color: 'var(--bg)', fontWeight: 600, letterSpacing: '0.04em' }}>{t('today_pill')}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── DAY PANELS ── */}
        {dias.map((dia, di) => {
          if (di !== activeDayIdx) return null
          const bloquesDb = bloques.filter(b => b.dia === dia.fecha)
          const reales = bloquesDb.filter(b => b.tipo !== 'pausa')
          const completadosDia = reales.filter(b => b.completado).length
          const todosCompletos = reales.length > 0 && completadosDia === reales.length

          return (
            <div key={dia.fecha} style={{ animation: 'panelIn 300ms var(--ease-out) forwards' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: '1.25rem' }}>
                <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.05rem', fontWeight: 500, letterSpacing: '-0.01em' }}>{dia.dia_nombre}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{formatFechaDia(dia.fecha, dateLocale)}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-muted)' }}>{completadosDia}/{reales.length} {t('blocks')}</span>
              </div>

              {/* Banner si día completo */}
              {todosCompletos && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, background: 'var(--amber-dim)', border: '0.5px solid var(--border-strong)', marginBottom: '1rem', fontSize: 13, color: 'var(--ink-soft)' }}>
                  <span style={{ color: 'var(--amber)', fontSize: 14, flexShrink: 0 }}>✦</span>
                  <span>{t('day_done_hint')}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dia.bloques.map((bloque, bi) => {
                  const bloqueDb = bloquesDb.find(b => horaKey(b.hora_inicio) === horaKey(bloque.hora_inicio) && b.tema === bloque.tema)
                  const done = bloqueDb?.completado ?? false
                  const tipo = bloque.tipo as string
                  const flash = flashKeys.has(bloqueKey(dia.fecha, bloque.hora_inicio, bloque.tema))

                  return (
                    <div
                      key={bi}
                      onClick={() => {
                        if (!bloqueDb) {
                          console.warn('[plan] Click sin match en DB — el bloque del contenido no encontró su fila en "bloques".', {
                            fecha: dia.fecha,
                            hora_inicio: bloque.hora_inicio,
                            tema: bloque.tema,
                            bloquesEnEseDia: bloquesDb.map(b => ({ hora: b.hora_inicio, tema: b.tema })),
                          })
                          return
                        }
                        toggleBloque(bloqueDb.id, di)
                      }}
                      style={{
                        display: 'flex', alignItems: 'stretch',
                        borderRadius: 10, border: `0.5px solid ${flash ? 'var(--border-strong)' : tipo === 'pausa' ? 'var(--border-mid)' : 'var(--border)'}`,
                        background: tipo === 'pausa' ? 'transparent' : 'var(--surface)',
                        borderStyle: tipo === 'pausa' ? 'dashed' : 'solid',
                        overflow: 'hidden',
                        opacity: done ? 0.42 : 1,
                        transition: 'opacity 400ms var(--ease-out), border-color 200ms',
                        cursor: bloqueDb ? 'pointer' : 'default',
                        position: 'relative',
                        animation: flash ? 'flashAmber 1.4s var(--ease-out) both' : undefined,
                      }}
                    >
                      {/* Stripe */}
                      <div style={{ width: 3, flexShrink: 0, background: STRIPE[tipo] || STRIPE.estudio }} />

                      {/* Check */}
                      <div style={{ padding: '14px 10px 14px 14px', display: 'flex', alignItems: 'center', flexShrink: 0, opacity: tipo === 'pausa' ? 0.4 : 1 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          border: `0.5px solid ${done ? 'var(--amber)' : 'var(--border-mid)'}`,
                          background: done ? 'var(--amber)' : 'transparent',
                          position: 'relative', flexShrink: 0,
                          transition: 'background 250ms var(--ease-out), border-color 250ms, transform 150ms var(--ease-out)',
                          transform: done ? 'scale(0.95)' : 'scale(1)',
                        }}>
                          {done && (
                            <span style={{ position: 'absolute', top: 6, left: 4, width: 10, height: 6, borderLeft: '1.5px solid white', borderBottom: '1.5px solid white', transform: 'rotate(-45deg)', display: 'block' }} />
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <div style={{ padding: '12px 14px 12px 6px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: 'var(--ink-muted)', letterSpacing: '0.04em', flexShrink: 0 }}>
                            {bloque.hora_inicio}–{bloque.hora_fin}
                          </span>
                          <span style={{ fontSize: 14, color: 'var(--ink)', flex: 1, textDecorationLine: done ? 'line-through' : 'none', textDecorationColor: 'var(--ink-faint)' }}>
                            {bloque.tema}
                          </span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: TAG_BG[tipo] || TAG_BG.estudio, color: TAG_COLOR[tipo] || TAG_COLOR.estudio, flexShrink: 0 }}>
                            {['estudio', 'repaso', 'pausa', 'simulacro'].includes(tipo) ? t(`tag_${tipo}`) : tipo}
                          </span>
                        </div>
                        {bloque.descripcion && (
                          <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5 }}>{bloque.descripcion}</div>
                        )}
                        {bloque.duracion_minutos > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>
                            {bloque.duracion_minutos >= 60
                              ? `${(bloque.duracion_minutos / 60).toFixed(bloque.duracion_minutos % 60 === 0 ? 0 : 2)} hs`
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

        {/* ── APUNTES (Pro) ── */}
        <ApuntesSection
          examenId={plan.examen_id}
          esPro={esPro}
          onLocked={() => setShowUpgrade(true)}
        />

        <PracticaSection
          examenId={plan.examen_id}
          esPro={esPro}
          onLocked={() => setShowUpgrade(true)}
        />

        <PlusSection
          examenId={plan.examen_id}
          esPlus={esPlus}
          onLocked={() => setShowUpgrade(true)}
        />

        {/* ── CONFIGURACIÓN ── */}
        <section style={{ marginTop: '4rem' }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.15em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>
            {t('config')}
          </h2>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '6px 20px', marginBottom: 28 }}>
            {([
              [t('config_subject'), plan.examenes.materia, false],
              [t('config_type'), plan.examenes.tipo || '—', false],
              [t('config_datetime'), `${formatFechaLarga(plan.examenes.fecha, dateLocale)}${plan.examenes.hora ? ` · ${plan.examenes.hora.slice(0, 5)} hs` : ''}`, true],
              [t('config_topics'), t('stat_topics', { count: uniqueTemas }), false],
              [t('config_hours'), `${totalHoras} hs`, false],
              [t('config_pref'), plan.examenes.preferencia_horario === 'manana' ? t('pref_manana') : plan.examenes.preferencia_horario === 'tarde' ? t('pref_tarde') : plan.examenes.preferencia_horario === 'noche' ? t('pref_noche') : '—', false],
            ] as [string, string, boolean][]).map(([label, val, capitalize], i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '13px 0', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', width: 130, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 14, color: 'var(--ink)', textTransform: capitalize ? 'capitalize' : 'none' }}>{val}</span>
              </div>
            ))}
          </div>

          <hr className="divider" style={{ marginBottom: 28 }} />

          <h3 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(235,140,120,0.7)', marginBottom: 12 }}>
            {t('danger_zone')}
          </h3>
          <div style={{ border: '0.5px solid rgba(235,140,120,0.25)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>{t('delete_exam')}</p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                {t('delete_desc')}
              </p>
            </div>
            <button onClick={() => setConfirmarBorrar(true)}
              style={{ fontFamily: 'inherit', fontSize: 13, padding: '9px 18px', borderRadius: 100, background: 'transparent', color: 'rgba(235,140,120,0.9)', border: '0.5px solid rgba(235,140,120,0.4)', cursor: 'pointer', transition: 'all 200ms var(--ease-out)' }}>
              {t('delete_exam')}
            </button>
          </div>
        </section>
      </div>

      </div>{/* /contenido oscurecible */}

      {/* ── OVERLAY REORGANIZANDO ── */}
      {reorganizando && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <svg width="36" height="52" viewBox="0 0 56 80" fill="none" style={{ animation: 'flicker 2.5s ease-in-out infinite', transformOrigin: '50% 85%', filter: 'drop-shadow(0 0 14px rgba(232,164,74,0.35))' }}>
            <path d="M28 4C28 4 44 22 44 36C44 46 37.2 55 28 55C18.8 55 12 46 12 36C12 22 28 4 28 4Z" fill="#E8A44A" opacity="0.88" />
            <path d="M28 16C28 16 38 29 38 37C38 43 33.5 48 28 48C22.5 48 18 43 18 37C18 29 28 16 28 16Z" fill="#F5C97A" />
            <rect x="21" y="55" width="14" height="18" rx="3" fill="#6B4226" />
            <rect x="14" y="70" width="28" height="6" rx="3" fill="#3D2B1F" />
          </svg>
          <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>{t('regen_loading')}</p>
        </div>
      )}

      {/* ── PANEL DE AJUSTE (Pro) ── */}
      {esPro && (
        <AjustePanel
          planId={String(id)}
          open={ajusteOpen}
          onClose={() => setAjusteOpen(false)}
          onPlanUpdated={refetchPlan}
        />
      )}

      {/* ── POMODORO (FAB + modal) ── */}
      <Pomodoro />

      {/* ── UPGRADE MODAL (apuntes) ── */}
      {showUpgrade && (
        <UpgradeModal
          descripcion={t('upgrade_notes')}
          onClose={() => setShowUpgrade(false)}
          onContinueFree={() => setShowUpgrade(false)}
        />
      )}

      {/* ── DIA DONE MODAL ── */}
      {showDiaDone && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowDiaDone(null) }}
          style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', backdropFilter: 'blur(6px)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', animation: 'fadeIn 200ms var(--ease-out)' }}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border-strong)', borderRadius: 20, padding: '2.5rem 2rem', maxWidth: 360, width: '100%', textAlign: 'center', animation: 'modalIn 350ms var(--ease-out)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--amber-dim)', border: '0.5px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', animation: 'diaDoneGlow 2s ease-in-out infinite' }}>
              <div style={{ animation: 'glowPulse 2s ease-in-out infinite', filter: 'drop-shadow(0 0 10px rgba(232,164,74,0.5))' }}>
                <CandleIcon size={20} />
              </div>
            </div>
            <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.5rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>{t('day_complete')}</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6, marginBottom: '0.4rem' }}>{t('day_complete_sub')}</p>
            <p style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', fontStyle: 'italic', color: 'var(--amber)', opacity: 0.8, marginBottom: '2rem' }}>{showDiaDone.nombre}</p>
            <button onClick={() => {
              const esUltimo = showDiaDone.idx >= dias.length - 1
              if (!esUltimo) setActiveDayIdx(showDiaDone.idx + 1)
              setShowDiaDone(null)
            }}
              style={{ width: '100%', padding: 13, borderRadius: 100, background: 'var(--amber)', color: 'var(--bg)', border: 'none', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', transition: 'background 200ms, transform 150ms var(--ease-out)' }}>
              {showDiaDone.idx >= dias.length - 1 ? t('finished') : t('continue')}
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIRMAR ELIMINAR ── */}
      {confirmarBorrar && (
        <div
          onClick={e => { if (e.target === e.currentTarget && !borrando) setConfirmarBorrar(false) }}
          style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', animation: 'fadeIn 200ms var(--ease-out)' }}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border-strong)', borderRadius: 16, padding: '2rem', maxWidth: 380, width: '100%', animation: 'modalIn 300ms var(--ease-out)' }}>
            <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.3rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>
              {t('delete_confirm_title')}
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-muted)', lineHeight: 1.6, marginBottom: 8 }}>
              {t.rich('delete_confirm_body', { materia: plan.examenes.materia, strong: chunks => <strong style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>{chunks}</strong> })}
            </p>
            {errorBorrar && <p style={{ fontSize: 12, color: 'rgba(235,140,120,0.95)', marginBottom: 10 }}>{errorBorrar}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setConfirmarBorrar(false)} disabled={borrando}
                style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, padding: '11px', borderRadius: 100, background: 'transparent', color: 'var(--ink-muted)', border: '0.5px solid var(--border-mid)', cursor: borrando ? 'default' : 'pointer' }}>
                {tCommon('cancel')}
              </button>
              <button onClick={eliminarExamen} disabled={borrando}
                style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, padding: '11px', borderRadius: 100, background: 'rgba(200,80,60,0.9)', color: '#fff', border: 'none', cursor: borrando ? 'wait' : 'pointer', opacity: borrando ? 0.7 : 1 }}>
                {borrando ? t('deleting') : tCommon('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      <div style={{
        position: 'fixed', bottom: '2rem', left: '50%',
        transform: `translateX(-50%) translateY(${toast ? 0 : 20}px)`,
        background: 'var(--surface2)', border: '0.5px solid var(--border-strong)',
        borderRadius: 100, padding: '10px 20px', fontSize: 13, color: 'var(--ink-soft)',
        opacity: toast ? 1 : 0, transition: 'all 300ms var(--ease-out)',
        zIndex: 200, whiteSpace: 'nowrap', pointerEvents: 'none',
      }}>
        {t('link_copied')}
      </div>
    </div>
  )
}
