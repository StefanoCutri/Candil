import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import PomodoroTimer from './PomodoroTimer'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

function CandleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C10.5 4.5 9 7 9.5 10.5C10 13 11 15 12 16C13 15 14 13 14.5 10.5C15 7 13.5 4.5 12 2Z" fill="#E8A44A" />
      <path d="M12 4C11.3 5.5 10.5 7.5 11 10C11.3 11.5 11.7 13 12 14C12.3 13 12.7 11.5 13 10C13.5 7.5 12.7 5.5 12 4Z" fill="#F5C97A" />
      <line x1="12" y1="15.5" x2="12" y2="17" stroke="#3D2B1F" strokeWidth="1.2" />
      <rect x="9" y="17" width="6" height="5" rx="0.5" fill="#3D2B1F" />
    </svg>
  )
}

type Examen = {
  id: string
  materia: string
  tipo: string
  fecha: string
  estado: string
  planes?: { id: string }[]
}

function tipoLabel(tipo: string) {
  const map: Record<string, string> = {
    multiple_choice: 'Multiple choice',
    oral: 'Oral',
    desarrollo: 'Desarrollo',
    integrador: 'Integrador'
  }
  return map[tipo] ?? tipo
}

function estadoStyle(estado: string) {
  if (estado === 'activo') return { color: 'var(--amber)', background: 'rgba(232,164,74,0.1)' }
  if (estado === 'completado') return { color: '#7EC87E', background: 'rgba(126,200,126,0.1)' }
  return { color: 'var(--ink-muted)', background: 'rgba(249,232,200,0.06)' }
}

function diasRestantes(fecha: string) {
  const hoy = new Date()
  const exam = new Date(fecha)
  const diff = Math.ceil((exam.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Pasado'
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  return `${diff} días`
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, plan')
    .eq('id', user.id)
    .single()

  const { data: examenes } = await supabase
    .from('examenes')
    .select('id, materia, tipo, fecha, estado, planes(id)')
    .eq('user_id', user.id)
    .order('fecha', { ascending: true })

  const nombre = profile?.nombre ?? 'estudiante'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <CandleIcon size={20} />
          <span style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--amber)', fontWeight: 700 }}>Candil</span>
        </Link>
        <form action="/auth/signout" method="post">
          <button style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer' }}>
            Salir
          </button>
        </form>
      </nav>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 4 }}>Hola,</p>
          <h1 style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', fontSize: '2rem', marginBottom: 6 }}>
            {nombre}.
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.95rem' }}>
            {examenes && examenes.length > 0
              ? `Tenés ${examenes.filter(e => e.estado === 'activo').length} examen${examenes.filter(e => e.estado === 'activo').length !== 1 ? 'es' : ''} activo${examenes.filter(e => e.estado === 'activo').length !== 1 ? 's' : ''}.`
              : 'No tenés exámenes cargados todavía.'}
          </p>
        </div>

        {/* New exam CTA */}
        <Link href="/nuevo" className="btn-primary" style={{ marginBottom: 40, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
          Nuevo examen
        </Link>

        {/* Exams */}
        {examenes && examenes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(examenes as Examen[]).map((examen) => {
              const dias = diasRestantes(examen.fecha)
              const tienePlan = examen.planes && examen.planes.length > 0
              const planId = tienePlan ? examen.planes![0].id : null

              return (
                <div key={examen.id} className="card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                      <h2 style={{ color: 'var(--ink)', fontWeight: 600, fontSize: '1.05rem' }}>{examen.materia}</h2>
                      <span style={{ fontSize: '0.72rem', fontWeight: 500, padding: '2px 8px', borderRadius: 4, ...estadoStyle(examen.estado) }}>
                        {examen.estado}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--ink-soft)', fontSize: '0.82rem' }}>
                        {tipoLabel(examen.tipo)}
                      </span>
                      <span style={{ color: 'var(--ink-soft)', fontSize: '0.82rem' }}>
                        {new Date(examen.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                      </span>
                      <span style={{ color: dias === 'Pasado' ? 'var(--ink-muted)' : 'var(--amber)', fontSize: '0.82rem', fontWeight: 500 }}>
                        {dias}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    {tienePlan ? (
                      <Link href={`/plan/${planId}`} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                        Ver plan
                      </Link>
                    ) : (
                      <Link href={`/nuevo?examen=${examen.id}`} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                        Generar plan
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: 12 }}>🕯️</p>
            <p style={{ color: 'var(--ink)', fontFamily: 'var(--font-baskerville)', fontSize: '1.15rem', marginBottom: 8 }}>
              Todo tranquilo por acá.
            </p>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: 24 }}>
              Cargá tu primer examen y Candil arma el plan.
            </p>
            <Link href="/nuevo" className="btn-primary">
              Cargar mi primer examen
            </Link>
          </div>
        )}

        <PomodoroTimer />
      </main>
    </div>
  )
}
