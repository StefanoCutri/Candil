'use client'

import Link from 'next/link'
import { useState } from 'react'

/* ── Candle / Flame SVG ──────────────────────────────────────────────── */
function CandleFlame({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#F5C97A" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#E8A44A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="outerFlame" cx="50%" cy="75%" r="55%" fx="50%" fy="80%">
          <stop offset="0%" stopColor="#F5C97A" />
          <stop offset="45%" stopColor="#E8A44A" />
          <stop offset="100%" stopColor="#C45E0A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="innerFlame" cx="50%" cy="65%" r="45%" fx="50%" fy="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#FFFBEF" />
          <stop offset="100%" stopColor="#F5C97A" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient glow */}
      <ellipse cx="40" cy="72" rx="38" ry="32" fill="url(#glow)" className="flame-glow" />

      {/* Outer flame */}
      <path
        d="M40 8 C30 22 18 40 20 62 C22 74 30 84 40 90 C50 84 58 74 60 62 C62 40 50 22 40 8Z"
        fill="url(#outerFlame)"
        className="flame-outer"
      />

      {/* Inner flame (bright core) */}
      <path
        d="M40 30 C35 40 31 52 33 64 C35 72 38 79 40 83 C42 79 45 72 47 64 C49 52 45 40 40 30Z"
        fill="url(#innerFlame)"
        className="flame-inner"
      />

      {/* Highlight streak */}
      <path
        d="M37 38 C36 46 35 54 36 60 C37 53 38 46 39 40Z"
        fill="white"
        opacity="0.35"
        className="flame-inner"
      />

      {/* Wick */}
      <line x1="40" y1="83" x2="40" y2="92" stroke="#3D2B1F" strokeWidth="1.5" strokeLinecap="round" />

      {/* Candle body */}
      <rect x="26" y="91" width="28" height="26" rx="2" fill="#3D2B1F" />
      <rect x="26" y="91" width="28" height="3" rx="1" fill="rgba(232,164,74,0.25)" />

      {/* Wax drip detail */}
      <rect x="26" y="94" width="4" height="8" rx="2" fill="rgba(232,164,74,0.1)" />
    </svg>
  )
}

function CandleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C10.5 4.5 9 7 9.5 10.5C10 13 11 15 12 16C13 15 14 13 14.5 10.5C15 7 13.5 4.5 12 2Z" fill="#E8A44A" />
      <path d="M12 4C11.3 5.5 10.5 7.5 11 10C11.3 11.5 11.7 13 12 14C12.3 13 12.7 11.5 13 10C13.5 7.5 12.7 5.5 12 4Z" fill="#F5C97A" />
      <line x1="12" y1="15.5" x2="12" y2="17" stroke="#3D2B1F" strokeWidth="1.2" />
      <rect x="9" y="17" width="6" height="5" rx="0.5" fill="#3D2B1F" />
    </svg>
  )
}

