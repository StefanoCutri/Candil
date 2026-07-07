'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CandleIcon } from '@/components/CandleIcon'
import { useTranslations, useLocale } from 'next-intl'
import { LOGROS, NIVELES, nivelParaXp } from '@/lib/logros'

const DATE_LOCALES: Record<string, string> = { es: 'es-AR', en: 'en-US', pt: 'pt-BR' }
const IDIOMAS = [['es', 'Español'], ['en', 'English'], ['pt', 'Português']] as const

export type PerfilExamen = {
  id: string
  materia: string
  fecha: string
  estado: string
  planId: string | null
}

const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', plus: 'Plus' }
type Filtro = 'todos' | 'activo' | 'completado' | 'archivado'

function formatFecha(fecha: string, dateLocale: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PerfilClient(props: {
  nombre: string
  email: string
  plan: string
  racha: number
  mejorRacha: number
  totalExamenes: number
  rendidos: number
  horasEstudiadas: number
  examenes: PerfilExamen[]
  logros: string[]
  xp: number
}) {
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('profile')
  const tCommon = useTranslations('common')
  const tLogros = useTranslations('logros')
  const locale = useLocale()
  const dateLocale = DATE_LOCALES[locale] ?? 'es-AR'

  const [nombre, setNombre] = useState(props.nombre)
  const [guardado, setGuardado] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [verTodos, setVerTodos] = useState(false)
  const [tema, setTema] = useState<'system' | 'dark' | 'light'>('dark')

  useEffect(() => {
    const guardadoTema = localStorage.getItem('candil-theme')
    if (guardadoTema === 'light' || guardadoTema === 'system') setTema(guardadoTema)
  }, [])

  function cambiarTema(valor: 'system' | 'dark' | 'light') {
    setTema(valor)
    localStorage.setItem('candil-theme', valor)
    const efectivo = valor === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : valor
    if (efectivo === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
  }
  const [cancelando, setCancelando] = useState(false)
  const [cancelMsg, setCancelMsg] = useState('')

  const esPro = props.plan === 'pro' || props.plan === 'plus'
  const inicial = (nombre || 'E').charAt(0).toUpperCase()

  async function guardarNombre() {
    const limpio = nombre.trim()
    if (!limpio || limpio === props.nombre) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ nombre: limpio }).eq('id', user.id)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  function cambiarIdioma(nuevo: string) {
    try { localStorage.setItem('candil-locale', nuevo) } catch {}
    document.cookie = `candil-locale=${nuevo};path=/;max-age=31536000;samesite=lax`
    window.location.reload()
  }

  async function cancelarSub() {
    if (!confirm(t('cancel_confirm'))) return
    setCancelando(true)
    setCancelMsg('')
    try {
      const res = await fetch('/api/cancel-subscription', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? t('cancel_error'))
      setCancelMsg(t('cancel_done'))
    } catch (e) {
      setCancelMsg(e instanceof Error ? e.message : t('cancel_error'))
    } finally {
      setCancelando(false)
    }
  }

  const examenesFiltrados = props.examenes.filter(e => filtro === 'todos' || e.estado === filtro)

  const stats = [
    { label: t('exams'), valor: props.totalExamenes },
    { label: t('passed_exams'), valor: props.rendidos },
    { label: t('hours'), valor: props.horasEstudiadas },
    { label: t('current_streak'), valor: props.racha },
    { label: t('best_streak'), valor: props.mejorRacha },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 300 }}>
      {/* Nav */}
      <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--nav-bg)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <CandleIcon size={14} />
          <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', color: 'var(--ink)', fontSize: '1rem' }}>Candil</span>
        </Link>
        <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--ink-muted)', textDecoration: 'none' }}>← {tCommon('back')}</Link>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 120px' }}>
        <h1 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 36 }}>
          {t('title')}
        </h1>

        {/* ── Información ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>{t('info')}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--amber-dim)', border: '0.5px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.6rem', color: 'var(--amber)', flexShrink: 0 }}>
              {inicial}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>{t('name')}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input className="input" value={nombre} onChange={e => setNombre(e.target.value)} onBlur={guardarNombre} placeholder={t('name_placeholder')} />
                {guardado && <span style={{ fontSize: 12, color: 'var(--green)', whiteSpace: 'nowrap' }}>✓ {tCommon('saved')}</span>}
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>Email</label>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{props.email}</p>
          </div>
        </section>

        {/* ── Tu plan ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>{t('your_plan')}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 12, background: 'var(--surface)', border: '0.5px solid var(--border)' }}>
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 100, background: 'var(--amber-dim)', border: '0.5px solid var(--border-strong)', color: 'var(--amber)', fontWeight: 500 }}>
              {PLAN_LABEL[props.plan] ?? props.plan}
            </span>
            <div style={{ marginLeft: 'auto' }}>
              {esPro ? (
                <button onClick={cancelarSub} disabled={cancelando}
                  style={{ fontSize: 13, color: 'var(--ink-muted)', background: 'none', border: '0.5px solid var(--border-mid)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {cancelando ? t('cancelling') : t('cancel_sub')}
                </button>
              ) : (
                <Link href="/precios" className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.85rem', borderRadius: 100 }}>
                  {t('upgrade')}
                </Link>
              )}
            </div>
          </div>
          {cancelMsg && <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10 }}>{cancelMsg}</p>}
        </section>

        {/* ── Estadísticas ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>{t('stats')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            {stats.map(s => (
              <div key={s.label} style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--surface)', border: '0.5px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.5rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)', lineHeight: 1, marginBottom: 8 }}>{s.valor}</div>
                <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, color: 'var(--ink-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Logros ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>{tLogros('section_title')}</h2>

          {/* Nivel + barra de XP */}
          {(() => {
            const nivel = nivelParaXp(props.xp)
            const nivelIdx = NIVELES.findIndex(n => n.id === nivel.id)
            const siguiente = NIVELES[nivelIdx + 1] ?? null
            const rango = siguiente ? siguiente.xpMin - nivel.xpMin : 1
            const pctNivel = siguiente ? Math.min(100, Math.round(((props.xp - nivel.xpMin) / rango) * 100)) : 100
            return (
              <div style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--surface)', border: '0.5px solid var(--border)', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 15, fontWeight: 500, color: 'var(--amber)' }}>
                    {tLogros.has(`nivel_${nivel.id}`) ? tLogros(`nivel_${nivel.id}`) : nivel.nombre}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {props.xp} XP{siguiente ? ` · ${siguiente.xpMin - props.xp} ${tLogros('xp_to_next')}` : ''}
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--border-mid)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pctNivel}%`, background: 'var(--amber)', borderRadius: 100, transition: 'width 600ms var(--ease-out)' }} />
                </div>
              </div>
            )
          })()}

          {/* Grid de logros */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {LOGROS.map(l => {
              const desbloqueado = props.logros.includes(l.id)
              const nombre = tLogros.has(`${l.id}_nombre`) ? tLogros(`${l.id}_nombre`) : l.nombre
              const desc = tLogros.has(`${l.id}_desc`) ? tLogros(`${l.id}_desc`) : l.desc
              return (
                <div key={l.id} style={{
                  padding: '14px 12px', borderRadius: 12, textAlign: 'center',
                  background: 'var(--surface)', border: `0.5px solid ${desbloqueado ? 'var(--border-strong)' : 'var(--border)'}`,
                  opacity: desbloqueado ? 1 : 0.3,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8, filter: desbloqueado ? 'none' : 'grayscale(1)' }}>{l.icon}</div>
                  <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>{nombre}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{desbloqueado ? desc : '???'}</p>
                  {desbloqueado && <p style={{ fontSize: 10, color: 'var(--amber)', marginTop: 6 }}>+{l.xp} XP</p>}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Tus exámenes ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>{t('your_exams')}</h2>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {(['todos', 'activo', 'completado', 'archivado'] as Filtro[]).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                  border: `0.5px solid ${filtro === f ? 'var(--border-strong)' : 'var(--border-mid)'}`,
                  background: filtro === f ? 'var(--surface2)' : 'transparent',
                  color: filtro === f ? 'var(--ink)' : 'var(--ink-muted)' }}>
                {t(`filter_${f}`)}
              </button>
            ))}
          </div>
          {examenesFiltrados.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-faint)', padding: '20px 0' }}>{t('empty')}</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(verTodos ? examenesFiltrados : examenesFiltrados.slice(0, 5)).map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'var(--surface)', border: '0.5px solid var(--border)' }}>
                    <span style={{ fontSize: 14, color: 'var(--ink)', flex: 1 }}>{e.materia}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{formatFecha(e.fecha, dateLocale)}</span>
                    {e.planId && (
                      <Link href={`/plan/${e.planId}`} style={{ fontSize: 12.5, color: 'var(--amber)', textDecoration: 'none' }}>{t('view')}</Link>
                    )}
                  </div>
                ))}
              </div>
              {examenesFiltrados.length > 5 && (
                <button onClick={() => setVerTodos(v => !v)}
                  style={{ marginTop: 12, fontSize: 13, color: 'var(--amber)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                  {verTodos ? t('show_less') : t('show_more', { count: examenesFiltrados.length - 5 })}
                </button>
              )}
            </>
          )}
        </section>

        {/* ── Preferencias ── */}
        <section id="preferencias" style={{ marginBottom: 40, scrollMarginTop: 80 }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.15em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>{t('preferences')}</h2>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '6px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
              <span style={{ fontSize: 14, color: 'var(--ink)', flex: 1 }}>{t('theme')}</span>
              <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 100, background: 'var(--bg2)', border: '0.5px solid var(--border-mid)' }}>
                {([['system', t('theme_system')], ['dark', t('theme_dark')], ['light', t('theme_light')]] as const).map(([valor, label]) => {
                  const activo = tema === valor
                  return (
                    <button key={valor} onClick={() => cambiarTema(valor)}
                      style={{
                        padding: '6px 14px', borderRadius: 100, border: 'none', fontFamily: 'inherit', fontSize: 12,
                        background: activo ? 'var(--surface2)' : 'transparent',
                        color: activo ? 'var(--ink)' : 'var(--ink-muted)',
                        cursor: 'pointer', transition: 'background 200ms, color 200ms',
                      }}>
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0' }}>
              <span style={{ fontSize: 14, color: 'var(--ink)', flex: 1 }}>{t('language')}</span>
              <select value={locale} onChange={e => cambiarIdioma(e.target.value)}
                style={{ fontSize: 13, color: 'var(--ink)', background: 'var(--bg2)', border: '0.5px solid var(--border-mid)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                {IDIOMAS.map(([valor, label]) => (
                  <option key={valor} value={valor}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── Cerrar sesión ── */}
        <form action="/auth/signout" method="post">
          <button style={{ fontSize: 13, color: 'rgba(200,90,90,0.8)', background: 'none', border: '0.5px solid rgba(200,90,90,0.25)', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('logout')}
          </button>
        </form>
      </main>
    </div>
  )
}
