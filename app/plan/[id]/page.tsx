'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Bloque = {
  id: string
  hora_inicio: string
  hora_fin: string
  tema: string
  tipo: 'estudio' | 'repaso' | 'pausa' | 'simulacro'
  completado: boolean
  orden: number
  dia: string
}

type DiaConBloques = {
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
  contenido: {
    dias: DiaConBloques[]
    resumen: string
    consejo: string
  }
  examenes: {
    materia: string
    fecha: string
    tipo: string
  }
}

const tipoColors: Record<string, string> = {
  estudio: 'rgba(232,164,74,0.15)',
  repaso: 'rgba(245,201,122,0.12)',
  pausa: 'rgba(249,232,200,0.06)',
  simulacro: 'rgba(232,164,74,0.22)'
}

const tipoBadge: Record<string, string> = {
  estudio: '#E8A44A',
  repaso: '#F5C97A',
  pausa: 'var(--ink-muted)',
  simulacro: '#E8A44A'
}

function diasRestantes(fecha: string) {
  const hoy = new Date()
  const exam = new Date(fecha)
  const diff = Math.ceil((exam.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Pasó'
  if (diff === 0) return '¡Hoy!'
  if (diff === 1) return 'Mañana'
  return `Faltan ${diff} días`
}

export default function PlanPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [plan, setPlan] = useState<Plan | null>(null)
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [loading, setLoading] = useState(true)
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: planData } = await supabase
        .from('planes')
        .select('id, token_publico, contenido, examenes(materia, fecha, tipo)')
        .eq('id', id)
        .single()

      if (!planData) { router.push('/dashboard'); return }
      setPlan(planData as unknown as Plan)

      const { data: bloquesData } = await supabase
        .from('bloques')
        .select('*')
        .eq('plan_id', id)
        .order('orden')

      setBloques(bloquesData ?? [])

      // Open first incomplete day by default
      const dias = planData.contenido?.dias ?? []
      if (dias.length > 0) setDiaAbierto(dias[0].fecha)

      setLoading(false)
    }
    load()
  }, [id])

  async function toggleBloque(bloqueId: string, completado: boolean) {
    setBloques(prev => prev.map(b => b.id === bloqueId ? { ...b, completado } : b))
    await supabase
      .from('bloques')
      .update({ completado })
      .eq('id', bloqueId)
  }

  function compartir() {
    if (!plan) return
    const url = `${window.location.origin}/p/${plan.token_publico}`
    navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--ink-muted)' }}>Cargando tu plan...</p>
      </div>
    )
  }

  if (!plan) return null

  const totalBloques = bloques.filter(b => b.tipo !== 'pausa').length
  const completados = bloques.filter(b => b.completado && b.tipo !== 'pausa').length
  const progreso = totalBloques > 0 ? Math.round((completados / totalBloques) * 100) : 0
  const dias = plan.contenido?.dias ?? []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(21,15,7,0.9)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
        <Link href="/dashboard" style={{ color: 'var(--ink-muted)', textDecoration: 'none', fontSize: '0.88rem' }}>
          ← Dashboard
        </Link>
        <span style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--amber)', fontWeight: 700 }}>Candil</span>
        <button onClick={compartir} className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }}>
          {copiado ? '¡Link copiado!' : 'Compartir'}
        </button>
      </nav>

      <main style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <h1 style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
              {plan.examenes.materia}
            </h1>
            <span style={{ color: 'var(--amber)', background: 'rgba(232,164,74,0.1)', border: '0.5px solid var(--border-strong)', borderRadius: 6, padding: '4px 12px', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {diasRestantes(plan.examenes.fecha)}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div className="progress-bar" style={{ flex: 1 }}>
              <div className="progress-fill" style={{ width: `${progreso}%` }} />
            </div>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', minWidth: 40, textAlign: 'right' }}>
              {progreso}%
            </span>
          </div>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
            {completados} de {totalBloques} bloques completados
          </p>
        </div>

        {/* Resumen de la IA */}
        {plan.contenido.resumen && (
          <div className="card" style={{ padding: '18px 20px', marginBottom: 28, borderLeft: '2px solid var(--amber)' }}>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', lineHeight: 1.65, fontStyle: 'italic' }}>
              {plan.contenido.resumen}
            </p>
          </div>
        )}

        {/* Days */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dias.map(dia => {
            const bloquesDelDia = bloques.filter(b => b.dia === dia.fecha)
            const completadosDia = bloquesDelDia.filter(b => b.completado && b.tipo !== 'pausa').length
            const totalDia = bloquesDelDia.filter(b => b.tipo !== 'pausa').length
            const abierto = diaAbierto === dia.fecha
            const todosCompletados = totalDia > 0 && completadosDia === totalDia

            return (
              <div key={dia.fecha} className="card" style={{ overflow: 'hidden' }}>
                {/* Day header */}
                <button
                  onClick={() => setDiaAbierto(abierto ? null : dia.fecha)}
                  style={{
                    width: '100%', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'transparent', border: 'none', cursor: 'pointer', gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <div>
                      <p style={{ color: todosCompletados ? '#7EC87E' : 'var(--ink)', fontWeight: 600, fontSize: '0.95rem', textAlign: 'left' }}>
                        {todosCompletados ? '✓ ' : ''}{dia.dia_nombre}
                      </p>
                      <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem', textAlign: 'left' }}>
                        {new Date(dia.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
                      {completadosDia}/{totalDia}
                    </span>
                    <span style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      ↓
                    </span>
                  </div>
                </button>

                {/* Day blocks */}
                {abierto && (
                  <div style={{ borderTop: '0.5px solid var(--border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dia.bloques.map((bloque, i) => {
                      const bloqueDb = bloquesDelDia.find(b => b.hora_inicio === bloque.hora_inicio && b.tema === bloque.tema)

                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                            background: tipoColors[bloque.tipo] ?? tipoColors.estudio,
                            borderRadius: 8, border: '0.5px solid var(--border)',
                            opacity: bloqueDb?.completado ? 0.55 : 1,
                            transition: 'opacity 0.2s'
                          }}
                        >
                          {bloque.tipo !== 'pausa' && bloqueDb && (
                            <input
                              type="checkbox"
                              className="check-block"
                              checked={bloqueDb.completado}
                              onChange={e => toggleBloque(bloqueDb.id, e.target.checked)}
                              style={{ marginTop: 2 }}
                            />
                          )}
                          {bloque.tipo === 'pausa' && (
                            <span style={{ fontSize: '0.9rem', marginTop: 2 }}>☕</span>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                              <p style={{
                                fontSize: '0.9rem', fontWeight: 600,
                                color: 'var(--ink)',
                                textDecoration: bloqueDb?.completado ? 'line-through' : 'none'
                              }}>
                                {bloque.tema}
                              </p>
                              <span style={{
                                fontSize: '0.7rem', padding: '2px 7px', borderRadius: 4,
                                color: tipoBadge[bloque.tipo], background: 'rgba(0,0,0,0.15)',
                                whiteSpace: 'nowrap', flexShrink: 0
                              }}>
                                {bloque.tipo}
                              </span>
                            </div>
                            <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem', marginBottom: 4 }}>
                              {bloque.hora_inicio} – {bloque.hora_fin} · {bloque.duracion_minutos} min
                            </p>
                            {bloque.descripcion && (
                              <p style={{ color: 'var(--ink-soft)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                                {bloque.descripcion}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {completadosDia === totalDia && totalDia > 0 && (
                      <p style={{ textAlign: 'center', color: '#7EC87E', fontSize: '0.82rem', padding: '6px 0' }}>
                        Completaste el día. Seguís.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Consejo */}
        {plan.contenido.consejo && (
          <div style={{ marginTop: 32, padding: '18px 20px', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12 }}>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Consejo de Candil</p>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', lineHeight: 1.65 }}>{plan.contenido.consejo}</p>
          </div>
        )}

        {/* Ajustar plan - Pro */}
        <div style={{ marginTop: 24, padding: '18px 20px', background: 'rgba(232,164,74,0.05)', border: '0.5px solid var(--border-strong)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: 'var(--ink)', fontWeight: 500, fontSize: '0.92rem', marginBottom: 4 }}>¿Necesitás ajustar el plan?</p>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.82rem' }}>Escribilo en lenguaje natural. Solo en Pro.</p>
          </div>
          <Link href={`/plan/${id}/ajustar`} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', flexShrink: 0 }}>
            Ajustar plan →
          </Link>
        </div>

      </main>
    </div>
  )
}