/* ── App mockup component ────────────────────────────────────────────── */
function AppMockup() {
  const blocks = [
    { tema: 'Teorema de Bayes', tiempo: '20:00 – 21:30', tipo: 'estudio', completado: true },
    { tema: 'Distribuciones discretas', tiempo: '21:45 – 22:45', tipo: 'estudio', completado: true },
    { tema: 'Pausa activa', tiempo: '22:45 – 23:00', tipo: 'pausa', completado: false },
    { tema: 'Ejercicios de práctica', tiempo: '23:00 – 23:45', tipo: 'simulacro', completado: false }
  ]

  const tipoColor: Record<string, string> = {
    estudio: 'rgba(232,164,74,0.15)',
    pausa: 'rgba(249,232,200,0.08)',
    simulacro: 'rgba(232,164,74,0.25)',
    repaso: 'rgba(245,201,122,0.15)'
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 16, padding: 20, maxWidth: 360, width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', fontSize: '1.05rem' }}>Probabilidad y Estadística</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--amber)', background: 'rgba(232,164,74,0.12)', padding: '3px 8px', borderRadius: 4 }}>Faltan 3 días</span>
        </div>
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div className="progress-fill" style={{ width: '50%' }} />
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>50%</span>
        </div>
      </div>

      {/* Day label */}
      <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Martes 10 de junio</p>

      {/* Blocks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {blocks.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: tipoColor[b.tipo], borderRadius: 8, border: '0.5px solid var(--border)', opacity: b.completado ? 0.6 : 1 }}>
            <input
              type="checkbox"
              className="check-block"
              defaultChecked={b.completado}
              readOnly
              style={{ pointerEvents: 'none' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink)', fontWeight: 500, textDecoration: b.completado ? 'line-through' : 'none' }}>{b.tema}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{b.tiempo}</p>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--amber)', background: 'rgba(232,164,74,0.1)', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{b.tipo}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Nav ─────────────────────────────────────────────────────────────── */
function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(21,15,7,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '0.5px solid var(--border)'
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <CandleIcon size={22} />
          <span style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--amber)', fontSize: '1.15rem', fontWeight: 700 }}>Candil</span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden-mobile">
          <a href="#caracteristicas" style={{ color: 'var(--ink-soft)', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }}>Características</a>
          <a href="#como-funciona" style={{ color: 'var(--ink-soft)', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }}>Cómo funciona</a>
          <a href="#precios" style={{ color: 'var(--ink-soft)', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }}>Precios</a>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/login" style={{ color: 'var(--ink-soft)', textDecoration: 'none', fontSize: '0.9rem' }}>Ingresar</Link>
          <Link href="/registro" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.88rem' }}>
            Empezar gratis
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* ── Footer ──────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ borderTop: '0.5px solid var(--border)', padding: '40px 24px', marginTop: 80 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CandleIcon size={18} />
          <span style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--amber)', fontWeight: 700 }}>Candil</span>
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {['Características', 'Precios', 'Privacidad', 'Términos'].map(l => (
            <a key={l} href="#" style={{ color: 'var(--ink-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>{l}</a>
          ))}
        </div>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.82rem' }}>© 2026 Candil. Hecho con paciencia y café.</p>
      </div>
    </footer>
  )
}

