'use client'

import { useState, useRef, useEffect } from 'react'

type Mensaje = { role: 'user' | 'assistant'; content: string }

const SUGERENCIAS = [
  'No puedo estudiar mañana',
  'Hacé los bloques más cortos',
  'Quiero más repaso antes del examen',
  'Movéme el simulacro de día',
]

export default function AjustePanel({ planId, open, onClose, onPlanUpdated }: {
  planId: string
  open: boolean
  onClose: () => void
  onPlanUpdated: () => void
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([{
    role: 'assistant',
    content: 'Contame qué querés cambiar del plan. Puedo mover temas, achicar bloques, sumar repasos — lo que necesites.',
  }])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [primerEnvio, setPrimerEnvio] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, typing])

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 350)
  }, [open])

  function autoresize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  async function enviar(texto?: string) {
    const msg = (texto ?? input).trim()
    if (!msg || typing) return
    setPrimerEnvio(true)
    const historial = mensajes
    setMensajes(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setTyping(true)

    try {
      const res = await fetch('/api/ajustar-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, mensaje: msg, historial }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? '')
      setMensajes(prev => [...prev, { role: 'assistant', content: data.respuesta ?? 'Listo, ajusté tu plan.' }])
      if (data.actualizado) onPlanUpdated()
    } catch (e) {
      const detalle = e instanceof Error && e.message ? e.message : 'Algo salió mal, intentá de nuevo.'
      setMensajes(prev => [...prev, { role: 'assistant', content: detalle }])
    }
    setTyping(false)
  }

  return (
    <>
      {/* Overlay clickeable para cerrar */}
      {open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, animation: 'fadeIn 300ms var(--ease-out)' }} />
      )}

      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 380, maxWidth: '100vw', zIndex: 90,
        background: 'var(--bg2)', borderLeft: '0.5px solid var(--border-strong)',
        boxShadow: open ? '-24px 0 60px rgba(0,0,0,0.45)' : 'none',
        transform: open ? 'translateX(0)' : 'translateX(105%)',
        transition: 'transform 380ms var(--ease-out), box-shadow 380ms var(--ease-out)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontSize: '1.05rem', fontWeight: 400, color: 'var(--ink)', lineHeight: 1.2 }}>
              Ajustar plan
            </h2>
            <p style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>✦ Pro · Candil IA</p>
          </div>
          <button onClick={onClose}
            style={{ marginLeft: 'auto', background: 'none', border: '0.5px solid var(--border-mid)', borderRadius: 100, width: 28, height: 28, color: 'var(--ink-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 200ms' }}>
            ✕
          </button>
        </div>

        {/* Mensajes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mensajes.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%', padding: '10px 14px', fontSize: 13, lineHeight: 1.55, color: 'var(--ink)',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: msg.role === 'user' ? 'var(--surface2)' : 'var(--amber-dim)',
                border: `0.5px solid ${msg.role === 'user' ? 'var(--border-mid)' : 'var(--border)'}`,
                animation: 'itemIn 250ms var(--ease-out) both',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '12px 16px', borderRadius: '12px 12px 12px 4px', background: 'var(--amber-dim)', border: '0.5px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 0.15, 0.3].map((delay, i) => (
                  <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)', animation: `typingDot 1.1s ease-in-out ${delay}s infinite`, display: 'block' }} />
                ))}
              </div>
            </div>
          )}

          {/* Sugerencias rápidas */}
          {!primerEnvio && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 2 }}>Probá con</span>
              {SUGERENCIAS.map(s => (
                <button key={s} onClick={() => enviar(s)}
                  style={{
                    textAlign: 'left', padding: '9px 14px', borderRadius: 10,
                    background: 'transparent', border: '0.5px dashed var(--border-mid)',
                    color: 'var(--ink-soft)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'border-color 200ms var(--ease-out), color 200ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--amber)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--ink-soft)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '14px 16px', borderTop: '0.5px solid var(--border)', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onChange={e => { setInput(e.target.value); autoresize() }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
            }}
            placeholder="Ej: mové Parcial 2 al sábado…"
            disabled={typing}
            style={{
              flex: 1, resize: 'none', padding: '11px 14px', borderRadius: 10,
              background: 'var(--bg)', border: '0.5px solid var(--border-mid)',
              color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.5,
              outline: 'none', maxHeight: 120, transition: 'border-color 200ms',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--amber)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-mid)' }}
          />
          <button onClick={() => enviar()} disabled={!input.trim() || typing}
            style={{
              padding: '11px 16px', borderRadius: 100, flexShrink: 0,
              background: 'var(--amber)', color: 'var(--bg)', border: 'none',
              fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
              cursor: !input.trim() || typing ? 'not-allowed' : 'pointer',
              opacity: !input.trim() || typing ? 0.5 : 1,
              transition: 'opacity 200ms, transform 150ms var(--ease-out)',
            }}>
            ↑
          </button>
        </div>
      </aside>
    </>
  )
}
