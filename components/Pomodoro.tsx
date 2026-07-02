'use client'

import { useState, useEffect, useRef } from 'react'

type PomoMode = 'closed' | 'open' | 'minimized'
type Phase = 'idle' | 'studying' | 'paused' | 'break' | 'paused-break'

const STUDY_OPTS = [25, 45, 60]
const BREAK_OPTS = [5, 10, 15]
const R = 68
const CIRC = 2 * Math.PI * R // ≈ 427.26

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    ;([523, 659, 784] as const).forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.2
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.1, t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2)
      osc.start(t)
      osc.stop(t + 2)
    })
    setTimeout(() => ctx.close(), 5000)
  } catch {}
}

export default function Pomodoro() {
  const [mode, setMode] = useState<PomoMode>('closed')
  const [studyMin, setStudyMin] = useState(45)
  const [breakMin, setBreakMin] = useState(5)
  const [phase, setPhase] = useState<Phase>('idle')
  const [secsLeft, setSecsLeft] = useState(45 * 60)
  const [totalSecs, setTotalSecs] = useState(45 * 60)
  const [cycles, setCycles] = useState(0)
  const prevRef = useRef(45 * 60)

  useEffect(() => {
    if (phase === 'idle') {
      setSecsLeft(studyMin * 60)
      setTotalSecs(studyMin * 60)
    }
  }, [studyMin, phase])

  useEffect(() => {
    if (phase !== 'studying' && phase !== 'break') return
    const id = setInterval(() => setSecsLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (prevRef.current > 0 && secsLeft === 0) {
      playChime()
      if (phase === 'studying') {
        const t = breakMin * 60
        setTotalSecs(t); setSecsLeft(t); setPhase('break')
        setCycles(c => c + 1)
      } else if (phase === 'break') {
        setTotalSecs(studyMin * 60); setSecsLeft(studyMin * 60); setPhase('idle')
      }
    }
    prevRef.current = secsLeft
  }, [secsLeft, phase, breakMin, studyMin])

  function open() {
    if (phase === 'idle') { setSecsLeft(studyMin * 60); setTotalSecs(studyMin * 60) }
    setMode('open')
  }
  function close() {
    setMode('closed')
    setPhase('idle')
    setSecsLeft(studyMin * 60)
    setTotalSecs(studyMin * 60)
    setCycles(0)
  }
  function minimize() { setMode('minimized') }
  function expand() { setMode('open') }

  function toggle() {
    if (phase === 'idle' || phase === 'paused' || phase === 'paused-break') {
      if (phase === 'idle') { setTotalSecs(studyMin * 60); setSecsLeft(studyMin * 60) }
      setPhase(phase === 'paused-break' ? 'break' : 'studying')
    } else {
      setPhase(phase === 'break' ? 'paused-break' : 'paused')
    }
  }
  function reset() {
    setPhase('idle'); setSecsLeft(studyMin * 60); setTotalSecs(studyMin * 60)
  }

  const isRunning = phase === 'studying' || phase === 'break'
  const isBreak = phase === 'break' || phase === 'paused-break'
  const progress = totalSecs > 0 ? secsLeft / totalSecs : 1
  const dashOffset = CIRC * (1 - progress)
  const arcColor = isBreak ? 'rgba(90,158,120,0.8)' : 'var(--amber)'
  const timeStr = fmt(secsLeft)

  const stateLabel = {
    idle: 'Listo para arrancar',
    studying: 'Estudiando',
    paused: 'Pausado',
    break: 'Descansá — lo ganaste',
    'paused-break': 'Descanso · Pausado',
  }[phase]

  const btnLabel = phase === 'idle' ? 'Iniciar' : isRunning ? 'Pausar' : 'Continuar'

  return (
    <>
      {/* FAB */}
      {mode === 'closed' && (
        <button
          onClick={open}
          style={{
            position: 'fixed', bottom: '2rem', right: '2rem',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 100,
            background: 'var(--surface2)', border: '0.5px solid var(--border-strong)',
            color: 'var(--ink-soft)', fontSize: 13, fontFamily: 'inherit',
            cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            transition: 'all 200ms var(--ease-out)', zIndex: 40,
          }}
          onMouseEnter={e => {
            const t = e.currentTarget
            t.style.background = 'var(--amber)'; t.style.color = 'var(--bg)'; t.style.borderColor = 'var(--amber)'
          }}
          onMouseLeave={e => {
            const t = e.currentTarget
            t.style.background = 'var(--surface2)'; t.style.color = 'var(--ink-soft)'; t.style.borderColor = 'var(--border-strong)'
          }}
        >
          <span style={{ fontSize: 16 }}>◎</span> Modo foco
        </button>
      )}

      {/* Minimized pill */}
      {mode === 'minimized' && (
        <button
          onClick={expand}
          style={{
            position: 'fixed', bottom: '2rem', right: '2rem',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 18px', borderRadius: 100,
            background: 'var(--surface2)', border: '0.5px solid var(--border-strong)',
            color: 'var(--ink)', fontSize: 14,
            fontFamily: 'var(--font-geist-sans), sans-serif',
            cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            zIndex: 41, transition: 'all 200ms var(--ease-out)',
          }}
          onMouseEnter={e => {
            const t = e.currentTarget
            t.style.background = 'var(--amber)'; t.style.color = 'var(--bg)'; t.style.borderColor = 'var(--amber)'
          }}
          onMouseLeave={e => {
            const t = e.currentTarget
            t.style.background = 'var(--surface2)'; t.style.color = 'var(--ink)'; t.style.borderColor = 'var(--border-strong)'
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', animation: 'pomoPillarPulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
          {timeStr}
          <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'inherit' }}>· foco</span>
        </button>
      )}

      {/* Modal */}
      {mode === 'open' && (
        <div
          onClick={e => { if (e.target === e.currentTarget) close() }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(21,15,7,0.88)', backdropFilter: 'blur(8px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem', animation: 'fadeIn 200ms var(--ease-out)',
          }}
        >
          <div style={{
            background: 'var(--bg2)', border: '0.5px solid var(--border-strong)',
            borderRadius: 20, padding: '2.5rem 2rem',
            maxWidth: 380, width: '100%', textAlign: 'center',
            animation: 'modalIn 300ms var(--ease-out)',
          }}>
            {/* Title + state */}
            <h2 style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.3rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.3rem' }}>
              Modo foco
            </h2>
            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.7, marginBottom: '2rem' }}>
              {stateLabel}
            </p>

            {/* Circle timer */}
            <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 2rem' }}>
              <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                <circle className="pomo-track" cx="80" cy="80" r={R} fill="none" stroke="var(--surface2)" strokeWidth={6} />
                <circle
                  cx="80" cy="80" r={R} fill="none"
                  stroke={arcColor} strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={CIRC} strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 400ms' }}
                />
              </svg>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '2.2rem',
                fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.04em',
              }}>
                {timeStr}
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--ink-muted)', textAlign: 'center', marginBottom: '1.25rem', marginTop: '-1rem' }}>
              {cycles} ciclo{cycles !== 1 ? 's' : ''} completado{cycles !== 1 ? 's' : ''}
            </p>

            {/* Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.75rem' }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6, display: 'block' }}>Estudio</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {STUDY_OPTS.map(m => (
                    <button key={m} onClick={() => { setStudyMin(m); if (!isRunning && !isBreak) { setSecsLeft(m * 60); setTotalSecs(m * 60) } }}
                      style={{
                        padding: '5px 10px', borderRadius: 100,
                        border: `0.5px solid ${studyMin === m ? 'var(--border-strong)' : 'var(--border-mid)'}`,
                        background: studyMin === m ? 'var(--surface2)' : 'transparent',
                        color: studyMin === m ? 'var(--ink)' : 'var(--ink-muted)',
                        fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms',
                      }}
                    >{m}</button>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6, display: 'block' }}>Descanso</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {BREAK_OPTS.map(m => (
                    <button key={m} onClick={() => { setBreakMin(m); if (!isRunning && isBreak) { setSecsLeft(m * 60); setTotalSecs(m * 60) } }}
                      style={{
                        padding: '5px 10px', borderRadius: 100,
                        border: `0.5px solid ${breakMin === m ? 'var(--border-strong)' : 'var(--border-mid)'}`,
                        background: breakMin === m ? 'var(--surface2)' : 'transparent',
                        color: breakMin === m ? 'var(--ink)' : 'var(--ink-muted)',
                        fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms',
                      }}
                    >{m}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '1.5rem' }}>
              <button onClick={reset}
                style={{ padding: '11px 16px', borderRadius: 100, background: 'none', border: '0.5px solid var(--border-mid)', color: 'var(--ink-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 200ms' }}>
                ↺
              </button>
              <button onClick={toggle}
                style={{ padding: '11px 28px', borderRadius: 100, background: 'var(--amber)', color: 'var(--bg)', border: 'none', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', transition: 'background 200ms, transform 150ms var(--ease-out)' }}>
                {btnLabel}
              </button>
              <button onClick={close}
                style={{ padding: '11px 16px', borderRadius: 100, background: 'none', border: '0.5px solid var(--border-mid)', color: 'var(--ink-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 200ms' }}>
                ✕
              </button>
            </div>

            {/* Footer links */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={minimize}
                style={{ fontSize: 12, color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color 200ms' }}>
                Minimizar —
              </button>
              <button onClick={close}
                style={{ fontSize: 12, color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color 200ms' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
