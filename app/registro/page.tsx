'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CandleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C10.5 4.5 9 7 9.5 10.5C10 13 11 15 12 16C13 15 14 13 14.5 10.5C15 7 13.5 4.5 12 2Z" fill="#E8A44A" />
      <path d="M12 4C11.3 5.5 10.5 7.5 11 10C11.3 11.5 11.7 13 12 14C12.3 13 12.7 11.5 13 10C13.5 7.5 12.7 5.5 12 4Z" fill="#F5C97A" />
      <line x1="12" y1="15.5" x2="12" y2="17" stroke="#3D2B1F" strokeWidth="1.2" />
      <rect x="9" y="17" width="6" height="5" rx="0.5" fill="#3D2B1F" />
    </svg>
  )
}

export default function RegistroPage() {
  const router = useRouter()
  const supabase = createClient()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } }
    })

    if (signUpError) {
      setError('Algo salió mal. Intentá de nuevo.')
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        nombre,
        plan: 'free'
      })
    }

    setSuccess(true)
    setLoading(false)

    setTimeout(() => router.push('/dashboard'), 1500)
  }

  async function handleGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 40 }}>
        <CandleIcon />
        <span style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--amber)', fontSize: '1.3rem', fontWeight: 700 }}>Candil</span>
      </Link>

      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '36px 32px' }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: '2rem', marginBottom: 12 }}>🕯️</p>
            <h2 style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', marginBottom: 8 }}>¡Bienvenido a Candil!</h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>Redirigiendo a tu dashboard...</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', fontSize: '1.5rem', marginBottom: 6 }}>
              Creá tu cuenta
            </h1>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: 28 }}>
              Gratis para siempre. Sin tarjeta.
            </p>

            <button
              onClick={handleGoogle}
              disabled={loading}
              style={{
                width: '100%', padding: '11px 14px',
                background: 'transparent', border: '0.5px solid var(--border-strong)',
                borderRadius: 8, color: 'var(--ink)', fontSize: '0.92rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                marginBottom: 20
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Registrarse con Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <hr className="divider" style={{ flex: 1 }} />
              <span style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>o</span>
              <hr className="divider" style={{ flex: 1 }} />
            </div>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 6 }}>
                  Tu nombre
                </label>
                <input
                  type="text"
                  className="input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="¿Cómo te llamás?"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vos@email.com"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 6 }}>
                  Contraseña
                </label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                />
              </div>

              {error && (
                <p style={{ color: '#E87070', fontSize: '0.85rem', background: 'rgba(232,112,112,0.08)', border: '0.5px solid rgba(232,112,112,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: '100%', marginTop: 4, justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
              </button>
            </form>
          </>
        )}
      </div>

      <p style={{ marginTop: 20, color: 'var(--ink-muted)', fontSize: '0.88rem' }}>
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" style={{ color: 'var(--amber)', textDecoration: 'none' }}>
          Ingresá
        </Link>
      </p>
    </div>
  )
}
