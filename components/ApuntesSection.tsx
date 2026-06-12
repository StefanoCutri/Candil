'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Archivo = {
  id: string
  nombre: string
  tipo: 'pdf' | 'imagen'
  storage_path: string
  tamanio_bytes: number
  created_at: string
}

function formatBytes(b: number) {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  if (b >= 1024) return `${Math.round(b / 1024)} KB`
  return `${b} B`
}

export default function ApuntesSection({ examenId, esPro, onLocked }: {
  examenId: string
  esPro: boolean
  onLocked: () => void
}) {
  const supabase = createClient()
  const [archivos, setArchivos] = useState<Archivo[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!esPro || !examenId) return
    supabase
      .from('archivos')
      .select('*')
      .eq('examen_id', examenId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setArchivos((data ?? []) as Archivo[]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examenId, esPro])

  function handlePick() {
    if (!esPro) { onLocked(); return }
    inputRef.current?.click()
  }

  async function handleUpload(file: File) {
    setError('')
    setSubiendo(true)
    try {
      const form = new FormData()
      form.append('archivo', file)
      form.append('examenId', examenId)
      const res = await fetch('/api/upload-archivo', { method: 'POST', body: form })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Algo salió mal subiendo el archivo')
      setArchivos(prev => [data.archivo as Archivo, ...prev])
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Algo salió mal, intentá de nuevo')
    }
    setSubiendo(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(archivo: Archivo) {
    setArchivos(prev => prev.filter(a => a.id !== archivo.id))
    await supabase.storage.from('apuntes').remove([archivo.storage_path])
    await supabase.from('archivos').delete().eq('id', archivo.id)
  }

  return (
    <section style={{ marginTop: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif), serif', fontSize: '1.2rem', fontWeight: 400, color: 'var(--ink)' }}>
          Tus apuntes
        </h2>
        {!esPro && (
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 100, background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', color: 'var(--amber)', letterSpacing: '0.06em', fontWeight: 500 }}>PRO</span>
        )}
        <button
          onClick={handlePick}
          disabled={subiendo}
          style={{
            marginLeft: 'auto', fontSize: 12, fontFamily: 'inherit',
            color: 'var(--amber)', background: 'var(--amber-dim)',
            border: '0.5px solid var(--border-mid)', borderRadius: 100,
            padding: '6px 14px', cursor: subiendo ? 'wait' : 'pointer',
            opacity: subiendo ? 0.6 : 1, transition: 'all 200ms var(--ease-out)',
            whiteSpace: 'nowrap',
          }}>
          {subiendo ? 'Subiendo…' : '+ Subir apunte'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
        />
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, border: '0.5px solid rgba(220,120,100,0.4)', background: 'rgba(220,120,100,0.08)', fontSize: 12, color: 'rgba(235,160,140,0.9)', marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      {!esPro ? (
        <button
          onClick={onLocked}
          style={{
            width: '100%', textAlign: 'center', padding: '1.75rem 1.5rem',
            border: '0.5px dashed var(--border-mid)', borderRadius: 10,
            background: 'transparent', color: 'var(--ink-muted)',
            fontSize: 13, lineHeight: 1.6, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'border-color 200ms var(--ease-out)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)' }}
        >
          Subí tus PDFs o fotos de apuntes y Candil genera resúmenes y preguntas de práctica desde lo que vos ya tenés.
          <span style={{ display: 'block', marginTop: 6, color: 'var(--amber)', fontSize: 12 }}>Desbloqueá con Pro →</span>
        </button>
      ) : archivos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.75rem 1.5rem', border: '0.5px dashed var(--border-mid)', borderRadius: 10, color: 'var(--ink-faint)', fontSize: 13, lineHeight: 1.6 }}>
          Todavía no subiste apuntes para este examen.<br />PDF o fotos (JPG, PNG, WebP, HEIC).
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {archivos.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, background: 'var(--surface)', border: '0.5px solid var(--border)', animation: 'itemIn 250ms var(--ease-out) both' }}>
              <span style={{ fontSize: 15, flexShrink: 0, opacity: 0.8 }}>{a.tipo === 'pdf' ? '⎘' : '▣'}</span>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', flexShrink: 0 }}>{formatBytes(a.tamanio_bytes)}</span>
              <button
                onClick={() => handleDelete(a)}
                title="Borrar apunte"
                style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1, fontFamily: 'monospace', flexShrink: 0 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