/* ── Landing page ────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <Nav />

      <main style={{ paddingTop: 60 }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section style={{
          minHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 24px 60px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Ambient background glow */}
          <div style={{
            position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
            width: 600, height: 600,
            background: 'radial-gradient(circle, rgba(232,164,74,0.06) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Badge */}
          <div className="fade-up" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(232,164,74,0.1)',
            border: '0.5px solid var(--border-strong)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 32,
            fontSize: '0.82rem', color: 'var(--amber)'
          }}>
            <CandleIcon size={14} />
            Tu compañero de estudio con IA
          </div>

          {/* Flame */}
          <div className="candle-sway fade-up fade-up-1" style={{ marginBottom: 24 }}>
            <CandleFlame size={100} />
          </div>

          {/* Headline */}
          <h1 className="fade-up fade-up-2" style={{
            fontFamily: 'var(--font-baskerville)',
            fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            color: 'var(--ink)',
            marginBottom: 20,
            maxWidth: 700
          }}>
            Tu examen,<br />
            <span style={{ color: 'var(--amber)' }}>tu ritmo,</span>{' '}
            tu plan.
          </h1>

          <p className="fade-up fade-up-3" style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
            color: 'var(--ink-soft)',
            maxWidth: 540,
            lineHeight: 1.7,
            marginBottom: 40
          }}>
            Cargá tu examen, decinos tu tiempo.
            Candil arma el plan. Vos estudiás.
          </p>

          {/* CTAs */}
          <div className="fade-up fade-up-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/registro" className="btn-primary" style={{ fontSize: '1rem', padding: '13px 32px' }}>
              Empezar gratis
            </Link>
            <a href="#como-funciona" className="btn-secondary" style={{ fontSize: '1rem', padding: '12px 32px' }}>
              Ver cómo funciona
            </a>
          </div>

          <p style={{ marginTop: 20, color: 'var(--ink-muted)', fontSize: '0.82rem' }}>
            Sin tarjeta de crédito. Un plan activo gratis para siempre.
          </p>
        </section>

        {/* ── Por qué Candil ───────────────────────────────────────── */}
        <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 60, alignItems: 'center', justifyContent: 'center' }}>
            {/* Mockup */}
            <div style={{ flexShrink: 0 }}>
              <AppMockup />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 260, maxWidth: 480 }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Por qué Candil</p>
              <h2 style={{ fontFamily: 'var(--font-baskerville)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: 'var(--ink)', lineHeight: 1.3, marginBottom: 20 }}>
                Un plan que se adapta<br />a tu vida, no al revés.
              </h2>
              <p style={{ color: 'var(--ink-soft)', lineHeight: 1.75, marginBottom: 28, fontSize: '0.97rem' }}>
                La mayoría de los planes de estudio ignoran tu vida real.
                Candil sabe cuántas horas tenés cada día, qué temas ya sabés y cuál es tu preferencia de horario.
                Y con eso arma algo que en verdad podés cumplir.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Distribuye los temas según el peso en el examen',
                  'Los temas que ya sabés solo necesitan un repaso breve',
                  'El último día es siempre repaso + simulacro',
                  'Pausas automáticas cada 90 minutos de estudio'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, color: 'var(--ink-soft)', fontSize: '0.93rem' }}>
                    <span style={{ color: 'var(--amber)', marginTop: 2, flexShrink: 0 }}>→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Cómo funciona ────────────────────────────────────────── */}
        <section id="como-funciona" style={{ padding: '80px 24px', background: 'var(--bg2)' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Cómo funciona</p>
            <h2 style={{ fontFamily: 'var(--font-baskerville)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: 'var(--ink)', marginBottom: 60 }}>
              Tres pasos. Eso es todo.
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center' }}>
              {[
                {
                  n: '01',
                  title: 'Cargá tu examen',
                  desc: 'Nombre de la materia, fecha, tipo de examen y los temas que entran. Marcá los que ya sabés.'
                },
                {
                  n: '02',
                  title: 'Decinos tu tiempo',
                  desc: 'Cuántas horas tenés cada día y en qué franja horaria preferís estudiar. Sin compromiso.'
                },
                {
                  n: '03',
                  title: 'Recibí tu plan',
                  desc: 'Candil genera un cronograma personalizado con bloques, pausas y descripciones de qué hacer en cada bloque.'
                }
              ].map((step) => (
                <div key={step.n} className="card" style={{ flex: 1, minWidth: 220, maxWidth: 260, padding: 28, textAlign: 'left' }}>
                  <span style={{
                    display: 'block', fontFamily: 'var(--font-baskerville)', fontSize: '2.2rem',
                    color: 'rgba(232,164,74,0.25)', fontWeight: 700, marginBottom: 16, lineHeight: 1
                  }}>{step.n}</span>
                  <h3 style={{ color: 'var(--ink)', fontWeight: 600, marginBottom: 10, fontSize: '1.05rem' }}>{step.title}</h3>
                  <p style={{ color: 'var(--ink-soft)', lineHeight: 1.65, fontSize: '0.9rem' }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Manifiesto ───────────────────────────────────────────── */}
        <section style={{ padding: '80px 24px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
            <blockquote style={{
              fontFamily: 'var(--font-baskerville)',
              fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)',
              color: 'var(--ink)',
              lineHeight: 1.7,
              fontStyle: 'italic',
              borderLeft: 'none',
              padding: 0,
              position: 'relative'
            }}>
              <span style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: '4rem', color: 'var(--amber)', opacity: 0.3, fontFamily: 'Georgia, serif', lineHeight: 1 }}>"</span>
              Estudiar no debería ser un acto de disciplina ciega.
              Debería ser un acto de confianza en tu propio proceso.
              Candil no te dice cuánto valéis. Te ayuda a llegar.
            </blockquote>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────── */}
        <section id="caracteristicas" style={{ padding: '80px 24px', background: 'var(--bg2)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Características</p>
              <h2 style={{ fontFamily: 'var(--font-baskerville)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: 'var(--ink)' }}>
                Todo lo que necesitás para rendir bien.
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              {[
                {
                  n: '01',
                  title: 'Plan personalizado con IA',
                  desc: 'La IA distribuye los temas según el peso en el examen, tu tiempo real y tu horario preferido. No es un template — es tu plan.'
                },
                {
                  n: '02',
                  title: 'Progreso visual en tiempo real',
                  desc: 'Tachá los bloques a medida que estudiás. La barra de progreso se actualiza sola. Ves cuánto te falta de verdad.'
                },
                {
                  n: '03',
                  title: 'Ajuste con lenguaje natural',
                  desc: '"Mové el tema 3 para el domingo." "No puedo el viernes." Escribilo y Candil reorganiza el plan. Solo en Pro.'
                },
                {
                  n: '04',
                  title: 'Compartí tu plan',
                  desc: 'Generá un link público para compartir con compañeros o profesores. Sin cuenta necesaria para verlo.'
                }
              ].map((f) => (
                <div key={f.n} className="card" style={{ padding: 28 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-baskerville)', fontSize: '1.8rem', color: 'var(--amber)', opacity: 0.4, fontWeight: 700, marginBottom: 14, lineHeight: 1 }}>{f.n}</span>
                  <h3 style={{ color: 'var(--ink)', fontWeight: 600, marginBottom: 10, fontSize: '1rem' }}>{f.title}</h3>
                  <p style={{ color: 'var(--ink-soft)', lineHeight: 1.65, fontSize: '0.88rem' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────── */}
        <section id="precios" style={{ padding: '80px 24px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Precios</p>
              <h2 style={{ fontFamily: 'var(--font-baskerville)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: 'var(--ink)' }}>
                Sin sorpresas. Sin compromisos.
              </h2>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
              {[
                {
                  name: 'Free',
                  price: '$0',
                  period: 'para siempre',
                  featured: false,
                  features: [
                    '1 plan activo',
                    'Generación básica con IA',
                    'Compartir plan',
                    'Progreso visual'
                  ],
                  cta: 'Empezar gratis',
                  href: '/registro'
                },
                {
                  name: 'Pro',
                  price: '$4.99',
                  period: 'por mes',
                  featured: true,
                  features: [
                    'Planes ilimitados',
                    'Ajuste por chat con IA',
                    'Historial completo',
                    'Exportar plan',
                    'Soporte por email'
                  ],
                  cta: 'Empezar con Pro',
                  href: '/registro?plan=pro'
                },
                {
                  name: 'Plus',
                  price: '$9.99',
                  period: 'por mes',
                  featured: false,
                  features: [
                    'Todo lo de Pro',
                    'Análisis de rendimiento',
                    'Flashcards generadas',
                    'Soporte prioritario',
                    'Acceso anticipado a funciones'
                  ],
                  cta: 'Empezar con Plus',
                  href: '/registro?plan=plus'
                }
              ].map((tier) => (
                <div key={tier.name} className="card" style={{
                  flex: 1, minWidth: 260, maxWidth: 300, padding: 28,
                  border: tier.featured ? '0.5px solid var(--amber)' : '0.5px solid var(--border)',
                  position: 'relative'
                }}>
                  {tier.featured && (
                    <div style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--amber)', color: 'var(--bg)', fontSize: '0.72rem', fontWeight: 600,
                      padding: '3px 12px', borderRadius: 10, whiteSpace: 'nowrap'
                    }}>
                      Más elegido
                    </div>
                  )}
                  <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 6 }}>{tier.name}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-baskerville)', fontSize: '2.4rem', color: 'var(--ink)', fontWeight: 700 }}>{tier.price}</span>
                    <span style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>{tier.period}</span>
                  </div>
                  <hr className="divider" style={{ marginBottom: 20, marginTop: 16 }} />
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                    {tier.features.map((f) => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--ink-soft)', fontSize: '0.88rem' }}>
                        <span style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={tier.href}
                    className={tier.featured ? 'btn-primary' : 'btn-secondary'}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA final ────────────────────────────────────────────── */}
        <section style={{ padding: '80px 24px', background: 'var(--bg2)', textAlign: 'center' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
              <CandleFlame size={60} />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-baskerville)',
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              color: 'var(--ink)',
              lineHeight: 1.25,
              marginBottom: 16
            }}>
              Tu próximo examen empieza hoy.
            </h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: '1rem', lineHeight: 1.7, marginBottom: 36 }}>
              No hace falta ser disciplinado. Hace falta tener un buen plan.
            </p>
            <Link href="/registro" className="btn-primary" style={{ fontSize: '1.05rem', padding: '14px 40px' }}>
              Crear mi primer plan gratis
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
