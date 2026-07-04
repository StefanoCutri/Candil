'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CandleIcon } from '@/components/CandleIcon'

type Miembro = { user_id: string; profiles: { nombre: string | null } | null }
type PlanCompartido = { id: string; user_id: string; planes: { token_publico: string; examenes: { materia: string } | null } | null; profiles: { nombre: string | null } | null }
type Detalle = {
  grupo: { id: string; nombre: string; codigo: string; owner_id: string } | null
  miembros: Miembro[]
  planes: PlanCompartido[]
  soyOwner: boolean
  yo: string
}
type MiPlan = { id: string; materia: string }

export default function GrupoDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [d, setD] = useState<Detalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [misPlanes, setMisPlanes] = useState<MiPlan[]>([])
  const [planSel, setPlanSel] = useState('')
  const [copiado, setCopiado] = useState(false)

  async function cargar() {
    const res = await fetch(`/api/grupos?id=${id}`)
    const data = await res.json().catch(() => null)
    if (!res.ok) { setError(data?.error ?? 'No pude cargar el grupo.'); setLoading(false); return }
    setD(data as Detalle)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    // Mis planes para compartir
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('examenes').select('materia, planes(id)').eq('user_id', user.id)
        .then(({ data }) => {
          const lista: MiPlan[] = []
          for (const e of (data ?? []) as { materia: string; planes: { id: string }[] }[]) {
            if (e.planes?.[0]?.id) lista.push({ id: e.planes[0].id, materia: e.materia })
          }
          setMisPlanes(lista)
        })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function compartir() {
    if (!planSel) return
    const res = await fetch('/api/grupos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'compartir', grupoId: id, planId: planSel }),
    })
    if (res.ok) { setPlanSel(''); cargar() }
  }

  async function salir() {
    if (!confirm('¿Salir de este grupo?')) return
    await fetch('/api/grupos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'salir', grupoId: id }) })
    router.push('/grupos')
  }

  function copiarCodigo() {
    if (!d?.grupo) return
    navigator.clipboard.writeText(d.grupo.codigo).catch(() => {})
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }

  if (loading) return <Centro texto="Cargando el grupo…" />
  if (error || !d?.grupo) return <Centro texto={error || 'Grupo no encontrado.'} />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 300 }}>
      <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--nav-bg)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <Link href="/grupos" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <CandleIcon size={14} />
          <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', color: 'var(--ink)', fontSize: '1rem' }}>Candil</span>
        </Link>
        <Link href="/grupos" style={{ fontSize: 13, color: 'var(--ink-muted)', textDecoration: 'none' }}>← Grupos</Link>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 6 }}>{d.grupo.nombre}</h1>
            <button onClick={copiarCodigo} style={{ fontSize: 12, color: 'var(--amber)', background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', borderRadius: 100, padding: '4px 12px', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              {copiado ? '✓ copiado' : `código: ${d.grupo.codigo}`}
            </button>
          </div>
          <button onClick={salir} style={{ fontSize: 12.5, color: 'rgba(200,90,90,0.8)', background: 'none', border: '0.5px solid rgba(200,90,90,0.25)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Salir del grupo</button>
        </div>

        {/* Compartir plan */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          <select value={planSel} onChange={e => setPlanSel(e.target.value)} className="input" style={{ flex: 1, minWidth: 200 }}>
            <option value="">Compartir uno de mis planes…</option>
            {misPlanes.map(p => <option key={p.id} value={p.id}>{p.materia}</option>)}
          </select>
          <button onClick={compartir} disabled={!planSel} className="btn-primary" style={{ padding: '10px 18px', fontSize: 13, opacity: planSel ? 1 : 0.5 }}>Compartir</button>
        </div>

        {/* Planes compartidos */}
        <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>Planes del grupo</h2>
        {d.planes.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 36 }}>Todavía nadie compartió un plan. Empezá vos.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 36 }}>
            {d.planes.map(p => (
              <a key={p.id} href={p.planes ? `/p/${p.planes.token_publico}` : '#'} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 10, background: 'var(--surface)', border: '0.5px solid var(--border)', textDecoration: 'none' }}>
                <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', color: 'var(--ink)', flex: 1 }}>{p.planes?.examenes?.materia ?? 'Plan'}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{p.profiles?.nombre ?? 'Alguien'}</span>
                <span style={{ fontSize: 12, color: 'var(--amber)' }}>Ver →</span>
              </a>
            ))}
          </div>
        )}

        {/* Miembros */}
        <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>Miembros ({d.miembros.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {d.miembros.map(m => {
            const nombre = m.profiles?.nombre ?? 'Estudiante'
            return (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--surface)', border: '0.5px solid var(--border)' }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--amber-dim)', border: '0.5px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 13, color: 'var(--amber)' }}>
                  {nombre.charAt(0).toUpperCase()}
                </span>
                <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1 }}>{nombre}{m.user_id === d.yo ? ' (vos)' : ''}</span>
                {m.user_id === d.grupo!.owner_id && <span style={{ fontSize: 10, color: 'var(--amber)', letterSpacing: '0.06em' }}>OWNER</span>}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

function Centro({ texto }: { texto: string }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-geist-sans), sans-serif', fontStyle: 'italic' }}>{texto}</p>
    </div>
  )
}
