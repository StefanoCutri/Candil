'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Mensaje = {
  role: 'user' | 'assistant'
  content: string
}

export default function AjustarPlanPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [mensajes, setMensajes] = useState<Mensaje[]>([{
    role: 'assistant',
    content: '¡Hola! Soy Candil. ¿Qué querés ajustar en tu plan? Podés decirme cosas como "mové el tema 2 para el sábado" o "no puedo estudiar el jueves".'
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<{ materia: string } | null>(null)
  const [esPro, setEsPro] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single()

      setEsPro(profile?.plan === 'pro' || profile?.plan === 'plus')

      const { data: planData } = await supabase
        .from('planes')
        .select('id, examenes(materia)')
        .eq('id', id)
        .single()

      if (planData?.examenes) {
        setPlan({ materia: (planData.examenes as unknown as { materia: string }).materia })
      }
    }
    check()
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function enviar() {
    if (!input.trim() || loading) return

    const userMsg: Mensaje = { role: 'user', content: input.trim() }
    setMensajes(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ajustar-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id, mensaje: input.trim(), historial: mensajes })
      })

      const data = await res.json()

      setMensajes(prev => [...prev, {
        role: 'assistant',
        content: data.respuesta ?? 'El plan fue actualizado.'
      }])
    } catch {
      setMensajes(prev => [...prev, {
        role: 'assistant',
        content: 'Algo salió mal. Intentá de nuevo.'
      }])
    }

    setLoading(false)
  }

  if (!esPro) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: '2rem', marginBottom: 16 }}>🔒</p>
        <h2 style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', marginBottom: 8 }}>Solo disponible en Pro</h2>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: 24, maxWidth: 400 }}>
          El ajuste por chat con IA es una función exclusiva del plan Pro. Por $4.99/mes podés modificar tu plan con lenguaje natural.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href={`/plan/${id}`} className="btn-secondary">Volver al plan</Link>
          <Link href="/precios" className="btn-primary">Ver planes</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Link href={`/plan/${id}`} style={{ color: 'var(--ink-muted)', textDecoration: 'none', fontSize: '0.88rem' }}>
          ← {plan?.materia ?? 'Plan'}
        </Link>
        <span style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--amber)', fontWeight: 700 }}>Ajustar plan</span>
        <div style={{ width: 60 }} />
      </nav>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px', maxWidth: 680, width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mensajes.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: msg.role === 'user' ? 'rgba(232,164,74,0.2)' : 'var(--surface)',
                border: '0.5px solid var(--border)',
                color: 'var(--ink)',
                fontSize: '0.92rem',
                lineHeight: 1.6
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '12px 16px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '12px 12px 12px 4px', color: 'var(--ink-muted)', fontSize: '0.88rem' }}>
                Candil está pensando...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ borderTop: '0.5px solid var(--border)', padding: '16px 24px', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', gap: 10 }}>
          <input
            className="input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
            placeholder="Ej: Mové el tema 3 para el sábado..."
            disabled={loading}
          />
          <button
            onClick={enviar}
            disabled={!input.trim() || loading}
            className="btn-primary"
            style={{ flexShrink: 0, padding: '11px 20px' }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
