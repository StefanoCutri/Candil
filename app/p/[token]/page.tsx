import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'

type Bloque = {
  hora_inicio: string
  hora_fin: string
  tema: string
  tipo: string
  descripcion: string
  duracion_minutos: number
}

type DiaConBloques = {
  fecha: string
  dia_nombre: string
  bloques: Bloque[]
}

const tipoColors: Record<string, string> = {
  estudio: 'rgba(232,164,74,0.15)',
  repaso: 'rgba(245,201,122,0.12)',
  pausa: 'rgba(249,232,200,0.06)',
  simulacro: 'rgba(232,164,74,0.22)'
}

function CandleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C10.5 4.5 9 7 9.5 10.5C10 13 11 15 12 16C13 15 14 13 14.5 10.5C15 7 13.5 4.5 12 2Z" fill="#E8A44A" />
      <path d="M12 4C11.3 5.5 10.5 7.5 11 10C11.3 11.5 11.7 13 12 14C12.3 13 12.7 11.5 13 10C13.5 7.5 12.7 5.5 12 4Z" fill="#F5C97A" />
      <line x1="12" y1="15.5" x2="12" y2="17" stroke="#3D2B1F" strokeWidth="1.2" />
      <rect x="9" y="17" width="6" height="5" rx="0.5" fill="#3D2B1F" />
    </svg>
  )
}

export default async function PlanPublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      }
    }
  )

  const { data: plan } = await supabase
    .from('planes')
    .select('contenido, examenes(materia, fecha, tipo)')
    .eq('token_publico', token)
    .single()

  if (!plan) notFound()

  const dias: DiaConBloques[] = plan.contenido?.dias ?? []
  const examen = plan.examenes as unknown as { materia: string; fecha: string; tipo: string }

  const hoy = new Date()
  const examDate = new Date(examen.fecha)
  const diffDays = Math.ceil((examDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <CandleIcon />
          <span style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--amber)', fontWeight: 700 }}>Candil</span>
        </Link>
        <Link href="/registro" className="btn-primary" style={{ padding: '7px 16px', fontSize: '0.82rem' }}>
          Crear mi plan gratis
        </Link>
      </nav>

      <main style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            <h1 style={{ fontFamily: 'var(--font-baskerville)', color: 'var(--ink)', fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
              {examen.materia}
            </h1>
            {diffDays >= 0 && (
              <span style={{ color: 'var(--amber)', background: 'rgba(232,164,74,0.1)', border: '0.5px solid var(--border-strong)', borderRadius: 6, padding: '4px 12px', fontSize: '0.85rem' }}>
                {diffDays === 0 ? '¡Hoy!' : diffDays === 1 ? 'Mañana' : `Faltan ${diffDays} días`}
              </span>
            )}
          </div>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.82rem' }}>
            Plan de estudio · Solo lectura
          </p>
        </div>

        {/* Resumen */}
        {plan.contenido.resumen && (
          <div className="card" style={{ padding: '18px 20px', marginBottom: 28, borderLeft: '2px solid var(--amber)' }}>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', lineHeight: 1.65, fontStyle: 'italic' }}>
              {plan.contenido.resumen}
            </p>
          </div>
        )}

        {/* Days */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {dias.map(dia => (
            <div key={dia.fecha}>
              <div style={{ marginBottom: 10 }}>
                <p style={{ color: 'var(--ink)', fontWeight: 600, fontSize: '0.95rem' }}>{dia.dia_nombre}</p>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem' }}>
                  {new Date(dia.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dia.bloques.map((bloque, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 14px',
                      background: tipoColors[bloque.tipo] ?? tipoColors.estudio,
                      borderRadius: 8, border: '0.5px solid var(--border)',
                      display: 'flex', gap: 12, alignItems: 'flex-start'
                    }}
                  >
                    {bloque.tipo === 'pausa' && <span style={{ fontSize: '0.9rem', marginTop: 1 }}>☕</span>}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>{bloque.tema}</p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--amber)', background: 'rgba(0,0,0,0.15)', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {bloque.tipo}
                        </span>
                      </div>
                      <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem', marginBottom: bloque.descripcion ? 4 : 0 }}>
                        {bloque.hora_inicio} – {bloque.hora_fin} · {bloque.duracion_minutos} min
                      </p>
                      {bloque.descripcion && (
                        <p style={{ color: 'var(--ink-soft)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                          {bloque.descripcion}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Consejo */}
        {plan.contenido.consejo && (
          <div style={{ marginTop: 32, padding: '18px 20px', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12 }}>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Consejo de Candil</p>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', lineHeight: 1.65 }}>{plan.contenido.consejo}</p>
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop: 40, textAlign: 'center', padding: '32px 20px', background: 'var(--bg2)', borderRadius: 16, border: '0.5px solid var(--border)' }}>
          <p style={{ color: 'var(--ink)', fontSize: '0.95rem', marginBottom: 6 }}>¿Querés tu propio plan de estudio?</p>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginBottom: 20 }}>Candil lo genera con IA en base a tu tiempo y tus temas. Gratis.</p>
          <Link href="/registro" className="btn-primary">
            Crear mi plan gratis
          </Link>
        </div>
      </main>
    </div>
  )
}
