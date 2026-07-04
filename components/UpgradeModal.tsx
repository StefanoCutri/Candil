'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function UpgradeModal({ descripcion, onClose, onContinueFree, continueLabel }: {
  descripcion?: string
  onClose: () => void
  onContinueFree?: () => void
  continueLabel?: string
}) {
  const t = useTranslations('upgrade')
  const FEATURES_PRO = [t('feat_blocks'), t('feat_chat'), t('feat_multi'), t('feat_practice')]
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', animation: 'fadeIn 200ms var(--ease-out)' }}>
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border-strong)', borderRadius: 16, padding: '2rem', maxWidth: 400, width: '100%', animation: 'modalIn 300ms var(--ease-out)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <svg width="32" height="48" viewBox="0 0 32 48" fill="none">
            <path d="M16 2C16 2 26 13 26 21C26 27.6 21.5 33 16 33C10.5 33 6 27.6 6 21C6 13 16 2 16 2Z" fill="#E8A44A" opacity="0.9"/>
            <path d="M16 9C16 9 21 15 21 20C21 23.3 18.8 26 16 26C13.2 26 11 23.3 11 20C11 15 16 9 16 9Z" fill="#F5C97A"/>
            <rect x="12" y="33" width="8" height="10" rx="2" fill="#6B4226"/>
            <rect x="8" y="41" width="16" height="4" rx="2" fill="#3D2B1F"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.3rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem', textAlign: 'center' }}>
          {t('title')}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6, textAlign: 'center', marginBottom: '1.5rem' }}>
          {descripcion ?? t('default_desc')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1.75rem' }}>
          {FEATURES_PRO.map(feat => (
            <div key={feat} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, color: 'var(--ink-soft)' }}>
              <span style={{ color: 'var(--amber)', opacity: 0.6, fontSize: 9, flexShrink: 0 }}>✦</span>
              {feat}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link href="/precios"
            style={{ fontFamily: 'inherit', fontSize: 14, padding: 13, borderRadius: 100, background: 'var(--amber)', color: 'var(--bg)', border: 'none', cursor: 'pointer', transition: 'background 200ms', width: '100%', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
            {t('see_plans')}
          </Link>
          <button onClick={onContinueFree ?? onClose}
            style={{ fontFamily: 'inherit', fontSize: 13, padding: 10, borderRadius: 100, background: 'transparent', border: '0.5px solid var(--border-mid)', color: 'var(--ink-muted)', cursor: 'pointer', transition: 'all 200ms', width: '100%' }}>
            {continueLabel ?? t('continue_free')}
          </button>
        </div>
      </div>
    </div>
  )
}
