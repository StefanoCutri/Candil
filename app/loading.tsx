import { getTranslations } from 'next-intl/server'

export default async function Loading() {
  const t = await getTranslations('common')
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <svg width="36" height="52" viewBox="0 0 56 80" fill="none" style={{ animation: 'flicker 2.5s ease-in-out infinite', transformOrigin: '50% 85%', filter: 'drop-shadow(0 0 14px rgba(232,164,74,0.35))' }}>
        <path d="M28 4C28 4 44 22 44 36C44 46 37.2 55 28 55C18.8 55 12 46 12 36C12 22 28 4 28 4Z" fill="#E8A44A" opacity="0.88" />
        <path d="M28 16C28 16 38 29 38 37C38 43 33.5 48 28 48C22.5 48 18 43 18 37C18 29 28 16 28 16Z" fill="#F5C97A" />
        <rect x="21" y="55" width="14" height="18" rx="3" fill="#6B4226" />
        <rect x="14" y="70" width="28" height="6" rx="3" fill="#3D2B1F" />
      </svg>
      <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>{t('loading')}</p>
    </div>
  )
}
