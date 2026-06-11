'use client'

import { useState, useEffect, useRef } from 'react'

type Phase = 'idle' | 'studying' | 'paused-study' | 'break' | 'paused-break'

const STUDY_OPTIONS = [25, 45, 60]
const BREAK_OPTIONS = [5, 10, 15]
const RADIUS = 82
const SW = 7
const CIRC = 2 * Math.PI * RADIUS

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

export default function PomodoroTimer() {
  const [studyMin, setStudyMin] = useState(25)
  const [breakMin, setBreakMin] = useState(5)
  const [phase, setPhase] = useState<Phase>('idle')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [totalSeconds, setTotalSeconds] = useState(25 * 60)
  const prevRef = useRef(25 * 60)

  // Sync display when idle and study time selector changes
  useEffect(() => {
    if (phase === 'idle') {
      setSecondsLeft(studyMin * 60)
      setTotalSeconds(studyMin * 60)
    }
  }, [studyMin, phase])

  // Tick interval
  useEffect(() => {
    if (phase !== 'studying' && phase !== 'break') return
    const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [phase])

  // Phase transition when timer hits zero
  useEffect(() => {
    if (prevRef.current > 0 && secondsLeft === 0) {
      playChime()
      if (phase === 'studying') {
        const t = breakMin * 60
        setTotalSeconds(t)
        setSecondsLeft(t)
        setPhase('break')
      } else if (phase === 'break') {
        setTotalSeconds(studyMin * 60)
        setSecondsLeft(studyMin * 60)
        setPhase('idle')
      }
    }
    prevRef.current = secondsLeft
  }, [secondsLeft, phase, breakMin, studyMin])

  const start = () => {
    if (phase === 'idle') {
      const t = studyMin * 60
      setTotalSeconds(t)
      setSecondsLeft(t)
      setPhase('studying')
    } else if (phase === 'paused-study') setPhase('studying')
    else if (phase === 'paused-break') setPhase('break')
  }

  const pause = () => {
    if (phase === 'studying') setPhase('paused-study')
    else if (phase === 'break') setPhase('paused-break')
  }

  const reset = () => {
    setTotalSeconds(studyMin * 60)
    setSecondsLeft(studyMin * 60)
    setPhase('idle')
  }

  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 1
  const dashOffset = CIRC * (1 - progress)
  const isIdle = phase === 'idle'
  const isRunning = phase === 'studying' || phase === 'break'
  const isBreak = phase === 'break' || phase === 'paused-break'
  const arcColor = isBreak ? '#7EC87E' : '#E8A44A'

  const LABEL: Record<Phase, string> = {
    idle: 'Listo',
    studying: 'Estudiando',
    'paused-study': 'Pausado',
    break: 'Descanso',
    'paused-break': 'Descanso · Pausado',
  }
  const COLOR: Record<Phase, string> = {
    idle: 'var(--ink-muted)',
    studying: 'var(--amber)',
    'paused-study': 'var(--ink-muted)',
    break: '#7EC87E',
    'paused-break': 'rgba(126,200,126,0.5)',
  }

  return (
    <section style={{ marginTop: 56, paddingTop: 48, borderTop: '0.5px solid var(--border)' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', fontSize: '1.3rem', marginBottom: 4 }}>
          Modo foco
        </h2>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.88rem' }}>
          Temporizador Pomodoro para sesiones de estudio.
        </p>
      </div>

      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div className="card" style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>

          {/* Circular timer */}
          <div style={{ position: 'relative', width: 214, height: 214 }}>
            <svg
              width="214" height="214"
              viewBox="0 0 214 214"
              style={{
                transform: 'rotate(-90deg)',
                filter: isRunning
                  ? isBreak
                    ? 'drop-shadow(0 0 10px rgba(126,200,126,0.2))'
                    : 'drop-shadow(0 0 12px rgba(232,164,74,0.25))'
                  : 'none',
                transition: 'filter 0.6s ease',
              }}
            >
              {/* Soft outer glow ring when running */}
              {isRunning && (
                <circle
                  cx="107" cy="107" r={RADIUS + 5}
                  fill="none"
                  stroke={arcColor}
                  strokeWidth={2}
                  strokeOpacity={0.1}
                  strokeDasharray={CIRC}
                  strokeDashoffset={dashOffset}
                />
              )}
              {/* Track */}
              <circle
                cx="107" cy="107" r={RADIUS}
                fill="none"
                stroke="rgba(249,232,200,0.07)"
                strokeWidth={SW}
              />
              {/* Progress arc */}
              <circle
                cx="107" cy="107" r={RADIUS}
                fill="none"
                stroke={arcColor}
                strokeWidth={SW}
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease' }}
              />
            </svg>

            {/* Time & label overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 6,
              pointerEvents: 'none',
            }}>
              <span style={{
                fontFamily: 'var(--font-baskerville)',
                fontSize: '2.9rem',
                fontWeight: 700,
                color: 'var(--ink)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}>
                {fmt(secondsLeft)}
              </span>
              <span style={{
                fontSize: '0.7rem',
                color: COLOR[phase],
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                transition: 'color 0.4s ease',
              }}>
                {LABEL[phase]}
              </span>
            </div>
          </div>

          {/* Duration selectors — only when idle */}
          {isIdle && (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              <DurationSelector
                label="Estudio"
                options={STUDY_OPTIONS}
                value={studyMin}
                onChange={setStudyMin}
                activeColor="#E8A44A"
                activeBg="rgba(232,164,74,0.14)"
                activeBorder="rgba(232,164,74,0.7)"
              />
              <DurationSelector
                label="Descanso"
                options={BREAK_OPTIONS}
                value={breakMin}
                onChange={setBreakMin}
                activeColor="#7EC87E"
                activeBg="rgba(126,200,126,0.12)"
                activeBorder="rgba(126,200,126,0.6)"
              />
            </div>
          )}

          {/* Session info chips — only when active */}
          {!isIdle && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[`${studyMin}m estudio`, `${breakMin}m descanso`].map(t => (
                <span key={t} style={{
                  fontSize: '0.75rem',
                  color: 'var(--ink-muted)',
                  background: 'rgba(249,232,200,0.05)',
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: '0.5px solid var(--border)',
                }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Controls */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {(isIdle || phase === 'paused-study' || phase === 'paused-break') && (
              <button onClick={start} className="btn-primary" style={{ padding: '10px 32px', fontSize: '0.9rem' }}>
                {isIdle ? 'Iniciar' : 'Retomar'}
              </button>
            )}
            {isRunning && (
              <button onClick={pause} className="btn-secondary" style={{ padding: '10px 32px', fontSize: '0.9rem' }}>
                Pausar
              </button>
            )}
            {!isIdle && (
              <button onClick={reset} className="btn-ghost">
                Reiniciar
              </button>
            )}
          </div>

        </div>
      </div>
    </section>
  )
}

function DurationSelector({ label, options, value, onChange, activeColor, activeBg, activeBorder }: {
  label: string
  options: number[]
  value: number
  onChange: (v: number) => void
  activeColor: string
  activeBg: string
  activeBorder: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: '0.69rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 5 }}>
        {options.map(min => {
          const active = value === min
          return (
            <button
              key={min}
              onClick={() => onChange(min)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: `0.5px solid ${active ? activeBorder : 'var(--border)'}`,
                background: active ? activeBg : 'transparent',
                color: active ? activeColor : 'var(--ink-soft)',
                fontSize: '0.82rem',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {min}m
            </button>
          )
        })}
      </div>
    </div>
  )
}
