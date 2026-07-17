'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CandleIcon } from '@/components/CandleIcon'

const STORAGE_KEY = 'candil-onboarding-seen'

/* Ilustraciones minimalistas por paso, en la paleta del producto */
function StepArt({ paso }: { paso: number }) {
  if (paso === 0) {
    return (
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none" aria-hidden="true">
        <rect x="20" y="12" width="80" height="56" rx="8" stroke="var(--border-strong)" strokeWidth="1" fill="var(--surface)" />
        <rect x="30" y="24" width="44" height="6" rx="3" fill="var(--amber)" opacity="0.8" />
        <rect x="30" y="38" width="60" height="4" rx="2" fill="var(--ink-faint)" />
        <rect x="30" y="48" width="52" height="4" rx="2" fill="var(--ink-faint)" />
        <circle cx="88" cy="27" r="7" fill="var(--amber-dim)" stroke="var(--amber)" strokeWidth="1" />
        <path d="M85 27h6M88 24v6" stroke="var(--amber)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    )
  }
  if (paso === 1) {
    return (
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none" aria-hidden="true">
        <rect x="14" y="14" width="26" height="52" rx="6" stroke="var(--border-strong)" strokeWidth="1" fill="var(--surface)" />
        <rect x="47" y="14" width="26" height="52" rx="6" stroke="var(--amber)" strokeWidth="1" fill="var(--amber-dim)" />
        <rect x="80" y="14" width="26" height="52" rx="6" stroke="var(--border-strong)" strokeWidth="1" fill="var(--surface)" />
        {[0, 1, 2].map(col => (
          [0, 1, 2].map(row => (
            <rect key={`${col}-${row}`} x={20 + col * 33} y={24 + row * 13} width={14 + (row % 2) * 4} height="4" rx="2"
              fill={col === 1 ? 'var(--amber)' : 'var(--ink-faint)'} opacity={col === 1 ? 0.7 : 1} />
          ))
        ))}
      </svg>
    )
  }
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" aria-hidden="true">
      <rect x="20" y="10" width="80" height="18" rx="9" stroke="var(--border-strong)" strokeWidth="1" fill="var(--surface)" />
      <circle cx="32" cy="19" r="5" fill="var(--amber)" />
      <path d="M30 19l1.5 1.5L35 17" stroke="var(--bg)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="44" y="16.5" width="40" height="5" rx="2.5" fill="var(--ink-faint)" />
      <rect x="20" y="34" width="80" height="18" rx="9" stroke="var(--border-strong)" strokeWidth="1" fill="var(--surface)" />
      <circle cx="32" cy="43" r="5" fill="var(--amber)" />
      <path d="M30 43l1.5 1.5L35 41" stroke="var(--bg)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="44" y="40.5" width="32" height="5" rx="2.5" fill="var(--ink-faint)" />
      <rect x="20" y="58" width="80" height="18" rx="9" stroke="var(--border-mid)" strokeWidth="1" strokeDasharray="3 3" fill="none" />
      <circle cx="32" cy="67" r="5" stroke="var(--border-mid)" strokeWidth="1" fill="none" />
      <rect x="44" y="64.5" width="36" height="5" rx="2.5" fill="var(--ink-faint)" opacity="0.6" />
    </svg>
  )
}

export default function OnboardingModal() {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [paso, setPaso] = useState(0)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') setVisible(true)
    } catch {}
  }, [])

  function cerrar(irANuevo: boolean) {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setVisible(false)
    if (irANuevo) router.push('/nuevo')
  }

  if (!visible) return null

  const pasos = [
    { titulo: t('step1_title'), desc: t('step1_desc') },
    { titulo: t('step2_title'), desc: t('step2_desc') },
    { titulo: t('step3_title'), desc: t('step3_desc') },
  ]
  const esUltimo = paso === pasos.length - 1

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) cerrar(false) }}
      style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', animation: 'fadeIn 250ms var(--ease-out)' }}>
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border-strong)', borderRadius: 20, padding: '2.5rem 2rem 2rem', maxWidth: 420, width: '100%', textAlign: 'center', animation: 'modalIn 350ms var(--ease-out)', position: 'relative' }}>
        <button onClick={() => cerrar(false)} aria-label={t('skip')}
          style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: 'var(--ink-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 4 }}>
          {t('skip')}
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <CandleIcon size={16} />
        </div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.7, marginBottom: 22 }}>
          {t('welcome')}
        </p>

        <div key={paso} style={{ animation: 'panelIn 300ms var(--ease-out)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <StepArt paso={paso} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.3rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
            {pasos[paso].titulo}
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--ink-muted)', lineHeight: 1.65, marginBottom: 26, minHeight: 44 }}>
            {pasos[paso].desc}
          </p>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 22 }}>
          {pasos.map((_, i) => (
            <button key={i} onClick={() => setPaso(i)} aria-label={`${i + 1}/${pasos.length}`}
              style={{
                width: i === paso ? 20 : 7, height: 7, borderRadius: 100, border: 'none', padding: 0, cursor: 'pointer',
                background: i === paso ? 'var(--amber)' : 'var(--border-mid)',
                transition: 'all 300ms var(--ease-out)',
              }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {paso > 0 && (
            <button onClick={() => setPaso(p => p - 1)}
              style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, padding: 12, borderRadius: 100, background: 'transparent', color: 'var(--ink-muted)', border: '0.5px solid var(--border-mid)', cursor: 'pointer' }}>
              {t('back')}
            </button>
          )}
          <button onClick={() => esUltimo ? cerrar(true) : setPaso(p => p + 1)}
            style={{ flex: 2, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, padding: 12, borderRadius: 100, background: 'var(--amber)', color: 'var(--bg)', border: 'none', cursor: 'pointer', transition: 'background 200ms' }}>
            {esUltimo ? t('cta_final') : t('next')}
          </button>
        </div>
      </div>
    </div>
  )
}
