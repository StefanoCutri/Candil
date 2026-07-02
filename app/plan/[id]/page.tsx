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

function diasRestantes(fecha: string) {
  const diff = diffDias(fecha)
  if (diff < 0) return 'Pasó'
  if (diff === 0) return '¡Hoy!'
  if (diff === 1) return 'mañana'
  return `${diff} días`
}

function formatFechaDia(f: string) {
  const [, m, d] = f.split('-')
  const meses = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${parseInt(d)} de ${meses[parseInt(m)]}`
}

function formatFechaLarga(f: string) {
  if (!f) return ''
  const d = new Date(f + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
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

const TAG_LABEL: Record<string, string> = {
  estudio: 'Estudio',
  repaso: 'Repaso',
  pausa: 'Pausa',
  simulacro: 'Simulacro',
}

const MSGS = [
  { min: 0, max: 1, txt: '"Arrancás hoy. Todo bien, vamos."' },
  { min: 1, max: 20, txt: '"Arrancaste. Eso ya es más que ayer."' },
  { min: 20, max: 40, txt: '"Vas bien. Cada bloque que tachás es uno menos."' },
  { min: 40, max: 60, txt: '"Mitad del camino. La segunda mitad siempre va más rápido."' },
  { min: 60, max: 80, txt: '"Ya estás en la recta final. No pares."' },
  { min: 80, max: 99, txt: '"Casi. Quedan poquitos. Dale que ya llegás."' },
  { min: 99, max: 101, txt: '"Terminaste. Ahora a dormir bien."' },
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
      setMotivMsg(MSGS.find(m => pct >= m.min && pct < m.max)?.txt ?? (planData as unknown as Plan).contenido?.consejo ?? '')

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
    if (msg) setMotivMsg(msg.txt)

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
      setErrorBorrar('No se pudo eliminar. Probá de nuevo.')
      return
    }
    router.push('/dashboard')
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
        <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-geist-sans), sans-serif' }}>Cargando tu plan...</p>
      </div>
    )
  }

  if (!plan) return null

  const dias = plan.contenido?.dias ?? []
  const sinPausa = bloques.filter(b => b.tipo !== 'pausa')
  const totalBloques = sinPausa.length
  const completados = sinPausa.filter(b => b.completado).length
  const progreso = totalBloques > 0 ? Math.round(completados / totalBloques * 100) : 0
  const diffLabel = diasRestantes(plan.examenes.fecha)
  const diasNum = diffDias(plan.examenes.fecha)
  const totalHoras = Math.round(dias.flatMap(d => d.bloques).reduce((s, b) => s + (b.duracion_minutos || 0), 0) / 60)
  const uniqueTemas = new Set(sinPausa.map(b => b.tema)).size

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 300 }}>

      {/* Contenido del plan — se oscurece cuando el panel de ajuste está abierto */}
      <div style={{ filter: ajusteOpen ? 'brightness(0.45)' : 'none', transition: 'filter 400ms var(--ease-out)', pointerEvents: ajusteOpen ? 'none' : 'auto' }}>

      {/* ── NAV ── */}
      <nav style={{ display: 'flex', alignItems: 'center', padding: '1rem 2rem', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(21,15,7,0.92)', backdropFilter: 'blur(12px)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', color: 'var(--ink)', textDecoration: 'none' }}>
          <CandleIcon size={14} /> Candil
        </Link>
        <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontWeight: 500, fontSize: '0.95rem', color: 'var(--ink-soft)', marginLeft: '1.5rem', paddingLeft: '1.5rem', borderLeft: '0.5px solid var(--border-mid)' }}>
          {plan.examenes.materia}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <button onClick={compartir}
            style={{ background: 'none', border: '0.5px solid var(--border-mid)', borderRadius: 8, padding: '7px 12px', color: 'var(--ink-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 200ms var(--ease-out)' }}>
            <span>↗</span> Compartir
          </button>
          <button onClick={() => esPro ? setAjusteOpen(true) : setShowUpgrade(true)}
            style={{ background: 'var(--amber-dim)', border: '0.5px solid var(--border-strong)', color: 'var(--amber)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 200ms var(--ease-out)' }}>
            ✦ Ajustar plan
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 2rem 8rem' }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.65, marginBottom: '0.5rem' }}>
            Examen · {formatFechaLarga(plan.examenes.fecha)}
          </p>
          <h1 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '1.5rem' }}>
            {plan.examenes.materia}<br />
            <em style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>{plan.examenes.tipo} · {plan.examenes.fecha ? new Date(plan.examenes.fecha + 'T12:00:00').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}</em>
          </h1>
        </div>

        {/* ── COUNTDOWN ── */}
        <div style={{ marginBottom: '2rem' }}>
          {diasNum > 0 && (
            <p style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: 500, letterSpacing: '-0.02em', color: diasNum < 3 ? 'var(--amber)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {diasNum === 1 ? 'Falta 1 día' : `Faltan ${diasNum} días`}
            </p>
          )}
          {diasNum === 0 && (
            <p style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--amber)' }}>
              El examen es hoy
            </p>
          )}
          {diasNum < 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--ink-muted)' }}>
                Este examen pasó hace {Math.abs(diasNum)} {Math.abs(diasNum) === 1 ? 'día' : 'días'}
              </p>
              <button onClick={archivarExamen} disabled={archivando}
                style={{ fontFamily: 'inherit', fontSize: 12, padding: '6px 14px', borderRadius: 100, background: 'transparent', color: 'var(--ink-soft)', border: '0.5px solid var(--border-mid)', cursor: archivando ? 'wait' : 'pointer' }}>
                {archivando ? 'Archivando…' : 'Archivar examen'}
              </button>
            </div>
          )}
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '2rem' }}>
          {([
            { dot: 'var(--amber)', content: <>Faltan <span style={{ color: 'var(--ink)', fontWeight: 500 }}>&nbsp;{diffLabel}</span></> },
            { dot: 'var(--green)', content: <><span style={{ color: 'var(--ink)', fontWeight: 500 }}>{uniqueTemas} temas</span>&nbsp;a estudiar</> },
            { dot: 'var(--ink-faint)', content: <><span style={{ color: 'var(--ink)', fontWeight: 500 }}>{totalHoras} hs</span>&nbsp;disponibles</> },
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
            <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Progreso del plan</span>
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
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 100, background: 'var(--amber)', color: 'var(--bg)', fontWeight: 600, letterSpacing: '0.04em' }}>Hoy</span>
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
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{formatFechaDia(dia.fecha)}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-muted)' }}>{completadosDia}/{reales.length} bloques</span>
              </div>

              {/* Banner si día completo */}
              {todosCompletos && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, background: 'var(--amber-dim)', border: '0.5px solid var(--border-strong)', marginBottom: '1rem', fontSize: 13, color: 'var(--ink-soft)' }}>
                  <span style={{ color: 'var(--amber)', fontSize: 14, flexShrink: 0 }}>✦</span>
                  <span>Día completado — tocá cualquier bloque para deshacer.</span>
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
                            {TAG_LABEL[tipo] || tipo}
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
            Configuración
          </h2>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '6px 20px', marginBottom: 28 }}>
            {([
              ['Materia', plan.examenes.materia],
              ['Tipo', plan.examenes.tipo || '—'],
              ['Fecha y hora', `${formatFechaLarga(plan.examenes.fecha)}${plan.examenes.hora ? ` · ${plan.examenes.hora.slice(0, 5)} hs` : ''}`],
              ['Temas', `${uniqueTemas} ${uniqueTemas === 1 ? 'tema' : 'temas'}`],
              ['Horas del plan', `${totalHoras} hs`],
              ['Preferencia', plan.examenes.preferencia_horario === 'manana' ? 'Mañana' : plan.examenes.preferencia_horario === 'tarde' ? 'Tarde' : plan.examenes.preferencia_horario === 'noche' ? 'Noche' : '—'],
            ] as const).map(([label, val], i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '13px 0', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', width: 130, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 14, color: 'var(--ink)', textTransform: label === 'Fecha y hora' ? 'capitalize' : 'none' }}>{val}</span>
              </div>
            ))}
          </div>

          <hr className="divider" style={{ marginBottom: 28 }} />

          <h3 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(235,140,120,0.7)', marginBottom: 12 }}>
            Zona peligrosa
          </h3>
          <div style={{ border: '0.5px solid rgba(235,140,120,0.25)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>Eliminar examen</p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Se borran el examen, su plan, los bloques y los apuntes asociados. No se puede deshacer.
              </p>
            </div>
            <button onClick={() => setConfirmarBorrar(true)}
              style={{ fontFamily: 'inherit', fontSize: 13, padding: '9px 18px', borderRadius: 100, background: 'transparent', color: 'rgba(235,140,120,0.9)', border: '0.5px solid rgba(235,140,120,0.4)', cursor: 'pointer', transition: 'all 200ms var(--ease-out)' }}>
              Eliminar examen
            </button>
          </div>
        </section>
      </div>

      </div>{/* /contenido oscurecible */}

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
          descripcion="Subí tus PDFs o fotos de apuntes y Candil genera resúmenes y preguntas de práctica desde lo que vos ya tenés."
          onClose={() => setShowUpgrade(false)}
          onContinueFree={() => setShowUpgrade(false)}
        />
      )}

      {/* ── DIA DONE MODAL ── */}
      {showDiaDone && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowDiaDone(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(21,15,7,0.85)', backdropFilter: 'blur(6px)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', animation: 'fadeIn 200ms var(--ease-out)' }}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border-strong)', borderRadius: 20, padding: '2.5rem 2rem', maxWidth: 360, width: '100%', textAlign: 'center', animation: 'modalIn 350ms var(--ease-out)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--amber-dim)', border: '0.5px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', animation: 'diaDoneGlow 2s ease-in-out infinite' }}>
              <div style={{ animation: 'glowPulse 2s ease-in-out infinite', filter: 'drop-shadow(0 0 10px rgba(232,164,74,0.5))' }}>
                <CandleIcon size={20} />
              </div>
            </div>
            <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.5rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>Día completado.</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6, marginBottom: '0.4rem' }}>Terminaste todos los bloques de</p>
            <p style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', fontStyle: 'italic', color: 'var(--amber)', opacity: 0.8, marginBottom: '2rem' }}>{showDiaDone.nombre}</p>
            <button onClick={() => {
              const esUltimo = showDiaDone.idx >= dias.length - 1
              if (!esUltimo) setActiveDayIdx(showDiaDone.idx + 1)
              setShowDiaDone(null)
            }}
              style={{ width: '100%', padding: 13, borderRadius: 100, background: 'var(--amber)', color: 'var(--bg)', border: 'none', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', transition: 'background 200ms, transform 150ms var(--ease-out)' }}>
              {showDiaDone.idx >= dias.length - 1 ? '¡Terminaste!' : 'Seguir →'}
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIRMAR ELIMINAR ── */}
      {confirmarBorrar && (
        <div
          onClick={e => { if (e.target === e.currentTarget && !borrando) setConfirmarBorrar(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(21,15,7,0.85)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', animation: 'fadeIn 200ms var(--ease-out)' }}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border-strong)', borderRadius: 16, padding: '2rem', maxWidth: 380, width: '100%', animation: 'modalIn 300ms var(--ease-out)' }}>
            <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.3rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>
              ¿Eliminar este examen?
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-muted)', lineHeight: 1.6, marginBottom: 8 }}>
              Vas a borrar <strong style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>{plan.examenes.materia}</strong> con su plan y todos sus bloques. Esta acción no se puede deshacer.
            </p>
            {errorBorrar && <p style={{ fontSize: 12, color: 'rgba(235,140,120,0.95)', marginBottom: 10 }}>{errorBorrar}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setConfirmarBorrar(false)} disabled={borrando}
                style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, padding: '11px', borderRadius: 100, background: 'transparent', color: 'var(--ink-muted)', border: '0.5px solid var(--border-mid)', cursor: borrando ? 'default' : 'pointer' }}>
                Cancelar
              </button>
              <button onClick={eliminarExamen} disabled={borrando}
                style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, padding: '11px', borderRadius: 100, background: 'rgba(200,80,60,0.9)', color: '#fff', border: 'none', cursor: borrando ? 'wait' : 'pointer', opacity: borrando ? 0.7 : 1 }}>
                {borrando ? 'Eliminando…' : 'Eliminar'}
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
        ✓ Link copiado al portapapeles
      </div>
    </div>
  )
}
