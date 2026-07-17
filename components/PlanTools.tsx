'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import ApuntesSection from '@/components/ApuntesSection'
import PracticaSection from '@/components/PracticaSection'
import GuiaEstudioSection from '@/components/GuiaEstudioSection'
import FlashcardsSection from '@/components/FlashcardsSection'
import { PlusTool } from '@/components/PlusSection'

type TabId = 'apuntes' | 'practica' | 'flashcards' | 'guia' | 'mapa' | 'chat' | 'resumen'

const MAIN_TABS: TabId[] = ['apuntes', 'practica', 'flashcards', 'guia']
const MORE_TABS: TabId[] = ['mapa', 'chat', 'resumen']

export default function PlanTools({ examenId, materia, esPro, esPlus, onLocked }: {
  examenId: string
  materia: string
  esPro: boolean
  esPlus: boolean
  onLocked: () => void
}) {
  const t = useTranslations('tools')
  const [active, setActive] = useState<TabId>('apuntes')
  const [visited, setVisited] = useState<Set<TabId>>(new Set(['apuntes']))
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    function onDown(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [moreOpen])

  function select(tab: TabId) {
    setActive(tab)
    setVisited(prev => prev.has(tab) ? prev : new Set(prev).add(tab))
    setMoreOpen(false)
  }

  const moreActive = MORE_TABS.includes(active)

  const tabStyle = (isActive: boolean) => ({
    background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer',
    fontSize: 13.5, padding: '10px 2px', whiteSpace: 'nowrap' as const, flexShrink: 0,
    color: isActive ? 'var(--ink)' : 'var(--ink-muted)',
    fontWeight: isActive ? 500 : 300,
    borderBottom: `2px solid ${isActive ? 'var(--amber)' : 'transparent'}`,
    transition: 'color 200ms var(--ease-out), border-color 200ms var(--ease-out)',
  })

  function renderTab(tab: TabId) {
    switch (tab) {
      case 'apuntes': return <ApuntesSection examenId={examenId} esPro={esPro} onLocked={onLocked} embedded />
      case 'practica': return <PracticaSection examenId={examenId} esPro={esPro} onLocked={onLocked} embedded />
      case 'flashcards': return <FlashcardsSection examenId={examenId} esPro={esPro} onLocked={onLocked} embedded />
      case 'guia': return <GuiaEstudioSection examenId={examenId} materia={materia} esPro={esPro} onLocked={onLocked} embedded />
      case 'mapa': case 'chat': case 'resumen':
        return <PlusTool tool={tab} examenId={examenId} materia={materia} esPlus={esPlus} onLocked={onLocked} />
    }
  }

  return (
    <div style={{ marginTop: '3.5rem' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, borderBottom: '0.5px solid var(--border)', overflowX: 'auto', marginBottom: '1.5rem' }}>
        {MAIN_TABS.map(tab => (
          <button key={tab} onClick={() => select(tab)} style={tabStyle(active === tab)}>
            {t(`tab_${tab}`)}
          </button>
        ))}

        {/* Más ▾ */}
        <div ref={moreRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setMoreOpen(v => !v)} style={tabStyle(moreActive)}>
            {moreActive ? t(`tab_${active}`) : t('tab_more')} <span style={{ fontSize: 9 }}>▾</span>
          </button>
          {moreOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 60,
              background: 'var(--bg2)', border: '0.5px solid var(--border-mid)', borderRadius: 10,
              padding: 6, minWidth: 180, boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
              animation: 'panelIn 200ms var(--ease-out) both',
            }}>
              {MORE_TABS.map(tab => (
                <button key={tab} onClick={() => select(tab)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: active === tab ? 'var(--amber-dim)' : 'none',
                    border: 'none', borderRadius: 6, padding: '9px 12px', fontFamily: 'inherit', fontSize: 13,
                    color: active === tab ? 'var(--amber)' : 'var(--ink-soft)', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { if (active !== tab) e.currentTarget.style.background = 'var(--surface)' }}
                  onMouseLeave={e => { if (active !== tab) e.currentTarget.style.background = 'none' }}>
                  {t(`tab_${tab}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panels — se montan al visitarlos y quedan vivos para no perder estado */}
      {Array.from(visited).map(tab => (
        <div key={tab} style={{ display: tab === active ? 'block' : 'none' }}>
          <div style={{ animation: tab === active ? 'panelIn 300ms var(--ease-out) both' : undefined }}>
            {renderTab(tab)}
          </div>
        </div>
      ))}
    </div>
  )
}
