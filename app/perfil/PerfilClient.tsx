'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CandleIcon } from '@/components/CandleIcon'

export type PerfilExamen = {
  id: string
  materia: string
  fecha: string
  estado: string
  planId: string | null
}

const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', plus: 'Plus' }
type Filtro = 'todos' | 'activo' | 'completado' | 'archivado'

function formatFecha(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
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
}) {
  const router = useRouter()
  const supabase = createClient()

  const [nombre, setNombre] = useState(props.nombre)
  const [guardado, setGuardado] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('todos')
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

  async function cancelarSub() {
    if (!confirm('¿Cancelar tu suscripción? Vas a mantener el acceso hasta que termine el período pago.')) return
    setCancelando(true)
    setCancelMsg('')
    try {
      const res = await fetch('/api/cancel-subscription', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo cancelar.')
      setCancelMsg('Listo. Tu plan se cancela al final del período.')
    } catch (e) {
      setCancelMsg(e instanceof Error ? e.message : 'No se pudo cancelar.')
    } finally {
      setCancelando(false)
    }
  }

  const examenesFiltrados = props.examenes.filter(e => filtro === 'todos' || e.estado === filtro)

  const stats = [
    { label: 'Exámenes', valor: props.totalExamenes },
    { label: 'Rendidos', valor: props.rendidos },
    { label: 'Horas estudiadas', valor: props.horasEstudiadas },
    { label: 'Racha actual', valor: props.racha },
    { label: 'Mejor racha', valor: props.mejorRacha },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 300 }}>
      {/* Nav */}
      <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(21,15,7,0.85)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <CandleIcon size={14} />
          <span style={{ fontFamily: 'var(--font-serif), serif', color: 'var(--ink)', fontSize: '1rem' }}>Candil</span>
        </Link>
        <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--ink-muted)', textDecoration: 'none' }}>← Volver</Link>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 120px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif), serif', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 36 }}>
          Mi perfil
        </h1>

        {/* ── Información ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>Información</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--amber-dim)', border: '0.5px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif), serif', fontSize: '1.6rem', color: 'var(--amber)', flexShrink: 0 }}>
              {inicial}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>Nombre</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input className="input" value={nombre} onChange={e => setNombre(e.target.value)} onBlur={guardarNombre} placeholder="Tu nombre" />
                {guardado && <span style={{ fontSize: 12, color: 'var(--green)', whiteSpace: 'nowrap' }}>✓ Guardado</span>}
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
          <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>Tu plan</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 12, background: 'var(--surface)', border: '0.5px solid var(--border)' }}>
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 100, background: 'var(--amber-dim)', border: '0.5px solid var(--border-strong)', color: 'var(--amber)', fontWeight: 500 }}>
              {PLAN_LABEL[props.plan] ?? props.plan}
            </span>
            <div style={{ marginLeft: 'auto' }}>
              {esPro ? (
                <button onClick={cancelarSub} disabled={cancelando}
                  style={{ fontSize: 13, color: 'var(--ink-muted)', background: 'none', border: '0.5px solid var(--border-mid)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {cancelando ? 'Cancelando…' : 'Cancelar suscripción'}
                </button>
              ) : (
                <Link href="/precios" className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.85rem', borderRadius: 100 }}>
                  Mejorar plan →
                </Link>
              )}
            </div>
          </div>
          {cancelMsg && <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10 }}>{cancelMsg}</p>}
        </section>

        {/* ── Estadísticas ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>Estadísticas</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            {stats.map(s => (
              <div key={s.label} style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--surface)', border: '0.5px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--font-serif), serif', fontSize: '1.8rem', color: 'var(--ink)', lineHeight: 1, marginBottom: 6 }}>{s.valor}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tus exámenes ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>Tus exámenes</h2>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {(['todos', 'activo', 'completado', 'archivado'] as Filtro[]).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                  border: `0.5px solid ${filtro === f ? 'var(--border-strong)' : 'var(--border-mid)'}`,
                  background: filtro === f ? 'var(--surface2)' : 'transparent',
                  color: filtro === f ? 'var(--ink)' : 'var(--ink-muted)' }}>
                {f === 'todos' ? 'Todos' : f === 'activo' ? 'Activos' : f === 'completado' ? 'Completados' : 'Archivados'}
              </button>
            ))}
          </div>
          {examenesFiltrados.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-faint)', padding: '20px 0' }}>Todo tranquilo por acá.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {examenesFiltrados.map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'var(--surface)', border: '0.5px solid var(--border)' }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)', flex: 1 }}>{e.materia}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{formatFecha(e.fecha)}</span>
                  {e.planId && (
                    <Link href={`/plan/${e.planId}`} style={{ fontSize: 12.5, color: 'var(--amber)', textDecoration: 'none' }}>Ver →</Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Cerrar sesión ── */}
        <form action="/auth/signout" method="post">
          <button style={{ fontSize: 13, color: 'rgba(200,90,90,0.8)', background: 'none', border: '0.5px solid rgba(200,90,90,0.25)', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cerrar sesión
          </button>
        </form>
      </main>
    </div>
  )
}
