'use client'

// Renderer mínimo de Markdown (headings, bullets, bold, itálica) para las
// guías y resúmenes generados por IA. Sin dependencias y sin HTML crudo:
// todo se renderiza como texto vía React, así no hay riesgo de XSS.
import { Fragment, type ReactNode } from 'react'

function inline(text: string, keyBase: string): ReactNode[] {
  // **bold** y *itálica*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={`${keyBase}-${i}`} style={{ color: 'var(--ink)', fontWeight: 600 }}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={`${keyBase}-${i}`}>{p.slice(1, -1)}</em>
    return <Fragment key={`${keyBase}-${i}`}>{p}</Fragment>
  })
}

export default function MarkdownView({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  const out: ReactNode[] = []
  let bullets: ReactNode[] = []

  function flushBullets(key: string) {
    if (bullets.length === 0) return
    out.push(
      <ul key={key} style={{ margin: '6px 0 14px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {bullets}
      </ul>
    )
    bullets = []
  }

  lines.forEach((raw, i) => {
    const line = raw.trimEnd()
    const trimmed = line.trim()
    const bullet = trimmed.match(/^[-*•]\s+(.*)/)
    if (bullet) {
      bullets.push(<li key={`b${i}`} style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{inline(bullet[1], `bi${i}`)}</li>)
      return
    }
    flushBullets(`ul${i}`)
    if (!trimmed) return
    const h = trimmed.match(/^(#{1,4})\s+(.*)/)
    if (h) {
      const level = h[1].length
      out.push(
        <p key={`h${i}`} style={{
          fontFamily: 'var(--font-geist-sans), sans-serif',
          fontSize: level === 1 ? '1.15rem' : level === 2 ? '1rem' : '0.9rem',
          fontWeight: 500, color: level <= 2 ? 'var(--amber)' : 'var(--ink)',
          margin: `${level === 1 ? 4 : 18}px 0 8px`,
        }}>{inline(h[2], `hi${i}`)}</p>
      )
      return
    }
    out.push(<p key={`p${i}`} style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.65, margin: '0 0 10px' }}>{inline(trimmed, `pi${i}`)}</p>)
  })
  flushBullets('ul-final')

  return <div>{out}</div>
}
