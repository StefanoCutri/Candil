'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CandleIcon } from '@/components/CandleIcon'

type Grupo = { id: string; nombre: string; codigo: string; miembros: number }

export default function GruposPage() {
  const router = useRouter()
  const t = useTranslations('groups')
  const tCommon = useTranslations('common')
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [bloqueado, setBloqueado] = useState(false)
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function cargar() {
    setLoading(true)
    const res = await fetch('/api/grupos')
    const data = await res.json().catch(() => null)
    if (res.status === 403 && data?.code === 'plus_required') { setBloqueado(true); setLoading(false); return }
    setGrupos(data?.grupos ?? [])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function accion(action: 'crear' | 'unirse') {
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/grupos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'crear' ? { action, nombre } : { action, codigo }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 403 && data?.code === 'plus_required') { setBloqueado(true); return }
      if (!res.ok) throw new Error(data?.error ?? t('generic_error'))
      router.push(`/grupos/${data.grupoId}`)
    } catch (e) { setError(e instanceof Error ? e.message : t('generic_error')) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 300 }}>
      <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--nav-bg)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <CandleIcon size={14} />
          <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', color: 'var(--ink)', fontSize: '1rem' }}>Candil</span>
        </Link>
        <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--ink-muted)', textDecoration: 'none' }}>← {tCommon('back')}</Link>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 120px' }}>
        <h1 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 8 }}>
          {t('title')}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 32 }}>{t('subtitle')}</p>

        {bloqueado ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', border: '0.5px dashed var(--border-mid)', borderRadius: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 16, lineHeight: 1.6 }}>
              {t.rich('plus_gate', { strong: chunks => <strong style={{ color: 'rgba(200,150,220,0.9)' }}>{chunks}</strong> })}
            </p>
            <Link href="/precios" className="btn-primary">{t('see_plus')}</Link>
          </div>
        ) : loading ? (
          <p style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>{t('loading_groups')}</p>
        ) : (
          <>
            {/* Crear / unirse */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 36 }}>
              <div style={{ padding: 18, borderRadius: 12, background: 'var(--surface)', border: '0.5px solid var(--border)' }}>
                <p style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, marginBottom: 10 }}>{t('create_group')}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder={t('create_placeholder')} style={{ flex: 1 }} />
                  <button onClick={() => accion('crear')} disabled={busy || !nombre.trim()} className="btn-primary" style={{ padding: '10px 16px', fontSize: 13, opacity: busy || !nombre.trim() ? 0.5 : 1 }}>{t('create_btn')}</button>
                </div>
              </div>
              <div style={{ padding: 18, borderRadius: 12, background: 'var(--surface)', border: '0.5px solid var(--border)' }}>
                <p style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, marginBottom: 10 }}>{t('join_code')}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="ABC123" style={{ flex: 1, textTransform: 'uppercase' }} />
                  <button onClick={() => accion('unirse')} disabled={busy || !codigo.trim()} className="btn-secondary" style={{ padding: '10px 16px', fontSize: 13, opacity: busy || !codigo.trim() ? 0.5 : 1 }}>{t('join_btn')}</button>
                </div>
              </div>
            </div>
            {error && <p style={{ fontSize: 13, color: 'rgba(235,160,140,0.9)', marginBottom: 20 }}>{error}</p>}

            {/* Mis grupos */}
            <h2 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>{t('your_groups')}</h2>
            {grupos.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{t('empty')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grupos.map(g => (
                  <Link key={g.id} href={`/grupos/${g.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 10, background: 'var(--surface)', border: '0.5px solid var(--border)', textDecoration: 'none' }}>
                    <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.05rem', color: 'var(--ink)', flex: 1 }}>{g.nombre}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t('members_count', { count: g.miembros })}</span>
                    <span style={{ fontSize: 12, color: 'var(--amber)', letterSpacing: '0.08em', fontFamily: 'monospace' }}>{g.codigo}</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
