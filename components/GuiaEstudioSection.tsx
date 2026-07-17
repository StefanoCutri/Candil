'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import MarkdownView from '@/components/MarkdownView'

export default function GuiaEstudioSection({ examenId, materia, esPro, onLocked, embedded = false }: {
  examenId: string
  materia: string
  esPro: boolean
  onLocked: () => void
  embedded?: boolean
}) {
  const t = useTranslations('guia')
  const [guia, setGuia] = useState('')
  const [cargando, setCargando] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState('')

  async function generar() {
    if (!esPro) { onLocked(); return }
    setError(''); setCargando(true)
    try {
      const res = await fetch('/api/guia-estudio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examenId }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 403 && data?.code === 'pro_required') { onLocked(); return }
      if (!res.ok) throw new Error(data?.error ?? t('generic_error'))
      setGuia(data.guia as string)
    } catch (e) { setError(e instanceof Error ? e.message : t('generic_error')) }
    finally { setCargando(false) }
  }

  async function descargarPdf() {
    if (!guia) return
    setDescargando(true)
    try {
      const { exportMarkdownPdf } = await import('@/lib/exportPdf')
      exportMarkdownPdf(t('pdf_title'), materia, guia, t('pdf_footer'))
    } finally { setDescargando(false) }
  }

  return (
    <section style={{ marginTop: embedded ? 0 : '3rem' }}>
      {!embedded && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.2rem', fontWeight: 500, color: 'var(--ink)' }}>
            {t('title')}
          </h2>
          {!esPro && (
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 100, background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', color: 'var(--amber)', letterSpacing: '0.06em', fontWeight: 500 }}>PRO</span>
          )}
        </div>
      )}

      {!esPro ? (
        <button onClick={onLocked}
          style={{ width: '100%', textAlign: 'center', padding: '1.75rem 1.5rem', border: '0.5px dashed var(--border-mid)', borderRadius: 10, background: 'transparent', color: 'var(--ink-muted)', fontSize: 13, lineHeight: 1.6, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('locked_pitch')}
          <span style={{ display: 'block', marginTop: 6, color: 'var(--amber)', fontSize: 12 }}>{t('unlock_pro')}</span>
        </button>
      ) : (
        <div style={{ padding: '20px', borderRadius: 12, background: 'var(--surface)', border: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: guia ? 16 : 0, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{t('card_title')}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {guia && (
                <button onClick={descargarPdf} disabled={descargando}
                  style={{ fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink-soft)', background: 'transparent', border: '0.5px solid var(--border-strong)', borderRadius: 100, padding: '9px 16px', cursor: 'pointer' }}>
                  {descargando ? t('downloading') : t('download_pdf')}
                </button>
              )}
              <button onClick={generar} disabled={cargando}
                style={{ fontSize: 12.5, fontFamily: 'inherit', color: 'var(--amber)', background: 'var(--amber-dim)', border: '0.5px solid var(--border-mid)', borderRadius: 100, padding: '9px 16px', cursor: cargando ? 'wait' : 'pointer' }}>
                {cargando ? t('generating') : guia ? t('regenerate') : t('generate')}
              </button>
            </div>
          </div>
          {error && <p style={{ fontSize: 12, color: 'rgba(235,160,140,0.9)', marginTop: 10 }}>{error}</p>}
          {guia && (
            <div style={{ animation: 'panelIn 300ms var(--ease-out) both', maxHeight: 520, overflowY: 'auto', paddingRight: 6 }}>
              <MarkdownView markdown={guia} />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
