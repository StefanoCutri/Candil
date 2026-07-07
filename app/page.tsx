'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import './landing.css'

export default function LandingPage() {
  const t = useTranslations('landing')
  const em = (chunks: React.ReactNode) => <em>{chunks}</em>
  const br = () => <br />
  const [isLight, setIsLight] = useState(false)
  const flameRef = useRef<SVGSVGElement | null>(null)

  // Scope landing styles + cleanup on nav away
  useEffect(() => {
    document.body.classList.add('lp')
    // Respetar el tema global guardado (candil-theme)
    try {
      const t = localStorage.getItem('candil-theme')
      const efectivo = t === 'system'
        ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : t
      if (efectivo === 'light') setIsLight(true)
    } catch {}
    return () => {
      document.body.classList.remove('lp')
      document.body.classList.remove('light')
    }
  }, [])

  // Light/dark toggle (sincronizado con el tema global)
  useEffect(() => {
    if (isLight) {
      document.body.classList.add('light')
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.body.classList.remove('light')
      document.documentElement.removeAttribute('data-theme')
    }
  }, [isLight])

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Hero entrance
  useEffect(() => {
    ;(['hero-eyebrow', 'hero-h1', 'hero-sub', 'hero-actions'] as const).forEach((cls, i) => {
      const el = document.querySelector<HTMLElement>(`.${cls}`)
      if (!el) return
      el.style.opacity = '0'
      el.style.transform = 'translateY(20px)'
      el.style.transition = `opacity 800ms cubic-bezier(0.23,1,0.32,1) ${i * 120 + 200}ms,transform 800ms cubic-bezier(0.23,1,0.32,1) ${i * 120 + 200}ms`
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }))
    })
  }, [])

  const toggleTheme = useCallback(() => {
    const flame = flameRef.current
    if (!flame) return
    try { localStorage.setItem('candil-theme', isLight ? 'dark' : 'light') } catch {}
    if (isLight) {
      flame.style.opacity = '0'
      flame.style.filter = 'drop-shadow(0 0 0px rgba(232,164,74,0))'
      flame.style.animationPlayState = 'paused'
      setTimeout(() => {
        setIsLight(false)
        flame.style.transition = 'opacity 400ms ease-out, filter 600ms ease-out'
        flame.style.opacity = '1'
        flame.style.filter = 'drop-shadow(0 0 40px rgba(232,164,74,0.7))'
        flame.style.animationPlayState = 'running'
        setTimeout(() => { flame.style.filter = 'drop-shadow(0 0 28px rgba(232,164,74,0.45))' }, 600)
      }, 300)
    } else {
      flame.style.transition = 'opacity 300ms ease-in, filter 300ms ease-in'
      flame.style.opacity = '0.6'
      setTimeout(() => { flame.style.opacity = '0.3' }, 80)
      setTimeout(() => {
        flame.style.opacity = '0'
        flame.style.filter = 'drop-shadow(0 0 0 transparent)'
      }, 220)
      setTimeout(() => {
        flame.style.animationPlayState = 'paused'
        setIsLight(true)
      }, 300)
    }
  }, [isLight])

  return (
    <>
      {/* ── NAV ── */}
      <nav className="landing-nav">
        <Link href="/" className="nav-logo">
          <div className="candle-wrap">
            <svg className="candle-dark" width="18" height="30" viewBox="0 0 18 30" fill="none">
              <path d="M9 1C9 1 14 7 14 11.5C14 14.8 11.8 17.5 9 17.5C6.2 17.5 4 14.8 4 11.5C4 7 9 1 9 1Z" fill="#E8A44A" opacity="0.88"/>
              <path d="M9 5C9 5 12.5 9 12.5 11.8C12.5 13.6 10.9 15 9 15C7.1 15 5.5 13.6 5.5 11.8C5.5 9 9 5 9 5Z" fill="#F5C97A"/>
              <path d="M9 9C9 9 10.5 11 10.5 12C10.5 12.8 9.8 13.4 9 13.4C8.2 13.4 7.5 12.8 7.5 12C7.5 11 9 9 9 9Z" fill="white" opacity="0.5"/>
              <rect x="6" y="17.5" width="6" height="9" rx="1.5" fill="#6B4226"/>
              <path d="M6 20C5.2 20.5 5 21.5 5 22C5 22.6 5.5 23 6 23V20Z" fill="#8B5E3C" opacity="0.5"/>
              <rect x="4" y="26.5" width="10" height="2.5" rx="1.25" fill="#3D2B1F"/>
            </svg>
            <svg className="candle-light" width="18" height="30" viewBox="0 0 18 30" fill="none">
              <line x1="9" y1="2" x2="9" y2="6" stroke="#9B8060" strokeWidth="1" strokeLinecap="round"/>
              <rect x="6" y="6" width="6" height="19" rx="1.5" fill="#C8B89A"/>
              <line x1="6.5" y1="10" x2="11.5" y2="10" stroke="#B8A888" strokeWidth="0.5" opacity="0.6"/>
              <line x1="6.5" y1="14" x2="11.5" y2="14" stroke="#B8A888" strokeWidth="0.5" opacity="0.6"/>
              <line x1="6.5" y1="18" x2="11.5" y2="18" stroke="#B8A888" strokeWidth="0.5" opacity="0.6"/>
              <path d="M6 9C5.2 9.5 5 10.5 5 11C5 11.6 5.5 12 6 12V9Z" fill="#B8A888" opacity="0.6"/>
              <rect x="4" y="25" width="10" height="2.5" rx="1.25" fill="#B0A090"/>
            </svg>
          </div>
          Candil
        </Link>
        <div className="nav-links">
          <a href="#como">{t('nav_how')}</a>
          <a href="#precios">{t('nav_pricing')}</a>
          <button className="theme-btn" onClick={toggleTheme} aria-label={t('nav_theme')}>
            {isLight ? '◑' : '☀︎'}
          </button>
          <Link href="/registro" className="nav-cta">{t('start_free')}</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-glow" />

        <div className="hero-candle-wrap">
          <div className="hero-glow-ring" />

          {/* Smoke — light mode only */}
          <svg className="hero-smoke" width="30" height="40" viewBox="0 0 30 40" fill="none">
            <path className="smoke-path" d="M15 35 Q18 25 12 15 Q9 8 15 2" stroke="rgba(100,80,60,0.35)" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path className="smoke-path" d="M15 35 Q11 24 17 14 Q20 8 14 2" stroke="rgba(100,80,60,0.2)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            <path className="smoke-path" d="M15 35 Q19 27 13 18 Q10 12 16 5" stroke="rgba(100,80,60,0.15)" strokeWidth="1" fill="none" strokeLinecap="round"/>
          </svg>

          {/* Flame — dark mode */}
          <svg ref={flameRef} className="hero-flame" width="72" height="100" viewBox="0 0 72 100" fill="none">
            <path d="M36 4C36 4 58 28 58 46C58 59.8 48.5 71 36 71C23.5 71 14 59.8 14 46C14 28 36 4 36 4Z" fill="#E8A44A" opacity="0.88"/>
            <path d="M36 20C36 20 50 36 50 48C50 55.7 43.7 62 36 62C28.3 62 22 55.7 22 48C22 36 36 20 36 20Z" fill="#F5C97A"/>
            <path d="M36 38C36 38 42 45 42 50C42 53.3 39.3 56 36 56C32.7 56 30 53.3 30 50C30 45 36 38 36 38Z" fill="white" opacity="0.55"/>
          </svg>

          {/* Candle body — always visible */}
          <svg style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }} width="40" height="44" viewBox="0 0 40 44" fill="none">
            <rect x="13" y="0" width="14" height="32" rx="3" fill="#6B4226"/>
            <path d="M13 5C11 6.5 10 9 10 11C10 13 11.5 14 13 14V5Z" fill="#8B5E3C" opacity="0.5"/>
            <rect x="6" y="32" width="28" height="7" rx="3.5" fill="#3D2B1F"/>
            <ellipse cx="20" cy="40" rx="18" ry="3.5" fill="rgba(21,15,7,0.4)"/>
          </svg>
        </div>

        <p className="hero-eyebrow">{t('hero_eyebrow')}</p>

        <h1 className="hero-h1">
          {t.rich('hero_title', { em, br })}
        </h1>

        <p className="hero-sub">
          {t('hero_sub')}
        </p>

        <div className="hero-actions">
          <Link href="/registro" className="lp-btn">{t('start_free')}</Link>
          <a href="#como" className="lp-btn-ghost">{t('see_how')}</a>
        </div>

        <div className="hero-scroll">
          <div className="scroll-line" />
          <span>{t('scroll')}</span>
        </div>
      </section>

      {/* ── EL MOMENTO ── */}
      <section className="momento lp-section" id="como">
        <div className="container">
          <div className="momento-grid">
            <div className="reveal">
              <p className="momento-label">{t('why_label')}</p>
              <h2 className="momento-h2">
                {t.rich('why_title', { em, br })}
              </h2>
              <p className="momento-p">
                {t('why_body')}
              </p>
            </div>
            <div className="reveal reveal-delay-2">
              <div className="mockup-desk">
                <div className="mock-header">
                  <svg width="14" height="22" viewBox="0 0 14 22" fill="none">
                    <path d="M7 1C7 1 12 6.5 12 10.5C12 13.6 9.8 16.5 7 16.5C4.2 16.5 2 13.6 2 10.5C2 6.5 7 1 7 1Z" fill="#E8A44A" opacity="0.9"/>
                    <path d="M7 5C7 5 10 8.5 10 11C10 12.7 8.7 14 7 14C5.3 14 4 12.7 4 11C4 8.5 7 5 7 5Z" fill="#F5C97A"/>
                    <rect x="4.5" y="16.5" width="5" height="4" rx="1" fill="#6B4226"/>
                  </svg>
                  <span className="mock-logo">Candil</span>
                  <span className="mock-greeting">{t('mock_greeting')}</span>
                </div>
                <div className="mock-card">
                  <div className="mock-dot mock-dot-done" />
                  <span className="mock-title mock-title-done">{t('mock_topic1')}</span>
                  <span className="mock-tag mock-tag-e">{t('mock_done')}</span>
                </div>
                <div className="mock-card" style={{ borderColor: 'var(--border-strong)' }}>
                  <div className="mock-dot mock-dot-now" />
                  <span className="mock-title mock-title-now">{t('mock_topic2')}</span>
                  <span className="mock-tag mock-tag-e">{t('mock_now')}</span>
                </div>
                <div className="mock-card">
                  <div className="mock-dot mock-dot-next" />
                  <span className="mock-title">{t('mock_topic3')}</span>
                  <span className="mock-tag mock-tag-d">{t('mock_tomorrow')}</span>
                </div>
                <div className="mock-progress">
                  <div className="mock-bar"><div className="mock-bar-fill" /></div>
                  <span className="mock-bar-text">{t('mock_progress')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="lp-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '5rem' }} className="reveal">
            <h2 className="section-h2">{t.rich('steps_title', { em, br })}</h2>
            <p className="section-p">{t('steps_sub')}</p>
          </div>
          <div className="steps">
            <div className="step reveal">
              <div className="step-accent" />
              <div className="step-num">01</div>
              <h3 className="step-title">{t('step1_title')}</h3>
              <p className="step-desc">{t('step1_desc')}</p>
            </div>
            <div className="step reveal reveal-delay-1">
              <div className="step-accent" />
              <div className="step-num">02</div>
              <h3 className="step-title">{t('step2_title')}</h3>
              <p className="step-desc">{t('step2_desc')}</p>
            </div>
            <div className="step reveal reveal-delay-2">
              <div className="step-accent" />
              <div className="step-num">03</div>
              <h3 className="step-title">{t('step3_title')}</h3>
              <p className="step-desc">{t('step3_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MANIFIESTO ── */}
      <section className="manifiesto">
        <div className="container-narrow">
          <blockquote className="reveal">
            {t('quote')}
          </blockquote>
          <cite className="reveal reveal-delay-1">{t('quote_cite')}</cite>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section">
        <div className="container">
          <div className="reveal" style={{ textAlign: 'center' }}>
            <h2 className="section-h2">{t.rich('features_title', { em, br })}</h2>
          </div>
          <div className="features-grid">
            {[
              { n: '01', title: t('feat1_title'), desc: t('feat1_desc'), pill: t('pill_free') },
              { n: '02', title: t('feat2_title'), desc: t('feat2_desc'), pill: 'Pro' },
              { n: '03', title: t('feat3_title'), desc: t('feat3_desc'), pill: 'Pro' },
              { n: '04', title: t('feat4_title'), desc: t('feat4_desc'), pill: 'Pro' },
            ].map((f, i) => (
              <div key={f.n} className={`feat-card reveal${i > 0 ? ` reveal-delay-${i}` : ''}`}>
                <div className="feat-num">{f.n}</div>
                <h3 className="feat-title">{f.title}</h3>
                <p className="feat-desc">{f.desc}</p>
                <span className="feat-pill">{f.pill}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section
        className="lp-section"
        id="precios"
        style={{ background: 'var(--bg2)', borderTop: '0.5px solid var(--border)', transition: 'background 500ms, border-color 400ms' }}
      >
        <div className="container">
          <div className="reveal" style={{ textAlign: 'center' }}>
            <h2 className="section-h2">{t.rich('pricing_title', { em, br })}</h2>
            <p className="section-p" style={{ marginTop: '1rem' }}>{t('pricing_sub')}</p>
          </div>
          <div className="pricing-grid">
            {[
              {
                tier: t('price_free_tier'), name: t('price_free_name'), amount: '$0', period: t('per_month'), featured: false,
                desc: t('price_free_desc'),
                features: t('price_free_features').split('|'),
                btnClass: 'price-btn price-btn-ghost', btnText: t('start_free'), href: '/registro',
              },
              {
                tier: t('price_pro_tier'), name: 'Pro', amount: '$4.99', period: t('per_month'), featured: true,
                desc: t('price_pro_desc'),
                features: t('price_pro_features').split('|'),
                btnClass: 'price-btn price-btn-solid', btnText: t('start_pro'), href: '/registro?plan=pro',
              },
              {
                tier: 'Plus', name: 'Plus', amount: '$9.99', period: t('per_month'), featured: false,
                desc: t('price_plus_desc'),
                features: t('price_plus_features').split('|'),
                btnClass: 'price-btn price-btn-ghost', btnText: t('start_plus'), href: '/registro?plan=plus',
              },
            ].map((p, i) => (
              <div key={p.name} className={`price-card${p.featured ? ' featured' : ''} reveal${i > 0 ? ` reveal-delay-${i}` : ''}`}>
                <p className="price-tier">{p.tier}</p>
                <h3 className="price-name">{p.name}</h3>
                <div className="price-amount">{p.amount}<span>{p.period}</span></div>
                <p className="price-desc">{p.desc}</p>
                <div className="price-features">
                  {p.features.map(f => <div key={f} className="price-feat">{f}</div>)}
                </div>
                <Link href={p.href} className={p.btnClass}>{p.btnText}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="cta-final">
        <div className="container-narrow">
          <h2 className="cta-h2 reveal">{t('cta_title')}</h2>
          <p className="cta-sub reveal reveal-delay-1">{t('cta_sub')}</p>
          <div className="reveal reveal-delay-2">
            <Link href="/registro" className="lp-btn" style={{ fontSize: '15px', padding: '16px 40px' }}>
              {t('start_free_arrow')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="footer-logo">
          <svg width="14" height="22" viewBox="0 0 14 22" fill="none" aria-hidden="true">
            <path d="M7 1C7 1 12 6.5 12 10.5C12 13.6 9.8 16.5 7 16.5C4.2 16.5 2 13.6 2 10.5C2 6.5 7 1 7 1Z" fill="currentColor" opacity="0.4"/>
            <rect x="4.5" y="16.5" width="5" height="4" rx="1" fill="currentColor" opacity="0.3"/>
          </svg>
          Candil · 2026
        </div>
        <div className="footer-links">
          <a href="#">{t('footer_terms')}</a>
          <a href="#">{t('footer_privacy')}</a>
          <a href="#">{t('footer_contact')}</a>
          <a href="#">Instagram</a>
        </div>
      </footer>
    </>
  )
}
